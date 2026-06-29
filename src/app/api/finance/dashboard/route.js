import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Expense from "@/models/Expense";
import ReservationPayment from "@/models/ReservationPayment";
import Invoice from "@/models/Invoice";
import Purchase from "@/models/Purchase";

export async function GET(req) {
  try {
    await dbConnect();

    const now = new Date();
    
    // Today date range
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Current month date range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // --- 1. TODAY STATS ---
    const [todayResPayments, todayInvoices, todayExpenses] = await Promise.all([
      ReservationPayment.find({ paymentDate: { $gte: startOfToday, $lte: endOfToday } }),
      Invoice.find({ createdAt: { $gte: startOfToday, $lte: endOfToday }, paymentStatus: { $in: ["Paid", "Partial"] } }),
      Expense.find({ expenseDate: { $gte: startOfToday, $lte: endOfToday } })
    ]);

    let todayRevenue = 0;
    todayResPayments.forEach(p => {
      todayRevenue += p.amount;
    });
    todayInvoices.forEach(inv => {
      todayRevenue += inv.grandTotal || 0;
    });

    let todayExpense = 0;
    todayExpenses.forEach(e => {
      todayExpense += e.amount;
    });

    // --- 2. MONTHLY STATS ---
    const [monthResPayments, monthInvoices, monthExpenses, monthPurchases] = await Promise.all([
      ReservationPayment.find({ paymentDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Invoice.find({ createdAt: { $gte: startOfMonth, $lte: endOfMonth }, paymentStatus: { $in: ["Paid", "Partial"] } }),
      Expense.find({ expenseDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Purchase.find({ purchaseDate: { $gte: startOfMonth, $lte: endOfMonth } })
    ]);

    let monthlyRevenue = 0;
    monthResPayments.forEach(p => {
      monthlyRevenue += p.amount;
    });
    monthInvoices.forEach(inv => {
      monthlyRevenue += inv.grandTotal || 0;
    });

    let monthlyExpense = 0;
    monthExpenses.forEach(e => {
      monthlyExpense += e.amount;
    });
    monthPurchases.forEach(p => {
      monthlyExpense += p.grandTotal || 0;
    });

    const netProfit = monthlyRevenue - monthlyExpense;

    // --- 3. PENDING SUPPLIER DUE ---
    const unpaidPurchases = await Purchase.find({
      paymentStatus: { $in: ["Unpaid", "Partial"] }
    });

    let pendingSupplierDue = 0;
    unpaidPurchases.forEach(p => {
      const due = (p.grandTotal || 0) - (p.paidAmount || 0);
      if (due > 0) {
        pendingSupplierDue += due;
      }
    });

    return NextResponse.json({
      todayRevenue,
      todayExpense,
      monthlyRevenue,
      monthlyExpense,
      netProfit,
      pendingSupplierDue
    }, { status: 200 });

  } catch (error) {
    console.error("Get financial dashboard stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
