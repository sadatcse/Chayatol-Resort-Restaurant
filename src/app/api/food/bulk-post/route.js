import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Food from "@/models/Food";
import Category from "@/models/Category";

export async function POST(req) {
  try {
    await dbConnect();
    const foods = await req.json();

    if (!Array.isArray(foods) || foods.length === 0) {
      return NextResponse.json(
        { message: "Invalid payload. Expected a non-empty array of food items." },
        { status: 400 }
      );
    }

    // Extract unique categories from the uploaded foods
    const uniqueCategories = [...new Set(foods.map(f => f.category?.trim()).filter(Boolean))];
    
    if (uniqueCategories.length > 0) {
      // Find existing categories
      const existingCategories = await Category.find({ categoryName: { $in: uniqueCategories } });
      const existingCategoryNames = existingCategories.map(c => c.categoryName);
      
      // Determine which categories are missing
      const newCategoryNames = uniqueCategories.filter(c => !existingCategoryNames.includes(c));
      
      if (newCategoryNames.length > 0) {
        // Find max serial to append correctly
        const maxSerialCategory = await Category.findOne().sort("-serial");
        let nextSerial = (maxSerialCategory?.serial || 0) + 1;
        
        const categoriesToInsert = newCategoryNames.map(name => ({
          categoryName: name,
          serial: nextSerial++,
          isActive: true
        }));
        
        await Category.insertMany(categoriesToInsert);
      }
    }

    // Insert the foods
    const insertedFoods = await Food.insertMany(foods);

    return NextResponse.json(
      { message: `Successfully added ${insertedFoods.length} food items.`, data: insertedFoods },
      { status: 201 }
    );
  } catch (error) {
    console.error("Bulk add food error:", error);
    return NextResponse.json(
      { message: "Failed to add food items in bulk.", error: error.message },
      { status: 500 }
    );
  }
}
