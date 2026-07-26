import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TableReservation from "@/models/TableReservation";
import Customer from "@/models/Customer";
import { verifyToken } from "@/lib/auth";

export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const id = params.id;
    const body = await req.json();

    const updated = await TableReservation.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate("customer");

    if (!updated) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("Error updating table reservation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const id = params.id;

    const deleted = await TableReservation.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Reservation deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting table reservation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
