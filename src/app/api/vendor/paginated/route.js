import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";

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
        { vendorName: { $regex: search, $options: "i" } },
        { vendorID: { $regex: search, $options: "i" } },
      ];
    }

    const [vendors, total, totalCount, activeCount, inactiveCount] = await Promise.all([
      Vendor.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Vendor.countDocuments(query),
      Vendor.countDocuments({}),
      Vendor.countDocuments({ status: "Active" }),
      Vendor.countDocuments({ status: "Inactive" }),
    ]);

    return NextResponse.json(
      {
        vendors,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
        totalCount,
        activeCount,
        inactiveCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated vendors route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
