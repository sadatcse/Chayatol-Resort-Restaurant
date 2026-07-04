import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundNotification from "@/models/LostFoundNotification";
import LostFoundItem from "@/models/LostFoundItem";
import { verifyLostFoundPermission } from "@/lib/lostFoundHelpers";

export async function GET(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.view");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const notifications = await LostFoundNotification.find({})
      .populate("itemId", "name itemCode status")
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json(notifications, { status: 200 });
  } catch (err) {
    console.error("GET Notifications Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.view");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      await LostFoundNotification.updateMany({ read: false }, { $set: { read: true } });
      return NextResponse.json({ message: "All notifications marked as read" }, { status: 200 });
    }

    if (!id) {
      return NextResponse.json({ message: "Notification ID is required" }, { status: 400 });
    }

    const notification = await LostFoundNotification.findById(id);
    if (!notification) {
      return NextResponse.json({ message: "Notification not found" }, { status: 404 });
    }

    notification.read = true;
    await notification.save();

    return NextResponse.json(notification, { status: 200 });
  } catch (err) {
    console.error("PUT Notification Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
