import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ResortInvoice from "@/models/ResortInvoice";
import Booking from "@/models/Booking";
import Invoice from "@/models/Invoice";

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

    // Clean up any old running service bills that have now been merged into this master bill
    if (body.associatedResortInvoiceIds && body.associatedResortInvoiceIds.length > 0) {
      // Filter out the current invoice ID just in case it was somehow passed in
      const idsToDelete = body.associatedResortInvoiceIds.filter(mergeId => mergeId !== id);
      if (idsToDelete.length > 0) {
        await ResortInvoice.deleteMany({ _id: { $in: idsToDelete } });
      }
    }

    if (body.paymentStatus === "Paid") {
       if (body.associatedBookingId) {
          await Booking.findByIdAndUpdate(body.associatedBookingId, {
             paymentStatus: "Paid",
             bookingStatus: "Checked-out",
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
