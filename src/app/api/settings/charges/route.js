import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ChargeSettings from "@/models/ChargeSettings";

export async function GET() {
  try {
    await dbConnect();
    let settings = await ChargeSettings.findOne({});
    
    if (!settings) {
      settings = await ChargeSettings.create({});
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const data = await req.json();

    let settings = await ChargeSettings.findOne({});
    if (!settings) {
      settings = await ChargeSettings.create(data);
    } else {
      settings = await ChargeSettings.findOneAndUpdate({}, data, { new: true });
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
