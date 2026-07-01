import { NextResponse } from "next/server";
import mongoose from "mongoose";
import TableReservation from "@/models/TableReservation";

const MONGO_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export async function PUT(req, { params }) {
  try {
    await connectToDatabase();
    const id = params.id;
    const body = await req.json();

    const updated = await TableReservation.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

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
  try {
    await connectToDatabase();
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
