import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import ResortService from "@/models/ResortService";
import ServiceOrder from "@/models/ServiceOrder";
import FolioEntry from "@/models/FolioEntry";
import { verifyToken } from "@/lib/auth";
import { logTransaction } from "@/lib/logger";

export async function GET(req, { params }) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  try {
    await dbConnect();
    const { id } = await params;
    const orders = await ServiceOrder.find({ stayId: id })
      .populate("service")
      .sort({ createdAt: 1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.error("GET Service Orders error:", err);
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
    const { serviceId, isChargeable } = body;

    if (!serviceId) {
      return NextResponse.json({ message: "Please provide the service ID." }, { status: 400 });
    }

    const stay = await Stay.findById(id);
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    const service = await ResortService.findById(serviceId);
    if (!service) {
      return NextResponse.json({ message: "Resort service not found." }, { status: 404 });
    }

    const price = service.price;
    const vatAmount = (price * (service.vat || 0)) / 100;
    const scAmount = (price * (service.sc || 0)) / 100;
    const sdAmount = (price * (service.sd || 0)) / 100;

    const totalCost = price + vatAmount + scAmount + sdAmount;

    // Create Service Order
    const serviceOrder = await ServiceOrder.create({
      stayId: id,
      service: service._id,
      price,
      vat: service.vat || 0,
      sc: service.sc || 0,
      sd: service.sd || 0,
      isChargeable: isChargeable !== undefined ? isChargeable : true
    });

    // Create Folio Entry if chargeable
    if (isChargeable !== false) {
      const description = `Service Charge: ${service.serviceName} (Subtotal: ৳${price.toFixed(2)}, VAT: ৳${vatAmount.toFixed(2)}, SC: ৳${scAmount.toFixed(2)}, SD: ৳${sdAmount.toFixed(2)})`;
      await FolioEntry.create({
        stayId: id,
        type: "Service Charge",
        description,
        debit: totalCost,
        credit: 0,
        referenceId: serviceOrder._id
      });
    }

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Ordered service: ${service.serviceName} of ৳${totalCost.toFixed(2)} for stay: ${stay.stayNo}`,
    });

    return NextResponse.json(serviceOrder, { status: 201 });
  } catch (err) {
    console.error("POST Service Order error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
