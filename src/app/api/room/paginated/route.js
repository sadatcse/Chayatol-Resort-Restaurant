import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
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
      query.$or = [
        { roomNumber: { $regex: search, $options: "i" } },
        { roomType: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } }
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
