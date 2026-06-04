import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Department from "@/models/Department";
import { verifyToken } from "@/lib/auth";

export async function GET(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const result = await Department.findById(id);
    if (result) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json({ message: "Department not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Get department by ID route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
