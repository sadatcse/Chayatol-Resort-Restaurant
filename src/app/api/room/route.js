import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const returnAll = searchParams.get("all") === "true";

    const query = returnAll ? {} : { status: "Available" };
    const result = await Room.find(query).sort({ roomNumber: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get available rooms route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
