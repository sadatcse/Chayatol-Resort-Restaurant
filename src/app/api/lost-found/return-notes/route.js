import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ReturnNote from "@/models/ReturnNote";
import LostFoundClaim from "@/models/LostFoundClaim";
import LostFoundItem from "@/models/LostFoundItem";
import User from "@/models/User";
import { verifyLostFoundPermission } from "@/lib/lostFoundHelpers";

export async function GET(req) {
  // Allow if user can view lost & found items or print return notes
  const auth = await verifyLostFoundPermission(req, "lost_found.view");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const query = {};

    if (search) {
      query.$or = [
        { returnNumber: { $regex: search, $options: "i" } },
        { remarks: { $regex: search, $options: "i" } },
      ];
    }

    const total = await ReturnNote.countDocuments(query);
    const notes = await ReturnNote.find(query)
      .populate({
        path: "itemId",
        populate: [
          { path: "categoryId", select: "name" },
          { path: "foundLocationId", select: "name" },
        ],
      })
      .populate("claimId")
      .populate("returnedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      notes,
      total,
      page,
      pages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (err) {
    console.error("GET Return Notes Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
