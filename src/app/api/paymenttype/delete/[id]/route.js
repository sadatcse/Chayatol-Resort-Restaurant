import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PaymentType from "@/models/PaymentType";
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

    const result = await PaymentType.findByIdAndDelete(id);
    if (result) {
      await logTransaction({
        req,
        resStatus: 200,
        user: auth.user,
        details: `Deleted payment type: ${id} (${result.name})`,
      });
      return NextResponse.json({ message: "Payment type deleted successfully" }, { status: 200 });
    } else {
      await logTransaction({
        req,
        resStatus: 404,
        user: auth.user,
        details: `Failed delete: payment type ${id} not found`,
      });
      return NextResponse.json({ message: "Payment type not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Delete payment type route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
