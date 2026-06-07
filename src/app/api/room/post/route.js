import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const roomData = await req.json();

    if (!roomData.roomNumber || !roomData.roomNumber.trim()) {
      return NextResponse.json({ message: "Please provide the room number" }, { status: 400 });
    }

    const existing = await Room.findOne({
      roomNumber: { $regex: new RegExp(`^${roomData.roomNumber.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json({ message: "A room with this number already exists." }, { status: 400 });
    }

    const result = await Room.create(roomData);

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created room: ${roomData.roomNumber}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create room route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
