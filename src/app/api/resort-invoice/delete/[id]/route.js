import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ResortInvoice from "@/models/ResortInvoice";

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const invoice = await ResortInvoice.findByIdAndDelete(id);

    if (!invoice) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Invoice deleted successfully",
    }, { status: 200 });
  } catch (error) {
    console.error("Delete Invoice Error:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to delete invoice"
    }, { status: 500 });
  }
}
