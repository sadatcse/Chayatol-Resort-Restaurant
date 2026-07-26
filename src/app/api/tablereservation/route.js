import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TableReservation from "@/models/TableReservation";
import Customer from "@/models/Customer";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
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

    const result = await TableReservation.find(query).populate("customer").sort({ startTime: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching table reservations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const data = await req.json();

    const newReservation = new TableReservation(data);
    await newReservation.save();

    return NextResponse.json(newReservation, { status: 201 });
  } catch (error) {
    console.error("Error creating table reservation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
