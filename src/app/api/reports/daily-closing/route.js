import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ReservationPayment from "@/models/ReservationPayment";
import FolioEntry from "@/models/FolioEntry";
import Stay from "@/models/Stay";
import Reservation from "@/models/Reservation";
import Customer from "@/models/Customer";
import Invoice from "@/models/Invoice";
import VenueBooking from "@/models/VenueBooking";
import PaymentType from "@/models/PaymentType";
import Permission from "@/models/Permission";
import { verifyToken } from "@/lib/auth";

// Fully dynamic payment method resolver using database-registered PaymentType entries
const resolveDynamicPaymentMethod = (rawMethod, registeredTypes = []) => {
  if (!rawMethod || typeof rawMethod !== "string") return "Cash";
  const trimmed = rawMethod.trim();
  if (!trimmed) return "Cash";
  const lower = trimmed.toLowerCase();

  // Ignore discount keyword if present
  if (lower === "discount") return "Cash";

  // 1. Direct case-insensitive match with any registered PaymentType in DB
  const exactMatch = registeredTypes.find(t => t.name.toLowerCase() === lower);
  if (exactMatch) return exactMatch.name;

  // 2. Substring match with registered PaymentType in DB
  const partialMatch = registeredTypes.find(t => lower.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(lower));
  if (partialMatch) return partialMatch.name;

  // 3. Fallback to capitalized raw string (no hardcoded limits)
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  // Permission Check
  if (auth.user?.role !== "superadmin" && auth.user?.role !== "admin") {
    try {
      await dbConnect();
      const permission = await Permission.findOne({
        role: auth.user.role,
        path: "/dashboard/daily-closing",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canView === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "Forbidden: You do not have permission to view daily closing reports." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in daily closing API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate") || "";
    const endDateStr = searchParams.get("endDate") || "";
    const sectorFilter = searchParams.get("sector") || "all";
    const methodFilter = searchParams.get("method") || "all";

    const start = startDateStr ? new Date(startDateStr) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDateStr ? new Date(endDateStr) : new Date();
    end.setHours(23, 59, 59, 999);

    // Fetch dynamic payment types from database
    const registeredPaymentTypes = await PaymentType.find({}).sort({ name: 1 }).lean();

    const transactions = [];
    let resortDiscountTotal = 0;

    // 1. RESORT STAY PAYMENTS
    if (sectorFilter === "all" || sectorFilter === "Resort Stay") {
      // A. Reservation Deposits
      const resPayments = await ReservationPayment.find({
        paymentDate: { $gte: start, $lte: end }
      }).populate({
        path: "reservationId",
        populate: { path: "customer", select: "fullName phoneNumber" }
      });

      resPayments.forEach((pay) => {
        const method = resolveDynamicPaymentMethod(pay.paymentType, registeredPaymentTypes);
        if (methodFilter !== "all" && method.toLowerCase() !== methodFilter.toLowerCase()) return;

        transactions.push({
          _id: pay._id.toString(),
          date: pay.paymentDate || pay.createdAt,
          sector: "Resort Stay",
          customerName: pay.reservationId?.customer?.fullName || "Walk-In Guest",
          paymentMethod: method,
          reference: pay.transactionRef || pay.reservationId?.reservationNo || "Deposit",
          staff: pay.receivedBy || pay.createdBy?.name || "Farnaj meherin",
          amount: pay.amount || 0,
          description: `Reservation Deposit - ${pay.notes || "Advance Payment"}`
        });
      });

      // B. Stay Folio Settlements & Direct Payments ONLY (EXCLUDING Discounts!)
      const folioEntries = await FolioEntry.find({
        createdAt: { $gte: start, $lte: end },
        credit: { $gt: 0 },
        type: { $ne: "Discount" } // CRITICAL: Discounts are NOT payments!
      }).populate({
        path: "stayId",
        populate: { path: "customer", select: "fullName phoneNumber" }
      });

      folioEntries.forEach((entry) => {
        let rawMethod = "Cash";
        const desc = entry.description || "";

        // Extract method string inside parentheses e.g. "Direct Payment (bKash) - Ref: 123"
        if (desc.includes("(") && desc.includes(")")) {
          const inside = desc.split("(")[1].split(")")[0];
          if (!inside.toLowerCase().includes("discount")) {
            rawMethod = inside;
          }
        } else {
          const matched = registeredPaymentTypes.find(t => desc.toLowerCase().includes(t.name.toLowerCase()));
          if (matched) {
            rawMethod = matched.name;
          }
        }

        const method = resolveDynamicPaymentMethod(rawMethod, registeredPaymentTypes);
        if (methodFilter !== "all" && method.toLowerCase() !== methodFilter.toLowerCase()) return;

        transactions.push({
          _id: entry._id.toString(),
          date: entry.createdAt,
          sector: "Resort Stay",
          customerName: entry.stayId?.customer?.fullName || "In-House Guest",
          paymentMethod: method,
          reference: entry.stayId?.stayNo || "Folio Ledger",
          staff: entry.staffName || entry.stayId?.staffName || "Farnaj meherin",
          amount: entry.credit || 0,
          description: entry.description
        });
      });

      // C. Track Resort Stay Discounts (For Statement Reporting Only - NOT money collected)
      const discountEntries = await FolioEntry.find({
        createdAt: { $gte: start, $lte: end },
        type: "Discount"
      });
      resortDiscountTotal = discountEntries.reduce((acc, d) => acc + (d.credit || 0), 0);
    }

    // 2. RESTAURANT POS INVOICES
    let posSubtotal = 0;
    let posVat = 0;
    let posSd = 0;
    let posSc = 0;
    let posDiscount = 0;
    let posItemsSold = 0;
    let posInvoiceCount = 0;
    const posTableMap = {};
    const posOrderTypeMap = {};

    if (sectorFilter === "all" || sectorFilter === "Restaurant POS") {
      const invoices = await Invoice.find({
        dateTime: { $gte: start, $lte: end },
        paymentStatus: { $in: ["Paid", "Partial"] }
      });

      posInvoiceCount = invoices.length;

      invoices.forEach((inv) => {
        const method = resolveDynamicPaymentMethod(inv.paymentMethod, registeredPaymentTypes);

        posSubtotal += inv.subtotal || inv.subTotal || 0;
        posVat += inv.vat || 0;
        posSd += inv.sd || 0;
        posSc += inv.serviceCharge || 0;
        posDiscount += inv.discount || 0;

        if (Array.isArray(inv.products)) {
          inv.products.forEach(p => {
            posItemsSold += p.qty || p.quantity || 0;
          });
        }

        const orderType = inv.orderType || "Dine In";
        posOrderTypeMap[orderType] = (posOrderTypeMap[orderType] || 0) + (inv.grandTotal || inv.totalAmount || 0);

        const table = inv.tableName || inv.roomNo || inv.tableNo || "Takeaway/Delivery";
        posTableMap[table] = (posTableMap[table] || 0) + (inv.grandTotal || inv.totalAmount || 0);

        if (methodFilter !== "all" && method.toLowerCase() !== methodFilter.toLowerCase()) return;

        transactions.push({
          _id: inv._id.toString(),
          date: inv.dateTime || inv.createdAt,
          sector: "Restaurant POS",
          customerName: inv.customerName || inv.customer?.fullName || "POS Guest",
          paymentMethod: method,
          reference: inv.invoiceNo || "POS Bill",
          staff: inv.loginUserName || inv.createdBy?.name || "POS Cashier",
          amount: inv.grandTotal || inv.totalAmount || 0,
          description: `Restaurant Order (${inv.orderType || "Dine In"})`
        });
      });
    }

    let posBestTable = "N/A";
    let maxTableSales = 0;
    Object.entries(posTableMap).forEach(([tbl, sales]) => {
      if (sales > maxTableSales && tbl !== "Takeaway/Delivery") {
        maxTableSales = sales;
        posBestTable = tbl;
      }
    });

    // 3. VENUE BOOKINGS
    if (sectorFilter === "all" || sectorFilter === "Venue Booking") {
      const venueBookings = await VenueBooking.find({
        createdAt: { $gte: start, $lte: end },
        paidAmount: { $gt: 0 }
      }).populate("customer", "fullName phoneNumber");

      venueBookings.forEach((book) => {
        const method = resolveDynamicPaymentMethod(book.paymentMethod, registeredPaymentTypes);
        if (methodFilter !== "all" && method.toLowerCase() !== methodFilter.toLowerCase()) return;

        transactions.push({
          _id: book._id.toString(),
          date: book.createdAt,
          sector: "Venue Booking",
          customerName: book.customer?.fullName || book.customerName || "Event Client",
          paymentMethod: method,
          reference: book.bookingNumber || "Venue Event",
          staff: "Venue Desk Staff",
          amount: book.paidAmount || 0,
          description: `Venue Booking - ${book.eventName || "Event Hall"}`
        });
      });
    }

    // Sort transactions chronologically (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Dynamic aggregation setup
    let totalCollected = 0;
    let resortTotal = 0;
    let restaurantTotal = 0;
    let venueTotal = 0;

    const methodMap = {};
    const staffMap = {};

    // Seed methodMap dynamically with registered payment types
    registeredPaymentTypes.forEach(pt => {
      methodMap[pt.name] = { method: pt.name, image: pt.image || "", amount: 0, count: 0 };
    });

    transactions.forEach((tx) => {
      totalCollected += tx.amount;

      if (tx.sector === "Resort Stay") resortTotal += tx.amount;
      if (tx.sector === "Restaurant POS") restaurantTotal += tx.amount;
      if (tx.sector === "Venue Booking") venueTotal += tx.amount;

      // Dynamically add payment method entry if not already seeded
      if (!methodMap[tx.paymentMethod]) {
        methodMap[tx.paymentMethod] = { method: tx.paymentMethod, image: "", amount: 0, count: 0 };
      }
      methodMap[tx.paymentMethod].amount += tx.amount;
      methodMap[tx.paymentMethod].count += 1;

      // Staff breakdown
      const staffName = tx.staff || "System Cashier";
      staffMap[staffName] = (staffMap[staffName] || 0) + tx.amount;
    });

    const methodBreakdown = Object.values(methodMap).filter(m => m.amount > 0 || m.count > 0);
    const staffBreakdown = Object.entries(staffMap).map(([staff, amount]) => ({ staff, amount }));

    const totalDiscounts = resortDiscountTotal + posDiscount;

    return NextResponse.json({
      success: true,
      summary: {
        totalCollected,
        resortTotal,
        restaurantTotal,
        venueTotal,
        resortDiscountTotal,
        posDiscountTotal: posDiscount,
        totalDiscounts,
        orderCount: transactions.length,
        methodBreakdown,
        sectorBreakdown: [
          { name: "Resort Stay & Rooms", value: resortTotal },
          { name: "Restaurant POS", value: restaurantTotal },
          { name: "Venue Bookings", value: venueTotal }
        ],
        staffBreakdown
      },
      restaurantMetrics: {
        orderCount: posInvoiceCount,
        itemsSold: posItemsSold,
        subtotal: posSubtotal,
        vat: posVat,
        sd: posSd,
        sc: posSc,
        discount: posDiscount,
        totalAmount: restaurantTotal,
        bestTable: posBestTable,
        maxTableSales,
        tableBreakdown: posTableMap,
        orderTypeBreakdown: posOrderTypeMap
      },
      paymentTypes: registeredPaymentTypes.map(pt => ({ _id: pt._id.toString(), name: pt.name, image: pt.image })),
      transactions
    }, { status: 200 });

  } catch (err) {
    console.error("Daily Closing API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
