import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
import FolioEntry from "@/models/FolioEntry";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { payments, notes } = body; // Array of { paymentType, amount, transactionRef }

    const stay = await Stay.findById(id).populate("rooms.room");
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    if (stay.status === "Checked Out") {
      return NextResponse.json({ message: "Guest is already checked out." }, { status: 400 });
    }

    // Get current folio entries to calculate due balance
    const folioEntries = await FolioEntry.find({ stayId: id });
    const totalDebit = folioEntries.reduce((acc, entry) => acc + entry.debit, 0);
    const totalCredit = folioEntries.reduce((acc, entry) => acc + entry.credit, 0);
    const currentDue = totalDebit - totalCredit;

    let paymentsTotal = 0;
    const recordedPayments = [];

    // Add any settlement payments
    if (payments && payments.length > 0) {
      for (const p of payments) {
        if (p.amount > 0) {
          const entry = await FolioEntry.create({
            stayId: id,
            type: "Payment",
            description: `Final Settlement (${p.paymentType}) - Ref: ${p.transactionRef || "N/A"}`,
            debit: 0,
            credit: Number(p.amount)
          });
          paymentsTotal += Number(p.amount);
          recordedPayments.push(entry);
        }
      }
    }

    const finalDue = currentDue - paymentsTotal;

    // Check if folio is balanced (allow small float delta e.g., 0.01)
    if (finalDue > 0.01) {
      return NextResponse.json({
        message: `Outstanding due of ৳${finalDue.toFixed(2)} must be fully settled before check-out.`
      }, { status: 400 });
    }

    // Perform check-out status transitions
    stay.status = "Checked Out";
    stay.actualCheckOutDate = new Date();
    if (notes) {
      stay.notes = (stay.notes ? stay.notes + "\n" : "") + notes;
    }
    await stay.save();

    // Transition all rooms to Cleaning
    for (const r of stay.rooms) {
      const room = await Room.findById(r.room._id);
      if (room) {
        room.status = "Cleaning";
        await room.save();
      }
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Checked out Guest from Stay ${stay.stayNo}. Folio settled. Rooms sent to cleaning.`,
    });

    return NextResponse.json({
      message: "Check-out completed successfully.",
      stay,
      summary: {
        totalCharges: totalDebit,
        totalPayments: totalCredit + paymentsTotal,
        finalDue: Math.max(0, finalDue)
      }
    }, { status: 200 });
  } catch (err) {
    console.error("POST Stay Check-out error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
