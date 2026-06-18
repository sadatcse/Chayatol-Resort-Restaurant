import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import Purchase from "@/models/Purchase";
import "@/models/Vendor"; // Ensure models are registered
import "@/models/Ingredient";
import "@/models/IngredientCategory";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const vendorId = searchParams.get("vendorId");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    // Build filters
    const matchQuery = {};
    if (vendorId) {
      matchQuery.vendor = new mongoose.Types.ObjectId(vendorId);
    }
    
    if (status) {
      matchQuery.paymentStatus = status;
    }
    
    if (fromDate || toDate) {
      matchQuery.purchaseDate = {};
      if (fromDate) matchQuery.purchaseDate.$gte = new Date(fromDate);
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        matchQuery.purchaseDate.$lte = endDate;
      }
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "vendors",
          localField: "vendor",
          foreignField: "_id",
          as: "vendorDetails",
        },
      },
      {
        $unwind: {
          path: "$vendorDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { invoiceNumber: { $regex: search, $options: "i" } },
            { "vendorDetails.vendorName": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Clone for count
    const countPipeline = [...pipeline, { $count: "total" }];

    // Sort and paginate data
    const dataPipeline = [
      ...pipeline,
      { $sort: { purchaseDate: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Populate items nested details using lookups
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "ingredients",
          localField: "items.ingredient",
          foreignField: "_id",
          as: "items.ingredientDetails",
        },
      },
      {
        $unwind: {
          path: "$items.ingredientDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "ingredientcategories",
          localField: "items.ingredientDetails.category",
          foreignField: "_id",
          as: "items.ingredientDetails.categoryDetails",
        },
      },
      {
        $unwind: {
          path: "$items.ingredientDetails.categoryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Re-group documents back
      {
        $group: {
          _id: "$_id",
          vendor: { $first: "$vendorDetails" },
          purchaseDate: { $first: "$purchaseDate" },
          invoiceNumber: { $first: "$invoiceNumber" },
          grandTotal: { $first: "$grandTotal" },
          paymentStatus: { $first: "$paymentStatus" },
          paidAmount: { $first: "$paidAmount" },
          paymentMethod: { $first: "$paymentMethod" },
          notes: { $first: "$notes" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          items: {
            $push: {
              _id: "$items._id",
              quantity: "$items.quantity",
              unitPrice: "$items.unitPrice",
              totalPrice: "$items.totalPrice",
              ingredient: {
                _id: "$items.ingredientDetails._id",
                name: "$items.ingredientDetails.name",
                unit: "$items.ingredientDetails.unit",
                sku: "$items.ingredientDetails.sku",
                category: "$items.ingredientDetails.categoryDetails",
              },
            },
          },
        },
      },
      { $sort: { purchaseDate: -1, createdAt: -1 } },
    ];

    const [result] = await Purchase.aggregate([
      {
        $facet: {
          data: dataPipeline,
          count: countPipeline,
        },
      },
    ]);

    const purchases = result.data.map(p => {
      // If there are no items, $push still pushes an empty object. Filter it out.
      if (p.items.length === 1 && !p.items[0].ingredient?._id) {
        p.items = [];
      }
      return p;
    });

    const total = result.count[0] ? result.count[0].total : 0;

    const [totalCount, paidCount, partialCount, unpaidCount] = await Promise.all([
      Purchase.countDocuments({}),
      Purchase.countDocuments({ paymentStatus: "Paid" }),
      Purchase.countDocuments({ paymentStatus: "Partial" }),
      Purchase.countDocuments({ paymentStatus: "Unpaid" }),
    ]);

    return NextResponse.json(
      {
        data: purchases,
        pagination: {
          totalDocuments: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
        totalCount,
        paidCount,
        partialCount,
        unpaidCount,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Get paginated purchases error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
