"use client";

import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus, FiCreditCard, FiCheck, FiPrinter, FiXCircle } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { useReactToPrint } from "react-to-print";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useReservations from "@/hooks/useReservations";
import { AuthContext } from "@/providers/AuthProvider";
import CustomerModal from "@/components/CustomerModal";

const ReservationsPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const currentDate = new Date();
    // 12 months before, current month, 6 months after
    for (let i = -12; i <= 6; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, "0");
      const value = `${year}-${monthNum}`;
      const label = d.toLocaleString("default", { month: "long", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  }, []);

  const { reservations, totalPages, totalItems, isLoading, refetch } = useReservations(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    statusFilter,
    monthFilter
  );

  // Printing states & Ref
  const printRef = useRef(null);
  const [printRes, setPrintRes] = useState(null);
  const [company, setCompany] = useState(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => setPrintRes(null)
  });

  // Fetch company details for letterhead print
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data } = await axiosSecure.get("/company");
        if (data && data.length > 0) {
          setCompany(data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch company details:", err);
      }
    };
    if (currentUser) {
      fetchCompany();
    }
  }, [axiosSecure, currentUser]);

  useEffect(() => {
    if (printRes) {
      handlePrint();
    }
  }, [printRes]);

  // Lists for dropdowns
  const [customers, setCustomers] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [originalCheckInDate, setOriginalCheckInDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    customer: "",
    checkInDate: "",
    checkOutDate: "",
    bookingSource: "Walk-in",
    status: "Draft",
    notes: "",
    rooms: [] // Array of { roomType, ratePlan, nightlyRate, adults, children, room, nights }
  });

  // Payments modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payResId, setPayResId] = useState(null);
  const [paymentsList, setPaymentsList] = useState([]);
  const [payFormData, setPayFormData] = useState({
    paymentType: "",
    amount: "",
    transactionRef: "",
    notes: "",
    receivedBy: ""
  });

  // Checkin assignment modal state
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [checkinRes, setCheckinRes] = useState(null);
  const [checkinAssignments, setCheckinAssignments] = useState([]); // Array of { roomType, roomId }

  // Customer Search & Registration states
  const [phoneSearch, setPhoneSearch] = useState("");
  const [custSearchLoading, setCustSearchLoading] = useState(false);
  const [custSearchResults, setCustSearchResults] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);

  const handleSearchCustomer = async () => {
    if (!phoneSearch || phoneSearch.trim().length < 3) {
      Swal.fire("Warning", "Please enter at least 3 digits to search.", "warning");
      return;
    }
    setCustSearchLoading(true);
    setCustSearchResults([]);
    try {
      const res = await axiosSecure.get(`/customer/paginated?search=${encodeURIComponent(phoneSearch)}&limit=5`);
      if (res.data.customers && res.data.customers.length > 0) {
        setCustSearchResults(res.data.customers);
      } else {
        // If not found, open the Customer modal directly!
        setCustSearchResults([]);
        setIsCustModalOpen(true);
      }
    } catch (e) {
      console.error("Search customer error:", e);
    } finally {
      setCustSearchLoading(false);
    }
  };

  const selectCust = (cust) => {
    setSelectedCust(cust);
    setFormData(prev => ({ ...prev, customer: cust._id }));
    setPhoneSearch(cust.phoneNumber);
    setCustSearchResults([]);
  };

  const handleCustomerCreateSuccess = async (newCust) => {
    // Add to list
    setCustomers(prev => [newCust, ...prev]);
    // Auto select
    selectCust(newCust);
  };

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [custRes, typeRes, roomsRes, payTypesRes] = await Promise.all([
          axiosSecure.get("/customer?all=true"),
          axiosSecure.get("/room-type?all=true"),
          axiosSecure.get("/room?all=true"),
          axiosSecure.get("/paymenttype")
        ]);
        setCustomers(custRes.data || []);
        setRoomTypes(typeRes.data || []);
        setAvailableRooms(roomsRes.data || []);
        setPaymentTypes(payTypesRes.data || []);
      } catch (err) {
        console.error("Error loading dropdown data:", err);
      }
    };
    if (currentUser) {
      fetchDropdowns();
    }
  }, [axiosSecure, currentUser]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        openFormModal();
        window.history.replaceState(null, "", "/dashboard/reservations");
      }
    }
  }, []);

  const openFormModal = (res = null) => {
    if (res) {
      const checkInStr = res.checkInDate ? res.checkInDate.split("T")[0] : "";
      setEditId(res._id);
      setOriginalCheckInDate(checkInStr);
      setSelectedCust(res.customer || null);
      setPhoneSearch(res.customer?.phoneNumber || "");
      setCustSearchResults([]);
      setFormData({
        customer: res.customer?._id || "",
        checkInDate: checkInStr,
        checkOutDate: res.checkOutDate ? res.checkOutDate.split("T")[0] : "",
        bookingSource: res.bookingSource || "Walk-in",
        status: res.status || "Draft",
        notes: res.notes || "",
        rooms: res.rooms.map(r => ({
          roomType: r.roomType,
          mealPlan: r.mealPlan || "Room Only",
          nightlyRate: r.nightlyRate,
          adults: r.adults,
          children: r.children,
          room: r.room?._id || r.room || "",
          nights: r.nights
        }))
      });
    } else {
      setEditId(null);
      setOriginalCheckInDate("");
      setSelectedCust(null);
      setPhoneSearch("");
      setCustSearchResults([]);
      setFormData({
        customer: "",
        checkInDate: "",
        checkOutDate: "",
        bookingSource: "Walk-in",
        status: "Draft",
        notes: "",
        rooms: [{ roomType: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, room: "", nights: 1 }]
      });
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (reservationId) {
      const loadReservationFromUrl = async () => {
        try {
          const { data } = await axiosSecure.get(`/reservations/${reservationId}`);
          if (data) {
            openFormModal(data);
            window.history.replaceState(null, "", "/dashboard/reservations");
          }
        } catch (err) {
          console.error("Failed to load reservation from query param:", err);
        }
      };
      loadReservationFromUrl();
    }
  }, [reservationId, axiosSecure]);

  const closeFormModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setSelectedCust(null);
    setPhoneSearch("");
    setCustSearchResults([]);
  };

  const handleAddRoomRow = () => {
    setFormData({
      ...formData,
      rooms: [...formData.rooms, { roomType: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, room: "", nights: 1 }]
    });
  };

  const handleRemoveRoomRow = (index) => {
    const updated = [...formData.rooms];
    updated.splice(index, 1);
    setFormData({ ...formData, rooms: updated });
  };

  const handleRoomRowChange = (index, field, value) => {
    const updated = [...formData.rooms];
    updated[index][field] = value;

    if (field === "room" || field === "mealPlan") {
      const roomId = updated[index].room;
      const selectedMeal = updated[index].mealPlan || "Room Only";

      if (roomId) {
        const room = availableRooms.find(r => r._id === roomId);
        if (room) {
          updated[index].roomType = room.roomType;
          if (selectedMeal === "Breakfast Included") {
            updated[index].nightlyRate = room.priceWithBreakfast || 0;
          } else if (selectedMeal === "All-Day Food Included") {
            updated[index].nightlyRate = room.priceWithAllDayFood || 0;
          } else {
            updated[index].nightlyRate = room.price || 0;
          }
        }
      } else {
        if (field === "room") {
          updated[index].roomType = "";
          updated[index].nightlyRate = 0;
        }
      }
    }

    // Calculate nights automatically if dates exist
    if (formData.checkInDate && formData.checkOutDate) {
      const checkin = new Date(formData.checkInDate);
      const checkout = new Date(formData.checkOutDate);
      const diffTime = checkout.getTime() - checkin.getTime();
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      updated[index].nights = nights > 0 ? nights : 1;
    }

    setFormData({ ...formData, rooms: updated });
  };

  const handleDateChange = (field, value) => {
    const updatedForm = { ...formData, [field]: value };
    if (updatedForm.checkInDate && updatedForm.checkOutDate) {
      const checkin = new Date(updatedForm.checkInDate);
      const checkout = new Date(updatedForm.checkOutDate);
      const diffTime = checkout.getTime() - checkin.getTime();
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const resolvedNights = nights > 0 ? nights : 1;
      updatedForm.rooms = updatedForm.rooms.map(r => ({
        ...r,
        nights: resolvedNights
      }));
    }
    setFormData(updatedForm);
  };

  const handleSaveReservation = async () => {
    if (!formData.customer) {
      Swal.fire("Validation Error", "Please select a customer.", "warning");
      return;
    }
    if (!formData.checkInDate || !formData.checkOutDate) {
      Swal.fire("Validation Error", "Please select check-in and check-out dates.", "warning");
      return;
    }
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const checkIn = new Date(formData.checkInDate);
    checkIn.setHours(0, 0, 0, 0);

    const isDateChanged = editId ? (formData.checkInDate !== originalCheckInDate) : true;
    if (isDateChanged && checkIn < todayLocal) {
      Swal.fire("Validation Error", "Check-in date cannot be in the past.", "warning");
      return;
    }
    if (checkIn >= new Date(formData.checkOutDate)) {
      Swal.fire("Validation Error", "Check-out date must be after check-in date.", "warning");
      return;
    }
    if (formData.rooms.length === 0) {
      Swal.fire("Validation Error", "Please add at least one room.", "warning");
      return;
    }
    for (let idx = 0; idx < formData.rooms.length; idx++) {
      const r = formData.rooms[idx];
      if (!r.room) {
        Swal.fire("Validation Error", `Please select a room for entry #${idx + 1}.`, "warning");
        return;
      }
      if (!r.mealPlan) {
        Swal.fire("Validation Error", `Please select a meal plan for entry #${idx + 1}.`, "warning");
        return;
      }
      if (r.nightlyRate === undefined || r.nightlyRate === null || isNaN(r.nightlyRate) || r.nightlyRate < 0) {
        Swal.fire("Validation Error", `Please enter a valid positive nightly rate for entry #${idx + 1}.`, "warning");
        return;
      }
      if (!r.adults || isNaN(r.adults) || r.adults < 1) {
        Swal.fire("Validation Error", `Please enter at least 1 adult for entry #${idx + 1}.`, "warning");
        return;
      }
      if (r.children === undefined || r.children === null || isNaN(r.children) || r.children < 0) {
        Swal.fire("Validation Error", `Please enter a valid number of children (minimum 0) for entry #${idx + 1}.`, "warning");
        return;
      }
    }

    setIsSubmitting(true);
    const processedRooms = formData.rooms.map(r => ({
      ...r,
      room: r.room === "" ? null : r.room
    }));
    const payload = { ...formData, rooms: processedRooms };

    try {
      if (editId) {
        await axiosSecure.put(`/reservations/${editId}`, payload);
        await refetch();
        closeFormModal();
        Swal.fire("Success", "Reservation successfully updated.", "success");
      } else {
        const { data: newRes } = await axiosSecure.post("/reservations", payload);
        await refetch();
        closeFormModal();
        
        // Ask if they want to collect any deposit payment
        Swal.fire({
          title: "Reservation Created!",
          text: `Reservation ${newRes.reservationNo} created successfully. Would you like to record a prepayment deposit for this reservation now?`,
          icon: "success",
          showCancelButton: true,
          confirmButtonColor: "#346E36",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes, Record Payment",
          cancelButtonText: "No, Later"
        }).then((result) => {
          if (result.isConfirmed) {
            openPaymentsModal(newRes);
          }
        });
      }
    } catch (error) {
      Swal.fire("Failed", error.response?.data?.message || "Failed to save reservation.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReservation = async (res) => {
    const totalCost = res.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0);

    const { value: formValues } = await Swal.fire({
      title: `Cancel Reservation ${res.reservationNo}`,
      html: `
        <div class="text-left space-y-3 font-sans text-brand-charcoal dark:text-brand-offwhite">
          <p class="text-xs text-gray-500 mb-2">Original Booking Cost: <b>৳${totalCost}</b>. Paid Deposit: <b>৳${res.totalPaid || 0}</b>.</p>
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-xs font-bold text-gray-600 uppercase tracking-wider">Cancellation Fee (৳)</span></label>
            <input id="swal-fee" type="number" class="input input-bordered w-full text-brand-charcoal bg-white dark:bg-brand-charcoal/50 border-brand-primary" value="0" min="0" />
          </div>
          <div class="form-control mt-2">
            <label class="label py-1"><span class="label-text text-xs font-bold text-gray-600 uppercase tracking-wider">Reason for Cancellation</span></label>
            <textarea id="swal-reason" class="textarea textarea-bordered w-full h-20 text-brand-charcoal bg-white dark:bg-brand-charcoal/50 border-brand-primary" placeholder="Enter reason..."></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Cancel Reservation',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      preConfirm: () => {
        const fee = document.getElementById('swal-fee').value;
        const reason = document.getElementById('swal-reason').value;
        if (fee === undefined || isNaN(fee) || Number(fee) < 0) {
          Swal.showValidationMessage('Please enter a valid cancellation fee');
          return false;
        }
        return {
          cancellationFee: Number(fee),
          cancellationReason: reason
        };
      }
    });

    if (formValues) {
      try {
        await axiosSecure.post(`/reservations/${res._id}/cancel`, formValues);
        Swal.fire("Cancelled", "The reservation has been cancelled successfully.", "success");
        await refetch();
      } catch (err) {
        Swal.fire("Error", err.response?.data?.message || "Failed to cancel reservation.", "error");
      }
    }
  };

  const handleQuickRefund = async (res, refundAmt) => {
    const { value: formValues } = await Swal.fire({
      title: 'Process Refund Payout',
      html: `
        <div style="text-align: left; font-family: sans-serif;">
          <p style="font-size: 14px; margin-bottom: 16px; color: #4B5563;">
            A refund of <strong>৳${refundAmt}</strong> is owed for reservation <strong>${res.reservationNo}</strong>.
          </p>
          
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 11px; font-weight: bold; color: #346E36; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Refund Method *</label>
            <select id="swal-refund-method" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box; height: 40px; font-size: 14px; border: 1px solid #346E36; border-radius: 4px;">
              <option value="">Select Method</option>
              <option value="Refund (Cash)">Cash Payout</option>
              <option value="Refund (Card)">Card Refund</option>
              <option value="Refund (bKash)">bKash Wallet</option>
              <option value="Refund (Nagad)">Nagad Wallet</option>
              <option value="Refund (Rocket)">Rocket Wallet</option>
              <option value="Refund (Bank)">Bank Transfer</option>
            </select>
          </div>
          
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 11px; font-weight: bold; color: #346E36; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Transaction / Ref Number</label>
            <input id="swal-refund-ref" type="text" class="swal2-input" placeholder="e.g. TXN987654" style="margin: 0; width: 100%; box-sizing: border-box; height: 40px; font-size: 14px; border: 1px solid #346E36; border-radius: 4px;">
          </div>
          
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 11px; font-weight: bold; color: #346E36; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Receiver Name (Who received the refund) *</label>
            <input id="swal-refund-receiver" type="text" class="swal2-input" placeholder="e.g. Apon Khan" style="margin: 0; width: 100%; box-sizing: border-box; height: 40px; font-size: 14px; border: 1px solid #346E36; border-radius: 4px;">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Record Refund Payout',
      preConfirm: () => {
        const method = document.getElementById('swal-refund-method').value;
        const ref = document.getElementById('swal-refund-ref').value;
        const receiver = document.getElementById('swal-refund-receiver').value;
        
        if (!method) {
          Swal.showValidationMessage('Refund method is required');
          return false;
        }
        if (!receiver) {
          Swal.showValidationMessage('Receiver name is required');
          return false;
        }
        return { method, ref, receiver };
      }
    });

    if (formValues) {
      try {
        const payload = {
          paymentType: formValues.method,
          amount: -Number(refundAmt), // negative amount represents cash return
          transactionRef: formValues.ref || "",
          notes: `Refund for cancelled booking ${res.reservationNo}`,
          receivedBy: formValues.receiver
        };
        await axiosSecure.post(`/reservations/${res._id}/payments`, payload);
        Swal.fire("Refund Logged", `Refund payout of ৳${refundAmt} recorded in database.`, "success");
        await refetch();
      } catch (err) {
        Swal.fire("Error", err.response?.data?.message || "Failed to log refund payout.", "error");
      }
    }
  };

  const handleDelete = (id, resNo) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Delete reservation: ${resNo}? Deposits will also be removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/reservations/${id}`);
          await refetch();
          Swal.fire("Deleted!", "Reservation deleted successfully.", "success");
        } catch (error) {
          Swal.fire("Error!", error.response?.data?.message || "Failed to delete.", "error");
        }
      }
    });
  };

  // Payments & Deposits logic
  const openPaymentsModal = async (res) => {
    setPayResId(res._id);
    setPayFormData({ paymentType: "", amount: "", transactionRef: "", notes: "", receivedBy: "" });
    try {
      const { data } = await axiosSecure.get(`/reservations/${res._id}/payments`);
      setPaymentsList(data || []);
      setIsPayModalOpen(true);
    } catch (err) {
      Swal.fire("Error", "Failed to fetch deposits list", "error");
    }
  };

  const handleAddPayment = async () => {
    if (!payFormData.paymentType || !payFormData.amount || isNaN(payFormData.amount) || Number(payFormData.amount) === 0) {
      Swal.fire("Validation Error", "Please provide payment type and non-zero amount (use negative for refunds).", "warning");
      return;
    }
    if (Number(payFormData.amount) < 0 && !payFormData.receivedBy) {
      Swal.fire("Validation Error", "Please provide the receiver name for this refund payout.", "warning");
      return;
    }

    try {
      await axiosSecure.post(`/reservations/${payResId}/payments`, payFormData);
      // Reload list
      const { data } = await axiosSecure.get(`/reservations/${payResId}/payments`);
      setPaymentsList(data || []);
      setPayFormData({ paymentType: "", amount: "", transactionRef: "", notes: "", receivedBy: "" });
      refetch();
      Swal.fire("Success", "Payment/deposit recorded.", "success");
    } catch (error) {
      Swal.fire("Failed", error.response?.data?.message || "Failed to record payment.", "error");
    }
  };

  // Convert to check-in logic
  const openCheckinModal = (res) => {
    setCheckinRes(res);
    // Setup initial check-in assignments
    const initial = res.rooms.map(r => ({
      roomType: r.roomType,
      roomId: r.room?._id || ""
    }));
    setCheckinAssignments(initial);
    setIsCheckinModalOpen(true);
  };

  const handleCheckinAssignmentChange = (index, roomId) => {
    const updated = [...checkinAssignments];
    updated[index].roomId = roomId;
    setCheckinAssignments(updated);
  };

  const handleConfirmCheckin = async () => {
    for (const a of checkinAssignments) {
      if (!a.roomId) {
        Swal.fire("Validation Error", "Please assign a specific room for all entries.", "warning");
        return;
      }
    }

    try {
      await axiosSecure.post(`/reservations/${checkinRes._id}/convert`, {
        roomAssignments: checkinAssignments
      });
      setIsCheckinModalOpen(false);
      refetch();
      Swal.fire("Checked In", `Stay records and ledger initialized for ${checkinRes.reservationNo}.`, "success");
    } catch (error) {
      Swal.fire("Check-in Failed", error.response?.data?.message || "Failed to perform check-in.", "error");
    }
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="Reservations Dashboard"
        subtitle="Manage pre-bookings, check expected arrivals, deposits, and execute check-ins."
      >
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <select
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite rounded-full px-5 h-12 outline-none focus:outline-none font-bold"
          >
            <option value="">All Months</option>
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite rounded-full px-5 h-12 outline-none focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Fully Paid">Fully Paid</option>
            <option value="Checked-In">Checked-In</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-80 h-12">
            <FiSearch className="text-brand-sage text-lg" />
            <input
              type="text"
              className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
              placeholder="Search Customer/Res. No..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
        </div>
      </SectionHeader>

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
            <option value="20">20</option>
          </select>
          <span className="ml-4">Total Records: {totalItems}</span>
        </div>

        <button onClick={() => openFormModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10">
          <FiPlus className="text-lg" />
          <span className="uppercase tracking-widest text-xs font-bold">New Reservation</span>
        </button>
      </div>

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
                    <th className="pl-8 py-5">Reservation No</th>
                    <th className="py-5">Customer</th>
                    <th className="py-5">Dates (Check-In → Out)</th>
                    <th className="py-5">Rooms / Capacity</th>
                    <th className="py-5">Financials (Total / Paid / Due)</th>
                    <th className="py-5">Status</th>
                    <th className="pr-8 text-center py-5 w-48">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {reservations.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No reservations found.
                        </td>
                      </tr>
                    ) : (
                      reservations.map((res) => {
                        const totalCost = res.status === "Cancelled"
                          ? (res.cancellationFee || 0)
                          : res.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0);
                        const paidAmount = res.totalPaid || 0;
                        const dueAmount = totalCost - paidAmount;
                        const statusColors = {
                          Draft: "bg-gray-100 text-gray-500",
                          Confirmed: "bg-blue-100 text-blue-700",
                          "Partially Paid": "bg-yellow-100 text-yellow-700",
                          "Fully Paid": "bg-indigo-100 text-indigo-700",
                          "Checked-In": "bg-green-100 text-green-700",
                          Cancelled: "bg-red-100 text-red-700"
                        };

                        return (
                          <motion.tr
                            key={res._id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm"
                          >
                            <td className="pl-8 py-4 font-mono font-bold">
                              {res.reservationNo}
                            </td>
                            <td className="py-4">
                              <div className="font-bold">{res.customer?.fullName}</div>
                              <div className="text-xs text-brand-sage">{res.customer?.phoneNumber}</div>
                            </td>
                            <td className="py-4 text-xs font-bold text-brand-sage">
                              {new Date(res.checkInDate).toLocaleDateString()} → {new Date(res.checkOutDate).toLocaleDateString()}
                              <div className="text-[10px] font-normal uppercase tracking-wider text-brand-secondary">Source: {res.bookingSource}</div>
                            </td>
                            <td className="py-4 text-xs font-bold">
                              {res.rooms.length} room(s)
                              <div className="text-[10px] font-normal text-brand-sage">
                                {res.rooms.map((r, i) => {
                                  const roomNo = r.room?.roomNumber || r.roomNo || "";
                                  return `${r.roomType} (${r.mealPlan || "Room Only"})${roomNo ? ` - Room ${roomNo}` : ""}`;
                                }).join(", ")}
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="font-bold">Total: ৳{totalCost}</div>
                              <div className="text-xs text-green-600 font-bold">Paid: ৳{paidAmount}</div>
                              <div className={`text-xs font-bold ${dueAmount > 0 ? "text-red-500" : "text-brand-sage"}`}>
                                Due: ৳{dueAmount}
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`badge badge-sm font-bold tracking-wider uppercase text-[10px] border-none ${statusColors[res.status] || "bg-gray-100 text-gray-500"}`}>
                                {res.status}
                              </span>
                            </td>
                            <td className="pr-8 py-4">
                              <div className="flex justify-center items-center gap-2">
                                {res.status !== "Checked-In" && res.status !== "Cancelled" && (
                                  <button onClick={() => openCheckinModal(res)} className="btn btn-xs bg-green-600 hover:bg-green-700 text-white border-none rounded-full cursor-pointer gap-1 px-3 shadow" title="Check-In Guest">
                                    <FiCheck /> Check-In
                                  </button>
                                )}
                                
                                {res.status !== "Checked-In" && (
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openPaymentsModal(res)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-secondary hover:bg-brand-secondary/10 transition-colors shadow-none cursor-pointer" title="Manage Payments/Deposits">
                                    <FiCreditCard size={16} />
                                  </motion.button>
                                )}
                                
                                {res.status !== "Checked-In" && res.status !== "Cancelled" && (
                                  <>
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openFormModal(res)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Edit Reservation">
                                      <FiEdit size={16} />
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCancelReservation(res)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Cancel Reservation">
                                      <FiXCircle size={16} />
                                    </motion.button>
                                  </>
                                )}

                                {res.status === "Cancelled" && dueAmount < 0 && (
                                  <button 
                                    onClick={() => handleQuickRefund(res, Math.abs(dueAmount))} 
                                    className="btn btn-xs bg-red-600 hover:bg-red-700 text-white border-none rounded-full cursor-pointer px-3 shadow font-bold text-[10px]"
                                    title="Process Cash Refund"
                                  >
                                    Refund ৳{Math.abs(dueAmount)}
                                  </button>
                                )}
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setPrintRes(res)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-blue-500 hover:bg-blue-50 transition-colors shadow-none cursor-pointer" title="Print Invoice">
                                  <FiPrinter size={16} />
                                </motion.button>
                                {(currentUser?.role === "admin" || currentUser?.role === "superadmin") && (!res.payments || res.payments.length === 0) && (
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(res._id, res.reservationNo)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Delete Reservation">
                                    <FiTrash2 size={16} />
                                  </motion.button>
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

      {/* Main reservation Add/Edit modal */}
      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-4xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Reservation' : 'Create Reservation'}
              </h3>
              <button onClick={closeFormModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex gap-4">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Customer *</span></label>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={phoneSearch} 
                      onChange={(e) => { 
                        setPhoneSearch(e.target.value); 
                        setSelectedCust(null); 
                        setFormData(prev => ({ ...prev, customer: "" })); 
                        setCustSearchResults([]); 
                      }} 
                      placeholder="Search by phone number (e.g. 01700000000)" 
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary flex-1 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" 
                    />
                    <button 
                      type="button" 
                      onClick={handleSearchCustomer} 
                      disabled={custSearchLoading} 
                      className="btn bg-brand-primary hover:bg-brand-secondary text-white border-none px-6"
                    >
                      {custSearchLoading ? "..." : "Search"}
                    </button>
                  </div>

                  {custSearchResults.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 dark:bg-brand-charcoal/30 border border-brand-beige/50 dark:border-brand-beige/20 rounded-lg animate-fade-in">
                      <div className="text-[10px] font-bold text-brand-sage uppercase tracking-wider">Search Results</div>
                      {custSearchResults.map((cust) => (
                        <div key={cust._id} className="flex justify-between items-center bg-white dark:bg-brand-charcoal p-2 rounded-lg border border-brand-beige/30 dark:border-brand-beige/10">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800 dark:text-brand-offwhite">{cust.fullName}</span>
                            <span className="text-xs text-brand-sage">{cust.phoneNumber}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => selectCust(cust)} 
                            className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none px-3"
                          >
                            Select
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button" 
                        onClick={() => { setCustSearchResults([]); setIsCustModalOpen(true); }} 
                        className="text-xs text-blue-500 font-bold hover:underline self-start mt-1"
                      >
                        + Add New Customer
                      </button>
                    </div>
                  )}

                  {selectedCust && custSearchResults.length === 0 && (
                    <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 p-3 rounded-lg border border-brand-beige dark:border-brand-beige/20 mt-2 flex justify-between items-center">
                      <div>
                        <div className="text-[10px] text-brand-sage font-bold uppercase tracking-widest mb-1">Selected Guest</div>
                        <div className="font-bold text-brand-black dark:text-brand-offwhite">{selectedCust.fullName}</div>
                        <div className="text-xs text-brand-sage">{selectedCust.phoneNumber}</div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { 
                          setSelectedCust(null); 
                          setFormData(prev => ({ ...prev, customer: "" })); 
                          setPhoneSearch(""); 
                        }} 
                        className="text-xs text-red-500 hover:underline font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Expected Check-In *</span></label>
                  <input
                    type="date"
                    value={formData.checkInDate}
                    onChange={(e) => handleDateChange("checkInDate", e.target.value)}
                    min={editId ? undefined : new Date().toLocaleDateString('en-CA')}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  />
                </div>
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Expected Check-Out *</span></label>
                  <input
                    type="date"
                    value={formData.checkOutDate}
                    onChange={(e) => handleDateChange("checkOutDate", e.target.value)}
                    min={formData.checkInDate || new Date().toLocaleDateString('en-CA')}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Booking Source</span></label>
                  <select
                    value={formData.bookingSource}
                    onChange={(e) => setFormData({ ...formData, bookingSource: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    <option value="Website">Website</option>
                    <option value="Phone">Phone</option>
                    <option value="Agent">Agent</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Status</span></label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Confirmed">Confirmed</option>
                  </select>
                </div>
              </div>

              {/* Rooms detail section */}
              <div className="space-y-4 pt-4 border-t border-brand-beige/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-brand-sage uppercase tracking-widest">Room Requirements</span>
                  <button type="button" onClick={handleAddRoomRow} className="btn btn-xs bg-brand-primary text-white border-none rounded-full px-3 gap-1">
                    <FiPlus /> Add Room
                  </button>
                </div>

                {formData.rooms.map((r, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-3 p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige dark:border-brand-beige/15 rounded-xl">
                    <div className="form-control w-[200px]">
                      <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Select Room *</span></label>
                      <select
                        value={r.room}
                        onChange={(e) => handleRoomRowChange(index, "room", e.target.value)}
                        className="select select-bordered select-sm border-brand-primary dark:border-brand-primary/50 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs font-bold"
                      >
                        <option value="">Select Room</option>
                        {availableRooms.map(rm => (
                          <option key={rm._id} value={rm._id}>{rm.roomNumber} ({rm.roomType})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control w-[150px]">
                      <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Meal Plan</span></label>
                      <select
                        value={r.mealPlan}
                        onChange={(e) => handleRoomRowChange(index, "mealPlan", e.target.value)}
                        className="select select-bordered select-sm border-brand-primary dark:border-brand-primary/50 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs"
                      >
                        <option value="Room Only">Room Only</option>
                        <option value="Breakfast Included">Breakfast Included</option>
                        <option value="All-Day Food Included">All-Day Food Included</option>
                      </select>
                    </div>

                    <div className="form-control w-[90px]">
                      <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Nightly Rate</span></label>
                      <input
                        type="number"
                        value={r.nightlyRate}
                        onChange={(e) => handleRoomRowChange(index, "nightlyRate", Number(e.target.value))}
                        className="input input-bordered input-sm border-brand-primary dark:border-brand-primary/50 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                      />
                    </div>

                    <div className="form-control w-[60px]">
                      <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Adults</span></label>
                      <input
                        type="number"
                        value={r.adults}
                        onChange={(e) => handleRoomRowChange(index, "adults", Number(e.target.value))}
                        className="input input-bordered input-sm border-brand-primary dark:border-brand-primary/50 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                        min="1"
                      />
                    </div>

                    <div className="form-control w-[60px]">
                      <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Children</span></label>
                      <input
                        type="number"
                        value={r.children}
                        onChange={(e) => handleRoomRowChange(index, "children", Number(e.target.value))}
                        className="input input-bordered input-sm border-brand-primary dark:border-brand-primary/50 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                        min="0"
                      />
                    </div>

                    <button type="button" onClick={() => handleRemoveRoomRow(index)} className="btn btn-square btn-outline btn-xs btn-error flex items-center justify-center h-8 w-8 cursor-pointer" disabled={formData.rooms.length === 1}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Notes</span></label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="textarea textarea-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-20"
                  placeholder="Special requests or notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeFormModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleSaveReservation} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processing...
                  </>
                ) : (editId ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Deposits & Payments Modal */}
      {isPayModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                  Manage Deposit Payments
                </h3>
                <button
                  onClick={async () => {
                    try {
                      const { data } = await axiosSecure.get(`/reservations/${payResId}`);
                      setPrintRes(data);
                    } catch (err) {
                      Swal.fire("Error", "Failed to load reservation for printing", "error");
                    }
                  }}
                  className="btn btn-xs bg-brand-primary text-white hover:bg-brand-secondary border-none rounded px-3 h-7 flex items-center gap-1 shadow-sm uppercase tracking-widest font-bold text-[9px]"
                  title="Print Reservation Invoice"
                >
                  <FiPrinter size={12} /> Print Invoice
                </button>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <div className="max-h-[30vh] overflow-y-auto space-y-2">
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block mb-2">History of payments</span>
                {paymentsList.length === 0 ? (
                  <div className="p-6 bg-brand-offwhite/40 dark:bg-brand-charcoal/20 text-center text-xs font-bold uppercase tracking-wider text-brand-sage rounded-xl">No deposits collected yet.</div>
                ) : (
                  <div className="space-y-2">
                    {paymentsList.map(pay => (
                      <div key={pay._id} className="flex justify-between items-center p-3 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/20 dark:border-brand-beige/10 rounded-xl">
                        <div>
                          <div className="font-bold text-sm text-brand-charcoal dark:text-brand-offwhite">{pay.paymentType}</div>
                          <div className="text-[10px] text-brand-sage">{new Date(pay.paymentDate).toLocaleString()} {pay.transactionRef && `| Ref: ${pay.transactionRef}`}</div>
                        </div>
                        <div className="font-bold text-brand-secondary">৳{pay.amount}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add payment form */}
              <div className="p-4 bg-brand-offwhite/40 dark:bg-brand-charcoal/35 rounded-2xl border border-brand-beige/40 dark:border-brand-beige/10 space-y-3">
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block mb-1">Add Prepayment Deposit</span>
                <div className="flex gap-4">
                  <div className="form-control w-1/2">
                    <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Payment Method *</span></label>
                    <select
                      value={payFormData.paymentType}
                      onChange={(e) => setPayFormData({ ...payFormData, paymentType: e.target.value })}
                      className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                    >
                      <option value="">Select Method</option>
                      {paymentTypes.map(pt => (
                        <option key={pt._id} value={pt.name}>{pt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control w-1/2">
                    <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Amount *</span></label>
                    <input
                      type="number"
                      value={payFormData.amount}
                      onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                      className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                      placeholder="e.g. 2000"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="form-control w-full">
                    <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Transaction Ref</span></label>
                    <input
                      type="text"
                      value={payFormData.transactionRef}
                      onChange={(e) => setPayFormData({ ...payFormData, transactionRef: e.target.value })}
                      className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                      placeholder="e.g. TXN987654"
                    />
                  </div>
                </div>
                <button type="button" onClick={handleAddPayment} className="btn btn-xs bg-brand-primary text-white border-none w-full rounded-lg h-8 uppercase tracking-widest font-bold text-[10px]">
                  Submit Deposit
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Confirm Check-in / Room Assignment Modal */}
      {isCheckinModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                Room Assignments Check-In
              </h3>
              <button onClick={() => setIsCheckinModalOpen(false)} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <span className="text-xs font-bold text-brand-sage uppercase tracking-widest block mb-2">Assign Room Numbers</span>
              <div className="space-y-4">
                {checkinAssignments.map((a, idx) => {
                  const matchingRooms = availableRooms.filter(r => r.roomType === a.roomType && (r.status === "Available" || r.status === "Reserved" || r._id === a.roomId));

                  return (
                    <div key={idx} className="flex justify-between items-center p-3 bg-brand-offwhite/40 dark:bg-brand-charcoal/30 border border-brand-beige/10 rounded-xl">
                      <span className="font-bold text-sm text-brand-charcoal dark:text-brand-offwhite uppercase tracking-wider">{a.roomType}</span>
                      <select
                        value={a.roomId}
                        onChange={(e) => handleCheckinAssignmentChange(idx, e.target.value)}
                        className="select select-bordered select-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-8 text-xs select-xs"
                      >
                        <option value="">Select Room</option>
                        {matchingRooms.map(rm => (
                          <option key={rm._id} value={rm._id}>{rm.roomNumber}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setIsCheckinModalOpen(false)} className="btn btn-ghost hover:bg-brand-beige text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
                <button onClick={handleConfirmCheckin} className="btn bg-green-600 hover:bg-green-700 text-white border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md">
                  Confirm Arrival
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-8 bg-white text-black font-sans w-full" style={{ color: "#000" }}>
          {printRes && (
            <div>
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  {company?.logo ? (
                    <img src={company.logo} alt="Logo" className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-150 flex items-center justify-center font-bold text-xl rounded border border-gray-300">
                      CR
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{company?.name || "Chayatol Resort & Restaurant"}</h1>
                    <p className="text-xs text-gray-700 mt-1">{company?.address}</p>
                    <p className="text-xs text-gray-700">Phone: {company?.phone} | Email: {company?.email}</p>
                    {company?.website && <p className="text-xs text-gray-700">Website: {company.website}</p>}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-700">
                  <p className="text-lg font-bold uppercase tracking-wider text-gray-950">Reservation Invoice</p>
                  <p><span className="font-bold">Reservation No:</span> {printRes.reservationNo}</p>
                  <p><span className="font-bold">Date:</span> {new Date(printRes.createdAt || Date.now()).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Guest & Reservation details */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-xs text-gray-800">
                <div>
                  <h3 className="font-bold text-gray-900 border-b pb-1 uppercase tracking-wider mb-2">Guest Information</h3>
                  <p><span className="font-semibold">Name:</span> {printRes.customer?.fullName}</p>
                  <p><span className="font-semibold">Phone:</span> {printRes.customer?.phoneNumber}</p>
                  {printRes.customer?.email && <p><span className="font-semibold">Email:</span> {printRes.customer.email}</p>}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 border-b pb-1 uppercase tracking-wider mb-2">Reservation Info</h3>
                  <p><span className="font-semibold">Check-In Date:</span> {new Date(printRes.checkInDate).toLocaleDateString()}</p>
                  <p><span className="font-semibold">Check-Out Date:</span> {new Date(printRes.checkOutDate).toLocaleDateString()}</p>
                  <p><span className="font-semibold">Booking Source:</span> {printRes.bookingSource}</p>
                  <p><span className="font-semibold">Status:</span> {printRes.status}</p>
                </div>
              </div>

              {/* Booked Rooms Table */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Booked Rooms</h3>
                <table className="w-full text-xs text-left border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="border border-gray-300 p-2 font-bold">Room Type</th>
                      <th className="border border-gray-300 p-2 font-bold">Meal Plan</th>
                      <th className="border border-gray-300 p-2 font-bold">Assigned Room</th>
                      <th className="border border-gray-300 p-2 font-bold text-right">Nightly Rate</th>
                      <th className="border border-gray-300 p-2 font-bold text-center">Nights</th>
                      <th className="border border-gray-300 p-2 font-bold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printRes.rooms.map((r, i) => {
                      const sub = r.nightlyRate * r.nights;
                      const roomNo = r.room?.roomNumber || r.roomNo || "Unassigned";
                      return (
                        <tr key={i} className="border-b border-gray-200">
                          <td className="border border-gray-300 p-2">{r.roomType}</td>
                          <td className="border border-gray-300 p-2">{r.mealPlan || "Room Only"}</td>
                          <td className="border border-gray-300 p-2">{roomNo}</td>
                          <td className="border border-gray-300 p-2 text-right">৳{r.nightlyRate}</td>
                          <td className="border border-gray-300 p-2 text-center">{r.nights}</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold">৳{sub}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Prepayments / Deposits History Table */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Prepayment & Deposits</h3>
                {printRes.payments && printRes.payments.length > 0 ? (
                  <table className="w-full text-xs text-left border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="border border-gray-300 p-2 font-bold">Date</th>
                        <th className="border border-gray-300 p-2 font-bold">Payment Method</th>
                        <th className="border border-gray-300 p-2 font-bold">Transaction Reference</th>
                        <th className="border border-gray-300 p-2 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printRes.payments.map((p, i) => (
                        <tr key={i} className="border-b border-gray-200">
                          <td className="border border-gray-300 p-2">{new Date(p.paymentDate).toLocaleString()}</td>
                          <td className="border border-gray-300 p-2">{p.paymentType}</td>
                          <td className="border border-gray-300 p-2">{p.transactionRef || "N/A"}</td>
                          <td className="border border-gray-300 p-2 text-right font-semibold text-green-700">৳{p.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-gray-500 italic">No prepayment deposits collected for this reservation.</p>
                )}
              </div>

              {/* Cancellation details if Cancelled */}
              {printRes.status === "Cancelled" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-xs text-red-800">
                  <h4 className="font-bold text-red-950 uppercase tracking-wider mb-1">Cancellation Summary</h4>
                  <p><span className="font-semibold">Cancellation Fee:</span> ৳{printRes.cancellationFee || 0}</p>
                  {printRes.cancellationReason && <p><span className="font-semibold">Reason:</span> {printRes.cancellationReason}</p>}
                </div>
              )}

              {/* Final financial calculations summary */}
              <div className="flex justify-end mb-12">
                <div className="w-72 text-xs border border-gray-300 p-3 rounded-lg space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>Grand Total Cost:</span>
                    <span>৳{
                      printRes.status === "Cancelled"
                        ? (printRes.cancellationFee || 0)
                        : printRes.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0)
                    }</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-700">
                    <span>Total Deposit Paid:</span>
                    <span>৳{printRes.totalPaid || 0}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-bold text-red-600 text-sm">
                    <span>Outstanding Due:</span>
                    <span>৳{
                      (printRes.status === "Cancelled"
                        ? (printRes.cancellationFee || 0)
                        : printRes.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0)) - (printRes.totalPaid || 0)
                    }</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-16 pt-8 border-t border-gray-300 flex justify-between text-xs text-gray-500">
                <div className="text-center w-40">
                  <div className="border-b border-gray-400 h-10 w-full mb-1"></div>
                  <p className="font-semibold">Guest Signature</p>
                </div>
                <div className="text-center w-40">
                  <div className="border-b border-gray-400 h-10 w-full mb-1"></div>
                  <p className="font-semibold">Authorized Representative</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CustomerModal 
        isOpen={isCustModalOpen} 
        onClose={() => setIsCustModalOpen(false)} 
        initialPhoneNumber={phoneSearch}
        onSuccess={handleCustomerCreateSuccess}
      />
    </div>
  );
};

export default ReservationsPage;
