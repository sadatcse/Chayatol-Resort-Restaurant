import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import IngredientCategory from "@/models/IngredientCategory";
import Ingredient from "@/models/Ingredient";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;

    // Check if category is in use by any ingredients
    const inUse = await Ingredient.findOne({ category: id });
    if (inUse) {
      return NextResponse.json(
        { message: "Cannot delete category because it is in use by one or more ingredients." },
        { status: 400 }
      );
    }

    const result = await IngredientCategory.findByIdAndDelete(id);
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Deleted ingredient category: ${id} (${result.categoryName})`,
      });
      return NextResponse.json({ message: "Ingredient category deleted successfully" }, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed delete: ingredient category ${id} not found`,
      });
      return NextResponse.json({ message: "Ingredient category not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Delete ingredient category route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
