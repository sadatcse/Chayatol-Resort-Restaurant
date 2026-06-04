import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
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
    const result = await User.findByIdAndDelete(id);
    if (result) {
      await logTransaction({ req, resStatus: 200, user: auth.user, details: `Deleted user: ${result.email}` });
      return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
    } else {
      await logTransaction({ req, resStatus: 404, user: auth.user, details: `Failed delete: user ${id} not found` });
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Delete user route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
