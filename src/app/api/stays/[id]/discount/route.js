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
    const { discountType, value, applyTo, reason } = body;

    if (!discountType || value === undefined || isNaN(value) || Number(value) <= 0 || !applyTo) {
      return NextResponse.json({ message: "Please provide a valid discount type, positive value, and applyTo target." }, { status: 400 });
    }

    const stay = await Stay.findById(id);
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    if (stay.status === "Checked Out") {
      return NextResponse.json({ message: "Cannot apply discount to checked-out stay." }, { status: 400 });
    }

    const folioEntries = await FolioEntry.find({ stayId: id });
    
    let baseCharges = [];
    if (applyTo === "room") {
      baseCharges = folioEntries.filter(entry => entry.type === "Room Charge");
    } else if (applyTo === "food") {
      baseCharges = folioEntries.filter(entry => entry.type === "Food Charge");
    } else {
      baseCharges = folioEntries.filter(entry => ["Room Charge", "Food Charge", "Service Charge", "Tax/VAT Charge", "Adjustment"].includes(entry.type));
    }

    const baseAmount = baseCharges.reduce((acc, entry) => acc + (entry.debit || 0), 0);

    let discountAmount = 0;
    if (discountType === "percentage") {
      discountAmount = baseAmount * (Number(value) / 100);
    } else {
      discountAmount = Number(value);
    }

    if (discountAmount <= 0) {
      return NextResponse.json({ message: "Calculated discount amount must be greater than 0." }, { status: 400 });
    }

    const discountEntry = await FolioEntry.create({
      stayId: id,
      type: "Discount",
      description: `Discount (${discountType === "percentage" ? `${value}%` : `৳${value}`}) applied on ${applyTo === "all" ? "Total Bill" : applyTo === "room" ? "Room Charges" : "Food Charges"} - Reason: ${reason || "N/A"}`,
      debit: 0,
      credit: Math.round(discountAmount)
    });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Applied discount: ${discountType === "percentage" ? `${value}%` : `৳${value}`} on ${applyTo} for stay ${stay.stayNo}. Reason: ${reason}`,
    });

    return NextResponse.json(discountEntry, { status: 201 });
  } catch (err) {
    console.error("POST discount error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
