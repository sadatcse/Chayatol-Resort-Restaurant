import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
import Reservation from "@/models/Reservation";
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
    const { newCheckOutDate, roomAssignments } = body; // roomAssignments is optional: array of { oldRoomId, newRoomId }

    if (!newCheckOutDate) {
      return NextResponse.json({ message: "Please provide the new check-out date." }, { status: 400 });
    }

    const stay = await Stay.findById(id).populate("rooms.room");
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    const currentCheckOut = new Date(stay.expectedCheckOutDate);
    const newCheckOut = new Date(newCheckOutDate);

    // Calculate difference in nights
    const diffTime = newCheckOut.getTime() - currentCheckOut.getTime();
    const extraNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (extraNights <= 0) {
      return NextResponse.json({
        message: "New check-out date must be after the current expected check-out date."
      }, { status: 400 });
    }

    // Verify rooms and overlap checks
    const updatedRooms = [];
    const roomsToRelease = [];
    const roomsToOccupy = [];
    const transferLogs = [];

    for (const sr of stay.rooms) {
      const assignment = roomAssignments?.find(a => a.oldRoomId === sr.room._id.toString());
      const targetRoomId = assignment?.newRoomId || sr.room._id.toString();

      const oldRoom = sr.room;
      const targetRoom = await Room.findById(targetRoomId);
      if (!targetRoom) {
        return NextResponse.json({ message: `Target room with ID ${targetRoomId} not found.` }, { status: 400 });
      }

      if (targetRoomId !== oldRoom._id.toString()) {
        // Changing room: check availability of targetRoom from now (today) to newCheckOut
        if (targetRoom.status !== "Available") {
          return NextResponse.json({ message: `Target room ${targetRoom.roomNumber} is currently ${targetRoom.status} and not available.` }, { status: 400 });
        }

        // Overlapping reservation for targetRoom
        const overlapRes = await Reservation.findOne({
          _id: { $ne: stay.reservationId },
          status: { $nin: ["Cancelled", "Checked-In", "Completed"] },
          "rooms.room": targetRoomId,
          checkInDate: { $lt: newCheckOut },
          checkOutDate: { $gt: new Date() }
        });
        if (overlapRes) {
          return NextResponse.json({
            message: `Target room ${targetRoom.roomNumber} is already reserved by Reservation ${overlapRes.reservationNo} during this period.`
          }, { status: 400 });
        }

        // Overlapping stay for targetRoom
        const overlapStay = await Stay.findOne({
          _id: { $ne: stay._id },
          status: { $nin: ["Cancelled", "Checked Out"] },
          "rooms.room": targetRoomId,
          checkInDate: { $lt: newCheckOut },
          $or: [
            { actualCheckOutDate: { $gt: new Date() } },
            { actualCheckOutDate: { $exists: false } },
            { actualCheckOutDate: null, expectedCheckOutDate: { $gt: new Date() } }
          ]
        });
        if (overlapStay) {
          return NextResponse.json({
            message: `Target room ${targetRoom.roomNumber} is already occupied by guest Stay ${overlapStay.stayNo} during this period.`
          }, { status: 400 });
        }

        // Setup changes
        updatedRooms.push({
          room: targetRoomId,
          mealPlan: sr.mealPlan,
          nightlyRate: targetRoom.price, // update to new room price
          adults: sr.adults,
          children: sr.children
        });
        roomsToRelease.push(oldRoom);
        roomsToOccupy.push(targetRoom);
        transferLogs.push({
          oldRoomNo: oldRoom.roomNumber,
          newRoomNo: targetRoom.roomNumber,
          oldRate: sr.nightlyRate,
          newRate: targetRoom.price
        });
      } else {
        // Keeping room: check overlap for targetRoom from currentCheckOut to newCheckOut
        const overlapRes = await Reservation.findOne({
          _id: { $ne: stay.reservationId },
          status: { $nin: ["Cancelled", "Checked-In", "Completed"] },
          "rooms.room": targetRoomId,
          checkInDate: { $lt: newCheckOut },
          checkOutDate: { $gt: currentCheckOut }
        });
        if (overlapRes) {
          return NextResponse.json({
            message: `Room ${targetRoom.roomNumber} is already reserved by Reservation ${overlapRes.reservationNo} during the extension period.`
          }, { status: 400 });
        }

        const overlapStay = await Stay.findOne({
          _id: { $ne: stay._id },
          status: { $nin: ["Cancelled", "Checked Out"] },
          "rooms.room": targetRoomId,
          checkInDate: { $lt: newCheckOut },
          $or: [
            { actualCheckOutDate: { $gt: currentCheckOut } },
            { actualCheckOutDate: { $exists: false } },
            { actualCheckOutDate: null, expectedCheckOutDate: { $gt: currentCheckOut } }
          ]
        });
        if (overlapStay) {
          return NextResponse.json({
            message: `Room ${targetRoom.roomNumber} is already occupied by guest Stay ${overlapStay.stayNo} during the extension period.`
          }, { status: 400 });
        }

        updatedRooms.push({
          room: sr.room._id,
          mealPlan: sr.mealPlan,
          nightlyRate: sr.nightlyRate,
          adults: sr.adults,
          children: sr.children
        });
      }
    }

    // Perform stay updates
    stay.rooms = updatedRooms;
    stay.expectedCheckOutDate = newCheckOut;
    stay.status = "Extended";
    await stay.save();

    // Release old rooms to Cleaning status
    for (const room of roomsToRelease) {
      room.status = "Cleaning";
      await room.save();
    }

    // Occupy new rooms
    for (const room of roomsToOccupy) {
      room.status = "Occupied";
      await room.save();
    }

    const staffId = auth.user?.id || auth.user?._id || null;
    const staffName = auth.user?.name || req.headers.get("x-user-name") || auth.user?.email || "Farnaj meherin";

    // Log the transfers/extensions in folio
    for (const log of transferLogs) {
      await FolioEntry.create({
        stayId: id,
        type: "Room Charge",
        description: `Room Transfer during Extension: Transferred from Room ${log.oldRoomNo} to Room ${log.newRoomNo}. Nightly rate updated from ৳${log.oldRate} to ৳${log.newRate}`,
        debit: 0,
        credit: 0,
        createdBy: staffId,
        staffName
      });
    }

    // Post extension nightly rate charges
    for (const r of stay.rooms) {
      const room = await Room.findById(r.room);
      const roomNo = room ? room.roomNumber : "Unknown";
      const chargeAmount = r.nightlyRate * extraNights;

      await FolioEntry.create({
        stayId: id,
        type: "Room Charge",
        description: `Room ${roomNo} Stay Extension - ${extraNights} night(s) at ৳${r.nightlyRate}/night`,
        debit: chargeAmount,
        credit: 0,
        createdBy: staffId,
        staffName
      });
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Extended stay ${stay.stayNo} to ${newCheckOutDate} (+${extraNights} nights)`,
    });

    const updatedStayPopulated = await Stay.findById(id).populate("rooms.room").populate("customer");
    return NextResponse.json(updatedStayPopulated, { status: 200 });
  } catch (err) {
    console.error("POST Stay Extension error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
