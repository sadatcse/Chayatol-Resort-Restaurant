import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ResortInvoice from "@/models/ResortInvoice";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const invoice = await ResortInvoice.findById(id);

    if (!invoice) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invoice
    }, { status: 200 });
  } catch (error) {
    console.error("Get Single Invoice Error:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to fetch invoice"
    }, { status: 500 });
  }
}
