import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ResortInvoice from "@/models/ResortInvoice";

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const invoice = await ResortInvoice.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Invoice updated successfully",
      invoice
    }, { status: 200 });
  } catch (error) {
    console.error("Update Invoice Error:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to update invoice"
    }, { status: 500 });
  }
}
