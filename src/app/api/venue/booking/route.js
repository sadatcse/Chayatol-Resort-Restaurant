import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VenueBooking from "@/models/VenueBooking";
import Customer from "@/models/Customer";
import { verifyMultiplePathsPermission, verifyApiPermission } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function GET(req) {
  const auth = await verifyMultiplePathsPermission(req, [
    "/dashboard/venue/dashboard",
    "/dashboard/venue/history"
  ], "view");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const startDateStr = searchParams.get("startDate") || "";
    const endDateStr = searchParams.get("endDate") || "";

    const skip = (page - 1) * limit;

    let query = {};

    if (status) {
      query.bookingStatus = status;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDateStr);
      end.setUTCHours(23, 59, 59, 999);
      query.startDate = { $lte: end };
      query.endDate = { $gte: start };
    }

    if (search) {
      // Find matching customers to search by customer name
      const matchingCustomers = await Customer.find({
        fullName: { $regex: search, $options: "i" }
      }).select("_id");
      const customerIds = matchingCustomers.map(c => c._id);

      query.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { eventTitle: { $regex: search, $options: "i" } },
        { customer: { $in: customerIds } },
        { companyName: { $regex: search, $options: "i" } }
      ];
    }

    const bookings = await VenueBooking.find(query)
      .populate("customer")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await VenueBooking.countDocuments(query);

    return NextResponse.json({
      data: bookings,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }, { status: 200 });

  } catch (err) {
    console.error("GET Venue Bookings route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await verifyApiPermission(req, "/dashboard/venue/book", "add");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    
    const {
      customer,
      companyName,
      startDate,
      endDate,
      startTime,
      endTime,
      venueSize,
      pricingType,
      rateApplied,
      duration,
      durationUnit,
      eventTitle,
      numberOfGuests,
      numberOfRooms,
      totalAmount,
      paidAmount,
      discount,
      paymentMethod,
      specialInstructions
    } = body;

    // Validate inputs
    if (!customer || !startDate || !endDate || !venueSize || !pricingType || !rateApplied || !duration || !eventTitle) {
      return NextResponse.json({ message: "Please provide all required fields" }, { status: 400 });
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    if (start > end) {
      return NextResponse.json({ message: "Start date must be before or equal to end date" }, { status: 400 });
    }

    // Deduplication check: check if an identical booking was created in the last 15 seconds
    const fifteenSecondsAgo = new Date(Date.now() - 15000);
    const potentialDuplicate = await VenueBooking.findOne({
      customer,
      eventTitle,
      startDate: start,
      endDate: end,
      totalAmount: Number(totalAmount),
      createdAt: { $gte: fifteenSecondsAgo }
    });

    if (potentialDuplicate) {
      return NextResponse.json({ 
        message: "Duplicate booking submission detected. Please wait a moment." 
      }, { status: 409 });
    }

    // Availability validation (race-condition check)
    const query = {
      bookingStatus: { $ne: "Cancelled" },
      startDate: { $lte: end },
      endDate: { $gte: start }
    };

    const overlappingBookings = await VenueBooking.find(query);
    const fullVenueOverlaps = overlappingBookings.filter(b => b.venueSize === "Full Venue");
    const halfVenueOverlaps = overlappingBookings.filter(b => b.venueSize === "Half Venue");

    if (fullVenueOverlaps.length > 0) {
      return NextResponse.json({ 
        message: `The Full Venue is already booked for this duration by event "${fullVenueOverlaps[0].eventTitle}".` 
      }, { status: 409 });
    } else if (venueSize === "Full Venue" && halfVenueOverlaps.length > 0) {
      return NextResponse.json({ 
        message: `The Venue is already booked as a Half Venue by event "${halfVenueOverlaps[0].eventTitle}". A Full Venue booking cannot overlap.` 
      }, { status: 409 });
    } else if (venueSize === "Half Venue" && halfVenueOverlaps.length >= 2) {
      return NextResponse.json({ 
        message: `The Venue is already fully booked with 2 Half Venue events: "${halfVenueOverlaps[0].eventTitle}" and "${halfVenueOverlaps[1].eventTitle}".` 
      }, { status: 409 });
    }

    // Generate booking number (VB-1001 base)
    const lastBooking = await VenueBooking.findOne().sort({ createdAt: -1 });
    let lastNum = 1000;
    if (lastBooking && lastBooking.bookingNumber) {
      const match = lastBooking.bookingNumber.match(/VB-(\d+)/);
      if (match) lastNum = parseInt(match[1]);
    }
    const bookingNumber = `VB-${lastNum + 1}`;

    // Establish payment info
    const totalAmt = Number(totalAmount);
    const paidAmt = Number(paidAmount) || 0;
    const dueAmt = Math.max(0, totalAmt - paidAmt);
    
    let paymentStatus = "Unpaid";
    if (paidAmt > 0) {
      paymentStatus = paidAmt >= totalAmt ? "Paid" : "Partial";
    }

    const createdByUser = auth.user?.name || auth.user?.email || "System";

    const bookingData = {
      bookingNumber,
      customer,
      companyName: companyName || "",
      startDate: start,
      endDate: end,
      startTime: startTime || "08:00",
      endTime: endTime || "22:00",
      venueSize,
      pricingType,
      rateApplied,
      duration,
      durationUnit,
      eventTitle,
      numberOfGuests: numberOfGuests || 0,
      numberOfRooms: numberOfRooms || 0,
      totalAmount: totalAmt,
      paidAmount: paidAmt,
      dueAmount: dueAmt,
      discount: Number(discount) || 0,
      paymentStatus,
      paymentMethod: paymentMethod || "Cash",
      bookingStatus: "Confirmed",
      specialInstructions,
      createdByUser
    };

    const result = await VenueBooking.create(bookingData);

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      amount: paidAmt,
      details: `Created venue booking ${bookingNumber} for customer ${customer} - Paid: ${paidAmt}`,
    });

    return NextResponse.json(result, { status: 201 });

  } catch (err) {
    console.error("Create Venue Booking error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
