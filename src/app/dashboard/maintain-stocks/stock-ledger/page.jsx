"use client";

import React, { useState, useEffect, useCallback, useContext, useRef, useMemo } from "react";
import { FiSearch, FiBook } from "react-icons/fi";
import { MdInventory2, MdTrendingDown, MdTrendingUp, MdSwapHoriz } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useStandardPrint from "@/hooks/useStandardPrint";

import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

const TYPE_META = {
  purchase:        { label: "Purchase",        color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400", dir: "in" },
  wastage:         { label: "Wastage",         color: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400",               dir: "out" },
  kitchen_issue:   { label: "Kitchen Issue",   color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",       dir: "out" },
  room_issue:      { label: "Room Issue",      color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400",           dir: "out" },
  return_kitchen:  { label: "Kitchen Return",  color: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-400",           dir: "in" },
  return_room:     { label: "Room Return",     color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-400",           dir: "in" },
  manual_adjustment: { label: "Manual Adj.",   color: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400",  dir: "both" },
  sale:            { label: "Sale",            color: "bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-400",           dir: "out" },
};

const StockLedgerPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);

  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  // Generate list of the last 12 months dynamically
  const monthOptions = useMemo(() => {
    const options = [];
    const date = new Date();
    date.setDate(1); // Set to day 1 to avoid rollover bugs when subtracting months
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const label = date.toLocaleDateString("default", { month: "long", year: "numeric" });
      options.push({ label, year, month });
      date.setMonth(date.getMonth() - 1);
    }
    return options;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  });

  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  });

  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  });

  // Sync selectedMonth dropdown with fromDate/toDate changes
  useEffect(() => {
    if (fromDate === null && toDate === null) {
      if (selectedMonth !== "all") setSelectedMonth("all");
      return;
    }

    if (fromDate && toDate) {
      const startYear = fromDate.getFullYear();
      const startMonth = fromDate.getMonth();
      const startDay = fromDate.getDate();

      const endYear = toDate.getFullYear();
      const endMonth = toDate.getMonth();
      const lastDayOfStartMonth = new Date(startYear, startMonth + 1, 0).getDate();
      const endDay = toDate.getDate();

      if (startYear === endYear && startMonth === endMonth && startDay === 1 && endDay === lastDayOfStartMonth) {
        const value = `${startYear}-${startMonth}`;
        if (selectedMonth !== value) setSelectedMonth(value);
        return;
      }
    }

    if (selectedMonth !== "custom") {
      setSelectedMonth("custom");
    }
  }, [fromDate, toDate, selectedMonth]);

  // Handle month selection change
  const handleMonthChange = (e) => {
    const val = e.target.value;
    setSelectedMonth(val);

    if (val === "all") {
      setFromDate(null);
      setToDate(null);
    } else if (val !== "custom") {
      const [year, month] = val.split("-").map(Number);
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      setFromDate(start);
      setToDate(end);
    }
  };

  const [ledger, setLedger] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Standardize Print hook integration
  const {
    printData,
    setPrintData,
    printRef,
    handlePrint
  } = useStandardPrint({
    documentTitle: `Stock_Ledger_${selectedIngredient?.name || "Report"}`,
  });

  const handleExportExcel = () => {
    if (!ledger) return;
    setIsExporting(true);
    try {
      const formatted = ledger.movements.map((row, idx) => {
        const meta = TYPE_META[row.type] || { label: row.type };
        return {
          "Sl": idx + 1,
          "Date": new Date(row.date).toLocaleDateString("en-GB"),
          "Time": new Date(row.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          "Transaction Type": meta.label,
          "Qty In": row.qtyIn > 0 ? row.qtyIn : 0,
          "Qty Out": row.qtyOut > 0 ? row.qtyOut : 0,
          "Balance": row.balance,
          "Details": `${row.reason ? `${row.reason} · ` : ""}${row.kitchenName ? `${row.kitchenName} · ` : ""}${row.roomNumber ? `Room ${row.roomNumber} · ` : ""}${row.note || ""}`,
          "Recorded By": row.createdBy?.name || "System"
        };
      });
      // Add summary row at the end
      formatted.push({
        "Sl": "",
        "Date": "CLOSING BALANCE",
        "Time": "",
        "Transaction Type": "",
        "Qty In": stats.totalIn,
        "Qty Out": stats.totalOut,
        "Balance": ledger.currentStock,
        "Details": `Unit: ${ledger.ingredient.unit}`,
        "Recorded By": ""
      });
      exportToExcel(formatted, `Stock_Ledger_${ledger.ingredient.name}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    if (!ledger) return;
    setIsExporting(true);
    try {
      const formatted = ledger.movements.map((row, idx) => {
        const meta = TYPE_META[row.type] || { label: row.type };
        return {
          "Sl": idx + 1,
          "Date": new Date(row.date).toLocaleDateString("en-GB"),
          "Time": new Date(row.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          "Transaction Type": meta.label,
          "Qty In": row.qtyIn > 0 ? row.qtyIn : 0,
          "Qty Out": row.qtyOut > 0 ? row.qtyOut : 0,
          "Balance": row.balance,
          "Details": `${row.reason ? `${row.reason} · ` : ""}${row.kitchenName ? `${row.kitchenName} · ` : ""}${row.roomNumber ? `Room ${row.roomNumber} · ` : ""}${row.note || ""}`,
          "Recorded By": row.createdBy?.name || "System"
        };
      });
      formatted.push({
        "Sl": "",
        "Date": "CLOSING BALANCE",
        "Time": "",
        "Transaction Type": "",
        "Qty In": stats.totalIn,
        "Qty Out": stats.totalOut,
        "Balance": ledger.currentStock,
        "Details": `Unit: ${ledger.ingredient.unit}`,
        "Recorded By": ""
      });
      exportToCsv(formatted, `Stock_Ledger_${ledger.ingredient.name}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintReport = () => {
    setIsExporting(true);
    try {
      setPrintData(ledger);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch dropdown data
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [ingRes, catRes] = await Promise.all([
          axiosSecure.get("/ingredient"),
          axiosSecure.get("/ingredient-category"),
        ]);
        setIngredients(ingRes.data || []);
        setCategories(catRes.data || []);
      } catch (err) { console.error("Failed to load ingredients:", err); }
    };
    fetchData();
  }, [axiosSecure, user]);

  const fetchLedger = useCallback(async () => {
    if (!selectedIngredient) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate.toISOString());
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.append("to", endOfDay.toISOString());
      }
      const { data } = await axiosSecure.get(`/stock-ops/ledger/${selectedIngredient._id}?${params.toString()}`);
      setLedger(data);
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
      setLedger(null);
    } finally { setIsLoading(false); }
  }, [axiosSecure, selectedIngredient, fromDate, toDate]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const filteredIngredients = ingredients.filter((i) => {
    const catMatch = !selectedCategory || (i.category?._id || i.category) === selectedCategory;
    const searchMatch = !searchTerm || i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    return catMatch && searchMatch;
  });

  // Summary stats
  const stats = ledger ? ledger.movements.reduce(
    (acc, m) => {
      if (m.qtyIn > 0) acc.totalIn += m.qtyIn;
      if (m.qtyOut > 0) acc.totalOut += m.qtyOut;
      return acc;
    },
    { totalIn: 0, totalOut: 0 }
  ) : null;

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <SectionHeader
        title="Stock Ledger"
        subtitle="Full transaction history for each ingredient — purchases, issues, wastage, and returns."
      />

      {/* Selector Panel */}
      <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 p-6 mb-6">
        <p className="text-xs font-bold text-brand-sage uppercase tracking-widest mb-4">Select Ingredient to View Ledger</p>

        {/* Row 1: Category + Search */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setSelectedIngredient(null); setLedger(null); }}
            className="select select-bordered border-brand-primary focus:outline-none rounded-xl text-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite font-semibold h-12 w-48"
          >
            <option value="">All Categories</option>
            {categories.filter((c) => c.isActive).map((c) => (
              <option key={c._id} value={c._id}>{c.categoryName}</option>
            ))}
          </select>

          {/* Search */}
          <label className="input input-bordered border-brand-primary focus:outline-none flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-xl px-4 h-12 w-72">
            <FiSearch className="text-brand-sage flex-shrink-0" />
            <input
              type="text"
              className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none text-sm"
              placeholder="Search ingredient or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>

        {/* Row 2: Date filters */}
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <span className="text-xs font-bold text-brand-sage uppercase tracking-widest">Month:</span>
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-xl h-12 text-xs font-semibold px-4 w-36 text-brand-charcoal dark:text-brand-offwhite shadow-sm border-brand-beige shrink-0"
          >
            <option value="all">All Months</option>
            {monthOptions.map((opt) => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                {opt.label}
              </option>
            ))}
            <option value="custom" disabled={selectedMonth !== "custom"}>Custom Range</option>
          </select>

          <span className="text-xs font-bold text-brand-sage uppercase tracking-widest">Date Range:</span>
          <div className="flex-shrink-0">
            <DatePicker
              selected={fromDate}
              onChange={setFromDate}
              dateFormat="dd/MM/yyyy"
              placeholderText="From Date"
              isClearable
              wrapperClassName="block"
              className="input input-bordered border-brand-primary focus:outline-none rounded-xl h-12 text-xs font-semibold px-4 w-36 text-center bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
            />
          </div>
          <span className="text-brand-sage text-sm font-bold">→</span>
          <div className="flex-shrink-0">
            <DatePicker
              selected={toDate}
              onChange={setToDate}
              dateFormat="dd/MM/yyyy"
              placeholderText="To Date"
              isClearable
              wrapperClassName="block"
              className="input input-bordered border-brand-primary focus:outline-none rounded-xl h-12 text-xs font-semibold px-4 w-36 text-center bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(null); setToDate(null); }}
              className="btn btn-xs btn-ghost text-brand-sage hover:text-red-500 font-bold uppercase tracking-widest"
            >
              Clear
            </button>
          )}
        </div>

        {/* Ingredient Pills */}
        {filteredIngredients.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-brand-beige dark:border-brand-beige/20">
            {filteredIngredients.map((i) => (
              <button
                key={i._id}
                onClick={() => { setSelectedIngredient(i); setLedger(null); }}
                className={`badge badge-lg border font-semibold text-xs px-4 py-3 cursor-pointer transition-all ${
                  selectedIngredient?._id === i._id
                    ? "bg-brand-primary text-white border-brand-primary shadow-md"
                    : "bg-brand-offwhite dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 hover:border-brand-primary hover:text-brand-primary"
                }`}
              >
                {i.name} <span className="opacity-60 ml-1">({i.unit})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ledger Content */}
      <AnimatePresence mode="wait">
        {!selectedIngredient && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 text-brand-sage">
            <FiBook className="text-6xl mb-4 opacity-30" />
            <p className="text-sm font-bold uppercase tracking-widest">Select an ingredient above to view its ledger</p>
          </motion.div>
        )}

        {selectedIngredient && isLoading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 p-6">
            <MtableLoading />
          </motion.div>
        )}

        {selectedIngredient && !isLoading && ledger && (
          <motion.div key="ledger" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* Ingredient Info + Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 p-5 col-span-1 lg:col-span-2 flex items-center gap-4">
                <div className="bg-brand-primary/10 p-4 rounded-full">
                  <MdInventory2 className="text-brand-primary text-2xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-sage uppercase tracking-widest">{ledger.ingredient.category?.categoryName}</p>
                  <h3 className="text-xl font-black text-brand-charcoal dark:text-brand-offwhite">{ledger.ingredient.name}</h3>
                  <p className="text-xs text-brand-sage mt-1">SKU: <span className="font-mono font-bold text-brand-primary dark:text-brand-sage">{ledger.ingredient.sku}</span></p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-bold text-brand-sage uppercase tracking-widest">Current Stock</p>
                  <p className={`text-2xl font-black font-mono ${ledger.currentStock <= (ledger.ingredient.stockAlert || 0) && ledger.currentStock > 0 ? "text-amber-500" : ledger.currentStock === 0 ? "text-red-500" : "text-brand-primary dark:text-brand-sage"}`}>
                    {ledger.currentStock}
                  </p>
                  <p className="text-xs text-brand-sage">{ledger.ingredient.unit}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-800/30 p-5 flex items-center gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-950/30 p-3 rounded-full">
                  <MdTrendingUp className="text-emerald-600 dark:text-emerald-400 text-xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-sage uppercase tracking-widest">Total In</p>
                  <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">+{stats.totalIn.toFixed(2)}</p>
                  <p className="text-xs text-brand-sage">{ledger.ingredient.unit}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-red-200 dark:border-red-800/30 p-5 flex items-center gap-3">
                <div className="bg-red-100 dark:bg-red-950/30 p-3 rounded-full">
                  <MdTrendingDown className="text-red-500 text-xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-sage uppercase tracking-widest">Total Out</p>
                  <p className="text-2xl font-black font-mono text-red-500">−{stats.totalOut.toFixed(2)}</p>
                  <p className="text-xs text-brand-sage">{ledger.ingredient.unit}</p>
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden">
              <div className="flex flex-wrap justify-between items-center p-5 border-b border-brand-beige dark:border-brand-beige/20 gap-4">
                <div className="flex items-center gap-3">
                  <MdSwapHoriz className="text-brand-primary text-xl" />
                  <span className="text-xs font-bold text-brand-sage uppercase tracking-widest">Transaction History — {ledger.movements.length} entries</span>
                </div>
                <ExportButtons
                  onExportExcel={handleExportExcel}
                  onExportCsv={handleExportCsv}
                  onPrint={handlePrintReport}
                  isLoading={isExporting}
                />
              </div>

              {ledger.movements.length === 0 ? (
                <div className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase">
                  No transactions found{fromDate || toDate ? " in the selected date range" : ""}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px]">
                      <tr>
                        <th className="pl-8 py-5">#</th>
                        <th className="py-5">Date & Time</th>
                        <th className="py-5">Transaction Type</th>
                        <th className="py-5 text-right">Qty In</th>
                        <th className="py-5 text-right">Qty Out</th>
                        <th className="py-5 text-right">Balance</th>
                        <th className="py-5">Details</th>
                        <th className="pr-8 py-5">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.movements.map((row, idx) => {
                        const meta = TYPE_META[row.type] || { label: row.type, color: "bg-gray-100 text-gray-700", dir: "both" };
                        return (
                          <tr key={row._id}
                            className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none text-sm">
                            <td className="pl-8 py-3 font-mono text-brand-sage text-xs">{idx + 1}</td>
                            <td className="py-3 font-mono text-xs">
                              <div>{new Date(row.date).toLocaleDateString("en-GB")}</div>
                              <div className="text-brand-sage">{new Date(row.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            </td>
                            <td className="py-3">
                              <span className={`badge border-none font-bold text-[9px] px-3 py-2.5 uppercase tracking-wider ${meta.color}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {row.qtyIn > 0 ? `+${row.qtyIn}` : "—"}
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-red-500">
                              {row.qtyOut > 0 ? `−${row.qtyOut}` : "—"}
                            </td>
                            <td className="py-3 text-right font-mono font-black text-brand-primary dark:text-brand-sage text-base">
                              {row.balance}
                            </td>
                            <td className="py-3 text-xs text-brand-sage max-w-xs">
                              {row.reason && <span className="font-semibold text-brand-charcoal dark:text-brand-offwhite/80">{row.reason} · </span>}
                              {row.kitchenName && <span>{row.kitchenName} · </span>}
                              {row.roomNumber && <span>Room {row.roomNumber} · </span>}
                              {row.note || ""}
                            </td>
                            <td className="pr-8 py-3 font-semibold text-brand-primary dark:text-brand-sage text-xs">{row.createdBy?.name || "System"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-brand-offwhite dark:bg-brand-charcoal/50 font-bold text-sm">
                        <td colSpan="3" className="pl-8 py-4 uppercase tracking-widest text-xs text-brand-sage">Closing Balance</td>
                        <td className="py-4 text-right font-mono text-emerald-600 dark:text-emerald-400">+{stats.totalIn.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono text-red-500">−{stats.totalOut.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono font-black text-brand-primary dark:text-brand-sage text-lg pr-2">{ledger.currentStock}</td>
                        <td colSpan="2" className="pr-8 py-4 text-xs text-brand-sage">{ledger.ingredient.unit}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title={`Stock Ledger - ${selectedIngredient?.name}`}
            subtitle={`Stock movements history for ${selectedIngredient?.name} (SKU: ${selectedIngredient?.sku})`}
            dateRange={
              fromDate && toDate
                ? `${fromDate.toLocaleDateString("en-GB")} to ${toDate.toLocaleDateString("en-GB")}`
                : "All Time"
            }
          >
            <div style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", fontSize: "12px", color: "#000" }}>
              <strong>Ingredient Name:</strong> {printData.ingredient?.name} &nbsp;|&nbsp; 
              <strong>Category:</strong> {printData.ingredient?.category?.categoryName} &nbsp;|&nbsp; 
              <strong>SKU:</strong> {printData.ingredient?.sku} &nbsp;|&nbsp; 
              <strong>Unit:</strong> {printData.ingredient?.unit} &nbsp;|&nbsp; 
              <strong>Current Stock:</strong> {printData.currentStock}
            </div>
            <table className="print-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date & Time</th>
                  <th>Transaction Type</th>
                  <th style={{ textAlign: "right" }}>Qty In</th>
                  <th style={{ textAlign: "right" }}>Qty Out</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                  <th>Details</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {printData.movements?.map((row, idx) => {
                  const meta = TYPE_META[row.type] || { label: row.type };
                  return (
                    <tr key={row._id}>
                      <td>{idx + 1}</td>
                      <td>
                        {new Date(row.date).toLocaleDateString("en-GB")} {new Date(row.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td>{meta.label}</td>
                      <td style={{ textAlign: "right", color: "green", fontWeight: "bold" }}>
                        {row.qtyIn > 0 ? `+${row.qtyIn}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", color: "red", fontWeight: "bold" }}>
                        {row.qtyOut > 0 ? `−${row.qtyOut}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>{row.balance}</td>
                      <td>
                        {row.reason && <span>{row.reason} · </span>}
                        {row.kitchenName && <span>{row.kitchenName} · </span>}
                        {row.roomNumber && <span>Room {row.roomNumber} · </span>}
                        {row.note || ""}
                      </td>
                      <td>{row.createdBy?.name || "System"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: "bold" }}>
                  <td colSpan="3">CLOSING BALANCE</td>
                  <td style={{ textAlign: "right" }}>+{stats?.totalIn?.toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}>−{stats?.totalOut?.toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}>{printData.currentStock}</td>
                  <td colSpan="2">{printData.ingredient?.unit}</td>
                </tr>
              </tfoot>
            </table>
          </PrintReportTemplate>
        )}
      </div>
    </div>
  );
};

export default StockLedgerPage;
