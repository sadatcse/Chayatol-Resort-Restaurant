import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const companyData = await req.json();

    // Check email uniqueness
    const existing = await Company.findOne({ email: companyData.email });
    if (existing) {
      return NextResponse.json(
        { message: "Company with this email address already exists." },
        { status: 400 }
      );
    }

    const result = await Company.create(companyData);

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created company: ${companyData.name}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create company route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
