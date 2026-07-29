import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import Room from "@/models/Room";
import Customer from "@/models/Customer";
import FolioEntry from "@/models/FolioEntry";
import FoodOrder from "@/models/FoodOrder";
import ServiceOrder from "@/models/ServiceOrder";
import Reservation from "@/models/Reservation";
import Permission from "@/models/Permission";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const stay = await Stay.findById(id)
      .populate("customer")
      .populate("rooms.room")
      .populate("rooms.guests.customer");

    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    return NextResponse.json(stay, { status: 200 });
  } catch (err) {
    console.error("GET Stay by ID error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
        path: "/dashboard/stays",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canDelete === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "You do not have permission to delete stay records." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in delete stay API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
  }

  try {
    await dbConnect();
    const { id } = await params;

    const stay = await Stay.findById(id);
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    // Clean up linked FolioEntry, FoodOrder, and ServiceOrder records
    await FolioEntry.deleteMany({ stayId: id });
    await FoodOrder.deleteMany({ stayId: id });
    await ServiceOrder.deleteMany({ stayId: id });

    // Reset occupied rooms to Available if stay was active
    if (stay.status === "In House" || stay.status === "Extended") {
      if (stay.rooms && stay.rooms.length > 0) {
        for (const r of stay.rooms) {
          const roomId = r.room?._id || r.room;
          if (roomId) {
            const room = await Room.findById(roomId);
            if (room) {
              room.status = "Available";
              await room.save();
            }
          }
        }
      }
    }

    // If associated reservation exists, update its status back to Confirmed if it was Checked In
    if (stay.reservationId) {
      const reservation = await Reservation.findById(stay.reservationId);
      if (reservation && reservation.status === "Checked In") {
        reservation.status = "Confirmed";
        await reservation.save();
      }
    }

    await Stay.findByIdAndDelete(id);

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Deleted stay: ${stay.stayNo}`,
    });

    return NextResponse.json({ message: "Stay record deleted successfully." }, { status: 200 });
  } catch (err) {
    console.error("DELETE Stay error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

