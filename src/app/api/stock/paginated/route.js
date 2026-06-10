import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import Stock from "@/models/Stock";
import mongoose from "mongoose";
import "@/models/IngredientCategory";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const lowStock = searchParams.get("lowStock") === "true";

    const skip = (page - 1) * limit;

    const matchQuery = {};
    if (category) {
      matchQuery.category = new mongoose.Types.ObjectId(category);
    }
    if (search) {
      matchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      { $match: matchQuery },
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
    ];

    if (lowStock) {
      pipeline.push({
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

    // Clone pipeline for count
    const countPipeline = [...pipeline, { $count: "total" }];

    // Add pagination & sorting
    const dataPipeline = [
      ...pipeline,
      { $sort: { "stockDetails.updatedAt": -1, name: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: { $ifNull: ["$stockDetails._id", "$_id"] }, // Fallback to ingredient _id if no stock entry
          isVirtual: { $cond: [{ $ifNull: ["$stockDetails._id", false] }, false, true] },
          ingredient: {
            _id: "$_id",
            name: "$name",
            sku: "$sku",
            stockAlert: "$stockAlert",
            category: "$categoryDetails",
          },
          quantityInStock: { $ifNull: ["$stockDetails.quantityInStock", 0] },
          unit: "$unit",
          updatedAt: { $ifNull: ["$stockDetails.updatedAt", "$updatedAt"] },
        },
      },
    ];

    const lowStockCountPipeline = [
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
      {
        $match: {
          $expr: {
            $lt: [
              { $ifNull: ["$stockDetails.quantityInStock", 0] },
              "$stockAlert",
            ],
          },
        },
      },
      { $count: "total" }
    ];

    const outOfStockCountPipeline = [
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
      {
        $match: {
          $expr: {
            $eq: [
              { $ifNull: ["$stockDetails.quantityInStock", 0] },
              0,
            ],
          },
        },
      },
      { $count: "total" }
    ];

    const [result, totalCount, lowStockResult, outOfStockResult] = await Promise.all([
      Ingredient.aggregate([
        {
          $facet: {
            data: dataPipeline,
            count: countPipeline,
          },
        },
      ]),
      Ingredient.countDocuments({}),
      Ingredient.aggregate(lowStockCountPipeline),
      Ingredient.aggregate(outOfStockCountPipeline)
    ]);

    const stocks = result[0].data;
    const total = result[0].count[0] ? result[0].count[0].total : 0;
    const lowStockCount = lowStockResult[0] ? lowStockResult[0].total : 0;
    const outOfStockCount = outOfStockResult[0] ? outOfStockResult[0].total : 0;

    return NextResponse.json(
      {
        data: stocks,
        totalCount,
        lowStockCount,
        outOfStockCount,
        pagination: {
          totalDocuments: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Get paginated stock error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
