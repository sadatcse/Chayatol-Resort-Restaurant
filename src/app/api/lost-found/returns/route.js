import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ReturnNote from "@/models/ReturnNote";
import LostFoundClaim from "@/models/LostFoundClaim";
import LostFoundItem from "@/models/LostFoundItem";
import { verifyLostFoundPermission, logLostFoundActivity, createLostFoundNotification } from "@/lib/lostFoundHelpers";
import { getNextSequence } from "@/lib/sequence";

export async function POST(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.return.create");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const userId = auth.user.id || auth.user._id;

    const { claimId, customerSignature, staffSignature, remarks } = body;

    if (!claimId || !customerSignature || !staffSignature) {
      return NextResponse.json(
        { message: "Missing required fields (claimId, customerSignature, staffSignature)" },
        { status: 400 }
      );
    }

    const claim = await LostFoundClaim.findById(claimId);
    if (!claim) {
      return NextResponse.json({ message: "Claim record not found" }, { status: 404 });
    }

    if (claim.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { message: "Cannot return item: ownership verification status is not APPROVED" },
        { status: 400 }
      );
    }

    const item = await LostFoundItem.findById(claim.itemId);
    if (!item) {
      return NextResponse.json({ message: "Associated found item not found" }, { status: 404 });
    }

    if (item.status === "RETURNED") {
      return NextResponse.json({ message: "This item has already been returned" }, { status: 400 });
    }

    // Auto-generate Return Note number: RN-YYYYMMDD-XXXX, via an atomic
    // counter so two concurrent returns can never collide on the same number.
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const nextNum = await getNextSequence(`lost-found-return-${dateStr}`, async () => {
      const regex = new RegExp(`^RN-${dateStr}-\\d{4}$`);
      const lastNote = await ReturnNote.findOne({ returnNumber: regex })
        .sort({ returnNumber: -1 })
        .select("returnNumber");
      if (!lastNote) return 0;
      return parseInt(lastNote.returnNumber.split("-")[2], 10) || 0;
    });
    const sequenceNum = String(nextNum).padStart(4, "0");
    const returnNumber = `RN-${dateStr}-${sequenceNum}`;

    // Create return note record
    const newReturnNote = await ReturnNote.create({
      returnNumber,
      itemId: item._id,
      claimId: claim._id,
      returnedBy: userId,
      returnedAt: new Date(),
      customerSignature,
      staffSignature,
      remarks: remarks || "",
    });

    // Update item and claim status
    item.status = "RETURNED";
    await item.save();

    claim.claimedAt = new Date();
    await claim.save();

    // Log Activity
    await logLostFoundActivity({
      req,
      itemId: item._id,
      action: "Item Returned",
      newValue: newReturnNote.toObject(),
      user: auth.user,
    });

    // Create Notification
    await createLostFoundNotification({
      itemId: item._id,
      type: "ITEM_RETURNED",
      title: "Item Handed Over",
      message: `Item ${item.name} (${item.itemCode}) was returned to ${claim.claimantName} under note ${returnNumber}.`,
    });

    return NextResponse.json(newReturnNote, { status: 201 });
  } catch (err) {
    console.error("POST Return Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
