import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Department from "@/models/Department";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const departmentData = await req.json();

    if (!departmentData.department || !departmentData.department.trim()) {
      return NextResponse.json({ message: "Department name is required" }, { status: 400 });
    }

    const existing = await Department.findOne({
      department: { $regex: new RegExp(`^${departmentData.department.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json({ message: "Department already exists." }, { status: 400 });
    }

    const result = await Department.create({
      department: departmentData.department.trim()
    });

    await logTransaction({ req, resStatus: 201, user: auth.user, details: `Created department: ${departmentData.department}` });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create department route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
