import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Invoice from "@/models/Invoice";

const MONGO_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const data = await req.json();

    // Auto-generate invoiceNo if not provided
    if (!data.invoiceNo) {
      const today = new Date();
      const dateString = today.toISOString().slice(0, 10).replace(/-/g, "");
      
      // Find the last invoice for today to increment the number
      const lastInvoice = await Invoice.findOne({
        invoiceNo: new RegExp(`^INV-${dateString}-`),
      }).sort({ createdAt: -1 });

      let nextNumber = "001";
      if (lastInvoice && lastInvoice.invoiceNo) {
        const lastParts = lastInvoice.invoiceNo.split("-");
        const lastNum = parseInt(lastParts[2], 10);
        if (!isNaN(lastNum)) {
          nextNumber = (lastNum + 1).toString().padStart(3, "0");
        }
      }
      data.invoiceNo = `INV-${dateString}-${nextNumber}`;
    }

    const newInvoice = new Invoice(data);
    await newInvoice.save();

    return NextResponse.json({ success: true, data: newInvoice }, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await connectToDatabase();
    
    // basic pagination & filtering can be added here
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const invoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Invoice.countDocuments();

    return NextResponse.json({ success: true, data: invoices, total, page, limit }, { status: 200 });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
