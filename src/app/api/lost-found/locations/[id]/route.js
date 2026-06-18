import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundLocation from "@/models/LostFoundLocation";
import { verifyLostFoundPermission } from "@/lib/lostFoundHelpers";

export async function PUT(req, { params }) {
  const auth = await verifyLostFoundPermission(req, "lost_found.settings.manage");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { name, type, description, isActive } = body;

    const location = await LostFoundLocation.findById(id);
    if (!location) {
      return NextResponse.json({ message: "Location not found" }, { status: 404 });
    }

    if (name) location.name = name.trim();
    if (type) location.type = type;
    if (description !== undefined) location.description = description;
    if (isActive !== undefined) location.isActive = isActive;

    await location.save();

    return NextResponse.json(location, { status: 200 });
  } catch (err) {
    console.error("PUT Location Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = await verifyLostFoundPermission(req, "lost_found.settings.manage");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const location = await LostFoundLocation.findById(id);
    if (!location) {
      return NextResponse.json({ message: "Location not found" }, { status: 404 });
    }

    await LostFoundLocation.findByIdAndDelete(id);

    return NextResponse.json({ message: "Location deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE Location Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
