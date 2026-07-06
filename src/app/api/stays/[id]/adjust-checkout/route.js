import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
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
    const { newCheckOutDate, adjustmentType, adjustmentAmount, reason } = body;

    if (!newCheckOutDate) {
      return NextResponse.json({ message: "Please provide the new check-out date." }, { status: 400 });
    }

    const stay = await Stay.findById(id);
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    const oldCheckOut = stay.expectedCheckOutDate;
    stay.expectedCheckOutDate = new Date(newCheckOutDate);
    await stay.save();

    // Create adjustment folio entry if adjustment amount is > 0
    if (adjustmentType && adjustmentType !== "none" && adjustmentAmount > 0) {
      await FolioEntry.create({
        stayId: id,
        type: "Adjustment",
        description: `Stay Adjusted: Check-out changed from ${new Date(oldCheckOut).toLocaleDateString("en-GB")} to ${new Date(newCheckOutDate).toLocaleDateString("en-GB")}. Note: ${reason || "N/A"}`,
        debit: adjustmentType === "debit" ? adjustmentAmount : 0,
        credit: adjustmentType === "credit" ? adjustmentAmount : 0,
      });
    } else {
      // Just record a log entry about the date change in folio
      await FolioEntry.create({
        stayId: id,
        type: "Adjustment",
        description: `Stay Adjusted: Check-out changed from ${new Date(oldCheckOut).toLocaleDateString("en-GB")} to ${new Date(newCheckOutDate).toLocaleDateString("en-GB")}. (No amount adjusted). Note: ${reason || "N/A"}`,
        debit: 0,
        credit: 0,
      });
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Adjusted stay ${stay.stayNo} checkout date from ${oldCheckOut} to ${newCheckOutDate} (Adjustment: ${adjustmentType} of ৳${adjustmentAmount})`,
    });

    const updatedStayPopulated = await Stay.findById(id).populate("rooms.room").populate("customer");
    return NextResponse.json(updatedStayPopulated, { status: 200 });
  } catch (err) {
    console.error("POST Stay Adjustment error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
