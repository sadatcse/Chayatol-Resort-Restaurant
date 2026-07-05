"use client";

import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus, FiFilter, FiCalendar, FiEye, FiDownload, FiPrinter, FiDollarSign } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import useStandardPrint from "@/hooks/useStandardPrint";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import ImageUpload from "@/components/Comon/ImageUpload";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import { AuthContext } from "@/providers/AuthProvider";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";
import usePagePermission from "@/hooks/usePagePermission";

const INITIAL_FORM_DATA = {
  expenseDate: new Date().toISOString().split("T")[0],
  category: "",
  subcategory: "",
  amount: "",
  paymentMethod: "Cash",
  referenceNo: "",
  vendor: "",
  description: "",
  attachment: ""
};

const ExpensesPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const { canAdd, canEdit, canDelete } = usePagePermission();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const getInitialStartDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  };

  const getInitialEndDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    return `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
  };

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [filterStartDate, setFilterStartDate] = useState(getInitialStartDate);
  const [filterEndDate, setFilterEndDate] = useState(getInitialEndDate);

  const [categories, setCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenseAmount, setTotalExpenseAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  const [isPrinting, setIsPrinting] = useState(false);

  const {
    printData: printExpenses,
    setPrintData: setPrintExpenses,
    printRef,
    handlePrint
  } = useStandardPrint({
    documentTitle: "Expense_Ledger_Report",
    onAfterPrint: () => setIsPrinting(false)
  });

  const handlePrintReport = async () => {
    setIsPrinting(true);
    try {
      let url = `/finance/expenses?page=1&limit=10000&search=${debouncedSearchTerm}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      if (filterPaymentMethod) url += `&paymentMethod=${filterPaymentMethod}`;
      if (filterStartDate) url += `&startDate=${filterStartDate}`;
      if (filterEndDate) url += `&endDate=${filterEndDate}`;

      const { data } = await axiosSecure.get(url);
      setPrintExpenses(data.expenses || []);
    } catch (error) {
      console.error("Print report error:", error);
      setIsPrinting(false);
    }
  };

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await axiosSecure.get("/expensecategory");
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, [axiosSecure]);

  // Fetch Payment Methods Dynamically
  const fetchPaymentTypes = useCallback(async () => {
    try {
      const { data } = await axiosSecure.get("/paymenttype");
      setPaymentTypes(data || []);
    } catch (error) {
      console.error("Error fetching payment types:", error);
    }
  }, [axiosSecure]);

  // Fetch Expenses
  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/finance/expenses?page=${currentPage}&limit=${itemsPerPage}&search=${debouncedSearchTerm}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      if (filterPaymentMethod) url += `&paymentMethod=${filterPaymentMethod}`;
      if (filterStartDate) url += `&startDate=${filterStartDate}`;
      if (filterEndDate) url += `&endDate=${filterEndDate}`;

      const { data } = await axiosSecure.get(url);
      setExpenses(data.expenses || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);
      setTotalExpenseAmount(data.totalExpenseAmount || 0);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    axiosSecure,
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    filterCategory,
    filterPaymentMethod,
    filterStartDate,
    filterEndDate
  ]);

  useEffect(() => {
    fetchCategories();
    fetchPaymentTypes();
  }, [fetchCategories, fetchPaymentTypes]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Excel & CSV Exports
  const getExportData = async () => {
    let url = `/finance/expenses?page=1&limit=10000&search=${debouncedSearchTerm}`;
    if (filterCategory) url += `&category=${filterCategory}`;
    if (filterPaymentMethod) url += `&paymentMethod=${filterPaymentMethod}`;
    if (filterStartDate) url += `&startDate=${filterStartDate}`;
    if (filterEndDate) url += `&endDate=${filterEndDate}`;

    const { data } = await axiosSecure.get(url);
    return (data.expenses || []).map(e => ({
      Date: e.expenseDate ? new Date(e.expenseDate).toLocaleDateString("en-GB") : "",
      Category: e.category?.name || "Uncategorized",
      Subcategory: e.subcategory || "",
      Vendor: e.vendor || "",
      Amount: e.amount,
      "Payment Method": e.paymentMethod,
      "Reference No": e.referenceNo || "",
      Description: e.description || ""
    }));
  };

  const handleExportExcel = async () => {
    try {
      const data = await getExportData();
      exportToExcel(data, "Expense_Ledger_Report", "Expenses");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to export Excel", "error");
    }
  };

  const handleExportCsv = async () => {
    try {
      const data = await getExportData();
      exportToCsv(data, "Expense_Ledger_Report");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to export CSV", "error");
    }
  };

  const openModal = (expenseToEdit = null) => {
    if (expenseToEdit) {
      setEditId(expenseToEdit._id);
      setFormData({
        expenseDate: expenseToEdit.expenseDate ? expenseToEdit.expenseDate.split("T")[0] : new Date().toISOString().split("T")[0],
        category: expenseToEdit.category?._id || expenseToEdit.category || "",
        subcategory: expenseToEdit.subcategory || "",
        amount: expenseToEdit.amount || "",
        paymentMethod: expenseToEdit.paymentMethod || "Cash",
        referenceNo: expenseToEdit.referenceNo || "",
        vendor: expenseToEdit.vendor || "",
        description: expenseToEdit.description || "",
        attachment: expenseToEdit.attachment || ""
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
    if (!formData.expenseDate) {
      Swal.fire("Validation Error", "Please provide the expense date.", "warning");
      return;
    }
    if (!formData.category) {
      Swal.fire("Validation Error", "Please select a category.", "warning");
      return;
    }
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      Swal.fire("Validation Error", "Please provide a valid expense amount.", "warning");
      return;
    }
    if (!formData.paymentMethod) {
      Swal.fire("Validation Error", "Please select a payment method.", "warning");
      return;
    }

    if (editId) {
      if (!canEdit) {
        Swal.fire("Restricted", "You do not have permission to edit expenses.", "warning");
        return;
      }
    } else {
      if (!canAdd) {
        Swal.fire("Restricted", "You do not have permission to add expenses.", "warning");
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
        await axiosSecure.put(`/finance/expenses/${editId}`, payload);
      } else {
        await axiosSecure.post("/finance/expenses", payload);
      }
      await fetchExpenses();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Expense successfully ${editId ? "updated" : "recorded"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save expense.",
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (!canDelete) {
      Swal.fire("Restricted", "You do not have permission to delete expense records.", "warning");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this expense entry!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/finance/expenses/${id}`);
          await fetchExpenses();
          Swal.fire("Deleted!", "Expense record has been deleted.", "success");
        } catch (error) {
          Swal.fire("Error!", "Failed to delete expense record.", "error");
        }
      }
    });
  };

  const clearFilters = () => {
    setFilterCategory("");
    setFilterPaymentMethod("");
    setFilterStartDate(getInitialStartDate());
    setFilterEndDate(getInitialEndDate());
    setSearchTerm("");
    setCurrentPage(1);
  };

  const activePaymentMethods = paymentTypes.length > 0 
    ? paymentTypes.map(pt => pt.name) 
    : ["Cash", "Card", "Mobile Banking", "Bank Transfer", "Cheque", "Other"];

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <div className="print:hidden">
        <SectionHeader
          title="Expense Entry Ledger"
          subtitle="Record, analyze, and manage resort overhead expenditures, salaries, and operational costs."
        >
          <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-80 h-12">
            <FiSearch className="text-brand-sage text-lg" />
            <input
              type="text"
              className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
              placeholder="Search vendor, desc, subcat..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
        </SectionHeader>

        {/* Statistics Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 animate-fade-in">
          <div className="card bg-white dark:bg-brand-charcoal p-5 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 flex flex-row items-center gap-4">
            <div className="p-3 bg-brand-primary/10 rounded-full text-brand-primary">
              <FiDollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-brand-sage uppercase tracking-wider">Total Filtered Amount</div>
              <div className="text-2xl font-black text-brand-charcoal dark:text-brand-offwhite">৳{totalExpenseAmount.toLocaleString()}</div>
            </div>
          </div>

          <div className="card bg-white dark:bg-brand-charcoal p-5 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 flex flex-row items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
              <FiCalendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-brand-sage uppercase tracking-wider">Total Transactions</div>
              <div className="text-2xl font-black text-brand-charcoal dark:text-brand-offwhite">{totalItems}</div>
            </div>
          </div>

          <div className="card bg-white dark:bg-brand-charcoal p-5 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 flex flex-row items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
              <FiFilter className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-brand-sage uppercase tracking-wider">Average Expense</div>
              <div className="text-2xl font-black text-brand-charcoal dark:text-brand-offwhite">
                ৳{totalItems > 0 ? Math.round(totalExpenseAmount / totalItems).toLocaleString() : 0}
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filter Box */}
        <div className="bg-white dark:bg-brand-charcoal p-6 rounded-2xl border border-brand-beige dark:border-brand-beige/20 shadow-sm mb-6 space-y-4">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs text-brand-primary">
            <FiFilter />
            <span>Filter Ledger Entries</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {/* Category Filter */}
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-[11px] font-bold text-brand-sage uppercase">Category</span></label>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                className="select select-bordered select-sm w-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary rounded-xl"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-[11px] font-bold text-brand-sage uppercase">Payment Method</span></label>
              <select
                value={filterPaymentMethod}
                onChange={(e) => { setFilterPaymentMethod(e.target.value); setCurrentPage(1); }}
                className="select select-bordered select-sm w-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary rounded-xl"
              >
                <option value="">All Methods</option>
                {activePaymentMethods.map(pm => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-[11px] font-bold text-brand-sage uppercase">Start Date</span></label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
                className="input input-bordered input-sm w-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary rounded-xl"
              />
            </div>

            {/* End Date */}
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-[11px] font-bold text-brand-sage uppercase">End Date</span></label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
                className="input input-bordered input-sm w-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary rounded-xl"
              />
            </div>

            {/* Clear Button */}
            <div className="flex items-end justify-start sm:justify-end md:justify-center">
              <button onClick={clearFilters} className="btn btn-outline border-brand-sage/50 text-brand-sage hover:bg-brand-sage/10 btn-sm rounded-xl px-5 h-9 w-full sm:w-auto uppercase tracking-widest text-[10px] font-bold">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <div className="flex items-center gap-3 text-xs font-bold text-brand-sage uppercase tracking-widest">
            <span>Display</span>
            <select
              value={itemsPerPage}
              className="select select-bordered select-xs bg-white dark:bg-brand-charcoal rounded-md border-brand-beige focus:outline-none"
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <>
                <button onClick={handleExportExcel} className="btn btn-outline border-brand-sage/50 text-brand-sage hover:bg-brand-sage/10 btn-sm rounded-full gap-2 px-4 h-10 font-bold uppercase tracking-wider text-[10px] cursor-pointer" disabled={isLoading}>
                  <FiDownload size={14} /> Excel
                </button>
                <button onClick={handleExportCsv} className="btn btn-outline border-brand-sage/50 text-brand-sage hover:bg-brand-sage/10 btn-sm rounded-full gap-2 px-4 h-10 font-bold uppercase tracking-wider text-[10px] cursor-pointer" disabled={isLoading}>
                  <FiDownload size={14} /> CSV
                </button>
                <button onClick={handlePrintReport} className="btn btn-outline border-brand-primary text-brand-primary hover:bg-brand-primary/10 btn-sm rounded-full gap-2 px-4 h-10 font-bold uppercase tracking-wider text-[10px] cursor-pointer" disabled={isLoading || isPrinting}>
                  <FiPrinter size={14} /> Print
                </button>
              </>
            )}
            {canAdd && (
              <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10 cursor-pointer">
                <FiPlus className="text-lg" />
                <span className="uppercase tracking-widest text-xs font-bold">Record Expense</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table - Ref printed by react-to-print */}
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
              <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige dark:border-brand-beige/20 print:bg-black print:text-white">
                <tr>
                  <th className="pl-6 py-5">Date</th>
                  <th className="py-5">Category</th>
                  <th className="py-5">Sub Category</th>
                  <th className="py-5">Vendor/Supplier</th>
                  <th className="py-5">Amount</th>
                  <th className="py-5">Payment</th>
                  <th className="py-5">Ref No</th>
                  <th className="py-5 print:hidden">Receipt</th>
                  <th className="pr-6 text-center py-5 w-32 print:hidden">Manage</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase">
                        No expenses logged.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <motion.tr
                        key={expense._id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none text-sm text-brand-charcoal dark:text-brand-offwhite print:border-black print:text-black"
                      >
                        <td className="pl-6 py-4 font-mono font-bold whitespace-nowrap">
                          {expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString("en-GB") : "-"}
                        </td>
                        <td className="py-4 font-bold uppercase text-xs text-brand-primary tracking-wide print:text-black">
                          {expense.category?.name || "Uncategorized"}
                        </td>
                        <td className="py-4 font-medium uppercase text-xs tracking-wide">
                          {expense.subcategory || "-"}
                        </td>
                        <td className="py-4 font-bold uppercase text-xs">
                          {expense.vendor || "-"}
                        </td>
                        <td className="py-4 font-black text-brand-black dark:text-brand-offwhite font-mono print:text-black">
                          ৳{expense.amount.toLocaleString()}
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <span className="badge badge-outline border-brand-sage text-brand-sage font-bold text-[10px] uppercase px-2.5 py-1.5 rounded-full print:border-black print:text-black">{expense.paymentMethod}</span>
                        </td>
                        <td className="py-4 font-mono text-xs">
                          {expense.referenceNo || "-"}
                        </td>
                        <td className="py-4 print:hidden">
                          {expense.attachment ? (
                            <a href={expense.attachment} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-circle btn-ghost text-brand-primary hover:bg-brand-primary/10" title="View Bill Image">
                              <FiEye size={15} />
                            </a>
                          ) : (
                            <span className="text-[10px] text-brand-sage italic font-bold">No receipt</span>
                          )}
                        </td>
                        <td className="pr-6 py-4 print:hidden">
                          <div className="flex justify-center items-center gap-1.5">
                            {(canEdit || canDelete) ? (
                              <>
                                {canEdit && (
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openModal(expense)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Edit Expense">
                                    <FiEdit size={16} />
                                  </motion.button>
                                )}
                                {canDelete && (
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(expense._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Delete Expense">
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
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        <div className="p-5 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/30 dark:bg-brand-charcoal/10 flex justify-center print:hidden">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </motion.div>

      {/* Record/Edit Expense Modal */}
      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm z-50">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-lg rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Expense Entry' : 'Log New Expense'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Expense Date *</span></label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  />
                </div>

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
                    placeholder="e.g. Electricity / Plumbing"
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  />
                </div>

                {/* Amount */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Amount (৳) *</span></label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 15000"
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                  />
                </div>

                {/* Payment Method */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Method *</span></label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    {activePaymentMethods.map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>
                </div>

                {/* Reference No */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Reference No</span></label>
                  <input
                    type="text"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                    placeholder="e.g. Voucher Number"
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                  />
                </div>
              </div>

              {/* Vendor */}
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Vendor/Supplier</span></label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="e.g. DESCO / Supplier Name"
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                />
              </div>

              {/* Description */}
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Description</span></label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide detailed comments..."
                  className="textarea textarea-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-20"
                />
              </div>

              {/* Attachment / Receipt Upload */}
              <div className="form-control w-full">
                <ImageUpload
                  label="Attachment (Bill Image/PDF)"
                  setImageUrl={(url) => setFormData(prev => ({ ...prev, attachment: url }))}
                  setPreviewImageUrl={() => {}}
                  setValue={() => {}}
                />
                {formData.attachment && (
                  <div className="mt-2 text-xs flex items-center justify-between p-2 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-xl">
                    <span className="truncate max-w-[80%] text-brand-sage font-bold">File Attached!</span>
                    <a href={formData.attachment} target="_blank" rel="noopener noreferrer" className="text-brand-primary flex items-center gap-1 font-bold">
                      <FiEye /> View File
                    </a>
                  </div>
                )}
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
                ) : (editId ? 'Save Changes' : 'Record Entry')}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}
      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        {printExpenses && (
          <PrintReportTemplate
            ref={printRef}
            title="Official Operational Expense Ledger"
            subtitle="Hotel Operations & Overhead Expenditures"
            dateRange={filterStartDate || filterEndDate ? `${filterStartDate || "Start"} to ${filterEndDate || "Today"}` : "All Time"}
          >
            <div style={{ marginBottom: "20px", fontSize: "12px", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>
              <span>Total Items: <strong>{printExpenses.length}</strong> &nbsp;|&nbsp; Total Outflow Amount: <strong>৳{printExpenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}</strong></span>
            </div>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Sub Category</th>
                  <th>Vendor/Supplier</th>
                  <th>Reference No</th>
                  <th>Method</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {printExpenses.map((exp) => (
                  <tr key={exp._id}>
                    <td>{exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString("en-GB") : "-"}</td>
                    <td style={{ fontWeight: "bold" }}>{exp.category?.name || "Uncategorized"}</td>
                    <td>{exp.subcategory || "-"}</td>
                    <td>{exp.vendor || "-"}</td>
                    <td style={{ fontFamily: "monospace" }}>{exp.referenceNo || "-"}</td>
                    <td>{exp.paymentMethod}</td>
                    <td style={{ textAlign: "right", fontWeight: "bold" }}>৳{exp.amount.toLocaleString()}</td>
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

export default ExpensesPage;
