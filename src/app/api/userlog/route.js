import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserLog from "@/models/UserLog";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const result = await UserLog.find().sort({ createdAt: -1 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get all user logs route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
