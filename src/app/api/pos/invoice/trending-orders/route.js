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

    const result = await Invoice.aggregate([
      {
        $match: {
          invoiceType: "Restaurant"
        }
      },
      {
        $unwind: "$products"
      },
      {
        $group: {
          _id: "$products.productName",
          name: { $first: "$products.productName" },
          price: { $first: "$products.rate" },
          orders: { $sum: "$products.qty" },
          income: { $sum: { $multiply: ["$products.qty", "$products.rate"] } },
          productId: { $first: "$products.productId" }
        }
      },
      {
        $lookup: {
          from: "foods",
          localField: "productId",
          foreignField: "_id",
          as: "foodDetails"
        }
      },
      {
        $unwind: {
          path: "$foodDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          name: 1,
          price: 1,
          orders: 1,
          income: 1,
          imgSrc: { $ifNull: ["$foodDetails.image", "https://placehold.co/300x200?text=Food"] }
        }
      },
      {
        $sort: { orders: -1 }
      },
      {
        $limit: 4
      }
    ]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in trending orders aggregation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
