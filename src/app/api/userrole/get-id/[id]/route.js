import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserRole from "@/models/UserRole";
import { verifyToken } from "@/lib/auth";

export async function GET(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const result = await UserRole.findById(id);
    if (result) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json({ message: "UserRole not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Get user role by ID route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
