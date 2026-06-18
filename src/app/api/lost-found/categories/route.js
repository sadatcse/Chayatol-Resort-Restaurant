import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundCategory from "@/models/LostFoundCategory";
import { verifyLostFoundPermission } from "@/lib/lostFoundHelpers";

export async function GET(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.settings.manage");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const categories = await LostFoundCategory.find({}).sort({ name: 1 });
    return NextResponse.json(categories, { status: 200 });
  } catch (err) {
    console.error("GET Categories Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.settings.manage");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const { name, description, isActive } = body;

    if (!name) {
      return NextResponse.json({ message: "Category name is required" }, { status: 400 });
    }

    const existing = await LostFoundCategory.findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json({ message: "Category with this name already exists" }, { status: 400 });
    }

    const newCategory = await LostFoundCategory.create({
      name: name.trim(),
      description: description || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (err) {
    console.error("POST Category Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
