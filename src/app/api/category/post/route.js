import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/Category";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const categoryData = await req.json();

    // Check name uniqueness
    const existing = await Category.findOne({
      categoryName: { $regex: new RegExp(`^${categoryData.categoryName.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Food category with this name already exists." },
        { status: 400 }
      );
    }

    const result = await Category.create(categoryData);

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created food category: ${categoryData.categoryName}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create category route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
