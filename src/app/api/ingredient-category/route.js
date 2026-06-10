import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import IngredientCategory from "@/models/IngredientCategory";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const query = {};
    if (activeOnly) {
      query.isActive = true;
    }

    const result = await IngredientCategory.find(query).sort({ categoryName: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get all ingredient categories route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
