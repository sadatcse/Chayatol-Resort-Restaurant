"use client";

import React, { useState, useEffect, useContext, useMemo } from "react";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus, FiCheckCircle, FiXCircle, FiGrid, FiAlertCircle } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useIngredients from "@/hooks/useIngredients";
import { AuthContext } from "@/providers/AuthProvider";
import usePagePermission from "@/hooks/usePagePermission";

const INITIAL_FORM_DATA = {
  name: "",
  category: "",
  unit: "",
  sku: "",
  stockAlert: 0,
  isActive: true
};

const UNITS = [
  "Kg",
  "Ltr",
  "Lbs",
  "Ml",
  "Pcs",
  "Bottle",
  "Can",
  "Jar",
  "Box",
  "Tray",
  "Roll",
  "Sheet",
  "Bag",
  "Slice"
];

const IngredientsPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const { canAdd, canEdit, canDelete } = usePagePermission();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);

  const { ingredients, totalPages, totalItems, totalCount, activeCount, inactiveCount, isLoading, refetch } = useIngredients(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    statusFilter,
    categoryFilter,
    unitFilter,
    lowStockFilter ? "true" : "false"
  );

  const [activeCategories, setActiveCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  // Fetch active categories for dropdown selection
  const loadActiveCategories = async () => {
    try {
      const response = await axiosSecure.get("/ingredient-category");
      setActiveCategories(response.data || []);
    } catch (error) {
      console.error("Error fetching active categories:", error);
    }
  };

  useEffect(() => {
    loadActiveCategories();
  }, [axiosSecure]);

  const openModal = (ingToEdit = null) => {
    loadActiveCategories(); // Refresh list to catch any new active ones
    if (ingToEdit) {
      setEditId(ingToEdit._id);
      setFormData({
        name: ingToEdit.name || "",
        category: ingToEdit.category?._id || ingToEdit.category || "",
        unit: ingToEdit.unit || "",
        sku: ingToEdit.sku || "",
        stockAlert: ingToEdit.stockAlert !== undefined ? ingToEdit.stockAlert : 0,
        isActive: ingToEdit.isActive !== undefined ? ingToEdit.isActive : true
      });
    } else {
      setEditId(null);
      setFormData({ ...INITIAL_FORM_DATA });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
  };

  const handleAddOrEditIngredient = async () => {
    if (editId ? !canEdit : !canAdd) {
      Swal.fire({
        title: "Access Denied",
        text: `You do not have permission to ${editId ? "update" : "create"} ingredient records.`,
        icon: "error",
        confirmButtonColor: "#8C5A35",
      });
      return;
    }

    // 1. Validation: Name
    if (!formData.name || !formData.name.trim()) {
      Swal.fire({
        title: "Validation Error",
        text: "Please provide the ingredient name.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    // 2. Validation: Category
    if (!formData.category) {
      Swal.fire({
        title: "Validation Error",
        text: "Please select a category.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    // 3. Validation: Unit
    if (!formData.unit) {
      Swal.fire({
        title: "Validation Error",
        text: "Please select a purchase unit.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      unit: formData.unit,
      sku: formData.sku?.trim() || "",
      stockAlert: Number(formData.stockAlert) || 0,
      isActive: formData.isActive
    };

    try {
      if (editId) {
        await axiosSecure.put(`/ingredient/update/${editId}`, payload);
      } else {
        await axiosSecure.post("/ingredient/post", payload);
      }
      await refetch();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Ingredient successfully ${editId ? "updated" : "created"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save ingredient record.",
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (!canDelete) {
      Swal.fire({
        title: "Access Denied",
        text: "You do not have permission to delete ingredient records.",
        icon: "error",
        confirmButtonColor: "#8C5A35",
      });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/ingredient/delete/${id}`);
          await refetch();
          Swal.fire({
            title: "Deleted!",
            text: "Ingredient has been deleted.",
            icon: "success",
            confirmButtonColor: "#346E36",
          });
        } catch (error) {
          Swal.fire({
            title: "Action Failed",
            text: error.response?.data?.message || "Failed to delete ingredient.",
            icon: "error",
            confirmButtonColor: "#346E36",
          });
        }
      }
    });
  };



  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      
      {/* Header & Inline Search */}
      <SectionHeader 
        title="Ingredients Stock Manager" 
        subtitle="Maintain register of ingredients, stock codes, purchasing units, and alert thresholds."
      >
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-brand-charcoal dark:text-brand-offwhite font-semibold text-xs tracking-wide cursor-pointer w-full sm:w-48 shadow-sm"
          >
            <option value="">All Categories</option>
            {activeCategories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.categoryName}</option>
            ))}
          </select>

          {/* Search Box */}
          <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full sm:w-72 h-12">
            <FiSearch className="text-brand-sage text-lg" />
            <input
              type="text"
              className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
              placeholder="Search name, SKU, category..."
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
          <div className="stat-figure text-emerald-500 bg-emerald-500/10 p-4 rounded-full">
            <FiCheckCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Active Ingredients</div>
          <div className="stat-value text-emerald-600 dark:text-emerald-400 text-4xl mt-1">{activeCount}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-red-500 bg-red-500/10 p-4 rounded-full">
            <FiXCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Inactive Ingredients</div>
          <div className="stat-value text-red-500 dark:text-red-400 text-4xl mt-1">{inactiveCount}</div>
        </div>
      </div>

      {/* Display selector & Add button */}
      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
        <div className="flex items-center gap-3 text-xs font-bold text-brand-sage uppercase tracking-widest">
          <span>Display</span>
          <select
            value={itemsPerPage}
            className="select select-bordered select-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige dark:border-brand-beige/20 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-8 pl-3 pr-8 w-20 text-xs font-semibold cursor-pointer"
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

        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs font-bold text-brand-sage uppercase tracking-widest">
            <span>Status</span>
            <select
              value={statusFilter}
              className="select select-bordered select-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige dark:border-brand-beige/20 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-8 pl-3 pr-8 w-28 text-xs font-semibold cursor-pointer"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Unit Filter */}
          <div className="flex items-center gap-2 text-xs font-bold text-brand-sage uppercase tracking-widest">
            <span>Unit</span>
            <select
              value={unitFilter}
              className="select select-bordered select-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige dark:border-brand-beige/20 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-8 pl-3 pr-8 w-36 text-xs font-semibold cursor-pointer"
              onChange={(e) => {
                setUnitFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Units</option>
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>

          {/* Low Stock Warning Filter */}
          <button
            onClick={() => {
              setLowStockFilter(!lowStockFilter);
              setCurrentPage(1);
            }}
            className={`btn btn-xs rounded-full gap-1 px-4 h-8 border-none shadow-sm transition-all ${
              lowStockFilter 
                ? "bg-red-500 text-white hover:bg-red-600" 
                : "bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 hover:bg-brand-primary/20 text-brand-primary dark:text-brand-sage"
            }`}
          >
            <FiAlertCircle className="text-sm" />
            <span className="uppercase tracking-widest text-[9px] font-bold">Low Stock Only</span>
          </button>

          {canAdd && (
            <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10 cursor-pointer">
              <FiPlus className="text-lg" />
              <span className="uppercase tracking-widest text-xs font-bold">New Ingredient</span>
            </button>
          )}
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
                    <th className="py-5">Stock Alert</th>
                    <th className="py-5">Status</th>
                    <th className="pr-8 text-center py-5 w-36">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {ingredients.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No ingredients found.
                        </td>
                      </tr>
                    ) : (
                      ingredients.map((item) => (
                        <motion.tr
                          key={item._id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm"
                        >
                          <td className="pl-8 py-4 font-bold uppercase tracking-wide">
                            {item.name}
                          </td>
                          <td className="py-4 font-semibold text-brand-sage">
                            {item.category?.categoryName || <span className="text-red-400">N/A</span>}
                          </td>
                          <td className="py-4 font-mono font-medium">
                            {item.unit}
                          </td>
                          <td className="py-4 font-mono font-bold text-brand-primary dark:text-brand-sage">
                            {item.sku}
                          </td>
                          <td className="py-4 font-mono">
                            {item.stockAlert || 0}
                          </td>
                          <td className="py-4">
                            {item.isActive ? (
                              <span className="badge badge-success bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider">Active</span>
                            ) : (
                              <span className="badge badge-error bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-450 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider">Inactive</span>
                            )}
                          </td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center gap-2">
                              {canEdit || canDelete ? (
                                <>
                                  {canEdit && (
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openModal(item)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Edit Ingredient">
                                      <FiEdit size={16} />
                                    </motion.button>
                                  )}
                                  {canDelete && (
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(item._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Delete Ingredient">
                                      <FiTrash2 size={16} />
                                    </motion.button>
                                  )}
                                </>
                              ) : (
                                <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite dark:bg-brand-offwhite/5 border-none">Restricted</div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
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

      {/* Modal dialog */}
      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-lg rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Ingredient' : 'Create Ingredient'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-5 max-h-[65vh] overflow-y-auto">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Ingredient Name *</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="e.g. Flour"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Category *</span></label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-semibold"
                  >
                    <option value="" disabled>Select category</option>
                    {activeCategories.filter(cat => cat.isActive || cat._id === formData.category).map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.categoryName}{!cat.isActive ? " (Inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Purchase Unit *</span></label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-semibold"
                  >
                    <option value="" disabled>Select unit</option>
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">SKU / Stock Code *</span></label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono uppercase"
                    placeholder="e.g. FLR-001"
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Alert Quantity Threshold</span></label>
                  <input
                    type="number"
                    value={formData.stockAlert}
                    onChange={(e) => setFormData({ ...formData, stockAlert: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                    placeholder="e.g. 5"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="form-control w-full p-4 bg-brand-offwhite dark:bg-brand-charcoal/50 border border-brand-beige dark:border-brand-beige/20 rounded-2xl flex flex-row items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest">Active Status</span>
                  <span className="text-[10px] text-brand-sage/80 block mt-1">Inactive ingredients are excluded from recipe management and stock audits.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="toggle toggle-success border-brand-primary bg-white text-white checked:bg-brand-primary checked:border-brand-primary cursor-pointer" 
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleAddOrEditIngredient} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processing...
                  </>
                ) : (editId ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default IngredientsPage;
