import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TransactionLog from "@/models/TransactionLog";
import { verifyToken } from "@/lib/auth";

export async function POST(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const logData = await req.json();
    const newLog = await TransactionLog.create(logData);
    return NextResponse.json(newLog, { status: 201 });
  } catch (err) {
    console.error("Create transaction log route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
