import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const vendorData = await req.json();

    const { vendorID, vendorName, primaryPhone } = vendorData;

    // Validation
    if (!vendorID || !vendorID.trim()) {
      return NextResponse.json({ message: "Vendor ID is required." }, { status: 400 });
    }
    if (!vendorName || !vendorName.trim()) {
      return NextResponse.json({ message: "Vendor name is required." }, { status: 400 });
    }
    if (!primaryPhone || !primaryPhone.trim()) {
      return NextResponse.json({ message: "Primary phone is required." }, { status: 400 });
    }

    // Check unique vendorID
    const existing = await Vendor.findOne({
      vendorID: { $regex: new RegExp(`^${vendorID.trim()}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { message: "A vendor with this Vendor ID already exists." },
        { status: 400 }
      );
    }

    const result = await Vendor.create({
      vendorID: vendorID.trim().toUpperCase(),
      vendorName: vendorName.trim(),
      primaryPhone: primaryPhone.trim(),
      primaryEmail: vendorData.primaryEmail?.trim(),
      address: vendorData.address?.trim(),
      contactPersonName: vendorData.contactPersonName?.trim(),
      contactPersonPhone: vendorData.contactPersonPhone?.trim(),
      status: vendorData.status || "Active",
      notes: vendorData.notes?.trim(),
    });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created vendor: ${vendorName} (ID: ${vendorID})`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create vendor route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
