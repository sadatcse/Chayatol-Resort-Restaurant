import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PaymentType from "@/models/PaymentType";

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

    const [paymentTypes, total] = await Promise.all([
      PaymentType.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      PaymentType.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        paymentTypes,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated payment types error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
