import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import Room from "@/models/Room";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.bookingStatus = { $regex: search, $options: "i" };
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("customer", "fullName phoneNumber")
        .populate("room", "roomNumber roomType")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        bookings,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated bookings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
