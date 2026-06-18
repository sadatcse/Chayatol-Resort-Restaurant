import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundItem from "@/models/LostFoundItem";
import { verifyLostFoundPermission, logLostFoundActivity } from "@/lib/lostFoundHelpers";

export async function GET(req, { params }) {
  const auth = await verifyLostFoundPermission(req, "lost_found.view");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const item = await LostFoundItem.findById(id)
      .populate("categoryId")
      .populate("foundLocationId")
      .populate("storageLocationId")
      .populate("departmentId");

    if (!item) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item, { status: 200 });
  } catch (err) {
    console.error("GET Item Detail Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const auth = await verifyLostFoundPermission(req, "lost_found.edit");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const userId = auth.user.id || auth.user._id;

    const item = await LostFoundItem.findById(id);
    if (!item) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    const oldValue = item.toObject();

    // Update fields
    const fields = [
      "categoryId",
      "name",
      "description",
      "brand",
      "color",
      "quantity",
      "estimatedValue",
      "foundAt",
      "foundLocationId",
      "roomId",
      "foundBy",
      "departmentId",
      "storageLocationId",
      "lockerNumber",
      "shelfNumber",
      "priority",
      "notes",
      "images",
      "video",
      "status",
    ];

    fields.forEach((field) => {
      if (body[field] !== undefined) {
        item[field] = body[field];
      }
    });

    item.updatedBy = userId;
    await item.save();

    const newValue = item.toObject();

    // Log Activity
    await logLostFoundActivity({
      req,
      itemId: item._id,
      action: "Item Updated",
      oldValue,
      newValue,
      user: auth.user,
    });

    return NextResponse.json(item, { status: 200 });
  } catch (err) {
    console.error("PUT Item Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = await verifyLostFoundPermission(req, "lost_found.delete");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;

    const item = await LostFoundItem.findById(id);
    if (!item) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    await LostFoundItem.findByIdAndDelete(id);

    // Log Activity
    await logLostFoundActivity({
      req,
      itemId: id,
      action: "Item Deleted",
      oldValue: item.toObject(),
      user: auth.user,
    });

    return NextResponse.json({ message: "Item deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE Item Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
