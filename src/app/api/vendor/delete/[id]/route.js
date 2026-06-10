import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";
import Purchase from "@/models/Purchase";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function DELETE(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;

    // Check if vendor is in use by any purchases
    const inUse = await Purchase.findOne({ vendor: id });
    if (inUse) {
      return NextResponse.json(
        { message: "Cannot delete vendor because it is referenced in purchase records." },
        { status: 400 }
      );
    }

    const result = await Vendor.findByIdAndDelete(id);
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Deleted vendor: ${id} (${result.vendorName})`,
      });
      return NextResponse.json({ message: "Vendor deleted successfully" }, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed delete: vendor ${id} not found`,
      });
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Delete vendor route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
