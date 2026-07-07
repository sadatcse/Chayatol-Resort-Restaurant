"use client";

import React, { useState, useEffect, useContext, useRef } from "react";
import { FiSearch, FiPrinter, FiDollarSign, FiTrash2, FiXCircle, FiCheck, FiFilter, FiRefreshCw, FiCalendar } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useStandardPrint from "@/hooks/useStandardPrint";
import { AuthContext } from "@/providers/AuthProvider";
import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import ReceiptTemplate from "@/components/Receipt/ReceiptTemplate";

const VenueHistoryPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal states for updating payment
  const [activeBooking, setActiveBooking] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState("");
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState(["Cash", "Card", "bKash", "Bank Transfer"]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Cash");

  // Print Setup: Ledger
  const ledgerPrint = useStandardPrint({
    documentTitle: "Venue_Booking_Ledger",
    onAfterPrint: () => ledgerPrint.setPrintData(null)
  });

  // Print Setup: Company Booking Info
  const companyPrint = useStandardPrint({
    documentTitle: "Venue_Booking_Confirmation",
    onAfterPrint: () => companyPrint.setPrintData(null)
  });

  // Print Setup: Thermal Receipt (Restaurant POS style)
  const thermalReceiptRef = useRef(null);
  const [thermalPrintData, setThermalPrintData] = useState(null);

  const { company } = useContext(AuthContext);

  const handlePrintThermal = (booking) => {
    if (!booking) return;
    const mockInvoice = {
      invoiceSerial: booking.bookingNumber,
      invoiceNo: booking.bookingNumber,
      createdAt: booking.createdAt || new Date(),
      dateTime: booking.createdAt || new Date(),
      loginUserName: user?.name || "Staff",
      customerName: booking.customer?.fullName,
      customer: { name: booking.customer?.fullName },
      orderType: "Venue Booking",
      tableName: booking.venueSize,
      roomNo: booking.numberOfRooms ? `${booking.numberOfRooms} Rooms` : null,
      products: [
        {
          productName: `${booking.pricingType} Rent`,
          quantity: booking.duration,
          qty: booking.duration,
          unitPrice: booking.rateApplied,
          rate: booking.rateApplied,
          totalPrice: booking.rateApplied * booking.duration,
          subtotal: booking.rateApplied * booking.duration
        }
      ],
      subTotal: booking.rateApplied * booking.duration,
      subtotal: booking.rateApplied * booking.duration,
      discount: booking.discount || 0,
      totalAmount: booking.totalAmount,
      grandTotal: booking.totalAmount,
      paidAmount: booking.paidAmount,
      paid: booking.paidAmount,
      changeAmount: 0,
      change: 0,
      paymentMethod: booking.paymentMethod || "Cash"
    };

    setThermalPrintData(mockInvoice);
    setTimeout(() => {
      if (thermalReceiptRef.current) {
        thermalReceiptRef.current.printReceipt();
      }
    }, 300);
  };

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/venue/booking?page=${currentPage}&limit=${itemsPerPage}&search=${debouncedSearch}&status=${statusFilter}&paymentStatus=${paymentFilter}&startDate=${startDate}&endDate=${endDate}`
      );
      setBookings(response.data.data || []);
      setTotalItems(response.data.total || 0);
      setTotalPages(response.data.totalPages || 0);
    } catch (error) {
      console.error("Failed to load booking history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentPage, debouncedSearch, statusFilter, paymentFilter, startDate, endDate]);

  useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        const payRes = await axiosSecure.get("/paymenttype");
        const payTypes = payRes.data || [];
        if (payTypes.length > 0) {
          const names = payTypes.map(p => p.paymentTypeName).filter(Boolean);
          if (names.length > 0) {
            setPaymentMethods(names);
            setSelectedPaymentMethod(names[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load payment types:", err);
      }
    };
    fetchPaymentTypes();
  }, []);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleOpenPaymentModal = (booking) => {
    setActiveBooking(booking);
    setNewPayment("");
    setSelectedPaymentMethod(paymentMethods[0] || "Cash");
    setPaymentModalOpen(true);
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!activeBooking || newPayment === "" || Number(newPayment) <= 0) {
      Swal.fire("Invalid Amount", "Please enter a valid positive payment amount.", "warning");
      return;
    }

    const updatedPaid = (activeBooking.paidAmount || 0) + Number(newPayment);
    if (updatedPaid > activeBooking.totalAmount) {
      Swal.fire("Overpaid", `Maximum allowed additional payment is ৳ ${activeBooking.dueAmount}.`, "warning");
      return;
    }

    setIsUpdatingPayment(true);
    try {
      await axiosSecure.put(`/venue/booking/${activeBooking._id}`, {
        paidAmount: updatedPaid,
        paymentMethod: selectedPaymentMethod
      });

      Swal.fire({
        icon: "success",
        title: "Payment Updated",
        text: "Payment balance updated successfully!",
        timer: 1500,
        showConfirmButton: false,
      });

      setPaymentModalOpen(false);
      fetchBookings();
    } catch (error) {
      console.error("Update payment error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Failed to update payment.",
        confirmButtonColor: "#10b981",
      });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleCancelBooking = (booking) => {
    Swal.fire({
      title: "Cancel Booking?",
      text: `Are you sure you want to cancel booking ${booking.bookingNumber}? This will release the date schedule back to available.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Cancel Booking"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.put(`/venue/booking/${booking._id}`, {
            bookingStatus: "Cancelled"
          });
          Swal.fire("Cancelled", "The booking has been cancelled and dates released.", "success");
          fetchBookings();
        } catch (error) {
          console.error("Cancel booking error:", error);
          Swal.fire("Error", error.response?.data?.message || "Failed to cancel booking.", "error");
        }
      }
    });
  };

  const handleDeleteBooking = (booking) => {
    Swal.fire({
      title: "Delete Booking permanently?",
      text: "This action is destructive and cannot be undone. Only admins can perform this.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete Permanently"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/venue/booking/${booking._id}`);
          Swal.fire("Deleted", "Booking deleted permanently.", "success");
          fetchBookings();
        } catch (error) {
          console.error("Delete error:", error);
          Swal.fire("Error", error.response?.data?.message || "Failed to delete booking.", "error");
        }
      }
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Confirmed":
        return (
          <span className="badge bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900/50 dark:text-green-400 text-xs font-bold px-3.5 py-3.5 rounded-full">
            Confirmed
          </span>
        );
      case "Pending":
        return (
          <span className="badge bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400 text-xs font-bold px-3.5 py-3.5 rounded-full">
            Pending
          </span>
        );
      case "Cancelled":
        return (
          <span className="badge bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400 text-xs font-bold px-3.5 py-3.5 rounded-full">
            Cancelled
          </span>
        );
      default:
        return <span className="badge text-xs font-bold px-3 py-3.5 rounded-full">{status}</span>;
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case "Paid":
        return (
          <span className="badge bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-none text-[10px] uppercase tracking-wider font-extrabold px-3 py-2.5 rounded-full">
            Paid
          </span>
        );
      case "Partial":
        return (
          <span className="badge bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 border-none text-[10px] uppercase tracking-wider font-extrabold px-3 py-2.5 rounded-full">
            Partial Paid
          </span>
        );
      case "Unpaid":
        return (
          <span className="badge bg-rose-100 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400 border-none text-[10px] uppercase tracking-wider font-extrabold px-3 py-2.5 rounded-full">
            Unpaid
          </span>
        );
      default:
        return <span className="badge text-xs font-bold px-3 py-2.5 rounded-full">{status}</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <SectionHeader 
        title="Venue Booking History" 
        subtitle="View all bookings records, manage invoice status, collect dues, and print resort invoice details."
      >
        <button
          onClick={fetchBookings}
          className="btn btn-outline border-brand-beige text-brand-charcoal dark:text-brand-offwhite rounded-xl hover:bg-brand-primary/10 flex items-center gap-2 text-xs h-10"
        >
          <FiRefreshCw className="text-sm animate-pulse" /> Refresh List
        </button>
      </SectionHeader>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-brand-charcoal border border-brand-beige/40 dark:border-brand-beige/20 shadow-sm rounded-3xl p-6 space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative w-full sm:col-span-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-sage">
              <FiSearch className="text-lg" />
            </span>
            <input
              type="text"
              placeholder="Search by Booking No, Customer Name, Event Title, or Company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered w-full pl-11 rounded-2xl bg-brand-offwhite/50 border-brand-beige dark:bg-brand-charcoal/50 dark:border-brand-beige/20 text-xs focus:outline-none focus:border-brand-primary h-11"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select select-bordered w-full rounded-2xl bg-brand-offwhite/50 border-brand-beige dark:bg-brand-charcoal/50 dark:border-brand-beige/20 text-xs h-11 focus:outline-none focus:border-brand-primary"
            >
              <option value="">All Booking Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="select select-bordered w-full rounded-2xl bg-brand-offwhite/50 border-brand-beige dark:bg-brand-charcoal/50 dark:border-brand-beige/20 text-xs h-11 focus:outline-none focus:border-brand-primary"
            >
              <option value="">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Date Ranges and Clear Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-brand-beige/10 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-brand-sage flex items-center gap-1.5 uppercase tracking-wider">
              <FiFilter /> Date Range:
            </span>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input input-bordered input-sm rounded-xl bg-brand-offwhite/40 border-brand-beige dark:bg-brand-charcoal/50 dark:border-brand-beige/20 text-xs h-9 focus:outline-none focus:border-brand-primary"
              />
            </div>
            <span className="text-xs text-brand-sage font-bold">to</span>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input input-bordered input-sm rounded-xl bg-brand-offwhite/40 border-brand-beige dark:bg-brand-charcoal/50 dark:border-brand-beige/20 text-xs h-9 focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {(startDate || endDate || statusFilter || paymentFilter || searchTerm) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setStatusFilter("");
                setPaymentFilter("");
                setSearchTerm("");
              }}
              className="btn btn-ghost btn-xs text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 font-bold capitalize text-xs tracking-wider"
            >
              Clear Active Filters
            </button>
          )}
        </div>
      </div>

      {/* Bookings table container */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-brand-charcoal rounded-3xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden"
      >
        {isLoading ? (
          <div className="p-16"><MtableLoading /></div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center min-h-[350px] space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary text-3xl">
              📂
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-brand-charcoal dark:text-brand-offwhite">
                No Bookings Found
              </h3>
              <p className="text-xs text-brand-sage max-w-xs font-medium leading-relaxed">
                No bookings match your current filter settings or query. Try adjusting filters or record a new booking.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige/20">
                <tr>
                  <th className="pl-6 py-5 w-24">Booking No</th>
                  <th className="py-5">Guest Info</th>
                  <th className="py-5">Event Details</th>
                  <th className="py-5">Schedule</th>
                  <th className="py-5 text-right">Pricing (৳)</th>
                  <th className="py-5">Status</th>
                  <th className="pr-6 text-center py-5 w-44">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-beige/10 dark:divide-zinc-800 text-sm font-semibold">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 border-b border-brand-beige dark:border-brand-beige/10 transition-colors">
                    {/* Booking No */}
                    <td className="pl-6 py-4 font-black text-brand-primary font-mono tracking-wide">
                      {booking.bookingNumber}
                    </td>

                    {/* Guest info */}
                    <td className="py-4">
                      <div>
                        <p className="text-brand-charcoal dark:text-zinc-200 font-bold">
                          {booking.customer?.fullName || "N/A"}
                        </p>
                        <p className="text-xs text-brand-sage font-medium">
                          {booking.customer?.phoneNumber || "N/A"}
                        </p>
                        {booking.companyName && (
                          <span className="text-[9px] bg-brand-primary/10 text-brand-primary rounded-md px-1.5 py-0.5 inline-block mt-1 font-extrabold uppercase tracking-wide">
                            💼 {booking.companyName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Event details */}
                    <td className="py-4">
                      <div>
                        <p className="text-brand-charcoal dark:text-zinc-200 font-bold">{booking.eventTitle}</p>
                        <p className="text-xs text-brand-sage flex items-center gap-1 font-medium mt-0.5">
                          🏢 {booking.venueSize} Size
                        </p>
                      </div>
                    </td>

                    {/* Schedule */}
                    <td className="py-4">
                      <div>
                        <p className="text-brand-charcoal dark:text-zinc-200">
                          {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                        </p>
                        <p className="text-xs text-brand-sage font-medium mt-1 flex items-center gap-1.5">
                          <FiCalendar /> {booking.duration} {booking.durationUnit} ({booking.startTime} - {booking.endTime})
                        </p>
                      </div>
                    </td>

                    {/* Pricing summary */}
                    <td className="py-4 text-right">
                      <div>
                        <p className="text-brand-charcoal dark:text-zinc-200 font-extrabold text-md">
                          ৳ {(booking.totalAmount || 0).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-green-600 font-bold mt-0.5">
                          Paid: ৳ {(booking.paidAmount || 0).toLocaleString()} {booking.paidAmount > 0 && `(${booking.paymentMethod || "Cash"})`}
                        </p>
                        {(booking.dueAmount || 0) > 0 && (
                          <p className="text-[11px] text-red-500 font-bold">
                            Due: ৳ {(booking.dueAmount || 0).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Status badges */}
                    <td className="py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        {getStatusBadge(booking.bookingStatus)}
                        {getPaymentBadge(booking.paymentStatus)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="pr-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Print Invoice Dropdown */}
                        <div className="dropdown dropdown-left dropdown-hover">
                          <label 
                            tabIndex={0} 
                            className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary cursor-pointer hover:bg-brand-primary/10 flex items-center justify-center"
                            title="Print Invoice Options"
                          >
                            <FiPrinter size={16} />
                          </label>
                          <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow bg-white dark:bg-zinc-900 border border-brand-beige/50 dark:border-zinc-800 rounded-2xl w-44 text-xs font-bold space-y-1">
                            <li>
                              <button 
                                onClick={() => ledgerPrint.setPrintData(booking)}
                                className="flex items-center gap-2 hover:bg-brand-primary/10 text-brand-charcoal dark:text-zinc-200"
                              >
                                🖨️ Print Ledger
                              </button>
                            </li>
                            <li>
                              <button 
                                onClick={() => companyPrint.setPrintData(booking)}
                                className="flex items-center gap-2 hover:bg-brand-primary/10 text-brand-charcoal dark:text-zinc-200"
                              >
                                🏢 Company Info
                              </button>
                            </li>
                            <li>
                              <button 
                                onClick={() => handlePrintThermal(booking)}
                                className="flex items-center gap-2 hover:bg-brand-primary/10 text-brand-charcoal dark:text-zinc-200"
                              >
                                🧾 Thermal Receipt
                              </button>
                            </li>
                          </ul>
                        </div>

                        {/* Pay Dues */}
                        {booking.bookingStatus !== "Cancelled" && booking.paymentStatus !== "Paid" && (
                          <button
                            onClick={() => handleOpenPaymentModal(booking)}
                            className="btn btn-sm btn-circle btn-ghost text-green-600 hover:text-green-700 cursor-pointer hover:bg-green-50 dark:hover:bg-green-950/20"
                            title="Collect Payment"
                          >
                            <FiDollarSign size={16} />
                          </button>
                        )}

                        {/* Cancel Booking */}
                        {booking.bookingStatus !== "Cancelled" && (
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="btn btn-sm btn-circle btn-ghost text-red-400 hover:text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Cancel Reservation"
                          >
                            <FiXCircle size={16} />
                          </button>
                        )}

                        {/* Delete Booking */}
                        {user?.role === "superadmin" && (
                          <button
                            onClick={() => handleDeleteBooking(booking)}
                            className="btn btn-sm btn-circle btn-ghost text-zinc-400 hover:text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Delete Permanently"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination component */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-brand-beige/20 dark:border-zinc-800 bg-brand-offwhite/30 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </motion.div>

      {/* Collect Dues Modal */}
      {paymentModalOpen && activeBooking && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm rounded-3xl bg-white dark:bg-brand-charcoal border border-brand-beige/50 dark:border-zinc-800 p-0 overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                Collect Payment
              </h3>
              <button 
                onClick={() => setPaymentModalOpen(false)} 
                className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige"
              >
                <FiXCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdatePayment}>
              <div className="p-6 space-y-4 text-brand-charcoal dark:text-brand-offwhite">
                <div className="space-y-2.5 text-xs font-bold bg-brand-offwhite dark:bg-zinc-900/50 p-4 rounded-2xl border border-brand-beige/25">
                  <div className="flex justify-between">
                    <span className="text-brand-sage uppercase tracking-wider">Booking No:</span>
                    <span className="text-brand-primary font-black font-mono">{activeBooking.bookingNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-sage uppercase tracking-wider">Event:</span>
                    <span className="truncate max-w-[150px]">{activeBooking.eventTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-sage uppercase tracking-wider">Total Bill:</span>
                    <span>৳ {(activeBooking.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-sage uppercase tracking-wider">Already Paid:</span>
                    <span className="text-green-600">৳ {(activeBooking.paidAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-brand-beige/10 pt-2 font-black text-sm">
                    <span>Outstanding Due:</span>
                    <span className="text-red-500">৳ {(activeBooking.dueAmount || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text font-bold text-xs text-brand-sage uppercase tracking-wider">
                      Record Payment Amount (৳) *
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-sage font-black">
                      ৳
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={activeBooking.dueAmount}
                      required
                      placeholder="e.g. 15000"
                      value={newPayment}
                      onChange={(e) => setNewPayment(e.target.value)}
                      className="input input-bordered w-full pl-9 rounded-2xl bg-white dark:bg-zinc-900/50 text-sm font-bold focus:outline-none focus:border-brand-primary h-11"
                    />
                  </div>
                </div>

                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text font-bold text-xs text-brand-sage uppercase tracking-wider">
                      Payment Method
                    </span>
                  </label>
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="select select-bordered w-full rounded-2xl bg-white dark:bg-zinc-900 border-brand-beige/50 dark:border-zinc-800 text-sm text-brand-black dark:text-zinc-100 focus:outline-none focus:border-brand-primary h-11"
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method} className="bg-white dark:bg-zinc-900">
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-6 border-t border-brand-beige bg-brand-offwhite dark:bg-brand-charcoal/50">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="btn btn-outline border-brand-beige text-brand-charcoal dark:text-brand-offwhite btn-sm rounded-full px-6"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPayment}
                  className="btn bg-brand-primary hover:bg-brand-secondary border-none text-white btn-sm rounded-full shadow gap-2 px-6 cursor-pointer"
                >
                  {isUpdatingPayment ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <FiCheck />
                  )}
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden print templates */}
      <div className="hidden">
        {/* 1. Ledger (Final Info) Print Template */}
        {ledgerPrint.printData && (
          <PrintReportTemplate
            ref={ledgerPrint.printRef}
            title="Venue Booking Invoice Ledger"
            subtitle={`Booking Reference: ${ledgerPrint.printData.bookingNumber}`}
            dateRange={`${formatDate(ledgerPrint.printData.startDate)} - ${formatDate(ledgerPrint.printData.endDate)}`}
          >
            <div className="space-y-6 text-black text-sm" style={{ color: "#000" }}>
              <div className="grid grid-cols-2 gap-8 bg-gray-50 p-4 rounded border border-gray-200">
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 mb-2">Customer Details</h3>
                  <p className="font-bold text-md text-gray-900">{ledgerPrint.printData.customer?.fullName}</p>
                  <p className="text-xs text-gray-700">Phone: {ledgerPrint.printData.customer?.phoneNumber}</p>
                  <p className="text-xs text-gray-700">Email: {ledgerPrint.printData.customer?.emailAddress || "N/A"}</p>
                  {ledgerPrint.printData.companyName && (
                    <div className="mt-2 text-xs text-gray-800">
                      <span className="font-bold">Company Name:</span> {ledgerPrint.printData.companyName}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 mb-2">Billing Reference</h3>
                  <p className="font-bold text-md text-gray-900">{ledgerPrint.printData.bookingNumber}</p>
                  <p className="text-xs text-gray-700"><span className="font-bold">Payment Status:</span> {ledgerPrint.printData.paymentStatus}</p>
                  <p className="text-xs text-gray-700"><span className="font-bold">Booking Status:</span> {ledgerPrint.printData.bookingStatus}</p>
                </div>
              </div>

              <table className="print-table w-full border-collapse" style={{ width: "100%" }}>
                <thead>
                  <tr className="bg-gray-100 text-left font-bold text-xs">
                    <th className="border p-2" style={{ border: "1px solid #d1d5db", padding: "8px" }}>Item / Description</th>
                    <th className="border p-2 text-center" style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "center" }}>Unit Rate</th>
                    <th className="border p-2 text-center" style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "center" }}>Qty / Duration</th>
                    <th className="border p-2 text-right" style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr>
                    <td className="border p-2" style={{ border: "1px solid #e5e7eb", padding: "8px" }}>
                      Venue Rent - {ledgerPrint.printData.pricingType} Package ({ledgerPrint.printData.numberOfRooms || 0} Rooms booked)
                    </td>
                    <td className="border p-2 text-center" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>
                      ৳ {(ledgerPrint.printData.rateApplied || 0).toLocaleString()}
                    </td>
                    <td className="border p-2 text-center" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>
                      {ledgerPrint.printData.duration} {ledgerPrint.printData.durationUnit}
                    </td>
                    <td className="border p-2 text-right font-bold" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
                      ৳ {((ledgerPrint.printData.rateApplied || 0) * ledgerPrint.printData.duration).toLocaleString()}
                    </td>
                  </tr>
                  
                  {ledgerPrint.printData.discount > 0 && (
                    <tr className="font-bold text-red-650">
                      <td colSpan="3" className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>Applied Discount:</td>
                      <td className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
                        - ৳ {(ledgerPrint.printData.discount || 0).toLocaleString()}
                      </td>
                    </tr>
                  )}
                  <tr className="font-bold">
                    <td colSpan="3" className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>Total Net Bill:</td>
                    <td className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
                      ৳ {(ledgerPrint.printData.totalAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="font-bold text-green-700">
                    <td colSpan="3" className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>Paid / Settled Amount ({ledgerPrint.printData.paymentMethod || "Cash"}):</td>
                    <td className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
                      ৳ {(ledgerPrint.printData.paidAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="font-bold text-red-650">
                    <td colSpan="3" className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>Remaining Due Balance:</td>
                    <td className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
                      ৳ {(ledgerPrint.printData.dueAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {ledgerPrint.printData.specialInstructions && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs">
                  <span className="font-bold uppercase tracking-wider text-gray-500 block mb-1">Special Instructions:</span>
                  <p className="text-gray-800 leading-relaxed font-medium">{ledgerPrint.printData.specialInstructions}</p>
                </div>
              )}
            </div>
          </PrintReportTemplate>
        )}

        {/* 2. Corporate Booking Info Print Template */}
        {companyPrint.printData && (
          <PrintReportTemplate
            ref={companyPrint.printRef}
            title="Corporate Booking Confirmation"
            subtitle={`Event Reference: ${companyPrint.printData.eventTitle}`}
            dateRange={`${formatDate(companyPrint.printData.startDate)} - ${formatDate(companyPrint.printData.endDate)}`}
          >
            <div className="space-y-6 text-black text-sm" style={{ color: "#000" }}>
              <div className="grid grid-cols-2 gap-8 bg-gray-50 p-4 rounded border border-gray-200">
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 mb-2">Company / Client Info</h3>
                  <p className="font-bold text-md text-gray-900">{companyPrint.printData.companyName || companyPrint.printData.customer?.fullName}</p>
                  <p className="text-xs text-gray-700">Contact Person: {companyPrint.printData.customer?.fullName}</p>
                  <p className="text-xs text-gray-700">Phone: {companyPrint.printData.customer?.phoneNumber}</p>
                  <p className="text-xs text-gray-700">Email: {companyPrint.printData.customer?.emailAddress || "N/A"}</p>
                </div>
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 mb-2">Venue Schedule Reference</h3>
                  <p className="font-bold text-md text-gray-900">{companyPrint.printData.eventTitle}</p>
                  <p className="text-xs text-gray-700"><span className="font-bold">Booking Scope:</span> {companyPrint.printData.venueSize}</p>
                  <p className="text-xs text-gray-700"><span className="font-bold">Rooms Reserved:</span> {companyPrint.printData.numberOfRooms || 0} Rooms</p>
                  <p className="text-xs text-gray-700"><span className="font-bold">Estimated Guests:</span> {companyPrint.printData.numberOfGuests || 0} Persons</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded overflow-hidden">
                <div className="bg-gray-100 p-3 font-bold text-xs uppercase text-gray-700 border-b border-gray-200">
                  Event Schedule Details
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-gray-500 block">Arrival Date & Time:</span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {formatDate(companyPrint.printData.startDate)} at {companyPrint.printData.startTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Departure Date & Time:</span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {formatDate(companyPrint.printData.endDate)} at {companyPrint.printData.endTime}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-gray-500 block">Duration Window:</span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {companyPrint.printData.duration} {companyPrint.printData.durationUnit}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-gray-500 block">Catering Selection:</span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {companyPrint.printData.pricingType?.toLowerCase().includes("food") ? "Catering Included" : "No Catering Services Selected"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {companyPrint.printData.specialInstructions && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs">
                    <span className="font-bold uppercase tracking-wider text-gray-500 block mb-1">Catering & Setup Instructions:</span>
                    <p className="text-gray-800 leading-relaxed font-medium">{companyPrint.printData.specialInstructions}</p>
                  </div>
                )}
                
                <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs leading-relaxed text-gray-600">
                  <span className="font-bold uppercase tracking-wider text-gray-500 block mb-1">Corporate Booking Policy:</span>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>This confirmation validates resort venue and event setup space reservation.</li>
                    <li>Any special layout additions or audio-visual setups must be communicated 48 hours prior to start.</li>
                    <li>Security guidelines of Chayatol Resort must be adhered to at all times during the event.</li>
                  </ul>
                </div>
              </div>
            </div>
          </PrintReportTemplate>
        )}

        {/* 3. Thermal Receipt Print Template (Restaurant POS Style) */}
        {thermalPrintData && (
          <ReceiptTemplate
            ref={thermalReceiptRef}
            profileData={company}
            invoiceData={thermalPrintData}
            onPrintComplete={() => setThermalPrintData(null)}
          />
        )}
      </div>

    </div>
  );
};

export default VenueHistoryPage;
