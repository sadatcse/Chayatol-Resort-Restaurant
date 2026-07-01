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

    const { phoneNumber } = customerData;
    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json({ message: "Phone number is required." }, { status: 400 });
    }

    const existing = await Customer.findOne({
      phoneNumber: phoneNumber.trim()
    });
    if (existing) {
      return NextResponse.json({ message: "A customer with this phone number already exists." }, { status: 400 });
    }

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
