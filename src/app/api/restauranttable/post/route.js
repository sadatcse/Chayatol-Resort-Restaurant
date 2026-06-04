import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RestaurantTable from "@/models/RestaurantTable";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const tableData = await req.json();

    if (!tableData.tableName || !tableData.tableName.trim()) {
      return NextResponse.json(
        { message: "Please provide the restaurant table name" },
        { status: 400 }
      );
    }

    // Check name uniqueness
    const existing = await RestaurantTable.findOne({
      tableName: { $regex: new RegExp(`^${tableData.tableName.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Restaurant table with this name already exists." },
        { status: 400 }
      );
    }

    const result = await RestaurantTable.create({
      tableName: tableData.tableName.trim()
    });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created restaurant table: ${tableData.tableName}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create restaurant table route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
