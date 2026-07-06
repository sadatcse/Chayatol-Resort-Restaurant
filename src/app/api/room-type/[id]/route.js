import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import RoomType from "@/models/RoomType";
import Room from "@/models/Room";
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
    const body = await req.json();
    const { name, description, isActive } = body;

    const roomType = await RoomType.findById(id);
    if (!roomType) {
      return NextResponse.json({ message: "Room type not found" }, { status: 404 });
    }

    const oldName = roomType.name;

    if (name && name.trim().toLowerCase() !== oldName.toLowerCase()) {
      const existing = await RoomType.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: id }
      });
      if (existing) {
        return NextResponse.json({ message: "A room type with this name already exists." }, { status: 400 });
      }
      roomType.name = name.trim();
    }

    if (description !== undefined) roomType.description = description;
    if (isActive !== undefined) roomType.isActive = isActive;

    await roomType.save();

    // If the room type name changed, update all Rooms that used the old room type name
    if (name && name.trim() !== oldName) {
      await Room.updateMany({ roomType: oldName }, { roomType: name.trim() });
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Updated room type: ${roomType.name} (previously: ${oldName})`,
    });

    return NextResponse.json(roomType, { status: 200 });
  } catch (err) {
    console.error("PUT RoomType route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import Permission from "@/models/Permission";

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  if (auth.user?.role !== "superadmin" && auth.user?.role !== "admin") {
    try {
      await dbConnect();
      const permission = await Permission.findOne({
        role: auth.user.role,
        path: "/dashboard/room-types",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canDelete === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "You do not have permission to delete room types." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in delete room type API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
  }

  try {
    await dbConnect();
    const { id } = await params;

    const roomType = await RoomType.findById(id);
    if (!roomType) {
      return NextResponse.json({ message: "Room type not found" }, { status: 404 });
    }

    // Check if any rooms are using this room type
    const roomInUse = await Room.findOne({ roomType: roomType.name });
    if (roomInUse) {
      return NextResponse.json(
        { message: `Cannot delete room type "${roomType.name}" because it is currently assigned to Room ${roomInUse.roomNumber}.` },
        { status: 400 }
      );
    }

    await RoomType.findByIdAndDelete(id);

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Deleted room type: ${roomType.name}`,
    });

    return NextResponse.json({ message: "Room type deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE RoomType route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
