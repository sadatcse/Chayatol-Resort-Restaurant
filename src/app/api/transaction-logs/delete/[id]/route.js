import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TransactionLog from "@/models/TransactionLog";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";
import Permission from "@/models/Permission";

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  // Permission Check
  if (auth.user.role !== "superadmin" && auth.user.role !== "admin") {
    try {
      await dbConnect();
      const permission = await Permission.findOne({
        role: auth.user.role,
        path: "/dashboard/transaction-logs",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canDelete === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "Forbidden: You do not have permission to delete transaction logs." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in delete transaction log API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
  }

  try {
    await dbConnect();
    const { id } = await params;
    const result = await TransactionLog.findByIdAndDelete(id);
    if (result) {
      await logTransaction({ req, resStatus: 200, user: auth.user, details: `Deleted transaction log: ${id}` });
      return NextResponse.json({ message: "Transaction log deleted successfully" }, { status: 200 });
    } else {
      await logTransaction({ req, resStatus: 404, user: auth.user, details: `Failed delete: transaction log ${id} not found` });
      return NextResponse.json({ message: "Transaction log not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Delete transaction log route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
