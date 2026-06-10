import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { ingredientId } = await params;
    const { newStockAlert } = await req.json();

    if (newStockAlert == null || isNaN(newStockAlert) || newStockAlert < 0) {
      return NextResponse.json({ message: "A valid positive stock alert level is required." }, { status: 400 });
    }

    const updatedIngredient = await Ingredient.findByIdAndUpdate(
      ingredientId,
      { $set: { stockAlert: Number(newStockAlert) } },
      { new: true, runValidators: true }
    );

    if (!updatedIngredient) {
      return NextResponse.json({ message: "Ingredient not found." }, { status: 404 });
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Updated stock alert level for ingredient ${ingredientId} to ${newStockAlert}`,
    });

    return NextResponse.json(
      { message: "Stock alert updated successfully.", ingredient: updatedIngredient },
      { status: 200 }
    );
  } catch (err) {
    console.error("Update stock alert route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
