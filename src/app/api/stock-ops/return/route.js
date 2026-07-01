import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stock from "@/models/Stock";
import StockMovement from "@/models/StockMovement";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";
import mongoose from "mongoose";
import "@/models/IngredientCategory";

// GET — paginated return records
export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const skip = (page - 1) * limit;

    const matchQuery = { type: { $in: ["return_kitchen", "return_room"] } };
    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = new Date(from);
      if (to) matchQuery.createdAt.$lte = new Date(to);
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "stocks",
          localField: "stock",
          foreignField: "_id",
          as: "stockDetails",
        },
      },
      { $unwind: { path: "$stockDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "ingredients",
          localField: "stockDetails.ingredient",
          foreignField: "_id",
          as: "ingredientDetails",
        },
      },
      { $unwind: { path: "$ingredientDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "ingredientcategories",
          localField: "ingredientDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "ingredientDetails.name": { $regex: search, $options: "i" } },
            { kitchenName: { $regex: search, $options: "i" } },
            { roomNumber: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    const countPipeline = [
      ...pipeline,
      {
        $group: {
          _id: { $ifNull: ["$batchId", { $toString: "$_id" }] }
        }
      },
      { $count: "total" }
    ];

    const dataPipeline = [
      ...pipeline,
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $ifNull: ["$batchId", { $toString: "$_id" }] },
          batchId: { $first: { $ifNull: ["$batchId", { $toString: "$_id" }] } },
          createdAt: { $first: "$createdAt" },
          type: { $first: "$type" },
          kitchenName: { $first: "$kitchenName" },
          roomNumber: { $first: "$roomNumber" },
          createdBy: {
            $first: {
              _id: "$userDetails._id",
              name: "$userDetails.name"
            }
          },
          items: {
            $push: {
              _id: "$_id",
              adjustment: "$adjustment",
              beforeQuantity: "$beforeQuantity",
              afterQuantity: "$afterQuantity",
              note: "$note",
              ingredient: {
                _id: "$ingredientDetails._id",
                name: "$ingredientDetails.name",
                unit: "$ingredientDetails.unit",
                sku: "$ingredientDetails.sku",
                category: "$categoryDetails",
              },
              stock: { _id: "$stockDetails._id", quantityInStock: "$stockDetails.quantityInStock" },
            }
          }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const [countResult, data] = await Promise.all([
      StockMovement.aggregate(countPipeline),
      StockMovement.aggregate(dataPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    return NextResponse.json({
      data,
      pagination: { totalDocuments: total, totalPages: Math.ceil(total / limit), currentPage: page, limit },
    });
  } catch (err) {
    console.error("GET returns error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — record a return (from kitchen or room)
export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const userId = (auth.user.id || auth.user._id)?.toString();

    const isBulk = Array.isArray(body.items);
    const date = body.date ? new Date(body.date) : new Date();

    const returnType = body.returnType;
    const kitchenName = body.kitchenName;
    const roomNumber = body.roomNumber;

    if (!returnType || !["return_kitchen", "return_room"].includes(returnType)) {
      return NextResponse.json({ message: "Return type must be 'return_kitchen' or 'return_room'." }, { status: 400 });
    }
    if (returnType === "return_kitchen" && !kitchenName?.trim()) {
      return NextResponse.json({ message: "Kitchen name is required for kitchen returns." }, { status: 400 });
    }
    if (returnType === "return_room" && !roomNumber?.trim()) {
      return NextResponse.json({ message: "Room number is required for room returns." }, { status: 400 });
    }

    // Deduplication check: check if a matching return was created by the same user in the last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const potentialDuplicate = await StockMovement.findOne({
      type: returnType,
      kitchenName: returnType === "return_kitchen" ? kitchenName.trim() : undefined,
      roomNumber: returnType === "return_room" ? roomNumber.trim() : undefined,
      createdBy: userId,
      createdAt: { $gte: tenSecondsAgo }
    });
    if (potentialDuplicate) {
      return NextResponse.json({ message: "Duplicate return submission detected. Please wait a moment." }, { status: 409 });
    }

    const items = isBulk ? body.items : [body];

    if (items.length === 0) {
      return NextResponse.json({ message: "At least one item is required." }, { status: 400 });
    }

    // 1. Validation Phase
    const validatedItems = [];
    for (const item of items) {
      const { ingredientId, quantity, note } = item;

      if (!ingredientId) {
        return NextResponse.json({ message: "Ingredient is required for all items." }, { status: 400 });
      }
      if (!quantity || Number(quantity) <= 0) {
        return NextResponse.json({ message: "Quantity must be greater than zero for all items." }, { status: 400 });
      }

      const qty = Number(quantity);
      const stockItem = await Stock.findOne({ ingredient: new mongoose.Types.ObjectId(ingredientId) });
      if (!stockItem) {
        return NextResponse.json({ message: `No stock record found for ingredient ID: ${ingredientId}` }, { status: 404 });
      }

      validatedItems.push({
        stockItem,
        ingredientId,
        qty,
        note: note || "",
      });
    }

    // 2. Execution Phase
    const movements = [];
    const batchId = new mongoose.Types.ObjectId().toString(); // Generate unique batch ID
    for (const validated of validatedItems) {
      const { stockItem, ingredientId, qty, note } = validated;

      const beforeQuantity = stockItem.quantityInStock;
      const afterQuantity = beforeQuantity + qty;

      stockItem.quantityInStock = afterQuantity;
      await stockItem.save();

      const movementData = {
        stock: stockItem._id,
        ingredient: new mongoose.Types.ObjectId(ingredientId),
        type: returnType,
        beforeQuantity,
        afterQuantity,
        adjustment: qty,
        note,
        createdBy: userId,
        createdAt: date,
        batchId,
      };
      if (returnType === "return_kitchen") movementData.kitchenName = kitchenName.trim();
      if (returnType === "return_room") movementData.roomNumber = roomNumber.trim();

      const movement = await StockMovement.create(movementData);

      await logTransaction({
        req,
        resStatus: 201,
        user: auth.user,
        details: `Return recorded: +${qty} units of ingredient ${ingredientId} — Type: ${returnType}`,
      });

      movements.push(movement);
    }

    return NextResponse.json(isBulk ? { success: true, count: movements.length, movements } : movements[0], { status: 201 });
  } catch (err) {
    console.error("POST return error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
