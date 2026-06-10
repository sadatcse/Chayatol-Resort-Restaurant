import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import "@/models/IngredientCategory"; // Ensure the model is registered for mongoose population

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const query = {};
    if (activeOnly) {
      query.isActive = true;
    }

    const result = await Ingredient.find(query)
      .populate("category")
      .sort({ name: 1 });
      
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get all ingredients route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
