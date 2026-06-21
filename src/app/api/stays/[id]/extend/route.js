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
    const { newCheckOutDate } = body;

    if (!newCheckOutDate) {
      return NextResponse.json({ message: "Please provide the new check-out date." }, { status: 400 });
    }

    const stay = await Stay.findById(id).populate("rooms.room");
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    const currentCheckOut = new Date(stay.expectedCheckOutDate);
    const newCheckOut = new Date(newCheckOutDate);

    // Calculate difference in nights
    const diffTime = newCheckOut.getTime() - currentCheckOut.getTime();
    const extraNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (extraNights <= 0) {
      return NextResponse.json({
        message: "New check-out date must be after the current expected check-out date."
      }, { status: 400 });
    }

    // Post extension charges to folio for each room
    for (const r of stay.rooms) {
      const chargeAmount = r.nightlyRate * extraNights;

      await FolioEntry.create({
        stayId: id,
        type: "Room Charge",
        description: `Room ${r.room.roomNumber} Stay Extension - ${extraNights} night(s) at ৳${r.nightlyRate}/night`,
        debit: chargeAmount,
        credit: 0
      });
    }

    // Update check-out date in Stay
    stay.expectedCheckOutDate = newCheckOut;
    stay.status = "Extended";
    await stay.save();

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Extended stay ${stay.stayNo} to ${newCheckOutDate} (+${extraNights} nights)`,
    });

    return NextResponse.json(stay, { status: 200 });
  } catch (err) {
    console.error("POST Stay Extension error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
