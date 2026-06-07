import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";

export async function GET(req) {
  try {
    await dbConnect();
    // Only return Available rooms
    const result = await Room.find({ status: "Available" }).sort({ roomNumber: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get available rooms route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
