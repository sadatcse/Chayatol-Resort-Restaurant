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
    const { id } = await params;
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

    // Check SKU uniqueness (exclude current ingredient ID)
    const existing = await Ingredient.findOne({
      sku: { $regex: new RegExp(`^${sku.trim()}$`, "i") },
      _id: { $ne: id }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Another ingredient with this SKU already exists." },
        { status: 400 }
      );
    }

    const result = await Ingredient.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        category,
        unit: unit.trim(),
        sku: sku.trim(),
        stockAlert: Number(stockAlert) || 0,
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true, runValidators: true }
    );

    if (result) {
      const populatedResult = await result.populate("category");
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated ingredient: ${id} (${name}, SKU: ${sku})`,
      });
      return NextResponse.json(populatedResult, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: ingredient ${id} not found`,
      });
      return NextResponse.json({ message: "Ingredient not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update ingredient route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
