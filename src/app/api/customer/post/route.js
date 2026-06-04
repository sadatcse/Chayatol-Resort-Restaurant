import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const customerData = await req.json();
    const result = await Customer.create(customerData);

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Created customer: ${customerData.fullName}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Create customer route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
