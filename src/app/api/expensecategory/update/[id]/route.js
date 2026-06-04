import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExpenseCategory from "@/models/ExpenseCategory";
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
    const expenseData = await req.json();

    // Check name uniqueness for other expense categories
    const existing = await ExpenseCategory.findOne({
      name: { $regex: new RegExp(`^${expenseData.name.trim()}$`, "i") },
      _id: { $ne: id }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Another expense category with this name already exists." },
        { status: 400 }
      );
    }

    const result = await ExpenseCategory.findByIdAndUpdate(id, expenseData, { new: true });
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated expense category: ${id} (${expenseData.name})`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: expense category ${id} not found`,
      });
      return NextResponse.json({ message: "Expense category not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update expense category route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
