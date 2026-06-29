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

    const reservation = await Reservation.findById(id)
      .populate("customer")
      .populate("rooms.room");

    if (!reservation) {
      return NextResponse.json({ message: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json(reservation, { status: 200 });
  } catch (err) {
    console.error("GET Reservation by ID error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { checkInDate, checkOutDate, customer, bookingSource, rooms, status, notes } = body;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json({ message: "Reservation not found" }, { status: 404 });
    }

    const resolvedCheckIn = checkInDate !== undefined ? new Date(checkInDate) : reservation.checkInDate;
    const resolvedCheckOut = checkOutDate !== undefined ? new Date(checkOutDate) : reservation.checkOutDate;
    if (resolvedCheckIn >= resolvedCheckOut) {
      return NextResponse.json({ message: "Check-out date must be after check-in date" }, { status: 400 });
    }

    if (checkInDate !== undefined) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newCheckIn = new Date(checkInDate);
      newCheckIn.setHours(0, 0, 0, 0);
      const originalCheckIn = new Date(reservation.checkInDate);
      originalCheckIn.setHours(0, 0, 0, 0);
      
      if (newCheckIn.getTime() !== originalCheckIn.getTime() && newCheckIn < today) {
        return NextResponse.json({ message: "Check-in date cannot be in the past" }, { status: 400 });
      }
    }

    if (rooms !== undefined) {
      if (!Array.isArray(rooms) || rooms.length === 0) {
        return NextResponse.json({ message: "Please provide at least one room requirements entry" }, { status: 400 });
      }
      for (let idx = 0; idx < rooms.length; idx++) {
        const r = rooms[idx];
        if (!r.room) {
          return NextResponse.json({ message: `Please select a room for entry #${idx + 1}` }, { status: 400 });
        }
        if (r.nightlyRate === undefined || isNaN(r.nightlyRate) || Number(r.nightlyRate) < 0) {
          return NextResponse.json({ message: `Please enter a valid positive nightly rate for entry #${idx + 1}` }, { status: 400 });
        }
        if (!r.adults || isNaN(r.adults) || Number(r.adults) < 1) {
          return NextResponse.json({ message: `Please enter at least 1 adult for entry #${idx + 1}` }, { status: 400 });
        }
        if (r.children === undefined || isNaN(r.children) || Number(r.children) < 0) {
          return NextResponse.json({ message: `Please enter a valid number of children for entry #${idx + 1}` }, { status: 400 });
        }
      }
    }

    if (checkInDate !== undefined) reservation.checkInDate = resolvedCheckIn;
    if (checkOutDate !== undefined) reservation.checkOutDate = resolvedCheckOut;
    if (customer !== undefined) reservation.customer = customer;
    if (bookingSource !== undefined) reservation.bookingSource = bookingSource;
    if (rooms !== undefined) reservation.rooms = rooms;
    if (status !== undefined) reservation.status = status;
    if (notes !== undefined) reservation.notes = notes;

    await reservation.save();

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Updated reservation: ${reservation.reservationNo}`,
    });

    return NextResponse.json(reservation, { status: 200 });
  } catch (err) {
    console.error("PUT Reservation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  if (auth.user?.role !== "admin" && auth.user?.role !== "superadmin") {
    return NextResponse.json({ message: "You do not have permission to delete reservations." }, { status: 403 });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json({ message: "Reservation not found" }, { status: 404 });
    }

    // Block deletion if any prepayments or refund records are registered
    const paymentCount = await ReservationPayment.countDocuments({ reservationId: id });
    if (paymentCount > 0) {
      return NextResponse.json({ message: "Cannot delete a reservation that has recorded deposits or payments" }, { status: 400 });
    }

    await Reservation.findByIdAndDelete(id);

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Deleted reservation: ${reservation.reservationNo}`,
    });

    return NextResponse.json({ message: "Reservation deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE Reservation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
