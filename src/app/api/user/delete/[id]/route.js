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
    const currentUser = auth.user;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      await logTransaction({ req, resStatus: 404, user: currentUser, details: `Failed delete: user ${id} not found` });
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Protect the primary superadmin from deletion entirely
    if (targetUser.email === "sadatcse@gmail.com") {
      return NextResponse.json({ message: "Forbidden: The main superadmin account cannot be deleted." }, { status: 403 });
    }

    // Protect other superadmins
    const isTargetSuper = targetUser.role === "superadmin";
    if (isTargetSuper && currentUser?.email !== "sadatcse@gmail.com") {
      return NextResponse.json({ message: "Forbidden: Only sadatcse@gmail.com can delete a superadmin account." }, { status: 403 });
    }

    // Normal managers cannot delete admins
    if (currentUser?.role === "manager" && targetUser.role === "admin") {
      return NextResponse.json({ message: "Forbidden: Managers cannot delete administrator accounts." }, { status: 403 });
    }

    const result = await User.findByIdAndDelete(id);
    if (result) {
      await logTransaction({ req, resStatus: 200, user: currentUser, details: `Deleted user: ${result.email}` });
      return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
    } else {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Delete user route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
