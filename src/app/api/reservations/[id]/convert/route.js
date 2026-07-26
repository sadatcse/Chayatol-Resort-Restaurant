import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Reservation from "@/models/Reservation";
import ReservationPayment from "@/models/ReservationPayment";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
import Customer from "@/models/Customer";
import ControlSettings from "@/models/ControlSettings";
import FolioEntry from "@/models/FolioEntry";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";
import { getNextSequence } from "@/lib/sequence";

export async function POST(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { roomAssignments } = body; // Array of { roomTypeId, roomId }

    const reservation = await Reservation.findById(id).populate("customer");
    if (!reservation) {
      return NextResponse.json({ message: "Reservation not found" }, { status: 404 });
    }

    if (reservation.status === "Checked-In") {
      return NextResponse.json({ message: "Reservation is already checked-in." }, { status: 400 });
    }
    if (reservation.status === "Cancelled") {
      return NextResponse.json({ message: "Cannot check-in a cancelled reservation." }, { status: 400 });
    }

    // Assign rooms and verify availability
    const stayRooms = [];
    const roomsToUpdate = [];

    for (let index = 0; index < reservation.rooms.length; index++) {
      const resRoom = reservation.rooms[index];
      // Check if room assignment is passed in body, or if already exists in reservation
      const assignment = roomAssignments?.find(a => a.roomType === resRoom.roomType);
      const roomId = assignment?.roomId || resRoom.room;

      if (!roomId) {
        return NextResponse.json({
          message: `Please assign a specific room for room type: ${resRoom.roomType}`
        }, { status: 400 });
      }

      // Check if room is available
      const room = await Room.findById(roomId);
      if (!room) {
        return NextResponse.json({ message: `Room with ID ${roomId} not found.` }, { status: 400 });
      }
      if (room.status !== "Available" && room.status !== "Reserved") {
        return NextResponse.json({
          message: `Room ${room.roomNumber} is currently ${room.status} and cannot be checked-in.`
        }, { status: 400 });
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

      stayRooms.push({
        room: room._id,
        mealPlan: resRoom.mealPlan,
        nightlyRate: resRoom.nightlyRate,
        adults: resRoom.adults,
        children: resRoom.children
      });

      roomsToUpdate.push(room);
    }

    // Generate stay number: STY-YYYYMMDD-XXXX. Shares the same atomic "stay"
    // counter as the walk-in check-in route (stays/route.js) so the two
    // code paths that both mint stayNo values can never collide.
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const staySeq = await getNextSequence("stay", async () => Stay.countDocuments({}));
    const stayNo = `STY-${dateStr}-${staySeq.toString().padStart(4, "0")}`;

    // Get resort settings check-out time
    const settings = await ControlSettings.findOne() || { checkOutTime: "12:00" };
    const [coHours, coMinutes] = (settings.checkOutTime || "12:00").split(":").map(Number);
    const expectedCO = new Date(reservation.checkOutDate);
    expectedCO.setHours(coHours || 12, coMinutes || 0, 0, 0);

    const staffId = auth.user?.id || auth.user?._id || null;
    const staffName = auth.user?.name || req.headers.get("x-user-name") || auth.user?.email || "Farnaj meherin";

    // Create Stay record
    const stay = await Stay.create({
      stayNo,
      customer: reservation.customer._id,
      reservationId: reservation._id,
      rooms: stayRooms,
      checkInDate: new Date(),
      expectedCheckOutDate: expectedCO,
      status: "In House",
      createdBy: staffId,
      staffName
    });

    // Update Room statuses to Occupied
    for (const room of roomsToUpdate) {
      room.status = "Occupied";
      await room.save();
    }

    // Update Reservation status
    reservation.status = "Checked-In";
    // Also store room assignments in reservation record
    for (let i = 0; i < reservation.rooms.length; i++) {
      const resRoom = reservation.rooms[i];
      const assignment = roomAssignments?.find(a => a.roomType === resRoom.roomType);
      if (assignment) {
        resRoom.room = assignment.roomId;
      }
    }
    await reservation.save();

    // --- Generate Folio Entries ---
    // 1. Room Charges (Debit)
    for (let i = 0; i < reservation.rooms.length; i++) {
      const resRoom = reservation.rooms[i];
      const room = roomsToUpdate[i];
      const chargeAmount = resRoom.nightlyRate * resRoom.nights;

      await FolioEntry.create({
        stayId: stay._id,
        type: "Room Charge",
        description: `Room ${room.roomNumber} Charge - ${resRoom.nights} night(s) at ৳${resRoom.nightlyRate}/night`,
        debit: chargeAmount,
        credit: 0,
        createdBy: staffId,
        staffName
      });
    }

    // 2. Advance Payments / Deposits (Credit)
    const payments = await ReservationPayment.find({ reservationId: id });
    for (const p of payments) {
      await FolioEntry.create({
        stayId: stay._id,
        type: "Advance Payment",
        description: `Advance Deposit (${p.paymentType}) - Ref: ${p.transactionRef || "N/A"}`,
        debit: 0,
        credit: p.amount,
        referenceId: p._id,
        createdBy: staffId,
        staffName
      });
    }

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Converted Reservation ${reservation.reservationNo} to Stay ${stayNo}`,
    });

    return NextResponse.json(stay, { status: 201 });
  } catch (err) {
    console.error("Convert Reservation to Stay error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
