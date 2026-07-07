import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ReservationPayment from "@/models/ReservationPayment";
import Invoice from "@/models/Invoice";
import VenueBooking from "@/models/VenueBooking";
import Permission from "@/models/Permission";
import { verifyToken } from "@/lib/auth";

// Standardize payment method names
const getStandardMethod = (method) => {
  if (!method) return "Others";
  const m = method.toLowerCase().trim();
  if (m.includes("cash")) return "Cash";
  if (m.includes("card") || m.includes("visa") || m.includes("master") || m.includes("pos")) return "Card";
  if (m.includes("bkash")) return "bKash";
  if (m.includes("nagad")) return "Nagad";
  if (m.includes("bank") || m.includes("transfer") || m.includes("online")) return "Bank Transfer";
  return method.charAt(0).toUpperCase() + method.slice(1);
};

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  // Permission Check
  if (auth.user.role !== "superadmin" && auth.user.role !== "admin") {
    try {
      await dbConnect();
      const permission = await Permission.findOne({
        role: auth.user.role,
        path: "/dashboard/reports/payments",
      });

      const isAllowed = permission && (permission.isAllowed || permission.canView === true);
      if (!isAllowed) {
        return NextResponse.json({ message: "Forbidden: You do not have permission to view payment reports." }, { status: 403 });
      }
    } catch (err) {
      console.error("Permission check error in payments report API:", err);
      return NextResponse.json({ error: "Failed to verify permission" }, { status: 500 });
    }
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate") || "";
    const endDateStr = searchParams.get("endDate") || "";
    const methodFilter = searchParams.get("method") || "all";

    const start = startDateStr ? new Date(startDateStr) : null;
    if (start) start.setHours(0, 0, 0, 0);

    const end = endDateStr ? new Date(endDateStr) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const unifiedPayments = [];

    // 1. Fetch Reservation Payments (Resort Rooms)
    const resPaymentQuery = {};
    if (start || end) {
      resPaymentQuery.paymentDate = {};
      if (start) resPaymentQuery.paymentDate.$gte = start;
      if (end) resPaymentQuery.paymentDate.$lte = end;
    }

    const resPayments = await ReservationPayment.find(resPaymentQuery)
      .populate({
        path: "reservationId",
        populate: { path: "customer", select: "name" }
      });

    resPayments.forEach((pay) => {
      const stdMethod = getStandardMethod(pay.paymentType);
      if (methodFilter !== "all" && stdMethod !== methodFilter) return;

      unifiedPayments.push({
        _id: pay._id,
        date: pay.paymentDate,
        source: "Resort Stay",
        customerName: pay.reservationId?.customer?.name || "Walk-in Guest",
        paymentMethod: stdMethod,
        reference: pay.transactionRef || "N/A",
        amount: pay.amount || 0,
      });
    });

    // 2. Fetch Restaurant Invoices (Paid or Partial)
    const invoiceQuery = { paymentStatus: { $in: ["Paid", "Partial"] } };
    if (start || end) {
      invoiceQuery.dateTime = {};
      if (start) invoiceQuery.dateTime.$gte = start;
      if (end) invoiceQuery.dateTime.$lte = end;
    }

    const invoices = await Invoice.find(invoiceQuery);

    invoices.forEach((inv) => {
      const stdMethod = getStandardMethod(inv.paymentMethod);
      if (methodFilter !== "all" && stdMethod !== methodFilter) return;

      unifiedPayments.push({
        _id: inv._id,
        date: inv.dateTime || inv.createdAt,
        source: "Restaurant POS",
        customerName: inv.customerName || inv.customer?.name || "Restaurant Customer",
        paymentMethod: stdMethod,
        reference: inv.invoiceNo || "N/A",
        amount: inv.grandTotal || 0, // In restaurant, grandTotal is the order value settled
      });
    });

    // 3. Fetch Venue Bookings (Paid amount > 0)
    const venueQuery = { paidAmount: { $gt: 0 } };
    if (start || end) {
      venueQuery.createdAt = {};
      if (start) venueQuery.createdAt.$gte = start;
      if (end) venueQuery.createdAt.$lte = end;
    }

    const venueBookings = await VenueBooking.find(venueQuery).populate("customer", "name");

    venueBookings.forEach((book) => {
      const stdMethod = getStandardMethod(book.paymentMethod);
      if (methodFilter !== "all" && stdMethod !== methodFilter) return;

      unifiedPayments.push({
        _id: book._id,
        date: book.createdAt,
        source: "Venue Booking",
        customerName: book.customer?.name || "Event Client",
        paymentMethod: stdMethod,
        reference: book.bookingNumber || "N/A",
        amount: book.paidAmount || 0,
      });
    });

    // Sort combined collections chronologically (newest first for table list)
    unifiedPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate aggregations
    let totalCollected = 0;
    const methodTotals = {
      Cash: { method: "Cash", amount: 0, count: 0 },
      Card: { method: "Card", amount: 0, count: 0 },
      bKash: { method: "bKash", amount: 0, count: 0 },
      Nagad: { method: "Nagad", amount: 0, count: 0 },
      "Bank Transfer": { method: "Bank Transfer", amount: 0, count: 0 },
      Others: { method: "Others", amount: 0, count: 0 },
    };

    const unitTotals = {
      "Resort Stay": 0,
      "Restaurant POS": 0,
      "Venue Booking": 0,
    };

    const dailyStatsMap = {};

    unifiedPayments.forEach((p) => {
      totalCollected += p.amount;

      // Method totals
      if (methodTotals[p.paymentMethod] !== undefined) {
        methodTotals[p.paymentMethod].amount += p.amount;
        methodTotals[p.paymentMethod].count += 1;
      } else {
        methodTotals["Others"].amount += p.amount;
        methodTotals["Others"].count += 1;
      }

      // Unit totals
      if (unitTotals[p.source] !== undefined) {
        unitTotals[p.source] += p.amount;
      }

      // Timeseries date calculation (YYYY-MM-DD)
      const dateStr = p.date ? new Date(p.date).toISOString().split("T")[0] : "N/A";
      if (dateStr !== "N/A") {
        if (!dailyStatsMap[dateStr]) {
          dailyStatsMap[dateStr] = { date: dateStr, amount: 0 };
        }
        dailyStatsMap[dateStr].amount += p.amount;
      }
    });

    const dailyStats = Object.values(dailyStatsMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    return NextResponse.json({
      summary: {
        totalCollected,
        methodBreakdown: Object.values(methodTotals).filter(m => m.count > 0 || m.amount > 0),
        unitBreakdown: Object.keys(unitTotals).map(key => ({ name: key, value: unitTotals[key] })),
      },
      dailyStats,
      payments: unifiedPayments,
    }, { status: 200 });

  } catch (err) {
    console.error("Payment Collections Report API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
