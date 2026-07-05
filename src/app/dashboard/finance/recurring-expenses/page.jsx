"use client";

import React, { useState, useEffect, useContext, useCallback } from "react";
import { FiEdit, FiTrash2, FiX, FiPlus, FiCalendar, FiPlay, FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import usePagePermission from "@/hooks/usePagePermission";

const INITIAL_FORM_DATA = {
  category: "",
  subcategory: "",
  amount: "",
  paymentMethod: "Cash",
  vendor: "",
  description: "",
  frequency: "Monthly",
  startDate: new Date().toISOString().split("T")[0],
  nextDueDate: new Date().toISOString().split("T")[0],
  status: "Active"
};

const RecurringExpensesPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const { canAdd, canEdit, canDelete } = usePagePermission();

  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await axiosSecure.get("/expensecategory");
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, [axiosSecure]);

  // Fetch Templates
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosSecure.get("/finance/recurring");
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure]);

  useEffect(() => {
    fetchCategories();
    fetchTemplates();
  }, [fetchCategories, fetchTemplates]);

  const openModal = (templateToEdit = null) => {
    if (templateToEdit) {
      setEditId(templateToEdit._id);
      setFormData({
        category: templateToEdit.category?._id || templateToEdit.category || "",
        subcategory: templateToEdit.subcategory || "",
        amount: templateToEdit.amount || "",
        paymentMethod: templateToEdit.paymentMethod || "Cash",
        vendor: templateToEdit.vendor || "",
        description: templateToEdit.description || "",
        frequency: templateToEdit.frequency || "Monthly",
        startDate: templateToEdit.startDate ? templateToEdit.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
        nextDueDate: templateToEdit.nextDueDate ? templateToEdit.nextDueDate.split("T")[0] : new Date().toISOString().split("T")[0],
        status: templateToEdit.status || "Active"
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

  const handleFormSubmit = async () => {
    if (!formData.category) {
      Swal.fire("Validation Error", "Please select a category.", "warning");
      return;
    }
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      Swal.fire("Validation Error", "Please provide a valid amount.", "warning");
      return;
    }
    if (!formData.frequency) {
      Swal.fire("Validation Error", "Please select a frequency.", "warning");
      return;
    }
    if (!formData.startDate) {
      Swal.fire("Validation Error", "Please select a start date.", "warning");
      return;
    }
    if (!formData.nextDueDate) {
      Swal.fire("Validation Error", "Please select the next due date.", "warning");
      return;
    }

    if (editId) {
      if (!canEdit) {
        Swal.fire("Restricted", "You do not have permission to edit recurring templates.", "warning");
        return;
      }
    } else {
      if (!canAdd) {
        Swal.fire("Restricted", "You do not have permission to add recurring templates.", "warning");
        return;
      }
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    try {
      if (editId) {
        await axiosSecure.put(`/finance/recurring/${editId}`, payload);
      } else {
        await axiosSecure.post("/finance/recurring", payload);
      }
      await fetchTemplates();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Template successfully ${editId ? "updated" : "created"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save template.",
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (!canDelete) {
      Swal.fire("Restricted", "You do not have permission to delete template records.", "warning");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "This will remove this recurring schedule and stop future triggers!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/finance/recurring/${id}`);
          await fetchTemplates();
          Swal.fire("Deleted!", "Template has been removed.", "success");
        } catch (error) {
          Swal.fire("Error!", "Failed to delete template.", "error");
        }
      }
    });
  };

  const handleTrigger = async (id, name, amount) => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to trigger recurring payments.", "warning");
      return;
    }
    Swal.fire({
      title: "Process Outstanding Bill?",
      text: `Do you want to log an expense of ৳${amount.toLocaleString()} for '${name}' and advance the next due date?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, post it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const { data } = await axiosSecure.post(`/finance/recurring/${id}/trigger`);
          if (data.success) {
            await fetchTemplates();
            Swal.fire({
              title: "Expense Posted!",
              text: `A new expense has been recorded in the ledger. Next due date is now ${new Date(data.template.nextDueDate).toLocaleDateString("en-GB")}.`,
              icon: "success",
              confirmButtonColor: "#346E36",
            });
          }
        } catch (error) {
          Swal.fire("Failed!", error.response?.data?.message || "Failed to trigger recurring payment.", "error");
        }
      }
    });
  };

  const isTemplateOverdue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due <= today;
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <SectionHeader
        title="Recurring Expense Schedules"
        subtitle="Manage routine standing bills, ISP subscriptions, salaries, rent, and utility contracts."
      />

      {/* Info Warning Card */}
      <div className="alert bg-brand-primary/5 border border-brand-primary/20 p-4 rounded-2xl flex items-start gap-3 mb-6">
        <FiAlertCircle className="text-brand-primary text-xl mt-0.5" />
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider text-brand-primary">Automated Bill Previews</h3>
          <p className="text-xs text-brand-sage leading-relaxed mt-0.5">
            Below is the list of active agreements. An entry marked <span className="text-red-500 font-bold">Overdue</span> means the current next due date has arrived. Click <span className="font-bold">Post Now</span> to write the transaction into the general expense ledger and calculate the next billing cycle.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-brand-sage">Standing Templates ({templates.length})</h2>
        {canAdd && (
          <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10 cursor-pointer">
            <FiPlus className="text-lg" />
            <span className="uppercase tracking-widest text-xs font-bold">New Template</span>
          </button>
        )}
      </div>

      {/* Main Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6"><MtableLoading /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige dark:border-brand-beige/20">
                <tr>
                  <th className="pl-6 py-5">Category</th>
                  <th className="py-5">Sub Category</th>
                  <th className="py-5">Frequency</th>
                  <th className="py-5">Amount</th>
                  <th className="py-5">Vendor</th>
                  <th className="py-5">Next Due</th>
                  <th className="py-5">Status</th>
                  <th className="pr-6 text-center py-5 w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase">
                        No recurring templates configured.
                      </td>
                    </tr>
                  ) : (
                    templates.map((template) => {
                      const isOverdue = isTemplateOverdue(template.nextDueDate) && template.status === "Active";
                      return (
                        <motion.tr
                          key={template._id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none text-sm text-brand-charcoal dark:text-brand-offwhite"
                        >
                          <td className="pl-6 py-4 font-bold uppercase text-xs text-brand-primary tracking-wide">
                            {template.category?.name || "Uncategorized"}
                          </td>
                          <td className="py-4 font-medium uppercase text-xs">
                            {template.subcategory || "-"}
                          </td>
                          <td className="py-4 whitespace-nowrap">
                            <span className="badge badge-neutral text-xs font-semibold rounded-md">{template.frequency}</span>
                          </td>
                          <td className="py-4 font-black font-mono">
                            ৳{template.amount.toLocaleString()}
                          </td>
                          <td className="py-4 font-bold uppercase text-xs">
                            {template.vendor || "-"}
                          </td>
                          <td className="py-4 font-mono font-bold whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>{new Date(template.nextDueDate).toLocaleDateString("en-GB")}</span>
                              {isOverdue && (
                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-0.5">● Overdue</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`badge border-none font-bold text-[10px] uppercase px-2.5 py-1 rounded-full ${
                              template.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {template.status}
                            </span>
                          </td>
                          <td className="pr-6 py-4">
                            <div className="flex justify-center items-center gap-1.5">
                               {template.status === "Active" && canEdit && (
                                <button
                                  onClick={() => handleTrigger(template._id, template.subcategory || template.category?.name, template.amount)}
                                  className="btn btn-xs btn-outline border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white rounded-full px-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                  <FiPlay size={10} /> Post Now
                                </button>
                              )}
                              {(canEdit || canDelete) ? (
                                <>
                                  {canEdit && (
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openModal(template)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Edit Template">
                                      <FiEdit size={16} />
                                    </motion.button>
                                  )}
                                  {canDelete && (
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(template._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Delete Template">
                                      <FiTrash2 size={16} />
                                    </motion.button>
                                  )}
                                </>
                              ) : (
                                <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage">Restricted</div>
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
          </div>
        )}
      </motion.div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-lg rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Template' : 'Add Recurring Expense'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Category *</span></label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Sub Category</span></label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    placeholder="e.g. Broadband ISP / Office Rent"
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  />
                </div>

                {/* Frequency */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Frequency *</span></label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                {/* Amount */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Amount (৳) *</span></label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 5000"
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                  />
                </div>

                {/* Start Date */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Start Date *</span></label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  />
                </div>

                {/* Next Due Date */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Next Due Date *</span></label>
                  <input
                    type="date"
                    value={formData.nextDueDate}
                    onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  />
                </div>

                {/* Payment Method */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Default Payment Method</span></label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Mobile Banking">Mobile Banking</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Status */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Agreement Status</span></label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Vendor */}
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Vendor/Supplier</span></label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="e.g. ISP Provider name, Landlord name"
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                />
              </div>

              {/* Description */}
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Description</span></label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide detailed description of agreement..."
                  className="textarea textarea-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-20"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleFormSubmit} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processing...
                  </>
                ) : (editId ? 'Save Changes' : 'Create Schedule')}
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

export default RecurringExpensesPage;
