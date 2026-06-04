import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserRole from "@/models/UserRole";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const userRoleData = await req.json();
    const result = await UserRole.findByIdAndUpdate(id, userRoleData, { new: true });
    if (result) {
      await logTransaction({ req, resStatus: 200, user: auth.user, details: `Updated user role: ${id}` });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({ req, resStatus: 404, user: auth.user, details: `Failed update: user role ${id} not found` });
      return NextResponse.json({ message: "UserRole not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update user role route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
