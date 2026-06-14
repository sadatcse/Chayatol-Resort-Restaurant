import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import IngredientCategory from "@/models/IngredientCategory";
import Ingredient from "@/models/Ingredient";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.categoryName = { $regex: search, $options: "i" };
    }
    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const [categoriesDocs, total, totalCount, activeCount, inactiveCount] = await Promise.all([
      IngredientCategory.find(query)
        .sort({ categoryName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IngredientCategory.countDocuments(query),
      IngredientCategory.countDocuments({}),
      IngredientCategory.countDocuments({ isActive: true }),
      IngredientCategory.countDocuments({ isActive: false }),
    ]);

    const categories = await Promise.all(
      categoriesDocs.map(async (cat) => {
        const ingredientCount = await Ingredient.countDocuments({ category: cat._id });
        return {
          ...cat,
          ingredientCount,
        };
      })
    );

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
