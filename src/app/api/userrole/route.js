import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserRole from "@/models/UserRole";

export async function GET(req) {
  try {
    await dbConnect();
    const result = await UserRole.find();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get all user roles route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
