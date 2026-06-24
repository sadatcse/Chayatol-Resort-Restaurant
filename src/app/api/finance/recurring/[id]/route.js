import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RecurringExpense from "@/models/RecurringExpense";
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
    const body = await req.json();

    const updated = await RecurringExpense.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Recurring expense template not found." }, { status: 404 });
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Updated recurring expense template ID ${id}`,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Update recurring expense error:", error);
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

    const deleted = await RecurringExpense.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ message: "Recurring expense template not found." }, { status: 404 });
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Deleted recurring expense template ID ${id}`,
    });

    return NextResponse.json({ message: "Recurring expense template deleted successfully." }, { status: 200 });
  } catch (error) {
    console.error("Delete recurring expense error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
