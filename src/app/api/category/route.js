import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/Category";

export async function GET(req) {
  try {
    await dbConnect();
    const result = await Category.find().sort({ serial: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get all categories route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
