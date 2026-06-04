import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Permission from "@/models/Permission";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { role } = await params;

    const permissions = await Permission.find({ role });

    const permissionReport = await Permission.aggregate([
      {
        $match: {
          role: role,
          isAllowed: true,
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
