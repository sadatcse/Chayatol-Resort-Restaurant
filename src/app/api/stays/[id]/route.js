import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
import Customer from "@/models/Customer";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const stay = await Stay.findById(id)
      .populate("customer")
      .populate("rooms.room");

    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    return NextResponse.json(stay, { status: 200 });
  } catch (err) {
    console.error("GET Stay by ID error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
