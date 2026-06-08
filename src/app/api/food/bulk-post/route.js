import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Food from "@/models/Food";

export async function POST(req) {
  try {
    await dbConnect();
    const foods = await req.json();

    if (!Array.isArray(foods) || foods.length === 0) {
      return NextResponse.json(
        { message: "Invalid payload. Expected a non-empty array of food items." },
        { status: 400 }
      );
    }

    // You can add data validation or transformation here if needed
    // For now, assume the frontend sends well-formed objects
    const insertedFoods = await Food.insertMany(foods);

    return NextResponse.json(
      { message: `Successfully added ${insertedFoods.length} food items.`, data: insertedFoods },
      { status: 201 }
    );
  } catch (error) {
    console.error("Bulk add food error:", error);
    return NextResponse.json(
      { message: "Failed to add food items in bulk.", error: error.message },
      { status: 500 }
    );
  }
}
