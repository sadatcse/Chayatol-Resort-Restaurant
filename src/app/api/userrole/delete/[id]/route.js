import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserRole from "@/models/UserRole";
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
    const result = await UserRole.findByIdAndDelete(id);
    if (result) {
      await logTransaction({ req, resStatus: 200, user: auth.user, details: `Deleted user role: ${id}` });
      return NextResponse.json({ message: "UserRole deleted successfully" }, { status: 200 });
    } else {
      await logTransaction({ req, resStatus: 404, user: auth.user, details: `Failed delete: user role ${id} not found` });
      return NextResponse.json({ message: "UserRole not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Delete user role route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
