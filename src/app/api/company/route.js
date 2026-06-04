import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";

export async function GET(req) {
  try {
    await dbConnect();
    const result = await Company.find().sort({ name: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get all companies route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
