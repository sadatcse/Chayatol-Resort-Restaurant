import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RecurringExpense from "@/models/RecurringExpense";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function GET(req) {
  try {
    await dbConnect();
    const result = await RecurringExpense.find()
      .populate("category")
      .sort({ createdAt: -1 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Get recurring expenses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();

    if (!body.category || !body.amount || !body.frequency || !body.startDate || !body.nextDueDate) {
      return NextResponse.json(
        { message: "Missing required fields (category, amount, frequency, startDate, nextDueDate)." },
        { status: 400 }
      );
    }

    const newRecurring = await RecurringExpense.create({
      ...body,
      createdBy: auth.user._id || auth.user.id
    });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created recurring expense template for category ID: ${newRecurring.category}`,
    });

    return NextResponse.json(newRecurring, { status: 201 });
  } catch (error) {
    console.error("Create recurring expense error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
