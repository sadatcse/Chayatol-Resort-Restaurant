import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Purchase from "@/models/Purchase";

export async function GET(req) {
  try {
    await dbConnect();
    const prefix = "INV-";

    const lastPurchase = await Purchase.findOne({ invoiceNumber: { $regex: `^${prefix}` } })
      .sort({ createdAt: -1 });

    let nextNumber = 1001;

    if (lastPurchase && lastPurchase.invoiceNumber) {
      const lastNumber = parseInt(lastPurchase.invoiceNumber.split(prefix)[1]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const nextInvoiceNumber = `${prefix}${nextNumber}`;
    return NextResponse.json({ nextInvoiceNumber }, { status: 200 });
  } catch (err) {
    console.error("Get next invoice number error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
