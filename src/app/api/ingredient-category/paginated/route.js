import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import IngredientCategory from "@/models/IngredientCategory";

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

    const [categories, total, totalCount, activeCount, inactiveCount] = await Promise.all([
      IngredientCategory.find(query)
        .sort({ categoryName: 1 })
        .skip(skip)
        .limit(limit),
      IngredientCategory.countDocuments(query),
      IngredientCategory.countDocuments({}),
      IngredientCategory.countDocuments({ isActive: true }),
      IngredientCategory.countDocuments({ isActive: false }),
    ]);

    return NextResponse.json(
      {
        categories,
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
    console.error("Get paginated ingredient categories error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
