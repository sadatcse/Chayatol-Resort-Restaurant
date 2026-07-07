import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VenueBooking from "@/models/VenueBooking";
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
    const body = await req.json();

    const existingBooking = await VenueBooking.findById(id);
    if (!existingBooking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    const {
      startDate,
      endDate,
      venueSize,
      bookingStatus,
      paidAmount,
      totalAmount,
      eventTitle
    } = body;

    // Check if dates or size are modified
    if (bookingStatus !== "Cancelled" && (startDate || endDate || venueSize)) {
      const checkStart = startDate ? new Date(startDate) : existingBooking.startDate;
      const checkEnd = endDate ? new Date(endDate) : existingBooking.endDate;
      const checkSize = venueSize || existingBooking.venueSize;

      checkStart.setUTCHours(0, 0, 0, 0);
      checkEnd.setUTCHours(23, 59, 59, 999);

      if (checkStart > checkEnd) {
        return NextResponse.json({ message: "Start date must be before or equal to end date" }, { status: 400 });
      }

      // Check conflict excluding current booking ID
      const query = {
        _id: { $ne: id },
        bookingStatus: { $ne: "Cancelled" },
        startDate: { $lte: checkEnd },
        endDate: { $gte: checkStart }
      };

      const overlappingBookings = await VenueBooking.find(query);
      const fullVenueOverlaps = overlappingBookings.filter(b => b.venueSize === "Full Venue");
      const halfVenueOverlaps = overlappingBookings.filter(b => b.venueSize === "Half Venue");

      if (fullVenueOverlaps.length > 0) {
        return NextResponse.json({ 
          message: `The Full Venue is already booked for this duration by event "${fullVenueOverlaps[0].eventTitle}".` 
        }, { status: 409 });
      } else if (checkSize === "Full Venue" && halfVenueOverlaps.length > 0) {
        return NextResponse.json({ 
          message: `The Venue is already booked as a Half Venue by event "${halfVenueOverlaps[0].eventTitle}". A Full Venue booking cannot overlap.` 
        }, { status: 409 });
      } else if (checkSize === "Half Venue" && halfVenueOverlaps.length >= 2) {
        return NextResponse.json({ 
          message: `The Venue is already fully booked with 2 Half Venue events: "${halfVenueOverlaps[0].eventTitle}" and "${halfVenueOverlaps[1].eventTitle}".` 
        }, { status: 409 });
      }
    }

    // Prepare update payload
    const updateData = { ...body };

    // Format dates if supplied
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    // Re-calculate payment details if total or paid amount is modified
    const currentTotal = totalAmount !== undefined ? Number(totalAmount) : existingBooking.totalAmount;
    const currentPaid = paidAmount !== undefined ? Number(paidAmount) : existingBooking.paidAmount;
    
    updateData.dueAmount = Math.max(0, currentTotal - currentPaid);
    
    if (currentPaid === 0) {
      updateData.paymentStatus = "Unpaid";
    } else {
      updateData.paymentStatus = currentPaid >= currentTotal ? "Paid" : "Partial";
    }

    const updated = await VenueBooking.findByIdAndUpdate(id, updateData, { new: true })
      .populate("customer");

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      amount: paidAmount !== undefined ? currentPaid - existingBooking.paidAmount : 0,
      details: `Updated venue booking ${existingBooking.bookingNumber} (${eventTitle || existingBooking.eventTitle})`,
    });

    return NextResponse.json(updated, { status: 200 });

  } catch (err) {
    console.error("Update Venue Booking error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  // Admin access control restriction
  if (auth.user?.role !== "superadmin") {
    return NextResponse.json({ message: "Unauthorized. Admin permissions required." }, { status: 403 });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const booking = await VenueBooking.findById(id);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    await VenueBooking.findByIdAndDelete(id);

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Deleted venue booking ${booking.bookingNumber} (${booking.eventTitle})`,
    });

    return NextResponse.json({ message: "Booking deleted successfully" }, { status: 200 });

  } catch (err) {
    console.error("Delete Venue Booking error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
