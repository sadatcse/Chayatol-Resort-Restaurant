import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ResortInvoice from "@/models/ResortInvoice";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    // Optional query parameters for filtering
    const search = searchParams.get("search") || "";
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { invoiceNo: { $regex: search, $options: "i" } },
          { "customer.name": { $regex: search, $options: "i" } },
          { "customer.phone": { $regex: search, $options: "i" } },
          { roomNo: { $regex: search, $options: "i" } }
        ]
      };
    }

    const invoices = await ResortInvoice.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ResortInvoice.countDocuments(query);

    return NextResponse.json({
      success: true,
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }, { status: 200 });

  } catch (error) {
    console.error("Resort Invoice GET Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to fetch resort invoices" 
    }, { status: 500 });
  }
}
