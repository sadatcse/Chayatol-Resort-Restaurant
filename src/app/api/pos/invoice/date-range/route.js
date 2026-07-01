import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Invoice from "@/models/Invoice";

const MONGO_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const counter = searchParams.get("counter");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
    }

    const start = new Date(startDate + "T00:00:00.000Z");
    const end = new Date(endDate + "T23:59:59.999Z");

    const matchStage = {
      invoiceType: "Restaurant",
      dateTime: { $gte: start, $lte: end }
    };

    if (counter && counter !== "all" && counter !== "") {
      matchStage.counter = counter;
    }

    const aggregation = await Invoice.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateTime" } },
          orderCount: { $sum: 1 },
          totalQty: { 
            $sum: {
              $reduce: {
                input: "$products",
                initialValue: 0,
                in: { $add: ["$$value", { $ifNull: ["$$this.qty", { $ifNull: ["$$this.quantity", 0] }] }] }
              }
            }
          },
          totalSubtotal: { $sum: { $ifNull: ["$subTotal", { $ifNull: ["$subtotal", 0] }] } },
          totalVat: { $sum: { $ifNull: ["$vat", 0] } },
          totalSd: { $sum: { $ifNull: ["$sd", 0] } },
          totalDiscount: { $sum: { $ifNull: ["$discount", 0] } },
          totalAmount: { $sum: { $ifNull: ["$totalAmount", { $ifNull: ["$grandTotal", 0] }] } }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          orderCount: 1,
          totalQty: 1,
          totalSubtotal: 1,
          totalVat: 1,
          totalSd: 1,
          totalDiscount: 1,
          totalAmount: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    return NextResponse.json(aggregation, { status: 200 });
  } catch (error) {
    console.error("Error in date-range aggregation route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
