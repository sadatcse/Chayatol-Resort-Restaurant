import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundClaim from "@/models/LostFoundClaim";
import LostFoundItem from "@/models/LostFoundItem";
import { verifyLostFoundPermission, logLostFoundActivity, createLostFoundNotification } from "@/lib/lostFoundHelpers";

export async function PUT(req, { params }) {
  const auth = await verifyLostFoundPermission(req, "lost_found.claims.verify");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const userId = auth.user.id || auth.user._id;

    const { verificationStatus, verificationNotes } = body;

    if (!verificationStatus || !["APPROVED", "REJECTED"].includes(verificationStatus)) {
      return NextResponse.json({ message: "Valid status (APPROVED or REJECTED) is required" }, { status: 400 });
    }

    const claim = await LostFoundClaim.findById(id);
    if (!claim) {
      return NextResponse.json({ message: "Claim not found" }, { status: 404 });
    }

    const item = await LostFoundItem.findById(claim.itemId);
    if (!item) {
      return NextResponse.json({ message: "Associated item not found" }, { status: 404 });
    }

    const oldClaim = claim.toObject();

    // Update claim verification fields
    claim.verificationStatus = verificationStatus;
    claim.verificationNotes = verificationNotes || "";
    claim.verifiedBy = userId;
    claim.verifiedAt = new Date();
    await claim.save();

    // Update item status based on verification outcome
    const oldItemStatus = item.status;
    if (verificationStatus === "APPROVED") {
      item.status = "APPROVED";
      await item.save();

      // Log activity
      await logLostFoundActivity({
        req,
        itemId: item._id,
        action: "Claim Approved",
        oldValue: oldClaim,
        newValue: claim.toObject(),
        user: auth.user,
      });

      // Notification
      await createLostFoundNotification({
        itemId: item._id,
        type: "CLAIM_APPROVED",
        title: "Claim Approved",
        message: `Claim for item ${item.name} (${item.itemCode}) by ${claim.claimantName} was approved. Ready for return.`,
      });
    } else {
      // Reverted back to STORED/FOUND if rejected
      item.status = item.storageLocationId ? "STORED" : "FOUND";
      await item.save();

      // Log activity
      await logLostFoundActivity({
        req,
        itemId: item._id,
        action: "Claim Rejected",
        oldValue: oldClaim,
        newValue: claim.toObject(),
        user: auth.user,
      });
    }

    return NextResponse.json(claim, { status: 200 });
  } catch (err) {
    console.error("Verify Claim Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
