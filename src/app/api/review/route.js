import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Review from "@/models/Review";

const MONGO_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const rating = searchParams.get("rating");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { customerName: { $regex: escapedSearch, $options: "i" } },
        { customerPhone: { $regex: escapedSearch, $options: "i" } },
        { comment: { $regex: escapedSearch, $options: "i" } },
        { invoiceNo: { $regex: escapedSearch, $options: "i" } }
      ];
    }

    if (rating) {
      query.rating = parseInt(rating);
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: reviews,
      pagination: {
        totalDocs: total,
        totalPages: Math.ceil(total / limit),
        page,
        limit
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching customer reviews:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const newReview = new Review(body);
    await newReview.save();

    return NextResponse.json({ success: true, data: newReview }, { status: 201 });
  } catch (error) {
    console.error("Error creating customer review:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
