import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";
import Booking from "@/models/Booking";

export async function GET(req) {
  try {
    await dbConnect();
    
    // 1. Find rooms currently in Maintenance (these definitely need an update to Available eventually)
    const maintenanceRooms = await Room.find({ status: "Maintenance" }).lean();
    
    // 2. Find rooms that are currently Occupied but their active booking's checkout date has passed or is today
    const now = new Date();
    // We'll consider any booking checked-in where checkout date is <= end of today
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const pendingCheckoutBookings = await Booking.find({
      bookingStatus: { $in: ["Checked-in", "Confirmed"] },
      checkOutDate: { $lte: endOfToday }
    }).populate("room").lean();
    
    // Extract room details
    const roomsNeedingAttention = [];
    
    // Add Maintenance rooms (no active booking)
    for (const room of maintenanceRooms) {
      roomsNeedingAttention.push({
        room: room,
        reason: "Maintenance",
        message: "Room is in maintenance and needs to be marked Available once cleaned.",
        booking: null
      });
    }
    
    // Add Occupied rooms due for checkout
    for (const booking of pendingCheckoutBookings) {
      if (booking.room) {
        roomsNeedingAttention.push({
          room: booking.room,
          reason: "Pending Checkout",
          message: "Check-out time has passed or is today. Please process check-out.",
          booking: booking
        });
      }
    }
    
    return NextResponse.json(roomsNeedingAttention, { status: 200 });
  } catch (err) {
    console.error("Get pending update rooms error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
