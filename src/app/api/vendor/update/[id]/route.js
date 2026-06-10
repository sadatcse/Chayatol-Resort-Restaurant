import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";
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

    // Check unique vendorID excluding current ID
    const existing = await Vendor.findOne({
      vendorID: { $regex: new RegExp(`^${vendorID.trim()}$`, "i") },
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Another vendor with this Vendor ID already exists." },
        { status: 400 }
      );
    }

    const result = await Vendor.findByIdAndUpdate(
      id,
      {
        vendorID: vendorID.trim().toUpperCase(),
        vendorName: vendorName.trim(),
        primaryPhone: primaryPhone.trim(),
        primaryEmail: vendorData.primaryEmail?.trim(),
        address: vendorData.address?.trim(),
        contactPersonName: vendorData.contactPersonName?.trim(),
        contactPersonPhone: vendorData.contactPersonPhone?.trim(),
        status: vendorData.status || "Active",
        notes: vendorData.notes?.trim(),
      },
      { new: true }
    );

    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated vendor: ${id} (${vendorName})`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: vendor ${id} not found`,
      });
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update vendor route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
