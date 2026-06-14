import ResortServiceCategory from "@/models/ResortServiceCategory";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
    const categories = await ResortServiceCategory.find().sort({ createdAt: -1 });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ message: "Failed to fetch categories" }, { status: 500 });
  }
}
