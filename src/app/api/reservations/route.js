import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Reservation from "@/models/Reservation";
import ReservationPayment from "@/models/ReservationPayment";
import Customer from "@/models/Customer";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const month = searchParams.get("month") || "";

    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.status = status;
    }

    if (month) {
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

    const data = reservations.map(r => {
      const resPayments = payments.filter(p => p.reservationId.toString() === r._id.toString());
      const totalPaid = resPayments.reduce((sum, p) => sum + p.amount, 0);
      return {
        ...r.toObject(),
        totalPaid,
        payments: resPayments
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
    const { checkInDate, checkOutDate, customer, bookingSource, rooms, status, notes } = body;

    if (!checkInDate || !checkOutDate || !customer || !rooms || rooms.length === 0) {
      return NextResponse.json({ message: "Please provide check-in date, check-out date, customer and room details" }, { status: 400 });
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

    // Generate unique reservation number: RES-YYYYMMDD-XXXX
    const count = await Reservation.countDocuments({});
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const reservationNo = `RES-${dateStr}-${(count + 1).toString().padStart(4, "0")}`;

    const reservation = await Reservation.create({
      reservationNo,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      customer,
      bookingSource: bookingSource || "Walk-in",
      status: status || "Draft",
      rooms,
      notes: notes || ""
    });

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
