import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserLog from "@/models/UserLog";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

import Permission from "@/models/Permission";

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  if (auth.user.role !== "superadmin" && auth.user.role !== "admin") {
    try {
      await dbConnect();
      const permission = await Permission.findOne({
        role: auth.user.role,
        path: "/dashboard/user-access",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canDelete === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "Forbidden: You do not have permission to delete user logs." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in delete user log API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
  }

  try {
    await dbConnect();
    const { id } = await params;
    const result = await UserLog.findByIdAndDelete(id);
    if (result) {
      await logTransaction({ req, resStatus: 200, user: auth.user, details: `Deleted user log: ${id}` });
      return NextResponse.json({ message: "User log deleted successfully" }, { status: 200 });
    } else {
      await logTransaction({ req, resStatus: 404, user: auth.user, details: `Failed delete: user log ${id} not found` });
      return NextResponse.json({ message: "User log not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Delete user log route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
