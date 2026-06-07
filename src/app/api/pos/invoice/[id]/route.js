import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Invoice from "@/models/Invoice";

const MONGO_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invoice }, { status: 200 });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const updateData = await req.json();
    
    const updatedInvoice = await Invoice.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedInvoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedInvoice }, { status: 200 });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const deletedInvoice = await Invoice.findByIdAndDelete(id);
    
    if (!deletedInvoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} }, { status: 200 });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
