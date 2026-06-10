import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Purchase from "@/models/Purchase";
import Stock from "@/models/Stock";
import Ingredient from "@/models/Ingredient";
import StockMovement from "@/models/StockMovement";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const purchaseData = await req.json();

    const { vendor, invoiceNumber, items, grandTotal, paymentStatus, paidAmount, paymentMethod, notes, purchaseDate } = purchaseData;

    // Validation
    if (!vendor) {
      return NextResponse.json({ message: "Vendor is required." }, { status: 400 });
    }
    if (!invoiceNumber || !invoiceNumber.trim()) {
      return NextResponse.json({ message: "Invoice number is required." }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ message: "At least one purchase item is required." }, { status: 400 });
    }

    const userId = auth.user._id;

    // Create the purchase record
    const newPurchase = new Purchase({
      vendor,
      invoiceNumber: invoiceNumber.trim(),
      items: items.map(item => ({
        ingredient: item.ingredient,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      grandTotal: Number(grandTotal),
      paymentStatus,
      paidAmount: Number(paidAmount) || 0,
      paymentMethod,
      notes,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
    });

    await newPurchase.save();

    // Loop through items and update stock level & movement logs
    for (const item of items) {
      const ingredientDetails = await Ingredient.findById(item.ingredient);
      if (!ingredientDetails) {
        throw new Error(`Ingredient with ID ${item.ingredient} not found.`);
      }

      // Check existing Stock entry
      let stockItem = await Stock.findOne({ ingredient: item.ingredient });
      let beforeQuantity = 0;

      if (!stockItem) {
        stockItem = new Stock({
          ingredient: item.ingredient,
          quantityInStock: 0,
          unit: ingredientDetails.unit,
        });
      } else {
        beforeQuantity = stockItem.quantityInStock;
      }

      const afterQuantity = beforeQuantity + Number(item.quantity);
      stockItem.quantityInStock = afterQuantity;
      await stockItem.save();

      // Log movement history
      await StockMovement.create({
        stock: stockItem._id,
        type: "purchase",
        beforeQuantity,
        afterQuantity,
        adjustment: Number(item.quantity),
        note: `From purchase #${invoiceNumber.trim()}.`,
        createdBy: userId,
      });
    }

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Recorded purchase invoice: ${invoiceNumber} (Total: ${grandTotal} BDT)`,
    });

    return NextResponse.json(newPurchase, { status: 201 });
  } catch (err) {
    console.error("Create purchase route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
