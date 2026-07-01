import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Reservation from "@/models/Reservation";

const MONGO_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export async function GET(req) {
  try {
    await connectToDatabase();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const checkins = await Reservation.aggregate([
      {
        $match: {
          checkInDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$checkInDate" } },
          bookingsCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          bookings: "$bookingsCount"
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Build complete daily check-ins list for the current month
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const resultList = Array.from({ length: totalDays }, (_, index) => {
      const dayNum = index + 1;
      const dayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const matched = checkins.find(item => item.date === dayDateStr);

      return {
        day: `${dayNum}`,
        bookings: matched ? matched.bookings : 0
      };
    });

    return NextResponse.json(resultList, { status: 200 });
  } catch (error) {
    console.error("Error in checkin timings route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
