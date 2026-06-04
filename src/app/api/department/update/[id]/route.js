import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Department from "@/models/Department";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const departmentData = await req.json();
    const result = await Department.findByIdAndUpdate(id, departmentData, { new: true });
    if (result) {
      await logTransaction({ req, resStatus: 200, user: auth.user, details: `Updated department: ${id}` });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({ req, resStatus: 404, user: auth.user, details: `Failed update: department ${id} not found` });
      return NextResponse.json({ message: "Department not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update department route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
