import ResortService from "@/models/ResortService";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();

    const existing = await ResortService.findOne({ serviceName: data.serviceName });
    if (existing) {
      return NextResponse.json({ message: "Service name already exists." }, { status: 400 });
    }

    const newService = new ResortService(data);
    await newService.save();
    return NextResponse.json({ message: "Service created successfully", data: newService }, { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json({ message: "Failed to create service" }, { status: 500 });
  }
}
