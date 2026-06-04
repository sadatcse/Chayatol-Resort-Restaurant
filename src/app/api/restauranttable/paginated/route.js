import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RestaurantTable from "@/models/RestaurantTable";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.tableName = { $regex: search, $options: "i" };
    }

    const [restaurantTables, total] = await Promise.all([
      RestaurantTable.find(query)
        .sort({ tableName: 1 })
        .skip(skip)
        .limit(limit),
      RestaurantTable.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        restaurantTables,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get paginated restaurant tables error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
