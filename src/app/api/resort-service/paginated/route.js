import ResortService from "@/models/ResortService";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const skip = (page - 1) * limit;
    const query = {};
    if (search) query.serviceName = { $regex: search, $options: "i" };
    if (category && category !== "All") query.category = category;

    const services = await ResortService.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await ResortService.countDocuments(query);

    return NextResponse.json({
      data: services,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching paginated services:", error);
    return NextResponse.json({ message: "Failed to fetch services" }, { status: 500 });
  }
}
