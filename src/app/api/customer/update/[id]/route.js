import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
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
    const customerData = await req.json();

    const result = await Customer.findByIdAndUpdate(id, customerData, { new: true });
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Updated customer: ${id} (${customerData.fullName})`,
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed update: customer ${id} not found`,
      });
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update customer route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
