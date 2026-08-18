import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stay from "@/models/Stay";
import Food from "@/models/Food";
import FoodOrder from "@/models/FoodOrder";
import FolioEntry from "@/models/FolioEntry";
import ChargeSettings from "@/models/ChargeSettings";
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
    const orders = await FoodOrder.find({ stayId: id })
      .populate("items.foodItem")
      .sort({ createdAt: 1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.error("GET Food Orders error:", err);
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
    const { items, isChargeable, idempotencyKey } = body; // Array of { foodItem: id, quantity: number }

    if (!items || items.length === 0) {
      return NextResponse.json({ message: "Please provide food items." }, { status: 400 });
    }

    if (idempotencyKey) {
      const existing = await FoodOrder.findOne({ idempotencyKey, stayId: id });
      if (existing) {
        return NextResponse.json(existing, { status: 201 });
      }
    }

    const stay = await Stay.findById(id);
    if (!stay) {
      return NextResponse.json({ message: "Guest stay record not found." }, { status: 404 });
    }

    // Fetch dynamic charge configurations
    const chargeSettings = await ChargeSettings.findOne({});

    const orderItems = [];
    let orderSubtotal = 0;
    let orderVat = 0;
    let orderSc = 0;
    let orderSd = 0;

    for (const item of items) {
      const food = await Food.findById(item.foodItem);
      if (!food) {
        return NextResponse.json({ message: `Food item with ID ${item.foodItem} not found.` }, { status: 400 });
      }

      const quantity = Number(item.quantity || 1);
      const price = food.price;
      const sub = price * quantity;

      // Determine applicable VAT, SC, SD dynamically using Room Service settings
      let itemVatPercent = 0;
      if (chargeSettings?.vat?.enabled) {
        const isApplicable = chargeSettings.vat.customApplicability
          ? !!chargeSettings.vat.applicability?.["Room Service"]
          : true;
        if (isApplicable) {
          itemVatPercent = chargeSettings.vat.value || 0;
        }
      }

      let itemScPercent = 0;
      if (chargeSettings?.sc?.enabled) {
        const isApplicable = chargeSettings.sc.customApplicability
          ? !!chargeSettings.sc.applicability?.["Room Service"]
          : true;
        if (isApplicable) {
          itemScPercent = chargeSettings.sc.value || 0;
        }
      }

      let itemSdPercent = 0;
      if (chargeSettings?.sd?.enabled) {
        const isApplicable = chargeSettings.sd.customApplicability
          ? !!chargeSettings.sd.applicability?.["Room Service"]
          : true;
        if (isApplicable) {
          itemSdPercent = chargeSettings.sd.value || 0;
        }
      }

      const itemVat = (sub * itemVatPercent) / 100;
      const itemSc = (sub * itemScPercent) / 100;
      const itemSd = (sub * itemSdPercent) / 100;

      orderItems.push({
        foodItem: food._id,
        quantity,
        unitPrice: price,
        vat: itemVatPercent,
        sc: itemScPercent,
        sd: itemSdPercent
      });

      orderSubtotal += sub;
      orderVat += itemVat;
      orderSc += itemSc;
      orderSd += itemSd;
    }

    const totalCost = orderSubtotal + orderVat + orderSc + orderSd;

    // Create Food Order
    let foodOrder;
    try {
      foodOrder = await FoodOrder.create({
        stayId: id,
        items: orderItems,
        isChargeable: isChargeable !== undefined ? isChargeable : true,
        orderStatus: "Served",
        idempotencyKey: idempotencyKey || undefined
      });
    } catch (saveError) {
      if (saveError.code === 11000 && idempotencyKey) {
        const existing = await FoodOrder.findOne({ idempotencyKey, stayId: id });
        if (existing) {
          return NextResponse.json(existing, { status: 201 });
        }
      }
      throw saveError;
    }

    const staffId = auth.user?.id || auth.user?._id || null;
    const staffName = auth.user?.name || req.headers.get("x-user-name") || auth.user?.email || "Farnaj meherin";

    // Create Folio Entry if chargeable. If this fails, the order would
    // otherwise persist as "served" with no bill and no way to bill it on
    // retry (a same-key retry would just re-return this un-billed order) —
    // so roll the order back and let the whole request fail cleanly instead.
    if (isChargeable !== false) {
      const description = `Food Order - ${orderItems.length} item(s) (Subtotal: ৳${orderSubtotal.toFixed(2)}, VAT: ৳${orderVat.toFixed(2)}, SC: ৳${orderSc.toFixed(2)}, SD: ৳${orderSd.toFixed(2)})`;
      try {
        await FolioEntry.create({
          stayId: id,
          type: "Food Charge",
          description,
          debit: totalCost,
          credit: 0,
          referenceId: foodOrder._id,
          createdBy: staffId,
          staffName
        });
      } catch (folioError) {
        await FoodOrder.deleteOne({ _id: foodOrder._id });
        throw folioError;
      }
    }

    await logTransaction({
      req,
      resStatus: 201,
      user: auth.user,
      details: `Placed food order of ৳${totalCost.toFixed(2)} for stay: ${stay.stayNo}`,
    });

    return NextResponse.json(foodOrder, { status: 201 });
  } catch (err) {
    console.error("POST Food Order error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
