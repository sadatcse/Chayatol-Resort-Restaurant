import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Expense from "@/models/Expense";
import ExpenseCategory from "@/models/ExpenseCategory";
import ReservationPayment from "@/models/ReservationPayment";
import Invoice from "@/models/Invoice";
import Purchase from "@/models/Purchase";
import VendorPayment from "@/models/VendorPayment";
import FolioEntry from "@/models/FolioEntry";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get("startDate");
    const endStr = searchParams.get("endDate");

    let startDate, endDate;
    if (startStr && endStr) {
      startDate = new Date(startStr);
      endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 1. Fetch Reservation Payments (Room Revenue and Refunds)
    const reservationPayments = await ReservationPayment.find({
      paymentDate: { $gte: startDate, $lte: endDate }
    });

    // 1.1 Fetch Stay Folio Payments
    const folioPayments = await FolioEntry.find({
      type: { $in: ["Payment", "Advance Payment"] },
      date: { $gte: startDate, $lte: endDate }
    });

    let roomRevenue = 0;
    let bookingRefunds = 0;
    reservationPayments.forEach(p => {
      if (p.amount > 0) {
        roomRevenue += p.amount;
      } else {
        bookingRefunds += Math.abs(p.amount);
      }
    });

    folioPayments.forEach(fp => {
      roomRevenue += fp.credit || 0;
    });

    // 2. Fetch Restaurant POS Invoices (Restaurant Sales)
    const restaurantInvoices = await Invoice.find({
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: { $in: ["Paid", "Partial"] }
    });

    let restaurantRevenue = 0;
    restaurantInvoices.forEach(inv => {
      restaurantRevenue += inv.grandTotal || 0;
    });

    // 3. Fetch General Expenses (Salary, Utilities, Maintenance, etc.)
    const expenses = await Expense.find({
      expenseDate: { $gte: startDate, $lte: endDate }
    }).populate("category");

    let totalGeneralExpenses = 0;
    const categoryTotalsObj = {};
    expenses.forEach(e => {
      const catName = e.category?.name || "Uncategorized";
      categoryTotalsObj[catName] = (categoryTotalsObj[catName] || 0) + e.amount;
      totalGeneralExpenses += e.amount;
    });

    const categoryBreakdown = Object.keys(categoryTotalsObj).map(name => ({
      name,
      amount: categoryTotalsObj[name]
    })).sort((a, b) => b.amount - a.amount);

    // 4. Fetch Supplier Purchases (Accrual Expense)
    const purchases = await Purchase.find({
      purchaseDate: { $gte: startDate, $lte: endDate }
    });
    let totalPurchaseAccrual = 0;
    purchases.forEach(p => {
      totalPurchaseAccrual += p.grandTotal || 0;
    });

    // 5. Fetch Vendor Payments (Cash Outflow)
    const vendorPayments = await VendorPayment.find({
      paymentDate: { $gte: startDate, $lte: endDate }
    });
    let totalVendorPaymentsPaid = 0;
    vendorPayments.forEach(vp => {
      totalVendorPaymentsPaid += vp.amount || 0;
    });

    // Profit & Loss Aggregations (Accrual Basis)
    const pandL = {
      revenue: {
        room: roomRevenue,
        restaurant: restaurantRevenue,
        total: roomRevenue + restaurantRevenue
      },
      expenses: {
        general: totalGeneralExpenses,
        purchases: totalPurchaseAccrual,
        refunds: bookingRefunds,
        total: totalGeneralExpenses + totalPurchaseAccrual + bookingRefunds
      },
      netProfit: (roomRevenue + restaurantRevenue) - (totalGeneralExpenses + totalPurchaseAccrual + bookingRefunds)
    };

    // Cash Flow Aggregations (Cash Basis)
    const cashFlow = {
      inflow: {
        room: roomRevenue,
        restaurant: restaurantRevenue,
        total: roomRevenue + restaurantRevenue
      },
      outflow: {
        general: totalGeneralExpenses,
        vendorPayments: totalVendorPaymentsPaid,
        refunds: bookingRefunds,
        total: totalGeneralExpenses + totalVendorPaymentsPaid + bookingRefunds
      },
      netCashFlow: (roomRevenue + restaurantRevenue) - (totalGeneralExpenses + totalVendorPaymentsPaid + bookingRefunds)
    };

    return NextResponse.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      categoryBreakdown,
      pandL,
      cashFlow
    }, { status: 200 });

  } catch (error) {
    console.error("Calculate financial reports error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
