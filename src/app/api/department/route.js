import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Department from "@/models/Department";

export async function GET(req) {
  try {
    await dbConnect();
    const result = await Department.find();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get all departments route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
