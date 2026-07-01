import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
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
    const { oldRoomId, newRoomId, reason } = body;

    if (!oldRoomId || !newRoomId) {
      return NextResponse.json({ message: "oldRoomId and newRoomId are required." }, { status: 400 });
    }

    const stay = await Stay.findById(id).populate("rooms.room");
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    if (stay.status === "Checked Out") {
      return NextResponse.json({ message: "Cannot transfer rooms for a checked out guest." }, { status: 400 });
    }

    // Verify new room exists and is available
    const newRoom = await Room.findById(newRoomId);
    if (!newRoom) {
      return NextResponse.json({ message: "Target room not found." }, { status: 404 });
    }
    if (newRoom.status !== "Available") {
      return NextResponse.json({ message: `Target room ${newRoom.roomNumber} is currently ${newRoom.status} and not available.` }, { status: 400 });
    }

    // Verify old room belongs to the stay
    const roomIndex = stay.rooms.findIndex(r => r.room._id.toString() === oldRoomId);
    if (roomIndex === -1) {
      return NextResponse.json({ message: "The old room is not allocated to this stay." }, { status: 400 });
    }

    const oldRoom = await Room.findById(oldRoomId);
    const oldRoomNumber = oldRoom ? oldRoom.roomNumber : "Unknown";

    // Perform transfer in Stay document
    stay.rooms[roomIndex].room = newRoomId;
    // Set new nightly rate based on the target room price
    stay.rooms[roomIndex].nightlyRate = newRoom.price;
    await stay.save();

    // Release old room status to Cleaning
    if (oldRoom) {
      oldRoom.status = "Cleaning";
      await oldRoom.save();
    }

    // Occupy new room status
    newRoom.status = "Occupied";
    await newRoom.save();

    // Log the room transfer in the guest's folio ledger
    const logDesc = `Room Transfer: Transferred from Room ${oldRoomNumber} to Room ${newRoom.roomNumber}. Reason: ${reason || "N/A"}`;
    await FolioEntry.create({
      stayId: id,
      type: "Room Charge",
      description: logDesc,
      debit: 0,
      credit: 0
    });

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Transferred Stay ${stay.stayNo} from Room ${oldRoomNumber} to Room ${newRoom.roomNumber}.`,
    });

    return NextResponse.json({
      message: "Room transfer completed successfully.",
      stay
    }, { status: 200 });
  } catch (error) {
    console.error("Room transfer POST API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
