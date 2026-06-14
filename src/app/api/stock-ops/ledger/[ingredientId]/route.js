import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import StockMovement from "@/models/StockMovement";
import Stock from "@/models/Stock";
import Ingredient from "@/models/Ingredient";
import { verifyToken } from "@/lib/auth";
import mongoose from "mongoose";
import "@/models/IngredientCategory";

// GET /api/stock-ops/ledger/[ingredientId]
// Returns the full chronological movement history for one ingredient
export async function GET(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { ingredientId } = await params;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!mongoose.Types.ObjectId.isValid(ingredientId)) {
      return NextResponse.json({ message: "Invalid ingredient ID." }, { status: 400 });
    }

    // Find the stock record for this ingredient
    const stockItem = await Stock.findOne({ ingredient: new mongoose.Types.ObjectId(ingredientId) });

    // Get ingredient details
    const ingredient = await Ingredient.findById(ingredientId).populate("category");
    if (!ingredient) {
      return NextResponse.json({ message: "Ingredient not found." }, { status: 404 });
    }

    const matchQuery = {};
    if (stockItem) {
      matchQuery.stock = stockItem._id;
    } else {
      // No stock record → return empty ledger
      return NextResponse.json({
        ingredient: {
          _id: ingredient._id,
          name: ingredient.name,
          unit: ingredient.unit,
          sku: ingredient.sku,
          category: ingredient.category,
          stockAlert: ingredient.stockAlert,
        },
        currentStock: 0,
        movements: [],
      });
    }

    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = new Date(from);
      if (to) matchQuery.createdAt.$lte = new Date(to);
    }

    const movements = await StockMovement.find(matchQuery)
      .populate("createdBy", "name email")
      .sort({ createdAt: 1 }) // ascending for running balance calculation
      .lean();

    // Calculate running balance for each row
    let runningBalance = 0;
    const ledgerRows = movements.map((m) => {
      runningBalance = m.afterQuantity; // afterQuantity is the ground truth
      return {
        _id: m._id,
        date: m.createdAt,
        type: m.type,
        adjustment: m.adjustment,
        qtyIn: m.adjustment > 0 ? m.adjustment : 0,
        qtyOut: m.adjustment < 0 ? Math.abs(m.adjustment) : 0,
        balance: m.afterQuantity,
        note: m.note || "",
        reason: m.reason || "",
        kitchenName: m.kitchenName || "",
        roomNumber: m.roomNumber || "",
        guestName: m.guestName || "",
        createdBy: m.createdBy,
      };
    });

    return NextResponse.json({
      ingredient: {
        _id: ingredient._id,
        name: ingredient.name,
        unit: ingredient.unit,
        sku: ingredient.sku,
        category: ingredient.category,
        stockAlert: ingredient.stockAlert,
      },
      currentStock: stockItem.quantityInStock,
      movements: ledgerRows,
    });
  } catch (err) {
    console.error("GET ledger error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
