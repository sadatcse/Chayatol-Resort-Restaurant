import { NextResponse } from "next/server";
import mongoose from "mongoose";
import TableReservation from "@/models/TableReservation";

const MONGO_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // format YYYY-MM-DD
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const tableName = searchParams.get("tableName");

    let query = {};
    if (date) {
      const startOfDay = new Date(date + "T00:00:00.000Z");
      const endOfDay = new Date(date + "T23:59:59.999Z");
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.startTime.$lte = new Date(endDate);
      }
    }

    if (tableName) {
      query.tableName = tableName;
    }

    const result = await TableReservation.find(query).sort({ startTime: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching table reservations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const data = await req.json();

    const newReservation = new TableReservation(data);
    await newReservation.save();

    return NextResponse.json(newReservation, { status: 201 });
  } catch (error) {
    console.error("Error creating table reservation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
