import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import UserLog from "@/models/UserLog";
import jwt from "jsonwebtoken";
import { logTransaction } from "@/lib/logger";

const JWT_SECRET = process.env.JWT_SECRET || "secretKey";

export async function POST(req) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    const user = await User.findOne({ email });
    if (!user) {
      await logTransaction({ req, resStatus: 401, details: `Failed login attempt for email: ${email}` });
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "inactive") {
      await logTransaction({ req, resStatus: 403, user, details: `Inactive account login attempt` });
      return NextResponse.json({ message: "Account is inactive. Please contact support." }, { status: 403 });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await logTransaction({ req, resStatus: 401, user, details: `Invalid password login attempt` });
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    // Log login time
    await UserLog.create({
      userEmail: user.email,
      username: user.name || "no name",
      loginTime: new Date(),
      role: user.role,
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    const userResponse = user.toObject();
    delete userResponse.password;

    await logTransaction({ req, resStatus: 200, user, details: `Successful login` });

    return NextResponse.json({ message: "Login successful", user: userResponse, token }, { status: 200 });
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
