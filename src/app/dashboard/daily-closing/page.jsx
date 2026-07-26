"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCalendar, FiSearch, FiRefreshCw, FiUser, FiShoppingBag, FiLayers, FiDollarSign, FiFilter, FiCheckCircle } from "react-icons/fi";
import {
  MdReceipt,
  MdFastfood,
  MdTableRestaurant,
  MdPerson,
  MdPayments,
  MdPrint,
  MdAssessment,
  MdHotel,
  MdRestaurant,
  MdEventAvailable,
  MdAccountBalanceWallet
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
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [registeredPaymentTypes, setRegisteredPaymentTypes] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch dynamic payment types from database
  useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        const response = await axiosSecure.get("/paymenttype");
        if (Array.isArray(response.data)) {
          setRegisteredPaymentTypes(response.data);
        }
      } catch (err) {
        console.error("Failed to load dynamic payment types:", err);
      }
    };
    fetchPaymentTypes();
  }, [axiosSecure]);

  // Printing Setup
  const {
    printData,
    setPrintData,
    printRef,
  } = useStandardPrint({
    documentTitle: `Daily_Closing_${selectedSector}_${fromDate}_to_${toDate}`
  });

  const handleFetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosSecure.get("/reports/daily-closing", {
        params: {
          startDate: fromDate,
          endDate: toDate,
          sector: selectedSector,
          method: selectedMethod
        }
      });
      if (response.data?.success) {
        setData(response.data);
        if (response.data.paymentTypes?.length > 0) {
          setRegisteredPaymentTypes(response.data.paymentTypes);
        }
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Fetch daily closing report error:", err);
      setError("Failed to load daily closing report. Please try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [axiosSecure, fromDate, toDate, selectedSector, selectedMethod]);

  useEffect(() => {
    handleFetchReport();
  }, [handleFetchReport]);

  // Handle Quick Ranges
  const handleQuickRange = (range) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case "today":
        start = today;
        break;
      case "yesterday":
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "last6months":
        start.setMonth(today.getMonth() - 5);
        start.setDate(1);
        break;
      case "thisYear":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    setFromDate(getFormattedDate(start));
    setToDate(getFormattedDate(end));
  };

  const summary = data?.summary || {
    totalCollected: 0,
    resortTotal: 0,
    restaurantTotal: 0,
    venueTotal: 0,
    orderCount: 0,
    methodBreakdown: [],
    sectorBreakdown: [],
    staffBreakdown: []
  };

  const restaurantMetrics = data?.restaurantMetrics || {
    orderCount: 0,
    itemsSold: 0,
    subtotal: 0,
    vat: 0,
    sd: 0,
    sc: 0,
    discount: 0,
    totalAmount: 0,
    bestTable: "N/A",
    maxTableSales: 0,
    tableBreakdown: {},
    orderTypeBreakdown: {}
  };

  const rawTransactions = data?.transactions || [];

  // Local search filter
  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return rawTransactions;
    const term = searchTerm.toLowerCase();
    return rawTransactions.filter((tx) =>
      tx.customerName?.toLowerCase().includes(term) ||
      tx.reference?.toLowerCase().includes(term) ||
      tx.sector?.toLowerCase().includes(term) ||
      tx.paymentMethod?.toLowerCase().includes(term) ||
      tx.staff?.toLowerCase().includes(term)
    );
  }, [rawTransactions, searchTerm]);

  const handleExportExcel = () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to print or export statements.", "warning");
      return;
    }

    const rows = filteredTransactions.map((tx, index) => ({
      "Sl": index + 1,
      "Date & Time": new Date(tx.date).toLocaleString("en-GB"),
      "Sector": tx.sector,
      "Customer / Guest": tx.customerName,
      "Reference / Ref #": tx.reference,
      "Payment Method": tx.paymentMethod,
      "Staff / Cashier": tx.staff,
      "Amount (৳)": tx.amount,
      "Description": tx.description || "N/A"
    }));

    if (selectedSector === "Restaurant POS" || selectedSector === "all") {
      rows.push(
        { "Sl": "", "Date & Time": "REST. SUBTOTAL", "Sector": `৳${restaurantMetrics.subtotal.toFixed(2)}`, "Customer / Guest": "VAT", "Reference / Ref #": `৳${restaurantMetrics.vat.toFixed(2)}`, "Payment Method": "SD", "Staff / Cashier": `৳${restaurantMetrics.sd.toFixed(2)}`, "Amount (৳)": "", "Description": "" },
        { "Sl": "", "Date & Time": "REST. SC", "Sector": `৳${restaurantMetrics.sc.toFixed(2)}`, "Customer / Guest": "DISCOUNT", "Reference / Ref #": `-৳${restaurantMetrics.discount.toFixed(2)}`, "Payment Method": "ITEMS SOLD", "Staff / Cashier": restaurantMetrics.itemsSold, "Amount (৳)": "", "Description": "" }
      );
    }

    rows.push({ "Sl": "", "Date & Time": "TOTALS", "Sector": `Resort: ৳${summary.resortTotal.toFixed(0)}`, "Customer / Guest": `Restaurant: ৳${summary.restaurantTotal.toFixed(0)}`, "Reference / Ref #": `Venue: ৳${summary.venueTotal.toFixed(0)}`, "Payment Method": "GRAND TOTAL", "Staff / Cashier": "", "Amount (৳)": summary.totalCollected, "Description": "" });

    exportToExcel(rows, `Daily_Closing_${selectedSector}_${fromDate}_to_${toDate}`);
  };

  const handleExportCsv = () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to print or export statements.", "warning");
      return;
    }

    const rows = filteredTransactions.map((tx, index) => ({
      "Sl": index + 1,
      "Date & Time": new Date(tx.date).toLocaleString("en-GB"),
      "Sector": tx.sector,
      "Customer / Guest": tx.customerName,
      "Reference": tx.reference,
      "Payment Method": tx.paymentMethod,
      "Staff": tx.staff,
      "Amount": tx.amount
    }));

    exportToCsv(rows, `Daily_Closing_${selectedSector}_${fromDate}_to_${toDate}`);
  };

  const handlePrintClick = () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to print statements.", "warning");
      return;
    }
    setPrintData(data);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-brand-charcoal dark:text-brand-offwhite tracking-tight flex items-center gap-3">
              <MdAccountBalanceWallet className="text-brand-primary dark:text-brand-sage" />
              <span>Daily Closing Summary</span>
            </h1>
            <p className="text-sm text-brand-sage font-medium mt-1">
              Aggregated daily cash shift closing, restaurant POS accounting, and revenue collection audit.
            </p>
          </div>
          {rawTransactions.length > 0 && canEdit && (
            <ExportButtons
              onExportExcel={handleExportExcel}
              onExportCsv={handleExportCsv}
              onPrint={handlePrintClick}
              isLoading={loading}
            />
          )}
        </header>

        {/* Sector Tabs Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-250 dark:border-zinc-800 pb-3">
          <button
            onClick={() => setSelectedSector("all")}
            className={`btn btn-sm rounded-full font-extrabold text-xs px-5 border-none cursor-pointer flex items-center gap-2 ${
              selectedSector === "all"
                ? "bg-brand-primary text-white shadow-md"
                : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            <FiLayers /> All Sectors Summary
          </button>

          <button
            onClick={() => setSelectedSector("Restaurant POS")}
            className={`btn btn-sm rounded-full font-extrabold text-xs px-5 border-none cursor-pointer flex items-center gap-2 ${
              selectedSector === "Restaurant POS"
                ? "bg-orange-600 text-white shadow-md"
                : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            <MdRestaurant /> Restaurant POS Closing
          </button>

          <button
            onClick={() => setSelectedSector("Resort Stay")}
            className={`btn btn-sm rounded-full font-extrabold text-xs px-5 border-none cursor-pointer flex items-center gap-2 ${
              selectedSector === "Resort Stay"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            <MdHotel /> Resort Rooms Closing
          </button>

          <button
            onClick={() => setSelectedSector("Venue Booking")}
            className={`btn btn-sm rounded-full font-extrabold text-xs px-5 border-none cursor-pointer flex items-center gap-2 ${
              selectedSector === "Venue Booking"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            <MdEventAvailable /> Venue Hall Closing
          </button>
        </div>

        {/* Filters Board */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 shadow-xl mb-6 p-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500 flex items-center gap-1">
                <FiCalendar /> From Date
              </label>
              <input
                type="date"
                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs font-semibold"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500 flex items-center gap-1">
                <FiCalendar /> To Date
              </label>
              <input
                type="date"
                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs font-semibold"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* Sector Selector */}
            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500 flex items-center gap-1">
                <FiLayers /> Sector / Area
              </label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs font-semibold"
              >
                <option value="all">All Sectors</option>
                <option value="Restaurant POS">Restaurant POS</option>
                <option value="Resort Stay">Resort Stay & Rooms</option>
                <option value="Venue Booking">Venue Bookings</option>
              </select>
            </div>

            {/* Dynamic Payment Method Filter */}
            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500 flex items-center gap-1">
                <MdPayments /> Payment Method (Dynamic)
              </label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs font-semibold"
              >
                <option value="all">All Payment Methods</option>
                {registeredPaymentTypes.map((pt) => (
                  <option key={pt._id || pt.name} value={pt.name}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Date Range */}
            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500">Quick Range</label>
              <select
                onChange={(e) => handleQuickRange(e.target.value)}
                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs font-semibold"
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
              onClick={handleFetchReport}
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
          <div className="space-y-6">

            {/* If RESTAURANT POS mode is selected: render dedicated Restaurant POS Accounting Statement */}
            {selectedSector === "Restaurant POS" && (
              <div className="space-y-6">
                {/* Restaurant Summary Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-250 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-500">
                      <MdReceipt size={18} />
                      <span className="text-[10px] uppercase font-bold tracking-wider">POS Orders</span>
                    </div>
                    <h3 className="text-2xl font-black mt-1 text-orange-600 dark:text-orange-400">{restaurantMetrics.orderCount}</h3>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-250 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-500">
                      <MdFastfood size={18} />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Items Sold</span>
                    </div>
                    <h3 className="text-2xl font-black mt-1 text-orange-600 dark:text-orange-400">{restaurantMetrics.itemsSold}</h3>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-250 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-500">
                      <MdTableRestaurant size={18} />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Best Table</span>
                    </div>
                    <h3 className="text-lg font-black mt-1.5 truncate text-orange-600 dark:text-orange-400" title={restaurantMetrics.bestTable}>
                      {restaurantMetrics.bestTable}
                    </h3>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-250 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-500">
                      <MdPayments size={18} />
                      <span className="text-[10px] uppercase font-bold tracking-wider">POS Net Revenue</span>
                    </div>
                    <h3 className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-450">
                      ৳ {restaurantMetrics.totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                </div>

                {/* Detailed Restaurant Bill Accounting Statement */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl p-6">
                  <h3 className="text-lg font-extrabold text-orange-600 dark:text-orange-400 mb-4 flex items-center gap-2">
                    <MdAssessment size={20} />
                    <span>Restaurant Statement Breakdown</span>
                  </h3>

                  <div className="divide-y divide-gray-200 dark:divide-zinc-850 text-sm font-semibold">
                    <div className="py-3.5 flex justify-between">
                      <span className="text-gray-500">Subtotal Sales</span>
                      <span className="font-bold">৳ {restaurantMetrics.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="py-3.5 flex justify-between">
                      <span className="text-gray-500">Supplementary Duty (SD)</span>
                      <span className="font-bold">৳ {restaurantMetrics.sd.toFixed(2)}</span>
                    </div>
                    <div className="py-3.5 flex justify-between">
                      <span className="text-gray-500">VAT Collections</span>
                      <span className="font-bold">৳ {restaurantMetrics.vat.toFixed(2)}</span>
                    </div>
                    <div className="py-3.5 flex justify-between">
                      <span className="text-gray-500">Service Charge (SC)</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">৳ {restaurantMetrics.sc.toFixed(2)}</span>
                    </div>
                    <div className="py-3.5 flex justify-between text-rose-600">
                      <span>Discount Given</span>
                      <span>-৳ {restaurantMetrics.discount.toFixed(2)}</span>
                    </div>
                    <div className="py-4 flex justify-between text-base font-black border-t-2 border-gray-200 dark:border-zinc-700">
                      <span className="text-gray-800 dark:text-zinc-100">Total Net POS Collections</span>
                      <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                        ৳ {restaurantMetrics.totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sector KPI Summary Cards (When All Sectors or other sector is chosen) */}
            {selectedSector !== "Restaurant POS" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Total Collections */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-brand-primary/20 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-[11px] uppercase font-bold tracking-widest text-brand-primary dark:text-brand-sage">Grand Total Net Collection</span>
                    <MdAccountBalanceWallet className="text-2xl text-brand-primary dark:text-brand-sage" />
                  </div>
                  <h3 className="text-3xl font-black mt-2 text-brand-primary dark:text-brand-sage">
                    ৳ {summary.totalCollected.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 font-semibold">{summary.orderCount} total transactions</p>
                </div>

                {/* Resort Rooms Collection */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-blue-500/20 shadow-sm">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                    <span className="text-[11px] uppercase font-bold tracking-widest">Resort Stays & Rooms</span>
                    <MdHotel className="text-2xl" />
                  </div>
                  <h3 className="text-2xl font-extrabold mt-2 text-blue-700 dark:text-blue-300">
                    ৳ {summary.resortTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 font-semibold">Room folios & advance bookings</p>
                </div>

                {/* Restaurant POS Collection */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-orange-500/20 shadow-sm">
                  <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                    <span className="text-[11px] uppercase font-bold tracking-widest">Restaurant POS</span>
                    <MdRestaurant className="text-2xl" />
                  </div>
                  <h3 className="text-2xl font-extrabold mt-2 text-orange-700 dark:text-orange-300">
                    ৳ {summary.restaurantTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 font-semibold">Food orders & POS invoices</p>
                </div>

                {/* Venue Bookings Collection */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-purple-500/20 shadow-sm">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                    <span className="text-[11px] uppercase font-bold tracking-widest">Venue Bookings</span>
                    <MdEventAvailable className="text-2xl" />
                  </div>
                  <h3 className="text-2xl font-extrabold mt-2 text-purple-700 dark:text-purple-300">
                    ৳ {summary.venueTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 font-semibold">Hall & venue event payments</p>
                </div>

              </div>
            )}

            {/* Dynamic Payment Method Inflow & Staff Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Fully Dynamic Payment Method Breakdown Cards */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
                <h3 className="text-base font-extrabold text-brand-primary dark:text-brand-sage mb-4 flex items-center gap-2">
                  <MdPayments size={20} />
                  <span>Dynamic Payment Method Collections</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {summary.methodBreakdown.length > 0 ? (
                    summary.methodBreakdown.map((item) => (
                      <div key={item.method} className="p-4 bg-slate-50 dark:bg-zinc-850 rounded-xl border border-gray-200/60 dark:border-zinc-800 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {item.image ? (
                              <img src={item.image} alt={item.method} className="w-5 h-5 object-contain" />
                            ) : (
                              <MdPayments className="text-brand-primary dark:text-brand-sage" />
                            )}
                            <span className="text-xs uppercase font-extrabold text-gray-700 dark:text-zinc-200 tracking-wider">
                              {item.method}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary/10 text-brand-primary dark:bg-brand-sage/20 dark:text-brand-sage">
                            {item.count} txns
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-450">
                          ৳ {item.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </h4>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-xs text-gray-400 col-span-full">No payment method records found for this period.</p>
                  )}
                </div>
              </div>

              {/* Staff / Cashier Shift Collections */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
                <h3 className="text-base font-extrabold text-brand-primary dark:text-brand-sage mb-4 flex items-center gap-2">
                  <MdPerson size={20} />
                  <span>Staff / Cashier Shift Collections</span>
                </h3>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {summary.staffBreakdown.length > 0 ? (
                    summary.staffBreakdown.map((st) => (
                      <div key={st.staff} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-zinc-850 rounded-xl border border-gray-200/50 dark:border-zinc-800">
                        <span className="text-xs font-bold text-gray-750 dark:text-zinc-300">{st.staff}</span>
                        <span className="text-sm font-extrabold text-brand-primary dark:text-brand-sage">
                          ৳ {st.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-xs text-gray-400">No staff logging details.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Detailed Transactions Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-250 dark:border-zinc-800 overflow-hidden">
              <div className="p-5 border-b border-gray-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-base font-extrabold text-gray-800 dark:text-zinc-100 flex items-center gap-2">
                  <MdReceipt size={20} className="text-brand-primary dark:text-brand-sage" />
                  <span>
                    {selectedSector === "all" ? "All Sector Daily Transactions" : `${selectedSector} Transactions`} ({filteredTransactions.length} items)
                  </span>
                </h3>

                <div className="w-full sm:w-64">
                  <label className="input input-bordered input-sm flex items-center gap-2 dark:bg-zinc-850 dark:border-zinc-700">
                    <FiSearch className="text-gray-400" />
                    <input
                      type="text"
                      className="grow placeholder-gray-400 text-xs"
                      placeholder="Search Customer / Ref / Method..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px]">
                    <tr>
                      <th className="pl-6 py-4">Sl</th>
                      <th className="py-4">Date & Time</th>
                      <th className="py-4">Sector</th>
                      <th className="py-4">Customer / Guest</th>
                      <th className="py-4">Reference #</th>
                      <th className="py-4">Payment Method</th>
                      <th className="py-4">Staff / Cashier</th>
                      <th className="pr-6 text-right py-4">Amount (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-16 text-gray-400 font-bold uppercase text-xs">
                          No transaction records found.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx, idx) => {
                        const sectorBadge = {
                          "Resort Stay": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                          "Restaurant POS": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
                          "Venue Booking": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
                        }[tx.sector] || "bg-gray-100 text-gray-800";

                        return (
                          <tr key={tx._id + idx} className="hover:bg-slate-50 dark:hover:bg-zinc-850/50 border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold">
                            <td className="pl-6 py-4">{idx + 1}</td>
                            <td className="py-4 whitespace-nowrap">{new Date(tx.date).toLocaleString("en-GB")}</td>
                            <td className="py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${sectorBadge}`}>
                                {tx.sector}
                              </span>
                            </td>
                            <td className="py-4 font-bold text-gray-800 dark:text-zinc-100">{tx.customerName}</td>
                            <td className="py-4 text-brand-primary dark:text-brand-sage font-mono font-bold">{tx.reference}</td>
                            <td className="py-4">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                {tx.paymentMethod}
                              </span>
                            </td>
                            <td className="py-4 text-gray-500">{tx.staff}</td>
                            <td className="pr-6 text-right font-black text-emerald-600 dark:text-emerald-400 py-4">
                              ৳ {tx.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Printable Report Container */}
      <div className="hidden">
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title={`${selectedSector === "all" ? "All-Sectors" : selectedSector} Daily Closing Statement`}
            subtitle="Combined Revenue & Shift Settlement Statement across Resort Rooms, Restaurant POS, and Venue Bookings"
            dateRange={`From: ${new Date(fromDate).toLocaleDateString("en-GB")} To: ${new Date(toDate).toLocaleDateString("en-GB")}`}
          >
            <div style={{ fontFamily: "sans-serif", color: "#000" }}>

              {/* Grand Summary Metrics Header */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "2px solid #000", paddingBottom: "12px" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#555" }}>Resort Rooms Collections</p>
                  <h4 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: "bold" }}>৳ {summary.resortTotal.toFixed(2)}</h4>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#555" }}>Restaurant POS Collections</p>
                  <h4 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: "bold" }}>৳ {summary.restaurantTotal.toFixed(2)}</h4>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#555" }}>Venue Bookings Collections</p>
                  <h4 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: "bold" }}>৳ {summary.venueTotal.toFixed(2)}</h4>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#555" }}>Total Net Collections</p>
                  <h4 style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: "bold", color: "#16a34a" }}>৳ {summary.totalCollected.toFixed(2)}</h4>
                </div>
              </div>

              {/* If Restaurant POS is selected: Print Restaurant Statement Breakdown */}
              {(selectedSector === "Restaurant POS" || selectedSector === "all") && (
                <div style={{ marginBottom: "20px", borderBottom: "1px dashed #ccc", paddingBottom: "12px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: "bold", margin: "0 0 8px 0" }}>Restaurant POS Accounting Statement</h4>
                  <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "4px 0" }}>Subtotal Sales</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "bold" }}>৳ {restaurantMetrics.subtotal.toFixed(2)}</td>
                        <td style={{ padding: "4px 0 4px 16px" }}>Supplementary Duty (SD)</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "bold" }}>৳ {restaurantMetrics.sd.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0" }}>VAT Collections</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "bold" }}>৳ {restaurantMetrics.vat.toFixed(2)}</td>
                        <td style={{ padding: "4px 0 4px 16px" }}>Service Charge (SC)</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "bold" }}>৳ {restaurantMetrics.sc.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0" }}>Discount Offered</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "bold", color: "#b91c1c" }}>-৳ {restaurantMetrics.discount.toFixed(2)}</td>
                        <td style={{ padding: "4px 0 4px 16px" }}>Items Sold / Best Table</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "bold" }}>{restaurantMetrics.itemsSold} items ({restaurantMetrics.bestTable})</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payment Methods Breakdown Table */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "4px", margin: "0 0 8px 0" }}>
                  Dynamic Payment Method Inflow Breakdown
                </h4>
                <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #ccc" }}>
                      <th style={{ padding: "6px", textAlign: "left" }}>Payment Method</th>
                      <th style={{ padding: "6px", textAlign: "center" }}>Transactions Count</th>
                      <th style={{ padding: "6px", textAlign: "right" }}>Total Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.methodBreakdown.map((m) => (
                      <tr key={m.method} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "6px", fontWeight: "bold", textTransform: "uppercase" }}>{m.method}</td>
                        <td style={{ padding: "6px", textAlign: "center" }}>{m.count}</td>
                        <td style={{ padding: "6px", textAlign: "right", fontWeight: "bold", color: "#16a34a" }}>৳ {m.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detailed Transactions List */}
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "4px", margin: "0 0 8px 0" }}>
                  Detailed Transaction Ledger
                </h4>
                <table style={{ width: "100%", fontSize: "10px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #ccc" }}>
                      <th style={{ padding: "6px", textAlign: "left" }}>Date & Time</th>
                      <th style={{ padding: "6px", textAlign: "left" }}>Sector</th>
                      <th style={{ padding: "6px", textAlign: "left" }}>Customer / Guest</th>
                      <th style={{ padding: "6px", textAlign: "left" }}>Ref #</th>
                      <th style={{ padding: "6px", textAlign: "left" }}>Payment Method</th>
                      <th style={{ padding: "6px", textAlign: "right" }}>Amount (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "5px 6px" }}>{new Date(tx.date).toLocaleString("en-GB")}</td>
                        <td style={{ padding: "5px 6px", fontWeight: "bold" }}>{tx.sector}</td>
                        <td style={{ padding: "5px 6px" }}>{tx.customerName}</td>
                        <td style={{ padding: "5px 6px" }}>{tx.reference}</td>
                        <td style={{ padding: "5px 6px" }}>{tx.paymentMethod}</td>
                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: "bold" }}>৳ {tx.amount.toFixed(2)}</td>
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
