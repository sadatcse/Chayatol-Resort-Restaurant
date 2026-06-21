import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";
import Reservation from "@/models/Reservation";
import Stay from "@/models/Stay";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // Format: YYYY-MM, e.g., 2026-06

    if (!monthParam) {
      return NextResponse.json({ message: "Month parameter (YYYY-MM) is required." }, { status: 400 });
    }

    const [year, month] = monthParam.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

    // Fetch all rooms sorted by roomNumber
    const rooms = await Room.find({}).sort({ roomNumber: 1 });

    // Fetch active reservations overlapping with this month
    const reservations = await Reservation.find({
      checkInDate: { $lte: endDate },
      checkOutDate: { $gte: startDate },
      status: { $nin: ["Cancelled"] }
    })
      .populate("customer")
      .populate("rooms.room");

    // Fetch stays overlapping with this month
    const stays = await Stay.find({
      checkInDate: { $lte: endDate },
      $or: [
        { actualCheckOutDate: { $gte: startDate } },
        { actualCheckOutDate: { $exists: false } },
        { actualCheckOutDate: null, expectedCheckOutDate: { $gte: startDate } }
      ],
      status: { $nin: ["Cancelled"] }
    })
      .populate("customer")
      .populate("rooms.room");

    return NextResponse.json({
      rooms,
      reservations,
      stays
    }, { status: 200 });
  } catch (err) {
    console.error("GET Front Desk Timeline route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
