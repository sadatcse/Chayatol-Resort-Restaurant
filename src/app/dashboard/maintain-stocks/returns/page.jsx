"use client";

import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from "react";
import { FiX, FiSearch, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { MdUndo, MdKeyboardReturn } from "react-icons/md";
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
import useReturns from "@/hooks/useReturns";
import { AuthContext } from "@/providers/AuthProvider";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

const TYPE_STYLES = {
  return_kitchen: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
  return_room: "bg-teal-100 text-teal-800 dark:bg-teal-950/30 dark:text-teal-400",
};
const TYPE_LABELS = { return_kitchen: "Kitchen Return", return_room: "Room Return" };

const ReturnsPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
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
    documentTitle: "Return_Management_Report",
    onAfterPrint: () => setIsExporting(false)
  });

  const fetchAllReturnsForExport = async () => {
    try {
      const params = new URLSearchParams({ page: 1, limit: 99999 });
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
      if (fromDate) params.append("from", fromDate.toISOString());
      if (toDate) params.append("to", toDate.toISOString());

      const response = await axiosSecure.get(`/stock-ops/return?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch all returns for export:", error);
      return [];
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllReturnsForExport();
      const flatData = [];
      data.forEach(batch => {
        if (batch.items && batch.items.length > 0) {
          batch.items.forEach(item => {
            flatData.push({
              createdAt: batch.createdAt,
              type: batch.type,
              kitchenName: batch.kitchenName,
              roomNumber: batch.roomNumber,
              createdBy: batch.createdBy,
              ingredient: item.ingredient,
              adjustment: item.adjustment,
              note: item.note
            });
          });
        }
      });

      const formatted = flatData.map(r => ({
        "Return Date": r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "N/A",
        "Ingredient": r.ingredient?.name || "N/A",
        "SKU": r.ingredient?.sku || "N/A",
        "Category": r.ingredient?.category?.categoryName || "N/A",
        "Quantity Returned": r.adjustment,
        "Unit": r.ingredient?.unit || "N/A",
        "Type": r.type === "return_kitchen" ? "Kitchen Return" : "Room Return",
        "Location": r.type === "return_kitchen" ? (r.kitchenName || "—") : `Room ${r.roomNumber || "—"}`,
        "Notes": r.note || "",
        "Recorded By": r.createdBy?.name || "System"
      }));
      exportToExcel(formatted, "Return_Management_Report");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllReturnsForExport();
      const flatData = [];
      data.forEach(batch => {
        if (batch.items && batch.items.length > 0) {
          batch.items.forEach(item => {
            flatData.push({
              createdAt: batch.createdAt,
              type: batch.type,
              kitchenName: batch.kitchenName,
              roomNumber: batch.roomNumber,
              createdBy: batch.createdBy,
              ingredient: item.ingredient,
              adjustment: item.adjustment,
              note: item.note
            });
          });
        }
      });

      const formatted = flatData.map(r => ({
        "Return Date": r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "N/A",
        "Ingredient": r.ingredient?.name || "N/A",
        "SKU": r.ingredient?.sku || "N/A",
        "Category": r.ingredient?.category?.categoryName || "N/A",
        "Quantity Returned": r.adjustment,
        "Unit": r.ingredient?.unit || "N/A",
        "Type": r.type === "return_kitchen" ? "Kitchen Return" : "Room Return",
        "Location": r.type === "return_kitchen" ? (r.kitchenName || "—") : `Room ${r.roomNumber || "—"}`,
        "Notes": r.note || "",
        "Recorded By": r.createdBy?.name || "System"
      }));
      exportToCsv(formatted, "Return_Management_Report");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintReport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllReturnsForExport();
      const flatData = [];
      data.forEach(batch => {
        if (batch.items && batch.items.length > 0) {
          batch.items.forEach(item => {
            flatData.push({
              _id: item._id,
              createdAt: batch.createdAt,
              type: batch.type,
              kitchenName: batch.kitchenName,
              roomNumber: batch.roomNumber,
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

  const { records, totalPages, totalItems, isLoading, refetch } = useReturns(
    currentPage, itemsPerPage, debouncedSearchTerm, fromDate, toDate
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customKitchen, setCustomKitchen] = useState("");
  const [formData, setFormData] = useState({
    ingredientId: "", quantity: "", returnType: "return_kitchen",
    kitchenName: "", roomNumber: "", note: "", date: new Date(),
  });

  const fetchPrerequisites = useCallback(async () => {
    try {
      const [ingRes, catRes, roomRes, kitchenRes] = await Promise.all([
        axiosSecure.get("/ingredient"),
        axiosSecure.get("/ingredient-category"),
        axiosSecure.get("/room"),
        axiosSecure.get("/kitchen"),
      ]);
      setIngredients(ingRes.data || []);
      setCategories(catRes.data || []);
      const roomData = Array.isArray(roomRes.data) ? roomRes.data : roomRes.data?.data || [];
      setRooms(roomData);
      const kitchenList = kitchenRes.data || [];
      setKitchens(kitchenList);
      if (kitchenList.length === 1) {
        setFormData((p) => ({ ...p, kitchenName: kitchenList[0].name }));
      }
    } catch (err) { console.error("Failed to fetch prerequisites:", err); }
  }, [axiosSecure]);

  useEffect(() => { fetchPrerequisites(); }, [fetchPrerequisites]);

  const openModal = () => {
    setFormData({
      ingredientId: "",
      quantity: "",
      returnType: "return_kitchen",
      kitchenName: kitchens.length === 1 ? kitchens[0].name : "",
      roomNumber: "",
      note: "",
      date: new Date()
    });
    setSelectedCategory(""); setCustomKitchen("");
    setIsModalOpen(true);
  };

  const filteredIngredients = ingredients.filter(
    (i) => i.isActive && (!selectedCategory || (i.category?._id || i.category) === selectedCategory)
  );
  const selectedIngredient = ingredients.find((i) => i._id === formData.ingredientId);
  const effectiveKitchen = formData.kitchenName === "Other" ? customKitchen : formData.kitchenName;

  const handleSubmit = async () => {
    if (!formData.ingredientId) return Swal.fire({ title: "Validation Error", text: "Please select an ingredient.", icon: "warning", confirmButtonColor: "#346E36" });
    if (!formData.quantity || Number(formData.quantity) <= 0) return Swal.fire({ title: "Validation Error", text: "Quantity must be greater than zero.", icon: "warning", confirmButtonColor: "#346E36" });
    if (formData.returnType === "return_kitchen" && !effectiveKitchen?.trim()) return Swal.fire({ title: "Validation Error", text: "Kitchen name is required.", icon: "warning", confirmButtonColor: "#346E36" });
    if (formData.returnType === "return_room" && !formData.roomNumber?.trim()) return Swal.fire({ title: "Validation Error", text: "Room number is required.", icon: "warning", confirmButtonColor: "#346E36" });

    setIsSubmitting(true);
    try {
      await axiosSecure.post("/stock-ops/return", {
        ingredientId: formData.ingredientId,
        quantity: Number(formData.quantity),
        returnType: formData.returnType,
        kitchenName: formData.returnType === "return_kitchen" ? effectiveKitchen?.trim() : undefined,
        roomNumber: formData.returnType === "return_room" ? formData.roomNumber.trim() : undefined,
        note: formData.note,
        date: formData.date?.toISOString(),
      });
      await refetch();
      setIsModalOpen(false);
      Swal.fire({ title: "Return Recorded", text: "Stock has been restored successfully.", icon: "success", confirmButtonColor: "#346E36" });
    } catch (err) {
      Swal.fire({ title: "Failed", text: err.response?.data?.message || "Could not record return.", icon: "error", confirmButtonColor: "#346E36" });
    } finally { setIsSubmitting(false); }
  };

  const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <SectionHeader title="Return Management" subtitle="Record items returned from kitchen or rooms. Returned quantities are automatically added back to stock.">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          {/* Month selector dropdown */}
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-xs font-semibold px-4 w-full sm:w-36 text-brand-charcoal dark:text-brand-offwhite shadow-sm border-brand-beige shrink-0"
          >
            <option value="all">All Months</option>
            {monthOptions.map((opt) => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                {opt.label}
              </option>
            ))}
            <option value="custom" disabled={selectedMonth !== "custom"}>Custom Range</option>
          </select>

          <DatePicker selected={fromDate} onChange={(d) => { setFromDate(d); setCurrentPage(1); }} dateFormat="dd/MM/yyyy" placeholderText="From Date" isClearable
            className="input input-bordered border-brand-primary focus:outline-none bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-xs font-semibold px-4 w-full sm:w-36 text-center text-brand-charcoal dark:text-brand-offwhite shadow-sm" />
          <DatePicker selected={toDate} onChange={(d) => { setToDate(d); setCurrentPage(1); }} dateFormat="dd/MM/yyyy" placeholderText="To Date" isClearable
            className="input input-bordered border-brand-primary focus:outline-none bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-xs font-semibold px-4 w-full sm:w-36 text-center text-brand-charcoal dark:text-brand-offwhite shadow-sm" />
          <label className="input input-bordered border-brand-primary focus:outline-none flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm w-full sm:w-64 h-12">
            <FiSearch className="text-brand-sage text-lg" />
            <input type="text" className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none text-sm"
              placeholder="Search ingredient or location..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </label>
        </div>
      </SectionHeader>

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
            <button onClick={openModal} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10 cursor-pointer">
              <MdUndo className="text-lg" />
              <span className="uppercase tracking-widest text-xs font-bold">Record Return</span>
            </button>
          )}
        </div>
      </div>

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
                  <th className="py-5">Type</th>
                  <th className="py-5">Location</th>
                  <th className="py-5">Items Summary</th>
                  <th className="py-5 text-right">Total Qty Returned</th>
                  <th className="pr-8 py-5">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {records.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">No return records found.</td></tr>
                  ) : (
                    records.map((r) => {
                      const totalQty = r.items?.reduce((sum, item) => sum + Math.abs(item.adjustment), 0) || 0;
                      const hasMultiple = r.items?.length > 1;
                      const firstItem = r.items?.[0];
                      const firstIngredientName = firstItem?.ingredient?.name || "N/A";
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
                              <span className={`badge border-none font-bold text-[9px] px-3 py-2.5 uppercase tracking-wider ${TYPE_STYLES[r.type]}`}>
                                {TYPE_LABELS[r.type]}
                              </span>
                            </td>
                            <td className="py-4 text-brand-charcoal dark:text-brand-offwhite/70 text-xs font-semibold">
                              {r.type === "return_kitchen" ? (r.kitchenName || "—") : `Room ${r.roomNumber || "—"}`}
                            </td>
                            <td className="py-4 font-bold uppercase tracking-wide">
                              {firstIngredientName}
                              {hasMultiple && (
                                <span className="ml-2 text-xs font-normal text-brand-primary dark:text-brand-sage bg-brand-primary/5 dark:bg-brand-primary/10 px-2 py-0.5 rounded-full lowercase">
                                  + {r.items.length - 1} more items
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-right font-mono font-black text-brand-primary dark:text-brand-sage text-base pr-8">+{totalQty}</td>
                            <td className="pr-8 py-4 font-semibold text-brand-primary dark:text-brand-sage text-xs">{r.createdBy?.name || "System"}</td>
                          </motion.tr>
                          {isExpanded && (
                            <tr className="bg-brand-primary/5 dark:bg-brand-primary/5">
                              <td colSpan="7" className="pl-12 pr-8 py-3">
                                <div className="border border-brand-beige dark:border-brand-beige/20 rounded-xl overflow-hidden shadow-inner bg-white dark:bg-brand-charcoal/50 p-4">
                                  <h4 className="text-xs font-bold text-brand-sage uppercase tracking-wider mb-3">Batch Return Details</h4>
                                  <table className="table table-compact w-full text-xs">
                                    <thead className="bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-sage uppercase tracking-wider text-[9px]">
                                      <tr>
                                        <th className="pl-4 py-2">Ingredient</th>
                                        <th className="py-2">Category</th>
                                        <th className="py-2 text-right">Quantity Returned</th>
                                        <th className="py-2 text-right">Current Stock</th>
                                        <th className="pr-4 py-2">Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.items?.map((item) => (
                                        <tr key={item._id} className="border-b border-brand-beige/10 last:border-none">
                                          <td className="pl-4 py-2.5 font-bold uppercase">{item.ingredient?.name} <span className="text-brand-sage font-normal normal-case text-[10px] ml-1">({item.ingredient?.unit})</span></td>
                                          <td className="py-2.5 font-semibold text-brand-sage">{item.ingredient?.category?.categoryName || "—"}</td>
                                          <td className="py-2.5 text-right font-mono font-bold text-brand-primary dark:text-brand-sage">+{Math.abs(item.adjustment)}</td>
                                          <td className="py-2.5 text-right font-mono text-brand-sage">{item.stock?.quantityInStock} {item.ingredient?.unit}</td>
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

      {/* Return Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
            <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-lg rounded-2xl shadow-2xl border border-brand-beige/20 animate-scale-in">
              <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-primary/10 dark:bg-brand-primary/20">
                <div className="flex items-center gap-3">
                  <MdKeyboardReturn className="text-brand-primary dark:text-brand-sage text-2xl" />
                  <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">Record Return</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="btn btn-sm btn-circle btn-ghost"><FiX size={20} /></button>
              </div>
              <div className="p-8 space-y-5">
                {/* Return Type toggle */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Return Type *</span></label>
                  <div className="flex rounded-xl overflow-hidden border border-brand-beige dark:border-brand-beige/20">
                    {[{ val: "return_kitchen", label: "From Kitchen" }, { val: "return_room", label: "From Room" }].map(({ val, label }) => (
                      <button key={val} type="button" onClick={() => setFormData((p) => ({ ...p, returnType: val, kitchenName: "", roomNumber: "" }))}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${formData.returnType === val ? "bg-brand-primary text-white" : "text-brand-sage hover:bg-brand-offwhite dark:hover:bg-brand-offwhite/5"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Date *</span></label>
                  <DatePicker selected={formData.date} onChange={(d) => setFormData((p) => ({ ...p, date: d }))} dateFormat="dd/MM/yyyy"
                    className="input input-bordered border-brand-primary focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" />
                </div>

                {formData.returnType === "return_kitchen" && (
                  <>
                    <div className="form-control w-full">
                      <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Kitchen Name *</span></label>
                      <select 
                        value={formData.kitchenName} 
                        onChange={(e) => setFormData((p) => ({ ...p, kitchenName: e.target.value }))}
                        className="select select-bordered border-brand-primary focus:outline-none rounded-xl text-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite"
                        disabled={kitchens.length === 1}
                      >
                        {kitchens.length === 0 ? (
                          <option value="" disabled>No kitchens configured</option>
                        ) : (
                          <>
                            <option value="" disabled>Select Kitchen</option>
                            {kitchens.map((k) => <option key={k._id} value={k.name}>{k.name}</option>)}
                            <option value="Other">Other</option>
                          </>
                        )}
                      </select>
                    </div>
                    {formData.kitchenName === "Other" && (
                      <div className="form-control w-full">
                        <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Specify Kitchen *</span></label>
                        <input type="text" value={customKitchen} onChange={(e) => setCustomKitchen(e.target.value)}
                          className="input input-bordered border-brand-primary focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" placeholder="Kitchen name..." />
                      </div>
                    )}
                  </>
                )}

                {formData.returnType === "return_room" && (
                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Room Number *</span></label>
                    <select value={formData.roomNumber} onChange={(e) => setFormData((p) => ({ ...p, roomNumber: e.target.value }))}
                      className="select select-bordered border-brand-primary focus:outline-none rounded-xl text-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite">
                      <option value="" disabled>Select Room</option>
                      {rooms.map((r) => <option key={r._id} value={r.roomNumber}>Room {r.roomNumber}{r.roomName ? ` — ${r.roomName}` : ""}</option>)}
                    </select>
                  </div>
                )}

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Filter by Category</span></label>
                  <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setFormData((p) => ({ ...p, ingredientId: "" })); }}
                    className="select select-bordered border-brand-primary focus:outline-none rounded-xl text-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite">
                    <option value="">All Categories</option>
                    {categories.filter((c) => c.isActive).map((c) => <option key={c._id} value={c._id}>{c.categoryName}</option>)}
                  </select>
                </div>
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Ingredient *</span></label>
                  <select value={formData.ingredientId} onChange={(e) => setFormData((p) => ({ ...p, ingredientId: e.target.value }))}
                    className="select select-bordered border-brand-primary focus:outline-none rounded-xl text-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite">
                    <option value="" disabled>Select Ingredient</option>
                    {filteredIngredients.map((i) => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                  </select>
                </div>
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Quantity {selectedIngredient ? `(${selectedIngredient.unit})` : ""} *</span></label>
                  <input type="number" step="any" min="0.01" value={formData.quantity} onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value }))}
                    className="input input-bordered border-brand-primary focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono" placeholder="e.g. 5" />
                </div>
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Notes</span></label>
                  <textarea value={formData.note} onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                    className="textarea textarea-bordered border-brand-primary focus:outline-none w-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite h-16" placeholder="Reason for return..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
                <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md">
                  {isSubmitting ? <><span className="loading loading-spinner loading-sm"></span> Saving...</> : "Record Return"}
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
            title="Return Management Report"
            subtitle="All returned ingredients list"
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
                  <th style={{ textAlign: "right" }}>Quantity Returned</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {printData.map((r) => (
                  <tr key={r._id}>
                    <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "N/A"}</td>
                    <td style={{ fontWeight: "bold" }}>{r.ingredient?.name} ({r.ingredient?.unit})</td>
                    <td>{r.ingredient?.category?.categoryName || "—"}</td>
                    <td style={{ textAlign: "right", color: "#346E36", fontWeight: "bold" }}>+{r.adjustment}</td>
                    <td>{TYPE_LABELS[r.type]}</td>
                    <td>{r.type === "return_kitchen" ? (r.kitchenName || "—") : `Room ${r.roomNumber || "—"}`}</td>
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

export default ReturnsPage;
