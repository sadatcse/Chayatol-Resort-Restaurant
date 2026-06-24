import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RecurringExpense from "@/models/RecurringExpense";
import Expense from "@/models/Expense";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const template = await RecurringExpense.findById(id);

    if (!template) {
      return NextResponse.json({ message: "Recurring expense template not found." }, { status: 404 });
    }

    // 1. Create a new general expense from the template
    const newExpense = await Expense.create({
      expenseDate: new Date(),
      category: template.category,
      subcategory: template.subcategory,
      amount: template.amount,
      paymentMethod: template.paymentMethod,
      vendor: template.vendor,
      description: template.description || `Auto-triggered from recurring template (${template.frequency})`,
      referenceNo: "AUTO-RECURRING",
      createdBy: auth.user._id || auth.user.id
    });

    // 2. Compute next due date
    const nextDate = new Date(template.nextDueDate || new Date());
    if (template.frequency === "Daily") {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (template.frequency === "Weekly") {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (template.frequency === "Monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (template.frequency === "Yearly") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    template.nextDueDate = nextDate;
    await template.save();

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Triggered recurring expense: Logged expense of ৳${newExpense.amount} and updated next due date to ${nextDate.toISOString().split("T")[0]}`,
    });

    return NextResponse.json({
      success: true,
      expense: newExpense,
      template
    }, { status: 201 });
  } catch (error) {
    console.error("Trigger recurring expense error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
