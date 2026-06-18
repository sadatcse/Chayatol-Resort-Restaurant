import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Room from "@/models/Room";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    // If the booking was already checked in or checked out, the room might need cleaning.
    // If it was just confirmed/pending, it can go back to available safely.
    if (booking.bookingStatus === "Checked-in" || booking.bookingStatus === "Checked-out") {
        await Room.findByIdAndUpdate(booking.room, { status: "Maintenance" });
    } else {
        await Room.findByIdAndUpdate(booking.room, { status: "Available" });
    }

    const result = await Booking.findByIdAndDelete(id);
    
    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Deleted booking: ${id}`,
    });
    return NextResponse.json({ message: "Booking deleted successfully" }, { status: 200 });

  } catch (err) {
    console.error("Delete booking route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
