"use client";

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from "react";
import { FiEdit, FiSearch, FiSliders, FiBell, FiEye, FiX, FiCheckCircle, FiXCircle, FiGrid } from "react-icons/fi";
import { MdEditNote } from "react-icons/md";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import useStandardPrint from "@/hooks/useStandardPrint";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useStocks from "@/hooks/useStocks";
import useIngredientCategories from "@/hooks/useIngredientCategories";
import { AuthContext } from "@/providers/AuthProvider";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

// ---------------- STOCK DETAILS MODAL ----------------
const StockDetailsModal = ({ stock, onClose, axiosSecure }) => {
  const [activeTab, setActiveTab] = useState("details");
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "movement" && stock?._id) {
      const fetchMovements = async () => {
        setIsLoading(true);
        try {
          const { data } = await axiosSecure.get(`/stock/${stock._id}/movements`);
          setMovements(data || []);
        } catch (error) {
          console.error("Failed to fetch stock movements:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchMovements();
    }
  }, [activeTab, stock, axiosSecure]);

  if (!stock) return null;

  return (
    <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
      <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-2xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
        <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
          <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
            Stock Details: {stock.ingredient?.name}
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="flex border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/50 dark:bg-brand-charcoal/30 mb-6 rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-all ${
                activeTab === "details"
                  ? "bg-brand-primary text-white"
                  : "text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab("movement")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-all ${
                activeTab === "movement"
                  ? "bg-brand-primary text-white"
                  : "text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite"
              }`}
            >
              Movement History
            </button>
          </div>

          {activeTab === "details" && (
            <div className="space-y-4 text-sm text-brand-charcoal dark:text-brand-offwhite/80">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest">SKU / Stock Code</span>
                  <span className="text-sm font-semibold font-mono">{stock.ingredient?.sku || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest">Measurement Unit</span>
                  <span className="text-sm font-semibold font-mono">{stock.unit}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest">Current Quantity</span>
                  <span className="text-lg font-bold text-brand-primary dark:text-brand-sage">{stock.quantityInStock} {stock.unit}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest">Alert Trigger Threshold</span>
                  <span className="text-sm font-semibold">{stock.ingredient?.stockAlert || 0} {stock.unit}</span>
                </div>
              </div>
              <div>
                <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest">Category</span>
                <span className="text-sm font-semibold">{stock.ingredient?.category?.categoryName || "N/A"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest">Last Update Time</span>
                <span className="text-sm font-semibold font-mono">{new Date(stock.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          )}

          {activeTab === "movement" && (
            <div className="overflow-x-auto max-h-[40vh] border border-brand-beige dark:border-brand-beige/25 rounded-2xl overflow-y-auto">
              {isLoading ? (
                <MtableLoading />
              ) : (
                <table className="table table-sm w-full">
                  <thead className="bg-brand-primary text-white font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Before</th>
                      <th className="p-3">After</th>
                      <th className="p-3">Adj.</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length > 0 ? (
                      movements.map((m) => (
                        <tr key={m._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 text-xs font-medium">
                          <td className="p-3 font-mono">{new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-3 font-mono">{m.beforeQuantity}</td>
                          <td className="p-3 font-mono">{m.afterQuantity}</td>
                          <td className={`p-3 font-mono font-bold ${m.adjustment >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                            {m.adjustment > 0 ? `+${m.adjustment}` : m.adjustment}
                          </td>
                          <td className="p-3 font-semibold text-brand-primary dark:text-brand-sage">{m.createdBy?.name || "System"}</td>
                          <td className="p-3 text-brand-sage max-w-xs truncate" title={m.note}>{m.note}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-brand-sage font-semibold uppercase tracking-wider text-xs">
                          No stock logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
          <button onClick={onClose} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Close</button>
        </div>
      </div>
    </dialog>
  );
};

