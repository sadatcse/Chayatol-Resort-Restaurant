import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Department from "@/models/Department";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  // const auth = verifyToken(req);
  // if (auth.error) {
  //   return NextResponse.json({ message: auth.error }, { status: auth.status });
  // }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.department = { $regex: search, $options: "i" };
    }

    const [departments, total] = await Promise.all([
      Department.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Department.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        departments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated departments error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
