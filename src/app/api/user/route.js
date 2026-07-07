import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const result = await User.find().select("-password");
    const filteredResult = result.filter(u => u.email !== "sadatcse@gmail.com");
    return NextResponse.json(filteredResult, { status: 200 });
  } catch (err) {
    console.error("Get all users route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
