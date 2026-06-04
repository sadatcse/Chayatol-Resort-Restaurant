import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserLog from "@/models/UserLog";
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

    const totalLogs = await UserLog.countDocuments();
    const logs = await UserLog.find()
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
    console.error("Get paginated user logs route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
