import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Food from "@/models/Food";
import Category from "@/models/Category"; // Ensure Category is imported for populate

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";

    const query = {};
    if (search) {
      query.$or = [
        { foodName: { $regex: search, $options: "i" } },
        { foodType: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const foods = await Food.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Food.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: foods,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
