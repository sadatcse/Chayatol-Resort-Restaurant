import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Purchase from "@/models/Purchase";
import Stock from "@/models/Stock";
import StockMovement from "@/models/StockMovement";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const userId = auth.user._id;

    // Fetch the purchase invoice to delete
    const purchaseToDelete = await Purchase.findById(id);
    if (!purchaseToDelete) {
      return NextResponse.json({ message: "Purchase not found." }, { status: 404 });
    }

    // Reverse the stock levels of the items
    for (const item of purchaseToDelete.items) {
      const stockItem = await Stock.findOne({ ingredient: item.ingredient });

      if (stockItem) {
        const beforeQuantity = stockItem.quantityInStock;
        const adjustment = -Number(item.quantity);
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
          note: `Reversal from deleting purchase #${purchaseToDelete.invoiceNumber}.`,
          createdBy: userId,
        });
      }
    }

    // Delete the purchase invoice
    await Purchase.findByIdAndDelete(id);

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Deleted purchase invoice: ${id} (${purchaseToDelete.invoiceNumber})`,
    });

    return NextResponse.json({ message: "Purchase deleted successfully." }, { status: 200 });
  } catch (err) {
    console.error("Delete purchase route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
