import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
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
    const bookingData = await req.json();

    const oldBooking = await Booking.findById(id);
    if (!oldBooking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    if (bookingData.isNewCustomer) {
      const newCust = await Customer.create({
        fullName: bookingData.customerName,
        phoneNumber: bookingData.customerPhone || "N/A",
        maritalStatus: "Other",
        gender: "Other"
      });
      bookingData.customer = newCust._id;
    } else if (bookingData.customerPhone) {
      await Customer.findByIdAndUpdate(bookingData.customer, { phoneNumber: bookingData.customerPhone });
    }

    const result = await Booking.findByIdAndUpdate(id, bookingData, { new: true });

    // Handle room status updates if needed
    if (bookingData.bookingStatus === "Checked-out" || bookingData.bookingStatus === "Cancelled") {
      await Room.findByIdAndUpdate(result.room, { status: "Available" });
    } else if (bookingData.bookingStatus === "Checked-in") {
      await Room.findByIdAndUpdate(result.room, { status: "Occupied" });
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Updated booking: ${id}`,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Update booking route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
