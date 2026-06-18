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
    const limitParam = searchParams.get("limit");
    const limit = limitParam === "all" || limitParam === "0" ? 0 : (parseInt(limitParam) || 10);
    const search = searchParams.get("search") || "";
    const searchType = searchParams.get("searchType") || "all";

    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      if (searchType === "phone") {
        const matchingCustomers = await Customer.find({
          phoneNumber: { $regex: search, $options: "i" }
        }).select("_id");
        query.customer = { $in: matchingCustomers.map(c => c._id) };
      } else if (searchType === "name") {
        const matchingCustomers = await Customer.find({
          fullName: { $regex: search, $options: "i" }
        }).select("_id");
        query.customer = { $in: matchingCustomers.map(c => c._id) };
      } else if (searchType === "room") {
        const matchingRooms = await Room.find({
          roomNumber: { $regex: search, $options: "i" }
        }).select("_id");
        query.room = { $in: matchingRooms.map(r => r._id) };
      } else {
        // Fallback or "all"
        const matchingCustomers = await Customer.find({
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } }
          ]
        }).select("_id");
        
        const customerIds = matchingCustomers.map(c => c._id);
  
        query.$or = [
          { bookingStatus: { $regex: search, $options: "i" } },
          { customer: { $in: customerIds } }
        ];
      }
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
