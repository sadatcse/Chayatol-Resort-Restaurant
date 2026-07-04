import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function PATCH(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const { status } = await req.json();

    if (!status) {
      return NextResponse.json({ message: "Please provide the status" }, { status: 400 });
    }

    const validStatuses = ["Available", "Occupied", "Reserved", "Cleaning", "Maintenance"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ message: "Invalid status value" }, { status: 400 });
    }

    const result = await Room.findByIdAndUpdate(id, { status }, { new: true });
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated room status for: ${id} to ${status}`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update room status route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
