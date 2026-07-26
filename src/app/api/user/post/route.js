import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { logTransaction } from "@/lib/logger";
import { verifyToken } from "@/lib/auth";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const userData = await req.json();

    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      await logTransaction({ req, resStatus: 400, details: `Failed register attempt: email ${userData.email} already exists` });
      return NextResponse.json({ message: "Email already exists" }, { status: 400 });
    }

    const result = await User.create(userData);
    
    // Remove password before returning response
    const userResponse = result.toObject();
    delete userResponse.password;

    await logTransaction({ req, resStatus: 201, details: `Created user ${userData.email}` });

    return NextResponse.json(userResponse, { status: 201 });
  } catch (err) {
    console.error("Create user route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
