import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/Category";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const categoryData = await req.json();

    // Check name uniqueness for other categories
    const existing = await Category.findOne({
      categoryName: { $regex: new RegExp(`^${categoryData.categoryName.trim()}$`, "i") },
      _id: { $ne: id }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Another food category with this name already exists." },
        { status: 400 }
      );
    }

    const result = await Category.findByIdAndUpdate(id, categoryData, { new: true });
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated food category: ${id} (${categoryData.categoryName})`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: food category ${id} not found`,
      });
      return NextResponse.json({ message: "Food category not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update category route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
