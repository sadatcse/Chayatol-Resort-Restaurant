"use client";

import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import Link from "next/link";
import { FiCalendar, FiChevronLeft, FiChevronRight, FiList, FiPlusCircle } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import useStandardPrint from "@/hooks/useStandardPrint";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import ReceiptTemplate from "@/components/Receipt/ReceiptTemplate";
import { AuthContext } from "@/providers/AuthProvider";

const VenueDashboardPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user, company } = useContext(AuthContext);
  
  // Date states
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Bookings list for active month
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal details states
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

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

  const handleOpenDetailModal = (booking) => {
    setSelectedBooking(booking);
    setDetailModalOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Compute month start & end strings
  const monthRange = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const tzOffset = firstDay.getTimezoneOffset() * 60000;
    const startStr = new Date(firstDay - tzOffset).toISOString().split("T")[0];
    const endStr = new Date(lastDay - tzOffset).toISOString().split("T")[0];

    return { startStr, endStr };
  }, [year, month]);

  const fetchMonthBookings = async () => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/venue/booking?page=1&limit=100&startDate=${monthRange.startStr}&endDate=${monthRange.endStr}`
      );
      setBookings(response.data.data || []);
    } catch (error) {
      console.error("Failed to load month bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthBookings();
  }, [monthRange]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday ...

    const list = [];
    
    // Padding days from previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      list.push({ isPadding: true, dayNumber: "" });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      
      const dayBookings = bookings.filter(b => {
        if (b.bookingStatus === "Cancelled") return false;
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        bStart.setHours(0,0,0,0);
        bEnd.setHours(23,59,59,999);
        date.setHours(12,0,0,0);
        
        return bStart <= date && bEnd >= date;
      });

      let status = "Available";
      const fullOverlaps = dayBookings.filter(b => b.venueSize === "Full Venue");
      const halfOverlaps = dayBookings.filter(b => b.venueSize === "Half Venue");

      if (fullOverlaps.length > 0) {
        status = "Full Venue Blocked";
      } else if (halfOverlaps.length >= 2) {
        status = "Full Venue Blocked"; 
      } else if (halfOverlaps.length === 1) {
        status = "Half Venue Booked";
      }

      list.push({
        isPadding: false,
        dayNumber: day,
        dateString: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        bookings: dayBookings,
        status
      });
    }

    return list;
  }, [year, month, bookings]);

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  if (isLoading && bookings.length === 0) {
    return (
      <div className="p-6">
        <SectionHeader title="Venue Dashboard" subtitle="Resort ground floor availability schedule" />
        <div className="flex justify-center items-center min-h-[300px]">
          <MtableLoading />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader title="Venue Dashboard" subtitle="Check ground floor venue date schedule and availability">
        <Link
          href="/dashboard/venue/book"
          className="btn bg-brand-primary hover:bg-brand-secondary border-none text-white rounded-xl flex items-center gap-2 text-xs shadow-md shadow-brand-primary/10"
        >
          <FiPlusCircle className="text-sm" /> Book Venue
        </Link>
        <Link
          href="/dashboard/venue/history"
          className="btn btn-outline border-brand-beige text-brand-charcoal dark:text-brand-offwhite rounded-xl hover:bg-brand-primary/10 flex items-center gap-2 text-xs"
        >
          <FiList className="text-sm" /> View All Bookings
        </Link>
      </SectionHeader>

      {/* Main Full-Width Calendar Container */}
      <div className="bg-brand-white dark:bg-brand-charcoal border border-brand-beige/40 dark:border-brand-dark-grey/40 shadow-sm rounded-3xl p-6 space-y-5">
        
        {/* Calendar Header with Controls and Colors Key */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-brand-beige/25 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary text-md">
              <FiCalendar />
            </div>
            <div>
              <h3 className="text-md font-extrabold text-brand-black dark:text-brand-offwhite">
                Venue Calendar Schedule
              </h3>
              <p className="text-xs text-brand-sage font-medium">Ground Floor resort & restaurant space</p>
            </div>
          </div>

          {/* Calendar Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="btn btn-square btn-ghost btn-sm rounded-xl hover:bg-brand-primary/10 text-brand-charcoal dark:text-brand-offwhite"
            >
              <FiChevronLeft className="text-lg" />
            </button>
            <span className="font-extrabold text-sm text-brand-charcoal dark:text-brand-offwhite min-w-[140px] text-center">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="btn btn-square btn-ghost btn-sm rounded-xl hover:bg-brand-primary/10 text-brand-charcoal dark:text-brand-offwhite"
            >
              <FiChevronRight className="text-lg" />
            </button>
          </div>

          {/* Inline Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-green-50 border border-green-200 dark:bg-green-950/10 dark:border-green-900/50" />
              <span className="text-brand-charcoal dark:text-zinc-350">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-amber-50 border border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/50" />
              <span className="text-brand-charcoal dark:text-zinc-350">Half Venue Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-red-50 border border-red-200 dark:bg-red-950/10 dark:border-red-900/50" />
              <span className="text-brand-charcoal dark:text-zinc-350">Fully Blocked</span>
            </div>
          </div>
        </div>

        {/* Days of the Week Grid */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-brand-sage uppercase tracking-wider">
          <div>Sunday</div>
          <div>Monday</div>
          <div>Tuesday</div>
          <div>Wednesday</div>
          <div>Thursday</div>
          <div>Friday</div>
          <div>Saturday</div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 min-h-[400px]">
          {calendarDays.map((day, idx) => {
            if (day.isPadding) {
              return (
                <div
                  key={`pad-${idx}`}
                  className="bg-brand-offwhite/10 dark:bg-zinc-900/10 rounded-2xl border border-transparent min-h-[85px]"
                />
              );
            }

            const cardBg = day.status === "Full Venue Blocked" 
              ? "bg-red-50/80 border-red-200/50 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400"
              : day.status === "Half Venue Booked"
              ? "bg-amber-50/80 border-amber-200/50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400"
              : "bg-green-50/40 border-green-200/50 text-green-700 dark:bg-green-950/5 dark:border-green-900/20 dark:text-green-400";
  
            return (
              <div
                key={`day-${day.dayNumber}`}
                className={`rounded-2xl border p-2.5 flex flex-col justify-between text-left min-h-[85px] transition-all hover:scale-[1.02] cursor-default ${cardBg}`}
              >
                <span className="font-extrabold text-xs">{day.dayNumber}</span>
                
                {/* Event lists inside calendar date box */}
                <div className="mt-2 space-y-1">
                  {day.bookings.length > 0 ? (
                    day.bookings.map(b => (
                      <div
                        key={b._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetailModal(b);
                        }}
                        className="text-[9px] font-extrabold truncate leading-tight bg-white/80 dark:bg-zinc-900/90 px-1.5 py-0.5 rounded shadow-sm cursor-pointer hover:bg-brand-primary hover:text-white transition-colors"
                        title="Click to view details"
                      >
                        {b.eventTitle}
                      </div>
                    ))
                  ) : (
                    <span className="text-[8px] uppercase tracking-wider font-extrabold opacity-60">
                      Available
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Booking Details Modal */}
      {detailModalOpen && selectedBooking && (
        <div className="modal modal-open z-[9999]">
          <div className="modal-box max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-brand-beige/50 dark:border-zinc-800 p-0 overflow-hidden shadow-2xl animate-scale-in text-brand-charcoal dark:text-zinc-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige/10 dark:border-zinc-800 bg-brand-offwhite/50 dark:bg-zinc-900/50">
              <div>
                <h3 className="font-extrabold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-wider">
                  Booking Details
                </h3>
                <p className="text-xs text-brand-sage font-black font-mono mt-0.5">
                  Ref: {selectedBooking.bookingNumber}
                </p>
              </div>
              <button 
                onClick={() => setDetailModalOpen(false)} 
                className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige/25"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Event / Customer info header */}
              <div className="bg-brand-offwhite/30 dark:bg-zinc-900/30 p-4 rounded-2xl border border-brand-beige/20 dark:border-zinc-800/50 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                  <div>
                    <span className="text-brand-sage text-[10px] uppercase tracking-wider block">Customer Name</span>
                    <span className="text-sm font-extrabold text-brand-black dark:text-brand-offwhite">
                      {selectedBooking.customer?.fullName || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-brand-sage text-[10px] uppercase tracking-wider block">Phone Number</span>
                    <span className="text-sm font-extrabold text-brand-black dark:text-brand-offwhite">
                      {selectedBooking.customer?.phoneNumber || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-bold pt-2 border-t border-brand-beige/15 dark:border-zinc-800">
                  <div>
                    <span className="text-brand-sage text-[10px] uppercase tracking-wider block">Event Title</span>
                    <span className="text-sm font-extrabold text-brand-black dark:text-brand-offwhite">
                      {selectedBooking.eventTitle}
                    </span>
                  </div>
                  <div>
                    <span className="text-brand-sage text-[10px] uppercase tracking-wider block">Company Name</span>
                    <span className="text-sm font-extrabold text-brand-black dark:text-brand-offwhite">
                      {selectedBooking.companyName || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs uppercase tracking-widest text-brand-sage">Schedule & Scope</h4>
                <div className="grid grid-cols-2 gap-4 bg-brand-offwhite/20 dark:bg-zinc-900/10 p-4 rounded-2xl border border-brand-beige/15 dark:border-zinc-800/30 text-xs font-semibold">
                  <div>
                    <p className="text-brand-sage text-[10px] uppercase tracking-wider">Start Date</p>
                    <p className="font-extrabold mt-0.5">{formatDate(selectedBooking.startDate)} at {selectedBooking.startTime}</p>
                  </div>
                  <div>
                    <p className="text-brand-sage text-[10px] uppercase tracking-wider">End Date</p>
                    <p className="font-extrabold mt-0.5">{formatDate(selectedBooking.endDate)} at {selectedBooking.endTime}</p>
                  </div>
                  <div className="pt-2 border-t border-brand-beige/10 dark:border-zinc-800">
                    <p className="text-brand-sage text-[10px] uppercase tracking-wider">Booking Size</p>
                    <p className="font-extrabold mt-0.5">{selectedBooking.venueSize}</p>
                  </div>
                  <div className="pt-2 border-t border-brand-beige/10 dark:border-zinc-800">
                    <p className="text-brand-sage text-[10px] uppercase tracking-wider">Rooms Booked</p>
                    <p className="font-extrabold mt-0.5">{selectedBooking.numberOfRooms || 0} Rooms</p>
                  </div>
                </div>
              </div>

              {/* Pricing & Billing */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs uppercase tracking-widest text-brand-sage">Billing Summary</h4>
                <div className="bg-brand-offwhite/20 dark:bg-zinc-900/10 p-4 rounded-2xl border border-brand-beige/15 dark:border-zinc-800/30 text-xs font-bold space-y-2">
                  <div className="flex justify-between">
                    <span className="text-brand-sage">Pricing Package:</span>
                    <span className="text-brand-black dark:text-brand-offwhite">{selectedBooking.pricingType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-sage">Unit Price:</span>
                    <span>৳ {(selectedBooking.rateApplied || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-sage">Duration:</span>
                    <span>{selectedBooking.duration} {selectedBooking.durationUnit}</span>
                  </div>
                  {selectedBooking.discount > 0 && (
                    <div className="flex justify-between text-red-500 font-extrabold">
                      <span>Discount Given:</span>
                      <span>- ৳ {(selectedBooking.discount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-brand-beige/10 dark:border-zinc-800 pt-2 text-sm font-extrabold text-brand-black dark:text-brand-offwhite">
                    <span>Total Bill:</span>
                    <span>৳ {(selectedBooking.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid:</span>
                    <span>৳ {(selectedBooking.paidAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-brand-beige/10 dark:border-zinc-800 pt-2 font-black text-sm">
                    <span className="text-brand-sage">Outstanding Due:</span>
                    <span className={selectedBooking.dueAmount > 0 ? "text-red-500" : "text-green-600"}>
                      ৳ {(selectedBooking.dueAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Notes */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-brand-sage text-[10px] uppercase tracking-wider block mb-1">Booking Status</span>
                  {selectedBooking.bookingStatus === "Confirmed" ? (
                    <span className="badge bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900/50 dark:text-green-400 font-bold px-3.5 py-3.5 rounded-full">
                      Confirmed
                    </span>
                  ) : selectedBooking.bookingStatus === "Cancelled" ? (
                    <span className="badge bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400 font-bold px-3.5 py-3.5 rounded-full">
                      Cancelled
                    </span>
                  ) : (
                    <span className="badge bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400 font-bold px-3.5 py-3.5 rounded-full">
                      {selectedBooking.bookingStatus}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-brand-sage text-[10px] uppercase tracking-wider block mb-1">Payment Method</span>
                  <span className="badge bg-brand-primary/10 border-none text-brand-primary font-bold px-3.5 py-3.5 rounded-full">
                    {selectedBooking.paymentMethod || "Cash"}
                  </span>
                </div>
              </div>

              {selectedBooking.specialInstructions && (
                <div className="p-3 bg-yellow-50/50 border border-yellow-200/50 dark:bg-yellow-950/10 dark:border-yellow-900/30 rounded-2xl text-xs">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-brand-sage block mb-1">Notes / Instructions</span>
                  <p className="leading-relaxed font-medium">{selectedBooking.specialInstructions}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-t border-brand-beige/10 dark:border-zinc-800 bg-brand-offwhite/50 dark:bg-zinc-900/50">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => ledgerPrint.setPrintData(selectedBooking)}
                  className="btn btn-outline border-brand-beige hover:bg-brand-primary hover:text-white dark:border-zinc-700 text-xs rounded-full px-4 btn-sm"
                >
                  🖨️ Print Ledger
                </button>
                <button
                  type="button"
                  onClick={() => companyPrint.setPrintData(selectedBooking)}
                  className="btn btn-outline border-brand-beige hover:bg-brand-primary hover:text-white dark:border-zinc-700 text-xs rounded-full px-4 btn-sm"
                >
                  🏢 Company Info
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintThermal(selectedBooking)}
                  className="btn btn-outline border-brand-beige hover:bg-brand-primary hover:text-white dark:border-zinc-700 text-xs rounded-full px-4 btn-sm"
                >
                  🧾 Thermal
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="btn bg-brand-primary hover:bg-brand-secondary border-none text-white btn-sm rounded-full px-6 cursor-pointer shadow"
              >
                Close Details
              </button>
            </div>
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

export default VenueDashboardPage;
