import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

export async function GET(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const result = await User.findById(id).select("-password");
    if (result) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Get user by ID route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
