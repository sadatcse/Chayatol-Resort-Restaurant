import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Permission from "@/models/Permission";
import { verifyToken } from "@/lib/auth";

export async function GET(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { role } = await params;

    const permissions = await Permission.find({ role });

    const permissionReport = await Permission.aggregate([
      {
        $match: {
          role: role,
          $or: [
            { isAllowed: true },
            { canView: true }
          ]
        },
      },
      {
        $group: {
          _id: null,
          allowedGroups: { $addToSet: "$group_name" },
        },
      },
      {
        $project: {
          _id: 0,
          allowedGroups: "$allowedGroups",
        },
      },
    ]);

    return NextResponse.json({
      routesData: permissions,
      groupNames: permissionReport.length > 0 ? permissionReport[0] : { allowedGroups: [] },
    }, { status: 200 });
  } catch (error) {
    console.error("Get permissions by role route error:", error);
    return NextResponse.json({ error: "Failed to retrieve permissions" }, { status: 500 });
  }
}
