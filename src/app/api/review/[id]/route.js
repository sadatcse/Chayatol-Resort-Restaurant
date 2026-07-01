import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Review from "@/models/Review";

const MONGO_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();
    const id = params.id;

    const deleted = await Review.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Review deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
