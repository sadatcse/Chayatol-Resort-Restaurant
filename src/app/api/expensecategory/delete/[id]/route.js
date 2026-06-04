import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExpenseCategory from "@/models/ExpenseCategory";
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

    const result = await ExpenseCategory.findByIdAndDelete(id);
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Deleted expense category: ${id} (${result.name})`,
      });
      return NextResponse.json({ message: "Expense category deleted successfully" }, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed delete: expense category ${id} not found`,
      });
      return NextResponse.json({ message: "Expense category not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Delete expense category route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
