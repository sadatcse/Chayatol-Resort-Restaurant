"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FiCalendar, FiDownload, FiPrinter, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { MdHotel, MdRestaurant, MdOutlineEventAvailable, MdShoppingBag, MdPayment } from "react-icons/md";
import useStandardPrint from "@/hooks/useStandardPrint";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";
import usePagePermission from "@/hooks/usePagePermission";

const FinancialSummaryReport = () => {
  const axiosSecure = useAxiosSecure();
  const { canEdit } = usePagePermission();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-indexed

  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState({
    startDate: "",
    endDate: "",
    categoryBreakdown: [],
    cashFlow: {
      inflow: { room: 0, restaurant: 0, venue: 0, total: 0 },
      outflow: { general: 0, vendorPayments: 0, refunds: 0, total: 0 },
      netCashFlow: 0
    }
  });

  const years = Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i);
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" }
  ];

  const monthLabel = months.find(m => m.value === selectedMonth)?.label || "";

  // Standardize Print hook integration
  const {
    printData,
    setPrintData,
    printRef,
  } = useStandardPrint({
    documentTitle: `Financial_Cash_Summary_${monthLabel}_${selectedYear}`,
  });

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split("T")[0];
      const end = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0];

      const { data } = await axiosSecure.get(`/finance/reports?startDate=${start}&endDate=${end}`);
      setReportData(data || {});
    } catch (error) {
      console.error("Error fetching financial cash summary report:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = () => {
    const { cashFlow, categoryBreakdown } = reportData;
    const rows = [
      { Category: "CASH EARNINGS / INFLOW", Item: "Resort Stay Collections", Amount: cashFlow.inflow.room },
      { Category: "CASH EARNINGS / INFLOW", Item: "Restaurant POS Sales", Amount: cashFlow.inflow.restaurant },
      { Category: "CASH EARNINGS / INFLOW", Item: "Venue Booking Payments", Amount: cashFlow.inflow.venue },
      { Category: "CASH EARNINGS / INFLOW", Item: "TOTAL CASH EARNINGS", Amount: cashFlow.inflow.total },
      { Category: "", Item: "", Amount: "" },
      { Category: "CASH EXPENDITURES / OUTFLOW", Item: "Supplier Purchase Payments", Amount: cashFlow.outflow.vendorPayments },
      { Category: "CASH EXPENDITURES / OUTFLOW", Item: "Cancellation Refunds Payout", Amount: cashFlow.outflow.refunds }
    ];

    categoryBreakdown.forEach(cat => {
      rows.push({
        Category: "CASH EXPENDITURES / OUTFLOW",
        Item: `General Overhead Expense - ${cat.name}`,
        Amount: cat.amount
      });
    });

    rows.push(
      { Category: "CASH EXPENDITURES / OUTFLOW", Item: "TOTAL CASH EXPENDITURES", Amount: cashFlow.outflow.total },
      { Category: "", Item: "", Amount: "" },
      { Category: "NET SUMMARY", Item: "NET CASH POSITION", Amount: cashFlow.netCashFlow }
    );

    exportToExcel(rows, `Financial_Cash_Summary_${monthLabel}_${selectedYear}`, "Cash Summary");
  };

  const handleExportCsv = () => {
    const { cashFlow, categoryBreakdown } = reportData;
    const rows = [
      { Category: "CASH EARNINGS / INFLOW", Item: "Resort Stay Collections", Amount: cashFlow.inflow.room },
      { Category: "CASH EARNINGS / INFLOW", Item: "Restaurant POS Sales", Amount: cashFlow.inflow.restaurant },
      { Category: "CASH EARNINGS / INFLOW", Item: "Venue Booking Payments", Amount: cashFlow.inflow.venue },
      { Category: "CASH EARNINGS / INFLOW", Item: "TOTAL CASH EARNINGS", Amount: cashFlow.inflow.total },
      { Category: "", Item: "", Amount: "" },
      { Category: "CASH EXPENDITURES / OUTFLOW", Item: "Supplier Purchase Payments", Amount: cashFlow.outflow.vendorPayments },
      { Category: "CASH EXPENDITURES / OUTFLOW", Item: "Cancellation Refunds Payout", Amount: cashFlow.outflow.refunds }
    ];

    categoryBreakdown.forEach(cat => {
      rows.push({
        Category: "CASH EXPENDITURES / OUTFLOW",
        Item: `General Overhead Expense - ${cat.name}`,
        Amount: cat.amount
      });
    });

    rows.push(
      { Category: "CASH EXPENDITURES / OUTFLOW", Item: "TOTAL CASH EXPENDITURES", Amount: cashFlow.outflow.total },
      { Category: "", Item: "", Amount: "" },
      { Category: "NET SUMMARY", Item: "NET CASH POSITION", Amount: cashFlow.netCashFlow }
    );

    exportToCsv(rows, `Financial_Cash_Summary_${monthLabel}_${selectedYear}`);
  };

  const { cashFlow, categoryBreakdown } = reportData;

  // Compute maximum amount to scale progress indicator bars dynamically
  const maxInflow = Math.max(cashFlow.inflow.room, cashFlow.inflow.restaurant, cashFlow.inflow.venue, 1);
  const maxOutflow = Math.max(
    cashFlow.outflow.vendorPayments, 
    ...categoryBreakdown.map(c => c.amount),
    1
  );

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <div className="print:hidden">
        <SectionHeader
          title="Financial Statement Summary"
          subtitle="Direct Cash Earnings Statement comparing Resort Stays, Restaurant POS, and Venues collections against Overhead Expenses."
        />

        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-brand-charcoal p-5 rounded-2xl border border-brand-beige dark:border-brand-beige/20 shadow-sm mb-8">
          <div className="flex items-center gap-3">
            <div className="form-control">
              <label className="label py-0.5"><span className="label-text text-[10px] font-bold text-brand-sage uppercase">Select Month</span></label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="select select-bordered select-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary rounded-xl w-40"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label py-0.5"><span className="label-text text-[10px] font-bold text-brand-sage uppercase">Select Year</span></label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="select select-bordered select-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary rounded-xl w-32"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2.5">
              <button onClick={handleExportExcel} className="btn btn-outline border-brand-sage/50 text-brand-sage hover:bg-brand-sage/10 btn-sm rounded-full gap-2 px-5 h-10 font-bold uppercase tracking-wider text-[10px] cursor-pointer" disabled={isLoading}>
                <FiDownload size={14} /> Excel
              </button>
              <button onClick={handleExportCsv} className="btn btn-outline border-brand-sage/50 text-brand-sage hover:bg-brand-sage/10 btn-sm rounded-full gap-2 px-5 h-10 font-bold uppercase tracking-wider text-[10px] cursor-pointer" disabled={isLoading}>
                <FiDownload size={14} /> CSV
              </button>
              <button onClick={() => setPrintData(reportData)} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full gap-2 px-5 h-10 font-bold uppercase tracking-wider text-[10px] cursor-pointer" disabled={isLoading}>
                <FiPrinter size={14} /> Print
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <MtableLoading />
      ) : (
        <div className="space-y-6">
          {/* Main Side-by-Side Summary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Side: Cash Earnings (Inflow) */}
            <div className="bg-white dark:bg-zinc-900 border border-brand-beige/50 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-brand-beige/20 dark:border-zinc-800 pb-4 mb-6">
                  <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-xl text-green-600">
                    <FiTrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-widest text-brand-sage">Statement of Earnings</h3>
                    <p className="text-xs text-brand-charcoal dark:text-zinc-400 font-semibold mt-0.5">Operating Receipts & Cash Collections</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Resort Stays collections */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="flex items-center gap-2 text-brand-charcoal dark:text-zinc-300">
                        <MdHotel className="text-brand-primary text-base" /> Resort Room Stays
                      </span>
                      <span className="font-mono text-brand-black dark:text-brand-offwhite">৳{cashFlow.inflow.room.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-brand-offwhite dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-brand-primary h-full rounded-full transition-all duration-550" 
                        style={{ width: `${(cashFlow.inflow.room / maxInflow) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Restaurant POS collections */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="flex items-center gap-2 text-brand-charcoal dark:text-zinc-300">
                        <MdRestaurant className="text-brand-primary text-base" /> Restaurant POS Sales
                      </span>
                      <span className="font-mono text-brand-black dark:text-brand-offwhite">৳{cashFlow.inflow.restaurant.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-brand-offwhite dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-brand-primary h-full rounded-full transition-all duration-550" 
                        style={{ width: `${(cashFlow.inflow.restaurant / maxInflow) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Venue Bookings collections */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="flex items-center gap-2 text-brand-charcoal dark:text-zinc-300">
                        <MdOutlineEventAvailable className="text-brand-primary text-base" /> Venue Reservations
                      </span>
                      <span className="font-mono text-brand-black dark:text-brand-offwhite">৳{cashFlow.inflow.venue.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-brand-offwhite dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-brand-primary h-full rounded-full transition-all duration-550" 
                        style={{ width: `${(cashFlow.inflow.venue / maxInflow) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-brand-beige/25 dark:border-zinc-800 flex justify-between items-center text-base font-black">
                <span className="text-brand-sage uppercase tracking-wider text-xs">Total Inflows (A)</span>
                <span className="font-mono text-green-600">৳{cashFlow.inflow.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Right Side: Cash Expenditures (Outflow) */}
            <div className="bg-white dark:bg-zinc-900 border border-brand-beige/50 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-brand-beige/20 dark:border-zinc-800 pb-4 mb-6">
                  <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-xl text-red-650">
                    <FiTrendingDown size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-widest text-brand-sage">Statement of Outflows</h3>
                    <p className="text-xs text-brand-charcoal dark:text-zinc-400 font-semibold mt-0.5">Operational Cost & Overhead Expenses Paid</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Supplier Purchase Payments */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="flex items-center gap-2 text-brand-charcoal dark:text-zinc-300">
                        <MdShoppingBag className="text-brand-sage text-base" /> Supplier Purchase Payments
                      </span>
                      <span className="font-mono text-brand-black dark:text-brand-offwhite">৳{cashFlow.outflow.vendorPayments.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-brand-offwhite dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-brand-sage h-full rounded-full transition-all duration-550" 
                        style={{ width: `${(cashFlow.outflow.vendorPayments / maxOutflow) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* General overhead categories breakdown */}
                  {categoryBreakdown.map(cat => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="flex items-center gap-2 text-brand-sage dark:text-brand-sage/80 pl-2">
                          • Overhead - {cat.name}
                        </span>
                        <span className="font-mono text-brand-black dark:text-brand-offwhite">৳{cat.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-brand-offwhite dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-sage/60 dark:bg-brand-sage/40 h-full rounded-full transition-all duration-550" 
                          style={{ width: `${(cat.amount / maxOutflow) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Refunds payouts */}
                  {cashFlow.outflow.refunds > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="flex items-center gap-2 text-red-500 pl-2">
                          • Stay Cancellations Refunds
                        </span>
                        <span className="font-mono text-red-500">৳{cashFlow.outflow.refunds.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-brand-beige/25 dark:border-zinc-800 flex justify-between items-center text-base font-black">
                <span className="text-brand-sage uppercase tracking-wider text-xs">Total Outflows (B)</span>
                <span className="font-mono text-red-500">৳{cashFlow.outflow.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Bottom Net Cash Summary Card */}
          <div className="bg-white dark:bg-zinc-900 border border-brand-beige/50 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-primary/10 rounded-full text-brand-primary">
                <MdPayment size={24} />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-brand-sage">Net Cash Statement</h4>
                <div className="text-lg font-black text-brand-black dark:text-brand-offwhite uppercase tracking-wider">Operating Cash Surplus (A - B)</div>
              </div>
            </div>

            <div className={`text-2xl sm:text-3xl font-black font-mono ${cashFlow.netCashFlow >= 0 ? "text-green-600" : "text-red-500"}`}>
              {cashFlow.netCashFlow < 0 ? "- " : ""}৳{Math.abs(cashFlow.netCashFlow).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title="Statement of Cash Earnings & Overhead Expenditures"
            subtitle="Overview of cash-basis inflow receipts compared against supplier purchases and overhead expense breakdown."
            dateRange={`${monthLabel} ${selectedYear}`}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginTop: "20px" }}>
              {/* Left Column: Earnings */}
              <div>
                <h3 style={{ borderBottom: "2px solid #000", paddingBottom: "4px", fontWeight: "bold", textTransform: "uppercase", fontSize: "12px" }}>Cash Earnings Inflows</h3>
                <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px", border: "1px solid #ddd" }}>Resort Room Stays Collections</td>
                      <td style={{ padding: "6px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold", fontFamily: "monospace" }}>৳{printData.cashFlow?.inflow?.room?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "6px", border: "1px solid #ddd" }}>Restaurant POS Cash Sales</td>
                      <td style={{ padding: "6px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold", fontFamily: "monospace" }}>৳{printData.cashFlow?.inflow?.restaurant?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "6px", border: "1px solid #ddd" }}>Venue Reservation Bookings</td>
                      <td style={{ padding: "6px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold", fontFamily: "monospace" }}>৳{printData.cashFlow?.inflow?.venue?.toLocaleString()}</td>
                    </tr>
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f3f4f6" }}>
                      <td style={{ padding: "6px", border: "1px solid #ddd" }}>TOTAL CASH INFLOWS (A)</td>
                      <td style={{ padding: "6px", border: "1px solid #ddd", textAlign: "right", fontFamily: "monospace" }}>৳{printData.cashFlow?.inflow?.total?.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right Column: Outflows */}
              <div>
                <h3 style={{ borderBottom: "2px solid #000", paddingBottom: "4px", fontWeight: "bold", textTransform: "uppercase", fontSize: "12px" }}>Cash Expenditures Outflows</h3>
                <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px", border: "1px solid #ddd" }}>Supplier Purchase Payments</td>
                      <td style={{ padding: "6px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold", fontFamily: "monospace" }}>৳{printData.cashFlow?.outflow?.vendorPayments?.toLocaleString()}</td>
                    </tr>
                    {printData.categoryBreakdown?.map(cat => (
                      <tr key={cat.name}>
                        <td style={{ padding: "6px", border: "1px solid #ddd" }}>Overhead - {cat.name}</td>
                        <td style={{ padding: "6px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold", fontFamily: "monospace" }}>৳{cat.amount?.toLocaleString()}</td>
                      </tr>
                    ))}
                    {printData.cashFlow?.outflow?.refunds > 0 && (
                      <tr>
                        <td style={{ padding: "6px", border: "1px solid #ddd" }}>Cancellation Payout Refunds</td>
                        <td style={{ padding: "6px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold", fontFamily: "monospace", color: "#ef4444" }}>৳{printData.cashFlow?.outflow?.refunds?.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f3f4f6" }}>
                      <td style={{ padding: "6px", border: "1px solid #ddd" }}>TOTAL CASH OUTFLOWS (B)</td>
                      <td style={{ padding: "6px", border: "1px solid #ddd", textAlign: "right", fontFamily: "monospace" }}>৳{printData.cashFlow?.outflow?.total?.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: "30px", border: "2px solid #000", padding: "12px", backgroundColor: "#f3f4f6", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "13px" }}>
              <span>NET CASH SURPLUS POSITION (A - B)</span>
              <span style={{ fontFamily: "monospace", fontSize: "15px" }}>
                {printData.cashFlow?.netCashFlow < 0 ? "- " : ""}৳{Math.abs(printData.cashFlow?.netCashFlow || 0).toLocaleString()}
              </span>
            </div>
          </PrintReportTemplate>
        )}
      </div>

    </div>
  );
};

export default FinancialSummaryReport;
