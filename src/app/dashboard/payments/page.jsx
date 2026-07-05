"use client";

import React, { useState, useEffect } from "react";
import { FiSearch, FiCalendar, FiDollarSign, FiCreditCard, FiSmartphone, FiInbox, FiFilter, FiTrash2 } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import SectionHeader from "@/components/Comon/SectionHeader";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import useStandardPrint from "@/hooks/useStandardPrint";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

const ReservationPaymentsPage = () => {
  const axiosSecure = useAxiosSecure();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [stats, setStats] = useState({
    totalReceived: 0,
    cashTotal: 0,
    cardTotal: 0,
    mobileTotal: 0,
    otherTotal: 0
  });

  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all"); // all, reservation, stay
  const [paymentMethod, setPaymentMethod] = useState("all"); // all, cash, card, mobile, other
  const [dateFilter, setDateFilter] = useState("today"); // today, yesterday, last7, custom
  const [startDate, setStartDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return today;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return today;
  });

  // Print setup
  const {
    printData,
    setPrintData,
    printRef
  } = useStandardPrint({
    documentTitle: "Unified_Payments_Summary"
  });

  const handlePrintClick = () => {
    setPrintData(payments);
  };

  const handleExportExcel = () => {
    const formatted = payments.map((p, idx) => ({
      "Sl": idx + 1,
      "Date": new Date(p.date).toLocaleString(),
      "Source": p.source,
      "Reference No": p.refNo,
      "Guest Name": p.customer?.fullName || "Walk-In Guest",
      "Phone": p.customer?.phoneNumber || "",
      "Payment Method": p.paymentType || "Cash",
      "Transaction Ref": p.transactionRef || "",
      "Notes": p.notes || "",
      "Amount": p.amount
    }));
    exportToExcel(formatted, "Unified_Payments_Summary");
  };

  const handleExportCsv = () => {
    const formatted = payments.map((p, idx) => ({
      "Sl": idx + 1,
      "Date": new Date(p.date).toLocaleString(),
      "Source": p.source,
      "Reference No": p.refNo,
      "Guest Name": p.customer?.fullName || "Walk-In Guest",
      "Phone": p.customer?.phoneNumber || "",
      "Payment Method": p.paymentType || "Cash",
      "Transaction Ref": p.transactionRef || "",
      "Notes": p.notes || "",
      "Amount": p.amount
    }));
    exportToCsv(formatted, "Unified_Payments_Summary");
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let url = `/payments?search=${encodeURIComponent(search)}&source=${source}&paymentMethod=${paymentMethod}`;
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const { data } = await axiosSecure.get(url);
      setPayments(data.payments || []);
      setStats(data.stats || {
        totalReceived: 0,
        cashTotal: 0,
        cardTotal: 0,
        mobileTotal: 0,
        otherTotal: 0
      });
    } catch (err) {
      console.error("Failed to load reservation payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [startDate, endDate, dateFilter, source, paymentMethod]);

  // Fetch dynamic payment types on mount
  useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        const { data } = await axiosSecure.get("/paymenttype");
        if (Array.isArray(data)) {
          setPaymentTypes(data);
        }
      } catch (err) {
        console.error("Failed to load payment types:", err);
      }
    };
    fetchPaymentTypes();
  }, [axiosSecure]);

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      fetchPayments();
    }
  };

  const handleDelete = async (paymentId, paymentSource) => {
    const result = await Swal.fire({
      title: "Remove this payment?",
      text: "This will permanently delete this payment record from the database.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    // Optimistic: remove from UI immediately
    setPayments((prev) => prev.filter((p) => (p.id || p._id) !== paymentId));

    try {
      await axiosSecure.delete(`/payments?id=${paymentId}&source=${encodeURIComponent(paymentSource)}`);
      Swal.fire({ icon: "success", title: "Deleted!", text: "Payment record has been permanently deleted.", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Failed to delete payment from backend:", err);
      // Re-fetch to restore accurate state if backend failed
      fetchPayments();
      Swal.fire("Error", err?.response?.data?.message || "Failed to delete. Please try again.", "error");
    }
  };


  const handlePresetChange = (preset) => {
    setDateFilter(preset);
    const today = new Date();
    
    if (preset === "today") {
      const todayStr = today.toISOString().split("T")[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (preset === "last7") {
      const last7 = new Date();
      last7.setDate(today.getDate() - 7);
      setStartDate(last7.toISOString().split("T")[0]);
      setEndDate(today.toISOString().split("T")[0]);
    } else if (preset === "thismonth") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().split("T")[0]);
      setEndDate(today.toISOString().split("T")[0]);
    }
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <SectionHeader
          title="Unified Payments & Cash Summary"
          subtitle="Manage unified reservation prepayments, walk-in stay payments, checkout settlements, and cash logs."
        />
        <ExportButtons
          onExportExcel={handleExportExcel}
          onExportCsv={handleExportCsv}
          onPrint={handlePrintClick}
          isLoading={loading}
        />
      </div>

      {/* Filters and Search Toolbar */}
      <div className="bg-white dark:bg-brand-charcoal p-6 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm space-y-4 mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Date Range Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {["today", "yesterday", "last7", "thismonth", "custom"].map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`btn btn-xs sm:btn-sm uppercase tracking-wider font-bold rounded-full ${
                  dateFilter === preset
                    ? "bg-brand-primary text-white border-none"
                    : "bg-gray-100 dark:bg-brand-charcoal/60 text-brand-sage hover:bg-brand-primary/10 border-none"
                }`}
              >
                {preset === "today" && "Today"}
                {preset === "yesterday" && "Yesterday"}
                {preset === "last7" && "Last 7 Days"}
                {preset === "thismonth" && "This Month"}
                {preset === "custom" && "Custom Range"}
              </button>
            ))}
          </div>

          {/* Custom Date Picker */}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2 animate-fade-in">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input input-xs h-9 input-bordered border-brand-primary dark:border-brand-primary/50 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
              />
              <span className="text-xs text-brand-sage font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input input-xs h-9 input-bordered border-brand-primary dark:border-brand-primary/50 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
              />
            </div>
          )}

          {/* Search keyword input */}
          <div className="flex gap-2 w-full lg:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              placeholder="Search Guest, Ref No, Notes..."
              className="input input-xs h-9 input-bordered border-brand-primary dark:border-brand-primary/50 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite flex-1"
            />
            <button
              onClick={fetchPayments}
              className="btn btn-sm bg-brand-primary hover:bg-brand-secondary border-none text-white px-4 h-9 min-h-0"
            >
              <FiSearch size={16} />
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-brand-beige/50 dark:border-brand-beige/10">
          <div className="form-control w-full sm:w-64">
            <label className="label py-1">
              <span className="label-text text-xs font-bold text-brand-sage uppercase tracking-wider flex items-center gap-1">
                <FiFilter size={12} /> Transaction Source
              </span>
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="select select-bordered select-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
            >
              <option value="all">All Sources (Pre-bookings & Stays)</option>
              <option value="reservation">Pre-Booking Prepayments</option>
              <option value="stay">Stay Folio Payments (Check-ins / Checkout)</option>
            </select>
          </div>

          <div className="form-control w-full sm:w-64">
            <label className="label py-1">
              <span className="label-text text-xs font-bold text-brand-sage uppercase tracking-wider flex items-center gap-1">
                <FiFilter size={12} /> Payment Method
              </span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="select select-bordered select-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
            >
              <option value="all">All Payment Methods</option>
              {paymentTypes.map((pt) => (
                <option key={pt._id} value={pt.name}>
                  {pt.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-brand-charcoal p-6 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block mb-1">Total Prepayments</span>
            <span className="text-2xl font-black text-brand-black dark:text-brand-offwhite">৳{stats.totalReceived}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <FiDollarSign size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-brand-charcoal p-6 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block mb-1">Cash Received</span>
            <span className="text-2xl font-black text-brand-black dark:text-brand-offwhite">৳{stats.cashTotal}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
            <FiInbox size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-brand-charcoal p-6 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block mb-1">Card Payments</span>
            <span className="text-2xl font-black text-brand-black dark:text-brand-offwhite">৳{stats.cardTotal}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
            <FiCreditCard size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-brand-charcoal p-6 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block mb-1">Mobile Banking (MFS)</span>
            <span className="text-2xl font-black text-brand-black dark:text-brand-offwhite">৳{stats.mobileTotal}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-600">
            <FiSmartphone size={24} />
          </div>
        </motion.div>
      </div>

      {/* Main Table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-brand-charcoal rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="p-12">
            <MtableLoading />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="pl-8 py-5">Date & Time</th>
                  <th className="py-5">Source</th>
                  <th className="py-5">Reference No</th>
                  <th className="py-5">Guest Details</th>
                  <th className="py-5">Payment Method</th>
                  <th className="py-5">Transaction Ref</th>
                  <th className="py-5">Notes / Description</th>
                  <th className="pr-8 py-5 text-right">Amount</th>
                  <th className="py-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                      No payments found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const isRefund = p.amount < 0;
                    const method = p.paymentType || "Cash";
                    let methodBadge = "bg-gray-100 text-gray-700";
                    if (method.toLowerCase().includes("cash")) {
                      methodBadge = "bg-green-150 text-green-700 dark:bg-green-950/20";
                    } else if (method.toLowerCase().includes("card") || method.toLowerCase().includes("pos")) {
                      methodBadge = "bg-blue-150 text-blue-700 dark:bg-blue-950/20";
                    } else if (method.toLowerCase().includes("bkash") || method.toLowerCase().includes("nagad") || method.toLowerCase().includes("rocket") || method.toLowerCase().includes("mobile") || method.toLowerCase().includes("mfs")) {
                      methodBadge = "bg-pink-150 text-pink-700 dark:bg-pink-950/20";
                    }

                    const isReservation = p.source === "Pre-Booking Prepayment";

                    return (
                      <tr key={p.id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 border-b border-brand-beige dark:border-brand-beige/10 bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm">
                        <td className="pl-8 py-4 font-mono text-xs">
                          {new Date(p.date).toLocaleString()}
                        </td>
                        <td className="py-4">
                          <span className={`badge badge-sm font-bold tracking-wide uppercase text-[9px] border-none px-2.5 py-1 ${
                            isReservation ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400"
                          }`}>
                            {isReservation ? "Pre-Booking" : "In-House Stay"}
                          </span>
                        </td>
                        <td className="py-4 font-bold font-mono">
                          {p.refNo}
                          {p.status === "Cancelled" && (
                            <span className="badge badge-xs bg-red-100 text-red-600 border-none font-bold uppercase tracking-wider ml-1 text-[9px] px-1.5 py-1">Cancelled</span>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="font-bold">{p.customer?.fullName || "Walk-In Guest"}</div>
                          <div className="text-xs text-brand-sage">{p.customer?.phoneNumber || ""}</div>
                          {p.receivedBy && (
                            <div className="text-[10px] text-red-500 font-bold mt-0.5">Refund Receiver: {p.receivedBy}</div>
                          )}
                        </td>
                        <td className="py-4 text-xs font-bold">
                          <span className={`badge badge-sm rounded-full border-none px-3 uppercase tracking-wider text-[9px] ${methodBadge}`}>
                            {method}
                          </span>
                        </td>
                        <td className="py-4 font-mono text-xs text-brand-sage">
                          {p.transactionRef || "N/A"}
                        </td>
                        <td className="py-4 text-xs italic text-brand-sage max-w-xs truncate" title={p.notes}>
                          {p.notes || "-"}
                        </td>
                        <td className={`pr-8 py-4 text-right font-black text-sm ${isRefund ? "text-red-500" : "text-green-600"}`}>
                          {isRefund ? "- " : "+ "}৳{Math.abs(p.amount)}
                        </td>
                        <td className="py-4 text-center">
                          <button
                            onClick={() => handleDelete(p.id || p._id, p.source)}
                            title="Remove payment"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 transition-colors duration-150 cursor-pointer"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title="Unified Payments & Cash Summary"
            subtitle="Unified report of prepayments, walk-in stays, settlements, and cash logs."
            dateRange={startDate && endDate ? `${startDate} to ${endDate}` : "All Dates"}
          >
            <table className="print-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Source</th>
                  <th>Reference No</th>
                  <th>Guest Details</th>
                  <th>Method</th>
                  <th>Transaction Ref</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {printData.map((p, idx) => {
                  const isRefund = p.amount < 0;
                  return (
                    <tr key={p.id || idx}>
                      <td>{new Date(p.date).toLocaleString("en-GB")}</td>
                      <td>{p.source === "Pre-Booking Prepayment" ? "Pre-Booking" : "In-House Stay"}</td>
                      <td style={{ fontWeight: "bold" }}>{p.refNo}</td>
                      <td>
                        <strong>{p.customer?.fullName || "Walk-In Guest"}</strong>
                        {p.customer?.phoneNumber ? ` (${p.customer.phoneNumber})` : ""}
                      </td>
                      <td>{p.paymentType || "Cash"}</td>
                      <td>{p.transactionRef || "-"}</td>
                      <td style={{ textAlign: "right", fontWeight: "bold", color: isRefund ? "red" : "green" }}>
                        {isRefund ? "- " : "+ "}৳{Math.abs(p.amount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: "bold" }}>
                  <td colSpan="6">Total Collected</td>
                  <td style={{ textAlign: "right" }}>৳{stats.totalReceived.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </PrintReportTemplate>
        )}
      </div>
    </div>
  );
};

export default ReservationPaymentsPage;
