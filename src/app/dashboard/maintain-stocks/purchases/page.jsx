"use client";

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from "react";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus, FiCheckCircle, FiXCircle, FiGrid, FiEye, FiFileText, FiPrinter } from "react-icons/fi";
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
import usePurchases from "@/hooks/usePurchases";
import { AuthContext } from "@/providers/AuthProvider";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";
import usePagePermission from "@/hooks/usePagePermission";

const INITIAL_FORM_DATA = {
  vendor: "",
  purchaseDate: new Date(),
  invoiceNumber: "",
  items: [{ ingredient: "", quantity: 1, unitPrice: 0, totalPrice: 0 }],
  grandTotal: 0,
  paymentStatus: "Unpaid",
  paidAmount: 0,
  paymentMethod: "",
  notes: ""
};

const PurchasesPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const { canAdd, canEdit, canDelete } = usePagePermission();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  // Standardize Print hook integrations
  const {
    printData: printListData,
    setPrintData: setPrintListData,
    printRef: printListRef,
    handlePrint: handlePrintList
  } = useStandardPrint({
    documentTitle: "Purchase_Invoices_Report",
    onAfterPrint: () => setIsExporting(false)
  });

  const {
    printData: printDetailData,
    setPrintData: setPrintDetailData,
    printRef: printDetailRef,
    handlePrint: handlePrintDetail
  } = useStandardPrint({
    documentTitle: viewingPurchase ? `Purchase_Invoice_${viewingPurchase.invoiceNumber}` : "Purchase_Invoice_Details",
  });

  const fetchAllPurchasesForExport = async () => {
    try {
      const params = new URLSearchParams({
        page: 1,
        limit: 99999,
      });
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
      if (fromDate) params.append("fromDate", fromDate.toISOString().split("T")[0]);
      if (toDate) params.append("toDate", toDate.toISOString().split("T")[0]);
      if (selectedStatus) params.append("status", selectedStatus);

      const response = await axiosSecure.get(`/purchase/paginated?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch all purchases for export:", error);
      return [];
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllPurchasesForExport();
      const formatted = data.map(item => ({
        "Invoice Code": item.invoiceNumber,
        "Supplier Name": item.vendor?.vendorName || "Unknown Supplier",
        "Purchase Date": item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString("en-GB") : "N/A",
        "Items Count": item.items?.length || 0,
        "Grand Total (BDT)": item.grandTotal,
        "Amount Paid (BDT)": item.paidAmount,
        "Balance Due (BDT)": item.grandTotal - item.paidAmount,
        "Payment Status": item.paymentStatus,
        "Payment Method": item.paymentMethod,
        "Notes": item.notes || ""
      }));
      exportToExcel(formatted, "Purchase_Invoices");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllPurchasesForExport();
      const formatted = data.map(item => ({
        "Invoice Code": item.invoiceNumber,
        "Supplier Name": item.vendor?.vendorName || "Unknown Supplier",
        "Purchase Date": item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString("en-GB") : "N/A",
        "Items Count": item.items?.length || 0,
        "Grand Total (BDT)": item.grandTotal,
        "Amount Paid (BDT)": item.paidAmount,
        "Balance Due (BDT)": item.grandTotal - item.paidAmount,
        "Payment Status": item.paymentStatus,
        "Payment Method": item.paymentMethod,
        "Notes": item.notes || ""
      }));
      exportToCsv(formatted, "Purchase_Invoices");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintListReport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllPurchasesForExport();
      setPrintListData(data);
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

  const { purchases, totalPages, totalItems, totalCount, paidCount, partialCount, unpaidCount, isLoading, refetch } = usePurchases(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    fromDate,
    toDate,
    selectedStatus
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  // Prerequisites state
  const [vendors, setVendors] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [itemCategories, setItemCategories] = useState([""]); // category selection track per row

  // Fetch all suppliers, ingredients, categories, and payment types for dropdown selections
  const fetchPrerequisites = useCallback(async () => {
    try {
      const [vendorsRes, ingredientsRes, categoriesRes, paymentTypesRes] = await Promise.all([
        axiosSecure.get("/vendor"),
        axiosSecure.get("/ingredient"),
        axiosSecure.get("/ingredient-category"),
        axiosSecure.get("/paymenttype"),
      ]);
      setVendors(vendorsRes.data || []);
      setIngredients(ingredientsRes.data || []);
      setCategories(categoriesRes.data || []);
      const types = paymentTypesRes.data || [];
      setPaymentTypes(types);
      // Set the default paymentMethod to the first type from DB if not already set
      if (types.length > 0) {
        setFormData(prev => ({
          ...prev,
          paymentMethod: prev.paymentMethod || types[0].name,
        }));
      }
    } catch (error) {
      console.error("Error fetching purchase prerequisites:", error);
    }
  }, [axiosSecure]);

  useEffect(() => {
    fetchPrerequisites();
  }, [fetchPrerequisites]);

  // Recalculate invoice totals and payment status
  useEffect(() => {
    const total = formData.items?.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0) || 0;
    const paid = parseFloat(formData.paidAmount) || 0;
    let status = "Unpaid";
    if (paid > 0 && paid < total) {
      status = "Partial";
    } else if (paid > 0 && paid >= total) {
      status = "Paid";
    }
    setFormData(prev => ({ ...prev, grandTotal: total, paymentStatus: status }));
  }, [formData.items, formData.paidAmount]);

  const openCreateModal = async () => {
    setEditId(null);
    const defaultMethod = paymentTypes.length > 0 ? paymentTypes[0].name : "";
    setFormData({ ...INITIAL_FORM_DATA, purchaseDate: new Date(), paymentMethod: defaultMethod });
    setItemCategories([""]);
    setIsModalOpen(true);
    try {
      const { data } = await axiosSecure.get("/purchase/next-invoice");
      setFormData(prev => ({ ...prev, invoiceNumber: data.nextInvoiceNumber }));
    } catch (error) {
      console.error("Failed to generate next invoice number:", error);
    }
  };

  const openEditModal = (purchase) => {
    setEditId(purchase._id);
    const itemCats = purchase.items.map(item => item.ingredient?.category?._id || item.ingredient?.category || "");
    setItemCategories(itemCats);
    setFormData({
      vendor: purchase.vendor?._id || purchase.vendor || "",
      purchaseDate: new Date(purchase.purchaseDate),
      invoiceNumber: purchase.invoiceNumber || "",
      grandTotal: purchase.grandTotal || 0,
      paymentStatus: purchase.paymentStatus || "Unpaid",
      paidAmount: purchase.paidAmount || 0,
      paymentMethod: purchase.paymentMethod || (paymentTypes.length > 0 ? paymentTypes[0].name : ""),
      notes: purchase.notes || "",
      items: purchase.items.map(item => ({
        ingredient: item.ingredient?._id || item.ingredient || "",
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0
      }))
    });
    setIsModalOpen(true);
  };

  const openViewModal = (purchase) => {
    setViewingPurchase(purchase);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setEditId(null);
    setViewingPurchase(null);
    setFormData({ ...INITIAL_FORM_DATA });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, purchaseDate: date }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [name]: value };
    const quantity = parseFloat(newItems[index].quantity) || 0;
    const unitPrice = parseFloat(newItems[index].unitPrice) || 0;
    newItems[index].totalPrice = quantity * unitPrice;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleRowCategoryChange = (index, categoryId) => {
    const newItemCategories = [...itemCategories];
    newItemCategories[index] = categoryId;
    setItemCategories(newItemCategories);

    const newItems = [...formData.items];
    newItems[index].ingredient = "";
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ingredient: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]
    }));
    setItemCategories(prev => [...prev, ""]);
  };

  const removeItemRow = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    setItemCategories(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!formData.vendor) {
      Swal.fire({ title: "Validation Error", text: "Supplier selection is required.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }
    if (!formData.invoiceNumber || !formData.invoiceNumber.trim()) {
      Swal.fire({ title: "Validation Error", text: "Invoice number is required.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      Swal.fire({ title: "Validation Error", text: "Please add at least one purchase item.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.ingredient) {
        Swal.fire({ title: "Validation Error", text: `Please select an ingredient for item row #${i + 1}.`, icon: "warning", confirmButtonColor: "#346E36" });
        return;
      }
      if (Number(item.quantity) <= 0) {
        Swal.fire({ title: "Validation Error", text: `Quantity must be greater than zero for row #${i + 1}.`, icon: "warning", confirmButtonColor: "#346E36" });
        return;
      }
      if (Number(item.unitPrice) < 0) {
        Swal.fire({ title: "Validation Error", text: `Unit price cannot be negative for row #${i + 1}.`, icon: "warning", confirmButtonColor: "#346E36" });
        return;
      }
    }
    if (Number(formData.paidAmount) < 0) {
      Swal.fire({ title: "Validation Error", text: "Paid amount cannot be negative.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }


    if (editId) {
      if (!canEdit) {
        Swal.fire("Restricted", "You do not have permission to edit purchase invoices.", "warning");
        return;
      }
    } else {
      if (!canAdd) {
        Swal.fire("Restricted", "You do not have permission to record new purchases.", "warning");
        return;
      }
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      grandTotal: Number(formData.grandTotal),
      paidAmount: Number(formData.paidAmount),
      purchaseDate: formData.purchaseDate.toISOString()
    };

    try {
      if (editId) {
        await axiosSecure.put(`/purchase/update/${editId}`, payload);
      } else {
        await axiosSecure.post("/purchase/post", payload);
      }
      await refetch();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Purchase invoice successfully ${editId ? "updated" : "saved"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to record purchase details.",
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
        title: "Restricted",
        text: "You do not have permission to delete purchases.",
        icon: "warning",
        confirmButtonColor: "#346E36",
      });
      return;
    }
    if (isDeleting) return;

    Swal.fire({
      title: "Are you sure?",
      text: "Deleting this invoice will automatically reverse all stock increments associated with it!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete & reverse!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsDeleting(true);
        try {
          await axiosSecure.delete(`/purchase/delete/${id}`);
          await refetch();
          Swal.fire({
            title: "Deleted!",
            text: "Invoice record deleted and stocks reversed.",
            icon: "success",
            confirmButtonColor: "#346E36",
          });
        } catch (error) {
          Swal.fire({
            title: "Error!",
            text: error.response?.data?.message || "Failed to delete invoice.",
            icon: "error",
            confirmButtonColor: "#346E36"
          });
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  const canPerformAction = canEdit || canDelete;

  const renderStatusBadge = (status) => {
    const styles = {
      Paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider",
      Unpaid: "bg-red-100 text-red-850 dark:bg-red-950/30 dark:text-red-400 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider",
      Partial: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider"
    };
    return <span className={`badge ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      {/* Header & Inline Search */}
      <SectionHeader
        title="Purchase Invoices"
        subtitle="Manage ingredient supply bills, track payment statuses, and review stock adjustments."
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

            {/* From Date */}
            <DatePicker
              selected={fromDate}
              onChange={(date) => {
                setFromDate(date);
                setCurrentPage(1);
              }}
              dateFormat="dd/MM/yyyy"
              className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-xs font-semibold px-4 w-full sm:w-36 text-center text-brand-charcoal dark:text-brand-offwhite shadow-sm border-brand-beige shrink-0"
              placeholderText="From Date"
              isClearable
              wrapperClassName="!w-auto inline-block shrink-0"
            />

            {/* To Date */}
            <DatePicker
              selected={toDate}
              onChange={(date) => {
                setToDate(date);
                setCurrentPage(1);
              }}
              dateFormat="dd/MM/yyyy"
              className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-xs font-semibold px-4 w-full sm:w-36 text-center text-brand-charcoal dark:text-brand-offwhite shadow-sm border-brand-beige shrink-0"
              placeholderText="To Date"
              isClearable
              wrapperClassName="!w-auto inline-block shrink-0"
            />

            {/* Status Selector */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-full h-12 text-xs font-semibold px-4 w-full sm:w-36 text-brand-charcoal dark:text-brand-offwhite shadow-sm border-brand-beige shrink-0"
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>

          {/* Search Box */}
          <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-64 h-12">
            <FiSearch className="text-brand-sage text-lg" />
            <input
              type="text"
              className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none text-sm"
              placeholder="Invoice or Supplier..."
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
            <FiFileText className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Total Invoices</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-4xl mt-1">{totalCount}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-emerald-500 bg-emerald-500/10 p-4 rounded-full">
            <FiCheckCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Paid Invoices</div>
          <div className="stat-value text-emerald-600 dark:text-emerald-400 text-4xl mt-1">{paidCount}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-red-500 bg-red-500/10 p-4 rounded-full">
            <FiXCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Unpaid & Partial</div>
          <div className="stat-value text-red-500 dark:text-red-400 text-4xl mt-1">{unpaidCount + partialCount}</div>
        </div>
      </div>

      {/* Control bar & Create Button */}
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

        <div className="flex flex-wrap gap-3 items-center">
          {canEdit && (
            <ExportButtons
              onExportExcel={handleExportExcel}
              onExportCsv={handleExportCsv}
              onPrint={handlePrintListReport}
              isLoading={isExporting}
            />
          )}
          {canAdd && (
            <button onClick={openCreateModal} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10 cursor-pointer">
              <FiPlus className="text-lg" />
              <span className="uppercase tracking-widest text-xs font-bold">New Purchase</span>
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
                    <th className="pl-8 py-5 w-28">Invoice</th>
                    <th className="py-5">Supplier Name</th>
                    <th className="py-5 text-center">Items count</th>
                    <th className="py-5">Grand Total</th>
                    <th className="py-5">Amount Paid</th>
                    <th className="py-5">Status</th>
                    <th className="py-5">Bill Date</th>
                    <th className="pr-8 text-center py-5 w-40">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {purchases.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No purchase bills found.
                        </td>
                      </tr>
                    ) : (
                      purchases.map((purchase) => (
                        <motion.tr
                          key={purchase._id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm"
                        >
                          <td className="pl-8 py-4 font-bold text-brand-primary dark:text-brand-sage font-mono">
                            {purchase.invoiceNumber}
                          </td>
                          <td className="py-4 font-bold uppercase tracking-wide">
                            {purchase.vendor?.vendorName || "Unknown Supplier"}
                          </td>
                          <td className="py-4 text-center font-bold font-mono">
                            {purchase.items?.length || 0}
                          </td>
                          <td className="py-4 font-mono font-bold">
                            {(purchase.grandTotal || 0).toFixed(2)} BDT
                          </td>
                          <td className="py-4 font-mono text-brand-sage">
                            {(purchase.paidAmount || 0).toFixed(2)} BDT
                          </td>
                          <td className="py-4">
                            {renderStatusBadge(purchase.paymentStatus)}
                          </td>
                          <td className="py-4 font-mono text-xs">
                            {purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString("en-GB") : "N/A"}
                          </td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center gap-2">
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openViewModal(purchase)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="View Bill Details">
                                <FiEye size={16} />
                              </motion.button>
                              {canPerformAction ? (
                                <>
                                  {canEdit && (
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openEditModal(purchase)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Edit Purchase">
                                      <FiEdit size={16} />
                                    </motion.button>
                                  )}
                                  {canDelete && (
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(purchase._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Delete Purchase">
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-5xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">

            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Purchase Invoice' : 'Record Purchase Invoice'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Select Supplier *</span></label>
                  <select
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleFormChange}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none rounded-xl text-sm bg-white dark:bg-brand-charcoal font-semibold text-brand-charcoal dark:text-brand-offwhite"
                    required
                  >
                    <option value="" disabled>Select Supplier</option>
                    {vendors.filter(v => v.status === "Active" || v._id === formData.vendor).map(v => (
                      <option key={v._id} value={v._id}>
                        {v.vendorName}{v.status !== "Active" ? " (Inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Invoice Code *</span></label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleFormChange}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                    placeholder="e.g. INV-1001"
                    required
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Purchase Date *</span></label>
                  <DatePicker
                    selected={formData.purchaseDate}
                    onChange={handleDateChange}
                    dateFormat="dd/MM/yyyy"
                    className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-xl w-full text-brand-charcoal dark:text-brand-offwhite text-sm"
                    required
                    disabled={currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin'}
                  />
                </div>
              </div>

              <h4 className="text-sm font-bold text-brand-primary dark:text-brand-sage uppercase tracking-wider border-b border-brand-beige/50 dark:border-brand-beige/10 pb-2 mt-6">
                Purchase Items
              </h4>

              <div className="overflow-x-auto border border-brand-beige dark:border-brand-beige/20 rounded-2xl">
                <table className="table w-full">
                  <thead className="bg-brand-offwhite dark:bg-brand-charcoal/50 text-brand-sage font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3 w-48">Category</th>
                      <th className="p-3 w-48">Ingredient</th>
                      <th className="p-3 w-28">Quantity</th>
                      <th className="p-3 w-32">Unit Price (BDT)</th>
                      <th className="p-3 w-36">Total Price (BDT)</th>
                      <th className="p-3 text-center w-16">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index} className="border-b border-brand-beige dark:border-brand-beige/10 last:border-none">
                        <td className="p-2">
                          <select
                            value={itemCategories[index] || ""}
                            onChange={e => handleRowCategoryChange(index, e.target.value)}
                            className="select select-bordered select-sm border-brand-primary/50 focus:outline-none rounded-xl text-xs bg-white dark:bg-brand-charcoal font-semibold text-brand-charcoal dark:text-brand-offwhite w-full"
                            required
                          >
                            <option value="" disabled>Category</option>
                            {categories.filter(c => c.isActive || c._id === itemCategories[index]).map(c => (
                              <option key={c._id} value={c._id}>
                                {c.categoryName}{!c.isActive ? " (Inactive)" : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            name="ingredient"
                            value={item.ingredient}
                            onChange={e => handleItemChange(index, e)}
                            className="select select-bordered select-sm border-brand-primary/50 focus:outline-none rounded-xl text-xs bg-white dark:bg-brand-charcoal font-semibold text-brand-charcoal dark:text-brand-offwhite w-full"
                            required
                            disabled={!itemCategories[index]}
                          >
                            <option value="" disabled>Ingredient</option>
                            {ingredients
                              .filter(i => (i.category?._id || i.category) === itemCategories[index])
                              .filter(i => i.isActive || i._id === item.ingredient)
                              .map(i => (
                                <option key={i._id} value={i._id}>
                                  {i.name} ({i.unit}){!i.isActive ? " (Inactive)" : ""}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            name="quantity"
                            value={item.quantity}
                            onChange={e => handleItemChange(index, e)}
                            className="input input-bordered input-sm border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite font-mono text-xs"
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            name="unitPrice"
                            value={item.unitPrice}
                            onChange={e => handleItemChange(index, e)}
                            className="input input-bordered input-sm border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite font-mono text-xs"
                            required
                          />
                        </td>
                        <td className="p-2 font-mono text-xs font-bold text-brand-primary dark:text-brand-sage pr-4 text-right">
                          {(item.totalPrice || 0).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="btn btn-sm btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30"
                            disabled={formData.items.length <= 1}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addItemRow}
                className="btn btn-xs rounded-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 dark:bg-brand-primary/20 dark:text-brand-sage gap-1 px-4 py-2 h-auto uppercase tracking-widest text-[9px] font-bold"
              >
                <FiPlus /> Add Item Row
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">General Notes</span></label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    className="textarea textarea-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full h-32 bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite"
                    placeholder="Enter invoice details, payment schedules, or comments..."
                  />
                </div>

                <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 p-6 rounded-2xl border border-brand-beige dark:border-brand-beige/25 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="text-base font-bold text-brand-charcoal dark:text-brand-offwhite flex justify-between tracking-wide border-b border-brand-beige dark:border-brand-beige/20 pb-2">
                      <span className="uppercase text-brand-sage tracking-wider text-xs font-extrabold">Grand Total:</span>
                      <span className="text-lg font-black text-brand-primary dark:text-brand-sage font-mono">{(formData.grandTotal || 0).toFixed(2)} BDT</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-brand-sage uppercase tracking-widest">Paid Amount (BDT) *</label>
                      <input
                        type="number"
                        name="paidAmount"
                        value={formData.paidAmount}
                        onChange={handleFormChange}
                        className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-44 text-right bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite font-mono"
                        required
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Method *</label>
                      <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleFormChange}
                        className="select select-bordered select-sm border-brand-primary dark:border-brand-primary/50 focus:outline-none rounded-xl text-xs bg-white dark:bg-brand-charcoal font-semibold text-brand-charcoal dark:text-brand-offwhite w-44"
                        required
                      >
                        {paymentTypes.length === 0 ? (
                          <option value="" disabled>No payment types configured</option>
                        ) : (
                          paymentTypes.map(pt => (
                            <option key={pt._id} value={pt.name}>{pt.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-brand-beige dark:border-brand-beige/20">
                    <span className="text-xs font-bold text-brand-sage uppercase tracking-widest">Calculated Status:</span>
                    {renderStatusBadge(formData.paymentStatus)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleSubmit} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processing...
                  </>
                ) : (editId ? 'Save Changes' : 'Record Purchase')}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && viewingPurchase && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-3xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">

            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest flex items-center gap-2">
                <FiFileText className="text-brand-primary" /> Purchase Invoice Details
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-brand-offwhite dark:bg-brand-charcoal/40 p-4 rounded-xl border border-brand-beige/50 dark:border-brand-beige/10">
                  <span className="block text-brand-sage font-extrabold uppercase tracking-wider mb-1">Supplier</span>
                  <span className="text-sm font-bold text-brand-black dark:text-brand-offwhite">{viewingPurchase.vendor?.vendorName || "Unknown"}</span>
                </div>
                <div className="bg-brand-offwhite dark:bg-brand-charcoal/40 p-4 rounded-xl border border-brand-beige/50 dark:border-brand-beige/10">
                  <span className="block text-brand-sage font-extrabold uppercase tracking-wider mb-1">Invoice Number</span>
                  <span className="text-sm font-bold font-mono text-brand-primary dark:text-brand-sage">{viewingPurchase.invoiceNumber}</span>
                </div>
                <div className="bg-brand-offwhite dark:bg-brand-charcoal/40 p-4 rounded-xl border border-brand-beige/50 dark:border-brand-beige/10">
                  <span className="block text-brand-sage font-extrabold uppercase tracking-wider mb-1">Purchase Date</span>
                  <span className="text-sm font-bold text-brand-black dark:text-brand-offwhite font-mono">
                    {viewingPurchase.purchaseDate ? new Date(viewingPurchase.purchaseDate).toLocaleDateString("en-GB") : "N/A"}
                  </span>
                </div>
              </div>

              <h4 className="text-sm font-bold text-brand-primary dark:text-brand-sage uppercase tracking-wider border-b border-brand-beige/50 dark:border-brand-beige/10 pb-2 mt-6">
                Purchased Items ({viewingPurchase.items?.length || 0})
              </h4>

              <div className="overflow-x-auto border border-brand-beige dark:border-brand-beige/20 rounded-2xl">
                <table className="table w-full">
                  <thead className="bg-brand-offwhite dark:bg-brand-charcoal/50 text-brand-sage font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3">Ingredient</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3 text-right">Unit Price (BDT)</th>
                      <th className="p-3 text-right">Total Price (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingPurchase.items?.map((item) => (
                      <tr key={item._id} className="border-b border-brand-beige dark:border-brand-beige/10 last:border-none text-xs">
                        <td className="p-3 font-semibold text-brand-black dark:text-brand-offwhite">{item.ingredient?.name} ({item.ingredient?.unit})</td>
                        <td className="p-3 font-medium text-brand-sage">{item.ingredient?.category?.categoryName || "N/A"}</td>
                        <td className="p-3 text-center font-mono">{item.quantity}</td>
                        <td className="p-3 text-right font-mono">{(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-brand-primary dark:text-brand-sage">{(item.totalPrice || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-4">
                  {viewingPurchase.notes && (
                    <div>
                      <span className="block text-brand-sage font-extrabold uppercase tracking-wider text-[10px] mb-2">Invoice Notes</span>
                      <p className="bg-brand-offwhite dark:bg-brand-charcoal/40 p-4 rounded-xl border border-brand-beige/50 dark:border-brand-beige/10 text-xs text-brand-charcoal dark:text-brand-offwhite/80 whitespace-pre-line leading-relaxed">
                        {viewingPurchase.notes}
                      </p>
                    </div>
                  )}

                  {viewingPurchase.payments && viewingPurchase.payments.length > 0 && (
                    <div>
                      <span className="block text-brand-sage font-extrabold uppercase tracking-wider text-[10px] mb-2">Payment History Logs</span>
                      <div className="space-y-2 max-h-[20vh] overflow-y-auto pr-1">
                        {viewingPurchase.payments.map((p, idx) => (
                          <div key={p._id || idx} className="bg-brand-offwhite dark:bg-brand-charcoal/40 p-3 rounded-xl border border-brand-beige/50 dark:border-brand-beige/10 text-xs flex justify-between items-start">
                            <div className="space-y-1">
                              <span className="font-bold text-brand-black dark:text-brand-offwhite font-mono">{p.amount.toFixed(2)} BDT</span>
                              <span className="text-[10px] text-brand-sage block font-mono">Date: {new Date(p.paymentDate).toLocaleString("en-GB")}</span>
                              {p.note && <p className="text-[10px] text-brand-sage italic mt-1 font-sans">"{p.note}"</p>}
                            </div>
                            <span className="badge badge-sm font-semibold uppercase tracking-wider text-[9px] bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-sage border-none">{p.paymentMethod}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-brand-offwhite dark:bg-brand-charcoal/40 p-6 rounded-2xl border border-brand-beige/50 dark:border-brand-beige/10 space-y-3 text-right text-xs">
                  <p className="font-bold text-brand-charcoal dark:text-brand-offwhite">Payment Method: <span className="font-mono text-brand-primary dark:text-brand-sage font-black">{viewingPurchase.paymentMethod}</span></p>
                  <p className="text-sm font-bold text-brand-black dark:text-brand-offwhite border-b border-brand-beige dark:border-brand-beige/20 pb-2">
                    Grand Total: <span className="text-base font-black text-brand-primary dark:text-brand-sage font-mono">{(viewingPurchase.grandTotal || 0).toFixed(2)} BDT</span>
                  </p>
                  <p className="font-medium text-brand-sage">Amount Paid: {(viewingPurchase.paidAmount || 0).toFixed(2)} BDT</p>
                  <p className="font-bold text-red-500 font-mono">Balance Due: {((viewingPurchase.grandTotal || 0) - (viewingPurchase.paidAmount || 0)).toFixed(2)} BDT</p>
                  <div className="flex justify-end pt-2">{renderStatusBadge(viewingPurchase.paymentStatus)}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button
                onClick={() => setPrintDetailData(viewingPurchase)}
                className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-6 flex items-center gap-2 cursor-pointer"
              >
                <FiPrinter /> Print Invoice
              </button>
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6 cursor-pointer">Close</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}
      {/* Hidden print container for a single invoice details */}
      <div style={{ display: "none" }}>
        {printDetailData && (
          <PrintReportTemplate
            ref={printDetailRef}
            title={`Purchase Invoice: ${printDetailData.invoiceNumber}`}
            subtitle={`Supplier: ${printDetailData.vendor?.vendorName || "Unknown"} | Date: ${printDetailData.purchaseDate ? new Date(printDetailData.purchaseDate).toLocaleDateString("en-GB") : ""}`}
            dateRange=""
          >
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "11px", marginBottom: "20px" }}>
                <div>
                  <h4 style={{ fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "3px" }}>Supplier Details</h4>
                  <p><strong>Name:</strong> {printDetailData.vendor?.vendorName}</p>
                  <p><strong>ID:</strong> {printDetailData.vendor?.vendorID}</p>
                  <p><strong>Phone:</strong> {printDetailData.vendor?.primaryPhone}</p>
                  <p><strong>Address:</strong> {printDetailData.vendor?.address}</p>
                </div>
                <div>
                  <h4 style={{ fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "3px" }}>Invoice Details</h4>
                  <p><strong>Invoice Code:</strong> {printDetailData.invoiceNumber}</p>
                  <p><strong>Bill Date:</strong> {printDetailData.purchaseDate ? new Date(printDetailData.purchaseDate).toLocaleDateString("en-GB") : "N/A"}</p>
                  <p><strong>Payment Status:</strong> {printDetailData.paymentStatus}</p>
                  <p><strong>Payment Method:</strong> {printDetailData.paymentMethod}</p>
                </div>
              </div>
            </div>

            <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Ingredient Name</th>
                  <th style={{ textAlign: "left" }}>Category</th>
                  <th style={{ textAlign: "center" }}>Quantity</th>
                  <th style={{ textAlign: "right" }}>Unit Price</th>
                  <th style={{ textAlign: "right" }}>Total Price</th>
                </tr>
              </thead>
              <tbody>
                {printDetailData.items?.map((item) => (
                  <tr key={item._id}>
                    <td>{item.ingredient?.name} ({item.ingredient?.unit})</td>
                    <td>{item.ingredient?.category?.categoryName || "N/A"}</td>
                    <td style={{ textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right" }}>{(item.unitPrice || 0).toFixed(2)} BDT</td>
                    <td style={{ textAlign: "right" }}>{(item.totalPrice || 0).toFixed(2)} BDT</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: "250px", fontSize: "11px", border: "1px solid #d1d5db", padding: "10px", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span>Grand Total:</span>
                  <span style={{ fontWeight: "bold" }}>{(printDetailData.grandTotal || 0).toFixed(2)} BDT</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span>Amount Paid:</span>
                  <span>{(printDetailData.paidAmount || 0).toFixed(2)} BDT</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px solid #e5e7eb", paddingTop: "5px", color: "red" }}>
                  <span>Balance Due:</span>
                  <span>{((printDetailData.grandTotal || 0) - (printDetailData.paidAmount || 0)).toFixed(2)} BDT</span>
                </div>
              </div>
            </div>
          </PrintReportTemplate>
        )}
      </div>

      {/* Hidden print container for purchases list */}
      <div style={{ display: "none" }}>
        {printListData && (
          <PrintReportTemplate
            ref={printListRef}
            title="Purchase Invoices & Dues"
            subtitle="All recorded supplier purchases and payment statuses"
            dateRange={
              fromDate && toDate
                ? `${fromDate.toLocaleDateString("en-GB")} to ${toDate.toLocaleDateString("en-GB")}`
                : "All Time"
            }
          >
            <table className="print-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Supplier Name</th>
                  <th style={{ textAlign: "center" }}>Items</th>
                  <th style={{ textAlign: "right" }}>Grand Total</th>
                  <th style={{ textAlign: "right" }}>Amount Paid</th>
                  <th style={{ textAlign: "right" }}>Balance Due</th>
                  <th>Status</th>
                  <th>Bill Date</th>
                </tr>
              </thead>
              <tbody>
                {printListData.map((purchase) => (
                  <tr key={purchase._id}>
                    <td>{purchase.invoiceNumber}</td>
                    <td>{purchase.vendor?.vendorName || "Unknown"}</td>
                    <td style={{ textAlign: "center" }}>{purchase.items?.length || 0}</td>
                    <td style={{ textAlign: "right" }}>{(purchase.grandTotal || 0).toFixed(2)} BDT</td>
                    <td style={{ textAlign: "right" }}>{(purchase.paidAmount || 0).toFixed(2)} BDT</td>
                    <td style={{ textAlign: "right" }}>{((purchase.grandTotal || 0) - (purchase.paidAmount || 0)).toFixed(2)} BDT</td>
                    <td>{purchase.paymentStatus}</td>
                    <td>{purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString("en-GB") : "N/A"}</td>
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

export default PurchasesPage;
