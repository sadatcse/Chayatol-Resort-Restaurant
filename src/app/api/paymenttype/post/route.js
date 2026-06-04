import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PaymentType from "@/models/PaymentType";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const paymentData = await req.json();

    // Check name uniqueness
    const existing = await PaymentType.findOne({
      name: { $regex: new RegExp(`^${paymentData.name.trim()}$`, "i") }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Payment type with this name already exists." },
        { status: 400 }
      );
    }

    const result = await PaymentType.create(paymentData);

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created payment type: ${paymentData.name}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create payment type route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
