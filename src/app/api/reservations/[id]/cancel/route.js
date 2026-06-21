import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Reservation from "@/models/Reservation";
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
    const { cancellationFee, cancellationReason } = body;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json({ message: "Reservation not found" }, { status: 404 });
    }

    if (reservation.status === "Checked-In" || reservation.status === "Completed") {
      return NextResponse.json({ message: "Cannot cancel a checked-in or completed reservation" }, { status: 400 });
    }

    reservation.status = "Cancelled";
    reservation.cancellationFee = Number(cancellationFee) || 0;
    reservation.cancellationReason = cancellationReason || "";

    await reservation.save();

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Cancelled reservation: ${reservation.reservationNo} with fee ৳${cancellationFee}. Reason: ${cancellationReason}`,
    });

    return NextResponse.json(reservation, { status: 200 });
  } catch (err) {
    console.error("POST cancel reservation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
