import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Expense from "@/models/Expense";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const expense = await Expense.findById(id).populate("category");
    if (!expense) {
      return NextResponse.json({ message: "Expense record not found." }, { status: 404 });
    }
    return NextResponse.json(expense, { status: 200 });
  } catch (error) {
    console.error("Get expense error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    );

    if (!updatedExpense) {
      return NextResponse.json({ message: "Expense record not found." }, { status: 404 });
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Updated expense ID ${id} - new amount: ৳${updatedExpense.amount}`,
    });

    return NextResponse.json(updatedExpense, { status: 200 });
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const deletedExpense = await Expense.findByIdAndDelete(id);

    if (!deletedExpense) {
      return NextResponse.json({ message: "Expense record not found." }, { status: 404 });
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Deleted expense ID ${id} of amount ৳${deletedExpense.amount}`,
    });

    return NextResponse.json({ message: "Expense record deleted successfully." }, { status: 200 });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
