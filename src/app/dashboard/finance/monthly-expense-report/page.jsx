"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FiCalendar, FiDownload, FiPrinter, FiTag, FiFileText } from "react-icons/fi";
import { motion } from "framer-motion";
import useStandardPrint from "@/hooks/useStandardPrint";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";

import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

const MonthlyExpenseReport = () => {
  const axiosSecure = useAxiosSecure();

  // Selected Month / Year
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-indexed

  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState({
    startDate: "",
    endDate: "",
    categoryBreakdown: [],
    pandL: { expenses: { total: 0 } }
  });
  const [detailedExpenses, setDetailedExpenses] = useState([]);

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
    documentTitle: `Expense_Report_${monthLabel}_${selectedYear}`,
  });

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split("T")[0];
      const end = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0];

      const resReport = await axiosSecure.get(`/finance/reports?startDate=${start}&endDate=${end}`);
      setReportData(resReport.data || {});

      const resExpenses = await axiosSecure.get(`/finance/expenses?page=1&limit=500&startDate=${start}&endDate=${end}`);
      setDetailedExpenses(resExpenses.data.expenses || []);
    } catch (error) {
      console.error("Error fetching monthly expense report:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = () => {
    const formattedData = reportData.categoryBreakdown.map((cat, i) => ({
      Rank: i + 1,
      Category: cat.name,
      Amount: cat.amount,
      Percentage: ((cat.amount / (reportData.pandL?.expenses?.total || 1)) * 100).toFixed(2) + "%"
    }));

    formattedData.push({
      Rank: "",
      Category: "TOTAL MONTHLY EXPENSES",
      Amount: reportData.pandL?.expenses?.total || 0,
      Percentage: "100.00%"
    });

    exportToExcel(formattedData, `Expense_Report_${monthLabel}_${selectedYear}`, "Expenses");
  };

  const handleExportCsv = () => {
    const formattedData = reportData.categoryBreakdown.map((cat, i) => ({
      Rank: i + 1,
      Category: cat.name,
      Amount: cat.amount,
      Percentage: ((cat.amount / (reportData.pandL?.expenses?.total || 1)) * 100).toFixed(2) + "%"
    }));

    formattedData.push({
      Rank: "",
      Category: "TOTAL MONTHLY EXPENSES",
      Amount: reportData.pandL?.expenses?.total || 0,
      Percentage: "100.00%"
    });

    exportToCsv(formattedData, `Expense_Report_${monthLabel}_${selectedYear}`);
  };

  const totalExpense = reportData.pandL?.expenses?.total || 0;

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <div className="print:hidden">
        <SectionHeader
          title="Monthly Expense Reports"
          subtitle="Review department expense breakdowns, transaction summaries, and comparative statistics."
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

          <div className="flex gap-2.5">
            <button onClick={handleExportExcel} className="btn btn-outline border-brand-sage/50 text-brand-sage hover:bg-brand-sage/10 btn-sm rounded-full gap-2 px-5 h-10 font-bold uppercase tracking-wider text-[10px]" disabled={isLoading}>
              <FiDownload size={14} /> Excel
            </button>
            <button onClick={handleExportCsv} className="btn btn-outline border-brand-sage/50 text-brand-sage hover:bg-brand-sage/10 btn-sm rounded-full gap-2 px-5 h-10 font-bold uppercase tracking-wider text-[10px]" disabled={isLoading}>
              <FiDownload size={14} /> CSV
            </button>
            <button onClick={() => setPrintData({ reportData, detailedExpenses })} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full gap-2 px-5 h-10 font-bold uppercase tracking-wider text-[10px]" disabled={isLoading}>
              <FiPrinter size={14} /> Print
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <MtableLoading />
      ) : (
        <div className="space-y-8 bg-white dark:bg-brand-charcoal/30 p-6 sm:p-8 rounded-3xl border border-brand-beige/50 dark:border-brand-dark-grey/50 shadow-md">
          {/* On-screen view header */}
          <div className="flex justify-between items-start border-b border-brand-beige dark:border-brand-beige/20 pb-6">
            <div>
              <h1 className="text-3xl font-black text-brand-primary">Chayatol Resort</h1>
              <p className="text-xs text-brand-sage font-bold uppercase tracking-widest mt-1">Monthly Expense Audit Report</p>
              <div className="flex items-center gap-2 mt-4 text-xs font-medium text-brand-charcoal dark:text-brand-offwhite">
                <FiCalendar className="text-brand-primary" />
                <span>Statement Period: <strong>{monthLabel} {selectedYear}</strong> ({new Date(reportData.startDate).toLocaleDateString("en-GB")} to {new Date(reportData.endDate).toLocaleDateString("en-GB")})</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-brand-sage uppercase tracking-wider">Total Operational Outflow</div>
              <div className="text-3xl font-black text-brand-primary font-mono mt-1">৳{totalExpense.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-md font-bold uppercase tracking-widest text-brand-sage flex items-center gap-2 border-b border-brand-beige dark:border-brand-beige/10 pb-2">
                <FiTag className="text-brand-primary" /> Category Breakdown
              </h3>

              {reportData.categoryBreakdown.length === 0 ? (
                <div className="text-center py-10 font-bold uppercase tracking-widest text-brand-sage text-xs">No categorised operational expenses recorded this month.</div>
              ) : (
                <div className="space-y-4">
                  {reportData.categoryBreakdown.map((cat) => {
                    const percentage = totalExpense > 0 ? ((cat.amount / totalExpense) * 100) : 0;
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wide">
                          <span>{cat.name}</span>
                          <span className="font-mono">৳{cat.amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-brand-offwhite dark:bg-brand-dark-grey/50 rounded-full h-2.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.6 }}
                            className="bg-brand-primary h-2.5 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6 bg-brand-offwhite/50 dark:bg-brand-charcoal/50 p-6 rounded-2xl border border-brand-beige/30 dark:border-brand-beige/10">
              <h3 className="text-md font-bold uppercase tracking-widest text-brand-sage flex items-center gap-2 border-b border-brand-beige dark:border-brand-beige/10 pb-2">
                <FiFileText className="text-brand-primary" /> Outflow Summary
              </h3>

              <div className="space-y-4 text-xs font-semibold uppercase tracking-wider">
                <div className="flex justify-between border-b border-brand-beige/25 dark:border-brand-beige/5 pb-2">
                  <span>General Overhead Expenses</span>
                  <span className="font-mono font-bold">৳{(reportData.pandL?.expenses?.general || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-brand-beige/25 dark:border-brand-beige/5 pb-2">
                  <span>Supplier Ingredient Purchases (COGS)</span>
                  <span className="font-mono font-bold">৳{(reportData.pandL?.expenses?.purchases || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-brand-beige/25 dark:border-brand-beige/5 pb-2">
                  <span>Booking Cancel Refunds</span>
                  <span className="font-mono font-bold">৳{(reportData.pandL?.expenses?.refunds || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-brand-primary text-sm font-black pt-2">
                  <span>Total Operational Cost</span>
                  <span className="font-mono font-black text-lg">৳{totalExpense.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <h3 className="text-md font-bold uppercase tracking-widest text-brand-sage flex items-center gap-2 border-b border-brand-beige dark:border-brand-beige/10 pb-2">
              Detailed Ledger Audits
            </h3>

            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[9px] border-b border-brand-beige dark:border-brand-beige/20">
                  <tr>
                    <th className="pl-4 py-4 w-20">Date</th>
                    <th className="py-4">Category</th>
                    <th className="py-4">Sub Category</th>
                    <th className="py-4">Vendor</th>
                    <th className="py-4">Reference No</th>
                    <th className="py-4">Method</th>
                    <th className="pr-4 text-right py-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-10 font-bold uppercase text-brand-sage">No general transactions logged for this cycle.</td>
                    </tr>
                  ) : (
                    detailedExpenses.map((exp) => (
                      <tr key={exp._id} className="hover:bg-brand-offwhite/30 dark:hover:bg-brand-offwhite/5 border-b border-brand-beige dark:border-brand-beige/10 last:border-none">
                        <td className="pl-4 py-3 font-mono font-bold whitespace-nowrap">
                          {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString("en-GB") : "-"}
                        </td>
                        <td className="py-3 font-bold uppercase text-brand-primary tracking-wide">
                          {exp.category?.name || "Uncategorized"}
                        </td>
                        <td className="py-3 font-medium uppercase">{exp.subcategory || "-"}</td>
                        <td className="py-3 font-bold uppercase">{exp.vendor || "-"}</td>
                        <td className="py-3 font-mono text-gray-500">{exp.referenceNo || "-"}</td>
                        <td className="py-3 font-semibold uppercase">{exp.paymentMethod}</td>
                        <td className="pr-4 py-3 text-right font-black font-mono">
                          ৳{exp.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title="Monthly Expense Audit Report"
            subtitle="Hotel Operational & Overhead Expenditures Breakdown"
            dateRange={`${monthLabel} ${selectedYear}`}
          >
            <div style={{ fontSize: "12px", borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "20px" }}>
              <span>Total Operational Outflow: <strong style={{ fontSize: "14px" }}>৳{printData.reportData.pandL?.expenses?.total?.toLocaleString()}</strong></span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ borderBottom: "1px solid #000", paddingBottom: "3px", fontWeight: "bold", textTransform: "uppercase", fontSize: "11px", marginBottom: "8px" }}>Category Breakdown</h4>
                <table className="print-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Category</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                      <th style={{ textAlign: "right" }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.reportData.categoryBreakdown.map(cat => {
                      const total = printData.reportData.pandL?.expenses?.total || 1;
                      const percentage = ((cat.amount / total) * 100).toFixed(1);
                      return (
                        <tr key={cat.name}>
                          <td>{cat.name}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace" }}>৳{cat.amount.toLocaleString()}</td>
                          <td style={{ textAlign: "right" }}>{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ width: "250px" }}>
                <h4 style={{ borderBottom: "1px solid #000", paddingBottom: "3px", fontWeight: "bold", textTransform: "uppercase", fontSize: "11px", marginBottom: "8px" }}>Outflow Summary</h4>
                <table className="print-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td>General Overhead</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>৳{(printData.reportData.pandL?.expenses?.general || 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td>Supplier Ingredient (COGS)</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>৳{(printData.reportData.pandL?.expenses?.purchases || 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td>Booking Cancel Refunds</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>৳{(printData.reportData.pandL?.expenses?.refunds || 0).toLocaleString()}</td>
                    </tr>
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f3f4f6" }}>
                      <td>Total Cost</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>৳{totalExpense.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <h4 style={{ borderBottom: "1px solid #000", paddingBottom: "3px", fontWeight: "bold", textTransform: "uppercase", fontSize: "11px", marginBottom: "8px" }}>Detailed Ledger Audits</h4>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Sub Category</th>
                    <th>Vendor</th>
                    <th>Reference No</th>
                    <th>Method</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.detailedExpenses.map((exp) => (
                    <tr key={exp._id}>
                      <td>{exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString("en-GB") : "-"}</td>
                      <td style={{ fontWeight: "bold" }}>{exp.category?.name || "Uncategorized"}</td>
                      <td>{exp.subcategory || "-"}</td>
                      <td>{exp.vendor || "-"}</td>
                      <td style={{ fontFamily: "monospace" }}>{exp.referenceNo || "-"}</td>
                      <td>{exp.paymentMethod}</td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>৳{exp.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PrintReportTemplate>
        )}
      </div>
    </div>
  );
};

export default MonthlyExpenseReport;
