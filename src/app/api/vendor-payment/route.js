import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VendorPayment from "@/models/VendorPayment";
import Purchase from "@/models/Purchase";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId");
    const fromDate = searchParams.get("fromDate");
    const toDate   = searchParams.get("toDate");

    if (!vendorId) {
      return NextResponse.json({ error: "vendorId query parameter is required" }, { status: 400 });
    }

    // Build date filter
    const dateFilter = {};
    if (fromDate || toDate) {
      dateFilter.paymentDate = {};
      if (fromDate) dateFilter.paymentDate.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.paymentDate.$lte = end;
      }
    }

    // 1. Fetch existing payments from VendorPayment collection
    let payments = await VendorPayment.find({ vendor: vendorId, ...dateFilter }).sort({ paymentDate: -1 });

    // 2. Migration fallback: If no payments exist in the new collection,
    // fetch all purchases for this vendor to migrate any embedded payments on-the-fly.
    if (payments.length === 0) {
      const purchases = await Purchase.find({ vendor: vendorId, paidAmount: { $gt: 0 } });
      const migratedPayments = [];

      for (const purchase of purchases) {
        if (purchase.payments && purchase.payments.length > 0) {
          for (const p of purchase.payments) {
            // Check if this specific payment was already migrated to prevent duplicates
            // (e.g. if we partially migrated or if one-to-one mapping exists)
            const exists = await VendorPayment.findOne({
              vendor: vendorId,
              purchase: purchase._id,
              amount: p.amount,
              paymentDate: p.paymentDate
            });

            if (!exists) {
              const newPayment = await VendorPayment.create({
                vendor: vendorId,
                purchase: purchase._id,
                invoiceNumber: purchase.invoiceNumber,
                amount: p.amount,
                paymentDate: p.paymentDate,
                purchaseDate: purchase.purchaseDate,
                paymentMethod: p.paymentMethod || "Cash",
                note: p.note || "Migrated from purchase log"
              });
              migratedPayments.push(newPayment);
            }
          }
        }
      }

      if (migratedPayments.length > 0) {
        payments = await VendorPayment.find({ vendor: vendorId }).sort({ paymentDate: -1 });
      }
    }

    return NextResponse.json(payments, { status: 200 });
  } catch (error) {
    console.error("GET /api/vendor-payment error:", error);
    return NextResponse.json({ error: "Failed to retrieve vendor payments" }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const payload = await req.json();
    const { vendor, purchase, invoiceNumber, amount, paymentDate, paymentMethod, note } = payload;

    if (!vendor || !amount) {
      return NextResponse.json({ error: "Missing required fields (vendor or amount)" }, { status: 400 });
    }

    const userId = auth.user.id || auth.user._id;

    // Deduplication check: check if a matching payment was created in the last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const potentialDuplicate = await VendorPayment.findOne({
      vendor,
      amount: Number(amount),
      paymentMethod,
      createdAt: { $gte: tenSecondsAgo }
    });
    if (potentialDuplicate) {
      return NextResponse.json({ error: "Duplicate payment detected. Please wait a moment." }, { status: 409 });
    }

    const newPayment = await VendorPayment.create({
      vendor,
      purchase: purchase || null,
      invoiceNumber: invoiceNumber || "",
      amount: Number(amount),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || "Cash",
      note: note || "Advance payment / general adjustment",
      createdBy: userId
    });

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error) {
    console.error("POST /api/vendor-payment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
