import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LostFoundItem from "@/models/LostFoundItem";
import LostFoundClaim from "@/models/LostFoundClaim";
import LostFoundActivityLog from "@/models/LostFoundActivityLog";
import LostFoundCategory from "@/models/LostFoundCategory";
import LostFoundLocation from "@/models/LostFoundLocation";
import { verifyLostFoundPermission } from "@/lib/lostFoundHelpers";

export async function GET(req) {
  const auth = await verifyLostFoundPermission(req, "lost_found.view");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();

    // 1. Core Summary Cards
    const totalFound = await LostFoundItem.countDocuments({});
    
    const activeItems = await LostFoundItem.countDocuments({
      status: { $in: ["FOUND", "STORED", "CLAIM_REQUESTED", "UNDER_VERIFICATION", "APPROVED"] },
    });

    const pendingClaims = await LostFoundClaim.countDocuments({
      verificationStatus: "PENDING",
    });

    const returnedItems = await LostFoundItem.countDocuments({ status: "RETURNED" });
    const expiredItems = await LostFoundItem.countDocuments({ status: "EXPIRED" });
    const highValueItems = await LostFoundItem.countDocuments({ priority: "HIGH" });

    // 2. Monthly Found Items (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyFoundPipeline = [
      {
        $match: {
          foundAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$foundAt" },
            month: { $month: "$foundAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ];

    const monthlyFoundRaw = await LostFoundItem.aggregate(monthlyFoundPipeline);

    // 3. Monthly Returned Items (Last 6 months)
    const monthlyReturnedPipeline = [
      {
        $match: {
          status: "RETURNED",
          updatedAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$updatedAt" },
            month: { $month: "$updatedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ];

    const monthlyReturnedRaw = await LostFoundItem.aggregate(monthlyReturnedPipeline);

    // Formatter for Monthly data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartMonthlyData = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-indexed for comparison
      const label = `${monthNames[d.getMonth()]} ${y}`;

      const foundObj = monthlyFoundRaw.find((x) => x._id.year === y && x._id.month === m);
      const returnedObj = monthlyReturnedRaw.find((x) => x._id.year === y && x._id.month === m);

      chartMonthlyData.push({
        month: label,
        found: foundObj ? foundObj.count : 0,
        returned: returnedObj ? returnedObj.count : 0,
      });
    }

    // 4. Category Distribution
    const categoryPipeline = [
      {
        $group: {
          _id: "$categoryId",
          count: { $sum: 1 },
        },
      },
    ];
    const categoryCountsRaw = await LostFoundItem.aggregate(categoryPipeline);
    const categoryIds = categoryCountsRaw.map((c) => c._id).filter(Boolean);
    const categories = await LostFoundCategory.find({ _id: { $in: categoryIds } });

    const categoryDistribution = categoryCountsRaw
      .map((c) => {
        const cat = categories.find((x) => x._id.toString() === c._id?.toString());
        return {
          name: cat ? cat.name : "Uncategorized",
          count: c.count,
        };
      })
      .sort((a, b) => b.count - a.count);

    // 5. Location Distribution
    const locationPipeline = [
      {
        $group: {
          _id: "$foundLocationId",
          count: { $sum: 1 },
        },
      },
    ];
    const locationCountsRaw = await LostFoundItem.aggregate(locationPipeline);
    const locationIds = locationCountsRaw.map((l) => l._id).filter(Boolean);
    const locations = await LostFoundLocation.find({ _id: { $in: locationIds } });

    const locationDistribution = locationCountsRaw
      .map((l) => {
        const loc = locations.find((x) => x._id.toString() === l._id?.toString());
        return {
          name: loc ? loc.name : "Unknown Location",
          count: l.count,
        };
      })
      .sort((a, b) => b.count - a.count);

    // 6. Recent Activities widget
    const recentActivities = await LostFoundActivityLog.find({})
      .populate("performedBy", "name email")
      .populate("itemId", "name itemCode")
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({
      cards: {
        totalFound,
        activeItems,
        pendingClaims,
        returnedItems,
        expiredItems,
        highValueItems,
      },
      charts: {
        monthlyData: chartMonthlyData,
        categoryDistribution,
        locationDistribution,
      },
      recentActivities,
    }, { status: 200 });
  } catch (err) {
    console.error("GET Dashboard Stats Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
