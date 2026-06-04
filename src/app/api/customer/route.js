import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";

export async function GET(req) {
  try {
    await dbConnect();
    const result = await Customer.find();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get all customers route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
