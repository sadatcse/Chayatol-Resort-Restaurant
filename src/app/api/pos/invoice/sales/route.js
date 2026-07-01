import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Invoice from "@/models/Invoice";
import Food from "@/models/Food";

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
    const category = searchParams.get("category") || "All";
    const product = searchParams.get("product") || "All";

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
    }

    const start = new Date(startDate + "T00:00:00.000Z");
    const end = new Date(endDate + "T23:59:59.999Z");

    const pipeline = [
      {
        $match: {
          invoiceType: "Restaurant",
          dateTime: { $gte: start, $lte: end }
        }
      },
      {
        $unwind: "$products"
      },
      {
        $lookup: {
          from: "foods",
          localField: "products.productId",
          foreignField: "_id",
          as: "foodDetails"
        }
      },
      {
        $unwind: {
          path: "$foodDetails",
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    if (category && category !== "All") {
      pipeline.push({
        $match: {
          "foodDetails.category": category
        }
      });
    }

    if (product && product !== "All") {
      pipeline.push({
        $match: {
          "products.productName": product
        }
      });
    }

    pipeline.push(
      {
        $group: {
          _id: "$products.productName",
          productName: { $first: "$products.productName" },
          rate: { $first: "$products.rate" },
          qty: { $sum: "$products.qty" }
        }
      },
      {
        $project: {
          _id: 0,
          productName: 1,
          rate: 1,
          qty: 1
        }
      },
      {
        $sort: { qty: -1 }
      }
    );

    const result = await Invoice.aggregate(pipeline);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in product sales aggregation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
