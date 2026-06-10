import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const query = {};
    if (activeOnly) {
      query.status = "Active";
    }

    const result = await Vendor.find(query).sort({ vendorName: 1 });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Get all vendors route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
