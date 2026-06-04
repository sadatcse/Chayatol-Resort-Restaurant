import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Permission from "@/models/Permission";
import { logTransaction } from "@/lib/logger";
import { verifyToken } from "@/lib/auth";

export async function PUT(req) {
  const auth = verifyToken(req);
  
  try {
    await dbConnect();
    const routeData = await req.json();

    if (!routeData.role || !routeData.path) {
      return NextResponse.json({ error: "Missing required fields (role or path)" }, { status: 400 });
    }

    const updatedPermission = await Permission.findOneAndUpdate(
      { 
        role: routeData.role, 
        path: routeData.path 
      },
      { 
        $set: { 
            isAllowed: routeData.isAllowed,
            title: routeData.title,
            group_name: routeData.group_name
        } 
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await logTransaction({ req, resStatus: 200, user: auth.user, details: `Updated permission for role ${routeData.role} and path ${routeData.path}` });

    return NextResponse.json(updatedPermission, { status: 200 });
  } catch (error) {
    console.error("Update permission route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
