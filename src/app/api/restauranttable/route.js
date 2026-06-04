import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RestaurantTable from "@/models/RestaurantTable";

export async function GET(req) {
  try {
    await dbConnect();
    const result = await RestaurantTable.find().sort({ tableName: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get all restaurant tables route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
