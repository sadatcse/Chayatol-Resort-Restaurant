import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundItem from "@/models/LostFoundItem";
import LostFoundClaim from "@/models/LostFoundClaim";
import LostFoundActivityLog from "@/models/LostFoundActivityLog";
import LostFoundCategory from "@/models/LostFoundCategory";
import LostFoundLocation from "@/models/LostFoundLocation";
import User from "@/models/User";
import { verifyLostFoundPermission } from "@/lib/lostFoundHelpers";

export async function GET(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.reports.view");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("reportType") || "found"; // found, returned, expired, disposal, claim_verification, staff_activity
    const categoryId = searchParams.get("categoryId");
    const foundLocationId = searchParams.get("foundLocationId");
    const staffId = searchParams.get("staffId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let data = [];

    // Base query conditions
    const itemQuery = {};
    if (categoryId) itemQuery.categoryId = categoryId;
    if (foundLocationId) itemQuery.foundLocationId = foundLocationId;
    if (from || to) {
      itemQuery.foundAt = {};
      if (from) itemQuery.foundAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        itemQuery.foundAt.$lte = toDate;
      }
    }

    if (reportType === "found") {
      const items = await LostFoundItem.find(itemQuery)
        .populate("categoryId", "name")
        .populate("foundLocationId", "name")
        .populate("storageLocationId", "name")
        .sort({ foundAt: -1 });

      data = items.map(item => ({
        "Item Code": item.itemCode,
        "Item Name": item.name,
        "Category": item.categoryId?.name || "N/A",
        "Found At": item.foundAt ? new Date(item.foundAt).toLocaleDateString() : "N/A",
        "Location Found": item.foundLocationId?.name || "N/A",
        "Found By": item.foundBy,
        "Storage Location": item.storageLocationId?.name || "N/A",
        "Status": item.status,
        "Priority": item.priority,
        "Estimated Value": item.estimatedValue,
      }));

    } else if (reportType === "returned") {
      itemQuery.status = "RETURNED";
      const items = await LostFoundItem.find(itemQuery)
        .populate("categoryId", "name")
        .populate("foundLocationId", "name")
        .sort({ updatedAt: -1 });

      // Find the associated claims and return notes
      const claims = await LostFoundClaim.find({
        itemId: { $in: items.map(i => i._id) },
        verificationStatus: "APPROVED"
      });

      data = items.map(item => {
        const claim = claims.find(c => c.itemId.toString() === item._id.toString());
        return {
          "Item Code": item.itemCode,
          "Item Name": item.name,
          "Category": item.categoryId?.name || "N/A",
          "Found At": item.foundAt ? new Date(item.foundAt).toLocaleDateString() : "N/A",
          "Claimant Name": claim ? claim.claimantName : "N/A",
          "Claimant Phone": claim ? claim.phone : "N/A",
          "Claimed At": claim?.claimedAt ? new Date(claim.claimedAt).toLocaleDateString() : "N/A",
          "Status": item.status,
        };
      });

    } else if (reportType === "expired") {
      itemQuery.status = "EXPIRED";
      const items = await LostFoundItem.find(itemQuery)
        .populate("categoryId", "name")
        .populate("foundLocationId", "name")
        .sort({ updatedAt: -1 });

      data = items.map(item => ({
        "Item Code": item.itemCode,
        "Item Name": item.name,
        "Category": item.categoryId?.name || "N/A",
        "Found At": item.foundAt ? new Date(item.foundAt).toLocaleDateString() : "N/A",
        "Status": item.status,
        "Locker Info": `${item.lockerNumber || "N/A"} - ${item.shelfNumber || "N/A"}`,
      }));

    } else if (reportType === "disposal") {
      itemQuery.status = "DISPOSED";
      const items = await LostFoundItem.find(itemQuery)
        .populate("categoryId", "name")
        .populate("foundLocationId", "name")
        .sort({ updatedAt: -1 });

      data = items.map(item => ({
        "Item Code": item.itemCode,
        "Item Name": item.name,
        "Category": item.categoryId?.name || "N/A",
        "Found At": item.foundAt ? new Date(item.foundAt).toLocaleDateString() : "N/A",
        "Status": item.status,
        "Disposed At": item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "N/A",
      }));

    } else if (reportType === "claim_verification") {
      const claimQuery = {};
      if (from || to) {
        claimQuery.createdAt = {};
        if (from) claimQuery.createdAt.$gte = new Date(from);
        if (to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          claimQuery.createdAt.$lte = toDate;
        }
      }

      const claims = await LostFoundClaim.find(claimQuery)
        .populate("itemId", "itemCode name status")
        .populate("verifiedBy", "name")
        .sort({ createdAt: -1 });

      data = claims.map(claim => ({
        "Claim Code": claim._id.toString().substring(18),
        "Item Code": claim.itemId?.itemCode || "N/A",
        "Item Name": claim.itemId?.name || "N/A",
        "Claimant Name": claim.claimantName,
        "Phone": claim.phone,
        "Room/Booking": `${claim.roomNumber || "N/A"} / ${claim.bookingId ? "Yes" : "No"}`,
        "Verification Status": claim.verificationStatus,
        "Verified By": claim.verifiedBy?.name || "N/A",
        "Verified At": claim.verifiedAt ? new Date(claim.verifiedAt).toLocaleDateString() : "N/A",
        "Claim Date": new Date(claim.createdAt).toLocaleDateString(),
      }));

    } else if (reportType === "staff_activity") {
      const logQuery = {};
      if (staffId) logQuery.performedBy = staffId;
      if (from || to) {
        logQuery.createdAt = {};
        if (from) logQuery.createdAt.$gte = new Date(from);
        if (to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          logQuery.createdAt.$lte = toDate;
        }
      }

      const logs = await LostFoundActivityLog.find(logQuery)
        .populate("performedBy", "name email role")
        .populate("itemId", "itemCode name")
        .sort({ createdAt: -1 });

      data = logs.map(log => ({
        "Timestamp": new Date(log.createdAt).toLocaleString(),
        "Staff Name": log.performedBy?.name || "System",
        "Staff Role": log.performedBy?.role || "N/A",
        "Action": log.action,
        "Item Impacted": log.itemId ? `${log.itemId.name} (${log.itemId.itemCode})` : "N/A",
        "IP Address": log.ipAddress || "N/A",
      }));
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("GET Reports Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
