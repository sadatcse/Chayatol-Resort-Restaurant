"use client";

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from "react";
import { FiTrash2, FiX, FiSearch, FiPlus, FiAlertTriangle, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { MdDeleteForever, MdWarning } from "react-icons/md";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useStandardPrint from "@/hooks/useStandardPrint";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useWastage from "@/hooks/useWastage";
import { AuthContext } from "@/providers/AuthProvider";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

const REASONS = ["Damaged", "Expired", "Spoiled", "Broken", "Lost", "Other"];

const REASON_STYLES = {
  Damaged: "bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400",
  Expired: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400",
  Spoiled: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400",
  Broken: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400",
  Lost: "bg-pink-100 text-pink-800 dark:bg-pink-950/30 dark:text-pink-400",
  Other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const WastagePage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState({});

  const toggleBatch = (batchId) => {
    setExpandedBatches((prev) => ({ ...prev, [batchId]: !prev[batchId] }));
  };

  // Standardize Print hook integration
  const {
    printData,
    setPrintData,
    printRef,
    handlePrint
  } = useStandardPrint({
    documentTitle: "Wastage_Management_Report",
    onAfterPrint: () => setIsExporting(false)
  });

  const fetchAllWastageForExport = async () => {
    try {
      const params = new URLSearchParams({ page: 1, limit: 99999 });
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
      if (fromDate) params.append("from", fromDate.toISOString());
      if (toDate) params.append("to", toDate.toISOString());

      const response = await axiosSecure.get(`/stock-ops/wastage?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch all wastage for export:", error);
      return [];
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllWastageForExport();
      const flatData = [];
      data.forEach(batch => {
        if (batch.items && batch.items.length > 0) {
          batch.items.forEach(item => {
            flatData.push({
              createdAt: batch.createdAt,
              reason: batch.reason,
              createdBy: batch.createdBy,
              ingredient: item.ingredient,
              adjustment: item.adjustment,
              note: item.note
            });
          });
        }
      });

      const formatted = flatData.map(r => ({
        "Wastage Date": r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "N/A",
        "Ingredient Name": r.ingredient?.name || "N/A",
        "SKU": r.ingredient?.sku || "N/A",
        "Category": r.ingredient?.category?.categoryName || "N/A",
        "Wastage Qty": Math.abs(r.adjustment),
        "Unit": r.ingredient?.unit || "N/A",
        "Reason": r.reason,
        "Notes": r.note || "",
        "Recorded By": r.createdBy?.name || "System"
      }));
      exportToExcel(formatted, "Wastage_Report");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllWastageForExport();
      const flatData = [];
      data.forEach(batch => {
        if (batch.items && batch.items.length > 0) {
          batch.items.forEach(item => {
            flatData.push({
              createdAt: batch.createdAt,
              reason: batch.reason,
              createdBy: batch.createdBy,
              ingredient: item.ingredient,
              adjustment: item.adjustment,
              note: item.note
            });
          });
        }
      });

      const formatted = flatData.map(r => ({
        "Wastage Date": r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "N/A",
        "Ingredient Name": r.ingredient?.name || "N/A",
        "SKU": r.ingredient?.sku || "N/A",
        "Category": r.ingredient?.category?.categoryName || "N/A",
        "Wastage Qty": Math.abs(r.adjustment),
        "Unit": r.ingredient?.unit || "N/A",
        "Reason": r.reason,
        "Notes": r.note || "",
        "Recorded By": r.createdBy?.name || "System"
      }));
      exportToCsv(formatted, "Wastage_Report");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintReport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllWastageForExport();
      const flatData = [];
      data.forEach(batch => {
        if (batch.items && batch.items.length > 0) {
          batch.items.forEach(item => {
            flatData.push({
              _id: item._id,
              createdAt: batch.createdAt,
              reason: batch.reason,
              createdBy: batch.createdBy,
              ingredient: item.ingredient,
              adjustment: item.adjustment,
              note: item.note
            });
          });
        }
      });

      setPrintData(flatData);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  // Generate list of the last 12 months dynamically
  const monthOptions = useMemo(() => {
    const options = [];
    const date = new Date();
    date.setDate(1); // Set to day 1 to avoid rollover bugs when subtracting months
    // Go back 12 months
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
    setCurrentPage(1);

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

  const { records, totalPages, totalItems, isLoading, refetch } = useWastage(
    currentPage, itemsPerPage, debouncedSearchTerm, fromDate, toDate
  );

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);

  // Batch fields
  const [batchDate, setBatchDate] = useState(new Date());
  const [batchItems, setBatchItems] = useState([]);

  // Current item select fields
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemReason, setItemReason] = useState("");
  const [itemNote, setItemNote] = useState("");

  const fetchPrerequisites = useCallback(async () => {
    try {
      const [ingRes, catRes] = await Promise.all([
        axiosSecure.get("/ingredient"),
        axiosSecure.get("/ingredient-category"),
      ]);
      setIngredients(ingRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error("Failed to fetch prerequisites:", err);
    }
  }, [axiosSecure]);

  useEffect(() => { fetchPrerequisites(); }, [fetchPrerequisites]);

  const openModal = () => {
    setBatchDate(new Date());
    setBatchItems([]);
    setSelectedIngredientId("");
    setItemQuantity("");
    setItemReason("");
    setItemNote("");
    setSelectedCategory("");
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); };

  const filteredIngredients = ingredients.filter(
    (i) => i.isActive && (!selectedCategory || (i.category?._id || i.category) === selectedCategory)
  );

  const handleAddItem = () => {
    if (!selectedIngredientId) {
      return Swal.fire({ title: "Validation Error", text: "Please select an ingredient.", icon: "warning", confirmButtonColor: "#346E36" });
    }
    if (!itemQuantity || Number(itemQuantity) <= 0) {
      return Swal.fire({ title: "Validation Error", text: "Quantity must be greater than zero.", icon: "warning", confirmButtonColor: "#346E36" });
    }
    if (!itemReason) {
      return Swal.fire({ title: "Validation Error", text: "Please select a reason.", icon: "warning", confirmButtonColor: "#346E36" });
    }
    if (batchItems.some(item => item.ingredientId === selectedIngredientId)) {
      return Swal.fire({ title: "Validation Error", text: "This item is already added to the batch list.", icon: "warning", confirmButtonColor: "#346E36" });
    }

    const ingredient = ingredients.find(i => i._id === selectedIngredientId);
    setBatchItems([
      ...batchItems,
      {
        ingredientId: selectedIngredientId,
        name: ingredient.name,
        unit: ingredient.unit,
        quantity: Number(itemQuantity),
        reason: itemReason,
        note: itemNote.trim()
      }
    ]);

    setSelectedIngredientId("");
    setItemQuantity("");
    setItemReason("");
    setItemNote("");
  };

  const handleRemoveItem = (index) => {
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (batchItems.length === 0) {
      return Swal.fire({ title: "Validation Error", text: "Please add at least one item to the wastage list.", icon: "warning", confirmButtonColor: "#346E36" });
    }

    setIsSubmitting(true);
    try {
      await axiosSecure.post("/stock-ops/wastage", {
        items: batchItems,
        date: batchDate.toISOString(),
      });
      await refetch();
      closeModal();
      Swal.fire({ title: "Wastage Recorded", text: "All wastage items successfully logged.", icon: "success", confirmButtonColor: "#346E36" });
    } catch (err) {
      Swal.fire({ title: "Failed", text: err.response?.data?.message || "Could not record wastage.", icon: "error", confirmButtonColor: "#346E36" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <SectionHeader
        title="Wastage Management"
        subtitle="Record damaged, expired, spoiled, or lost inventory. Every entry automatically reduces current stock."
      >
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Monthly Selector */}
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-xs font-semibold px-4 w-full sm:w-44 text-brand-charcoal dark:text-brand-offwhite shadow-sm border-brand-beige shrink-0"
            >
              <option value="all">All Months</option>
              {monthOptions.map((opt) => (
                <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                  {opt.label}
                </option>
              ))}
              <option value="custom" disabled={selectedMonth !== "custom"}>Custom Range</option>
            </select>

            <DatePicker selected={fromDate} onChange={(d) => { setFromDate(d); setCurrentPage(1); }}
              dateFormat="dd/MM/yyyy" placeholderText="From Date" isClearable 
              wrapperClassName="!w-auto inline-block shrink-0"
              className="input input-bordered border-brand-primary focus:outline-none bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-xs font-semibold px-4 w-full sm:w-36 text-center text-brand-charcoal dark:text-brand-offwhite shadow-sm border-brand-beige shrink-0" />
            <DatePicker selected={toDate} onChange={(d) => { setToDate(d); setCurrentPage(1); }}
              dateFormat="dd/MM/yyyy" placeholderText="To Date" isClearable 
              wrapperClassName="!w-auto inline-block shrink-0"
              className="input input-bordered border-brand-primary focus:outline-none bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-xs font-semibold px-4 w-full sm:w-36 text-center text-brand-charcoal dark:text-brand-offwhite shadow-sm border-brand-beige shrink-0" />
          </div>
          <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-64 h-12">
            <FiSearch className="text-brand-sage text-lg" />
            <input type="text" className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none text-sm"
              placeholder="Search ingredient or reason..."
              value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </label>
        </div>
      </SectionHeader>

      {/* Stats + Action Bar */}
      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
        <div className="flex items-center gap-3 text-xs font-bold text-brand-sage uppercase tracking-widest">
          <span>Display</span>
          <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="select select-bordered select-xs bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige dark:border-brand-beige/20 focus:outline-none h-8 px-2">
            {[5, 10, 15, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="ml-4">Total Records: {totalItems}</span>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <ExportButtons
            onExportExcel={handleExportExcel}
            onExportCsv={handleExportCsv}
            onPrint={handlePrintReport}
            isLoading={isExporting}
          />
          {canPerformAction && (
            <button onClick={openModal} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10 cursor-pointer animate-scale-in">
              <MdDeleteForever className="text-lg" />
              <span className="uppercase tracking-widest text-xs font-bold">Record Wastage</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden">
        {isLoading ? (
          <div className="p-6"><MtableLoading /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="pl-8 py-5 w-12"></th>
                  <th className="py-5">Date</th>
                  <th className="py-5">Reason</th>
                  <th className="py-5">Items Summary</th>
                  <th className="py-5 text-right">Total Qty Lost</th>
                  <th className="py-5">Remarks</th>
                  <th className="pr-8 py-5">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {records.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">No wastage records found.</td></tr>
                  ) : (
                    records.map((r) => {
                      const totalQty = r.items?.reduce((sum, item) => sum + Math.abs(item.adjustment), 0) || 0;
                      const hasMultiple = r.items?.length > 1;
                      const firstItem = r.items?.[0];
                      const firstIngredientName = firstItem?.ingredient?.name || "N/A";
                      const firstNote = firstItem?.note || "—";
                      const firstReason = firstItem?.reason || r.reason || "Other";
                      const isExpanded = !!expandedBatches[r._id];

                      return (
                        <React.Fragment key={r._id}>
                          <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="hover:bg-brand-primary/5 dark:hover:bg-brand-primary/10 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-sm cursor-pointer"
                            onClick={() => toggleBatch(r._id)}>
                            <td className="pl-8 py-4 text-center">
                              <button className="btn btn-ghost btn-xs p-0 min-h-0 h-auto text-brand-sage hover:bg-transparent">
                                {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                              </button>
                            </td>
                            <td className="py-4 font-mono text-xs">{new Date(r.createdAt).toLocaleDateString("en-GB")}</td>
                            <td className="py-4">
                              <span className={`badge border-none font-bold text-[9px] px-3 py-2.5 uppercase tracking-wider ${REASON_STYLES[firstReason] || REASON_STYLES.Other}`}>
                                {firstReason}
                              </span>
                            </td>
                            <td className="py-4 font-bold uppercase tracking-wide">
                              {firstIngredientName}
                              {hasMultiple && (
                                <span className="ml-2 text-xs font-normal text-brand-primary dark:text-brand-sage bg-brand-primary/5 dark:bg-brand-primary/10 px-2 py-0.5 rounded-full lowercase">
                                  + {r.items.length - 1} more items
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-right font-mono font-black text-red-650 dark:text-red-400 text-base pr-8">−{totalQty}</td>
                            <td className="py-4 text-brand-sage text-xs max-w-xs truncate">{firstNote}</td>
                            <td className="pr-8 py-4 font-semibold text-brand-primary dark:text-brand-sage text-xs">{r.createdBy?.name || "System"}</td>
                          </motion.tr>
                          {isExpanded && (
                            <tr className="bg-brand-primary/5 dark:bg-brand-primary/5">
                              <td colSpan="7" className="pl-12 pr-8 py-3">
                                <div className="border border-brand-beige dark:border-brand-beige/20 rounded-xl overflow-hidden shadow-inner bg-white dark:bg-brand-charcoal/50 p-4">
                                  <h4 className="text-xs font-bold text-brand-sage uppercase tracking-wider mb-3">Batch Wastage Details</h4>
                                  <table className="table table-compact w-full text-xs">
                                    <thead className="bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-sage uppercase tracking-wider text-[9px]">
                                      <tr>
                                        <th className="pl-4 py-2">Ingredient</th>
                                        <th className="py-2">Category</th>
                                        <th className="py-2 text-right">Quantity Lost</th>
                                        <th className="py-2 text-right">Current Stock</th>
                                        <th className="py-2">Reason</th>
                                        <th className="pr-4 py-2">Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.items?.map((item) => (
                                        <tr key={item._id} className="border-b border-brand-beige/10 last:border-none">
                                          <td className="pl-4 py-2.5 font-bold uppercase">{item.ingredient?.name} <span className="text-brand-sage font-normal normal-case text-[10px] ml-1">({item.ingredient?.unit})</span></td>
                                          <td className="py-2.5 font-semibold text-brand-sage">{item.ingredient?.category?.categoryName || "—"}</td>
                                          <td className="py-2.5 text-right font-mono font-bold text-red-655 dark:text-red-400">−{Math.abs(item.adjustment)}</td>
                                          <td className="py-2.5 text-right font-mono text-brand-sage">{item.stock?.quantityInStock} {item.ingredient?.unit}</td>
                                          <td className="py-2.5">
                                            <span className={`badge border-none font-bold text-[8px] px-2 py-1 uppercase tracking-wider ${REASON_STYLES[item.reason || r.reason] || REASON_STYLES.Other}`}>
                                              {item.reason || r.reason}
                                            </span>
                                          </td>
                                          <td className="pr-4 py-2.5 text-brand-sage italic">{item.note || "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
            <div className="p-5 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/30 dark:bg-brand-charcoal/10 flex justify-center">
              <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
            </div>
          </div>
        )}
      </motion.div>

      {/* Record Wastage Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
            <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-2xl rounded-2xl shadow-2xl border border-brand-beige/20 animate-scale-in">
              <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-primary/10 dark:bg-brand-primary/20">
                <div className="flex items-center gap-3">
                  <MdWarning className="text-brand-primary dark:text-brand-sage text-2xl" />
                  <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">Record Wastage</h3>
                </div>
                <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10"><FiX size={20} /></button>
              </div>

              <div className="p-8 space-y-6">
                {/* Date */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Date *</span></label>
                  <DatePicker selected={batchDate} onChange={(d) => setBatchDate(d)}
                    dateFormat="dd/MM/yyyy"
                    className="input input-bordered border-brand-primary focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" />
                </div>

                {/* Add Item form box */}
                <div className="bg-brand-offwhite/50 dark:bg-brand-charcoal/30 p-4 rounded-xl border border-brand-beige dark:border-brand-beige/10 space-y-4">
                  <h4 className="text-xs font-bold text-brand-sage uppercase tracking-wider">Add Item to Wastage</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Filter by Category</span></label>
                      <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedIngredientId(""); }}
                        className="select select-bordered border-brand-primary focus:outline-none rounded-xl text-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite">
                        <option value="">All Categories</option>
                        {categories.filter((c) => c.isActive).map((c) => <option key={c._id} value={c._id}>{c.categoryName}</option>)}
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Ingredient *</span></label>
                      <select value={selectedIngredientId} onChange={(e) => setSelectedIngredientId(e.target.value)}
                        className="select select-bordered border-brand-primary focus:outline-none rounded-xl text-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite">
                        <option value="" disabled>Select Ingredient</option>
                        {filteredIngredients.map((i) => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="form-control sm:col-span-1">
                      <label className="label py-1">
                        <span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">
                          Quantity {ingredients.find(i => i._id === selectedIngredientId) ? `(${ingredients.find(i => i._id === selectedIngredientId).unit})` : ""} *
                        </span>
                      </label>
                      <input type="number" step="any" min="0.01" value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value)}
                        className="input input-bordered border-brand-primary focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                        placeholder="e.g. 2.5" />
                    </div>

                    <div className="form-control sm:col-span-2">
                      <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Reason *</span></label>
                      <select value={itemReason} onChange={(e) => setItemReason(e.target.value)}
                        className="select select-bordered border-brand-primary focus:outline-none rounded-xl text-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite">
                        <option value="" disabled>Select Reason</option>
                        {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Notes / Details</span></label>
                    <input type="text" value={itemNote} onChange={(e) => setItemNote(e.target.value)}
                      className="input input-bordered border-brand-primary focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholder="e.g. Spilled during prep..." />
                  </div>

                  <div className="flex justify-end">
                    <button type="button" onClick={handleAddItem} className="btn bg-brand-primary hover:bg-brand-secondary text-white border-none btn-sm rounded-full px-6 shadow-sm animate-scale-in">
                      Add to Batch List
                    </button>
                  </div>
                </div>

                {/* Batch list table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-brand-sage uppercase tracking-wider">Wastage Batch Sheet ({batchItems.length} items)</h4>
                  <div className="border border-brand-beige dark:border-brand-beige/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="table table-compact w-full text-xs">
                      <thead className="bg-brand-offwhite dark:bg-brand-charcoal/80 text-brand-sage uppercase tracking-wider text-[9px]">
                        <tr>
                          <th className="pl-4">Ingredient</th>
                          <th className="text-right">Qty</th>
                          <th>Reason</th>
                          <th>Note</th>
                          <th className="w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchItems.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-8 text-brand-sage opacity-75">No items added yet. Formulate items using the box above.</td>
                          </tr>
                        ) : (
                          batchItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-brand-beige dark:border-brand-beige/5 last:border-none">
                              <td className="pl-4 font-bold">{item.name}</td>
                              <td className="text-right font-mono font-bold">{item.quantity} {item.unit}</td>
                              <td className="uppercase text-[10px] font-bold text-red-500">{item.reason}</td>
                              <td>{item.note || "—"}</td>
                              <td>
                                <button type="button" onClick={() => handleRemoveItem(idx)} className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
                <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting || batchItems.length === 0} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md animate-scale-in">
                  {isSubmitting ? <><span className="loading loading-spinner loading-sm"></span> Saving...</> : `Record ${batchItems.length} Wastage Item${batchItems.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          </dialog>
        )}
      </AnimatePresence>
      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title="Wastage Management Report"
            subtitle="All recorded damaged, expired, spoiled, or lost inventory"
            dateRange={
              fromDate && toDate
                ? `${fromDate.toLocaleDateString("en-GB")} to ${toDate.toLocaleDateString("en-GB")}`
                : "All Time"
            }
          >
            <table className="print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ingredient</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Quantity Lost</th>
                  <th>Reason</th>
                  <th>Note</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {printData.map((r) => (
                  <tr key={r._id}>
                    <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "N/A"}</td>
                    <td style={{ fontWeight: "bold" }}>{r.ingredient?.name} ({r.ingredient?.unit})</td>
                    <td>{r.ingredient?.category?.categoryName || "—"}</td>
                    <td style={{ textAlign: "right", color: "red", fontWeight: "bold" }}>−{Math.abs(r.adjustment)}</td>
                    <td>{r.reason}</td>
                    <td>{r.note || "—"}</td>
                    <td>{r.createdBy?.name || "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintReportTemplate>
        )}
      </div>

    </div>
  );
};

export default WastagePage;
