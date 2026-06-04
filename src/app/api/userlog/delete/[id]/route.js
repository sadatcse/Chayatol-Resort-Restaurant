import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserLog from "@/models/UserLog";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
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
