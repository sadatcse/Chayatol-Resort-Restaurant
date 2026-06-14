import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/models/Room";
import Booking from "@/models/Booking";
import Invoice from "@/models/Invoice";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const roomNo = searchParams.get("roomNo");

    if (!roomNo) {
      return NextResponse.json({ success: false, message: "roomNo is required" }, { status: 400 });
    }

    // Find the room by roomNumber
    const room = await Room.findOne({ roomNumber: roomNo });
    if (!room) {
      return NextResponse.json({ success: false, message: "Room not found" }, { status: 404 });
    }

    // Find active booking for this room
    const activeBooking = await Booking.findOne({ 
       room: room._id,
       bookingStatus: { $in: ["Confirmed", "Checked-In"] },
       paymentStatus: { $in: ["Pending", "Partial", "Unpaid"] }
    }).populate("customer");

    // Find unpaid food invoices for this room
    const unpaidFoodInvoices = await Invoice.find({
       roomNo: roomNo,
       paymentStatus: { $in: ["Due", "Unpaid", "Partial"] }
    });

    return NextResponse.json({
      success: true,
      room,
      booking: activeBooking,
      foodInvoices: unpaidFoodInvoices
    });
  } catch (error) {
    console.error("Room details error:", error);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}
