import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

export async function GET(request) {
  const auth = verifyToken(request);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();

    // Identity comes from the verified token, not the query string — a
    // client-supplied ?email= would let anyone fetch anyone else's profile.
    const user = await User.findById(auth.user.id).select("-password");
    if (!user) {
      return NextResponse.json({ message: "User profile not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    console.error("User profile API error:", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
