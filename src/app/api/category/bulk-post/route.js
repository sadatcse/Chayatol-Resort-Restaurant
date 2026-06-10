import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/Category";

export async function POST(req) {
  try {
    await dbConnect();
    const categories = await req.json();

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { message: "Invalid payload. Expected a non-empty array of category items." },
        { status: 400 }
      );
    }

    // Optional: add any further validation per row if necessary
    const invalidItems = categories.filter(c => !c.categoryName);
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { message: "Some category items are missing a valid Category Name." },
        { status: 400 }
      );
    }

    const maxSerialCategory = await Category.findOne().sort("-serial");
    let nextSerial = (maxSerialCategory?.serial || 0) + 1;

    const formattedCategories = categories.map(c => {
      let serial = c.serial;
      if (serial === "" || serial === undefined || serial === null) {
        serial = nextSerial++;
      } else {
        serial = Number(serial);
      }
      return { ...c, serial };
    });

    const insertedCategories = await Category.insertMany(formattedCategories);

    return NextResponse.json(
      { message: `Successfully added ${insertedCategories.length} categories.`, data: insertedCategories },
      { status: 201 }
    );
  } catch (error) {
    console.error("Bulk add category error:", error);
    return NextResponse.json(
      { message: "Failed to add categories in bulk.", error: error.message },
      { status: 500 }
    );
  }
}
