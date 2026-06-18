import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundActivityLog from "@/models/LostFoundActivityLog";
import User from "@/models/User";
import LostFoundItem from "@/models/LostFoundItem";
import { verifyLostFoundPermission } from "@/lib/lostFoundHelpers";

export async function GET(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.view");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const total = await LostFoundActivityLog.countDocuments({});
    const logs = await LostFoundActivityLog.find({})
      .populate("performedBy", "name email role")
      .populate("itemId", "name itemCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (err) {
    console.error("GET Activity Logs Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
