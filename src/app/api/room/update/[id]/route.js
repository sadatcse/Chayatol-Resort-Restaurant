import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const roomData = await req.json();

    if (!roomData.roomNumber || !roomData.roomNumber.trim()) {
      return NextResponse.json({ message: "Please provide the room number" }, { status: 400 });
    }

    const existing = await Room.findOne({
      roomNumber: { $regex: new RegExp(`^${roomData.roomNumber.trim()}$`, "i") },
      _id: { $ne: id }
    });
    if (existing) {
      return NextResponse.json({ message: "Another room with this number already exists." }, { status: 400 });
    }

    const result = await Room.findByIdAndUpdate(id, roomData, { new: true });
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated room: ${id} (${roomData.roomNumber})`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: room ${id} not found`,
      });
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update room route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
