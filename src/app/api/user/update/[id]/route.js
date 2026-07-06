import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logTransaction } from "@/lib/logger";

export async function PUT(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id: targetUserId } = await params;
    const updates = await req.json();
    const currentUser = auth.user;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    // Strict superadmin protection
    const isTargetSuper = targetUser.role === "superadmin" || targetUser.email === "sadatcse@gmail.com";
    if (isTargetSuper && currentUser?.email !== "sadatcse@gmail.com") {
      return NextResponse.json({ message: "Forbidden: Only sadatcse@gmail.com can modify a superadmin account." }, { status: 403 });
    }

    if (updates.role === "superadmin" && currentUser?.email !== "sadatcse@gmail.com") {
      return NextResponse.json({ message: "Forbidden: Only sadatcse@gmail.com can assign the superadmin role." }, { status: 403 });
    }

    // If requesting user is sadatcse@gmail.com, allow any update
    if (currentUser?.email === "sadatcse@gmail.com") {
      if (updates.password && updates.password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        updates.password = await bcrypt.hash(updates.password, salt);
      } else {
        delete updates.password;
      }

      const updatedUser = await User.findByIdAndUpdate(targetUserId, updates, { new: true }).select("-password");
      await logTransaction({ req, resStatus: 200, user: currentUser, details: `Superadmin updated user: ${updatedUser.email}` });
      return NextResponse.json(updatedUser, { status: 200 });
    }

    // Normal Admin/Manager rules
    if (currentUser.role === 'manager' && targetUser.role === 'admin') {
      return NextResponse.json({ message: "Forbidden: Managers cannot edit administrator accounts." }, { status: 403 });
    }

    if (updates.role && updates.role === 'admin' && currentUser.role !== 'admin') {
      return NextResponse.json({ message: "Forbidden: You do not have permission to assign the admin role." }, { status: 403 });
    }

    if (updates.password && updates.password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    } else {
      delete updates.password;
    }

    const updatedUser = await User.findByIdAndUpdate(targetUserId, updates, { new: true }).select("-password");
    
    await logTransaction({ req, resStatus: 200, user: currentUser, details: `Updated user: ${updatedUser.email}` });
    
    return NextResponse.json(updatedUser, { status: 200 });
  } catch (err) {
    console.error("Update user route error:", err);
    return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
  }
}
