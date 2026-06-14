import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Purchase from "@/models/Purchase";
import Stock from "@/models/Stock";
import Ingredient from "@/models/Ingredient";
import StockMovement from "@/models/StockMovement";
import VendorPayment from "@/models/VendorPayment";
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

    const { vendor, invoiceNumber, items, grandTotal, paymentStatus, paidAmount, paymentMethod, notes, purchaseDate, payments } = purchaseData;

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

    // Fetch original purchase
    const originalPurchase = await Purchase.findById(id);
    if (!originalPurchase) {
      return NextResponse.json({ message: "Purchase not found." }, { status: 404 });
    }

    const originalPayments = originalPurchase.payments || [];
    let updatedPayments = [];
    let invoicePaidAmount = Number(paidAmount) || 0;

    if (payments !== undefined) {
      // Request came from ledger/page.jsx which supplies the full payments list
      updatedPayments = payments;
      invoicePaidAmount = Number(paidAmount) || 0;

      const originalIds = new Set(originalPayments.map(p => p._id ? p._id.toString() : ''));
      const newPayments = updatedPayments.filter(p => !p._id || !originalIds.has(p._id.toString()));

      for (const p of newPayments) {
        await VendorPayment.create({
          vendor: vendor,
          purchase: originalPurchase._id,
          invoiceNumber: invoiceNumber.trim(),
          amount: Number(p.amount),
          paymentDate: p.paymentDate ? new Date(p.paymentDate) : new Date(),
          purchaseDate: originalPurchase.purchaseDate ? new Date(originalPurchase.purchaseDate) : new Date(),
          paymentMethod: p.paymentMethod || paymentMethod || "Cash",
          note: p.note || "Invoice payment clearance",
          createdBy: userId
        });
      }
    } else {
      // Request came from purchases/page.jsx edit form (which does not supply the payments list)
      const incomingPaid = Number(paidAmount) || 0;
      const gTotal = Number(grandTotal) || 0;
      const originalPaid = originalPurchase.paidAmount || 0;

      invoicePaidAmount = Math.min(incomingPaid, gTotal);
      const excessPaid = incomingPaid - invoicePaidAmount;

      updatedPayments = [...originalPayments];

      const paidDiff = incomingPaid - originalPaid;
      if (paidDiff > 0) {
        const originalAllowedPaid = Math.min(originalPaid, gTotal);
        const invoicePaidDiff = invoicePaidAmount - originalAllowedPaid;
        const excessPaidDiff = paidDiff - invoicePaidDiff;

        if (invoicePaidDiff > 0) {
          updatedPayments.push({
            amount: invoicePaidDiff,
            paymentDate: new Date(),
            paymentMethod: paymentMethod || "Cash",
            note: "Payment adjustment during purchase update"
          });

          await VendorPayment.create({
            vendor: vendor,
            purchase: originalPurchase._id,
            invoiceNumber: invoiceNumber.trim(),
            amount: invoicePaidDiff,
            paymentDate: new Date(),
            purchaseDate: originalPurchase.purchaseDate ? new Date(originalPurchase.purchaseDate) : new Date(),
            paymentMethod: paymentMethod || "Cash",
            note: "Payment adjustment during purchase update",
            createdBy: userId
          });
        }

        if (excessPaidDiff > 0) {
          await VendorPayment.create({
            vendor: vendor,
            purchase: originalPurchase._id,
            invoiceNumber: invoiceNumber.trim(),
            amount: excessPaidDiff,
            paymentDate: new Date(),
            purchaseDate: originalPurchase.purchaseDate ? new Date(originalPurchase.purchaseDate) : new Date(),
            paymentMethod: paymentMethod || "Cash",
            note: "Payment adjustment during purchase update (Excess Advance)",
            createdBy: userId
          });
        }
      }
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

    const finalPaymentStatus = invoicePaidAmount >= Number(grandTotal) ? "Paid" : (invoicePaidAmount > 0 ? "Partial" : "Unpaid");

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
        paymentStatus: finalPaymentStatus,
        paidAmount: invoicePaidAmount,
        paymentMethod,
        notes,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        payments: updatedPayments,
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
