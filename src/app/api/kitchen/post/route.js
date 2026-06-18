import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Kitchen from "@/models/Kitchen";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const kitchenData = await req.json();

    if (!kitchenData.name || !kitchenData.name.trim()) {
      return NextResponse.json({ message: "Kitchen name is required." }, { status: 400 });
    }

    // Check name uniqueness
    const existing = await Kitchen.findOne({
      name: { $regex: new RegExp(`^${kitchenData.name.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Kitchen with this name already exists." },
        { status: 400 }
      );
    }

    const result = await Kitchen.create({
      name: kitchenData.name.trim()
    });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created kitchen: ${kitchenData.name.trim()}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create kitchen route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
