import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/Category";

export async function GET(req) {
  try {
    await dbConnect();
    const result = await Category.find({ isActive: true }).sort({ serial: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get active categories route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
