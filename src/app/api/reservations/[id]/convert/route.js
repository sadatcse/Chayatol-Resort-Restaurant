import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Reservation from "@/models/Reservation";
import ReservationPayment from "@/models/ReservationPayment";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
import Customer from "@/models/Customer";
import FolioEntry from "@/models/FolioEntry";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

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

      stayRooms.push({
        room: room._id,
        mealPlan: resRoom.mealPlan,
        nightlyRate: resRoom.nightlyRate,
        adults: resRoom.adults,
        children: resRoom.children
      });

      roomsToUpdate.push(room);
    }

    // Generate stay number: STY-YYYYMMDD-XXXX
    const stayCount = await Stay.countDocuments({});
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const stayNo = `STY-${dateStr}-${(stayCount + 1).toString().padStart(4, "0")}`;

    // Create Stay record
    const stay = await Stay.create({
      stayNo,
      customer: reservation.customer._id,
      reservationId: reservation._id,
      rooms: stayRooms,
      checkInDate: new Date(),
      expectedCheckOutDate: reservation.checkOutDate,
      status: "In House"
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
        credit: 0
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
        referenceId: p._id
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
