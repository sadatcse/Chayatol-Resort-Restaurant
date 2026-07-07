import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Expense from "@/models/Expense";
import ReservationPayment from "@/models/ReservationPayment";
import Invoice from "@/models/Invoice";
import Purchase from "@/models/Purchase";
import FolioEntry from "@/models/FolioEntry";
import TransactionLog from "@/models/TransactionLog";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  const auth = verifyToken(req);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

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
    const [todayResPayments, todayFolioPayments, todayInvoices, todayExpenses] = await Promise.all([
      ReservationPayment.find({ paymentDate: { $gte: startOfToday, $lte: endOfToday } }),
      FolioEntry.find({ type: { $in: ["Payment", "Advance Payment"] }, date: { $gte: startOfToday, $lte: endOfToday } }),
      Invoice.find({ createdAt: { $gte: startOfToday, $lte: endOfToday }, paymentStatus: { $in: ["Paid", "Partial"] } }),
      Expense.find({ expenseDate: { $gte: startOfToday, $lte: endOfToday } })
    ]);

    let todayRevenue = 0;
    todayResPayments.forEach(p => {
      todayRevenue += p.amount;
    });
    todayFolioPayments.forEach(fp => {
      todayRevenue += fp.credit || 0;
    });
    todayInvoices.forEach(inv => {
      todayRevenue += inv.grandTotal || 0;
    });

    const todayVenueLogs = await TransactionLog.find({
      transactionTime: { $gte: startOfToday, $lte: endOfToday },
      details: { $regex: /venue booking/i }
    });
    todayVenueLogs.forEach(vl => {
      todayRevenue += vl.amount || 0;
    });

    let todayExpense = 0;
    todayExpenses.forEach(e => {
      todayExpense += e.amount;
    });

    // --- 2. MONTHLY STATS ---
    const [monthResPayments, monthFolioPayments, monthInvoices, monthExpenses, monthPurchases] = await Promise.all([
      ReservationPayment.find({ paymentDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      FolioEntry.find({ type: { $in: ["Payment", "Advance Payment"] }, date: { $gte: startOfMonth, $lte: endOfMonth } }),
      Invoice.find({ createdAt: { $gte: startOfMonth, $lte: endOfMonth }, paymentStatus: { $in: ["Paid", "Partial"] } }),
      Expense.find({ expenseDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Purchase.find({ purchaseDate: { $gte: startOfMonth, $lte: endOfMonth } })
    ]);

    let monthlyRevenue = 0;
    monthResPayments.forEach(p => {
      monthlyRevenue += p.amount;
    });
    monthFolioPayments.forEach(fp => {
      monthlyRevenue += fp.credit || 0;
    });
    monthInvoices.forEach(inv => {
      monthlyRevenue += inv.grandTotal || 0;
    });

    const monthVenueLogs = await TransactionLog.find({
      transactionTime: { $gte: startOfMonth, $lte: endOfMonth },
      details: { $regex: /venue booking/i }
    });
    monthVenueLogs.forEach(vl => {
      monthlyRevenue += vl.amount || 0;
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
