import ResortService from "@/models/ResortService";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
    const services = await ResortService.find().sort({ createdAt: -1 });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ message: "Failed to fetch services" }, { status: 500 });
  }
}
