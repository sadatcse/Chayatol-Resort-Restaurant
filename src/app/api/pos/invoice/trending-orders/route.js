import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import Food from "@/models/Food";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();

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
