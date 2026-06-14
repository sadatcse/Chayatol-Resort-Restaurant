import ResortServiceCategory from "@/models/ResortServiceCategory";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const data = await req.json();

    const existing = await ResortServiceCategory.findOne({ categoryName: data.categoryName, _id: { $ne: id } });
    if (existing) {
      return NextResponse.json({ message: "Category name already exists." }, { status: 400 });
    }

    const updatedCategory = await ResortServiceCategory.findByIdAndUpdate(id, data, { new: true });
    if (!updatedCategory) {
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Category updated successfully", data: updatedCategory });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ message: "Failed to update category" }, { status: 500 });
  }
}
