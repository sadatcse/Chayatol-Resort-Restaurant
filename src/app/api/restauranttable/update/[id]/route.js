import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RestaurantTable from "@/models/RestaurantTable";
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
    const tableData = await req.json();

    if (!tableData.tableName || !tableData.tableName.trim()) {
      return NextResponse.json(
        { message: "Please provide the restaurant table name" },
        { status: 400 }
      );
    }

    // Check name uniqueness for other tables
    const existing = await RestaurantTable.findOne({
      tableName: { $regex: new RegExp(`^${tableData.tableName.trim()}$`, "i") },
      _id: { $ne: id }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Another restaurant table with this name already exists." },
        { status: 400 }
      );
    }

    const result = await RestaurantTable.findByIdAndUpdate(
      id,
      { tableName: tableData.tableName.trim() },
      { new: true }
    );
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated restaurant table: ${id} (${tableData.tableName})`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: restaurant table ${id} not found`,
      });
      return NextResponse.json({ message: "Restaurant table not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update restaurant table route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
