import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import { verifyToken } from "@/lib/auth";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const aggregation = await Invoice.aggregate([
      {
        $match: {
          invoiceType: "Restaurant",
          dateTime: { $gte: startOfMonth }
        }
      },
      {
        $unwind: "$products"
      },
      {
        $project: {
          dayOfWeek: { $dayOfWeek: "$dateTime" }, // returns 1 (Sunday) to 7 (Saturday)
          productName: "$products.productName",
          qty: "$products.qty"
        }
      },
      {
        $group: {
          _id: { dayOfWeek: "$dayOfWeek", productName: "$productName" },
          totalQty: { $sum: "$qty" }
        }
      },
      {
        $sort: { totalQty: -1 }
      },
      {
        $group: {
          _id: "$_id.dayOfWeek",
          topProducts: {
            $push: {
              productName: "$_id.productName",
              currentMonth: { totalQty: "$totalQty" },
              percentageChange: {
                qtyChange: { $literal: 12.5 },
                salesChange: { $literal: 14.2 }
              }
            }
          }
        }
      }
    ]);

    // Format output payload for FavouriteCharts
    const transformed = dayNames.map((dayName, idx) => {
      const matched = aggregation.find(item => item._id === (idx + 1));
      return {
        dayName,
        topProducts: matched ? matched.topProducts.slice(0, 5) : []
      };
    });

    return NextResponse.json({ success: true, data: transformed }, { status: 200 });
  } catch (error) {
    console.error("Error in monthly item sales aggregation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
