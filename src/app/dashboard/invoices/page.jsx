"use client";

import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { format } from "date-fns";
import { MdSearch, MdReceipt, MdVisibility, MdDelete, MdPrint, MdClose, MdEdit } from "react-icons/md";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/providers/AuthProvider";
import ReceiptTemplate from "@/components/Receipt/ReceiptTemplate";
import A4ReceiptTemplate from "@/components/Receipt/A4ReceiptTemplate";
import useStandardPrint from "@/hooks/useStandardPrint";
import SectionHeader from "@/components/Comon/SectionHeader";
import ExportButtons from "@/components/Comon/ExportButtons";
import usePagePermission from "@/hooks/usePagePermission";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

export default function InvoicesPage() {
  const router = useRouter();
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const { canEdit, canDelete } = usePagePermission();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [selectedSource, setSelectedSource] = useState("All");
  const [selectedMethod, setSelectedMethod] = useState("All");

  const [printingInvoice, setPrintingInvoice] = useState(null);
  const printRef = useRef(null);

  const [printingA4Invoice, setPrintingA4Invoice] = useState(null);
  const a4PrintRef = useRef(null);

  useEffect(() => {
    if (printingInvoice) {
      const timer = setTimeout(() => {
        if (printRef.current) {
          printRef.current.printReceipt();
        }
        setPrintingInvoice(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingInvoice]);

  useEffect(() => {
    if (printingA4Invoice) {
      const timer = setTimeout(() => {
        if (a4PrintRef.current) {
          a4PrintRef.current.printReceipt();
        }
        setPrintingA4Invoice(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingA4Invoice]);

  // Report print setup
  const {
    printData: reportPrintData,
    setPrintData: setReportPrintData,
    printRef: reportPrintRef,
  } = useStandardPrint({
    documentTitle: "Invoices_History_Report"
  });

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [paymentTypes, setPaymentTypes] = useState([]);

  const [summaryMetrics, setSummaryMetrics] = useState({
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
    mfsSales: 0,
    roomBillSales: 0,
    dueSales: 0
  });

  // Fetch company profile and payment types
  useEffect(() => {
    const fetchCompanyAndPayments = async () => {
      try {
        const [companyRes, paymentRes] = await Promise.all([
          axiosSecure.get("/company").catch(() => null),
          axiosSecure.get("/paymenttype").catch(() => null)
        ]);
        if (companyRes?.data && companyRes.data.length > 0) {
          setCompanyInfo(companyRes.data[0]);
        }
        if (paymentRes?.data) {
          setPaymentTypes(paymentRes.data);
        }
      } catch (err) {
        console.error("Error fetching company profile/payment types:", err);
      }
    };
    fetchCompanyAndPayments();
  }, [axiosSecure]);

  const getDateRange = (filterType) => {
    const today = new Date();
    let start = null;
    let end = today;

    switch (filterType) {
      case "today":
        start = today;
        end = today;
        break;
      case "yesterday":
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        start = yesterday;
        end = yesterday;
        break;
      case "last7days":
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);
        start = sevenDaysAgo;
        end = today;
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case "previousMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0); // last day of previous month
        break;
      case "last6months":
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        start = sixMonthsAgo;
        end = today;
        break;
      default:
        return { startDate: "", endDate: "" };
    }

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
    };
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/pos/invoice?page=${page}&limit=15`;
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }
      if (selectedDateFilter) {
        const { startDate, endDate } = getDateRange(selectedDateFilter);
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }
      if (selectedSource && selectedSource !== "All") {
        url += `&orderType=${encodeURIComponent(selectedSource)}`;
      }
      if (selectedMethod && selectedMethod !== "All") {
        url += `&paymentMethod=${encodeURIComponent(selectedMethod)}`;
      }

      const { data } = await axiosSecure.get(url);
      if (data.success) {
        setInvoices(data.data);
        setTotalPages(Math.ceil(data.total / data.limit));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [axiosSecure, page, searchTerm, selectedDateFilter, selectedSource, selectedMethod]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchInvoices();
    });
  }, [fetchInvoices]);

  const printReceipt = useCallback((invoice) => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to print invoices.", "warning");
      return;
    }
    setPrintingInvoice(invoice);
  }, [setPrintingInvoice, canEdit]);

  const printA4Receipt = useCallback((invoice) => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to print invoices.", "warning");
      return;
    }
    setPrintingA4Invoice(invoice);
  }, [setPrintingA4Invoice, canEdit]);

  const printBatchReceipt = useCallback((invoice, batch, batchIndex) => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to print invoices.", "warning");
      return;
    }
    const batchSubTotal = batch.items?.reduce((acc, item) => acc + (item.totalPrice || 0), 0) || 0;
    const batchInvoice = {
      ...invoice,
      invoiceNo: `${invoice.invoiceNo}-B${batchIndex + 1}`,
      orderBatches: null, // Clear to force printing from items
      items: batch.items,
      subTotal: batchSubTotal,
      discount: 0,
      vat: 0,
      sd: 0,
      serviceCharge: 0,
      grandTotal: batchSubTotal,
      paymentMethod: "Pending" // KOT isn't fully paid on its own usually
    };
    setPrintingInvoice(batchInvoice);
  }, [setPrintingInvoice, canEdit]);

  const deleteInvoice = async (id) => {
    if (!canDelete) {
      Swal.fire("Restricted", "You do not have permission to delete invoices.", "warning");
      return;
    }
    if (isDeleting) return;
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        setIsDeleting(true);
        const { data } = await axiosSecure.delete(`/pos/invoice/${id}`);
        if (data.success) {
          Swal.fire('Deleted!', 'Invoice has been deleted.', 'success');
          fetchInvoices();
        }
      } catch (err) {
        Swal.fire('Error', 'Failed to delete invoice.', 'error');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const fetchFilteredInvoices = useCallback(async (fetchAll = false) => {
    try {
      let url = `/pos/invoice?page=${fetchAll ? 1 : page}&limit=${fetchAll ? 10000 : 15}`;
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }
      if (selectedDateFilter) {
        const { startDate, endDate } = getDateRange(selectedDateFilter);
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }
      if (selectedSource && selectedSource !== "All") {
        url += `&orderType=${encodeURIComponent(selectedSource)}`;
      }
      if (selectedMethod && selectedMethod !== "All") {
        url += `&paymentMethod=${encodeURIComponent(selectedMethod)}`;
      }

      const { data } = await axiosSecure.get(url);
      if (data.success) {
        return data.data;
      }
    } catch (err) {
      console.error("Error fetching filtered invoices:", err);
    }
    return [];
  }, [axiosSecure, page, searchTerm, selectedDateFilter, selectedSource, selectedMethod]);

  useEffect(() => {
    const calculateSummary = async () => {
      const allInvoices = await fetchFilteredInvoices(true);
      let totalSales = 0;
      let cashSales = 0;
      let cardSales = 0;
      let mfsSales = 0;
      let roomBillSales = 0;
      let dueSales = 0;

      allInvoices.forEach(inv => {
        const amount = inv.grandTotal || inv.totalAmount || 0;
        totalSales += amount;
        
        const method = (inv.paymentMethod || "").toLowerCase().trim();
        if (method === "room bill") {
          roomBillSales += amount;
        } else if (method === "due") {
          dueSales += amount;
        } else if (method === "cash") {
          cashSales += amount;
        } else if (method === "visa" || method === "mastercard" || method === "card" || method.includes("card")) {
          cardSales += amount;
        } else if (method === "bkash" || method === "nagad" || method === "rocket" || method === "mfs") {
          mfsSales += amount;
        } else {
          cashSales += amount;
        }
      });

      setSummaryMetrics({
        totalSales,
        cashSales,
        cardSales,
        mfsSales,
        roomBillSales,
        dueSales
      });
    };

    calculateSummary();
  }, [fetchFilteredInvoices, invoices]);

  const handleExportExcel = async () => {
    setLoading(true);
    const data = await fetchFilteredInvoices(true);
    const formatted = data.map((inv, idx) => ({
      "Sl": idx + 1,
      "Invoice No": inv.invoiceSerial || inv.invoiceNo,
      "Date": inv.dateTime || inv.createdAt ? format(new Date(inv.dateTime || inv.createdAt), 'dd MMM yyyy, p') : '',
      "Customer Name": inv.customerName || inv.customer?.name || "Walk-in Guest",
      "Customer Mobile": inv.customerMobile || inv.customer?.phone || "N/A",
      "Order Source": inv.orderType || inv.orderSource || "N/A",
      "Payment Method": inv.paymentMethod || "N/A",
      "Amount": inv.totalAmount || inv.grandTotal || 0,
      "Status": inv.paymentStatus || (inv.paymentMethod === 'Due' ? 'Due' : 'Paid')
    }));
    exportToExcel(formatted, "Invoices_History_Report");
    setLoading(false);
  };

  const handleExportCsv = async () => {
    setLoading(true);
    const data = await fetchFilteredInvoices(true);
    const formatted = data.map((inv, idx) => ({
      "Sl": idx + 1,
      "Invoice No": inv.invoiceSerial || inv.invoiceNo,
      "Date": inv.dateTime || inv.createdAt ? format(new Date(inv.dateTime || inv.createdAt), 'dd MMM yyyy, p') : '',
      "Customer Name": inv.customerName || inv.customer?.name || "Walk-in Guest",
      "Customer Mobile": inv.customerMobile || inv.customer?.phone || "N/A",
      "Order Source": inv.orderType || inv.orderSource || "N/A",
      "Payment Method": inv.paymentMethod || "N/A",
      "Amount": inv.totalAmount || inv.grandTotal || 0,
      "Status": inv.paymentStatus || (inv.paymentMethod === 'Due' ? 'Due' : 'Paid')
    }));
    exportToCsv(formatted, "Invoices_History_Report");
    setLoading(false);
  };

  const handlePrintClick = async () => {
    setLoading(true);
    const data = await fetchFilteredInvoices(true);
    setReportPrintData(data);
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-brand-charcoal rounded-xl shadow-md border border-brand-beige/50 dark:border-brand-dark-grey/50">
      
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-brand-beige/50 dark:border-brand-dark-grey/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <SectionHeader 
          title="Invoices History" 
          subtitle="View and manage all POS transactions" 
          className="!mb-0" 
        />
        {canEdit && (
          <ExportButtons
            onExportExcel={handleExportExcel}
            onExportCsv={handleExportCsv}
            onPrint={handlePrintClick}
            isLoading={loading}
          />
        )}
      </div>

      {/* Summary Cards Grid */}
      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50/30 dark:bg-brand-dark-grey/5 border-b border-brand-beige/25 dark:border-brand-dark-grey/20">
        
        {/* Card 1: Total Sales */}
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-brand-beige/50 dark:border-zinc-700/50 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-brand-sage">Total Restaurant Sales</p>
            <h3 className="text-xl font-black mt-1 text-brand-primary dark:text-brand-offwhite">৳ {summaryMetrics.totalSales.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
          </div>
          <p className="text-[10px] text-brand-sage mt-2 font-semibold">Direct sales + Room transfers</p>
        </div>

        {/* Card 2: Direct Collected */}
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-brand-beige/50 dark:border-zinc-700/50 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-brand-sage">Direct Cash & Cards</p>
            <h3 className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">৳ {(summaryMetrics.cashSales + summaryMetrics.cardSales + summaryMetrics.mfsSales).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
          </div>
          <div className="flex gap-2 text-[9px] text-brand-sage mt-2 font-bold uppercase tracking-wider">
            <span>Cash: ৳{summaryMetrics.cashSales.toFixed(0)}</span>
            <span>•</span>
            <span>Card/MFS: ৳{(summaryMetrics.cardSales + summaryMetrics.mfsSales).toFixed(0)}</span>
          </div>
        </div>

        {/* Card 3: Room Bill Transferred */}
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-brand-beige/50 dark:border-zinc-700/50 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-brand-sage">Room Bill Transferred</p>
            <h3 className="text-xl font-black mt-1 text-orange-600 dark:text-orange-400">৳ {summaryMetrics.roomBillSales.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
          </div>
          <p className="text-[10px] text-brand-sage mt-2 font-semibold">Posted to stay folio ledgers</p>
        </div>

        {/* Card 4: General Due / Unpaid */}
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-brand-beige/50 dark:border-zinc-700/50 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-brand-sage">General Dues</p>
            <h3 className="text-xl font-black mt-1 text-rose-600 dark:text-rose-400">৳ {summaryMetrics.dueSales.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
          </div>
          <p className="text-[10px] text-brand-sage mt-2 font-semibold">Unpaid restaurant accounts</p>
        </div>

      </div>

      {/* Filters Bar */}
      <div className="p-4 md:p-6 border-b border-brand-beige/20 dark:border-brand-dark-grey/20 bg-gray-50/50 dark:bg-brand-dark-grey/10 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <MdSearch size={18} />
          </span>
          <input
            type="text"
            placeholder="Search mobile, customer, invoice..."
            className="input input-bordered w-full pl-9 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary bg-white dark:bg-zinc-800 dark:border-zinc-700 text-sm h-10"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Filters Selects */}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-end">
          
          {/* Date Filter */}
          <select
            value={selectedDateFilter}
            onChange={(e) => {
              setSelectedDateFilter(e.target.value);
              setPage(1);
            }}
            className="select select-bordered rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 text-xs font-semibold h-10 cursor-pointer w-full sm:w-auto min-w-[130px]"
          >
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7days">Last 7 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="previousMonth">Previous Month</option>
            <option value="last6months">Last 6 Months</option>
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              setPage(1);
            }}
            className="select select-bordered rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 text-xs font-semibold h-10 cursor-pointer w-full sm:w-auto min-w-[130px]"
          >
            <option value="All">All Sources</option>
            <option value="Dine In">Dine In</option>
            <option value="Takeaway">Takeaway</option>
            <option value="Delivery">Delivery</option>
            <option value="Room Service">Room Service</option>
            <option value="Foodpanda">Foodpanda</option>
            <option value="Foodi">Foodi</option>
            <option value="Pathao">Pathao</option>
          </select>

          {/* Method Filter */}
          <select
            value={selectedMethod}
            onChange={(e) => {
              setSelectedMethod(e.target.value);
              setPage(1);
            }}
            className="select select-bordered rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 text-xs font-semibold h-10 cursor-pointer w-full sm:w-auto min-w-[130px]"
          >
            <option value="All">All Methods</option>
            {paymentTypes && paymentTypes.map((pt) => (
              <option key={pt._id} value={pt.name}>{pt.name}</option>
            ))}
            <option value="Due">Due</option>
            <option value="Room Bill">Room Bill</option>
          </select>

        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto p-4 md:p-6">
        <table className="table w-full">
          <thead>
            <tr className="border-b border-brand-beige/50 dark:border-brand-dark-grey/50 text-gray-500 dark:text-gray-400 text-sm">
              <th>Invoice No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Method</th>
              <th>Amount (৳)</th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-10">
                  <span className="loading loading-spinner text-brand-primary"></span>
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-gray-400">No invoices found.</td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id} className="border-b border-gray-100 dark:border-brand-dark-grey/30 hover:bg-gray-50 dark:hover:bg-brand-dark-grey/20">
                  <td className="font-semibold text-brand-primary">{inv.invoiceNo}</td>
                  <td className="text-gray-600 dark:text-gray-300">{format(new Date(inv.createdAt), 'dd MMM yyyy, p')}</td>
                  <td>
                    <div className="font-medium dark:text-gray-200">{inv.customer?.name || "Walk-in"}</div>
                    <div className="text-xs text-gray-400">{inv.customer?.phone}</div>
                  </td>
                  <td>
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                      {inv.orderType || inv.orderSource}
                    </span>
                  </td>
                  <td className="text-gray-600 dark:text-gray-300">{inv.paymentMethod}</td>
                  <td className="font-bold text-brand-dark-grey dark:text-gray-200">{inv.grandTotal.toFixed(2)}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      inv.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2 justify-center">
                      {canEdit && (
                        <button onClick={() => router.push(`/dashboard/pos?invoiceId=${inv._id}`)} className="p-2 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 transition" title="Add Items / Edit">
                          <MdEdit />
                        </button>
                      )}
                      <button onClick={() => { setSelectedInvoice(inv); setIsViewModalOpen(true); }} className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 transition" title="View">
                        <MdVisibility />
                      </button>
                      {canEdit && (
                        <button onClick={() => printReceipt(inv)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition" title="Print">
                          <MdPrint />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => deleteInvoice(inv._id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition" title="Delete">
                          <MdDelete />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="p-4 md:p-6 border-t border-brand-beige/50 dark:border-brand-dark-grey/50 flex justify-center">
          <div className="join">
            <button className="join-item btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>«</button>
            <button className="join-item btn btn-sm">Page {page} of {totalPages}</button>
            <button className="join-item btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>»</button>
          </div>
        </div>
      )}

      {/* Hidden printer component */}
      {printingInvoice && <ReceiptTemplate ref={printRef} profileData={companyInfo} invoiceData={printingInvoice ? { ...printingInvoice, loginUserName: printingInvoice.loginUserName || user?.name || "Staff" } : null} />}
      {printingA4Invoice && <A4ReceiptTemplate ref={a4PrintRef} profileData={companyInfo} invoiceData={printingA4Invoice} />}

      {/* View Modal */}
      {isViewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-brand-charcoal rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-brand-primary text-white">
              <h2 className="text-xl font-bold">Invoice Details</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-white hover:text-gray-200">
                <MdClose size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div className="flex justify-between border-b pb-2 dark:border-gray-700">
                <span className="font-bold dark:text-white">Invoice No:</span>
                <span className="text-brand-primary font-bold">{selectedInvoice.invoiceNo}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm dark:text-gray-200">
                <div>
                  <p className="text-gray-500 text-xs">Customer</p>
                  <p className="font-medium">{selectedInvoice.customerName || selectedInvoice.customer?.name || "Walk-in"}</p>
                  <p className="text-gray-500">{selectedInvoice.customerMobile || selectedInvoice.customer?.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Date</p>
                  <p className="font-medium">{format(new Date(selectedInvoice.dateTime || selectedInvoice.createdAt), 'dd MMM yyyy, p')}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Order Source</p>
                  <p className="font-medium">
                    {selectedInvoice.orderType || selectedInvoice.orderSource} 
                    {selectedInvoice.tableNo || selectedInvoice.tableName ? ` (Table: ${selectedInvoice.tableName || selectedInvoice.tableNo})` : ''} 
                    {selectedInvoice.roomNo ? ` (Room: ${selectedInvoice.roomNo})` : ''}
                    {selectedInvoice.deliveryProvider ? ` (Delivery: ${selectedInvoice.deliveryProvider})` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Payment & Status</p>
                  <p className="font-medium">
                    {selectedInvoice.paymentMethod} 
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border
                      ${(selectedInvoice.paymentStatus === 'Paid' || selectedInvoice.paymentMethod !== 'Due')
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-500/20'}`}>
                      {selectedInvoice.paymentStatus || (selectedInvoice.paymentMethod === 'Due' ? 'Due' : 'Paid')}
                    </span>
                  </p>
                </div>
                {selectedInvoice.waiterName && (
                  <div>
                    <p className="text-gray-500 text-xs">Waiter Name</p>
                    <p className="font-medium">{selectedInvoice.waiterName}</p>
                  </div>
                )}
                {selectedInvoice.guestCount !== undefined && selectedInvoice.guestCount !== null && (
                  <div>
                    <p className="text-gray-500 text-xs">Guest Count</p>
                    <p className="font-medium">{selectedInvoice.guestCount}</p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <h4 className="font-bold mb-2 dark:text-white border-b pb-1 dark:border-gray-700">Orders</h4>
                {selectedInvoice.orderBatches && selectedInvoice.orderBatches.length > 0 ? (
                  <div className="space-y-4">
                    {selectedInvoice.orderBatches.map((batch, bIdx) => (
                      <div key={bIdx} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                           <span className="font-bold text-sm dark:text-gray-200">
                              Order {bIdx + 1} 
                              <span className="text-xs font-normal text-gray-500 ml-2">
                                 {batch.orderedAt ? format(new Date(batch.orderedAt), 'p') : ''}
                              </span>
                           </span>
                           <button onClick={() => printBatchReceipt(selectedInvoice, batch, bIdx)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 transition-colors">
                              <MdPrint size={14} /> Print Batch
                           </button>
                        </div>
                        <div className="space-y-1">
                          {batch.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm dark:text-gray-300">
                              <span>{item.itemName} x{item.quantity}</span>
                              <span>৳ {item.totalPrice?.toFixed(2) || item.totalPrice}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedInvoice.products && selectedInvoice.products.length > 0 ? (
                  <div className="space-y-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    {selectedInvoice.products.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm dark:text-gray-300">
                        <span>{item.productName || item.itemName} x{item.qty || item.quantity}</span>
                        <span>৳ {(item.subtotal || item.totalPrice || (item.rate * item.qty))?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    {selectedInvoice.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm dark:text-gray-300">
                        <span>{item.itemName} x{item.quantity}</span>
                        <span>৳ {item.totalPrice?.toFixed(2) || item.totalPrice}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-brand-dark-grey p-4 rounded-lg mt-4 border border-gray-200 dark:border-gray-700 space-y-1 text-sm dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>৳ {selectedInvoice.subTotal?.toFixed(2) || '0.00'}</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount:</span>
                    <span>- ৳ {selectedInvoice.discount?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {selectedInvoice.vat > 0 && (
                  <div className="flex justify-between">
                    <span>VAT:</span>
                    <span>+ ৳ {selectedInvoice.vat?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {selectedInvoice.sd > 0 && (
                  <div className="flex justify-between">
                    <span>SD:</span>
                    <span>+ ৳ {selectedInvoice.sd?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {selectedInvoice.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge:</span>
                    <span>+ ৳ {selectedInvoice.serviceCharge?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {selectedInvoice.deliveryCharge > 0 && (
                  <div className="flex justify-between text-brand-primary font-bold">
                    <span>Delivery Charge:</span>
                    <span>+ ৳ {selectedInvoice.deliveryCharge?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg dark:text-white pt-2 border-t mt-2 dark:border-gray-600">
                  <span>Grand Total:</span>
                  <span className="text-brand-primary">৳ {selectedInvoice.grandTotal?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
             <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-brand-dark-grey flex justify-between items-center">
                <div className="flex gap-2">
                   <button onClick={() => printReceipt(selectedInvoice)} className="px-3 py-2 rounded-lg bg-brand-primary text-white font-medium hover:bg-brand-secondary transition-colors text-xs flex items-center gap-1 border-none cursor-pointer">
                      <MdPrint size={14} /> Thermal Print
                   </button>
                   <button onClick={() => printA4Receipt(selectedInvoice)} className="px-3 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-xs flex items-center gap-1 border-none cursor-pointer">
                      <MdPrint size={14} /> A4 Print
                   </button>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-colors text-sm border-none cursor-pointer">
                   Close
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Hidden print container for all filtered invoices */}
      <div style={{ display: "none" }}>
        {reportPrintData && (
          <PrintReportTemplate
            ref={reportPrintRef}
            title="Invoices History Report"
            subtitle="POS Transactions History Details"
            dateRange={selectedDateFilter ? selectedDateFilter.toUpperCase() : "All Dates"}
          >
            <table className="print-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Order Source</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportPrintData.map((inv, idx) => {
                  const isPaid = inv.paymentStatus === 'Paid' || inv.paymentMethod !== 'Due';
                  return (
                    <tr key={inv._id || idx}>
                      <td style={{ fontWeight: "bold" }}>{inv.invoiceSerial || inv.invoiceNo}</td>
                      <td>{inv.dateTime || inv.createdAt ? format(new Date(inv.dateTime || inv.createdAt), 'dd MMM yyyy, p') : ''}</td>
                      <td>
                        <strong>{inv.customerName || inv.customer?.name || "Walk-in"}</strong>
                        {inv.customerMobile || inv.customer?.phone ? ` (${inv.customerMobile || inv.customer?.phone})` : ""}
                      </td>
                      <td>{inv.orderType || inv.orderSource || "N/A"}</td>
                      <td>{inv.paymentMethod || "N/A"}</td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>৳ {(inv.totalAmount || inv.grandTotal || 0).toFixed(2)}</td>
                      <td style={{ fontWeight: "bold", color: isPaid ? "green" : "red" }}>
                        {isPaid ? "Paid" : "Due"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: "bold" }}>
                  <td colSpan="5">Total Amount</td>
                  <td style={{ textAlign: "right" }}>
                    ৳ {reportPrintData.reduce((sum, inv) => sum + (inv.totalAmount || inv.grandTotal || 0), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </PrintReportTemplate>
        )}
      </div>

    </div>
  );
}
