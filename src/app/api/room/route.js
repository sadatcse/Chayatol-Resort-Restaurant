import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";
import Booking from "@/models/Booking";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const returnAll = searchParams.get("all") === "true";
    const checkInDateStr = searchParams.get("checkInDate");
    const checkOutDateStr = searchParams.get("checkOutDate");

    let query = returnAll ? {} : { status: "Available" };

    // If we have dates, find all overlapping bookings and exclude their rooms
    if (checkInDateStr && checkOutDateStr) {
      const checkIn = new Date(checkInDateStr);
      const checkOut = new Date(checkOutDateStr);
      
      const overlappingBookings = await Booking.find({
        bookingStatus: { $in: ["Confirmed", "Checked-in"] },
        checkInDate: { $lt: checkOut },
        $or: [
          { checkOutDate: { $gt: checkIn } },
          { checkOutDate: { $exists: false } },
          { checkOutDate: null }
        ]
      });
      
      const bookedRoomIds = overlappingBookings.map(b => b.room);
      
      query = {
         _id: { $nin: bookedRoomIds }
      };
      
      // If they also want only available rooms, we might want to also exclude Maintenance/Occupied rooms.
      // But typically, a room could be Occupied today, but Available next week. So if they pass dates,
      // we only care if it's booked for those dates. But we don't want to show "Maintenance" rooms if they are completely out of order.
      // Let's assume if it's Maintenance, we don't know when it's back. So we also exclude Maintenance unless returnAll is true.
      if (!returnAll) {
         query.status = { $ne: "Maintenance" };
      }
    }

    const result = await Room.find(query).sort({ roomNumber: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get available rooms route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
