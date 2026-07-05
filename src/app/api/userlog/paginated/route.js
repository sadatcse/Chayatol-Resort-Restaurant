import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import UserLog from "@/models/UserLog";
import { verifyToken } from "@/lib/auth";

import User from "@/models/User";

import Permission from "@/models/Permission";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  if (auth.user.role !== "superadmin" && auth.user.role !== "admin") {
    try {
      await dbConnect();
      const permission = await Permission.findOne({
        role: auth.user.role,
        path: "/dashboard/user-access",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canView === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "Forbidden: You do not have permission to view user logs." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in paginated user logs API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const role = searchParams.get("role") || "";
    const department = searchParams.get("department") || "";

    const query = {};
    if (role && role !== "all") {
      query.role = { $regex: `^${role}$`, $options: "i" };
    }

    if (department && department !== "all") {
      const usersInDept = await User.find({
        department: { $regex: `^${department}$`, $options: "i" }
      }).select("email");
      const emails = usersInDept.map(u => u.email);
      query.userEmail = { $in: emails };
    }

    const totalLogs = await UserLog.countDocuments(query);
    const logs = await UserLog.find(query)
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
