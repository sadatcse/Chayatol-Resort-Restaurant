import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logTransaction } from "@/lib/logger";

export async function PUT(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { oldPassword, newPassword } = await req.json();
    const userId = auth.user.id;

    const user = await User.findById(userId);
    if (!user) {
      await logTransaction({ req, resStatus: 404, user: auth.user, details: `Failed change-password: user not found` });
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      await logTransaction({ req, resStatus: 401, user: auth.user, details: `Failed change-password: incorrect old password` });
      return NextResponse.json({ message: "Incorrect old password" }, { status: 401 });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logTransaction({ req, resStatus: 200, user: auth.user, details: `Successfully updated password` });

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (err) {
    console.error("Change password route error:", err);
    return NextResponse.json({ message: "Internal server error", error: err.message }, { status: 500 });
  }
}
