"use client";

import React, { useState, useContext, useMemo } from "react";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus, FiCheckCircle, FiXCircle, FiList } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useResortServiceCategories from "@/hooks/useResortServiceCategories";
import { AuthContext } from "@/providers/AuthProvider";

const INITIAL_FORM_DATA = {
  categoryName: "",
  status: "Active"
};

const ResortServiceCategoriesPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { categories, totalPages, totalItems, isLoading, refetch } = useResortServiceCategories(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  const openModal = (catToEdit = null) => {
    if (catToEdit) {
      setEditId(catToEdit._id);
      setFormData({
        categoryName: catToEdit.categoryName || "",
        status: catToEdit.status || "Active"
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

  const handleAddOrEditCategory = async () => {
    if (!formData.categoryName || !formData.categoryName.trim()) {
      Swal.fire({
        title: "Validation Error",
        text: "Please provide the category name.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      categoryName: formData.categoryName.trim(),
    };

    try {
      if (editId) {
        await axiosSecure.put(`/resort-service-category/update/${editId}`, payload);
      } else {
        await axiosSecure.post("/resort-service-category/post", payload);
      }
      await refetch();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Category successfully ${editId ? "updated" : "created"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save category.",
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
      Swal.fire({
        title: "Access Denied",
        text: "You do not have permission to delete categories.",
        icon: "error",
        confirmButtonColor: "#8C5A35",
      });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/resort-service-category/delete/${id}`);
          await refetch();
          Swal.fire({
            title: "Deleted!",
            text: "Category has been deleted.",
            icon: "success",
            confirmButtonColor: "#346E36",
          });
        } catch (error) {
          Swal.fire("Error!", "Failed to delete category.", "error");
        }
      }
    });
  };

  const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  const activeCount = useMemo(() => categories.filter(c => c.status === "Active").length, [categories]);
  const inactiveCount = useMemo(() => categories.filter(c => c.status === "Inactive").length, [categories]);

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      
      <SectionHeader 
        title="Resort Service Categories" 
        subtitle="Manage resort service classifications (e.g., Spa, Tours, Laundry)."
      >
        <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-80 h-12">
          <FiSearch className="text-brand-sage text-lg" />
          <input
            type="text"
            className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
            placeholder="Search category name..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </label>
      </SectionHeader>

      <div className="stats shadow-sm bg-white dark:bg-brand-charcoal w-full mb-8 border border-brand-beige dark:border-brand-beige/20 rounded-2xl overflow-hidden hidden md:flex animate-fade-in">
        <div className="stat place-items-center py-6">
          <div className="stat-figure text-brand-primary bg-brand-primary/10 p-4 rounded-full">
            <FiList className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Total Categories</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-4xl mt-1">{totalItems}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-emerald-500 bg-emerald-500/10 p-4 rounded-full">
            <FiCheckCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Active Categories</div>
          <div className="stat-value text-emerald-600 dark:text-emerald-400 text-4xl mt-1">{activeCount}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-red-500 bg-red-500/10 p-4 rounded-full">
            <FiXCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Inactive Categories</div>
          <div className="stat-value text-red-500 dark:text-red-400 text-4xl mt-1">{inactiveCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
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

        {canPerformAction && (
          <div className="flex gap-2">
            <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10">
              <FiPlus className="text-lg" />
              <span className="uppercase tracking-widest text-xs font-bold">New Category</span>
            </button>
          </div>
        )}
      </div>

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
                    <th className="pl-8 py-5">Category Name</th>
                    <th className="py-5">Status</th>
                    <th className="pr-8 text-center py-5 w-36">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No service categories found.
                        </td>
                      </tr>
                    ) : (
                      categories.map((category) => (
                        <motion.tr
                          key={category._id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm"
                        >
                          <td className="pl-8 py-4 font-bold uppercase tracking-wide">
                            {category.categoryName}
                          </td>
                          <td className="py-4">
                            {category.status === "Active" ? (
                              <span className="badge badge-success bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider">Active</span>
                            ) : (
                              <span className="badge badge-error bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-450 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider">Inactive</span>
                            )}
                          </td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center gap-2">
                              {canPerformAction ? (
                                <>
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openModal(category)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Edit Category">
                                    <FiEdit size={16} />
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(category._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Delete Category">
                                    <FiTrash2 size={16} />
                                  </motion.button>
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

      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Service Category' : 'Create Service Category'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Category Name *</span></label>
                <input
                  type="text"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="e.g. Spa"
                  autoFocus
                />
              </div>

              <div className="form-control w-full p-4 bg-brand-offwhite dark:bg-brand-charcoal/50 border border-brand-beige dark:border-brand-beige/20 rounded-2xl flex flex-row items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest">Active Status</span>
                  <span className="text-[10px] text-brand-sage/80 block mt-1">If inactive, this category will not appear in POS.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.status === "Active"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.checked ? "Active" : "Inactive" })}
                  className="toggle toggle-success border-brand-primary bg-white text-white checked:bg-brand-primary checked:border-brand-primary cursor-pointer" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleAddOrEditCategory} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
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

export default ResortServiceCategoriesPage;
