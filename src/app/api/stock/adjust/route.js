import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stock from "@/models/Stock";
import Ingredient from "@/models/Ingredient";
import StockMovement from "@/models/StockMovement";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";
import mongoose from "mongoose";

export async function PUT(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const userId = auth.user.id || auth.user._id;

    const isBulk = Array.isArray(body.items);
    const adjustments = isBulk ? body.items : [body];

    // Pre-validate all items
    for (const item of adjustments) {
      const { stockId, newQuantity } = item;
      if (newQuantity == null || isNaN(newQuantity) || Number(newQuantity) < 0) {
        return NextResponse.json({ message: "A valid positive new quantity is required for all items." }, { status: 400 });
      }
      if (!stockId) {
        return NextResponse.json({ message: "stockId is required for all items." }, { status: 400 });
      }
    }

    const results = [];

    for (const item of adjustments) {
      const { stockId, newQuantity, note } = item;
      const targetQty = Number(newQuantity);

      // Check if stockId matches a Stock record or a virtual Ingredient ID
      let stock = await Stock.findById(stockId);
      let ingredientId = null;

      if (!stock) {
        // Check if it's an ingredient ID
        const ingredient = await Ingredient.findById(stockId);
        if (!ingredient) {
          return NextResponse.json({ message: `Stock item or ingredient not found: ${stockId}` }, { status: 404 });
        }
        ingredientId = ingredient._id;

        // Find if Stock record exists for this ingredient
        stock = await Stock.findOne({ ingredient: ingredientId });
        if (!stock) {
          // Create stock record lazily
          stock = new Stock({
            ingredient: ingredientId,
            quantityInStock: 0,
            unit: ingredient.unit,
          });
        }
      } else {
        ingredientId = stock.ingredient;
      }

      const beforeQuantity = stock.quantityInStock;
      const adjustment = targetQty - beforeQuantity;

      // Save stock level
      stock.quantityInStock = targetQty;
      await stock.save();

      // Create Stock Movement log
      await StockMovement.create({
        stock: stock._id,
        type: "manual_adjustment",
        beforeQuantity,
        afterQuantity: targetQty,
        adjustment,
        note: note || "Manual adjustment count check.",
        createdBy: userId,
      });

      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Manually adjusted stock of ${ingredientId}: ${beforeQuantity} -> ${targetQty} (${adjustment >= 0 ? "+" : ""}${adjustment})`,
      });

      results.push(stock);
    }

    return NextResponse.json(isBulk ? { success: true, count: results.length } : results[0], { status: 200 });
  } catch (err) {
    console.error("Adjust stock route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
