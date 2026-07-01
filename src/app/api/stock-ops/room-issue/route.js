import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stock from "@/models/Stock";
import StockMovement from "@/models/StockMovement";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";
import mongoose from "mongoose";
import "@/models/IngredientCategory";

// GET — paginated room issue records
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

    const matchQuery = { type: "room_issue" };
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
            { roomNumber: { $regex: search, $options: "i" } },
            { guestName: { $regex: search, $options: "i" } },
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
          roomNumber: { $first: "$roomNumber" },
          guestName: { $first: "$guestName" },
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
      pagination: {
        totalDocuments: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error("GET room-issue error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — record a room consumable issue
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

    const roomNumber = body.roomNumber;
    const guestName = body.guestName?.trim() || "";
    if (!roomNumber || !roomNumber.trim()) {
      return NextResponse.json({ message: "Room number is required." }, { status: 400 });
    }

    // Deduplication check: check if a room issue of the same roomNumber was created by the same user in the last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const potentialDuplicate = await StockMovement.findOne({
      type: "room_issue",
      roomNumber: roomNumber.trim(),
      createdBy: userId,
      createdAt: { $gte: tenSecondsAgo }
    });
    if (potentialDuplicate) {
      return NextResponse.json({ message: "Duplicate room issue submission detected. Please wait a moment." }, { status: 409 });
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
      if (stockItem.quantityInStock < qty) {
        return NextResponse.json({
          message: `Insufficient stock for ingredient: ${stockItem.unit || "item"}. Available: ${stockItem.quantityInStock}, requested: ${qty}`,
        }, { status: 400 });
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
      const afterQuantity = beforeQuantity - qty;

      stockItem.quantityInStock = afterQuantity;
      await stockItem.save();

      const movement = await StockMovement.create({
        stock: stockItem._id,
        ingredient: new mongoose.Types.ObjectId(ingredientId),
        type: "room_issue",
        beforeQuantity,
        afterQuantity,
        adjustment: -qty,
        roomNumber: roomNumber.trim(),
        guestName,
        note,
        createdBy: userId,
        createdAt: date,
        batchId,
      });

      await logTransaction({
        req,
        resStatus: 201,
        user: auth.user,
        details: `Room issue: ${qty} units of ingredient ${ingredientId} → Room ${roomNumber}`,
      });

      movements.push(movement);
    }

    return NextResponse.json(isBulk ? { success: true, count: movements.length, movements } : movements[0], { status: 201 });
  } catch (err) {
    console.error("POST room-issue error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
