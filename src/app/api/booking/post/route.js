import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
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
    const bookingData = await req.json();

    if ((!bookingData.isNewCustomer && !bookingData.customer) || (bookingData.isNewCustomer && !bookingData.customerName) || !bookingData.room || bookingData.totalAmount === undefined) {
      return NextResponse.json({ message: "Please provide all required fields." }, { status: 400 });
    }

    if (!bookingData.checkInDate) {
      bookingData.checkInDate = new Date();
    }

    if (!bookingData.checkOutDate) {
      delete bookingData.checkOutDate;
    }

    // Check for double bookings
    const checkIn = new Date(bookingData.checkInDate || new Date());
    const checkOut = bookingData.checkOutDate ? new Date(bookingData.checkOutDate) : new Date("2099-12-31");

    const overlappingBooking = await Booking.findOne({
      room: bookingData.room,
      bookingStatus: { $in: ["Confirmed", "Checked-in"] },
      checkInDate: { $lt: checkOut },
      $or: [
        { checkOutDate: { $gt: checkIn } },
        { checkOutDate: { $exists: false } },
        { checkOutDate: null }
      ]
    });

    if (overlappingBooking) {
      return NextResponse.json({ message: "Double booking prevented. This room is already booked for the selected dates." }, { status: 409 });
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

    const result = await Booking.create(bookingData);

    // Update the room status to Occupied
    await Room.findByIdAndUpdate(bookingData.room, { status: "Occupied" });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created booking: ${result._id} for room ${bookingData.room}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create booking route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
