import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TransactionLog from "@/models/TransactionLog";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const totalLogs = await TransactionLog.countDocuments();
    const logs = await TransactionLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      totalLogs,
      totalPages: Math.ceil(totalLogs / limit),
      currentPage: page,
      logs,
    }, { status: 200 });
  } catch (err) {
    console.error("Get paginated transaction logs route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
