import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";
import { checkRoomCapacity, resolveId } from "@/lib/guestCapacity";

// Adds/removes/edits guests on one room-line of an already-checked-in Stay.
// Extend/Transfer handle date and room changes; this is the only route that
// changes who is staying in a room without also changing the room or dates.
export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { roomId, guests } = body;

    if (!roomId || !Array.isArray(guests)) {
      return NextResponse.json({ message: "roomId and a guests array are required." }, { status: 400 });
    }

    const stay = await Stay.findById(id);
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    if (stay.status === "Checked Out" || stay.status === "Cancelled") {
      return NextResponse.json({ message: `Cannot edit guests on a stay that is ${stay.status}.` }, { status: 400 });
    }

    const roomIndex = stay.rooms.findIndex(r => resolveId(r.room) === roomId);
    if (roomIndex === -1) {
      return NextResponse.json({ message: "That room is not allocated to this stay." }, { status: 404 });
    }

    const existingGuests = stay.rooms[roomIndex].guests || [];
    const existingPrimary = existingGuests.find(g => g.isPrimary);
    const incomingPrimary = guests.find(g => g.isPrimary);

    if (existingPrimary) {
      const existingPrimaryId = resolveId(existingPrimary.customer);
      if (!incomingPrimary || resolveId(incomingPrimary.customer) !== existingPrimaryId) {
        return NextResponse.json({
          message: "Cannot remove the primary guest from a room. Change the primary guest via the stay's Customer field instead."
        }, { status: 400 });
      }
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json({ message: "Room not found." }, { status: 404 });
    }

    const capacityCheck = checkRoomCapacity({ guests, capacity: room.capacity, roomLabel: room.roomNumber });
    if (!capacityCheck.ok) {
      return NextResponse.json({ message: capacityCheck.message }, { status: 400 });
    }

    stay.rooms[roomIndex].guests = guests.map(g => ({
      customer: g.customer,
      isPrimary: !!g.isPrimary,
      relationToPrimary: g.relationToPrimary || ""
    }));
    await stay.save();

    const populatedStay = await Stay.findById(id)
      .populate("customer")
      .populate("rooms.room")
      .populate("rooms.guests.customer");

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Updated guest list for Stay ${stay.stayNo}, Room ${room.roomNumber}`,
    });

    return NextResponse.json(populatedStay, { status: 200 });
  } catch (err) {
    console.error("PUT Stay Guests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
