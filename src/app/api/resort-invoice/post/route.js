import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ResortInvoice from "@/models/ResortInvoice";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    // Generate a unique invoice number
    // Format: RES-INV-YYYYMMDD-XXXX
    const date = new Date();
    const dateString = date.toISOString().slice(0, 10).replace(/-/g, "");
    
    // Find the latest invoice for today to increment the sequence
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const count = await ResortInvoice.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const sequence = (count + 1).toString().padStart(4, "0");
    const invoiceNo = `RES-INV-${dateString}-${sequence}`;

    const newInvoice = new ResortInvoice({
      ...body,
      invoiceNo,
    });

    await newInvoice.save();

    return NextResponse.json({ 
      success: true, 
      message: "Resort invoice created successfully",
      invoice: newInvoice 
    }, { status: 201 });
  } catch (error) {
    console.error("Resort Invoice POST Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to create resort invoice" 
    }, { status: 500 });
  }
}
