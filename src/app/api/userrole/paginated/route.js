import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserRole from "@/models/UserRole";
import { verifyToken } from "@/lib/auth";

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
      query.userrole = { $regex: search, $options: "i" };
    }

    const [roles, total] = await Promise.all([
      UserRole.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserRole.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        roles,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated user roles error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
