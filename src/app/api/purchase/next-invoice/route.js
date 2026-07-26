import { NextResponse } from "next/server";
import Purchase from "@/models/Purchase";
import { getNextSequence } from "@/lib/sequence";

export async function GET(req) {
  try {
    const prefix = "INV-";

    const seq = await getNextSequence("purchase-invoice", async () => {
      // Bootstrap from the current highest purchase invoice number the
      // first time this counter is used, continuing the existing sequence.
      const lastPurchase = await Purchase.findOne({ invoiceNumber: { $regex: `^${prefix}` } })
        .sort({ createdAt: -1 });
      if (!lastPurchase?.invoiceNumber) return 1000;
      const lastNumber = parseInt(lastPurchase.invoiceNumber.split(prefix)[1], 10);
      return isNaN(lastNumber) ? 1000 : lastNumber;
    });

    const nextInvoiceNumber = `${prefix}${seq}`;
    return NextResponse.json({ nextInvoiceNumber }, { status: 200 });
  } catch (err) {
    console.error("Get next invoice number error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
