"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCalendar, FiSearch, FiRefreshCw, FiUser, FiShoppingBag } from "react-icons/fi";
import {
  MdReceipt,
  MdFastfood,
  MdTableRestaurant,
  MdPerson,
  MdPayments,
  MdPrint,
  MdAssessment
} from "react-icons/md";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";
import ExportButtons from "@/components/Comon/ExportButtons";
import usePagePermission from "@/hooks/usePagePermission";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import useStandardPrint from "@/hooks/useStandardPrint";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

function DailyClosingContent() {
  const axiosSecure = useAxiosSecure();
  const { canEdit } = usePagePermission();

  const getFormattedDate = (date) => {
    return date.toISOString().slice(0, 10);
  };

  const [fromDate, setFromDate] = useState(getFormattedDate(new Date()));
  const [toDate, setToDate] = useState(getFormattedDate(new Date()));
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // New Filter Options
  const [selectedStaff, setSelectedStaff] = useState("All");
  const [selectedOrderType, setSelectedOrderType] = useState("All");

  // Printing Setup
  const {
    printData,
    setPrintData,
    printRef,
  } = useStandardPrint({
    documentTitle: "Daily_Closing_Report"
  });

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch all invoices for the date range
      const response = await axiosSecure.get("/pos/invoice", {
        params: {
          startDate: fromDate,
          endDate: toDate,
          limit: 10000 // large limit to ensure we get all invoices
        }
      });
      if (response.data?.success) {
        setInvoices(response.data.invoices || response.data.data || []);
      }
    } catch (err) {
      console.error("Fetch daily closing data error:", err);
      setError("Failed to fetch transaction data. Please try again.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [axiosSecure, fromDate, toDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleSearch();
  }, [handleSearch]);

  // Unique staff list for Option 1
  const staffList = React.useMemo(() => {
    const set = new Set();
    invoices.forEach(inv => {
      const name = inv.loginUserName || inv.createdBy?.name;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [invoices]);

  // Unique order types list for Option 2
  const orderTypeList = React.useMemo(() => {
    const set = new Set();
    invoices.forEach(inv => {
      const type = inv.orderType;
      if (type) set.add(type);
    });
    return Array.from(set);
  }, [invoices]);

  // Filtered Invoices according to selected Staff and Order Type options
  const activeInvoices = React.useMemo(() => {
    return invoices.filter(inv => {
      const matchesStaff = selectedStaff === "All" || (inv.loginUserName || inv.createdBy?.name) === selectedStaff;
      const matchesType = selectedOrderType === "All" || inv.orderType === selectedOrderType;
      return matchesStaff && matchesType;
    });
  }, [invoices, selectedStaff, selectedOrderType]);

  // Handle Quick Ranges
  const handleQuickRange = (range) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'today':
        start = today;
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last6months':
        start.setMonth(today.getMonth() - 5);
        start.setDate(1);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    setFromDate(getFormattedDate(start));
    setToDate(getFormattedDate(end));
  };

  // Calculate aggregated metrics from filtered invoices
  const metrics = React.useMemo(() => {
    let orderCount = activeInvoices.length;
    let itemsSold = 0;

    let subtotal = 0;
    let vat = 0;
    let sd = 0;
    let sc = 0;
    let discount = 0;
    let totalAmount = 0;

    const paymentBreakdown = {};
    const employeeBreakdown = {};
    const tableBreakdown = {};

    activeInvoices.forEach(inv => {
      // Sum calculations
      subtotal += inv.subtotal || inv.subTotal || 0;
      vat += inv.vat || 0;
      sd += inv.sd || 0;
      sc += inv.serviceCharge || 0;
      discount += inv.discount || 0;
      totalAmount += inv.grandTotal || inv.totalAmount || 0;

      // Quantity sold
      if (Array.isArray(inv.products)) {
        inv.products.forEach(p => {
          itemsSold += p.qty || p.quantity || 0;
        });
      }

      // Payment Methods Breakdown
      const method = inv.paymentMethod || "Due";
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (inv.grandTotal || inv.totalAmount || 0);

      // Employee Collection Breakdown
      const employee = inv.loginUserName || inv.createdBy?.name || "Server";
      employeeBreakdown[employee] = (employeeBreakdown[employee] || 0) + (inv.grandTotal || inv.totalAmount || 0);

      // Table breakdown
      const table = inv.tableName || inv.roomNo || inv.tableNo || "Takeaway/Delivery";
      tableBreakdown[table] = (tableBreakdown[table] || 0) + (inv.grandTotal || inv.totalAmount || 0);
    });

    // Determine best selling table
    let bestTable = "N/A";
    let maxTableSales = 0;
    Object.entries(tableBreakdown).forEach(([table, sales]) => {
      if (sales > maxTableSales && table !== "Takeaway/Delivery") {
        maxTableSales = sales;
        bestTable = table;
      }
    });

    return {
      orderCount,
      itemsSold,
      subtotal,
      vat,
      sd,
      sc,
      discount,
      totalAmount,
      paymentBreakdown,
      employeeBreakdown,
      tableBreakdown,
      bestTable,
      maxTableSales
    };
  }, [activeInvoices]);

  const handleExportExcel = () => {
    // Prepare dynamic summary array
    const rows = [
      { "Metric": "Report Start Date", "Value": fromDate },
      { "Metric": "Report End Date", "Value": toDate },
      { "Metric": "Selected Staff", "Value": selectedStaff },
      { "Metric": "Selected Order Type", "Value": selectedOrderType },
      { "Metric": "Total Orders Count", "Value": metrics.orderCount },
      { "Metric": "Total Items Sold", "Value": metrics.itemsSold },
      { "Metric": "Total Subtotal Amount", "Value": `৳ ${metrics.subtotal.toFixed(0)}` },
      { "Metric": "Total VAT", "Value": `৳ ${metrics.vat.toFixed(0)}` },
      { "Metric": "Total SD (Supplementary Duty)", "Value": `৳ ${metrics.sd.toFixed(0)}` },
      { "Metric": "Total SC (Service Charge)", "Value": `৳ ${metrics.sc.toFixed(0)}` },
      { "Metric": "Total Discount Offered", "Value": `-৳ ${metrics.discount.toFixed(0)}` },
      { "Metric": "Grand Total Sales", "Value": `৳ ${metrics.totalAmount.toFixed(0)}` },
      { "Metric": "Best Sales Table", "Value": `${metrics.bestTable} (৳ ${metrics.maxTableSales.toFixed(0)})` }
    ];

    // Append payment breakdown
    Object.entries(metrics.paymentBreakdown).forEach(([method, sales]) => {
      rows.push({ "Metric": `Payment Method: ${method}`, "Value": `৳ ${sales.toFixed(0)}` });
    });

    // Append employee breakdown
    Object.entries(metrics.employeeBreakdown).forEach(([emp, sales]) => {
      rows.push({ "Metric": `Employee Collection: ${emp}`, "Value": `৳ ${sales.toFixed(0)}` });
    });

    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to print or export closing statements.", "warning");
      return;
    }
    exportToExcel(rows, "Daily_Closing_Summary_Report");
  };

  const handleExportCsv = () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to print or export closing statements.", "warning");
      return;
    }
    const rows = [
      { "Metric": "Report Period", "Value": `${fromDate} to ${toDate}` },
      { "Metric": "Staff Filter", "Value": selectedStaff },
      { "Metric": "Order Type Filter", "Value": selectedOrderType },
      { "Metric": "Total Orders Count", "Value": metrics.orderCount },
      { "Metric": "Total Items Sold", "Value": metrics.itemsSold },
      { "Metric": "Subtotal", "Value": metrics.subtotal },
      { "Metric": "VAT", "Value": metrics.vat },
      { "Metric": "SD", "Value": metrics.sd },
      { "Metric": "SC", "Value": metrics.sc },
      { "Metric": "Discount", "Value": metrics.discount },
      { "Metric": "Grand Total Amount", "Value": metrics.totalAmount }
    ];
    exportToCsv(rows, "Daily_Closing_Summary_Report");
  };

  const handlePrintClick = () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to print or export closing statements.", "warning");
      return;
    }
    setPrintData(metrics);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-zinc-100 tracking-tight">Daily Closing Summary</h1>
            <p className="text-sm text-gray-550 mt-1">Aggregated cash calculations and department shift closing logs</p>
          </div>
          {invoices.length > 0 && canEdit && (
            <ExportButtons
              onExportExcel={handleExportExcel}
              onExportCsv={handleExportCsv}
              onPrint={handlePrintClick}
              isLoading={loading}
            />
          )}
        </header>

        {/* Filters Board with 2 New Options */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 shadow-xl mb-6 p-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500">From Date</label>
              <input
                type="date"
                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500">To Date</label>
              <input
                type="date"
                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* Option 1: Staff / Server Filter */}
            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500 flex items-center gap-1">
                <FiUser /> Staff / Cashier
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs font-semibold"
              >
                <option value="All">All Staff / Cashiers</option>
                {staffList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Option 2: Order Type Filter */}
            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500 flex items-center gap-1">
                <FiShoppingBag /> Order Type
              </label>
              <select
                value={selectedOrderType}
                onChange={(e) => setSelectedOrderType(e.target.value)}
                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs font-semibold"
              >
                <option value="All">All Order Types</option>
                {orderTypeList.length > 0 ? (
                  orderTypeList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))
                ) : (
                  <>
                    <option value="Dine In">Dine In</option>
                    <option value="Takeaway">Takeaway</option>
                    <option value="Room Service">Room Service</option>
                    <option value="Delivery">Delivery</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500">Quick Range</label>
              <select
                onChange={(e) => handleQuickRange(e.target.value)}
                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
              >
                <option value="">Select Range</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="thisMonth">This Month</option>
                <option value="last6months">Last 6 Months</option>
                <option value="thisYear">This Year</option>
              </select>
            </div>

            <button
              onClick={handleSearch}
              className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow border-none w-full"
              disabled={loading}
            >
              <FiSearch />
              <span>Run Closing Report</span>
            </button>
          </div>
        </motion.div>

        {loading ? <MtableLoading /> : error ? (
          <div className="text-center py-12 text-red-500 font-semibold">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Aggregated Sales Performance */}
            <div className="lg:col-span-2 space-y-6">

              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-250 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-500">
                    <MdReceipt size={18} />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Orders</span>
                  </div>
                  <h3 className="text-2xl font-black mt-1 text-brand-primary dark:text-brand-sage">{metrics.orderCount}</h3>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-250 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-500">
                    <MdFastfood size={18} />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Items Sold</span>
                  </div>
                  <h3 className="text-2xl font-black mt-1 text-brand-primary dark:text-brand-sage">{metrics.itemsSold}</h3>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-250 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-500">
                    <MdTableRestaurant size={18} />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Best Table</span>
                  </div>
                  <h3 className="text-lg font-black mt-1.5 truncate text-orange-600 dark:text-orange-400" title={metrics.bestTable}>
                    {metrics.bestTable}
                  </h3>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-250 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-500">
                    <MdPayments size={18} />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Revenue</span>
                  </div>
                  <h3 className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-450">৳ {metrics.totalAmount.toFixed(0)}</h3>
                </div>
              </div>

              {/* Detailed Bill Accounting Statement */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl p-6"
              >
                <h3 className="text-lg font-extrabold text-brand-primary dark:text-brand-sage mb-4 flex items-center gap-2">
                  <MdAssessment size={20} />
                  <span>Statement Breakdown</span>
                </h3>

                <div className="divide-y divide-gray-200 dark:divide-zinc-850 text-sm font-semibold">
                  <div className="py-3.5 flex justify-between">
                    <span className="text-gray-505">Subtotal Sales</span>
                    <span className="font-bold">৳ {metrics.subtotal.toFixed(0)}</span>
                  </div>
                  <div className="py-3.5 flex justify-between">
                    <span className="text-gray-505">Supplementary Duty (SD)</span>
                    <span className="font-bold">৳ {metrics.sd.toFixed(0)}</span>
                  </div>
                  <div className="py-3.5 flex justify-between">
                    <span className="text-gray-505">Vat (Tax/VAT Collections)</span>
                    <span className="font-bold">৳ {metrics.vat.toFixed(0)}</span>
                  </div>
                  <div className="py-3.5 flex justify-between">
                    <span className="text-gray-505">Service Charge (SC)</span>
                    <span className="font-bold text-brand-primary dark:text-brand-sage">৳ {metrics.sc.toFixed(0)}</span>
                  </div>
                  <div className="py-3.5 flex justify-between text-rose-600">
                    <span>Discount Given</span>
                    <span>-৳ {metrics.discount.toFixed(0)}</span>
                  </div>
                  <div className="py-4 flex justify-between text-base font-black border-t-2 border-gray-200 dark:border-zinc-700">
                    <span className="text-gray-800 dark:text-zinc-100">Total Net Collections</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-lg">৳ {metrics.totalAmount.toFixed(0)}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Payment Collection Breakdown & Employees */}
            <div className="space-y-6">

              {/* Dynamic Payment Method Inflows */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl p-6"
              >
                <h3 className="text-base font-extrabold text-brand-primary dark:text-brand-sage mb-4 flex items-center gap-2">
                  <MdPayments size={18} />
                  <span>Dynamic Payment Collection</span>
                </h3>

                <div className="space-y-3">
                  {Object.entries(metrics.paymentBreakdown).length > 0 ? (
                    Object.entries(metrics.paymentBreakdown).map(([method, amount]) => (
                      <div key={method} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-zinc-850 rounded-xl border border-gray-200/50 dark:border-zinc-800">
                        <span className="text-xs uppercase font-bold text-gray-500 dark:text-zinc-400">{method}</span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-450">৳ {amount.toFixed(0)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-xs text-gray-400">No payment records found.</p>
                  )}
                </div>
              </motion.div>

              {/* Employee Collections Performance */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl p-6"
              >
                <h3 className="text-base font-extrabold text-brand-primary dark:text-brand-sage mb-4 flex items-center gap-2">
                  <MdPerson size={18} />
                  <span>Employee Total Collections</span>
                </h3>

                <div className="space-y-3">
                  {Object.entries(metrics.employeeBreakdown).length > 0 ? (
                    Object.entries(metrics.employeeBreakdown).map(([employee, amount]) => (
                      <div key={employee} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-zinc-850 rounded-xl border border-gray-200/50 dark:border-zinc-800">
                        <span className="text-xs font-bold text-gray-750 dark:text-zinc-300">{employee}</span>
                        <span className="text-sm font-extrabold text-brand-primary dark:text-brand-sage">৳ {amount.toFixed(0)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-xs text-gray-400">No employee logging transactions.</p>
                  )}
                </div>
              </motion.div>

            </div>

          </div>
        )}
      </div>

      {/* Hidden Print Container */}
      <div className="hidden">
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title="Daily Closing Statement"
            subtitle="Department register reconciliations & cash flow checkout audit"
            dateRange={`From: ${new Date(fromDate).toLocaleDateString("en-GB")} To: ${new Date(toDate).toLocaleDateString("en-GB")}`}
          >
            <div style={{ fontFamily: "sans-serif", color: "#000" }}>

              {/* Summary Metrics */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", borderBottom: "1px solid #ccc", paddingBottom: "16px" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Total Orders</p>
                  <h4 style={{ margin: "4px 0 0 0", fontSize: "20px", fontWeight: "bold" }}>{printData.orderCount}</h4>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Total Items Sold</p>
                  <h4 style={{ margin: "4px 0 0 0", fontSize: "20px", fontWeight: "bold" }}>{printData.itemsSold}</h4>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Best Selling Table</p>
                  <h4 style={{ margin: "4px 0 0 0", fontSize: "20px", fontWeight: "bold" }}>{printData.bestTable}</h4>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Total Sales Volume</p>
                  <h4 style={{ margin: "4px 0 0 0", fontSize: "20px", fontWeight: "bold", color: "#16a34a" }}>৳ {printData.totalAmount.toFixed(0)}</h4>
                </div>
              </div>

              {/* Revenue Statements */}
              <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "2px solid #ccc", paddingBottom: "6px", margin: "0 0 12px 0" }}>Statement Breakdown</h4>
                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "6px 0", color: "#444" }}>Subtotal Sales</td>
                        <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "bold" }}>৳ {printData.subtotal.toFixed(0)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 0", color: "#444" }}>Supplementary Duty (SD)</td>
                        <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "bold" }}>৳ {printData.sd.toFixed(0)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 0", color: "#444" }}>Vat Collections</td>
                        <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "bold" }}>৳ {printData.vat.toFixed(0)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 0", color: "#444" }}>Service Charge (SC)</td>
                        <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "bold" }}>৳ {printData.sc.toFixed(0)}</td>
                      </tr>
                      <tr style={{ color: "#b91c1c" }}>
                        <td style={{ padding: "6px 0" }}>Discount Offered</td>
                        <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "bold" }}>-৳ {printData.discount.toFixed(0)}</td>
                      </tr>
                      <tr style={{ borderTop: "2px solid #000", fontWeight: "bold", fontSize: "13px" }}>
                        <td style={{ padding: "10px 0" }}>Total Net Collections</td>
                        <td style={{ padding: "10px 0", textAlign: "right", color: "#16a34a" }}>৳ {printData.totalAmount.toFixed(0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "2px solid #ccc", paddingBottom: "6px", margin: "0 0 12px 0" }}>Payment Methods Inflow</h4>
                  <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                    <tbody>
                      {Object.entries(printData.paymentBreakdown).map(([method, amount]) => (
                        <tr key={method} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "6px 0", color: "#444", textTransform: "uppercase" }}>{method}</td>
                          <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "bold", color: "#16a34a" }}>৳ {amount.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Employee collections */}
              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "2px solid #ccc", paddingBottom: "6px", margin: "0 0 12px 0" }}>Employee Shift Collections</h4>
                <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #ccc" }}>
                      <th style={{ padding: "8px", textAlign: "left" }}>Employee/Cashier Name</th>
                      <th style={{ padding: "8px", textAlign: "right" }}>Total Cash Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(printData.employeeBreakdown).map(([employee, amount]) => (
                      <tr key={employee} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "8px" }}>{employee}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>৳ {amount.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </PrintReportTemplate>
        )}
      </div>
    </div>
  );
}

export default function DailyClosingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
      <DailyClosingContent />
    </Suspense>
  );
}
