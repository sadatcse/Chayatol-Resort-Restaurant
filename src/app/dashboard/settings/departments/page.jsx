"use client";

import React, { useState, useEffect, useContext, useCallback } from "react";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useDepartments from "@/hooks/useDepartments";
import { AuthContext } from "@/providers/AuthProvider";

const DepartmentsPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { departments, totalPages, totalItems, isLoading, refetch } = useDepartments(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ department: "" });

  const openModal = (deptToEdit = null) => {
    if (deptToEdit) {
      setEditId(deptToEdit._id);
      setFormData({ department: deptToEdit.department });
    } else {
      setEditId(null);
      setFormData({ department: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
  };

  const handleAddOrEdit = async () => {
    if (!formData.department.trim()) {
      Swal.fire("Error", "Department name is required.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editId) {
        await axiosSecure.put(`/department/update/${editId}`, formData);
      } else {
        await axiosSecure.post("/department/post", formData);
      }
      await refetch();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Department successfully ${editId ? "updated" : "created"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save department.",
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (user?.role !== "admin" && user?.role !== "superadmin") {
      Swal.fire({
        title: "Access Denied",
        text: "You do not have permission to delete departments.",
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
          await axiosSecure.delete(`/department/delete/${id}`);
          Swal.fire({
            title: "Deleted!",
            text: "Department has been deleted.",
            icon: "success",
            confirmButtonColor: "#346E36",
          });
          refetch();
        } catch (error) {
          Swal.fire("Error!", "Failed to delete department.", "error");
        }
      }
    });
  };

  const canPerformAction = user?.role === "admin" || user?.role === "superadmin";

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite font-sans text-brand-charcoal animate-scale-in">
      <SectionHeader 
        title="Department Management" 
        subtitle="Configure organizational departments and structure."
      >
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <label className="input border-brand-beige focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white rounded-full px-5 shadow-sm h-10 w-full sm:w-64">
            <FiSearch className="text-brand-sage" />
            <input
              type="text"
              className="grow placeholder-brand-sage text-brand-charcoal text-sm"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
          
          {canPerformAction && (
            <button 
              onClick={() => openModal()} 
              className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10"
            >
              <FiPlus className="text-lg" />
              <span className="uppercase tracking-widest text-xs font-bold">New Department</span>
            </button>
          )}
        </div>
      </SectionHeader>

      <div className="flex justify-between items-center text-xs font-bold text-brand-sage uppercase tracking-widest mb-4 px-2">
        <div className="flex items-center gap-3">
          <span>Display</span>
          <select
            value={itemsPerPage}
            className="select select-bordered select-xs bg-white text-brand-charcoal rounded-md border-brand-beige focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-8 px-2"
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
        </div>
        <span>Total Records: {totalItems}</span>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden"
      >
        <div className="p-0">
          {isLoading ? (
            <div className="p-6">
              <MtableLoading />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-brand-offwhite text-brand-charcoal font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige">
                  <tr>
                    <th className="pl-8 py-5 w-24">#</th>
                    <th className="py-5">Department Name</th>
                    <th className="py-5">Created At</th>
                    <th className="pr-8 py-5 text-center w-32">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white">
                          No departments found.
                        </td>
                      </tr>
                    ) : (
                      departments.map((dept, index) => (
                        <motion.tr 
                          key={dept._id} 
                          layout 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          exit={{ opacity: 0 }} 
                          className="hover:bg-brand-offwhite/50 transition-colors border-b border-brand-beige last:border-none bg-white text-brand-charcoal text-sm"
                        >
                          <td className="pl-8 py-4 font-bold text-brand-sage">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="py-4 font-bold uppercase tracking-wide text-brand-primary">
                            {dept.department}
                          </td>
                          <td className="py-4 font-mono text-xs text-brand-dark-grey">
                            {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center gap-2">
                              {canPerformAction ? (
                                <>
                                  <motion.button 
                                    whileHover={{ scale: 1.1 }} 
                                    whileTap={{ scale: 0.9 }} 
                                    onClick={() => openModal(dept)} 
                                    className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" 
                                    title="Edit Department"
                                  >
                                    <FiEdit size={16} />
                                  </motion.button>
                                  <motion.button 
                                    whileHover={{ scale: 1.1 }} 
                                    whileTap={{ scale: 0.9 }} 
                                    onClick={() => handleDelete(dept._id)} 
                                    className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" 
                                    title="Delete Department"
                                  >
                                    <FiTrash2 size={16} />
                                  </motion.button>
                                </>
                              ) : (
                                <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite">Restricted</div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>

              <div className="p-5 border-t border-brand-beige bg-brand-offwhite/30 flex justify-center mt-auto">
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

      {/* Modal */}
      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige bg-brand-offwhite">
              <h3 className="font-bold text-lg text-brand-black uppercase tracking-widest">
                {editId ? 'Update Department' : 'Create Department'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal hover:bg-brand-beige">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8">
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">
                    Department Name
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ department: e.target.value })}
                  className="input border-brand-beige focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white text-brand-charcoal"
                  placeholder="e.g. Human Resources"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige bg-brand-offwhite">
              <button 
                onClick={closeModal} 
                className="btn btn-ghost hover:bg-brand-beige text-brand-charcoal font-bold uppercase tracking-widest text-xs px-6"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddOrEdit} 
                className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" 
                disabled={isSubmitting}
              >
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

export default DepartmentsPage;
