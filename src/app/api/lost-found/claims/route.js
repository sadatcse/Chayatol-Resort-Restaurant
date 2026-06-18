import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundClaim from "@/models/LostFoundClaim";
import LostFoundItem from "@/models/LostFoundItem";
import Booking from "@/models/Booking";
import { verifyLostFoundPermission, logLostFoundActivity, createLostFoundNotification } from "@/lib/lostFoundHelpers";

export async function GET(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.claims.view");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    const query = {};

    if (status) {
      query.verificationStatus = status;
    }

    if (search) {
      query.$or = [
        { claimantName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { roomNumber: { $regex: search, $options: "i" } },
      ];
    }

    const total = await LostFoundClaim.countDocuments(query);
    const claims = await LostFoundClaim.find(query)
      .populate({
        path: "itemId",
        populate: [
          { path: "categoryId", select: "name" },
          { path: "foundLocationId", select: "name" },
        ],
      })
      .populate("verifiedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      claims,
      total,
      page,
      pages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (err) {
    console.error("GET Claims Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.claims.verify"); // Check permission to create claims
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const userId = auth.user.id || auth.user._id;

    const {
      itemId,
      claimantName,
      phone,
      email,
      nidPassport,
      bookingId,
      roomNumber,
      verificationNotes,
    } = body;

    if (!itemId || !claimantName || !phone) {
      return NextResponse.json(
        { message: "Missing required fields (itemId, claimantName, phone)" },
        { status: 400 }
      );
    }

    // Check if item exists and is in a claimable state
    const item = await LostFoundItem.findById(itemId);
    if (!item) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    if (item.status === "RETURNED" || item.status === "DISPOSED" || item.status === "ARCHIVED") {
      return NextResponse.json({ message: `Item is already ${item.status.toLowerCase()} and cannot be claimed` }, { status: 400 });
    }

    const newClaim = await LostFoundClaim.create({
      itemId,
      claimantName,
      phone,
      email: email || "",
      nidPassport: nidPassport || "",
      bookingId: bookingId || null,
      roomNumber: roomNumber || "",
      verificationNotes: verificationNotes || "",
      verificationStatus: "PENDING",
      createdBy: userId,
    });

    const oldStatus = item.status;
    item.status = "CLAIM_REQUESTED";
    await item.save();

    // Log Activity
    await logLostFoundActivity({
      req,
      itemId: item._id,
      action: "Claim Submitted",
      newValue: newClaim.toObject(),
      user: auth.user,
    });

    // Create Notification
    await createLostFoundNotification({
      itemId: item._id,
      type: "CLAIM_SUBMITTED",
      title: "New Claim Submitted",
      message: `A claim was submitted for item ${item.name} (${item.itemCode}) by ${newClaim.claimantName}.`,
    });

    return NextResponse.json(newClaim, { status: 201 });
  } catch (err) {
    console.error("POST Claim Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
