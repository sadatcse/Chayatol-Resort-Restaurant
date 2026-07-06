import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Reservation from "@/models/Reservation";
import ReservationPayment from "@/models/ReservationPayment";
import Customer from "@/models/Customer";
import Stay from "@/models/Stay";
import FolioEntry from "@/models/FolioEntry";
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

    // Retrieve prepayments
    const resPayments = await ReservationPayment.find({ reservationId: id });
    const resPaymentsTotal = resPayments.reduce((sum, p) => sum + p.amount, 0);

    // Retrieve stay & folio payments
    const associatedStay = await Stay.findOne({ reservationId: id });
    const stayFolioPayments = associatedStay
      ? await FolioEntry.find({ stayId: associatedStay._id, type: "Payment" })
      : [];
    const stayPaymentsTotal = stayFolioPayments.reduce((sum, f) => sum + f.credit, 0);

    const totalPaid = resPaymentsTotal + stayPaymentsTotal;

    const combinedPayments = [
      ...resPayments.map(p => ({
        _id: p._id,
        paymentType: p.paymentType,
        amount: p.amount,
        paymentDate: p.paymentDate || p.createdAt,
        transactionRef: p.transactionRef,
        notes: p.notes
      })),
      ...stayFolioPayments.map(f => {
        let paymentType = "Folio Payment";
        if (f.description.includes("Direct Payment")) {
          paymentType = f.description.split("(")[1]?.split(")")[0] || "Folio Payment";
        } else if (f.description.includes("Settlement")) {
          paymentType = f.description.split("Settlement (")[1]?.split(")")[0] || "Folio Payment";
        }
        return {
          _id: f._id,
          paymentType,
          amount: f.credit,
          paymentDate: f.createdAt,
          transactionRef: f.description.includes("Ref:") ? f.description.split("Ref: ")[1]?.split(" ")[0] || "" : "",
          notes: f.description
        };
      })
    ];

    const result = {
      ...reservation.toObject(),
      totalPaid,
      payments: combinedPayments
    };

    return NextResponse.json(result, { status: 200 });
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

import Permission from "@/models/Permission";

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  if (auth.user?.role !== "superadmin" && auth.user?.role !== "admin") {
    try {
      await dbConnect();
      const permission = await Permission.findOne({
        role: auth.user.role,
        path: "/dashboard/reservations",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canDelete === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "You do not have permission to delete reservations." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in delete reservation API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
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
