import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Kitchen from "@/models/Kitchen";

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
      query.name = { $regex: search, $options: "i" };
    }

    const [kitchens, total] = await Promise.all([
      Kitchen.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Kitchen.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        kitchens,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated kitchens error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