// ---------------- UPDATE STOCK ALERT MODAL ----------------
const UpdateStockAlertModal = ({ stock, onClose, onSuccess, axiosSecure }) => {
  const [newAlert, setNewAlert] = useState(stock.ingredient?.stockAlert || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newAlert === "" || isNaN(newAlert) || Number(newAlert) < 0) {
      Swal.fire({ title: "Validation Error", text: "Alert quantity must be a non-negative number.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }
    setIsSubmitting(true);
    try {
      await axiosSecure.put(`/stock/ingredient/${stock.ingredient._id}/alert`, { newStockAlert: Number(newAlert) });
      Swal.fire({ title: "Success!", text: "Stock alert quantity threshold updated.", icon: "success", confirmButtonColor: "#346E36" });
      onSuccess();
      onClose();
    } catch (error) {
      Swal.fire({ title: "Error!", text: error.response?.data?.message || "Could not update stock alert trigger level.", icon: "error", confirmButtonColor: "#346E36" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
      <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
        <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
          <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">Update Stock Alert</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-4">
            <div className="form-control w-full">
              <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Alert Quantity Level ({stock.unit}) *</span></label>
              <input
                type="number"
                value={newAlert}
                onChange={(e) => setNewAlert(e.target.value)}
                className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                required
              />
              <span className="text-[10px] text-brand-sage/80 block mt-2">Trigger alert warnings when the ingredient stock level falls below this number.</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
            <button type="button" onClick={onClose} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
            <button type="submit" className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : "Save Alert"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

// ---------------- UPDATE STOCK ADJUSTMENT MODAL ----------------
const UpdateStockAdjustmentModal = ({ stock, onClose, onSuccess, axiosSecure }) => {
  const [physicalQuantity, setPhysicalQuantity] = useState(stock.quantityInStock || 0);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (physicalQuantity == null || physicalQuantity === "" || isNaN(physicalQuantity) || Number(physicalQuantity) < 0) {
      Swal.fire({ title: "Validation Error", text: "Physical quantity must be a non-negative number.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }

    setIsSubmitting(true);
    try {
      await axiosSecure.put(`/stock/adjust`, {
        stockId: stock._id,
        newQuantity: Number(physicalQuantity),
        note: note.trim()
      });
      Swal.fire({ title: "Success!", text: "Stock adjustments successfully logged.", icon: "success", confirmButtonColor: "#346E36" });
      onSuccess();
      onClose();
    } catch (error) {
      Swal.fire({ title: "Error!", text: error.response?.data?.message || "Could not apply manual stock adjustments.", icon: "error", confirmButtonColor: "#346E36" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
      <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
        <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
          <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">Stock Count Adjustment</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-0">
          <div className="p-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Current Stock ({stock.unit})</span></label>
                <input type="text" value={stock.quantityInStock} className="input input-bordered bg-brand-offwhite/50 border-brand-beige dark:border-brand-beige/20 rounded-xl text-brand-sage font-mono" disabled />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Actual Count *</span></label>
                <input
                  type="number"
                  step="any"
                  value={physicalQuantity}
                  onChange={(e) => setPhysicalQuantity(e.target.value)}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                  required
                />
              </div>
            </div>
            <div className="form-control w-full">
              <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Adjustment Reason Note</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="textarea textarea-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-20"
                placeholder="e.g., Damaged item deduction, weekend physical audit..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
            <button type="button" onClick={onClose} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
            <button type="submit" className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Adjusting...
                </>
              ) : "Adjust Count"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

// ---------------- BULK STOCK ADJUSTMENT MODAL ----------------
const BulkStockAdjustmentModal = ({ isOpen, onClose, onSuccess, ingredients, categories, axiosSecure }) => {
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [physicalQuantity, setPhysicalQuantity] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredIngredients = ingredients.filter(
    (i) => i.isActive && (!selectedCategory || (i.category?._id || i.category) === selectedCategory)
  );

  const selectedIngredient = ingredients.find((i) => i._id === selectedIngredientId);

  const handleAddItem = () => {
    if (!selectedIngredientId) {
      return Swal.fire({ title: "Validation Error", text: "Please select an ingredient.", icon: "warning", confirmButtonColor: "#346E36" });
    }
    if (physicalQuantity === "" || isNaN(physicalQuantity) || Number(physicalQuantity) < 0) {
      return Swal.fire({ title: "Validation Error", text: "Quantity must be a positive number.", icon: "warning", confirmButtonColor: "#346E36" });
    }
    if (items.some(item => item.stockId === selectedIngredientId)) {
      return Swal.fire({ title: "Validation Error", text: "This item is already added to the batch list.", icon: "warning", confirmButtonColor: "#346E36" });
    }

    setItems([
      ...items,
      {
        stockId: selectedIngredient._id,
        name: selectedIngredient.name,
        unit: selectedIngredient.unit,
        newQuantity: Number(physicalQuantity),
        note: note.trim() || "Manual adjustment count check."
      }
    ]);

    setSelectedIngredientId("");
    setPhysicalQuantity("");
    setNote("");
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      return Swal.fire({ title: "Validation Error", text: "Please add at least one item to the adjustment sheet.", icon: "warning", confirmButtonColor: "#346E36" });
    }

    setIsSubmitting(true);
    try {
      await axiosSecure.put(`/stock/adjust`, { items });
      Swal.fire({ title: "Success!", text: "All stock adjustments successfully logged.", icon: "success", confirmButtonColor: "#346E36" });
      onSuccess();
      onClose();
    } catch (error) {
      Swal.fire({ title: "Error!", text: error.response?.data?.message || "Could not apply manual stock adjustments.", icon: "error", confirmButtonColor: "#346E36" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
      <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-2xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
        <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
          <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">Bulk Stock Adjustment</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-brand-offwhite/50 dark:bg-brand-charcoal/30 p-4 rounded-xl border border-brand-beige dark:border-brand-beige/10 space-y-4">
            <h4 className="text-xs font-bold text-brand-sage uppercase tracking-wider">Add Item to Adjust</h4>
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
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Actual Count *</span></label>
                <input
                  type="number"
                  step="any"
                  value={physicalQuantity}
                  onChange={(e) => setPhysicalQuantity(e.target.value)}
                  className="input input-bordered border-brand-primary focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                  placeholder={selectedIngredient ? `in ${selectedIngredient.unit}` : "Qty"}
                />
              </div>
              <div className="form-control sm:col-span-2">
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Adjustment Note</span></label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input input-bordered border-brand-primary focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="e.g. Audit check"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={handleAddItem} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full px-6 shadow-sm">
                Add to List
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-brand-sage uppercase tracking-wider">Adjustment Sheet ({items.length} items)</h4>
            <div className="border border-brand-beige dark:border-brand-beige/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="table table-compact w-full text-xs">
                <thead className="bg-brand-offwhite dark:bg-brand-charcoal/80 text-brand-sage uppercase tracking-wider text-[9px]">
                  <tr>
                    <th className="pl-4">Item Name</th>
                    <th className="text-right">New Quantity</th>
                    <th>Note</th>
                    <th className="w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-brand-sage opacity-75">No items added to the list. Use the form above to add items.</td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="border-b border-brand-beige dark:border-brand-beige/5 last:border-none">
                        <td className="pl-4 font-bold">{item.name}</td>
                        <td className="text-right font-mono font-bold">{item.newQuantity} {item.unit}</td>
                        <td>{item.note}</td>
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
          <button type="button" onClick={onClose} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
          <button onClick={handleSubmit} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting || items.length === 0}>
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving Batch...
              </>
            ) : `Adjust ${items.length} Item${items.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </dialog>
  );
};

// ---------------- MAIN COMPONENT ----------------
const StocksPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const { categories: activeCategories } = useIngredientCategories(1, 100, "");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [isExporting, setIsExporting] = useState(false);
  // Standardize Print hook integration
  const {
    printData,
    setPrintData,
    printRef,
    handlePrint
  } = useStandardPrint({
    documentTitle: "Current_Stock_Levels",
    onAfterPrint: () => setIsExporting(false)
  });

  const fetchAllStocksForExport = async () => {
    try {
      const params = new URLSearchParams({
        page: 1,
        limit: 99999,
      });
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
      if (selectedCategory) params.append("category", selectedCategory);
      if (showLowStockOnly) params.append("lowStock", "true");

      const response = await axiosSecure.get(`/stock/paginated?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch all stock for export:", error);
      return [];
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllStocksForExport();
      const formatted = data.map(item => {
        const isLow = item.quantityInStock < (item.ingredient?.stockAlert || 0);
        const status = item.quantityInStock <= 0 ? "Out of Stock" : (isLow ? "Low Stock" : "In Stock");
        return {
          "Ingredient Name": item.ingredient?.name || "N/A",
          "Category": item.ingredient?.category?.categoryName || "N/A",
          "Purchase Unit": item.unit || "N/A",
          "SKU": item.ingredient?.sku || "N/A",
          "Alert Level": item.ingredient?.stockAlert || 0,
          "Current Quantity": item.quantityInStock,
          "Status": status
        };
      });
      exportToExcel(formatted, "Current_Stock_Levels");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllStocksForExport();
      const formatted = data.map(item => {
        const isLow = item.quantityInStock < (item.ingredient?.stockAlert || 0);
        const status = item.quantityInStock <= 0 ? "Out of Stock" : (isLow ? "Low Stock" : "In Stock");
        return {
          "Ingredient Name": item.ingredient?.name || "N/A",
          "Category": item.ingredient?.category?.categoryName || "N/A",
          "Purchase Unit": item.unit || "N/A",
          "SKU": item.ingredient?.sku || "N/A",
          "Alert Level": item.ingredient?.stockAlert || 0,
          "Current Quantity": item.quantityInStock,
          "Status": status
        };
      });
      exportToCsv(formatted, "Current_Stock_Levels");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintReport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllStocksForExport();
      setPrintData(data);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  const { stocks, totalPages, totalItems, totalCount, lowStockCount, outOfStockCount, isLoading, refetch } = useStocks(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    selectedCategory,
    showLowStockOnly
  );

  const [selectedStock, setSelectedStock] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        const [ingRes, catRes] = await Promise.all([
          axiosSecure.get("/ingredient"),
          axiosSecure.get("/ingredient-category"),
        ]);
        setIngredients(ingRes.data || []);
        setCategories(catRes.data || []);
      } catch (err) {
        console.error("Failed to fetch prerequisites for bulk stock adjust:", err);
      }
    };
    fetchPrerequisites();
  }, [axiosSecure]);

  const handleOpenDetails = (stock) => {
    setSelectedStock(stock);
    setIsDetailsOpen(true);
  };

  const handleOpenAlert = (stock) => {
    setSelectedStock(stock);
    setIsAlertOpen(true);
  };

  const handleOpenAdjustment = (stock) => {
    setSelectedStock(stock);
    setIsAdjustmentOpen(true);
  };

  const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      
      {/* Header & Inline Search */}
      <SectionHeader 
        title="Current Stock Levels" 
        subtitle="Audit ingredient quantities, log manual adjustments, and configure trigger alerts."
      >
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-brand-charcoal dark:text-brand-offwhite font-semibold text-xs tracking-wide cursor-pointer w-full sm:w-48 shadow-sm"
          >
            <option value="">All Categories</option>
            {activeCategories.filter(c => c.isActive).map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.categoryName}</option>
            ))}
          </select>

          {/* Search Box */}
          <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full sm:w-72 h-12">
            <FiSearch className="text-brand-sage text-lg" />
            <input
              type="text"
              className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
              placeholder="Search ingredient name or SKU..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
        </div>
      </SectionHeader>

      {/* Stats Block */}
      <div className="stats shadow-sm bg-white dark:bg-brand-charcoal w-full mb-8 border border-brand-beige dark:border-brand-beige/20 rounded-2xl overflow-hidden hidden md:flex animate-fade-in">
        <div className="stat place-items-center py-6">
          <div className="stat-figure text-brand-primary bg-brand-primary/10 p-4 rounded-full">
            <FiGrid className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Total Ingredients</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-4xl mt-1">{totalCount}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-amber-500 bg-amber-500/10 p-4 rounded-full">
            <FiBell className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Low Stock Items</div>
          <div className="stat-value text-amber-600 dark:text-amber-400 text-4xl mt-1">{lowStockCount}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-red-500 bg-red-500/10 p-4 rounded-full">
            <FiXCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Out of Stock Items</div>
          <div className="stat-value text-red-500 dark:text-red-400 text-4xl mt-1">{outOfStockCount}</div>
        </div>
      </div>

      {/* Filter Tabs & Toggle Bar */}
      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4 animate-fade-in">
        <div className="flex items-center gap-3 text-xs font-bold text-brand-sage uppercase tracking-widest">
          <span>Display</span>
          <select
            value={itemsPerPage}
            className="select select-bordered select-xs bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige dark:border-brand-beige/20 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-8 px-2"
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="50">50</option>
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
            <button
              onClick={() => setIsBulkAdjustOpen(true)}
              className="btn btn-sm rounded-full gap-2 px-6 h-10 border-none shadow-sm bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <MdEditNote className="text-lg" />
              <span className="uppercase tracking-widest text-[10px] font-bold">Bulk Adjust</span>
            </button>
          )}
          <button
            onClick={() => {
              setShowLowStockOnly(!showLowStockOnly);
              setCurrentPage(1);
            }}
            className={`btn btn-sm rounded-full gap-2 px-6 h-10 border-none shadow-sm transition-all cursor-pointer ${
              showLowStockOnly 
                ? "bg-red-500 text-white hover:bg-red-600" 
                : "bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 hover:bg-brand-primary/20 text-brand-primary dark:text-brand-sage"
            }`}
          >
            <FiSliders className="text-sm" />
            <span className="uppercase tracking-widest text-[10px] font-bold">Low Stock Warning Only</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden"
      >
        <div className="p-0">
          {isLoading ? (
            <div className="p-6">
              <MtableLoading />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige dark:border-brand-beige/20">
                  <tr>
                    <th className="pl-8 py-5">Ingredient Name</th>
                    <th className="py-5">Category</th>
                    <th className="py-5">Purchase Unit</th>
                    <th className="py-5">SKU</th>
                    <th className="py-5">Alert level</th>
                    <th className="py-5">Current Quantity</th>
                    <th className="pr-8 text-center py-5 w-48">Audit Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {stocks.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No stock counts found.
                        </td>
                      </tr>
                    ) : (
                      stocks.map((item) => {
                        const isLow = item.quantityInStock < (item.ingredient?.stockAlert || 0);
                        return (
                          <motion.tr
                            key={item._id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm ${
                              isLow 
                                ? "bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50/70 dark:hover:bg-red-950/20" 
                                : "hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5"
                            }`}
                          >
                            <td className="pl-8 py-4 font-bold uppercase tracking-wide flex items-center gap-2">
                              {item.ingredient?.name}
                              {isLow && (
                                <span className="badge badge-error bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 border-none font-bold text-[9px] px-2 py-1 uppercase tracking-widest gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                                  Low
                                </span>
                              )}
                            </td>
                            <td className="py-4 font-semibold text-brand-sage">
                              {item.ingredient?.category?.categoryName || <span className="text-red-400">N/A</span>}
                            </td>
                            <td className="py-4 font-mono font-medium">
                              {item.unit}
                            </td>
                            <td className="py-4 font-mono font-bold text-brand-primary dark:text-brand-sage">
                              {item.ingredient?.sku}
                            </td>
                            <td className="py-4 font-mono text-brand-sage font-bold">
                              {item.ingredient?.stockAlert || 0}
                            </td>
                            <td className={`py-4 font-mono text-base font-black ${isLow ? "text-red-500" : "text-brand-primary dark:text-brand-sage"}`}>
                              {item.quantityInStock}
                            </td>
                            <td className="pr-8 py-4">
                              <div className="flex justify-center items-center gap-2">
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleOpenDetails(item)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="View Audit Logs">
                                  <FiEye size={16} />
                                </motion.button>
                                {canPerformAction ? (
                                  <>
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleOpenAlert(item)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Adjust Alert level">
                                      <FiBell size={16} />
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleOpenAdjustment(item)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Adjust Physical Quantity">
                                      <FiSliders size={16} />
                                    </motion.button>
                                  </>
                                ) : (
                                  <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite dark:bg-brand-offwhite/5 border-none">Restricted</div>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>

              <div className="p-5 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/30 dark:bg-brand-charcoal/10 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals Dialogs */}
      <AnimatePresence>
        {isDetailsOpen && (
          <StockDetailsModal stock={selectedStock} onClose={() => setIsDetailsOpen(false)} axiosSecure={axiosSecure} />
        )}
        {isAlertOpen && (
          <UpdateStockAlertModal stock={selectedStock} onClose={() => setIsAlertOpen(false)} onSuccess={refetch} axiosSecure={axiosSecure} />
        )}
        {isAdjustmentOpen && (
          <UpdateStockAdjustmentModal stock={selectedStock} onClose={() => setIsAdjustmentOpen(false)} onSuccess={refetch} axiosSecure={axiosSecure} />
        )}
        {isBulkAdjustOpen && (
          <BulkStockAdjustmentModal isOpen={isBulkAdjustOpen} onClose={() => setIsBulkAdjustOpen(false)} onSuccess={refetch} ingredients={ingredients} categories={categories} axiosSecure={axiosSecure} />
        )}
      </AnimatePresence>
      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title="Current Stock Levels Report"
            subtitle={
              selectedCategory
                ? `Category: ${activeCategories.find((c) => c._id === selectedCategory)?.categoryName || ""} ${showLowStockOnly ? " | Low Stock Only" : ""}`
                : `All Categories ${showLowStockOnly ? " | Low Stock Only" : ""}`
            }
            dateRange=""
          >
            <table className="print-table">
              <thead>
                <tr>
                  <th>Ingredient Name</th>
                  <th>Category</th>
                  <th>SKU</th>
                  <th>Purchase Unit</th>
                  <th style={{ textAlign: "center" }}>Alert Level</th>
                  <th style={{ textAlign: "right" }}>Current Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {printData.map((item) => {
                  const isLow = item.quantityInStock < (item.ingredient?.stockAlert || 0);
                  const status = item.quantityInStock <= 0 ? "Out of Stock" : (isLow ? "Low Stock" : "In Stock");
                  return (
                    <tr key={item._id}>
                      <td style={{ fontWeight: "bold" }}>{item.ingredient?.name}</td>
                      <td>{item.ingredient?.category?.categoryName || "N/A"}</td>
                      <td>{item.ingredient?.sku}</td>
                      <td>{item.unit}</td>
                      <td style={{ textAlign: "center" }}>{item.ingredient?.stockAlert || 0}</td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>{item.quantityInStock}</td>
                      <td style={{ color: item.quantityInStock <= 0 ? "red" : (isLow ? "orange" : "green") }}>
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </PrintReportTemplate>
        )}
      </div>

    </div>
  );
};

export default StocksPage;
