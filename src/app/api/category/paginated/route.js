import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/Category";

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
      query.categoryName = { $regex: search, $options: "i" };
    }

    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ serial: 1 })
        .skip(skip)
        .limit(limit),
      Category.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        categories,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated categories error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
