import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RoomType from "@/models/RoomType";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const returnAll = searchParams.get("all") === "true";

    if (returnAll) {
      // Return all active room types for dropdown
      const query = { isActive: true };
      const roomTypes = await RoomType.find(query).sort({ name: 1 });
      return NextResponse.json(roomTypes, { status: 200 });
    }

    // For administration page table
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;
    const query = search ? { name: { $regex: search, $options: "i" } } : {};

    const roomTypes = await RoomType.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await RoomType.countDocuments(query);

    return NextResponse.json({
      data: roomTypes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (err) {
    console.error("GET RoomTypes route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const { name, description, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Please provide the room type name" }, { status: 400 });
    }

    const existing = await RoomType.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json({ message: "A room type with this name already exists." }, { status: 400 });
    }

    const newRoomType = await RoomType.create({
      name: name.trim(),
      description: description || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created room type: ${newRoomType.name}`,
    });

    return NextResponse.json(newRoomType, { status: 201 });
  } catch (err) {
    console.error("POST RoomType route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
