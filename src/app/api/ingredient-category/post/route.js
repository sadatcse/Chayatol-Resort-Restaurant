import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import IngredientCategory from "@/models/IngredientCategory";
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

    if (!categoryData.categoryName || !categoryData.categoryName.trim()) {
      return NextResponse.json({ message: "Category name is required" }, { status: 400 });
    }

    // Check name uniqueness
    const existing = await IngredientCategory.findOne({
      categoryName: { $regex: new RegExp(`^${categoryData.categoryName.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Ingredient category with this name already exists." },
        { status: 400 }
      );
    }

    const result = await IngredientCategory.create({
      categoryName: categoryData.categoryName.trim(),
      isActive: categoryData.isActive !== undefined ? categoryData.isActive : true
    });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created ingredient category: ${categoryData.categoryName}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create ingredient category route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
