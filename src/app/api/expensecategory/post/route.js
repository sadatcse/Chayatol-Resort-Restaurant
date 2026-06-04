import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ExpenseCategory from "@/models/ExpenseCategory";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const expenseData = await req.json();

    // Check name uniqueness
    const existing = await ExpenseCategory.findOne({
      name: { $regex: new RegExp(`^${expenseData.name.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Expense category with this name already exists." },
        { status: 400 }
      );
    }

    const result = await ExpenseCategory.create(expenseData);

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created expense category: ${expenseData.name}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create expense category route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
