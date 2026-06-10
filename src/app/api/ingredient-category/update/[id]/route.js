import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import IngredientCategory from "@/models/IngredientCategory";
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

    if (!categoryData.categoryName || !categoryData.categoryName.trim()) {
      return NextResponse.json({ message: "Category name is required" }, { status: 400 });
    }

    // Check name uniqueness for other categories
    const existing = await IngredientCategory.findOne({
      categoryName: { $regex: new RegExp(`^${categoryData.categoryName.trim()}$`, "i") },
      _id: { $ne: id }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Another ingredient category with this name already exists." },
        { status: 400 }
      );
    }

    const result = await IngredientCategory.findByIdAndUpdate(
      id,
      {
        categoryName: categoryData.categoryName.trim(),
        isActive: categoryData.isActive !== undefined ? categoryData.isActive : true
      },
      { new: true }
    );

    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated ingredient category: ${id} (${categoryData.categoryName})`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: ingredient category ${id} not found`,
      });
      return NextResponse.json({ message: "Ingredient category not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update ingredient category route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
