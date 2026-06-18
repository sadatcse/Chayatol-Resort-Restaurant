import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundLocation from "@/models/LostFoundLocation";
import { verifyLostFoundPermission } from "@/lib/lostFoundHelpers";

export async function GET(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.settings.manage");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const locations = await LostFoundLocation.find({}).sort({ name: 1 });
    return NextResponse.json(locations, { status: 200 });
  } catch (err) {
    console.error("GET Locations Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.settings.manage");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const { name, type, description, isActive } = body;

    if (!name) {
      return NextResponse.json({ message: "Location name is required" }, { status: 400 });
    }

    const newLocation = await LostFoundLocation.create({
      name: name.trim(),
      type: type || "Others",
      description: description || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(newLocation, { status: 201 });
  } catch (err) {
    console.error("POST Location Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
