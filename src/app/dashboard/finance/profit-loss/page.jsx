"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FiCalendar, FiDownload, FiPrinter, FiTrendingUp } from "react-icons/fi";
import { motion } from "framer-motion";
import useStandardPrint from "@/hooks/useStandardPrint";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";
import usePagePermission from "@/hooks/usePagePermission";

const ProfitLossReport = () => {
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
    pandL: {
      revenue: { room: 0, restaurant: 0, venue: 0, total: 0 },
      expenses: { general: 0, purchases: 0, refunds: 0, total: 0 },
      netProfit: 0
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
    handlePrint
  } = useStandardPrint({
    documentTitle: `Profit_And_Loss_${monthLabel}_${selectedYear}`,
  });

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split("T")[0];
      const end = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0];

      const { data } = await axiosSecure.get(`/finance/reports?startDate=${start}&endDate=${end}`);
      setReportData(data || {});
    } catch (error) {
      console.error("Error fetching Profit & Loss report:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = () => {
    const { pandL, categoryBreakdown } = reportData;
    const rows = [
      { LineItem: "OPERATING REVENUE", Amount: "" },
      { LineItem: "  Room Reservation Bookings", Amount: pandL.revenue.room },
      { LineItem: "  Restaurant Sales Invoices", Amount: pandL.revenue.restaurant },
      { LineItem: "  Venue Reservation Bookings", Amount: pandL.revenue.venue || 0 },
      { LineItem: "TOTAL REVENUE (A)", Amount: pandL.revenue.total },
      { LineItem: "", Amount: "" },
      { LineItem: "OPERATIONAL COST & COGS", Amount: "" },
      { LineItem: "  Supplier Ingredient Purchases (COGS)", Amount: pandL.expenses.purchases },
      { LineItem: "  Booking Cancellation Refunds", Amount: pandL.expenses.refunds }
    ];

    categoryBreakdown.forEach(cat => {
      rows.push({
        LineItem: `  General Expense - ${cat.name}`,
        Amount: cat.amount
      });
    });

    rows.push(
      { LineItem: "TOTAL OPERATIONAL EXPENSE (B)", Amount: pandL.expenses.total },
      { LineItem: "", Amount: "" },
      { LineItem: "NET PROFIT (A - B)", Amount: pandL.netProfit }
    );

    exportToExcel(rows, `Profit_And_Loss_${monthLabel}_${selectedYear}`, "Profit & Loss");
  };

  const handleExportCsv = () => {
    const { pandL, categoryBreakdown } = reportData;
    const rows = [
      { LineItem: "OPERATING REVENUE", Amount: "" },
      { LineItem: "  Room Reservation Bookings", Amount: pandL.revenue.room },
      { LineItem: "  Restaurant Sales Invoices", Amount: pandL.revenue.restaurant },
      { LineItem: "  Venue Reservation Bookings", Amount: pandL.revenue.venue || 0 },
      { LineItem: "TOTAL REVENUE (A)", Amount: pandL.revenue.total },
      { LineItem: "", Amount: "" },
      { LineItem: "OPERATIONAL COST & COGS", Amount: "" },
      { LineItem: "  Supplier Ingredient Purchases (COGS)", Amount: pandL.expenses.purchases },
      { LineItem: "  Booking Cancellation Refunds", Amount: pandL.expenses.refunds }
    ];

    categoryBreakdown.forEach(cat => {
      rows.push({
        LineItem: `  General Expense - ${cat.name}`,
        Amount: cat.amount
      });
    });

    rows.push(
      { LineItem: "TOTAL OPERATIONAL EXPENSE (B)", Amount: pandL.expenses.total },
      { LineItem: "", Amount: "" },
      { LineItem: "NET PROFIT (A - B)", Amount: pandL.netProfit }
    );

    exportToCsv(rows, `Profit_And_Loss_${monthLabel}_${selectedYear}`);
  };

  const { pandL, categoryBreakdown } = reportData;

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <div className="print:hidden">
        <SectionHeader
          title="Profit & Loss Statement"
          subtitle="Accrual-basis income statement showcasing total resort revenues, operational cost of goods sold, and net margins."
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
        <div className="max-w-4xl mx-auto bg-white dark:bg-brand-charcoal/30 p-8 sm:p-12 rounded-3xl border border-brand-beige/50 dark:border-brand-dark-grey/50 shadow-md">
          {/* On-screen view header */}
          <div className="text-center border-b-2 border-brand-primary pb-6 mb-8">
            <h1 className="text-3xl font-black text-brand-primary uppercase tracking-widest">Chayatol Resort & Restaurant</h1>
            <h2 className="text-md font-bold uppercase tracking-wider text-brand-sage mt-1">Statement of Profit & Loss</h2>
            <div className="text-xs font-semibold mt-3 text-brand-charcoal dark:text-brand-offwhite">
              <span>For the Period of <strong>{monthLabel} {selectedYear}</strong></span>
              <p className="text-[10px] font-bold text-brand-sage mt-0.5">(Accrual Accounting Method)</p>
            </div>
          </div>

          <div className="space-y-8 text-sm">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-brand-primary border-b border-brand-primary/20 pb-1 mb-3">Operating Revenue</h3>
              <div className="space-y-2.5">
                <div className="flex justify-between pl-4">
                  <span>Room Reservation Bookings</span>
                  <span className="font-mono font-bold">৳{pandL.revenue.room.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span>Restaurant sales POS Invoices</span>
                  <span className="font-mono font-bold">৳{pandL.revenue.restaurant.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span>Venue Reservation Bookings</span>
                  <span className="font-mono font-bold">৳{(pandL.revenue.venue || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-black text-brand-charcoal dark:text-brand-offwhite border-t border-brand-beige/50 dark:border-brand-beige/10 pt-2">
                  <span>TOTAL OPERATING REVENUE (A)</span>
                  <span className="font-mono">৳{pandL.revenue.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-brand-primary border-b border-brand-primary/20 pb-1 mb-3">Operating Expenditures & Cost of Goods</h3>
              <div className="space-y-2.5">
                <div className="flex justify-between pl-4">
                  <span>Supplier Ingredient Purchases (COGS)</span>
                  <span className="font-mono font-bold">৳{pandL.expenses.purchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span>Booking Cancellation Refunds</span>
                  <span className="font-mono font-bold text-red-500">৳{pandL.expenses.refunds.toLocaleString()}</span>
                </div>
                
                {categoryBreakdown.map(cat => (
                  <div key={cat.name} className="flex justify-between pl-4 text-brand-sage dark:text-brand-sage/80">
                    <span>General Overhead - {cat.name}</span>
                    <span className="font-mono font-bold">৳{cat.amount.toLocaleString()}</span>
                  </div>
                ))}

                <div className="flex justify-between font-black text-brand-charcoal dark:text-brand-offwhite border-t border-brand-beige/50 dark:border-brand-beige/10 pt-2">
                  <span>TOTAL OPERATIONAL EXPENSES (B)</span>
                  <span className="font-mono">৳{pandL.expenses.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-brand-primary/5 dark:bg-brand-charcoal p-6 rounded-2xl border border-brand-primary/10 dark:border-brand-beige/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-primary/10 rounded-full text-brand-primary">
                  <FiTrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-brand-sage">Net Margin EBITDA</h4>
                  <div className="text-xl font-black text-brand-black dark:text-brand-offwhite uppercase tracking-wider">Net Profit (A - B)</div>
                </div>
              </div>
              <div className={`text-2xl font-black font-mono ${pandL.netProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                {pandL.netProfit < 0 ? "- " : ""}৳{Math.abs(pandL.netProfit).toLocaleString()}
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-brand-sage font-bold uppercase tracking-widest pt-8 border-t border-dashed border-brand-beige/50 dark:border-brand-beige/10">
              <span>Audited By: Chayatol Finance</span>
              <span>Generated On: {new Date().toLocaleDateString("en-GB")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title="Statement of Profit & Loss"
            subtitle="Accrual-basis income statement showcasing total resort revenues, operational cost of goods sold, and net margins."
            dateRange={`${monthLabel} ${selectedYear}`}
          >
            <div style={{ fontSize: "12px" }}>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ borderBottom: "1px solid #000", paddingBottom: "4px", textTransform: "uppercase", fontWeight: "bold", fontSize: "12px", color: "#000" }}>Operating Revenue</h3>
                <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>Room Reservation Bookings</td>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>৳{printData.pandL?.revenue?.room?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>Restaurant Sales POS Invoices</td>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>৳{printData.pandL?.revenue?.restaurant?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>Venue Reservation Bookings</td>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>৳{(printData.pandL?.revenue?.venue || 0).toLocaleString()}</td>
                    </tr>
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f3f4f6" }}>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>TOTAL OPERATING REVENUE (A)</td>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontFamily: "monospace" }}>৳{printData.pandL?.revenue?.total?.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ borderBottom: "1px solid #000", paddingBottom: "4px", textTransform: "uppercase", fontWeight: "bold", fontSize: "12px", color: "#000" }}>Operating Expenditures & Cost of Goods</h3>
                <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>Supplier Ingredient Purchases (COGS)</td>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>৳{printData.pandL?.expenses?.purchases?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>Booking Cancellation Refunds</td>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontFamily: "monospace", fontWeight: "bold", color: "#ef4444" }}>৳{printData.pandL?.expenses?.refunds?.toLocaleString()}</td>
                    </tr>
                    {printData.categoryBreakdown?.map(cat => (
                      <tr key={cat.name}>
                        <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>General Overhead - {cat.name}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>৳{cat.amount?.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f3f4f6" }}>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>TOTAL OPERATIONAL EXPENSES (B)</td>
                      <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontFamily: "monospace" }}>৳{printData.pandL?.expenses?.total?.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ border: "1px solid #000", padding: "10px", backgroundColor: "#f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "bold", fontSize: "13px" }}>
                <span>NET PROFIT (A - B)</span>
                <span style={{ fontFamily: "monospace", fontSize: "15px" }}>
                  {printData.pandL?.netProfit < 0 ? "- " : ""}৳{Math.abs(printData.pandL?.netProfit || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </PrintReportTemplate>
        )}
      </div>
    </div>
  );
};

export default ProfitLossReport;
