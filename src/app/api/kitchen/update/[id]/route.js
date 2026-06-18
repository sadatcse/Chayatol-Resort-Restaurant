import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Kitchen from "@/models/Kitchen";
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
    const kitchenData = await req.json();

    if (!kitchenData.name || !kitchenData.name.trim()) {
      return NextResponse.json({ message: "Kitchen name is required." }, { status: 400 });
    }

    // Check name uniqueness for other kitchens
    const existing = await Kitchen.findOne({
      name: { $regex: new RegExp(`^${kitchenData.name.trim()}$`, "i") },
      _id: { $ne: id }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Another kitchen with this name already exists." },
        { status: 400 }
      );
    }

    const result = await Kitchen.findByIdAndUpdate(
      id,
      { name: kitchenData.name.trim() },
      { new: true }
    );
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated kitchen: ${id} (${kitchenData.name.trim()})`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: kitchen ${id} not found`,
      });
      return NextResponse.json({ message: "Kitchen not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update kitchen route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
