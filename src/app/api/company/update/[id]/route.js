import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
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
    const companyData = await req.json();

    // Check email uniqueness if email is changing
    const existing = await Company.findOne({ email: companyData.email, _id: { $ne: id } });
    if (existing) {
      return NextResponse.json(
        { message: "Another company with this email address already exists." },
        { status: 400 }
      );
    }

    const result = await Company.findByIdAndUpdate(id, companyData, { new: true });
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated company: ${id} (${companyData.name})`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: company ${id} not found`,
      });
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update company route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
