import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VenuePricing from "@/models/VenuePricing";
import { verifyApiPermission, verifyMultiplePathsPermission } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

const defaultPrices = [
  { pricingType: "Full Day - Only Venue", price: 30000, description: "Full Day rental of only the resort event venue space" },
  { pricingType: "Full Day - Only Venue + Food", price: 50000, description: "Full Day rental of venue space with catering/food arrangements included" },
  { pricingType: "Full Day - 6 Rooms with Venue", price: 45000, description: "Full Day rental of venue space including 6 premium rooms" },
  { pricingType: "Full Day - 6 Rooms with Venue + Food", price: 65000, description: "Full Day rental of venue space with 6 premium rooms and food arrangements" },
  { pricingType: "Half Day - Only Venue", price: 18000, description: "Half Day rental of only the resort event venue space" },
  { pricingType: "Half Day - Only Venue + Food", price: 35000, description: "Half Day rental of venue space with catering/food arrangements included" },
  { pricingType: "Half Day - 6 Rooms with Venue", price: 25000, description: "Half Day rental of venue space including 6 premium rooms" },
  { pricingType: "Half Day - 6 Rooms with Venue + Food", price: 42000, description: "Half Day rental of venue space with 6 premium rooms and food arrangements" }
];

export async function GET(req) {
  const auth = await verifyMultiplePathsPermission(req, [
    "/dashboard/venue/pricing",
    "/dashboard/venue/book"
  ], "view");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const prices = await VenuePricing.find().sort({ createdAt: 1 });
    return NextResponse.json(prices, { status: 200 });
  } catch (err) {
    console.error("Get venue pricing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await verifyApiPermission(req, "/dashboard/venue/pricing", "edit");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    
    if (action === "seed") {
      await VenuePricing.deleteMany({});
      const results = await VenuePricing.insertMany(defaultPrices);
      
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: "Reset and seeded default venue pricing packages",
      });
      
      return NextResponse.json(results, { status: 200 });
    }

    const body = await req.json();
    
    if (Array.isArray(body)) {
      const operations = body.map(item => {
        return VenuePricing.findOneAndUpdate(
          { pricingType: item.pricingType },
          { 
            price: Number(item.price),
            description: item.description 
          },
          { new: true, upsert: true }
        );
      });
      
      const results = await Promise.all(operations);
      
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: "Updated venue pricing configuration in batch",
      });
      
      return NextResponse.json(results, { status: 200 });
    } else {
      const { pricingType, price, description } = body;
      
      if (!pricingType || !pricingType.trim()) {
        return NextResponse.json({ message: "Pricing plan name is required" }, { status: 400 });
      }
      
      const result = await VenuePricing.findOneAndUpdate(
        { pricingType: pricingType.trim() },
        { 
          price: Number(price), 
          description 
        },
        { new: true, upsert: true }
      );
      
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Saved venue pricing rate plan: ${pricingType}`,
      });
      
      return NextResponse.json(result, { status: 200 });
    }
  } catch (err) {
    console.error("Update venue pricing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const auth = await verifyApiPermission(req, "/dashboard/venue/pricing", "delete");
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Missing pricing plan ID" }, { status: 400 });
    }

    const deleted = await VenuePricing.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Pricing plan not found" }, { status: 404 });
    }

    await logTransaction({
      req,
      resStatus: 200,
      user: auth.user,
      details: `Deleted venue pricing package: ${deleted.pricingType}`,
    });

    return NextResponse.json({ message: "Pricing plan deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("Delete venue pricing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

