import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";

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
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Company.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        companies,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated companies error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
