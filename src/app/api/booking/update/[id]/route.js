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

    if (!bookingData.checkOutDate) {
      delete bookingData.checkOutDate;
    }

    // Check for double bookings (exclude current booking)
    const checkIn = new Date(bookingData.checkInDate || oldBooking.checkInDate || new Date());
    const checkOut = bookingData.checkOutDate || oldBooking.checkOutDate ? new Date(bookingData.checkOutDate || oldBooking.checkOutDate) : new Date("2099-12-31");
    const targetRoom = bookingData.room || oldBooking.room;

    // Only check if we are actually modifying dates, room, or confirming a booking
    if (bookingData.checkInDate || bookingData.checkOutDate || bookingData.room || bookingData.bookingStatus) {
      const overlappingBooking = await Booking.findOne({
        _id: { $ne: id },
        room: targetRoom,
        bookingStatus: { $in: ["Confirmed", "Checked-in"] },
        checkInDate: { $lt: checkOut },
        $or: [
          { checkOutDate: { $gt: checkIn } },
          { checkOutDate: { $exists: false } },
          { checkOutDate: null }
        ]
      });

      if (overlappingBooking && bookingData.bookingStatus !== "Cancelled" && bookingData.bookingStatus !== "Checked-out") {
        return NextResponse.json({ message: "Room already booked at this date." }, { status: 409 });
      }
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
    if (bookingData.bookingStatus === "Checked-out") {
      await Room.findByIdAndUpdate(result.room, { status: "Maintenance" });
    } else if (bookingData.bookingStatus === "Cancelled") {
      // If cancelled, it doesn't need cleaning. But shouldn't automatically be Available if someone is currently in it.
      // We will just let the manual update flow handle it, or maybe set to Available if it was just confirmed.
      if (oldBooking.bookingStatus !== "Checked-in") {
          await Room.findByIdAndUpdate(result.room, { status: "Available" });
      }
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
