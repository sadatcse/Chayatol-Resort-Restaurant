import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import mongoose from "mongoose";
import "@/models/IngredientCategory"; // Ensure model is registered

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "";
    const unit = searchParams.get("unit") || "";
    const lowStock = searchParams.get("lowStock") || "false";

    const skip = (page - 1) * limit;

    // Build the aggregation pipeline for search & join
    const searchPipeline = [
      {
        $lookup: {
          from: "ingredientcategories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: {
          path: "$categoryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "stocks",
          localField: "_id",
          foreignField: "ingredient",
          as: "stockDetails",
        },
      },
      {
        $unwind: {
          path: "$stockDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Status filter
    if (status === "active") {
      searchPipeline.push({ $match: { isActive: true } });
    } else if (status === "inactive") {
      searchPipeline.push({ $match: { isActive: false } });
    }

    // Category filter
    if (category) {
      searchPipeline.push({ $match: { category: new mongoose.Types.ObjectId(category) } });
    }

    // Unit filter
    if (unit) {
      searchPipeline.push({ $match: { unit: unit } });
    }

    // Low Stock filter
    if (lowStock === "true") {
      searchPipeline.push({
        $match: {
          $expr: {
            $lt: [
              { $ifNull: ["$stockDetails.quantityInStock", 0] },
              "$stockAlert",
            ],
          },
        },
      });
    }

    // Search filter
    if (search) {
      searchPipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { sku: { $regex: search, $options: "i" } },
            { "categoryDetails.categoryName": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    const dataPipeline = [
      ...searchPipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          name: 1,
          category: "$categoryDetails",
          unit: 1,
          sku: 1,
          stockAlert: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    // For count, we need the matching pipeline followed by count
    const countPipeline = [...searchPipeline, { $count: "total" }];

    const [result, totalCount, activeCount, inactiveCount] = await Promise.all([
      Ingredient.aggregate([
        {
          $facet: {
            data: dataPipeline,
            count: countPipeline,
          },
        },
      ]),
      Ingredient.countDocuments({}),
      Ingredient.countDocuments({ isActive: true }),
      Ingredient.countDocuments({ isActive: false }),
    ]);

    const ingredients = result[0].data;
    const total = result[0].count[0] ? result[0].count[0].total : 0;

    return NextResponse.json(
      {
        ingredients,
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
    console.error("Get paginated ingredients route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
