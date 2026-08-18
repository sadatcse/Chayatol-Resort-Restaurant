import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import FolioEntry from "@/models/FolioEntry";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { discountType, value, applyTo, reason, idempotencyKey } = body;

    if (!discountType || value === undefined || isNaN(value) || Number(value) <= 0 || !applyTo) {
      return NextResponse.json({ message: "Please provide a valid discount type, positive value, and applyTo target (room, food, or all)." }, { status: 400 });
    }

    if (idempotencyKey) {
      const existing = await FolioEntry.findOne({ idempotencyKey, stayId: id });
      if (existing) {
        return NextResponse.json(existing, { status: 201 });
      }
    }

    const stay = await Stay.findById(id);
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    if (stay.status === "Checked Out") {
      return NextResponse.json({ message: "Cannot apply discount to a checked-out stay." }, { status: 400 });
    }

    const folioEntries = await FolioEntry.find({ stayId: id });
    
    // Filter base debit charges depending on target (room, food, or all)
    let baseCharges = [];
    let targetLabel = "Total Bill";

    if (applyTo === "room") {
      baseCharges = folioEntries.filter(entry => entry.type === "Room Charge");
      targetLabel = "Room Charges";
    } else if (applyTo === "food") {
      baseCharges = folioEntries.filter(entry => entry.type === "Food Charge");
      targetLabel = "Food Charges";
    } else {
      baseCharges = folioEntries.filter(entry => ["Room Charge", "Food Charge", "Service Charge", "Tax/VAT Charge", "Adjustment"].includes(entry.type));
      targetLabel = "Total Bill";
    }

    const grossBaseAmount = baseCharges.reduce((acc, entry) => acc + (entry.debit || 0), 0);

    if (grossBaseAmount <= 0) {
      return NextResponse.json({ message: `No applicable charges found for target: ${targetLabel}.` }, { status: 400 });
    }

    // Deduct existing discount credits already applied to this specific target or overall
    const existingDiscounts = folioEntries
      .filter(entry => entry.type === "Discount")
      .reduce((acc, entry) => acc + (entry.credit || 0), 0);

    const netBaseAmount = Math.max(0, grossBaseAmount - (applyTo === "all" ? existingDiscounts : 0));

    let discountAmount = 0;
    const numValue = Number(value);

    if (discountType === "percentage") {
      if (numValue > 100) {
        return NextResponse.json({ message: "Percentage discount cannot exceed 100%." }, { status: 400 });
      }
      discountAmount = netBaseAmount * (numValue / 100);
    } else {
      // Fixed Taka Amount
      discountAmount = numValue;
      if (discountAmount > netBaseAmount) {
        return NextResponse.json({ message: `Fixed discount (৳${discountAmount}) cannot exceed net available charges (৳${netBaseAmount.toFixed(2)}) for ${targetLabel}.` }, { status: 400 });
      }
    }

    discountAmount = Math.round(discountAmount * 100) / 100; // Round to 2 decimal places

    if (discountAmount <= 0) {
      return NextResponse.json({ message: "Calculated discount amount must be greater than 0." }, { status: 400 });
    }

    const staffId = auth.user?.id || auth.user?._id || null;
    const staffName = auth.user?.name || req.headers.get("x-user-name") || auth.user?.email || "Farnaj meherin";

    // Post Discount FolioEntry (Discount is a bill reduction credit, NOT a payment method)
    let discountEntry;
    try {
      discountEntry = await FolioEntry.create({
        stayId: id,
        type: "Discount",
        description: `Discount (${discountType === "percentage" ? `${numValue}%` : `৳${numValue}`}) applied on ${targetLabel} - Reason: ${reason || "N/A"}`,
        debit: 0,
        credit: discountAmount,
        createdBy: staffId,
        staffName,
        idempotencyKey: idempotencyKey || undefined
      });
    } catch (saveError) {
      if (saveError.code === 11000 && idempotencyKey) {
        const existing = await FolioEntry.findOne({ idempotencyKey, stayId: id });
        if (existing) {
          return NextResponse.json(existing, { status: 201 });
        }
      }
      throw saveError;
    }

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Applied discount: ${discountType === "percentage" ? `${numValue}%` : `৳${numValue}`} on ${targetLabel} (৳${discountAmount}) for stay ${stay.stayNo}. Reason: ${reason}`,
    });

    return NextResponse.json(discountEntry, { status: 201 });
  } catch (err) {
    console.error("POST discount error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
