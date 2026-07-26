import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Food from "@/models/Food";
import { verifyToken } from "@/lib/auth";

export async function DELETE(request, { params }) {
  const auth = verifyToken(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();
    const { id } = await params;

    const deletedFood = await Food.findByIdAndDelete(id);

    if (!deletedFood) {
      return NextResponse.json(
        { success: false, message: "Food item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Food item deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/food/delete/[id] Error:", error);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
