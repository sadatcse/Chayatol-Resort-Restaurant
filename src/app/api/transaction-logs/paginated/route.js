import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TransactionLog from "@/models/TransactionLog";
import Permission from "@/models/Permission";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  // Permission Check
  if (auth.user.role !== "superadmin" && auth.user.role !== "admin") {
    try {
      await dbConnect();
      const permission = await Permission.findOne({
        role: auth.user.role,
        path: "/dashboard/transaction-logs",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canView === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "Forbidden: You do not have permission to view transaction logs." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in paginated transaction logs API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || "all";
    const method = searchParams.get("method") || "all";
    const userEmail = searchParams.get("userEmail") || "all";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const search = searchParams.get("search") || "";

    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }
    if (method && method !== "all") {
      query.transactionType = { $regex: `^${method}$`, $options: "i" };
    }
    if (userEmail && userEmail !== "all") {
      query.userEmail = userEmail;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
        { transactionType: { $regex: search, $options: "i" } },
        { logId: { $regex: search, $options: "i" } },
      ];
    }

    const totalLogs = await TransactionLog.countDocuments(query);
    const logs = await TransactionLog.find(query)
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
