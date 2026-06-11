import ResortServiceCategory from "@/models/ResortServiceCategory";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();

    const existing = await ResortServiceCategory.findOne({ categoryName: data.categoryName });
    if (existing) {
      return NextResponse.json({ message: "Category name already exists." }, { status: 400 });
    }

    const newCategory = new ResortServiceCategory(data);
    await newCategory.save();
    return NextResponse.json({ message: "Category created successfully", data: newCategory }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ message: "Failed to create category" }, { status: 500 });
  }
}
