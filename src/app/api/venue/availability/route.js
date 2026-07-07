import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VenueBooking from "@/models/VenueBooking";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const venueSize = searchParams.get("venueSize") || "Full Venue";
    const excludeId = searchParams.get("excludeId");

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ message: "Please provide startDate and endDate" }, { status: 400 });
    }

    const start = new Date(startDateStr);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setUTCHours(23, 59, 59, 999);

    if (start > end) {
      return NextResponse.json({ message: "Start date must be before or equal to end date" }, { status: 400 });
    }

    // Build check query for overlap
    let query = {
      bookingStatus: { $ne: "Cancelled" },
      startDate: { $lte: end },
      endDate: { $gte: start }
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const overlappingBookings = await VenueBooking.find(query);

    let isAvailable = true;
    let conflictReason = "";

    // Conflict Check Logic:
    // 1. If any overlapping booking is "Full Venue", the venue is fully blocked.
    // 2. If the request is for "Full Venue" and there's ANY overlapping booking, it is blocked.
    // 3. If the request is for "Half Venue" and there's a "Full Venue" overlapping, it is blocked.
    // 4. If the request is for "Half Venue" and there are >= 2 "Half Venue" overlapping, it is blocked.

    const fullVenueOverlaps = overlappingBookings.filter(b => b.venueSize === "Full Venue");
    const halfVenueOverlaps = overlappingBookings.filter(b => b.venueSize === "Half Venue");

    if (fullVenueOverlaps.length > 0) {
      isAvailable = false;
      conflictReason = `The Full Venue is already booked for this duration by event "${fullVenueOverlaps[0].eventTitle}".`;
    } else if (venueSize === "Full Venue" && halfVenueOverlaps.length > 0) {
      isAvailable = false;
      conflictReason = `The Venue is already booked as a Half Venue by event "${halfVenueOverlaps[0].eventTitle}". A Full Venue booking cannot overlap.`;
    } else if (venueSize === "Half Venue" && halfVenueOverlaps.length >= 2) {
      isAvailable = false;
      conflictReason = `The Venue is already fully booked with 2 Half Venue events: "${halfVenueOverlaps[0].eventTitle}" and "${halfVenueOverlaps[1].eventTitle}".`;
    }

    return NextResponse.json({
      isAvailable,
      conflictReason,
      overlappingCount: overlappingBookings.length,
      details: overlappingBookings.map(b => ({
        _id: b._id,
        eventTitle: b.eventTitle,
        startDate: b.startDate,
        endDate: b.endDate,
        venueSize: b.venueSize,
        bookingNumber: b.bookingNumber
      }))
    }, { status: 200 });

  } catch (err) {
    console.error("Availability check error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
