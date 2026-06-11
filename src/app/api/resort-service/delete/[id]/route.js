import ResortService from "@/models/ResortService";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const deletedService = await ResortService.findByIdAndDelete(id);

    if (!deletedService) {
      return NextResponse.json({ message: "Service not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json({ message: "Failed to delete service" }, { status: 500 });
  }
}
