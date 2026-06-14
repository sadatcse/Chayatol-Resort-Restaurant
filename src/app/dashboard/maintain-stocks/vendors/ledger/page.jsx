"use client";

import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiDollarSign, FiFileText, FiCheckCircle, FiXCircle, FiAlertCircle, FiX, FiInfo } from "react-icons/fi";
import Swal from "sweetalert2";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";

const VendorLedgerPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendorId");
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const [vendor, setVendor] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Track all invoices, active tab, and payment history transactions
  const [allInvoices, setAllInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState("invoices");
  const [paymentTransactions, setPaymentTransactions] = useState([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);

  // Compute total statistics dynamically from invoices and payment logs reactively
  const stats = useMemo(() => {
    const totalAmount = allInvoices.reduce((sum, item) => sum + (item.grandTotal || 0), 0);
    const totalPaid = paymentTransactions.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalDue = totalAmount - totalPaid;
    return { totalAmount, totalPaid, totalDue };
  }, [allInvoices, paymentTransactions]);

  // Fetch Vendor Payment History from the new model endpoint
  const fetchPaymentTransactions = useCallback(async () => {
    if (!vendorId) return;
    setIsPaymentsLoading(true);
    try {
      const { data } = await axiosSecure.get(`/vendor-payment?vendorId=${vendorId}`);
      setPaymentTransactions(data || []);
    } catch (error) {
      console.error("Failed to fetch vendor payment transactions:", error);
    } finally {
      setIsPaymentsLoading(false);
    }
  }, [vendorId, axiosSecure]);

  // Payment modal state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Payment states
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkAmount, setBulkAmount] = useState(0);
  const [bulkMethod, setBulkMethod] = useState("Cash");
  const [bulkNote, setBulkNote] = useState("");

  const openBulkPaymentModal = () => {
    setBulkAmount(stats.totalDue > 0 ? Number(stats.totalDue.toFixed(2)) : 0);
    setBulkMethod("Cash");
    setBulkNote("");
    setIsBulkOpen(true);
  };

  const closeBulkPaymentModal = () => {
    setIsBulkOpen(false);
  };

  const handleBulkPayment = async (e) => {
    e.preventDefault();
    const payAmt = Number(bulkAmount);

    if (isNaN(payAmt) || payAmt <= 0) {
      Swal.fire({ title: "Validation Error", text: "Bulk payment amount must be greater than zero.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Fetch all invoices for allocation
      const { data } = await axiosSecure.get(`/purchase/paginated?page=1&limit=1000&vendorId=${vendorId}`);
      const allInvoices = data.data || [];
      
      // Filter pending invoices, sorted by purchaseDate ASC (oldest first)
      const pendingInvoices = allInvoices
        .filter(inv => (inv.grandTotal - inv.paidAmount) > 0)
        .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));

      let remainingPayment = payAmt;
      const updates = [];

      for (const invoice of pendingInvoices) {
        if (remainingPayment <= 0) break;

        const invoiceDue = invoice.grandTotal - invoice.paidAmount;
        const paymentAllocated = Math.min(remainingPayment, invoiceDue);

        const updatedPaidAmount = Number(invoice.paidAmount) + paymentAllocated;
        let paymentStatus = "Unpaid";
        if (updatedPaidAmount >= invoice.grandTotal) {
          paymentStatus = "Paid";
        } else if (updatedPaidAmount > 0) {
          paymentStatus = "Partial";
        }

        const updatedPayments = [
          ...(invoice.payments || []),
          {
            amount: paymentAllocated,
            paymentDate: new Date().toISOString(),
            paymentMethod: bulkMethod,
            note: bulkNote.trim() || "Bulk payment allocation"
          }
        ];

        const payload = {
          vendor: invoice.vendor?._id || invoice.vendor,
          invoiceNumber: invoice.invoiceNumber,
          purchaseDate: invoice.purchaseDate,
          grandTotal: Number(invoice.grandTotal),
          paidAmount: updatedPaidAmount,
          paymentMethod: bulkMethod,
          paymentStatus,
          notes: invoice.notes ? `${invoice.notes}\n[Bulk Payment: ${paymentAllocated.toFixed(2)} BDT allocated via ${bulkMethod} on ${new Date().toLocaleDateString()}. Note: ${bulkNote.trim()}]` : `[Bulk Payment: ${paymentAllocated.toFixed(2)} BDT allocated via ${bulkMethod} on ${new Date().toLocaleDateString()}. Note: ${bulkNote.trim()}]`,
          items: invoice.items.map(item => ({
            ingredient: item.ingredient?._id || item.ingredient,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice)
          })),
          payments: updatedPayments
        };

        updates.push({ id: invoice._id, payload });
        remainingPayment -= paymentAllocated;
      }

      // Execute updates sequentially
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        await axiosSecure.put(`/purchase/update/${update.id}`, update.payload);
      }

      // If there's still excess money left, log it as an advance payment in VendorPayment collection
      if (remainingPayment > 0) {
        await axiosSecure.post("/vendor-payment", {
          vendor: vendorId,
          amount: remainingPayment,
          paymentDate: new Date().toISOString(),
          paymentMethod: bulkMethod,
          note: bulkNote.trim() ? `${bulkNote.trim()} (Advance Payment)` : "Advance payment balance from bulk distribution"
        });
      }

      Swal.fire({
        title: "Success",
        text: remainingPayment > 0 && payAmt > remainingPayment
          ? `Cleared pending dues across ${updates.length} invoice(s) and logged ${remainingPayment.toFixed(2)} BDT as general advance payment.`
          : remainingPayment > 0
          ? `Recorded ${remainingPayment.toFixed(2)} BDT as general advance payment.`
          : `Bulk payment of ${payAmt.toFixed(2)} BDT successfully distributed across ${updates.length} invoice(s).`,
        icon: "success",
        confirmButtonColor: "#346E36"
      });
      fetchVendorInvoices();
      fetchPaymentTransactions();
      closeBulkPaymentModal();
    } catch (error) {
      Swal.fire({
        title: "Transaction Failed",
        text: error.response?.data?.error || error.response?.data?.message || "Failed to process bulk payment.",
        icon: "error",
        confirmButtonColor: "#346E36"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch Vendor Details
  const fetchVendorDetails = useCallback(async () => {
    if (!vendorId) return;
    try {
      const { data } = await axiosSecure.get("/vendor");
      const found = data.find(v => v._id === vendorId);
      if (found) {
        setVendor(found);
      } else {
        Swal.fire("Error", "Supplier profile not found.", "error");
        router.push("/dashboard/maintain-stocks/vendors/ledger");
      }
    } catch (error) {
      console.error("Failed to load vendor details:", error);
    }
  }, [vendorId, axiosSecure, router]);

  // Fetch Vendor Invoices & Stats
  const fetchVendorInvoices = useCallback(async () => {
    if (!vendorId) return;
    setIsLoading(true);
    try {
      const { data } = await axiosSecure.get(
        `/purchase/paginated?page=${currentPage}&limit=${itemsPerPage}&vendorId=${vendorId}`
      );
      setInvoices(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.totalDocuments || 0);

      // Compute total statistics across all invoices for this vendor
      const allInvoicesRes = await axiosSecure.get(`/purchase/paginated?page=1&limit=1000&vendorId=${vendorId}`);
      const allInvoices = allInvoicesRes.data.data || [];
      setAllInvoices(allInvoices);
      // Stats are computed dynamically from allInvoices and paymentTransactions using useMemo
    } catch (error) {
      console.error("Failed to fetch vendor ledger:", error);
    } finally {
      setIsLoading(false);
    }
  }, [vendorId, currentPage, itemsPerPage, axiosSecure]);

  // Fetch All Vendors (fallback for when vendorId query param is absent)
  const [vendorsList, setVendorsList] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  const fetchAllVendors = useCallback(async () => {
    setVendorsLoading(true);
    try {
      const { data } = await axiosSecure.get("/vendor");
      setVendorsList(data || []);
    } catch (error) {
      console.error("Failed to load vendors list:", error);
    } finally {
      setVendorsLoading(false);
    }
  }, [axiosSecure]);

  useEffect(() => {
    if (vendorId) {
      fetchVendorDetails();
      fetchVendorInvoices();
      fetchPaymentTransactions();
    } else {
      fetchAllVendors();
    }
  }, [vendorId, fetchVendorDetails, fetchVendorInvoices, fetchPaymentTransactions, fetchAllVendors]);

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    const due = (invoice.grandTotal || 0) - (invoice.paidAmount || 0);
    setPaymentAmount(due > 0 ? Number(due.toFixed(2)) : 0);
    setPaymentMethod("Cash");
    setPaymentNote("");
  };

  const closePaymentModal = () => {
    setSelectedInvoice(null);
  };

  const handleClearDue = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const remainingDue = selectedInvoice.grandTotal - selectedInvoice.paidAmount;
    const payAmt = Number(paymentAmount);

    if (isNaN(payAmt) || payAmt <= 0) {
      Swal.fire({ title: "Validation Error", text: "Payment amount must be greater than zero.", icon: "warning", confirmButtonColor: "#346E36" });
      return;
    }

    const invoiceAllocated = Math.min(payAmt, remainingDue);
    const excessAmount = payAmt - invoiceAllocated;

    setIsSubmitting(true);
    
    // Prepare updated purchase invoice details payload
    const updatedPaidAmount = Number(selectedInvoice.paidAmount) + invoiceAllocated;
    let paymentStatus = "Unpaid";
    if (updatedPaidAmount >= selectedInvoice.grandTotal) {
      paymentStatus = "Paid";
    } else if (updatedPaidAmount > 0) {
      paymentStatus = "Partial";
    }

    const updatedPayments = [
      ...(selectedInvoice.payments || []),
      {
        amount: invoiceAllocated,
        paymentDate: new Date().toISOString(),
        paymentMethod,
        note: paymentNote.trim() || "Ledger payment clear"
      }
    ];

    const payload = {
      vendor: selectedInvoice.vendor?._id || selectedInvoice.vendor,
      invoiceNumber: selectedInvoice.invoiceNumber,
      purchaseDate: selectedInvoice.purchaseDate,
      grandTotal: Number(selectedInvoice.grandTotal),
      paidAmount: updatedPaidAmount,
      paymentMethod,
      paymentStatus,
      notes: selectedInvoice.notes ? `${selectedInvoice.notes}\n[Payment Log: ${invoiceAllocated} BDT paid via ${paymentMethod} on ${new Date().toLocaleDateString()}. Note: ${paymentNote.trim()}]` : `[Payment Log: ${invoiceAllocated} BDT paid via ${paymentMethod} on ${new Date().toLocaleDateString()}. Note: ${paymentNote.trim()}]`,
      items: selectedInvoice.items.map(item => ({
        ingredient: item.ingredient?._id || item.ingredient,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice)
      })),
      payments: updatedPayments
    };

    try {
      await axiosSecure.put(`/purchase/update/${selectedInvoice._id}`, payload);

      // If there is excess, save it as advance payment in VendorPayment collection
      if (excessAmount > 0) {
        await axiosSecure.post("/vendor-payment", {
          vendor: vendorId,
          purchase: selectedInvoice._id,
          invoiceNumber: selectedInvoice.invoiceNumber,
          amount: excessAmount,
          paymentDate: new Date().toISOString(),
          paymentMethod,
          note: paymentNote.trim() ? `${paymentNote.trim()} (Excess Advance)` : `Excess payment above outstanding due on invoice ${selectedInvoice.invoiceNumber}`
        });
      }

      Swal.fire({
        title: "Success",
        text: excessAmount > 0 
          ? `Cleared invoice ${selectedInvoice.invoiceNumber} due and recorded ${excessAmount.toFixed(2)} BDT as general advance payment.`
          : `Logged payment of ${payAmt} BDT against invoice ${selectedInvoice.invoiceNumber}.`,
        icon: "success",
        confirmButtonColor: "#346E36"
      });
      fetchVendorInvoices();
      fetchPaymentTransactions();
      closePaymentModal();
    } catch (error) {
      Swal.fire({
        title: "Transaction Failed",
        text: error.response?.data?.error || error.response?.data?.message || "Failed to record ledger payment.",
        icon: "error",
        confirmButtonColor: "#346E36"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status) => {
    const styles = { 
      Paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider", 
      Unpaid: "bg-red-100 text-red-850 dark:bg-red-950/30 dark:text-red-400 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider", 
      Partial: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-none font-bold text-[10px] px-3 py-2.5 uppercase tracking-wider" 
    };
    return <span className={`badge ${styles[status]}`}>{status}</span>;
  };

  const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  if (!vendorId) {
    return (
      <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
        
        {/* Back to Vendors & Title Header */}
        <div className="mb-4">
          <button 
            onClick={() => router.push("/dashboard/maintain-stocks/vendors")}
            className="btn btn-sm btn-ghost gap-2 pl-0 hover:bg-transparent text-brand-sage hover:text-brand-primary"
          >
            <FiArrowLeft size={16} />
            <span className="uppercase tracking-widest text-xs font-bold">Back to Vendors</span>
          </button>
        </div>

        <SectionHeader 
          title="Supplier Ledger Select"
          subtitle="Select a supplier to view their ledger, purchase bills, payment history, and clear outstanding balances."
        />

        <div className="max-w-xl mx-auto mt-12 bg-white dark:bg-brand-charcoal p-8 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm space-y-6">
          <div className="text-center">
            <FiFileText size={48} className="mx-auto text-brand-primary dark:text-brand-sage mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-brand-black dark:text-brand-offwhite uppercase tracking-wider">Select a Supplier</h3>
            <p className="text-xs text-brand-sage mt-1">Choose a supplier below to audit their account statement.</p>
          </div>

          {vendorsLoading ? (
            <div className="py-12 flex justify-center">
              <span className="loading loading-spinner loading-md text-brand-primary"></span>
            </div>
          ) : (
            <div className="form-control w-full space-y-4">
              <div>
                <label className="label py-1">
                  <span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Select Supplier *</span>
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      router.push(`/dashboard/maintain-stocks/vendors/ledger?vendorId=${e.target.value}`);
                    }
                  }}
                  defaultValue=""
                  className="select select-bordered w-full border-brand-primary dark:border-brand-primary/50 focus:outline-none rounded-xl text-xs bg-white dark:bg-brand-charcoal font-semibold text-brand-charcoal dark:text-brand-offwhite h-12"
                >
                  <option value="" disabled>-- Choose a Supplier --</option>
                  {vendorsList.map((v) => (
                    <option key={v._id} value={v._id} className="dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite">
                      {v.vendorName} ({v.vendorID})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => router.push("/dashboard/maintain-stocks/vendors")}
                  className="btn btn-sm btn-outline border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white border-2 font-bold uppercase tracking-widest text-[10px] px-6 py-2.5 h-auto rounded-xl shadow-none cursor-pointer"
                >
                  Go to Vendor Management
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      
      {/* Back to Vendors & Title Header */}
      <div className="mb-4">
        <button 
          onClick={() => router.push("/dashboard/maintain-stocks/vendors")}
          className="btn btn-sm btn-ghost gap-2 pl-0 hover:bg-transparent text-brand-sage hover:text-brand-primary"
        >
          <FiArrowLeft size={16} />
          <span className="uppercase tracking-widest text-xs font-bold">Back to Vendors</span>
        </button>
      </div>

      <SectionHeader 
        title={`Supplier Ledger: ${vendor?.vendorName || "Loading..."}`}
        subtitle={`Audit supplier purchase bills, payment schedules, and clear outstanding balances.`}
      />

      {/* Supplier Profile Info Block */}
      {vendor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Contact Details Card */}
          <div className="bg-white dark:bg-brand-charcoal p-6 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-brand-primary dark:text-brand-sage uppercase tracking-wider border-b border-brand-beige dark:border-brand-beige/15 pb-2">Supplier Profile</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-brand-sage font-semibold uppercase tracking-wider text-[9px]">ID</span>
                <span className="font-bold text-brand-black dark:text-brand-offwhite font-mono">{vendor.vendorID}</span>
              </div>
              <div>
                <span className="block text-brand-sage font-semibold uppercase tracking-wider text-[9px]">Status</span>
                <span className={`badge ${vendor.status === "Active" ? "badge-success text-emerald-800 bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400" : "badge-error text-red-800 bg-red-100 dark:bg-red-950/30 dark:text-red-400"} border-none text-[9px] font-bold uppercase tracking-wider`}>{vendor.status}</span>
              </div>
              <div>
                <span className="block text-brand-sage font-semibold uppercase tracking-wider text-[9px]">Phone</span>
                <span className="font-semibold text-brand-black dark:text-brand-offwhite font-mono">{vendor.primaryPhone}</span>
              </div>
              <div>
                <span className="block text-brand-sage font-semibold uppercase tracking-wider text-[9px]">Email</span>
                <span className="font-semibold text-brand-black dark:text-brand-offwhite truncate block max-w-[120px]" title={vendor.primaryEmail}>{vendor.primaryEmail || "N/A"}</span>
              </div>
            </div>
            <div className="text-xs pt-2">
              <span className="block text-brand-sage font-semibold uppercase tracking-wider text-[9px]">Address</span>
              <span className="font-medium text-brand-charcoal dark:text-brand-offwhite">{vendor.address || "No address stored"}</span>
            </div>
          </div>

          {/* Additional Notes Card */}
          <div className="bg-white dark:bg-brand-charcoal p-6 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-brand-primary dark:text-brand-sage uppercase tracking-wider border-b border-brand-beige dark:border-brand-beige/15 pb-2">Purchase & Delivery Notes</h3>
              <p className="text-xs text-brand-sage leading-relaxed mt-3 italic">
                {vendor.notes ? `"${vendor.notes}"` : "No special notes recorded for this supplier profile."}
              </p>
            </div>
            {vendor.contactPersonName && (
              <div className="text-xs border-t border-brand-beige dark:border-brand-beige/15 pt-3 mt-3">
                <span className="block font-bold text-[9px] text-brand-primary dark:text-brand-sage uppercase tracking-wider">Contact Person</span>
                <span className="font-bold">{vendor.contactPersonName}</span> {vendor.contactPersonPhone && <span className="font-mono text-brand-sage">({vendor.contactPersonPhone})</span>}
              </div>
            )}
          </div>

          {/* Stats Aggregations Card */}
          <div className="bg-white dark:bg-brand-charcoal p-6 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-brand-primary dark:text-brand-sage uppercase tracking-wider border-b border-brand-beige dark:border-brand-beige/15 pb-2">Financial Balance Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-sage font-semibold uppercase tracking-wider">Total Purchases:</span>
                <span className="font-mono font-bold text-brand-black dark:text-brand-offwhite">{stats.totalAmount.toFixed(2)} BDT</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-sage font-semibold uppercase tracking-wider">Total Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{stats.totalPaid.toFixed(2)} BDT</span>
              </div>
              <div className="flex justify-between items-center border-t border-brand-beige dark:border-brand-beige/15 pt-2 text-sm font-bold">
                <span className="text-brand-primary dark:text-brand-sage uppercase tracking-wider text-xs font-extrabold">
                  {stats.totalDue < 0 ? "Advance Balance:" : "Outstanding Balance:"}
                </span>
                <span className={`font-mono text-base ${stats.totalDue > 0 ? "text-red-500 font-black" : "text-emerald-600 dark:text-emerald-400 font-black"}`}>
                  {stats.totalDue < 0 ? `${Math.abs(stats.totalDue).toFixed(2)} BDT` : `${stats.totalDue.toFixed(2)} BDT`}
                </span>
              </div>
            </div>
            {canPerformAction ? (
              <div className="pt-2 border-t border-brand-beige dark:border-brand-beige/15">
                <button
                  onClick={openBulkPaymentModal}
                  className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white border-none font-bold uppercase tracking-widest text-[10px] w-full py-2.5 h-auto rounded-xl shadow-md cursor-pointer"
                >
                  {stats.totalDue <= 0 ? "Record Advance Payment" : "Clear Dues in Bulk"}
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-brand-beige dark:border-brand-beige/15">
                <span className="text-[10px] text-brand-sage font-bold uppercase tracking-widest block text-center">Payment Restricted</span>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tabs Selection */}
      {vendor && (
        <div className="flex border-b border-brand-beige dark:border-brand-beige/25 mb-6 gap-2">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 rounded-t-xl ${
              activeTab === "invoices"
                ? "text-brand-primary border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10"
                : "border-transparent text-brand-sage hover:text-brand-primary hover:bg-brand-offwhite/50 dark:hover:bg-brand-charcoal/50"
            }`}
          >
            <FiFileText size={16} />
            Purchase Invoices & Dues
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 rounded-t-xl ${
              activeTab === "payments"
                ? "text-brand-primary border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10"
                : "border-transparent text-brand-sage hover:text-brand-primary hover:bg-brand-offwhite/50 dark:hover:bg-brand-charcoal/50"
            }`}
          >
            <FiDollarSign size={16} />
            Supplier Payment History
          </button>
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === "invoices" ? (
        /* Invoices List Table Section */
        <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden">
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
                      <th className="pl-8 py-5 w-32">Invoice Number</th>
                      <th className="py-5">Purchase Date</th>
                      <th className="py-5 text-right">Invoice Total</th>
                      <th className="py-5 text-right">Amount Paid</th>
                      <th className="py-5 text-right">Balance Due</th>
                      <th className="py-5 text-center">Status</th>
                      <th className="pr-8 text-center py-5 w-40">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No purchase invoices recorded for this supplier ledger.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => {
                        const due = (invoice.grandTotal || 0) - (invoice.paidAmount || 0);
                        const isDue = due > 0;
                        return (
                          <tr key={invoice._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm">
                            <td className="pl-8 py-4 font-bold text-brand-primary dark:text-brand-sage font-mono">
                              <div>{invoice.invoiceNumber}</div>
                              {invoice.payments && invoice.payments.length > 0 && (
                                <div className="mt-1 space-y-1">
                                  <span className="text-[8px] text-brand-sage font-bold uppercase tracking-wider block">Payments Log:</span>
                                  {invoice.payments.map((p, idx) => (
                                    <div key={p._id || idx} className="text-[9px] text-brand-sage font-mono leading-tight flex flex-wrap items-center gap-1 bg-brand-offwhite/40 dark:bg-brand-offwhite/5 px-1.5 py-0.5 rounded border border-brand-beige/20 w-fit">
                                      <span className="font-bold text-brand-primary dark:text-brand-sage">{p.amount.toFixed(2)} BDT</span> 
                                      <span>via {p.paymentMethod}</span> 
                                      <span>on {new Date(p.paymentDate).toLocaleDateString()}</span>
                                      {p.note && <span className="italic opacity-80">({p.note})</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-4 font-mono text-xs text-brand-sage">
                              {invoice.purchaseDate ? new Date(invoice.purchaseDate).toLocaleDateString("en-GB") : "N/A"}
                            </td>
                            <td className="py-4 font-mono font-bold text-right">
                              {invoice.grandTotal.toFixed(2)}
                            </td>
                            <td className="py-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-right">
                              {invoice.paidAmount.toFixed(2)}
                            </td>
                            <td className={`py-4 font-mono text-right font-bold ${isDue ? "text-red-500 font-black" : "text-brand-sage"}`}>
                              {due.toFixed(2)}
                            </td>
                            <td className="py-4 text-center">
                              {renderStatusBadge(invoice.paymentStatus)}
                            </td>
                            <td className="pr-8 py-4 text-center">
                              {isDue ? (
                                canPerformAction ? (
                                  <button 
                                    onClick={() => openPaymentModal(invoice)}
                                    className="btn btn-xs bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-[9px] px-3 py-1.5 h-auto rounded-full shadow-sm cursor-pointer"
                                  >
                                    Clear Due
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-brand-sage font-bold uppercase tracking-widest">Restricted</span>
                                )
                              ) : (
                                <span className="flex justify-center items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                  <FiCheckCircle /> Fully Paid
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination controls */}
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
        </div>
      ) : (
        /* Payment History Log Section */
        <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden animate-scale-in">
          {isPaymentsLoading ? (
            <div className="p-12 flex justify-center">
              <span className="loading loading-spinner loading-md text-brand-primary"></span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige dark:border-brand-beige/20">
                  <tr>
                    <th className="pl-8 py-5">Payment Date & Time</th>
                    <th className="py-5">Invoice Reference</th>
                    <th className="py-5">Invoice Date</th>
                    <th className="py-5 text-right">Amount Paid</th>
                    <th className="py-5">Payment Method</th>
                    <th className="pr-8 py-5">Transaction / Payment Note</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                        No payment transactions recorded for this supplier.
                      </td>
                    </tr>
                  ) : (
                    paymentTransactions.map((p, idx) => (
                      <tr key={p._id || idx} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm">
                        <td className="pl-8 py-4 font-mono text-xs font-semibold">
                          {new Date(p.paymentDate).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                          })}
                        </td>
                        <td className="py-4 font-bold text-brand-primary dark:text-brand-sage font-mono">
                          {p.invoiceNumber || "N/A"}
                        </td>
                        <td className="py-4 font-mono text-xs text-brand-sage">
                          {p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString("en-GB") : "N/A"}
                        </td>
                        <td className="py-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold text-right">
                          {p.amount.toFixed(2)} BDT
                        </td>
                        <td className="py-4 text-xs font-bold uppercase tracking-wider">
                          <span className="px-2.5 py-1 rounded bg-brand-offwhite dark:bg-brand-primary/20 text-brand-primary dark:text-brand-sage border border-brand-beige/25">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="pr-8 py-4 text-xs text-brand-sage leading-relaxed max-w-xs truncate" title={p.note}>
                          {p.note || "No transaction details recorded."}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment Clear Modal Dialog */}
      {selectedInvoice && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                Clear Invoice Due
              </h3>
              <button onClick={closePaymentModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleClearDue} className="p-0">
              <div className="p-8 space-y-4">
                
                {/* Due Info Alert Block */}
                <div className="flex gap-3 bg-brand-primary/10 dark:bg-brand-primary/20 p-4 rounded-xl border border-brand-primary/25 text-xs">
                  <FiInfo size={20} className="text-brand-primary dark:text-brand-sage shrink-0" />
                  <div className="space-y-1 text-brand-charcoal dark:text-brand-offwhite/85">
                    <p className="font-bold">Invoice: <span className="font-mono text-brand-primary dark:text-brand-sage">{selectedInvoice.invoiceNumber}</span></p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 font-medium">
                      <span>Grand Total:</span>
                      <span className="font-mono font-bold text-right">{selectedInvoice.grandTotal.toFixed(2)} BDT</span>
                      <span>Already Paid:</span>
                      <span className="font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">{selectedInvoice.paidAmount.toFixed(2)} BDT</span>
                      <span className="font-bold text-brand-primary dark:text-brand-sage">Remaining Due:</span>
                      <span className="font-mono font-black text-right text-red-500">{((selectedInvoice.grandTotal) - (selectedInvoice.paidAmount)).toFixed(2)} BDT</span>
                    </div>
                  </div>
                </div>

                {/* Amount to Clear */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Amount (BDT) *</span></label>
                  <input
                    type="number"
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Method *</span></label>
                  <select 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)} 
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none rounded-xl text-xs bg-white dark:bg-brand-charcoal font-semibold text-brand-charcoal dark:text-brand-offwhite" 
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Mobile">Mobile Payment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Optional Note */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Transaction / Payment Note</span></label>
                  <textarea
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="textarea textarea-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-20 text-xs"
                    placeholder="e.g. Account balance cleared via bank transfer ref#1234..."
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
                <button type="button" onClick={closePaymentModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
                <button type="submit" className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Recording...
                    </>
                  ) : "Clear Payment"}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Bulk Payment Modal Dialog */}
      {isBulkOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                Supplier Bulk Payment
              </h3>
              <button onClick={closeBulkPaymentModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleBulkPayment} className="p-0">
              <div className="p-8 space-y-4">
                
                {/* Due Info Alert Block */}
                <div className="flex gap-3 bg-brand-primary/10 dark:bg-brand-primary/20 p-4 rounded-xl border border-brand-primary/25 text-xs">
                  <FiInfo size={20} className="text-brand-primary dark:text-brand-sage shrink-0" />
                  <div className="space-y-1 text-brand-charcoal dark:text-brand-offwhite/85">
                    <p className="font-bold">Supplier: <span className="text-brand-primary dark:text-brand-sage font-extrabold">{vendor?.vendorName}</span></p>
                    <div className="flex justify-between gap-10 pt-1 font-bold text-sm">
                      <span className="font-bold text-brand-primary dark:text-brand-sage">
                        {stats.totalDue < 0 ? "Advance Balance:" : "Total Outstanding Balance:"}
                      </span>
                      <span className={`font-mono text-right font-black ${stats.totalDue < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {stats.totalDue < 0 ? `${Math.abs(stats.totalDue).toFixed(2)} BDT` : `${stats.totalDue.toFixed(2)} BDT`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount to Clear */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Amount (BDT) *</span></label>
                  <input
                    type="number"
                    step="any"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                    required
                  />
                  <span className="text-[10px] text-brand-sage/80 block mt-2">
                    This payment will be allocated to the oldest unpaid invoices first. Any excess payment amount will be recorded as a general advance payment.
                  </span>
                </div>

                {/* Payment Method */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Method *</span></label>
                  <select 
                    value={bulkMethod} 
                    onChange={e => setBulkMethod(e.target.value)} 
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none rounded-xl text-xs bg-white dark:bg-brand-charcoal font-semibold text-brand-charcoal dark:text-brand-offwhite" 
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Mobile">Mobile Payment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Optional Note */}
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Transaction / Payment Note</span></label>
                  <textarea
                    value={bulkNote}
                    onChange={(e) => setBulkNote(e.target.value)}
                    className="textarea textarea-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-20 text-xs"
                    placeholder="e.g. Cleared bulk balance via checks or wire transfer..."
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
                <button type="button" onClick={closeBulkPaymentModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
                <button type="submit" className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Processing...
                    </>
                  ) : "Clear Bulk Payment"}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

    </div>
  );
};

export default VendorLedgerPage;
