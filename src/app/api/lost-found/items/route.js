import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundItem from "@/models/LostFoundItem";
import LostFoundCategory from "@/models/LostFoundCategory";
import LostFoundLocation from "@/models/LostFoundLocation";
import Department from "@/models/Department";
import { verifyLostFoundPermission, logLostFoundActivity, createLostFoundNotification } from "@/lib/lostFoundHelpers";
import { getNextSequence } from "@/lib/sequence";

export async function GET(req) {
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
    const categoryId = searchParams.get("categoryId");
    const foundLocationId = searchParams.get("foundLocationId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const skip = (page - 1) * limit;

    const query = {};

    // Apply Search
    if (search) {
      query.$or = [
        { itemCode: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { color: { $regex: search, $options: "i" } },
        { foundBy: { $regex: search, $options: "i" } },
      ];
    }

    // Apply Filters
    if (categoryId) query.categoryId = categoryId;
    if (foundLocationId) query.foundLocationId = foundLocationId;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (from || to) {
      query.foundAt = {};
      if (from) query.foundAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.foundAt.$lte = toDate;
      }
    }

    const total = await LostFoundItem.countDocuments(query);
    const items = await LostFoundItem.find(query)
      .populate("categoryId", "name")
      .populate("foundLocationId", "name type")
      .populate("storageLocationId", "name type")
      .populate("departmentId", "department")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (err) {
    console.error("GET Items Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.create");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const userId = auth.user.id || auth.user._id;

    const {
      categoryId,
      name,
      description,
      brand,
      color,
      quantity,
      estimatedValue,
      foundAt,
      foundLocationId,
      roomId,
      foundBy,
      departmentId,
      storageLocationId,
      lockerNumber,
      shelfNumber,
      priority,
      notes,
      images,
      video,
      status,
    } = body;

    // Validation
    if (!categoryId || !name || !foundLocationId || !foundBy) {
      return NextResponse.json(
        { message: "Missing required fields (category, name, found location, found by staff)" },
        { status: 400 }
      );
    }

    // Auto-generate itemCode: LF-YYYYMMDD-XXXX, via an atomic counter so two
    // concurrent found-item reports can never collide on the same code.
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const nextNum = await getNextSequence(`lost-found-item-${dateStr}`, async () => {
      const regex = new RegExp(`^LF-${dateStr}-\\d{4}$`);
      const lastItem = await LostFoundItem.findOne({ itemCode: regex })
        .sort({ itemCode: -1 })
        .select("itemCode");
      if (!lastItem) return 0;
      return parseInt(lastItem.itemCode.split("-")[2], 10) || 0;
    });
    const sequenceNum = String(nextNum).padStart(4, "0");
    const itemCode = `LF-${dateStr}-${sequenceNum}`;

    // Status: if storage location is provided, automatically mark as STORED, else defaults to FOUND
    const finalStatus = status || (storageLocationId ? "STORED" : "FOUND");

    const newItem = await LostFoundItem.create({
      itemCode,
      categoryId,
      name,
      description: description || "",
      brand: brand || "",
      color: color || "",
      quantity: quantity || 1,
      estimatedValue: estimatedValue || 0,
      foundAt: foundAt ? new Date(foundAt) : new Date(),
      foundLocationId,
      roomId: roomId || "",
      foundBy,
      departmentId: departmentId || null,
      storageLocationId: storageLocationId || null,
      lockerNumber: lockerNumber || "",
      shelfNumber: shelfNumber || "",
      priority: priority || "LOW",
      notes: notes || "",
      images: images || [],
      video: video || "",
      status: finalStatus,
      createdBy: userId,
      updatedBy: userId,
    });

    // Log Activity
    await logLostFoundActivity({
      req,
      itemId: newItem._id,
      action: "Item Created",
      newValue: newItem.toObject(),
      user: auth.user,
    });

    // Create Notification
    await createLostFoundNotification({
      itemId: newItem._id,
      type: "ITEM_CREATED",
      title: "New Item Found",
      message: `A new item (${newItem.name}, code: ${newItem.itemCode}) was found by ${newItem.foundBy}.`,
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (err) {
    console.error("POST Item Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
