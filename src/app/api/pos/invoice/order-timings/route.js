import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Group invoices by hour of placement
    const aggregateData = await Invoice.aggregate([
      {
        $match: {
          invoiceType: "Restaurant",
          dateTime: { $gte: startOfMonth }
        }
      },
      {
        $project: {
          hour: { $hour: "$dateTime" } // returns 0 to 23
        }
      },
      {
        $group: {
          _id: "$hour",
          ordersCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Build complete hourly list (0 to 23)
    const hourlyData = Array.from({ length: 24 }, (_, h) => {
      const matched = aggregateData.find(item => item._id === h);
      
      // Format 24 hour integer to AM/PM string
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedHour = h % 12 === 0 ? 12 : h % 12;
      const hourStr = `${formattedHour} ${ampm}`;

      return {
        hour: hourStr,
        orders: matched ? matched.ordersCount : 0
      };
    });

    return NextResponse.json(hourlyData, { status: 200 });
  } catch (error) {
    console.error("Error in hourly order timing route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
