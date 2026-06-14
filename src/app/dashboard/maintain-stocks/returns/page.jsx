"use client";

import React, { useState, useEffect, useContext, useCallback } from "react";
import { FiX, FiSearch } from "react-icons/fi";
import { MdUndo, MdKeyboardReturn } from "react-icons/md";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useReturns from "@/hooks/useReturns";
import { AuthContext } from "@/providers/AuthProvider";

const KITCHENS = ["Main Kitchen", "Bakery", "Butchery", "Pastry Kitchen", "Cold Kitchen", "Other"];

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
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const { records, totalPages, totalItems, isLoading, refetch } = useReturns(
    currentPage, itemsPerPage, debouncedSearchTerm, fromDate, toDate
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customKitchen, setCustomKitchen] = useState("");
  const [formData, setFormData] = useState({
    ingredientId: "", quantity: "", returnType: "return_kitchen",
    kitchenName: "", roomNumber: "", note: "", date: new Date(),
  });

  const fetchPrerequisites = useCallback(async () => {
    try {
      const [ingRes, catRes, roomRes] = await Promise.all([
        axiosSecure.get("/ingredient"),
        axiosSecure.get("/ingredient-category"),
        axiosSecure.get("/room"),
      ]);
      setIngredients(ingRes.data || []);
      setCategories(catRes.data || []);
      const roomData = Array.isArray(roomRes.data) ? roomRes.data : roomRes.data?.data || [];
      setRooms(roomData);
    } catch (err) { console.error("Failed to fetch prerequisites:", err); }
  }, [axiosSecure]);

  useEffect(() => { fetchPrerequisites(); }, [fetchPrerequisites]);

  const openModal = () => {
    setFormData({ ingredientId: "", quantity: "", returnType: "return_kitchen", kitchenName: "", roomNumber: "", note: "", date: new Date() });
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
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
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
        {canPerformAction && (
          <button onClick={openModal} className="btn bg-emerald-600 text-white hover:bg-emerald-700 border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10">
            <MdUndo className="text-lg" />
            <span className="uppercase tracking-widest text-xs font-bold">Record Return</span>
          </button>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden">
        {isLoading ? (
          <div className="p-6"><MtableLoading /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-emerald-600 text-white font-bold uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="pl-8 py-5">Date</th>
                  <th className="py-5">Ingredient</th>
                  <th className="py-5">Category</th>
                  <th className="py-5">Qty Returned</th>
                  <th className="py-5">Type</th>
                  <th className="py-5">Location</th>
                  <th className="pr-8 py-5">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {records.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">No return records found.</td></tr>
                  ) : (
                    records.map((r) => (
                      <motion.tr key={r._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-sm">
                        <td className="pl-8 py-4 font-mono text-xs">{new Date(r.createdAt).toLocaleDateString("en-GB")}</td>
                        <td className="py-4 font-bold uppercase tracking-wide">{r.ingredient?.name} <span className="text-brand-sage font-normal normal-case text-xs ml-1">({r.ingredient?.unit})</span></td>
                        <td className="py-4 text-brand-sage font-semibold text-xs">{r.ingredient?.category?.categoryName || "—"}</td>
                        <td className="py-4 font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">+{r.adjustment}</td>
                        <td className="py-4">
                          <span className={`badge border-none font-bold text-[9px] px-3 py-2.5 uppercase tracking-wider ${TYPE_STYLES[r.type]}`}>
                            {TYPE_LABELS[r.type]}
                          </span>
                        </td>
                        <td className="py-4 text-brand-charcoal dark:text-brand-offwhite/70 text-xs font-semibold">
                          {r.type === "return_kitchen" ? (r.kitchenName || "—") : `Room ${r.roomNumber || "—"}`}
                        </td>
                        <td className="pr-8 py-4 font-semibold text-brand-primary dark:text-brand-sage text-xs">{r.createdBy?.name || "System"}</td>
                      </motion.tr>
                    ))
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
              <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <MdKeyboardReturn className="text-emerald-600 text-2xl" />
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
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${formData.returnType === val ? "bg-emerald-600 text-white" : "text-brand-sage hover:bg-brand-offwhite dark:hover:bg-brand-offwhite/5"}`}>
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
                      <select value={formData.kitchenName} onChange={(e) => setFormData((p) => ({ ...p, kitchenName: e.target.value }))}
                        className="select select-bordered border-brand-primary focus:outline-none rounded-xl text-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite">
                        <option value="" disabled>Select Kitchen</option>
                        {KITCHENS.map((k) => <option key={k} value={k}>{k}</option>)}
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
                <button onClick={handleSubmit} disabled={isSubmitting} className="btn bg-emerald-600 text-white hover:bg-emerald-700 border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md">
                  {isSubmitting ? <><span className="loading loading-spinner loading-sm"></span> Saving...</> : "Record Return"}
                </button>
              </div>
            </div>
          </dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReturnsPage;
