import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PaymentType from "@/models/PaymentType";
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
    const paymentData = await req.json();

    // Check name uniqueness for other payment types
    const existing = await PaymentType.findOne({
      name: { $regex: new RegExp(`^${paymentData.name.trim()}$`, "i") },
      _id: { $ne: id }
    });
    if (existing) {
      return NextResponse.json(
        { message: "Another payment type with this name already exists." },
        { status: 400 }
      );
    }

    const result = await PaymentType.findByIdAndUpdate(id, paymentData, { new: true });
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated payment type: ${id} (${paymentData.name})`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: payment type ${id} not found`,
      });
      return NextResponse.json({ message: "Payment type not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update payment type route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
