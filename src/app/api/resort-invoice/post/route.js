import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ResortInvoice from "@/models/ResortInvoice";
import Booking from "@/models/Booking";
import Invoice from "@/models/Invoice";

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

    // Clean up any old running service bills that have now been merged into this master bill
    if (body.associatedResortInvoiceIds && body.associatedResortInvoiceIds.length > 0) {
      await ResortInvoice.deleteMany({ _id: { $in: body.associatedResortInvoiceIds } });
    }

    // If the master bill is paid, we should mark the associated booking and food invoices as Paid
    if (body.paymentStatus === "Paid") {
       if (body.associatedBookingId) {
          await Booking.findByIdAndUpdate(body.associatedBookingId, {
             paymentStatus: "Paid",
             bookingStatus: "Checked-out", // auto checkout since bill is settled
             checkOutDate: new Date()
          });
       }

       if (body.associatedFoodInvoiceIds && body.associatedFoodInvoiceIds.length > 0) {
          await Invoice.updateMany(
             { _id: { $in: body.associatedFoodInvoiceIds } },
             { $set: { paymentStatus: "Paid" } }
          );
       }
    }

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
