import ResortServiceCategory from "@/models/ResortServiceCategory";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;
    const query = search ? { categoryName: { $regex: search, $options: "i" } } : {};

    const categories = await ResortServiceCategory.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await ResortServiceCategory.countDocuments(query);

    return NextResponse.json({
      data: categories,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching paginated categories:", error);
    return NextResponse.json({ message: "Failed to fetch categories" }, { status: 500 });
  }
}
