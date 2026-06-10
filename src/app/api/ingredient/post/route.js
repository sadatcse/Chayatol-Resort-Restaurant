import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ingredient from "@/models/Ingredient";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const ingredientData = await req.json();

    const { name, category, unit, sku, stockAlert, isActive } = ingredientData;

    // Basic Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Ingredient name is required" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ message: "Ingredient category is required" }, { status: 400 });
    }
    if (!unit || !unit.trim()) {
      return NextResponse.json({ message: "Unit is required" }, { status: 400 });
    }
    if (!sku || !sku.trim()) {
      return NextResponse.json({ message: "SKU is required" }, { status: 400 });
    }

    // Check SKU uniqueness
    const existing = await Ingredient.findOne({
      sku: { $regex: new RegExp(`^${sku.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json(
        { message: "An ingredient with this SKU already exists." },
        { status: 400 }
      );
    }

    const result = await Ingredient.create({
      name: name.trim(),
      category,
      unit: unit.trim(),
      sku: sku.trim(),
      stockAlert: Number(stockAlert) || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created ingredient: ${name} (SKU: ${sku})`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create ingredient route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
