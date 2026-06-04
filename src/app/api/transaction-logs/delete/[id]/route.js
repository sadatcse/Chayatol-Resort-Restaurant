import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TransactionLog from "@/models/TransactionLog";
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
