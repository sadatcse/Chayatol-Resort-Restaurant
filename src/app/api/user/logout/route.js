import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserLog from "@/models/UserLog";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { email } = await req.json();

    const log = await UserLog.findOne({ userEmail: email }).sort({ createdAt: -1 });
    if (log && !log.logoutTime) {
      log.logoutTime = new Date();
      await log.save();
    }

    await logTransaction({ req, resStatus: 200, user: auth.user, details: `User logged out: ${email}` });

    return NextResponse.json({ message: "Logout successful" }, { status: 200 });
  } catch (err) {
    console.error("Logout route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
