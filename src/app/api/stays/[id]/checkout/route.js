import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
import Reservation from "@/models/Reservation";
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
    const { payments, notes, makeRoomsAvailable, idempotencyKey } = body; // Array of { paymentType, amount, transactionRef }, plus immediate release flag

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
    // Discount and Adjustment credits reduce the bill but are not money
    // collected — keep them out of the "totalPayments" figure reported
    // below so it reflects actual cash/payment received, not amounts waived.
    const totalCollected = folioEntries
      .filter(entry => entry.type !== "Discount" && entry.type !== "Adjustment")
      .reduce((acc, entry) => acc + entry.credit, 0);

    const staffId = auth.user?.id || auth.user?._id || null;
    const staffName = auth.user?.name || req.headers.get("x-user-name") || auth.user?.email || "Farnaj meherin";

    let paymentsTotal = 0;
    const recordedPayments = [];

    // Add any settlement payments. Each line gets a key derived from the
    // request's idempotencyKey + its index, so a client retry (e.g. after
    // stay.save() below throws, before status flips to "Checked Out") finds
    // the already-created entry instead of posting the payment twice.
    if (payments && payments.length > 0) {
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        if (!(p.amount > 0)) continue;

        const lineKey = idempotencyKey ? `${idempotencyKey}-${i}` : undefined;
        if (lineKey) {
          const existing = await FolioEntry.findOne({ idempotencyKey: lineKey, stayId: id });
          if (existing) {
            paymentsTotal += existing.credit;
            recordedPayments.push(existing);
            continue;
          }
        }

        let entry;
        try {
          entry = await FolioEntry.create({
            stayId: id,
            type: "Payment",
            description: `Final Settlement (${p.paymentType}) - Ref: ${p.transactionRef || "N/A"}`,
            debit: 0,
            credit: Number(p.amount),
            createdBy: staffId,
            staffName,
            idempotencyKey: lineKey
          });
        } catch (saveError) {
          if (saveError.code === 11000 && lineKey) {
            const existing = await FolioEntry.findOne({ idempotencyKey: lineKey, stayId: id });
            if (existing) {
              paymentsTotal += existing.credit;
              recordedPayments.push(existing);
              continue;
            }
          }
          throw saveError;
        }
        paymentsTotal += Number(p.amount);
        recordedPayments.push(entry);
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

    // If there is an associated reservation, mark it as Completed
    if (stay.reservationId) {
      await Reservation.findByIdAndUpdate(stay.reservationId, { status: "Completed" });
    }

    // Transition all rooms to Cleaning or Available
    for (const r of stay.rooms) {
      const room = await Room.findById(r.room._id);
      if (room) {
        room.status = makeRoomsAvailable ? "Available" : "Cleaning";
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
        totalPayments: totalCollected + paymentsTotal,
        finalDue: Math.max(0, finalDue)
      }
    }, { status: 200 });
  } catch (err) {
    console.error("POST Stay Check-out error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
