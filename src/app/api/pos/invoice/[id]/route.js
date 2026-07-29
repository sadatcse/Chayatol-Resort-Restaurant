import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { computeSplitPayment } from "@/lib/invoicePayments";

export async function GET(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const invoice = await Invoice.findById(id).populate("createdBy", "name");
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
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const updateData = await req.json();

    // Map orderType to schema enums case-insensitively
    if (updateData.orderType) {
      const orderTypeMapping = {
        "dine-in": "Dine In",
        "takeaway": "Takeaway",
        "delivery": "Delivery",
        "room service": "Room Service",
        "foodpanda": "Foodpanda",
        "foodi": "Foodi",
        "pathao": "Pathao",
        "dine in": "Dine In",
        "roomservice": "Room Service"
      };
      const key = updateData.orderType.toLowerCase().trim();
      updateData.orderType = orderTypeMapping[key] || updateData.orderType;
    }
    if (updateData.sc !== undefined && updateData.serviceCharge === undefined) {
      updateData.serviceCharge = updateData.sc;
    }
    if (updateData.serviceCharge !== undefined && updateData.sc === undefined) {
      updateData.sc = updateData.serviceCharge;
    }

    if (updateData.tableName && !updateData.tableNo) {
      updateData.tableNo = updateData.tableName;
    } else if (updateData.tableNo && !updateData.tableName) {
      updateData.tableName = updateData.tableNo;
    }

    // Split payment: only kicks in when the client actually sends a payments[]
    // array (the "Print Bill / Due" flow never does, so it's untouched).
    if (Array.isArray(updateData.payments) && updateData.payments.length > 0) {
      const { payments, paidAmount, paymentStatus, paymentMethod } = computeSplitPayment(
        updateData.payments,
        updateData.grandTotal,
        updateData.loginUserName
      );
      updateData.payments = payments;
      updateData.paidAmount = paidAmount;
      updateData.paymentStatus = paymentStatus;
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }
    }

    if (!updateData.foodAddToRoom && updateData.paymentMethod) {
      const isRoomBill = updateData.paymentMethod && (
        updateData.paymentMethod.toLowerCase().includes("room") ||
        updateData.paymentMethod === "Room Bill"
      );
      updateData.foodAddToRoom = isRoomBill ? "Yes" : "No";
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!updatedInvoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    // Sync with Stay Folio
    try {
      const FolioEntry = mongoose.models.FolioEntry || (await import("@/models/FolioEntry")).default;
      const isRoomBill = updatedInvoice.paymentMethod && (
        updatedInvoice.paymentMethod.toLowerCase().includes("room") ||
        updatedInvoice.paymentMethod === "Room Bill"
      );

      if (isRoomBill && updatedInvoice.roomNo) {
        const Room = mongoose.models.Room || (await import("@/models/Room")).default;
        const Stay = mongoose.models.Stay || (await import("@/models/Stay")).default;

        let activeStay = null;
        if (updateData.stayId) {
          activeStay = await Stay.findById(updateData.stayId);
        }

        const rawRoomNo = String(updatedInvoice.roomNo || "").trim();
        const cleanRoomNo = rawRoomNo.replace(/^room\s*/i, '').split('-')[0].trim();

        if (!activeStay) {
          const roomDoc = await Room.findOne({
            $or: [
              { roomNumber: rawRoomNo },
              { roomNumber: cleanRoomNo }
            ]
          });
          if (roomDoc) {
            activeStay = await Stay.findOne({
              status: { $in: ["In House", "Extended"] },
              "rooms.room": roomDoc._id
            }).sort({ createdAt: -1 });
          }
        }

        if (!activeStay && cleanRoomNo) {
          const allActiveStays = await Stay.find({
            status: { $in: ["In House", "Extended"] }
          }).populate("rooms.room");

          activeStay = allActiveStays.find(s =>
            s.rooms?.some(r =>
              String(r.room?.roomNumber || '').trim() === cleanRoomNo ||
              String(r.room?.roomNumber || '').trim() === rawRoomNo
            )
          );
        }

        if (activeStay) {
          await FolioEntry.findOneAndUpdate(
            { referenceId: updatedInvoice._id },
            {
              stayId: activeStay._id,
              type: "Food Charge",
              description: `POS Restaurant Invoice ${updatedInvoice.invoiceNo} (Room ${updatedInvoice.roomNo})`,
              debit: updatedInvoice.grandTotal,
              credit: 0,
              referenceId: updatedInvoice._id,
              staffName: updatedInvoice.loginUserName || "Server Staff"
            },
            { upsert: true, new: true }
          );
        }
      } else {
        // If it's no longer charged to room bill, remove from ledger
        await FolioEntry.deleteMany({ referenceId: updatedInvoice._id });
      }
    } catch (err) {
      console.error("Error syncing folio entry on PUT:", err);
    }

    return NextResponse.json({ success: true, data: updatedInvoice }, { status: 200 });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const deletedInvoice = await Invoice.findByIdAndDelete(id);

    if (!deletedInvoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    // Delete any associated Stay Folio Entry
    try {
      const FolioEntry = mongoose.models.FolioEntry || (await import("@/models/FolioEntry")).default;
      await FolioEntry.deleteMany({ referenceId: id });
    } catch (err) {
      console.error("Error deleting associated folio entries:", err);
    }

    return NextResponse.json({ success: true, data: {} }, { status: 200 });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
