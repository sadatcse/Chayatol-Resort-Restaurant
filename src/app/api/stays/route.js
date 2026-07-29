import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
import Customer from "@/models/Customer";
import ControlSettings from "@/models/ControlSettings";
import FolioEntry from "@/models/FolioEntry";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";
import { getNextSequence } from "@/lib/sequence";
import { reconcilePrimaryGuest, checkRoomCapacity } from "@/lib/guestCapacity";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      if (status.includes(",")) {
        query.status = { $in: status.split(",").map(s => s.trim()) };
      } else if (status === "In House") {
        query.status = { $in: ["In House", "Extended"] };
      } else {
        query.status = status;
      }
    }

    if (from || to) {
      query.checkInDate = {};
      if (from) {
        query.checkInDate.$gte = new Date(from);
      }
      if (to) {
        query.checkInDate.$lte = new Date(to);
      }
    }

    if (search) {
      // Find matching customers first to search by customer name
      const matchingCustomers = await Customer.find({
        fullName: { $regex: search, $options: "i" }
      }).select("_id");
      const customerIds = matchingCustomers.map(c => c._id);

      // Find matching rooms to search by room number
      const matchingRooms = await Room.find({
        roomNumber: { $regex: search, $options: "i" }
      }).select("_id");
      const roomIds = matchingRooms.map(r => r._id);

      query.$or = [
        { stayNo: { $regex: search, $options: "i" } },
        { customer: { $in: customerIds } },
        { "rooms.room": { $in: roomIds } }
      ];
    }

    const stays = await Stay.find(query)
      .populate("customer")
      .populate("rooms.room")
      .populate("rooms.guests.customer")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Stay.countDocuments(query);

    return NextResponse.json({
      data: stays,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }, { status: 200 });
  } catch (err) {
    console.error("GET Stays route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  // Walk-In Check-In
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const { customer, rooms, expectedCheckOutDate, initialPayment, notes, idempotencyKey } = body;

    if (!customer || !rooms || rooms.length === 0 || !expectedCheckOutDate) {
      return NextResponse.json({ message: "Please provide customer, room details, and expected check-out date." }, { status: 400 });
    }

    if (idempotencyKey) {
      const existing = await Stay.findOne({ idempotencyKey }).populate("customer").populate("rooms.room").populate("rooms.guests.customer");
      if (existing) {
        return NextResponse.json(existing, { status: 201 });
      }
    } else {
      // Deduplication check: check if the customer has a check-in created in the last 10 seconds
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const potentialDuplicate = await Stay.findOne({
        customer,
        createdAt: { $gte: tenSecondsAgo }
      });
      if (potentialDuplicate) {
        return NextResponse.json({ message: "Duplicate check-in detected. Please wait a moment." }, { status: 409 });
      }
    }

    const reconciled = reconcilePrimaryGuest(rooms, customer);
    if (reconciled.error) {
      return NextResponse.json({ message: reconciled.error }, { status: 400 });
    }
    const reconciledRooms = reconciled.rooms;

    const stayRooms = [];
    const roomsToUpdate = [];

    // Verify rooms and rates
    for (const r of reconciledRooms) {
      const room = await Room.findById(r.room);
      if (!room) {
        return NextResponse.json({ message: `Room with ID ${r.room} not found.` }, { status: 400 });
      }
      if (room.status !== "Available" && room.status !== "Reserved") {
        return NextResponse.json({ message: `Room ${room.roomNumber} is currently occupied or unavailable.` }, { status: 400 });
      }

      // Check if there is an active stay (Checked-In / In House guest) currently in this room
      const activeStay = await Stay.findOne({
        "rooms.room": room._id,
        status: { $in: ["In House", "Extended"] }
      }).populate("customer");
      if (activeStay) {
        return NextResponse.json({
          message: `Room ${room.roomNumber} is currently occupied by active guest: ${activeStay.customer?.fullName || "Unknown"} (Stay: ${activeStay.stayNo}). Please check out the previous guest first.`
        }, { status: 400 });
      }

      const mealPlan = r.mealPlan || "Room Only";
      let nightlyRate = Number(r.nightlyRate);
      if (isNaN(nightlyRate) || r.nightlyRate === undefined || r.nightlyRate === null) {
        if (mealPlan === "Breakfast Included") {
          nightlyRate = room.priceWithBreakfast || 0;
        } else if (mealPlan === "All-Day Food Included") {
          nightlyRate = room.priceWithAllDayFood || 0;
        } else if (mealPlan === "Day-Long Included") {
          nightlyRate = room.priceWithDayLong || 0;
        } else {
          nightlyRate = room.price || 0;
        }
      }

      const capacityCheck = checkRoomCapacity({ guests: r.guests || [], capacity: room.capacity, roomLabel: room.roomNumber });
      if (!capacityCheck.ok) {
        return NextResponse.json({ message: capacityCheck.message }, { status: 400 });
      }

      stayRooms.push({
        room: room._id,
        mealPlan,
        nightlyRate,
        adults: r.adults || 1,
        children: r.children || 0,
        guests: r.guests || []
      });

      roomsToUpdate.push({ room, nights: r.nights || 1 });
    }

    // Generate stay number: STY-YYYYMMDD-XXXX. Uses a single global counter
    // (shared with the reservation->check-in conversion route, which
    // generates the same style of number) so two concurrent check-ins can
    // never be assigned the same stay number, and the two code paths that
    // both mint stayNo values can never collide with each other either.
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const staySeq = await getNextSequence("stay", async () => Stay.countDocuments({}));
    const stayNo = `STY-${dateStr}-${staySeq.toString().padStart(4, "0")}`;

    // Get resort settings check-out time
    const settings = await ControlSettings.findOne() || { checkOutTime: "12:00" };
    const [coHours, coMinutes] = (settings.checkOutTime || "12:00").split(":").map(Number);
    const expectedCO = new Date(expectedCheckOutDate);
    expectedCO.setHours(coHours || 12, coMinutes || 0, 0, 0);

    const staffId = auth.user?.id || auth.user?._id || null;
    const staffName = auth.user?.name || req.headers.get("x-user-name") || auth.user?.email || "Farnaj meherin";

    let stay;
    try {
      // Create Stay record
      stay = await Stay.create({
        stayNo,
        customer,
        rooms: stayRooms,
        checkInDate: new Date(),
        expectedCheckOutDate: expectedCO,
        status: "In House",
        notes: notes || "",
        createdBy: staffId,
        staffName,
        idempotencyKey
      });
    } catch (saveError) {
      if (saveError.code === 11000 && idempotencyKey) {
        const existing = await Stay.findOne({ idempotencyKey }).populate("customer").populate("rooms.room").populate("rooms.guests.customer");
        if (existing) {
          return NextResponse.json(existing, { status: 201 });
        }
      }
      throw saveError;
    }

    // Update Room statuses to Occupied
    for (const r of roomsToUpdate) {
      r.room.status = "Occupied";
      await r.room.save();
    }

    // Generate Folio Entries
    // 1. Room Charges
    for (let i = 0; i < stayRooms.length; i++) {
      const sr = stayRooms[i];
      const rUpdate = roomsToUpdate[i];
      const chargeAmount = sr.nightlyRate * rUpdate.nights;

      await FolioEntry.create({
        stayId: stay._id,
        type: "Room Charge",
        description: `Room ${rUpdate.room.roomNumber} Walk-In Charge - ${rUpdate.nights} night(s) at ৳${sr.nightlyRate}/night`,
        debit: chargeAmount,
        credit: 0,
        createdBy: staffId,
        staffName
      });
    }

    // 2. Initial Payment (if provided)
    if (initialPayment && initialPayment.amount > 0) {
      await FolioEntry.create({
        stayId: stay._id,
        type: "Advance Payment",
        description: `Walk-In Deposit (${initialPayment.paymentType}) - Ref: ${initialPayment.transactionRef || "N/A"}`,
        debit: 0,
        credit: Number(initialPayment.amount),
        createdBy: staffId,
        staffName
      });
    }

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Walk-in check-in guest to Stay ${stayNo}`,
    });

    const populatedStay = await Stay.findById(stay._id)
      .populate("customer")
      .populate("rooms.room")
      .populate("rooms.guests.customer");

    return NextResponse.json(populatedStay, { status: 201 });
  } catch (err) {
    console.error("POST Stay Walk-in error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
