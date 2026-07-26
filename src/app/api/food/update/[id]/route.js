import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Food from "@/models/Food";
import { verifyToken } from "@/lib/auth";

export async function PUT(request, { params }) {
  const auth = verifyToken(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();
    const { id } = await params;
    const data = await request.json();

    const updatedFood = await Food.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!updatedFood) {
      return NextResponse.json(
        { success: false, message: "Food item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedFood, message: "Food item updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/food/update/[id] Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return NextResponse.json(
        { success: false, message: messages.join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
