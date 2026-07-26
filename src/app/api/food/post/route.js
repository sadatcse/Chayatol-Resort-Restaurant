import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Food from "@/models/Food";
import { verifyToken } from "@/lib/auth";

export async function POST(request) {
  const auth = verifyToken(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();
    const data = await request.json();

    if (!data.foodName || !data.foodName.trim()) {
      return NextResponse.json({ success: false, message: "Food name is required" }, { status: 400 });
    }

    const existing = await Food.findOne({
      foodName: { $regex: new RegExp(`^${data.foodName.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json({ success: false, message: "A food item with this name already exists." }, { status: 400 });
    }

    const newFood = await Food.create(data);

    return NextResponse.json(
      { success: true, data: newFood, message: "Food item created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/food/post Error:", error);
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
