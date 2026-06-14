import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Purchase from "@/models/Purchase";
import Stock from "@/models/Stock";
import Ingredient from "@/models/Ingredient";
import StockMovement from "@/models/StockMovement";
import VendorPayment from "@/models/VendorPayment";
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

    const userId = (auth.user.id || auth.user._id)?.toString();

    const initialPaid = Number(paidAmount) || 0;
    const gTotal = Number(grandTotal) || 0;
    const invoicePaid = Math.min(initialPaid, gTotal);
    const excessPaid = initialPaid - invoicePaid;

    const paymentsList = [];
    if (invoicePaid > 0) {
      paymentsList.push({
        amount: invoicePaid,
        paymentDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        paymentMethod: paymentMethod || "Cash",
        note: "Initial payment upon invoice creation"
      });
    }

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
      grandTotal: gTotal,
      paymentStatus: invoicePaid >= gTotal ? "Paid" : (invoicePaid > 0 ? "Partial" : "Unpaid"),
      paidAmount: invoicePaid,
      paymentMethod,
      notes,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      payments: paymentsList,
    });

    await newPurchase.save();

    // Log the initial payment in the separate VendorPayment collection if applicable
    if (invoicePaid > 0) {
      await VendorPayment.create({
        vendor,
        purchase: newPurchase._id,
        invoiceNumber: invoiceNumber.trim(),
        amount: invoicePaid,
        paymentDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        paymentMethod: paymentMethod || "Cash",
        note: "Initial payment upon invoice creation",
        createdBy: userId,
      });
    }

    if (excessPaid > 0) {
      await VendorPayment.create({
        vendor,
        purchase: newPurchase._id,
        invoiceNumber: invoiceNumber.trim(),
        amount: excessPaid,
        paymentDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        paymentMethod: paymentMethod || "Cash",
        note: "Initial payment upon invoice creation (Excess Advance)",
        createdBy: userId,
      });
    }

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
