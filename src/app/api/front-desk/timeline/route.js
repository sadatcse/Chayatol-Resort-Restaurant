import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";
import Reservation from "@/models/Reservation";
import Stay from "@/models/Stay";
import Customer from "@/models/Customer";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    
    let startDate, endDate;
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");

    if (startParam && endParam) {
      startDate = new Date(startParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const monthParam = searchParams.get("month"); // Format: YYYY-MM, e.g., 2026-06
      if (!monthParam) {
        return NextResponse.json({ message: "Month parameter (YYYY-MM) or startDate/endDate parameters are required." }, { status: 400 });
      }
      const [year, month] = monthParam.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
    }

    // Fetch all rooms sorted by roomNumber
    const rooms = await Room.find({}).sort({ roomNumber: 1 });

    // Fetch active reservations overlapping with this month
    const reservations = await Reservation.find({
      checkInDate: { $lte: endDate },
      checkOutDate: { $gte: startDate },
      status: { $nin: ["Cancelled", "Checked-In", "Completed"] }
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
