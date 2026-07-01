import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserRole from "@/models/UserRole";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const userRoleData = await req.json();

    if (!userRoleData.userrole || !userRoleData.userrole.trim()) {
      return NextResponse.json({ message: "User role name is required" }, { status: 400 });
    }

    const existing = await UserRole.findOne({
      userrole: { $regex: new RegExp(`^${userRoleData.userrole.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json({ message: "User role already exists." }, { status: 400 });
    }

    const result = await UserRole.create({
      userrole: userRoleData.userrole.trim()
    });

    await logTransaction({ req, resStatus: 201, user: auth.user, details: `Created user role: ${userRoleData.userrole}` });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create user role route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
