import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ControlSettings from "@/models/ControlSettings";

export async function GET() {
  try {
    await dbConnect();
    let settings = await ControlSettings.findOne({});
    
    if (!settings) {
      settings = await ControlSettings.create({});
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

    let settings = await ControlSettings.findOne({});
    if (!settings) {
      settings = await ControlSettings.create(data);
    } else {
      settings = await ControlSettings.findOneAndUpdate({}, data, { new: true });
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
