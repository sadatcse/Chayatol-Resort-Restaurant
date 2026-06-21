import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Reservation from "@/models/Reservation";
import ReservationPayment from "@/models/ReservationPayment";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const payments = await ReservationPayment.find({ reservationId: id }).sort({ paymentDate: 1 });
    return NextResponse.json(payments, { status: 200 });
  } catch (err) {
    console.error("GET Reservation payments error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { paymentType, amount, transactionRef, notes, receivedBy } = body;

    if (!paymentType || amount === undefined || isNaN(amount) || amount === 0) {
      return NextResponse.json({ message: "Please provide a valid payment type and non-zero amount" }, { status: 400 });
    }

    if (Number(amount) < 0 && !receivedBy) {
      return NextResponse.json({ message: "Please provide the receiver name for this refund payout" }, { status: 400 });
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json({ message: "Reservation not found" }, { status: 404 });
    }

    // Create payment
    const payment = await ReservationPayment.create({
      reservationId: id,
      paymentType,
      amount: Number(amount),
      transactionRef: transactionRef || "",
      notes: notes || "",
      receivedBy: receivedBy || ""
    });

    // Calculate total reservation cost
    const totalCost = reservation.status === "Cancelled"
      ? (reservation.cancellationFee || 0)
      : reservation.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0);

    // Calculate total payments including the current one
    const prevPayments = await ReservationPayment.find({ reservationId: id });
    const totalPaid = prevPayments.reduce((acc, p) => acc + p.amount, 0);

    // Update reservation status dynamically based on payments (guarding Cancelled, Checked-In, Completed)
    if (reservation.status !== "Cancelled" && reservation.status !== "Checked-In" && reservation.status !== "Completed") {
      if (totalPaid >= totalCost) {
        reservation.status = "Fully Paid";
      } else if (totalPaid > 0) {
        reservation.status = "Partially Paid";
      } else {
        reservation.status = "Draft";
      }
    }
    await reservation.save();

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Added payment of ৳${amount} to reservation: ${reservation.reservationNo}. Status: ${reservation.status}`,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    console.error("POST Reservation payment error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
