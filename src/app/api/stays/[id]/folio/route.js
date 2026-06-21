import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import FolioEntry from "@/models/FolioEntry";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const entries = await FolioEntry.find({ stayId: id }).sort({ date: 1 });
    return NextResponse.json(entries, { status: 200 });
  } catch (err) {
    console.error("GET Folio Entries error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { type, description, debit, credit } = body;

    if (!type || !description) {
      return NextResponse.json({ message: "Please provide entry type and description." }, { status: 400 });
    }

    const stay = await Stay.findById(id);
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    const entry = await FolioEntry.create({
      stayId: id,
      type,
      description,
      debit: Number(debit || 0),
      credit: Number(credit || 0)
    });

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Added Folio entry (${type}) for stay: ${stay.stayNo}. Debit: ৳${debit || 0}, Credit: ৳${credit || 0}`,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("POST Folio Entry error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
