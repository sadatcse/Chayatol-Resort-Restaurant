"use client";

import React, { useState, useContext, useMemo } from "react";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus, FiCheckCircle, FiXCircle, FiTruck, FiBookOpen, FiAlertCircle, FiDollarSign } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useVendors from "@/hooks/useVendors";
import { AuthContext } from "@/providers/AuthProvider";
import usePagePermission from "@/hooks/usePagePermission";

const INITIAL_FORM_DATA = {
  vendorID: "",
  vendorName: "",
  primaryPhone: "",
  primaryEmail: "",
  address: "",
  contactPersonName: "",
  contactPersonPhone: "",
  status: "Active",
  notes: ""
};

const VendorsPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const { canAdd, canEdit, canDelete } = usePagePermission();
  const canPerformAction = canEdit || canDelete;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { vendors, totalPages, totalItems, totalCount, activeCount, inactiveCount, isLoading, refetch } = useVendors(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [paymentFilter, setPaymentFilter] = useState("all"); // "all" | "outstanding" | "settled"

  // Compute counts from loaded vendors (all pages are server-side, but we filter the current page display)
  const outstandingCount = useMemo(() => vendors.filter(v => (v.totalDue || 0) > 0).length, [vendors]);
  const settledCount = useMemo(() => vendors.filter(v => (v.totalDue || 0) === 0).length, [vendors]);

  // Apply client-side payment filter on top of server-side paginated data
  const filteredVendors = useMemo(() => {
    if (paymentFilter === "outstanding") return vendors.filter(v => (v.totalDue || 0) > 0);
    if (paymentFilter === "settled") return vendors.filter(v => (v.totalDue || 0) === 0);
    return vendors;
  }, [vendors, paymentFilter]);

  const openModal = (vendorToEdit = null) => {
    if (vendorToEdit) {
      setEditId(vendorToEdit._id);
      setFormData({
        vendorID: vendorToEdit.vendorID || "",
        vendorName: vendorToEdit.vendorName || "",
        primaryPhone: vendorToEdit.primaryPhone || "",
        primaryEmail: vendorToEdit.primaryEmail || "",
        address: vendorToEdit.address || "",
        contactPersonName: vendorToEdit.contactPersonName || "",
        contactPersonPhone: vendorToEdit.contactPersonPhone || "",
        status: vendorToEdit.status || "Active",
        notes: vendorToEdit.notes || ""
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddOrEditVendor = async () => {
    if (isSubmitting) return;
    if (!formData.vendorID || !formData.vendorID.trim()) {
      Swal.fire({ title: "Validation Error", text: "Please provide a Vendor ID.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }
    if (!formData.vendorName || !formData.vendorName.trim()) {
      Swal.fire({ title: "Validation Error", text: "Please provide the vendor name.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }
    if (!formData.primaryPhone || !formData.primaryPhone.trim()) {
      Swal.fire({ title: "Validation Error", text: "Please provide a primary phone number.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }

    if (editId) {
      if (!canEdit) {
        Swal.fire("Restricted", "You do not have permission to edit vendor details.", "warning");
        return;
      }
    } else {
      if (!canAdd) {
        Swal.fire("Restricted", "You do not have permission to add new vendors.", "warning");
        return;
      }
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      vendorID: formData.vendorID.trim().toUpperCase(),
      vendorName: formData.vendorName.trim(),
      primaryPhone: formData.primaryPhone.trim(),
      primaryEmail: formData.primaryEmail?.trim(),
      address: formData.address?.trim(),
      contactPersonName: formData.contactPersonName?.trim(),
      contactPersonPhone: formData.contactPersonPhone?.trim(),
      notes: formData.notes?.trim()
    };

    try {
      if (editId) {
        await axiosSecure.put(`/vendor/update/${editId}`, payload);
      } else {
        await axiosSecure.post("/vendor/post", payload);
      }
      await refetch();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Vendor details successfully ${editId ? "updated" : "saved"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save vendor details.",
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
        text: "You do not have permission to delete vendors.",
        icon: "warning",
        confirmButtonColor: "#346E36",
      });
      return;
    }
    if (isDeleting) return;

    Swal.fire({
      title: "Are you sure?",
      text: "This vendor might be linked to purchase histories and cannot be deleted if in use.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsDeleting(true);
        try {
          await axiosSecure.delete(`/vendor/delete/${id}`);
          await refetch();
          Swal.fire({
            title: "Deleted!",
            text: "Vendor profile deleted.",
            icon: "success",
            confirmButtonColor: "#346E36",
          });
        } catch (error) {
          Swal.fire({
            title: "Error!",
            text: error.response?.data?.message || "Failed to delete vendor.",
            icon: "error",
            confirmButtonColor: "#346E36"
          });
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };
  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      
      {/* Header & Inline Search */}
      <SectionHeader 
        title="Vendor Management" 
        subtitle="Manage supplier profiles, contact information, addresses, and purchase notes."
      >
        <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-80 h-12">
          <FiSearch className="text-brand-sage text-lg" />
          <input
            type="text"
            className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
            placeholder="Search vendor name or ID..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </label>
      </SectionHeader>

      {/* Stats Block */}
      <div className="stats shadow-sm bg-white dark:bg-brand-charcoal w-full mb-8 border border-brand-beige dark:border-brand-beige/20 rounded-2xl overflow-hidden hidden md:flex animate-fade-in">
        <div className="stat place-items-center py-6">
          <div className="stat-figure text-brand-primary bg-brand-primary/10 p-4 rounded-full">
            <FiTruck className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Total Suppliers</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-4xl mt-1">{totalCount}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-emerald-500 bg-emerald-500/10 p-4 rounded-full">
            <FiCheckCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Active Suppliers</div>
          <div className="stat-value text-emerald-600 dark:text-emerald-400 text-4xl mt-1">{activeCount}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-red-500 bg-red-500/10 p-4 rounded-full">
            <FiXCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Inactive Suppliers</div>
          <div className="stat-value text-red-500 dark:text-red-400 text-4xl mt-1">{inactiveCount}</div>
        </div>
        <div
          className={`stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20 cursor-pointer transition-colors ${
            paymentFilter === "outstanding" ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-red-50/50 dark:hover:bg-red-950/10"
          }`}
          onClick={() => setPaymentFilter(prev => prev === "outstanding" ? "all" : "outstanding")}
          title="Click to filter by Outstanding"
        >
          <div className="stat-figure text-red-500 bg-red-500/10 p-4 rounded-full">
            <FiAlertCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Outstanding (This Page)</div>
          <div className="stat-value text-red-500 dark:text-red-400 text-4xl mt-1">{outstandingCount}</div>
          {paymentFilter === "outstanding" && <div className="stat-desc text-[9px] font-bold text-red-500 uppercase tracking-wider mt-1">● Filtering Active</div>}
        </div>
        <div
          className={`stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20 cursor-pointer transition-colors ${
            paymentFilter === "settled" ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10"
          }`}
          onClick={() => setPaymentFilter(prev => prev === "settled" ? "all" : "settled")}
          title="Click to filter by Settled"
        >
          <div className="stat-figure text-emerald-500 bg-emerald-500/10 p-4 rounded-full">
            <FiDollarSign className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Settled (This Page)</div>
          <div className="stat-value text-emerald-600 dark:text-emerald-400 text-4xl mt-1">{settledCount}</div>
          {paymentFilter === "settled" && <div className="stat-desc text-[9px] font-bold text-emerald-600 uppercase tracking-wider mt-1">● Filtering Active</div>}
        </div>
      </div>

      {/* Display selector, payment filter & Add button */}
      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Per-page selector */}
          <div className="flex items-center gap-2 text-xs font-bold text-brand-sage uppercase tracking-widest">
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
            <span className="ml-2">Total Records: {totalItems}</span>
          </div>

          {/* Payment status filter */}
          <div className="flex items-center gap-2 text-xs font-bold text-brand-sage uppercase tracking-widest">
            <span>Filter</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="select select-bordered select-xs bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige dark:border-brand-beige/20 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-8 px-2"
            >
              <option value="all">All Vendors</option>
              <option value="outstanding">Outstanding</option>
              <option value="settled">Settled</option>
            </select>
          </div>

          {paymentFilter !== "all" && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
              Showing {filteredVendors.length} of {vendors.length} on this page
            </span>
          )}
        </div>

        {canAdd && (
          <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10 cursor-pointer">
            <FiPlus className="text-lg" />
            <span className="uppercase tracking-widest text-xs font-bold">New Vendor</span>
          </button>
        )}
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
                    <th className="pl-8 py-5 w-28">Vendor ID</th>
                    <th className="py-5">Vendor Name</th>
                    <th className="py-5">Phone</th>
                    <th className="py-5 text-center">Purchases</th>
                    <th className="py-5">Total Due</th>
                    <th className="py-5">Status</th>
                    <th className="pr-8 text-center py-5 w-44">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredVendors.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          {paymentFilter !== "all"
                            ? `No ${paymentFilter === "outstanding" ? "outstanding" : "settled"} vendors on this page.`
                            : "No vendors found."}
                        </td>
                      </tr>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <motion.tr
                          key={vendor._id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm"
                        >
                          <td className="pl-8 py-4 font-bold text-brand-primary dark:text-brand-sage font-mono">
                            {vendor.vendorID}
                          </td>
                          <td className="py-4 font-bold uppercase tracking-wide">
                            {vendor.vendorName}
                          </td>
                           <td className="py-4 font-mono">
                            {vendor.primaryPhone}
                          </td>
                          <td className="py-4 font-mono font-bold text-center text-brand-primary dark:text-brand-sage">
                            {vendor.purchaseCount || 0}
                          </td>
                          <td className={`py-4 font-mono font-bold ${(vendor.totalDue || 0) > 0 ? "text-red-500 font-extrabold" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {(vendor.totalDue || 0).toFixed(2)} BDT
                          </td>
                          <td className="py-4">
                            {vendor.status === "Active" ? (
                              <span className="badge badge-success bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider">Active</span>
                            ) : (
                              <span className="badge badge-error bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-450 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider">Inactive</span>
                            )}
                          </td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center gap-2">
                              {canPerformAction ? (
                                <>
                                  <Link href={`/dashboard/maintain-stocks/vendors/ledger?vendorId=${vendor._id}`}>
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="View Ledger">
                                      <FiBookOpen size={16} />
                                    </motion.button>
                                  </Link>
                                  {canEdit && (
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openModal(vendor)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Edit Vendor">
                                      <FiEdit size={16} />
                                    </motion.button>
                                  )}
                                  {canDelete && (
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(vendor._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Delete Vendor">
                                      <FiTrash2 size={16} />
                                    </motion.button>
                                  )}
                                </>
                              ) : (
                                <Link href={`/dashboard/maintain-stocks/vendors/ledger?vendorId=${vendor._id}`}>
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="View Ledger">
                                    <FiBookOpen size={16} />
                                  </motion.button>
                                </Link>
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
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-2xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Vendor Details' : 'Register New Vendor'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-5 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Vendor ID *</span></label>
                  <input
                    type="text"
                    name="vendorID"
                    value={formData.vendorID}
                    onChange={handleInputChange}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono uppercase"
                    placeholder="e.g. VND-001"
                    disabled={!!editId}
                    autoFocus={!editId}
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Vendor Name *</span></label>
                  <input
                    type="text"
                    name="vendorName"
                    value={formData.vendorName}
                    onChange={handleInputChange}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholder="e.g. Mondol Agro"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Primary Phone *</span></label>
                  <input
                    type="text"
                    name="primaryPhone"
                    value={formData.primaryPhone}
                    onChange={handleInputChange}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                    placeholder="e.g. +8801700000000"
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Primary Email</span></label>
                  <input
                    type="email"
                    name="primaryEmail"
                    value={formData.primaryEmail}
                    onChange={handleInputChange}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                    placeholder="vendor@domain.com"
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Address</span></label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="e.g. Dhaka, Bangladesh"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Contact Person Name</span></label>
                  <input
                    type="text"
                    name="contactPersonName"
                    value={formData.contactPersonName}
                    onChange={handleInputChange}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholder="Optional"
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Contact Person Phone</span></label>
                  <input
                    type="text"
                    name="contactPersonPhone"
                    value={formData.contactPersonPhone}
                    onChange={handleInputChange}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Notes</span></label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-20"
                  placeholder="e.g. Delivers fresh items every Monday morning."
                />
              </div>

              {/* Status Toggle */}
              <div className="form-control w-full p-4 bg-brand-offwhite dark:bg-brand-charcoal/50 border border-brand-beige dark:border-brand-beige/20 rounded-2xl flex flex-row items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest">Active status</span>
                  <span className="text-[10px] text-brand-sage/80 block mt-1">Inactive vendors cannot be selected for recording new purchases.</span>
                </div>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="select select-bordered select-sm border-brand-primary dark:border-brand-primary/50 focus:outline-none rounded-xl text-xs bg-white dark:bg-brand-charcoal font-bold w-36"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleAddOrEditVendor} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Saving...
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

export default VendorsPage;
