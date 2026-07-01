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

    // Deduplication check: check if an invoice with the same table/room, orderType, and grandTotal was created in the last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const potentialDuplicate = await Invoice.findOne({
      orderType: data.orderType,
      tableNo: data.tableNo || null,
      roomNo: data.roomNo || null,
      grandTotal: data.grandTotal || data.totalAmount,
      createdAt: { $gte: tenSecondsAgo }
    });
    if (potentialDuplicate) {
      return NextResponse.json({ success: false, error: "Duplicate invoice submission detected. Please wait a moment." }, { status: 409 });
    }

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

    // Map new POS properties to standard database structure
    if (!data.invoiceSerial) {
      data.invoiceSerial = data.invoiceNo;
    }
    if (!data.dateTime) {
      data.dateTime = new Date();
    }
    if (!data.customerName && data.customer?.name) {
      data.customerName = data.customer.name;
    }
    if (!data.customerMobile && data.customer?.phone) {
      data.customerMobile = data.customer.phone;
    }
    if (data.totalAmount && !data.grandTotal) {
      data.grandTotal = data.totalAmount;
    }
    if (data.subtotal && !data.subTotal) {
      data.subTotal = data.subtotal;
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
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || searchParams.get('searchTerm') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const orderType = searchParams.get('orderType');
    const orderStatus = searchParams.get('orderStatus');
    const paymentStatus = searchParams.get('paymentStatus');
    const isKitchen = searchParams.get('isKitchen') === 'true' || req.url.includes('/kitchen') || searchParams.get('kitchen') === 'true';

    const query = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { invoiceNo: { $regex: escapedSearch, $options: 'i' } },
        { invoiceSerial: { $regex: escapedSearch, $options: 'i' } },
        { customerName: { $regex: escapedSearch, $options: 'i' } },
        { customerMobile: { $regex: escapedSearch, $options: 'i' } },
        { "customer.name": { $regex: escapedSearch, $options: 'i' } },
        { "customer.phone": { $regex: escapedSearch, $options: 'i' } },
        { tableName: { $regex: escapedSearch, $options: 'i' } },
        { tableNo: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.dateTime = {};
      if (startDate) {
        query.dateTime.$gte = new Date(startDate + "T00:00:00.000Z");
      }
      if (endDate) {
        query.dateTime.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    if (orderType) {
      query.orderType = { $regex: `^${orderType}$`, $options: 'i' };
    }

    if (orderStatus) {
      // In Teaxo, "pending" status on order refers to unpaid/pending invoices
      if (orderStatus.toLowerCase() === 'pending') {
        query.orderStatus = { $ne: 'served' };
      } else {
        query.orderStatus = orderStatus;
      }
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (isKitchen) {
      query.orderStatus = { $ne: 'served' };
    }

    const skip = (page - 1) * limit;

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Invoice.countDocuments(query);

    return NextResponse.json({ 
      success: true, 
      data: invoices, 
      invoices, 
      total, 
      totalPages: Math.ceil(total / limit),
      pagination: {
        totalDocs: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      },
      page, 
      limit 
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
