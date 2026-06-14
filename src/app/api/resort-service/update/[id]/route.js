import ResortService from "@/models/ResortService";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const data = await req.json();

    const existing = await ResortService.findOne({ serviceName: data.serviceName, _id: { $ne: id } });
    if (existing) {
      return NextResponse.json({ message: "Service name already exists." }, { status: 400 });
    }

    const updatedService = await ResortService.findByIdAndUpdate(id, data, { new: true });
    if (!updatedService) {
      return NextResponse.json({ message: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Service updated successfully", data: updatedService });
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json({ message: "Failed to update service" }, { status: 500 });
  }
}
