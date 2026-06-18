import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundCategory from "@/models/LostFoundCategory";
import { verifyLostFoundPermission } from "@/lib/lostFoundHelpers";

export async function PUT(req, { params }) {
  const auth = await verifyLostFoundPermission(req, "lost_found.settings.manage");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { name, description, isActive } = body;

    const category = await LostFoundCategory.findById(id);
    if (!category) {
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }

    if (name) {
      const existing = await LostFoundCategory.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });
      if (existing) {
        return NextResponse.json({ message: "Category with this name already exists" }, { status: 400 });
      }
      category.name = name.trim();
    }

    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    return NextResponse.json(category, { status: 200 });
  } catch (err) {
    console.error("PUT Category Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = await verifyLostFoundPermission(req, "lost_found.settings.manage");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const category = await LostFoundCategory.findById(id);
    if (!category) {
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }

    await LostFoundCategory.findByIdAndDelete(id);

    return NextResponse.json({ message: "Category deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE Category Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
