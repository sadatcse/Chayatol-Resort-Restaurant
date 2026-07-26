import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Reservation from "@/models/Reservation";
import ReservationPayment from "@/models/ReservationPayment";
import Customer from "@/models/Customer";
import Stay from "@/models/Stay";
import FolioEntry from "@/models/FolioEntry";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";
import { getNextSequence } from "@/lib/sequence";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const month = searchParams.get("month") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      query.checkInDate = {
        $gte: start,
        $lte: end
      };
    } else if (month) {
      const [year, m] = month.split("-").map(Number);
      const start = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0));
      query.checkInDate = {
        $gte: start,
        $lt: end
      };
    }

    if (search) {
      // Find matching customers first to search by customer name
      const matchingCustomers = await Customer.find({
        fullName: { $regex: search, $options: "i" }
      }).select("_id");
      const customerIds = matchingCustomers.map(c => c._id);

      query.$or = [
        { reservationNo: { $regex: search, $options: "i" } },
        { customer: { $in: customerIds } }
      ];
    }

    const reservations = await Reservation.find(query)
      .populate("customer")
      .populate("rooms.room")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reservation.countDocuments(query);

    // Retrieve payments for these reservations to calculate total paid amount
    const reservationIds = reservations.map(r => r._id);
    const payments = await ReservationPayment.find({ reservationId: { $in: reservationIds } });

    // Retrieve associated stays and folio payments
    const stays = await Stay.find({ reservationId: { $in: reservationIds } });
    const stayIds = stays.map(s => s._id);
    const folioPayments = await FolioEntry.find({
      stayId: { $in: stayIds },
      type: "Payment"
    });

    const data = reservations.map(r => {
      const resPayments = payments.filter(p => p.reservationId.toString() === r._id.toString());
      const resPaymentsTotal = resPayments.reduce((sum, p) => sum + p.amount, 0);

      const associatedStay = stays.find(s => s.reservationId.toString() === r._id.toString());
      const stayFolioPayments = associatedStay
        ? folioPayments.filter(f => f.stayId.toString() === associatedStay._id.toString())
        : [];
      const stayPaymentsTotal = stayFolioPayments.reduce((sum, f) => sum + f.credit, 0);

      const totalPaid = resPaymentsTotal + stayPaymentsTotal;

      // Combine list of payments for listing
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

      return {
        ...r.toObject(),
        totalPaid,
        payments: combinedPayments
      };
    });

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }, { status: 200 });
  } catch (err) {
    console.error("GET Reservations route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const { checkInDate, checkOutDate, customer, bookingSource, rooms, status, notes, idempotencyKey } = body;

    if (!checkInDate || !checkOutDate || !customer || !rooms || rooms.length === 0) {
      return NextResponse.json({ message: "Please provide check-in date, check-out date, customer and room details" }, { status: 400 });
    }

    if (idempotencyKey) {
      const existing = await Reservation.findOne({ idempotencyKey }).populate("customer");
      if (existing) {
        return NextResponse.json(existing, { status: 201 });
      }
    } else {
      // Deduplication check: check if a reservation for the same customer with the same check-in date was created in the last 10 seconds
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const potentialDuplicate = await Reservation.findOne({
        customer,
        checkInDate: new Date(checkInDate),
        createdAt: { $gte: tenSecondsAgo }
      });
      if (potentialDuplicate) {
        return NextResponse.json({ message: "Duplicate reservation detected. Please wait a moment." }, { status: 409 });
      }
    }

    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      return NextResponse.json({ message: "Check-out date must be after check-in date" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      return NextResponse.json({ message: "Check-in date cannot be in the past" }, { status: 400 });
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

    // Generate unique reservation number: RES-YYYYMMDD-XXXX, via an atomic
    // counter so two concurrent reservations can never collide.
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const reservationSeq = await getNextSequence("reservation", async () => Reservation.countDocuments({}));
    const reservationNo = `RES-${dateStr}-${reservationSeq.toString().padStart(4, "0")}`;

    let reservation;
    try {
      reservation = await Reservation.create({
        reservationNo,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        customer,
        bookingSource: bookingSource || "Walk-in",
        status: status || "Draft",
        rooms,
        notes: notes || "",
        idempotencyKey
      });
    } catch (saveError) {
      if (saveError.code === 11000 && idempotencyKey) {
        const existing = await Reservation.findOne({ idempotencyKey }).populate("customer");
        if (existing) {
          return NextResponse.json(existing, { status: 201 });
        }
      }
      throw saveError;
    }

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created reservation: ${reservationNo}`,
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    console.error("POST Reservation route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
