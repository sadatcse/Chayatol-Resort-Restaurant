import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Purchase from "@/models/Purchase";
import Stock from "@/models/Stock";
import Ingredient from "@/models/Ingredient";
import StockMovement from "@/models/StockMovement";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
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

    // Fetch original purchase
    const originalPurchase = await Purchase.findById(id);
    if (!originalPurchase) {
      return NextResponse.json({ message: "Purchase not found." }, { status: 404 });
    }

    const originalItemsMap = new Map(originalPurchase.items.map(item => [item.ingredient.toString(), item]));
    const newItemsMap = new Map(items.map(item => [item.ingredient.toString(), item]));
    const allIngredientIds = new Set([...originalItemsMap.keys(), ...newItemsMap.keys()]);

    // Calculate diffs and adjust stock
    for (const ingredientId of allIngredientIds) {
      const oldItem = originalItemsMap.get(ingredientId);
      const newItem = newItemsMap.get(ingredientId);
      const oldQty = oldItem ? oldItem.quantity : 0;
      const newQty = newItem ? newItem.quantity : 0;
      const adjustment = newQty - oldQty;

      if (adjustment !== 0) {
        let stockItem = await Stock.findOne({ ingredient: ingredientId });

        if (!stockItem) {
          // If no stock record exists yet and adjustment is negative, throw an error
          if (adjustment < 0) {
            throw new Error(`Cannot deduct stock for ingredient ${ingredientId} as it has no stock record.`);
          }
          // Fetch ingredient unit details
          const ing = await Ingredient.findById(ingredientId);
          stockItem = new Stock({
            ingredient: ingredientId,
            quantityInStock: 0,
            unit: ing ? ing.unit : "Pcs",
          });
        }

        const beforeQuantity = stockItem.quantityInStock;
        const afterQuantity = beforeQuantity + adjustment;

        stockItem.quantityInStock = afterQuantity;
        await stockItem.save();

        // Create Stock Movement log
        await StockMovement.create({
          stock: stockItem._id,
          type: "purchase",
          beforeQuantity,
          afterQuantity,
          adjustment,
          note: `Adjustment from updating purchase #${invoiceNumber.trim()}.`,
          createdBy: userId,
        });
      }
    }

    // Save updated purchase
    const updatedPurchase = await Purchase.findByIdAndUpdate(
      id,
      {
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
      },
      { new: true }
    );

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Updated purchase invoice: ${id} (${invoiceNumber})`,
    });

    return NextResponse.json(updatedPurchase, { status: 200 });
  } catch (err) {
    console.error("Update purchase route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
