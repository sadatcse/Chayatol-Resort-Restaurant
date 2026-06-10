import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stock from "@/models/Stock";
import StockMovement from "@/models/StockMovement";
import User from "@/models/User"; // Ensure registered

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    // Check if the id belongs to a Stock or an Ingredient (virtual)
    let stockId = id;
    const stockExists = await Stock.findById(id);
    if (!stockExists) {
      // If it doesn't exist as a stock, search if there's a stock with this ingredient ID
      const stockFromIngredient = await Stock.findOne({ ingredient: id });
      if (!stockFromIngredient) {
        // No stock record exists yet, so there are no movements
        return NextResponse.json([], { status: 200 });
      }
      stockId = stockFromIngredient._id;
    }

    const result = await StockMovement.find({ stock: stockId })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get stock movements error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
