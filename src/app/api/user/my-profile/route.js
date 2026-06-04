import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ message: "Email query param is required" }, { status: 400 });
    }

    const user = await User.findOne({ email }).select("-password");
    if (!user) {
      return NextResponse.json({ message: "User profile not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    console.error("User profile API error:", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
