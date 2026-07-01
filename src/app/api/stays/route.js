import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
import Customer from "@/models/Customer";
import FolioEntry from "@/models/FolioEntry";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

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
      query.status = status;
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
    const { customer, rooms, expectedCheckOutDate, initialPayment, notes } = body;

    if (!customer || !rooms || rooms.length === 0 || !expectedCheckOutDate) {
      return NextResponse.json({ message: "Please provide customer, room details, and expected check-out date." }, { status: 400 });
    }

    // Deduplication check: check if the customer has a check-in created in the last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const potentialDuplicate = await Stay.findOne({
      customer,
      createdAt: { $gte: tenSecondsAgo }
    });
    if (potentialDuplicate) {
      return NextResponse.json({ message: "Duplicate check-in detected. Please wait a moment." }, { status: 409 });
    }

    const stayRooms = [];
    const roomsToUpdate = [];

    // Verify rooms and rates
    for (const r of rooms) {
      const room = await Room.findById(r.room);
      if (!room) {
        return NextResponse.json({ message: `Room with ID ${r.room} not found.` }, { status: 400 });
      }
      if (room.status !== "Available" && room.status !== "Reserved") {
        return NextResponse.json({ message: `Room ${room.roomNumber} is currently occupied or unavailable.` }, { status: 400 });
      }

      const mealPlan = r.mealPlan || "Room Only";
      let nightlyRate = Number(r.nightlyRate);
      if (isNaN(nightlyRate) || r.nightlyRate === undefined || r.nightlyRate === null) {
        if (mealPlan === "Breakfast Included") {
          nightlyRate = room.priceWithBreakfast || 0;
        } else if (mealPlan === "All-Day Food Included") {
          nightlyRate = room.priceWithAllDayFood || 0;
        } else {
          nightlyRate = room.price || 0;
        }
      }

      stayRooms.push({
        room: room._id,
        mealPlan,
        nightlyRate,
        adults: r.adults || 1,
        children: r.children || 0
      });

      roomsToUpdate.push({ room, nights: r.nights || 1 });
    }

    // Generate stay number: STY-YYYYMMDD-XXXX
    const stayCount = await Stay.countDocuments({});
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const stayNo = `STY-${dateStr}-${(stayCount + 1).toString().padStart(4, "0")}`;

    // Create Stay record
    const stay = await Stay.create({
      stayNo,
      customer,
      rooms: stayRooms,
      checkInDate: new Date(),
      expectedCheckOutDate: new Date(expectedCheckOutDate),
      status: "In House",
      notes: notes || ""
    });

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
        description: `Room ${rUpdate.room.roomNumber} Walk-in Charge - ${rUpdate.nights} night(s) at ৳${sr.nightlyRate}/night`,
        debit: chargeAmount,
        credit: 0
      });
    }

    // 2. Initial Payment (if provided)
    if (initialPayment && initialPayment.amount > 0) {
      await FolioEntry.create({
        stayId: stay._id,
        type: "Payment",
        description: `Walk-in Payment (${initialPayment.paymentType}) - Ref: ${initialPayment.transactionRef || "N/A"}`,
        debit: 0,
        credit: Number(initialPayment.amount)
      });
    }

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Walk-in check-in guest to Stay ${stayNo}`,
    });

    return NextResponse.json(stay, { status: 201 });
  } catch (err) {
    console.error("POST Stay Walk-in error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
