import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status") || "";
    const inclusion = searchParams.get("inclusion") || "";
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const query = {};
    if (status) {
      query.status = status;
    }

    if (inclusion) {
      if (inclusion === "breakfast") {
        query.priceWithBreakfast = { $gt: 0 };
      } else if (inclusion === "allday") {
        query.priceWithAllDayFood = { $gt: 0 };
      } else if (inclusion === "daylong") {
        query.priceWithDayLong = { $gt: 0 };
      } else if (inclusion === "roomonly") {
        // Rooms where they only support base room pricing (all extra options are 0 or empty)
        query.priceWithBreakfast = { $eq: 0 };
        query.priceWithAllDayFood = { $eq: 0 };
        query.priceWithDayLong = { $eq: 0 };
      }
    }

    if (search) {
      query.$or = [
        { roomNumber: { $regex: search, $options: "i" } },
        { roomType: { $regex: search, $options: "i" } }
      ];
    }

    const [rooms, total] = await Promise.all([
      Room.find(query)
        .sort({ roomNumber: 1 })
        .skip(skip)
        .limit(limit),
      Room.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        rooms,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated rooms error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
