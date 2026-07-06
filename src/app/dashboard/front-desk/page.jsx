"use client";

import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
import { FiChevronLeft, FiChevronRight, FiPlus, FiCalendar, FiUser, FiHome, FiCheckCircle, FiInfo, FiX, FiEye, FiSearch, FiBriefcase, FiDollarSign, FiClock, FiFileText, FiArrowRight, FiCreditCard, FiCheck, FiPrinter, FiXCircle, FiTrash2, FiEdit } from "react-icons/fi";
import { MdRestaurant, MdBeachAccess } from "react-icons/md";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import useStandardPrint from "@/hooks/useStandardPrint";

import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import usePagePermission from "@/hooks/usePagePermission";
import { AuthContext } from "@/providers/AuthProvider";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";
import CustomerModal from "@/components/CustomerModal";
import { calculateCompleteness } from "@/lib/customerHelper";
import ReceiptTemplate from "@/components/Receipt/ReceiptTemplate";
import A4ReceiptTemplate from "@/components/Receipt/A4ReceiptTemplate";

const getInvoiceSummary = (entries) => {
  let roomTotal = 0;
  let foodTotal = 0;
  let serviceTotal = 0;
  let discountTotal = 0;
  let paidTotal = 0;

  entries.forEach(e => {
    const desc = e.description.toLowerCase();
    if (e.debit > 0) {
      if (desc.includes("food")) {
        foodTotal += e.debit;
      } else if (desc.includes("service") || desc.includes("pickup") || desc.includes("laundry") || desc.includes("tax")) {
        serviceTotal += e.debit;
      } else {
        roomTotal += e.debit;
      }
    } else if (e.credit > 0) {
      if (desc.includes("discount")) {
        discountTotal += e.credit;
      } else {
        paidTotal += e.credit;
      }
    }
  });

  const netPayable = roomTotal + foodTotal + serviceTotal - discountTotal;
  const dueAmount = netPayable - paidTotal;

  return {
    roomTotal,
    foodTotal,
    serviceTotal,
    discountTotal,
    paidTotal,
    netPayable,
    dueAmount
  };
};

const FrontDeskTimelinePage = () => {
  const [mounted, setMounted] = useState(false);
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const { canAdd, canEdit } = usePagePermission();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date()); // Holds active month/year
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Timeline Data
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [stays, setStays] = useState([]);

  // Detail Modal state (simple timeline block selection)
  const [selectedBlock, setSelectedBlock] = useState(null); // { type: 'res'|'stay', data: object }
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // --- Stays Folio Ledger State ---
  const [selectedStay, setSelectedStay] = useState(null);
  const [folioEntries, setFolioEntries] = useState([]);
  const [isFolioLoading, setIsFolioLoading] = useState(false);

  // Prerequisites
  const [foodMenu, setFoodMenu] = useState([]);
  const [services, setServices] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [foodCategories, setFoodCategories] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);

  // Selected categories in modals
  const [selectedFoodCategory, setSelectedFoodCategory] = useState("");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");

  // Modal open toggles for stays
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isAdjustCheckoutModalOpen, setIsAdjustCheckoutModalOpen] = useState(false);

  // Form states for stays
  const [foodFormData, setFoodFormData] = useState({ foodItem: "", quantity: 1, isChargeable: true });
  const [serviceFormData, setServiceFormData] = useState({ serviceId: "", isChargeable: true });
  const [paymentFormData, setPaymentFormData] = useState({ paymentType: "", amount: "", transactionRef: "", notes: "" });
  const [discountFormData, setDiscountFormData] = useState({ discountType: "percentage", value: "", applyTo: "all", reason: "" });
  const [extendFormData, setExtendFormData] = useState({ newCheckOutDate: "", roomAssignments: [] });
  const [adjustCheckoutFormData, setAdjustCheckoutFormData] = useState({ newCheckOutDate: "", adjustmentType: "none", adjustmentAmount: 0, reason: "" });
  const [checkoutPayment, setCheckoutPayment] = useState({ paymentType: "", amount: "", transactionRef: "" });
  const [makeRoomsAvailable, setMakeRoomsAvailable] = useState(false);
  const [settings, setSettings] = useState({ checkInTime: "14:00", checkOutTime: "12:00" });
  const [isPosting, setIsPosting] = useState(false);

  // Standardize Print hook integration
  const {
    printData: folioPrintData,
    setPrintData: setFolioPrintData,
    printRef: folioPrintRef,
    handlePrint: handleFolioPrint
  } = useStandardPrint({
    documentTitle: "Folio_Ledger",
  });

  // Final Invoice print setup
  const {
    printData: finalInvoiceRes,
    setPrintData: setFinalInvoiceRes,
    printRef: finalInvoicePrintRef
  } = useStandardPrint({
    documentTitle: `Final_Invoice_${selectedStay?.stayNo || "Report"}`,
  });

  // Print Food & Service Summary states
  const [foodServicePrintData, setFoodServicePrintData] = useState(null);
  const [detailedFoodOrders, setDetailedFoodOrders] = useState([]);
  const [detailedServiceOrders, setDetailedServiceOrders] = useState([]);

  // POS Restaurant Invoice integration states & refs
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  const [invoicePrintData, setInvoicePrintData] = useState(null);
  const receiptRef = useRef(null);
  const a4ReceiptRef = useRef(null);

  const handleViewInvoice = async (referenceId) => {
    if (!referenceId) return;
    setIsInvoiceLoading(true);
    try {
      const response = await axiosSecure.get(`/pos/invoice/${referenceId}`);
      if (response.data?.success) {
        setViewingInvoice(response.data.data || response.data.invoice);
      } else {
        Swal.fire("Error", "Could not retrieve POS invoice details.", "error");
      }
    } catch (err) {
      console.error("Error fetching invoice:", err);
      Swal.fire("Error", "Failed to fetch invoice details.", "error");
    } finally {
      setIsInvoiceLoading(false);
    }
  };

  const handlePrintInvoiceAction = (type) => {
    if (!viewingInvoice) return;
    setInvoicePrintData(viewingInvoice);
    setTimeout(() => {
      if (type === "a4" && a4ReceiptRef.current) {
        a4ReceiptRef.current.printReceipt();
      } else if (type === "thermal" && receiptRef.current) {
        receiptRef.current.printReceipt();
      }
    }, 100);
  };

  const {
    printRef: foodServicePrintRef,
    handlePrint: handleFoodServicePrint
  } = useStandardPrint({
    documentTitle: `Food_Service_Summary_${selectedStay?.stayNo || "Report"}`,
    onAfterPrint: () => setFoodServicePrintData(null)
  });

  const {
    printData: customerPrintData,
    setPrintData: setCustomerPrintData,
    printRef: customerPrintRef,
    handlePrint: handleCustomerPrint
  } = useStandardPrint({
    documentTitle: "Customer_Profile",
  });

  // --- Reservations Dashboard State ---
  const [selectedRes, setSelectedRes] = useState(null);
  const [isResDetailModalOpen, setIsResDetailModalOpen] = useState(false);

  // Prepayments and deposits modal
  const [isResPayModalOpen, setIsResPayModalOpen] = useState(false);
  const [paymentsList, setPaymentsList] = useState([]);
  const [resPayFormData, setResPayFormData] = useState({ paymentType: "", amount: "", transactionRef: "", notes: "", receivedBy: "" });

  // Checkin assignment modal
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [checkinAssignments, setCheckinAssignments] = useState([]);

  // Refs/details for Reservations print
  const [company, setCompany] = useState(null);
  const {
    printData: resPrintData,
    setPrintData: setResPrintData,
    printRef: resPrintRef,
    handlePrint: handleResPrint
  } = useStandardPrint({
    documentTitle: "Reservation_Invoice",
  });

  // --- Walk-in Check-In Overlay Modal State ---
  const [isWalkinModalOpen, setIsWalkinModalOpen] = useState(false);
  const [walkinCustomer, setWalkinCustomer] = useState("");
  const [selectedWalkinCust, setSelectedWalkinCust] = useState(null);
  const [walkinExpectedCheckOutDate, setWalkinExpectedCheckOutDate] = useState("");
  const [walkinRooms, setWalkinRooms] = useState([
    { room: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, nights: 1 }
  ]);
  const [walkinInitialPayment, setWalkinInitialPayment] = useState({ paymentType: "", amount: "", transactionRef: "" });
  const [walkinPhoneSearch, setWalkinPhoneSearch] = useState("");
  const [walkinCustSearchLoading, setWalkinCustSearchLoading] = useState(false);
  const [walkinCustSearchResults, setWalkinCustSearchResults] = useState([]);
  const [isWalkinCustModalOpen, setIsWalkinCustModalOpen] = useState(false);
  const [walkinCustToEdit, setWalkinCustToEdit] = useState(null);
  const [isWalkinSubmitting, setIsWalkinSubmitting] = useState(false);
  const [walkinIdempotencyKey, setWalkinIdempotencyKey] = useState("");
  const [newResIdempotencyKey, setNewResIdempotencyKey] = useState("");

  const generateFrontDeskIdempotencyKey = (prefix) => {
    return prefix + "-" + Date.now() + "-" + Math.random().toString(36).substring(2, 15);
  };

  // --- New Reservation Overlay Modal State ---
  const [isNewResModalOpen, setIsNewResModalOpen] = useState(false);
  const [roomTypes, setRoomTypes] = useState([]);
  const [newResFormData, setNewResFormData] = useState({
    customer: "",
    checkInDate: "",
    checkOutDate: "",
    bookingSource: "Walk-in",
    status: "Draft",
    notes: "",
    rooms: [{ roomType: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, room: "", nights: 1 }]
  });
  const [newResPhoneSearch, setNewResPhoneSearch] = useState("");
  const [newResCustSearchLoading, setNewResCustSearchLoading] = useState(false);
  const [newResCustSearchResults, setNewResCustSearchResults] = useState([]);
  const [selectedNewResCust, setSelectedNewResCust] = useState(null);
  const [isNewResCustModalOpen, setIsNewResCustModalOpen] = useState(false);
  const [newResCustToEdit, setNewResCustToEdit] = useState(null);
  const [isNewResSubmitting, setIsNewResSubmitting] = useState(false);

  // Status Modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatusRoom, setSelectedStatusRoom] = useState(null);

  // Month navigation helper
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const getRoomStatusLabel = (status) => {
    switch (status) {
      case "Available":
        return "Free";
      case "Reserved":
        return "Booking";
      case "Occupied":
        return "In House";
      default:
        return status;
    }
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatReservationDateTime = (dateVal, isCheckOut = false) => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    const timeStr = isCheckOut ? settings.checkOutTime || "12:00" : settings.checkInTime || "14:00";
    const [hours, minutes] = timeStr.split(":").map(Number);
    d.setHours(hours || 0, minutes || 0, 0, 0);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  // Calendar setup - Always start 3 days back from reference date, showing 30 days
  const timelineDays = useMemo(() => {
    const days = [];
    const baseDate = new Date(currentDate);
    baseDate.setDate(baseDate.getDate() - 3); // Start 3 days back
    for (let i = 0; i < 30; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const startDateString = useMemo(() => {
    if (timelineDays.length === 0) return "";
    const start = timelineDays[0];
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  }, [timelineDays]);

  const endDateString = useMemo(() => {
    if (timelineDays.length === 0) return "";
    const end = timelineDays[timelineDays.length - 1];
    return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  }, [timelineDays]);

  const daysArray = timelineDays;
  const daysInMonth = 30;

  const fetchTimelineData = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosSecure.get(`/front-desk/timeline?startDate=${startDateString}&endDate=${endDateString}`);
      setRooms(data.rooms || []);
      setReservations(data.reservations || []);
      setStays(data.stays || []);
    } catch (err) {
      console.error("Error loading timeline data:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to load timeline records";
      Swal.fire("Error", `Failed to load timeline records: ${errMsg}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRoomStatus = (room) => {
    const isDark = document.documentElement.classList.contains("dark");
    const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin" || canEdit;

    if (!canPerformAction) {
      Swal.fire({
        title: "Access Denied",
        text: "You do not have permission to modify room statuses.",
        icon: "error",
        background: isDark ? '#1e1e24' : '#ffffff',
        color: isDark ? '#f5f7f5' : '#1a1a24',
      });
      return;
    }

    setSelectedStatusRoom(room);
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedStatusRoom) return;
    const isDark = document.documentElement.classList.contains("dark");
    try {
      await axiosSecure.patch(`/room/status/${selectedStatusRoom._id}`, { status: newStatus });
      Swal.fire({
        title: "Updated!",
        text: `Room ${selectedStatusRoom.roomNumber} status is now ${newStatus}.`,
        icon: "success",
        background: isDark ? '#1e1e24' : '#ffffff',
        color: isDark ? '#f5f7f5' : '#1a1a24',
      });
      setIsStatusModalOpen(false);
      setSelectedStatusRoom(null);
      fetchTimelineData();
    } catch (err) {
      console.error("Error updating room status:", err);
      Swal.fire({
        title: "Error",
        text: err.response?.data?.message || "Failed to update status.",
        icon: "error",
        background: isDark ? '#1e1e24' : '#ffffff',
        color: isDark ? '#f5f7f5' : '#1a1a24',
      });
    }
  };

  useEffect(() => {
    if (currentUser && startDateString && endDateString) {
      fetchTimelineData();
    }
  }, [currentUser, startDateString, endDateString]);

  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        const [foodRes, serviceRes, payRes, foodCatRes, serviceCatRes, roomsRes, companyRes, roomTypesRes, settingsRes] = await Promise.all([
          axiosSecure.get("/food/get?limit=10000"),
          axiosSecure.get("/resort-service/get"),
          axiosSecure.get("/paymenttype"),
          axiosSecure.get("/category"),
          axiosSecure.get("/resort-service-category/get"),
          axiosSecure.get("/room?all=true"),
          axiosSecure.get("/company"),
          axiosSecure.get("/room-type?all=true"),
          axiosSecure.get("/settings/controls")
        ]);
        setFoodMenu(foodRes.data?.data || foodRes.data || []);
        setServices(serviceRes.data?.data || serviceRes.data || []);
        setPaymentTypes(payRes.data || []);
        setFoodCategories(foodCatRes.data || []);
        setServiceCategories(serviceCatRes.data || []);
        setAvailableRooms(roomsRes.data || []);
        setRoomTypes(roomTypesRes.data || []);
        if (companyRes.data && companyRes.data.length > 0) {
          setCompany(companyRes.data[0]);
        }
        if (settingsRes.data) {
          setSettings(settingsRes.data);
        }
      } catch (err) {
        console.error("Error loading timelines prerequisites details:", err);
      }
    };
    if (currentUser) {
      fetchPrerequisites();
    }
  }, [axiosSecure, currentUser]);

  const getDayName = (dateObj) => {
    return dateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  };

  const isToday = (dateObj) => {
    const today = new Date();
    return dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear();
  };

  // Navigate months (shifts reference date by a month)
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Date Scroll Navigation Shifters (Left/Right)
  const handleShiftBackWeek = () => {
    const newD = new Date(currentDate);
    newD.setDate(newD.getDate() - 7);
    setCurrentDate(newD);
  };

  const handleShiftBackDay = () => {
    const newD = new Date(currentDate);
    newD.setDate(newD.getDate() - 1);
    setCurrentDate(newD);
  };

  const handleShiftForwardDay = () => {
    const newD = new Date(currentDate);
    newD.setDate(newD.getDate() + 1);
    setCurrentDate(newD);
  };

  const handleShiftForwardWeek = () => {
    const newD = new Date(currentDate);
    newD.setDate(newD.getDate() + 7);
    setCurrentDate(newD);
  };

  // --- Walk-in Check-In Handlers ---
  const handleWalkinSearchCustomer = async () => {
    if (!walkinPhoneSearch || walkinPhoneSearch.trim().length < 3) {
      Swal.fire("Warning", "Please enter at least 3 digits to search.", "warning");
      return;
    }
    setWalkinCustSearchLoading(true);
    setWalkinCustSearchResults([]);
    try {
      const res = await axiosSecure.get(`/customer/paginated?search=${encodeURIComponent(walkinPhoneSearch)}&limit=5`);
      if (res.data.customers && res.data.customers.length > 0) {
        setWalkinCustSearchResults(res.data.customers);
      } else {
        setWalkinCustSearchResults([]);
        setIsWalkinCustModalOpen(true);
      }
    } catch (e) {
      console.error("Search customer error:", e);
    } finally {
      setWalkinCustSearchLoading(false);
    }
  };

  const selectWalkinCust = (cust) => {
    setSelectedWalkinCust(cust);
    setWalkinCustomer(cust._id);
    setWalkinPhoneSearch(cust.phoneNumber);
    setWalkinCustSearchResults([]);
  };

  const handleWalkinCustomerCreateSuccess = (newCust) => {
    selectWalkinCust(newCust);
  };

  const handleWalkinAddRoomRow = () => {
    setWalkinRooms([...walkinRooms, { room: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, nights: 1 }]);
  };

  const handleWalkinRemoveRoomRow = (index) => {
    const updated = [...walkinRooms];
    updated.splice(index, 1);
    setWalkinRooms(updated);
  };

  const handleWalkinRoomRowChange = (index, field, value) => {
    const updated = [...walkinRooms];
    updated[index][field] = value;

    if (field === "room" || field === "mealPlan") {
      const roomId = updated[index].room;
      const selectedMeal = updated[index].mealPlan || "Room Only";

      if (roomId) {
        const roomObj = availableRooms.find(rm => rm._id === roomId);
        if (roomObj) {
          if (selectedMeal === "Breakfast Included") {
            updated[index].nightlyRate = roomObj.priceWithBreakfast || 0;
          } else if (selectedMeal === "All-Day Food Included") {
            updated[index].nightlyRate = roomObj.priceWithAllDayFood || 0;
          } else {
            updated[index].nightlyRate = roomObj.price || 0;
          }
        }
      }
    }

    if (field === "nights") {
      const maxNights = Math.max(...updated.map(r => r.nights || 1));
      const todayDate = new Date();
      todayDate.setDate(todayDate.getDate() + maxNights);
      setWalkinExpectedCheckOutDate(todayDate.toISOString().split("T")[0]);
    }
    setWalkinRooms(updated);
  };

  const handleWalkInCheckinSubmit = async () => {
    if (isWalkinSubmitting) return;
    if (!canAdd) {
      Swal.fire("Restricted", "You do not have permission to perform check-ins.", "warning");
      return;
    }
    if (!walkinCustomer) {
      Swal.fire("Validation Error", "Please select a customer.", "warning");
      return;
    }
    if (!walkinExpectedCheckOutDate) {
      Swal.fire("Validation Error", "Please provide expected check-out date.", "warning");
      return;
    }

    const todayVal = new Date();
    todayVal.setHours(0, 0, 0, 0);
    const checkoutVal = new Date(walkinExpectedCheckOutDate);
    checkoutVal.setHours(0, 0, 0, 0);
    if (checkoutVal <= todayVal) {
      Swal.fire("Validation Error", "Expected check-out date must be in the future.", "warning");
      return;
    }

    for (let idx = 0; idx < walkinRooms.length; idx++) {
      const r = walkinRooms[idx];
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

    if (walkinInitialPayment.amount !== "") {
      const amt = Number(walkinInitialPayment.amount);
      if (isNaN(amt) || amt <= 0) {
        Swal.fire("Validation Error", "Initial payment amount must be a positive number.", "warning");
        return;
      }
      if (!walkinInitialPayment.paymentType) {
        Swal.fire("Validation Error", "Please select a payment method for the initial payment.", "warning");
        return;
      }
    }

    setIsWalkinSubmitting(true);
    const payload = {
      customer: walkinCustomer,
      rooms: walkinRooms,
      expectedCheckOutDate: walkinExpectedCheckOutDate,
      initialPayment: walkinInitialPayment.amount > 0 ? walkinInitialPayment : null,
      idempotencyKey: walkinIdempotencyKey
    };

    try {
      await axiosSecure.post("/stays", payload);
      setIsWalkinModalOpen(false);
      // Clean up form
      setSelectedWalkinCust(null);
      setWalkinCustomer("");
      setWalkinPhoneSearch("");
      setWalkinExpectedCheckOutDate("");
      setWalkinRooms([{ room: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, nights: 1 }]);
      setWalkinInitialPayment({ paymentType: "", amount: "", transactionRef: "" });
      fetchTimelineData();
      Swal.fire({
        title: "Checked In!",
        text: "Walk-in guest checked in successfully.",
        icon: "success",
        confirmButtonColor: "#346E36"
      });
    } catch (error) {
      Swal.fire("Failed", error.response?.data?.message || "Failed to check-in walk-in guest.", "error");
    } finally {
      setIsWalkinSubmitting(false);
    }
  };

  // --- New Reservation Handlers ---
  const handleNewResSearchCustomer = async () => {
    if (!newResPhoneSearch || newResPhoneSearch.trim().length < 3) {
      Swal.fire("Warning", "Please enter at least 3 digits to search.", "warning");
      return;
    }
    setNewResCustSearchLoading(true);
    setNewResCustSearchResults([]);
    try {
      const res = await axiosSecure.get(`/customer/paginated?search=${encodeURIComponent(newResPhoneSearch)}&limit=5`);
      if (res.data.customers && res.data.customers.length > 0) {
        setNewResCustSearchResults(res.data.customers);
      } else {
        setNewResCustSearchResults([]);
        setIsNewResCustModalOpen(true);
      }
    } catch (e) {
      console.error("Search customer error:", e);
    } finally {
      setNewResCustSearchLoading(false);
    }
  };

  const selectNewResCust = (cust) => {
    setSelectedNewResCust(cust);
    setNewResFormData(prev => ({ ...prev, customer: cust._id }));
    setNewResPhoneSearch(cust.phoneNumber);
    setNewResCustSearchResults([]);
  };

  const handleNewResCustomerCreateSuccess = (newCust) => {
    selectNewResCust(newCust);
  };

  const handleNewResAddRoomRow = () => {
    setNewResFormData({
      ...newResFormData,
      rooms: [...newResFormData.rooms, { roomType: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, room: "", nights: 1 }]
    });
  };

  const handleNewResRemoveRoomRow = (index) => {
    const updated = [...newResFormData.rooms];
    updated.splice(index, 1);
    setNewResFormData({ ...newResFormData, rooms: updated });
  };

  const handleNewResRoomRowChange = (index, field, value) => {
    const updated = [...newResFormData.rooms];
    updated[index][field] = value;

    // Reset room selection when roomType changes, and fetch first room price matching this type
    if (field === "roomType") {
      updated[index].room = ""; // Reset room selection
      if (value) {
        const typeRoom = availableRooms.find(r => r.roomType === value);
        if (typeRoom) {
          const selectedMeal = updated[index].mealPlan || "Room Only";
          if (selectedMeal === "Breakfast Included") {
            updated[index].nightlyRate = typeRoom.priceWithBreakfast || 0;
          } else if (selectedMeal === "All-Day Food Included") {
            updated[index].nightlyRate = typeRoom.priceWithAllDayFood || 0;
          } else {
            updated[index].nightlyRate = typeRoom.price || 0;
          }
        } else {
          updated[index].nightlyRate = 0;
        }
      } else {
        updated[index].nightlyRate = 0;
      }
    }

    if (field === "room" || field === "mealPlan") {
      const roomId = updated[index].room;
      const selectedMeal = updated[index].mealPlan || "Room Only";

      if (roomId) {
        const roomObj = availableRooms.find(r => r._id === roomId);
        if (roomObj) {
          updated[index].roomType = roomObj.roomType;
          if (selectedMeal === "Breakfast Included") {
            updated[index].nightlyRate = roomObj.priceWithBreakfast || 0;
          } else if (selectedMeal === "All-Day Food Included") {
            updated[index].nightlyRate = roomObj.priceWithAllDayFood || 0;
          } else {
            updated[index].nightlyRate = roomObj.price || 0;
          }
        }
      } else if (updated[index].roomType) {
        // Fallback: If no specific room is assigned yet but room type is set, calculate rate based on room type
        const typeRoom = availableRooms.find(r => r.roomType === updated[index].roomType);
        if (typeRoom) {
          if (selectedMeal === "Breakfast Included") {
            updated[index].nightlyRate = typeRoom.priceWithBreakfast || 0;
          } else if (selectedMeal === "All-Day Food Included") {
            updated[index].nightlyRate = typeRoom.priceWithAllDayFood || 0;
          } else {
            updated[index].nightlyRate = typeRoom.price || 0;
          }
        }
      }
    }
    setNewResFormData({ ...newResFormData, rooms: updated });
  };

  const handleNewReservationSubmit = async () => {
    if (isNewResSubmitting) return;
    if (!canAdd) {
      Swal.fire("Restricted", "You do not have permission to create reservations.", "warning");
      return;
    }
    if (!newResFormData.customer) {
      Swal.fire("Validation Error", "Please select a customer.", "warning");
      return;
    }
    if (!newResFormData.checkInDate || !newResFormData.checkOutDate) {
      Swal.fire("Validation Error", "Please select check-in and check-out dates.", "warning");
      return;
    }
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const checkIn = new Date(newResFormData.checkInDate);
    checkIn.setHours(0, 0, 0, 0);

    if (checkIn < todayLocal) {
      Swal.fire("Validation Error", "Check-in date cannot be in the past.", "warning");
      return;
    }
    if (checkIn >= new Date(newResFormData.checkOutDate)) {
      Swal.fire("Validation Error", "Check-out date must be after check-in date.", "warning");
      return;
    }
    if (newResFormData.rooms.length === 0) {
      Swal.fire("Validation Error", "Please add at least one room.", "warning");
      return;
    }
    for (let idx = 0; idx < newResFormData.rooms.length; idx++) {
      const r = newResFormData.rooms[idx];
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

    setIsNewResSubmitting(true);
    const processedRooms = newResFormData.rooms.map(r => ({
      ...r,
      room: r.room === "" ? null : r.room
    }));
    const payload = {
      ...newResFormData,
      rooms: processedRooms,
      idempotencyKey: newResIdempotencyKey
    };

    try {
      const { data: newRes } = await axiosSecure.post("/reservations", payload);
      setIsNewResModalOpen(false);
      // Clean up form
      setSelectedNewResCust(null);
      setNewResPhoneSearch("");
      setNewResFormData({
        customer: "",
        checkInDate: "",
        checkOutDate: "",
        bookingSource: "Walk-in",
        status: "Draft",
        notes: "",
        rooms: [{ roomType: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, room: "", nights: 1 }]
      });
      fetchTimelineData();

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
          setSelectedRes(newRes);
          openResPaymentsModal(newRes);
        }
      });
    } catch (error) {
      Swal.fire("Failed", error.response?.data?.message || "Failed to save reservation.", "error");
    } finally {
      setIsNewResSubmitting(false);
    }
  };

  // Group rooms by room type
  const roomsByType = rooms.reduce((acc, r) => {
    if (!acc[r.roomType]) acc[r.roomType] = [];
    acc[r.roomType].push(r);
    return acc;
  }, {});

  const getBookingAtCell = (roomId, dateObj) => {
    const targetDate = new Date(dateObj);
    targetDate.setHours(0, 0, 0, 0);

    // 1. Check Stays
    const activeStay = stays.find(s => {
      return s.rooms.some(sr => {
        if (sr.room?._id === roomId || sr.room === roomId) {
          const checkin = new Date(s.checkInDate);
          checkin.setHours(0, 0, 0, 0);
          const checkout = s.actualCheckOutDate ? new Date(s.actualCheckOutDate) : new Date(s.expectedCheckOutDate);
          checkout.setHours(0, 0, 0, 0);

          return targetDate >= checkin && targetDate < checkout;
        }
        return false;
      });
    });
    if (activeStay) return { type: "stay", data: activeStay };

    // 2. Check Reservations
    const activeRes = reservations.find(r => {
      return r.rooms.some(rr => {
        if (rr.room?._id === roomId || rr.room === roomId || rr.roomNo === roomId) {
          const checkin = new Date(r.checkInDate);
          checkin.setHours(0, 0, 0, 0);
          const checkout = new Date(r.checkOutDate);
          checkout.setHours(0, 0, 0, 0);

          return targetDate >= checkin && targetDate < checkout;
        }
        return false;
      });
    });
    if (activeRes) return { type: "res", data: activeRes };

    return null;
  };



  // Stays operations
  const fetchFolio = async (stayId) => {
    setIsFolioLoading(true);
    try {
      const { data } = await axiosSecure.get(`/stays/${stayId}/folio`);
      setFolioEntries(data || []);
    } catch (err) {
      console.error("Failed to load folio ledger:", err);
    } finally {
      setIsFolioLoading(false);
    }
  };

  const handlePrintFoodServiceSummary = async (stayObj = selectedStay) => {
    if (!stayObj) return;
    try {
      Swal.fire({
        title: "Loading summary...",
        text: "Please wait while we retrieve the details.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      const [foodRes, serviceRes] = await Promise.all([
        axiosSecure.get(`/stays/${stayObj._id}/food-order`),
        axiosSecure.get(`/stays/${stayObj._id}/service-order`)
      ]);
      setDetailedFoodOrders(foodRes.data || []);
      setDetailedServiceOrders(serviceRes.data || []);
      setFoodServicePrintData(stayObj);
      Swal.close();

      setTimeout(() => {
        handleFoodServicePrint();
      }, 300);
    } catch (err) {
      Swal.close();
      Swal.fire("Error", "Failed to retrieve food and service order details.", "error");
    }
  };

  const handlePostFoodOrder = async () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to modify active stay folios.", "warning");
      return;
    }
    if (isPosting) return;
    if (!foodFormData.foodItem || !foodFormData.quantity) {
      Swal.fire("Error", "Please select food item and quantity.", "warning");
      return;
    }
    setIsPosting(true);
    try {
      await axiosSecure.post(`/stays/${selectedStay._id}/food-order`, {
        items: [{ foodItem: foodFormData.foodItem, quantity: Number(foodFormData.quantity) }],
        isChargeable: foodFormData.isChargeable
      });
      await fetchFolio(selectedStay._id);
      setIsFoodModalOpen(false);
      setFoodFormData({ foodItem: "", quantity: 1, isChargeable: true });
      setSelectedFoodCategory("");
      fetchTimelineData();
      Swal.fire("Food Posted", "Food charge added to guest folio ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post food charge", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostService = async () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to modify active stay folios.", "warning");
      return;
    }
    if (isPosting) return;
    if (!serviceFormData.serviceId) {
      Swal.fire("Error", "Please select a service.", "warning");
      return;
    }
    setIsPosting(true);
    try {
      await axiosSecure.post(`/stays/${selectedStay._id}/service-order`, {
        serviceId: serviceFormData.serviceId,
        isChargeable: serviceFormData.isChargeable
      });
      await fetchFolio(selectedStay._id);
      setIsServiceModalOpen(false);
      setServiceFormData({ serviceId: "", isChargeable: true });
      setSelectedServiceCategory("");
      fetchTimelineData();
      Swal.fire("Service Posted", "Service charge added to guest folio ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post service charge", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostPayment = async () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to modify active stay folios.", "warning");
      return;
    }
    if (isPosting) return;
    if (!paymentFormData.paymentType || !paymentFormData.amount || isNaN(paymentFormData.amount) || Number(paymentFormData.amount) <= 0) {
      Swal.fire("Error", "Please fill in payment type and positive amount.", "warning");
      return;
    }
    setIsPosting(true);
    try {
      const notesPart = paymentFormData.notes ? ` (${paymentFormData.notes})` : "";
      await axiosSecure.post(`/stays/${selectedStay._id}/folio`, {
        type: "Payment",
        description: `Direct Payment (${paymentFormData.paymentType}) - Ref: ${paymentFormData.transactionRef || "N/A"}${notesPart}`,
        debit: 0,
        credit: Number(paymentFormData.amount)
      });
      await fetchFolio(selectedStay._id);
      setIsPaymentModalOpen(false);
      setPaymentFormData({ paymentType: "", amount: "", transactionRef: "", notes: "" });
      fetchTimelineData();
      Swal.fire("Payment Recorded", "Payment credited to guest ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post payment", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostDiscount = async () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to modify active stay folios.", "warning");
      return;
    }
    if (isPosting) return;
    if (!discountFormData.discountType || !discountFormData.value || isNaN(discountFormData.value) || Number(discountFormData.value) <= 0 || !discountFormData.applyTo) {
      Swal.fire("Error", "Please fill in discount type, positive value, and discount target.", "warning");
      return;
    }
    setIsPosting(true);
    try {
      await axiosSecure.post(`/stays/${selectedStay._id}/discount`, {
        discountType: discountFormData.discountType,
        value: Number(discountFormData.value),
        applyTo: discountFormData.applyTo,
        reason: discountFormData.reason
      });
      await fetchFolio(selectedStay._id);
      setIsDiscountModalOpen(false);
      setDiscountFormData({ discountType: "percentage", value: "", applyTo: "all", reason: "" });
      fetchTimelineData();
      Swal.fire("Discount Posted", "Discount adjustment credited to guest ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post discount", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleExtendStay = async () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to modify active stay folios.", "warning");
      return;
    }
    if (isPosting) return;
    if (!extendFormData.newCheckOutDate) {
      Swal.fire("Error", "Please select a check-out date.", "warning");
      return;
    }
    setIsPosting(true);
    try {
      const { data } = await axiosSecure.post(`/stays/${selectedStay._id}/extend`, {
        newCheckOutDate: extendFormData.newCheckOutDate,
        roomAssignments: extendFormData.roomAssignments.map(ra => ({
          oldRoomId: ra.oldRoomId,
          newRoomId: ra.newRoomId
        }))
      });
      setSelectedStay(data);
      await fetchFolio(selectedStay._id);
      setIsExtendModalOpen(false);
      setExtendFormData({ newCheckOutDate: "", roomAssignments: [] });
      fetchTimelineData();
      Swal.fire("Stay Extended", "Stay extended and additional night charges posted.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to extend stay", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleAdjustCheckout = async () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to modify active stay folios.", "warning");
      return;
    }
    if (isPosting) return;
    if (!adjustCheckoutFormData.newCheckOutDate) {
      Swal.fire("Error", "Please select a new check-out date.", "warning");
      return;
    }
    if (adjustCheckoutFormData.adjustmentType !== "none" && (!adjustCheckoutFormData.adjustmentAmount || adjustCheckoutFormData.adjustmentAmount <= 0)) {
      Swal.fire("Error", "Please enter a valid positive adjustment amount.", "warning");
      return;
    }

    setIsPosting(true);
    try {
      const { data } = await axiosSecure.post(`/stays/${selectedStay._id}/adjust-checkout`, {
        newCheckOutDate: adjustCheckoutFormData.newCheckOutDate,
        adjustmentType: adjustCheckoutFormData.adjustmentType,
        adjustmentAmount: Number(adjustCheckoutFormData.adjustmentAmount || 0),
        reason: adjustCheckoutFormData.reason
      });
      setSelectedStay(data);
      await fetchFolio(selectedStay._id);
      setIsAdjustCheckoutModalOpen(false);
      setAdjustCheckoutFormData({ newCheckOutDate: "", adjustmentType: "none", adjustmentAmount: 0, reason: "" });
      fetchTimelineData();
      Swal.fire("Stay Adjusted", "Stay check-out date and ledger balance successfully updated.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to adjust stay", "error");
    } finally {
      setIsPosting(false);
    }
  };


  const handleCheckoutGuest = async () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to perform check-outs.", "warning");
      return;
    }
    if (isPosting) return;
    const checkPaymentList = [];
    if (checkoutPayment.amount > 0) {
      if (!checkoutPayment.paymentType) {
        Swal.fire("Error", "Please select payment method for the settlement payment.", "warning");
        return;
      }
      checkPaymentList.push(checkoutPayment);
    }
    setIsPosting(true);
    try {
      await axiosSecure.post(`/stays/${selectedStay._id}/checkout`, {
        payments: checkPaymentList,
        makeRoomsAvailable
      });

      // Fetch latest folio entries to reflect checkout settlement payment on the final printed bill
      await fetchFolio(selectedStay._id);

      Swal.fire({
        title: "Checked Out",
        text: "Guest stay checkout finalized. Room status changed to cleaning. The final bill will now print.",
        icon: "success",
        confirmButtonText: "OK"
      }).then(() => {
        setFolioPrintData(selectedStay);
        setIsCheckoutModalOpen(false);
        setSelectedStay(null);
        setSelectedBlock(null);
        setCheckoutPayment({ paymentType: "", amount: "", transactionRef: "" });
        fetchTimelineData();
      });
    } catch (err) {
      Swal.fire("Failed Checkout", err.response?.data?.message || "Failed to checkout guest.", "error");
    } finally {
      setIsPosting(false);
    }
  };

  // Folio calculations
  const totalDebit = folioEntries.reduce((acc, entry) => acc + (entry.debit || 0), 0);
  const totalCredit = folioEntries.reduce((acc, entry) => acc + (entry.credit || 0), 0);
  const outstandingDue = totalDebit - totalCredit;

  // Export stays folio
  const handleExportFolioExcel = () => {
    if (!selectedStay || folioEntries.length === 0) return;
    const formatted = folioEntries.map((row, idx) => ({
      "Sl": idx + 1,
      "Date": new Date(row.date).toLocaleDateString("en-GB"),
      "Description": row.description,
      "Type": row.type,
      "Debit (Charges)": row.debit > 0 ? row.debit : 0,
      "Credit (Payments/Discounts)": row.credit > 0 ? row.credit : 0,
    }));
    formatted.push({
      "Sl": "",
      "Date": "TOTALS",
      "Description": `Outstanding Due: ৳${outstandingDue.toFixed(2)}`,
      "Type": "",
      "Debit (Charges)": totalDebit,
      "Credit (Payments/Discounts)": totalCredit,
    });
    exportToExcel(formatted, `Folio_Ledger_${selectedStay.stayNo}`);
  };

  const handleExportFolioCsv = () => {
    if (!selectedStay || folioEntries.length === 0) return;
    const formatted = folioEntries.map((row, idx) => ({
      "Sl": idx + 1,
      "Date": new Date(row.date).toLocaleDateString("en-GB"),
      "Description": row.description,
      "Type": row.type,
      "Debit (Charges)": row.debit > 0 ? row.debit : 0,
      "Credit (Payments/Discounts)": row.credit > 0 ? row.credit : 0,
    }));
    formatted.push({
      "Sl": "",
      "Date": "TOTALS",
      "Description": `Outstanding Due: ৳${outstandingDue.toFixed(2)}`,
      "Type": "",
      "Debit (Charges)": totalDebit,
      "Credit (Payments/Discounts)": totalCredit,
    });
    exportToCsv(formatted, `Folio_Ledger_${selectedStay.stayNo}`);
  };

  // Reservations operations
  const fetchResPayments = async (resId) => {
    try {
      const { data } = await axiosSecure.get(`/reservations/${resId}/payments`);
      setPaymentsList(data || []);
    } catch (err) {
      console.error("Failed to fetch res payments:", err);
    }
  };

  const openResPaymentsModal = async (res) => {
    setResPayFormData({ paymentType: "", amount: "", transactionRef: "", notes: "", receivedBy: "" });
    await fetchResPayments(res._id);
    setIsResPayModalOpen(true);
  };

  const handleAddResPayment = async () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to manage reservation payments.", "warning");
      return;
    }
    if (!resPayFormData.paymentType || !resPayFormData.amount || isNaN(resPayFormData.amount) || Number(resPayFormData.amount) === 0) {
      Swal.fire("Validation Error", "Please provide payment type and non-zero amount.", "warning");
      return;
    }
    try {
      await axiosSecure.post(`/reservations/${selectedRes._id}/payments`, resPayFormData);
      await fetchResPayments(selectedRes._id);
      setResPayFormData({ paymentType: "", amount: "", transactionRef: "", notes: "", receivedBy: "" });

      // Update selectedRes with latest financial info if needed
      const resVal = await axiosSecure.get(`/reservations/${selectedRes._id}`);
      setSelectedRes(resVal.data);

      fetchTimelineData();
      Swal.fire("Success", "Payment/deposit recorded.", "success");
    } catch (error) {
      Swal.fire("Failed", error.response?.data?.message || "Failed to record payment.", "error");
    }
  };

  const handleCancelReservation = async (res) => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to cancel reservations.", "warning");
      return;
    }
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
        setIsResDetailModalOpen(false);
        setSelectedRes(null);
        setSelectedBlock(null);
        Swal.fire("Cancelled", "The reservation has been cancelled successfully.", "success");
        fetchTimelineData();
      } catch (err) {
        Swal.fire("Error", err.response?.data?.message || "Failed to cancel reservation.", "error");
      }
    }
  };

  const handleQuickRefund = async (res, refundAmt) => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to log refunds.", "warning");
      return;
    }
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
          amount: -Number(refundAmt),
          transactionRef: formValues.ref || "",
          notes: `Refund for cancelled booking ${res.reservationNo}`,
          receivedBy: formValues.receiver
        };
        await axiosSecure.post(`/reservations/${res._id}/payments`, payload);

        // Update selectedRes with latest info
        const resVal = await axiosSecure.get(`/reservations/${selectedRes._id}`);
        setSelectedRes(resVal.data);

        fetchTimelineData();
        Swal.fire("Refund Logged", `Refund payout of ৳${refundAmt} recorded.`, "success");
      } catch (err) {
        Swal.fire("Error", err.response?.data?.message || "Failed to log refund.", "error");
      }
    }
  };

  const openCheckinModal = (res) => {
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
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to check-in reservations.", "warning");
      return;
    }
    for (const a of checkinAssignments) {
      if (!a.roomId) {
        Swal.fire("Validation Error", "Please assign a specific room for all entries.", "warning");
        return;
      }
    }
    try {
      await axiosSecure.post(`/reservations/${selectedRes._id}/convert`, {
        roomAssignments: checkinAssignments
      });
      setIsCheckinModalOpen(false);
      setIsResDetailModalOpen(false);
      setSelectedRes(null);
      setSelectedBlock(null);
      fetchTimelineData();
      Swal.fire("Checked In", `Stay records and ledger initialized.`, "success");
    } catch (error) {
      Swal.fire("Check-in Failed", error.response?.data?.message || "Failed to perform check-in.", "error");
    }
  };

  // Open detail popup (click on Timeline Stay/Res block)
  const handleBlockClick = async (e, block) => {
    e.stopPropagation();
    setSelectedBlock(block);
    if (block.type === "stay") {
      setSelectedStay(block.data);
      await fetchFolio(block.data._id);
    } else if (block.type === "res") {
      setSelectedRes(block.data);
      setIsResDetailModalOpen(true);
    }
  };

  // Grid Empty cell click (create check-in or reservation)
  const handleEmptyCellClick = (room, dateObj) => {
    if (!canAdd) {
      Swal.fire("Restricted", "You do not have permission to check-in or book reservations.", "warning");
      return;
    }
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    const selectedDate = `${y}-${m}-${d}`;
    Swal.fire({
      title: `Empty Slot - Room ${room.roomNumber}`,
      text: `Would you like to record an entry starting on ${selectedDate}?`,
      icon: "info",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Walk-In Check-In",
      denyButtonText: "Pre-Booking Reservation",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
      denyButtonColor: "#3b82f6"
    }).then((result) => {
      if (result.isConfirmed) {
        // Prefill Walk-in modal
        setWalkinRooms([{ room: room._id, mealPlan: "Room Only", nightlyRate: room.price || 0, adults: 1, children: 0, nights: 1 }]);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setWalkinExpectedCheckOutDate(tomorrow.toISOString().split("T")[0]);

        setSelectedWalkinCust(null);
        setWalkinCustomer("");
        setWalkinPhoneSearch("");
        setWalkinCustSearchResults([]);
        setWalkinIdempotencyKey(generateFrontDeskIdempotencyKey("walkin"));
        setIsWalkinModalOpen(true);
      } else if (result.isDenied) {
        // Prefill Reservation modal
        const checkOut = new Date(dateObj);
        checkOut.setDate(checkOut.getDate() + 1);
        const checkOutStr = `${checkOut.getFullYear()}-${String(checkOut.getMonth() + 1).padStart(2, "0")}-${String(checkOut.getDate()).padStart(2, "0")}`;

        setNewResFormData({
          customer: "",
          checkInDate: selectedDate,
          checkOutDate: checkOutStr,
          bookingSource: "Walk-in",
          status: "Draft",
          notes: "",
          rooms: [{ roomType: room.roomType, mealPlan: "Room Only", nightlyRate: room.price || 0, adults: 1, children: 0, room: room._id, nights: 1 }]
        });

        setSelectedNewResCust(null);
        setNewResPhoneSearch("");
        setNewResCustSearchResults([]);
        setNewResIdempotencyKey(generateFrontDeskIdempotencyKey("newres"));
        setIsNewResModalOpen(true);
      }
    });
  };

  if (!mounted) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center bg-brand-offwhite dark:bg-brand-charcoal">
        <span className="loading loading-spinner loading-lg text-brand-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="Front Desk Timeline"
        subtitle="Visual room allocation ledger calendar. Check reservations and active stayed guests."
      />

      {/* Month Navigation & Action Controls */}
      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="btn btn-sm btn-circle btn-ghost text-brand-primary">
            <FiChevronLeft size={20} />
          </button>
          <span className="font-extrabold text-base uppercase tracking-wider text-brand-primary min-w-[150px] text-center">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button onClick={handleNextMonth} className="btn btn-sm btn-circle btn-ghost text-brand-primary">
            <FiChevronRight size={20} />
          </button>
          <button onClick={handleToday} className="btn btn-xs btn-outline border-brand-primary text-brand-primary rounded-full px-4 ml-4">
            Today
          </button>

          {/* Date Scroll Shifters left to right / right to left */}
          <div className="join border border-brand-beige/50 rounded-full ml-4 overflow-hidden bg-brand-offwhite/50 dark:bg-brand-charcoal/30">
            <button onClick={handleShiftBackWeek} className="btn btn-xs btn-ghost join-item px-2.5 font-bold uppercase text-[9px]" title="Back 7 Days">« Week</button>
            <button onClick={handleShiftBackDay} className="btn btn-xs btn-ghost join-item px-2.5 font-bold uppercase text-[9px]" title="Back 1 Day">‹ Day</button>
            <button onClick={handleShiftForwardDay} className="btn btn-xs btn-ghost join-item px-2.5 font-bold uppercase text-[9px]" title="Forward 1 Day">Day ›</button>
            <button onClick={handleShiftForwardWeek} className="btn btn-xs btn-ghost join-item px-2.5 font-bold uppercase text-[9px]" title="Forward 7 Days">Week »</button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 mr-4">
            <span className="w-3.5 h-3.5 rounded bg-blue-100 dark:bg-blue-900 border border-blue-300 block"></span>
            <span className="font-bold text-brand-sage">Reservation</span>
            <span className="w-3.5 h-3.5 rounded bg-green-100 dark:bg-green-900 border border-green-300 block ml-3"></span>
            <span className="font-bold text-brand-sage">In House</span>
            <span className="w-3.5 h-3.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 block ml-3"></span>
            <span className="font-bold text-brand-sage">Checked Out</span>
          </div>

          {canAdd && (
            <button
              onClick={() => {
                setNewResFormData({
                  customer: "",
                  checkInDate: new Date().toISOString().split("T")[0],
                  checkOutDate: (() => {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    return tom.toISOString().split("T")[0];
                  })(),
                  bookingSource: "Walk-in",
                  status: "Draft",
                  notes: "",
                  rooms: [{ roomType: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, room: "", nights: 1 }]
                });
                setSelectedNewResCust(null);
                setNewResPhoneSearch("");
                setNewResCustSearchResults([]);
                setNewResIdempotencyKey(generateFrontDeskIdempotencyKey("newres"));
                setIsNewResModalOpen(true);
              }}
              className="btn bg-blue-600 hover:bg-blue-700 text-white border-none btn-sm rounded-full shadow gap-2 px-5 mr-2"
            >
              <FiPlus />
              <span className="uppercase tracking-widest text-[10px] font-bold">New Reservation</span>
            </button>
          )}

          {canAdd && (
            <button
              onClick={() => {
                setWalkinRooms([{ room: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, nights: 1 }]);
                const tom = new Date();
                tom.setDate(tom.getDate() + 1);
                setWalkinExpectedCheckOutDate(tom.toISOString().split("T")[0]);
                setSelectedWalkinCust(null);
                setWalkinCustomer("");
                setWalkinPhoneSearch("");
                setWalkinCustSearchResults([]);
                setWalkinIdempotencyKey(generateFrontDeskIdempotencyKey("walkin"));
                setIsWalkinModalOpen(true);
              }}
              className="btn bg-brand-primary hover:bg-brand-secondary text-white border-none btn-sm rounded-full shadow gap-2 px-5"
            >
              <FiPlus />
              <span className="uppercase tracking-widest text-[10px] font-bold">Check-In</span>
            </button>
          )}
        </div>
      </div>

      {/* Timeline Grid Table Container */}
      <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <MtableLoading />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-fixed border-collapse w-full min-w-[1000px]">
              <thead className="bg-brand-primary text-white text-[9px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="w-[180px] p-3 text-left sticky left-0 bg-brand-primary border-r border-white/10 z-10">Rooms</th>
                  {daysArray.map(day => {
                    const isTodayCol = isToday(day);
                    return (
                      <th
                        key={day.toISOString()}
                        className={`p-2 text-center border-r border-white/10 w-[45px] ${isTodayCol ? "bg-brand-secondary/90" : ""}`}
                      >
                        <div>{getDayName(day)}</div>
                        <div className="text-xs font-black">{String(day.getDate()).padStart(2, "0")}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.keys(roomsByType).length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="text-center py-20 text-brand-sage text-xs uppercase tracking-widest font-bold">
                      No rooms configured.
                    </td>
                  </tr>
                ) : (
                  Object.keys(roomsByType).map(roomTypeName => (
                    <React.Fragment key={roomTypeName}>
                      {/* Room Type Divider Header Row */}
                      <tr className="bg-brand-offwhite/40 dark:bg-brand-charcoal/45">
                        <td colSpan={daysInMonth + 1} className="p-3 text-[10px] font-black uppercase tracking-widest text-brand-primary border-b border-brand-beige/25 sticky left-0">
                          ✦ {roomTypeName}
                        </td>
                      </tr>
                      {/* Rooms in Type */}
                      {roomsByType[roomTypeName].map(room => (
                        <tr key={room._id} className="border-b border-brand-beige/10 hover:bg-brand-offwhite/10 transition-colors">
                          {/* Room identifier sticky column */}
                          <td
                            onClick={() => handleToggleRoomStatus(room)}
                            className="p-3 font-bold text-sm bg-white dark:bg-brand-charcoal sticky left-0 border-r border-brand-beige/15 shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10 cursor-pointer hover:bg-brand-offwhite/30 dark:hover:bg-brand-offwhite/5 group transition-colors"
                            title="Click to update room status"
                          >
                            <div className="group-hover:text-brand-primary transition-colors">{room.roomNumber}</div>
                            <div className="text-[9px] font-normal text-brand-sage uppercase group-hover:scale-105 transition-transform origin-left">{room.status}</div>
                          </td>

                          {/* Dynamic calendar cells layout */}
                          {(() => {
                            const cells = [];
                            let i = 0;
                            while (i < daysInMonth) {
                              const dateObj = daysArray[i];
                              const block = getBookingAtCell(room._id, dateObj);

                              if (block) {
                                // Calculate how many columns this booking spans starting from i
                                const checkin = new Date(block.data.checkInDate);
                                checkin.setHours(0, 0, 0, 0);
                                const checkout = block.type === "stay"
                                  ? (block.data.actualCheckOutDate ? new Date(block.data.actualCheckOutDate) : new Date(block.data.expectedCheckOutDate))
                                  : new Date(block.data.checkOutDate);
                                checkout.setHours(0, 0, 0, 0);

                                let span = 0;
                                while (i + span < daysInMonth) {
                                  const nextDate = daysArray[i + span];
                                  const nextDateZero = new Date(nextDate);
                                  nextDateZero.setHours(0, 0, 0, 0);
                                  if (nextDateZero >= checkin && nextDateZero < checkout) {
                                    span++;
                                  } else {
                                    break;
                                  }
                                }
                                span = Math.max(1, span);

                                // Style definitions
                                const isStay = block.type === "stay";
                                const isCheckedOut = isStay && block.data.status === "Checked Out";
                                const bgStyle = isCheckedOut
                                  ? "bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-800"
                                  : isStay
                                    ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800"
                                    : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800";

                                cells.push(
                                  <td
                                    key={`block-${room._id}-${i}`}
                                    colSpan={span}
                                    className="p-1 border-r border-brand-beige/10 align-middle"
                                    onClick={(e) => handleBlockClick(e, block)}
                                  >
                                    <div className={`p-1.5 rounded-lg border text-[10px] font-bold truncate cursor-pointer shadow-sm hover:brightness-95 transition-all text-center uppercase tracking-wider ${bgStyle}`}>
                                      {isCheckedOut ? "Out" : isStay ? "Stay" : "Res"}: {block.data.customer?.fullName || "Guest"}
                                    </div>
                                  </td>
                                );

                                i += span; // skip days filled by this span
                              } else {
                                const dateVal = dateObj;
                                const isCellToday = isToday(dateVal);
                                cells.push(
                                  <td
                                    key={`cell-${room._id}-${i}`}
                                    className={`p-2 border-r border-brand-beige/10 text-center align-middle hover:bg-brand-primary/10 cursor-pointer ${isCellToday ? "bg-brand-secondary/15" : ""}`}
                                    onClick={() => handleEmptyCellClick(room, dateVal)}
                                  >
                                    <div className="w-2.5 h-2.5 rounded bg-gray-200 dark:bg-brand-charcoal/30 mx-auto hover:scale-125 transition-transform"></div>
                                  </td>
                                );
                                i++;
                              }
                            }
                            return cells;
                          })()}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Stay Folio Ledger Modal */}
      {selectedStay && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-4xl rounded-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <div>
                <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">Folio Ledger</h3>
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest font-mono">Guest Stay: {selectedStay.stayNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <ExportButtons
                  onExportExcel={handleExportFolioExcel}
                  onExportCsv={handleExportFolioCsv}
                  onPrint={() => setFolioPrintData(selectedStay)}
                  isLoading={false}
                />
                <button
                  onClick={() => handlePrintFoodServiceSummary(selectedStay)}
                  className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none rounded px-3 h-7 flex items-center gap-1 shadow-sm uppercase tracking-widest font-bold text-[9px] cursor-pointer"
                  title="Print Food & Service Summary"
                >
                  <FiPrinter size={11} /> Food & Service Print
                </button>
                <button
                  onClick={() => setFinalInvoiceRes(selectedStay)}
                  className="btn btn-xs bg-[#1e293b] hover:bg-[#1e293b]/90 text-white border-none rounded px-3 h-7 flex items-center gap-1 shadow-sm uppercase tracking-widest font-bold text-[9px] cursor-pointer"
                  title="Print Final Invoice"
                >
                  <FiPrinter size={11} /> Final Invoice
                </button>
                <button
                  onClick={() => {
                    setSelectedStay(null);
                    setSelectedBlock(null);
                  }}
                  className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige dark:hover:bg-brand-offwhite/10"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Guest metadata short-block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-brand-offwhite dark:bg-brand-charcoal/45 p-4 rounded-xl">
                <div>
                  <span className="text-brand-sage">Customer:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-sm text-brand-charcoal dark:text-brand-offwhite">{selectedStay.customer?.fullName}</span>
                    <button
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="btn btn-xs btn-outline border-brand-primary text-brand-primary rounded-full px-3 hover:bg-brand-primary hover:text-white transition-all duration-200 cursor-pointer font-bold text-[10px]"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-brand-sage">Assigned Room(s):</span>
                  <div className="font-bold font-mono mt-1 text-brand-charcoal dark:text-brand-offwhite">
                    {selectedStay.rooms?.map(r => r.room?.roomNumber).join(", ") || "N/A"}
                  </div>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-brand-beige/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-bold">
                  <div>
                    <span className="text-brand-sage text-[9px] uppercase tracking-wider block">Checked In:</span>
                    <span className="text-brand-charcoal dark:text-brand-offwhite">{formatDateTime(selectedStay.checkInDate)}</span>
                  </div>
                  <div>
                    <span className="text-brand-sage text-[9px] uppercase tracking-wider block">Expected/Actual Check-Out:</span>
                    <span className="text-brand-charcoal dark:text-brand-offwhite">
                      {selectedStay.actualCheckOutDate ? formatDateTime(selectedStay.actualCheckOutDate) : formatDateTime(selectedStay.expectedCheckOutDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Folio Ledger Entries List */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block">Account Entries</span>
                {isFolioLoading ? (
                  <MtableLoading />
                ) : (
                  <div className="overflow-x-auto border border-brand-beige/40 dark:border-brand-beige/10 rounded-xl p-2 max-h-[30vh]">
                    {folioEntries.length === 0 ? (
                      <div className="p-6 text-center text-xs font-bold text-brand-sage uppercase tracking-widest">No ledger transactions posted.</div>
                    ) : (
                      <table className="table w-full text-xs">
                        <thead className="text-[9px] uppercase tracking-wider text-brand-sage border-b border-brand-beige/10">
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th className="text-right">Debit (+)</th>
                            <th className="text-right">Credit (-)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {folioEntries.map(entry => (
                            <tr key={entry._id} className="border-b border-brand-beige/10 last:border-none text-brand-charcoal dark:text-brand-offwhite">
                              <td className="text-brand-sage text-[10px]">{formatDateTime(entry.date)}</td>
                              <td className="font-bold">
                                {entry.referenceId && (entry.type === "Food Charge" || entry.description.includes("Invoice")) ? (
                                  <button
                                    onClick={() => handleViewInvoice(entry.referenceId)}
                                    className="text-brand-primary hover:text-brand-secondary dark:text-brand-sage dark:hover:text-brand-sage/80 underline text-left font-bold cursor-pointer flex items-center gap-1 bg-transparent border-none p-0"
                                    title="Click to view detailed POS invoice and print"
                                  >
                                    <FiFileText className="flex-shrink-0" /> {entry.description}
                                  </button>
                                ) : (
                                  entry.description
                                )}
                              </td>
                              <td className="text-right font-bold text-red-600">{entry.debit > 0 ? `৳${entry.debit}` : "-"}</td>
                              <td className="text-right font-bold text-green-600">{entry.credit > 0 ? `৳${entry.credit}` : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>

              {/* Running balance block */}
              <div className="flex justify-between items-center p-4 bg-brand-secondary/5 border-l-4 border-brand-secondary rounded-r-xl">
                <div>
                  <span className="text-[9px] font-bold text-brand-sage uppercase tracking-widest block">Ledger Balance</span>
                  <span className="text-base font-extrabold text-brand-secondary">Due: ৳{outstandingDue.toFixed(2)}</span>
                </div>
                <div className="text-right text-xs text-brand-sage font-bold">
                  <div>Charges (Debit): ৳{totalDebit.toFixed(2)}</div>
                  <div>Credits: ৳{totalCredit.toFixed(2)}</div>
                </div>
              </div>

              {/* Folio postings & Action buttons */}
              {selectedStay.status !== "Checked Out" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <button onClick={() => setIsFoodModalOpen(true)} className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2">
                    <MdRestaurant /> Post Food
                  </button>
                  <button onClick={() => setIsServiceModalOpen(true)} className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2">
                    <FiBriefcase /> Post Service
                  </button>
                  <button onClick={() => setIsPaymentModalOpen(true)} className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2">
                    <FiDollarSign /> Post Payment
                  </button>
                  <button onClick={() => setIsDiscountModalOpen(true)} className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2">
                    <span>৳</span> Post Discount
                  </button>
                  <button
                    onClick={() => {
                      setExtendFormData({
                        newCheckOutDate: "",
                        roomAssignments: selectedStay.rooms.map(r => ({
                          oldRoomId: r.room?._id || r.room,
                          newRoomId: r.room?._id || r.room,
                          roomNumber: r.room?.roomNumber,
                          roomType: r.room?.roomType
                        }))
                      });
                      setIsExtendModalOpen(true);
                    }}
                    className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2 sm:col-span-1"
                  >
                    <FiClock /> Extend Stay
                  </button>
                  <button
                    onClick={() => {
                      setAdjustCheckoutFormData({
                        newCheckOutDate: selectedStay.expectedCheckOutDate ? new Date(selectedStay.expectedCheckOutDate).toISOString().split("T")[0] : "",
                        adjustmentType: "none",
                        adjustmentAmount: 0,
                        reason: ""
                      });
                      setIsAdjustCheckoutModalOpen(true);
                    }}
                    className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2 sm:col-span-1"
                  >
                    <FiEdit /> Adjust Check-out
                  </button>
                  <button
                    onClick={() => {
                      setCheckoutPayment({ paymentType: "", amount: outstandingDue > 0 ? outstandingDue : "", transactionRef: "" });
                      setMakeRoomsAvailable(false);
                      setIsCheckoutModalOpen(true);
                    }}
                    className="btn btn-sm bg-brand-primary text-white border-none w-full sm:col-span-2 rounded-full cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow"
                  >
                    Checkout Guest <FiArrowRight />
                  </button>
                </div>
              )}
            </div>
          </div>
        </dialog>
      )}

      {/* Pre-Booking Reservation Details Modal */}
      {isResDetailModalOpen && selectedRes && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-2xl rounded-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <div>
                <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">Reservation Details</h3>
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest font-mono">Res No: {selectedRes.reservationNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openResPaymentsModal(selectedRes)}
                  className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none rounded-lg px-3 py-1.5 h-auto flex items-center gap-1 shadow-sm uppercase tracking-widest font-bold text-[9px]"
                  title="Manage Payments/Deposits"
                >
                  <FiCreditCard size={12} /> Manage Payments
                </button>
                <button
                  onClick={() => setResPrintData(selectedRes)}
                  className="btn btn-xs btn-outline border-brand-primary text-brand-primary rounded-lg px-3 py-1.5 h-auto flex items-center gap-1 uppercase tracking-widest font-bold text-[9px]"
                  title="Print Reservation Invoice"
                >
                  <FiPrinter size={12} /> Print Invoice
                </button>
                <button
                  onClick={() => {
                    setSelectedRes(null);
                    setSelectedBlock(null);
                    setIsResDetailModalOpen(false);
                  }}
                  className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto text-xs font-bold text-brand-sage">
              {/* Customer and Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-offwhite dark:bg-brand-charcoal/45 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Guest Name</span>
                  <span className="text-brand-charcoal dark:text-brand-offwhite text-sm">{selectedRes.customer?.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Phone / Email</span>
                  <span className="text-brand-charcoal dark:text-brand-offwhite font-mono block">{selectedRes.customer?.phoneNumber}</span>
                  <span className="text-[10px] text-brand-sage font-normal block">{selectedRes.customer?.emailAddress || "No Email"}</span>
                </div>
              </div>

              {/* Timeline Dates & Source */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Timeline Dates</span>
                  <span className="text-brand-charcoal dark:text-brand-offwhite text-sm block mt-1">
                    {formatReservationDateTime(selectedRes.checkInDate, false)} → {formatReservationDateTime(selectedRes.checkOutDate, true)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Booking Source</span>
                  <span className="text-brand-charcoal dark:text-brand-offwhite block mt-1 uppercase">{selectedRes.bookingSource}</span>
                </div>
                <div>
                  <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Status</span>
                  <span className="badge badge-sm font-bold tracking-wider uppercase text-[10px] border-none bg-blue-100 text-blue-700 mt-1">{selectedRes.status}</span>
                </div>
              </div>

              {/* Booked Rooms Table */}
              <div className="space-y-2">
                <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Booked Rooms</span>
                <div className="overflow-x-auto border border-brand-beige/40 dark:border-brand-beige/10 rounded-xl p-2">
                  <table className="table w-full text-xs">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wider text-brand-sage border-b border-brand-beige/10">
                        <th>Room Type</th>
                        <th>Meal Plan</th>
                        <th>Assigned Room</th>
                        <th className="text-right">Nightly Rate</th>
                        <th className="text-center">Nights</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRes.rooms.map((r, idx) => (
                        <tr key={idx} className="border-b border-brand-beige/10 last:border-none text-brand-charcoal dark:text-brand-offwhite">
                          <td className="font-bold">{r.roomType}</td>
                          <td>{r.mealPlan || "Room Only"}</td>
                          <td>{r.room?.roomNumber || r.roomNo || "Unassigned"}</td>
                          <td className="text-right font-mono">৳{r.nightlyRate}</td>
                          <td className="text-center font-mono">{r.nights}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              {(() => {
                const totalCost = selectedRes.status === "Cancelled"
                  ? (selectedRes.cancellationFee || 0)
                  : selectedRes.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0);
                const paidAmount = selectedRes.totalPaid || 0;
                const dueAmount = totalCost - paidAmount;

                return (
                  <div className="flex justify-between items-center p-4 bg-brand-secondary/5 border-l-4 border-brand-secondary rounded-r-xl">
                    <div>
                      <span className="text-[9px] font-bold text-brand-sage uppercase tracking-widest block">Reservation Balance</span>
                      <span className="text-sm font-extrabold text-brand-secondary">Due Amount: ৳{dueAmount.toFixed(2)}</span>
                    </div>
                    <div className="text-right text-xs text-brand-sage font-bold">
                      <div>Total Cost: ৳{totalCost.toFixed(2)}</div>
                      <div className="text-green-600">Paid Deposit: ৳{paidAmount.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Notes */}
              {selectedRes.notes && (
                <div>
                  <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Special Requests / Notes</span>
                  <p className="text-brand-charcoal dark:text-brand-offwhite p-3 bg-brand-offwhite/50 dark:bg-brand-charcoal/20 border border-brand-beige/20 rounded-xl mt-1 italic font-medium">
                    "{selectedRes.notes}"
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-brand-beige/35">
                {selectedRes.status !== "Checked-In" && selectedRes.status !== "Cancelled" && (
                  <button
                    onClick={() => openCheckinModal(selectedRes)}
                    className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none rounded-full cursor-pointer gap-1 px-5 shadow font-bold uppercase tracking-wider text-[10px]"
                  >
                    <FiCheck /> Confirm Check-In
                  </button>
                )}

                {selectedRes.status !== "Checked-In" && selectedRes.status !== "Cancelled" && (
                  <button
                    onClick={() => handleCancelReservation(selectedRes)}
                    className="btn btn-sm bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-full cursor-pointer gap-1 px-5 font-bold uppercase tracking-wider text-[10px]"
                  >
                    <FiXCircle /> Cancel Booking
                  </button>
                )}

                {selectedRes.status === "Cancelled" && (selectedRes.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0) - (selectedRes.totalPaid || 0)) < 0 && (
                  <button
                    onClick={() => handleQuickRefund(selectedRes, Math.abs(selectedRes.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0) - (selectedRes.totalPaid || 0)))}
                    className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none rounded-full cursor-pointer px-5 shadow font-bold uppercase tracking-wider text-[10px]"
                  >
                    Process Refund ৳{Math.abs(selectedRes.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0) - (selectedRes.totalPaid || 0))}
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsResDetailModalOpen(false);
                    router.push(`/dashboard/reservations?reservationId=${selectedRes._id}`);
                  }}
                  className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full px-6 font-bold uppercase tracking-wider text-[10px]"
                >
                  Edit / Manage
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Post Food Order Modal */}
      {isFoodModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest text-brand-charcoal">Post Food Order to Folio</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Select Food Category</span></label>
                <select
                  value={selectedFoodCategory}
                  onChange={(e) => {
                    setSelectedFoodCategory(e.target.value);
                    setFoodFormData({ ...foodFormData, foodItem: "" });
                  }}
                  className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs h-9"
                >
                  <option value="">All Categories</option>
                  {foodCategories.filter(cat => cat.isActive !== false).map(cat => (
                    <option key={cat._id} value={cat.categoryName}>{cat.categoryName}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Select Food Item</span></label>
                <select
                  value={foodFormData.foodItem}
                  onChange={(e) => setFoodFormData({ ...foodFormData, foodItem: e.target.value })}
                  className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs h-9"
                >
                  <option value="">Select Item</option>
                  {foodMenu
                    .filter(item => !selectedFoodCategory || item.category === selectedFoodCategory)
                    .map(item => (
                      <option key={item._id} value={item._id}>{item.foodName} (৳{item.price})</option>
                    ))
                  }
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Quantity</span></label>
                <input
                  type="number"
                  value={foodFormData.quantity}
                  onChange={(e) => setFoodFormData({ ...foodFormData, quantity: Number(e.target.value) })}
                  className="input input-bordered border-brand-primary w-full h-9 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-sm"
                  min="1"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => { setIsFoodModalOpen(false); setSelectedFoodCategory(""); }} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Cancel</button>
                <button onClick={handlePostFoodOrder} disabled={isPosting} className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6 disabled:opacity-50">
                  {isPosting ? "Posting..." : "Post Charge"}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Post Resort Service Modal */}
      {isServiceModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest text-brand-charcoal">Post Service Charge to Folio</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Select Service Category</span></label>
                <select
                  value={selectedServiceCategory}
                  onChange={(e) => {
                    setSelectedServiceCategory(e.target.value);
                    setServiceFormData({ ...serviceFormData, serviceId: "" });
                  }}
                  className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs h-9"
                >
                  <option value="">All Categories</option>
                  {serviceCategories.filter(cat => cat.status === "Active").map(cat => (
                    <option key={cat._id} value={cat.categoryName}>{cat.categoryName}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Select Resort Service</span></label>
                <select
                  value={serviceFormData.serviceId}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, serviceId: e.target.value })}
                  className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs h-9"
                >
                  <option value="">Select Service</option>
                  {services
                    .filter(s => !selectedServiceCategory || s.category === selectedServiceCategory)
                    .map(s => (
                      <option key={s._id} value={s._id}>{s.serviceName} (৳{s.price})</option>
                    ))
                  }
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => { setIsServiceModalOpen(false); setSelectedServiceCategory(""); }} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Cancel</button>
                <button onClick={handlePostService} disabled={isPosting} className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6 disabled:opacity-50">
                  {isPosting ? "Posting..." : "Post Charge"}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Post Payment Modal */}
      {isPaymentModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest text-brand-charcoal">Post Direct Payment Credit</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Method</span></label>
                <select
                  value={paymentFormData.paymentType}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentType: e.target.value })}
                  className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs h-9"
                >
                  <option value="">Select Method</option>
                  {paymentTypes.map(pt => (
                    <option key={pt._id} value={pt.name}>{pt.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Amount</span></label>
                <input
                  type="number"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  className="input input-bordered border-brand-primary w-full h-9 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-sm"
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Transaction Reference</span></label>
                <input
                  type="text"
                  value={paymentFormData.transactionRef}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, transactionRef: e.target.value })}
                  className="input input-bordered border-brand-primary w-full h-9 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-sm"
                  placeholder="e.g. BKash trxID, Card Ref"
                />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Notes / Remarks</span></label>
                <input
                  type="text"
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="input input-bordered border-brand-primary w-full h-9 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-sm"
                  placeholder="e.g. advance settlement, extra guest fee, etc."
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setIsPaymentModalOpen(false)} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Cancel</button>
                <button onClick={handlePostPayment} disabled={isPosting} className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6 disabled:opacity-50">
                  {isPosting ? "Posting..." : "Post Credit"}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Extend Stay Modal */}
      {isExtendModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest text-brand-charcoal">Extend Expected Check-Out & Change Rooms</span>
            </div>
            <div className="p-8 space-y-4 text-xs font-bold text-brand-sage">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">New Expected Check-Out Date *</span></label>
                <input
                  type="date"
                  value={extendFormData.newCheckOutDate}
                  onChange={(e) => setExtendFormData({ ...extendFormData, newCheckOutDate: e.target.value })}
                  className="input input-bordered border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-9"
                />
              </div>

              {/* Room Assignments Reassignment option */}
              <div className="space-y-3 pt-3 border-t border-brand-beige/50">
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block mb-1">Room Allocation (Optional Room Change)</span>
                {extendFormData.roomAssignments?.map((assignment, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5 p-3 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige dark:border-brand-beige/15 rounded-xl">
                    <div className="flex justify-between items-center text-brand-charcoal dark:text-brand-offwhite text-[11px]">
                      <span>Current: <strong>Room {assignment.roomNumber}</strong> ({assignment.roomType})</span>
                    </div>
                    <select
                      value={assignment.newRoomId}
                      onChange={(e) => {
                        const updated = [...extendFormData.roomAssignments];
                        updated[idx].newRoomId = e.target.value;
                        setExtendFormData({ ...extendFormData, roomAssignments: updated });
                      }}
                      className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                    >
                      <option value={assignment.oldRoomId}>Keep Room {assignment.roomNumber}</option>
                      {availableRooms
                        .filter(rm => rm.roomType === assignment.roomType && rm._id !== assignment.oldRoomId)
                        .map(rm => (
                          <option key={rm._id} value={rm._id}>Change to Room {rm.roomNumber} ({getRoomStatusLabel(rm.status)})</option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-brand-beige/10">
                <button onClick={() => { setIsExtendModalOpen(false); setExtendFormData({ newCheckOutDate: "", roomAssignments: [] }); }} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Cancel</button>
                <button onClick={handleExtendStay} disabled={isPosting} className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6 disabled:opacity-50">
                  {isPosting ? "Extending..." : "Confirm Extension"}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Adjust Stay Modal */}
      {isAdjustCheckoutModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite dark:bg-brand-charcoal/50">
              <span className="font-bold text-sm uppercase tracking-widest text-brand-charcoal dark:text-brand-offwhite">Adjust Stay Check-Out & Ledger</span>
            </div>
            <div className="p-8 space-y-4 text-xs font-bold text-brand-sage">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">New Expected Check-Out Date *</span></label>
                <input
                  type="date"
                  value={adjustCheckoutFormData.newCheckOutDate}
                  onChange={(e) => setAdjustCheckoutFormData({ ...adjustCheckoutFormData, newCheckOutDate: e.target.value })}
                  className="input input-bordered border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-9"
                />
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Adjustment Type</span></label>
                <select
                  value={adjustCheckoutFormData.adjustmentType}
                  onChange={(e) => setAdjustCheckoutFormData({ ...adjustCheckoutFormData, adjustmentType: e.target.value })}
                  className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                >
                  <option value="none">No Ledger Adjustment</option>
                  <option value="credit">Reduce Bill (Credit Entry)</option>
                  <option value="debit">Increase Bill (Debit Entry)</option>
                </select>
              </div>

              {adjustCheckoutFormData.adjustmentType !== "none" && (
                <div className="form-control w-full animate-fade-in">
                  <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Adjustment Amount (৳) *</span></label>
                  <input
                    type="number"
                    value={adjustCheckoutFormData.adjustmentAmount === 0 ? "" : adjustCheckoutFormData.adjustmentAmount}
                    onChange={(e) => setAdjustCheckoutFormData({ ...adjustCheckoutFormData, adjustmentAmount: Number(e.target.value) })}
                    className="input input-bordered border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-9"
                    placeholder="Enter manual amount"
                    min="1"
                  />
                </div>
              )}

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Reason / Notes</span></label>
                <textarea
                  value={adjustCheckoutFormData.reason}
                  onChange={(e) => setAdjustCheckoutFormData({ ...adjustCheckoutFormData, reason: e.target.value })}
                  className="textarea textarea-bordered border-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-20"
                  placeholder="e.g. Guest checked out early"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-brand-beige/10">
                <button onClick={() => { setIsAdjustCheckoutModalOpen(false); setAdjustCheckoutFormData({ newCheckOutDate: "", adjustmentType: "none", adjustmentAmount: 0, reason: "" }); }} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Cancel</button>
                <button onClick={handleAdjustCheckout} disabled={isPosting} className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6 disabled:opacity-50">
                  {isPosting ? "Adjusting..." : "Confirm Adjustment"}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Settle Checkout Modal */}
      {isCheckoutModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl border animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                Guest Checkout Settle
              </h3>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4 text-xs font-bold text-brand-sage">
              {/* Checkout Bill Break-down info */}
              <div className="p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/25 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block border-b border-brand-beige/20 pb-2">Folio Ledger Account Summary</span>
                <div className="flex justify-between">
                  <span>Room Charges (Debit):</span>
                  <span className="font-bold text-brand-charcoal dark:text-brand-offwhite">৳{folioEntries.filter(e => e.type === "Room Charge").reduce((acc, e) => acc + e.debit, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Food Charges (Debit):</span>
                  <span className="font-bold text-brand-charcoal dark:text-brand-offwhite">৳{folioEntries.filter(e => e.type === "Food Charge").reduce((acc, e) => acc + e.debit, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charges (Debit):</span>
                  <span className="font-bold text-brand-charcoal dark:text-brand-offwhite">৳{folioEntries.filter(e => e.type === "Service Charge").reduce((acc, e) => acc + e.debit, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-brand-sage">
                  <span>Payments & Prepayments (Credit):</span>
                  <span className="font-bold">৳{folioEntries.filter(e => e.type === "Payment" || e.type === "Advance Payment").reduce((acc, e) => acc + (e.credit || 0), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-brand-secondary">
                  <span>Discounts Applied (Credit):</span>
                  <span className="font-bold">৳{folioEntries.filter(e => e.type === "Discount").reduce((acc, e) => acc + (e.credit || 0), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-brand-beige/40 pt-2 text-sm font-extrabold text-brand-secondary">
                  <span>Final Outstanding Balance:</span>
                  <span>৳{outstandingDue.toFixed(2)}</span>
                </div>
              </div>

              {/* Settlement payment fields (only if outstanding balance is positive) */}
              {outstandingDue > 0 ? (
                <div className="p-4 bg-brand-offwhite/50 dark:bg-brand-charcoal/20 border border-brand-beige/20 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block mb-1">Record Settlement Payment</span>
                  <div className="flex gap-4">
                    <div className="form-control w-1/2">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Payment Method *</span></label>
                      <select
                        value={checkoutPayment.paymentType}
                        onChange={(e) => setCheckoutPayment({ ...checkoutPayment, paymentType: e.target.value })}
                        className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                      >
                        <option value="">Select Method</option>
                        {paymentTypes.map(pt => (
                          <option key={pt._id} value={pt.name}>{pt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-control w-1/2">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Settlement Amount *</span></label>
                      <input
                        type="number"
                        value={checkoutPayment.amount}
                        onChange={(e) => setCheckoutPayment({ ...checkoutPayment, amount: Number(e.target.value) })}
                        className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                      />
                    </div>
                  </div>
                  <div className="form-control w-full">
                    <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Transaction Ref</span></label>
                    <input
                      type="text"
                      value={checkoutPayment.transactionRef}
                      onChange={(e) => setCheckoutPayment({ ...checkoutPayment, transactionRef: e.target.value })}
                      className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal text-xs dark:text-brand-offwhite w-full"
                      placeholder="e.g. Card Ref, Cash Receipt No"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 text-green-700 text-xs font-bold rounded-xl text-center">Ledger Account is fully settled. Guest can check-out.</div>
              )}

              {/* Option to make room available immediately */}
              <div className="form-control p-4 bg-brand-offwhite/50 dark:bg-brand-charcoal/20 border border-brand-beige/25 rounded-2xl flex flex-row items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-charcoal dark:text-brand-offwhite block">Make Room(s) Available Immediately</span>
                  <span className="text-[10px] text-brand-sage font-normal block mt-0.5">Skip Cleaning status (recommended for very short stays/quick checkout)</span>
                </div>
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm border-brand-primary"
                  checked={makeRoomsAvailable}
                  onChange={(e) => setMakeRoomsAvailable(e.target.checked)}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setIsCheckoutModalOpen(false)} className="btn btn-ghost hover:bg-brand-beige text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
                <button onClick={handleCheckoutGuest} disabled={isPosting} className="btn bg-green-600 hover:bg-green-700 text-white border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md disabled:opacity-50">
                  {isPosting ? "Checking out..." : "Confirm Checkout"}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Post Discount Modal */}
      {isDiscountModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite dark:bg-brand-charcoal/50">
              <span className="font-bold text-sm uppercase tracking-widest text-brand-black dark:text-brand-offwhite">Post Discount to Folio</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-control w-full">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Discount Type *</span></label>
                <select
                  value={discountFormData.discountType}
                  onChange={(e) => setDiscountFormData({ ...discountFormData, discountType: e.target.value })}
                  className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="amount">Fixed Amount (৳)</option>
                </select>
              </div>
              <div className="form-control w-full">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Discount Value *</span></label>
                <input
                  type="number"
                  value={discountFormData.value}
                  onChange={(e) => setDiscountFormData({ ...discountFormData, value: e.target.value })}
                  className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                  placeholder={discountFormData.discountType === "percentage" ? "e.g. 10" : "e.g. 500"}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Apply Discount To *</span></label>
                <select
                  value={discountFormData.applyTo}
                  onChange={(e) => setDiscountFormData({ ...discountFormData, applyTo: e.target.value })}
                  className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                >
                  <option value="all">Total Bill (All Charges)</option>
                  <option value="room">Room Charges Only</option>
                  <option value="food">Food Charges Only</option>
                </select>
              </div>
              <div className="form-control w-full">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Reason / Description</span></label>
                <input
                  type="text"
                  value={discountFormData.reason}
                  onChange={(e) => setDiscountFormData({ ...discountFormData, reason: e.target.value })}
                  className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full text-xs"
                  placeholder="e.g. Corporate Discount"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 p-6 border-t border-brand-beige/10">
                <button onClick={() => setIsDiscountModalOpen(false)} className="btn btn-xs btn-ghost uppercase font-bold text-[10px]">Cancel</button>
                <button onClick={handlePostDiscount} disabled={isPosting} className="btn btn-xs bg-brand-primary text-white border-none rounded uppercase tracking-wider font-bold text-[10px] px-4 disabled:opacity-50">
                  {isPosting ? "Applying..." : "Apply Discount"}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Customer Details Modal */}
      {isCustomerModalOpen && selectedStay && selectedStay.customer && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-2xl rounded-2xl border animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                Customer Profile Details
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Photo / Avatar */}
                <div className="flex flex-col items-center gap-3 w-full md:w-1/4">
                  {selectedStay.customer.customerPhoto ? (
                    <img
                      src={selectedStay.customer.customerPhoto}
                      alt={selectedStay.customer.fullName}
                      className="w-32 h-32 rounded-full object-cover border-4 border-brand-primary/20 shadow-md"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-brand-primary/10 flex items-center justify-center font-black text-4xl text-brand-primary border-4 border-brand-primary/10 shadow-inner">
                      {selectedStay.customer.fullName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-brand-sage uppercase tracking-wider">Guest Photo</span>
                </div>

                {/* Primary Info Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-3/4 text-sm text-brand-charcoal dark:text-brand-offwhite">
                  <div>
                    <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Full Name</span>
                    <span className="font-extrabold">{selectedStay.customer.fullName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Phone Number</span>
                    <span className="font-bold">{selectedStay.customer.phoneNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Email Address</span>
                    <span className="font-bold">{selectedStay.customer.emailAddress || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Nationality</span>
                    <span className="font-bold">{selectedStay.customer.nationality || "Bangladeshi"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Gender / Marital Status</span>
                    <span className="font-bold">{selectedStay.customer.gender} / {selectedStay.customer.maritalStatus}</span>
                  </div>
                  <div>
                    <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Date of Birth</span>
                    <span className="font-bold">
                      {selectedStay.customer.dateOfBirth ? new Date(selectedStay.customer.dateOfBirth).toLocaleDateString("en-GB") : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ID & Job Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-brand-beige/30 text-brand-charcoal dark:text-brand-offwhite">
                <div>
                  <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-3">Identification</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs text-brand-sage block">ID Type & Number</span>
                      <span className="font-bold">{selectedStay.customer.identificationType || "N/A"} - {selectedStay.customer.identificationNumber || "N/A"}</span>
                    </div>
                    {selectedStay.customer.uploadIdCopy && (
                      <div className="mt-2">
                        <span className="text-xs text-brand-sage block mb-1">ID Copy Document</span>
                        <a
                          href={selectedStay.customer.uploadIdCopy}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                        >
                          <FiFileText /> View ID Copy Attachment
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-3">Occupation & Company</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs text-brand-sage block">Occupation</span>
                      <span className="font-bold">{selectedStay.customer.occupation || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-brand-sage block">Company Name</span>
                      <span className="font-bold">{selectedStay.customer.companyName || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address details */}
              <div className="pt-4 border-t border-brand-beige/30 text-sm text-brand-charcoal dark:text-brand-offwhite">
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-3">Residential Address</h4>
                <div className="p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/25 rounded-xl">
                  {selectedStay.customer.address ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-brand-sage block">Street Address</span>
                        <span className="font-bold">
                          {selectedStay.customer.address.line1}
                          {selectedStay.customer.address.line2 ? `, ${selectedStay.customer.address.line2}` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-brand-sage block">City, Division & Country</span>
                        <span className="font-bold">
                          {selectedStay.customer.address.city || "—"}, {selectedStay.customer.address.division || "—"}, {selectedStay.customer.address.country || "Bangladesh"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-brand-sage italic">No address provided.</span>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-4 border-t border-brand-beige/30 text-sm text-brand-charcoal dark:text-brand-offwhite">
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-3">Emergency Contact Details</h4>
                {selectedStay.customer.emergencyContact ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/25 rounded-xl">
                    <div>
                      <span className="text-xs text-brand-sage block">Contact Name</span>
                      <span className="font-bold">{selectedStay.customer.emergencyContact.name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-brand-sage block">Relation</span>
                      <span className="font-bold">{selectedStay.customer.emergencyContact.relation || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-brand-sage block">Phone Number</span>
                      <span className="font-bold">{selectedStay.customer.emergencyContact.phoneNumber || "N/A"}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-brand-sage italic">No emergency contact provided.</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={() => setIsCustomerModalOpen(false)} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">
                Close
              </button>
              <button
                onClick={() => setCustomerPrintData(selectedStay)}
                className="btn bg-brand-primary hover:bg-brand-secondary text-white border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md"
              >
                Print Profile
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Reservation Prepayment Deposit Modal */}
      {isResPayModalOpen && selectedRes && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                Manage Deposit Payments
              </h3>
              <button onClick={() => setIsResPayModalOpen(false)} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige">
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
                      <div key={pay._id} className="flex justify-between items-center p-3 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/20 dark:border-brand-beige/10 rounded-xl text-brand-charcoal dark:text-brand-offwhite">
                        <div>
                          <div className="font-bold text-sm">{pay.paymentType}</div>
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
                      value={resPayFormData.paymentType}
                      onChange={(e) => setResPayFormData({ ...resPayFormData, paymentType: e.target.value })}
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
                      value={resPayFormData.amount}
                      onChange={(e) => setResPayFormData({ ...resPayFormData, amount: e.target.value })}
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
                      value={resPayFormData.transactionRef}
                      onChange={(e) => setResPayFormData({ ...resPayFormData, transactionRef: e.target.value })}
                      className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                      placeholder="e.g. TXN987654"
                    />
                  </div>
                </div>
                <button type="button" onClick={handleAddResPayment} className="btn btn-xs bg-brand-primary text-white border-none w-full rounded-lg h-8 uppercase tracking-widest font-bold text-[10px]">
                  Submit Deposit
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Confirm Check-in / Room Assignment Modal */}
      {isCheckinModalOpen && selectedRes && (
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
                  const filteredRooms = availableRooms.filter(r => r.status === "Available" || r.status === "Reserved" || r._id === a.roomId);
                  const matchingRooms = [
                    ...filteredRooms.filter(r => r.roomType === a.roomType),
                    ...filteredRooms.filter(r => r.roomType !== a.roomType)
                  ];

                  return (
                    <div key={idx} className="flex flex-col gap-2 p-3 bg-brand-offwhite/40 dark:bg-brand-charcoal/30 border border-brand-beige/10 rounded-xl text-brand-charcoal dark:text-brand-offwhite">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-brand-sage uppercase tracking-wider">Booked Room Type:</span>
                        <span className="font-extrabold text-sm uppercase tracking-wider text-brand-primary">{a.roomType}</span>
                      </div>
                      <select
                        value={a.roomId}
                        onChange={(e) => handleCheckinAssignmentChange(idx, e.target.value)}
                        className="select select-bordered select-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite h-9 text-xs font-bold w-full"
                      >
                        <option value="">Select Room</option>
                        {matchingRooms.map(rm => (
                          <option key={rm._id} value={rm._id}>
                            Room {rm.roomNumber} ({getRoomStatusLabel(rm.status)}) - {rm.roomType} {rm.roomType === a.roomType ? "★" : ""}
                          </option>
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

      {/* Hidden print containers for useStandardPrint */}
      {customerPrintData && customerPrintData.customer && (
        <div style={{ display: "none" }}>
          <PrintReportTemplate
            ref={customerPrintRef}
            title="Guest Information Profile Report"
            subtitle={`Customer Profile details for guest: ${customerPrintData.customer.fullName}`}
            dateRange=""
          >
            <div style={{ display: "flex", gap: "30px", marginBottom: "30px", borderBottom: "1px solid #ccc", paddingBottom: "20px" }}>
              <div style={{ width: "120px" }}>
                {customerPrintData.customer.customerPhoto ? (
                  <img src={customerPrintData.customer.customerPhoto} alt="Photo" style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "4px" }} />
                ) : (
                  <div style={{ width: "120px", height: "120px", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "40px", backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                    {customerPrintData.customer.fullName?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 30px", width: "100%", fontSize: "12px", color: "#000" }}>
                <div><strong>Full Name:</strong> {customerPrintData.customer.fullName}</div>
                <div><strong>Phone Number:</strong> {customerPrintData.customer.phoneNumber}</div>
                <div><strong>Email Address:</strong> {customerPrintData.customer.emailAddress || "N/A"}</div>
                <div><strong>Nationality:</strong> {customerPrintData.customer.nationality || "Bangladeshi"}</div>
                <div><strong>Gender / Marital Status:</strong> {customerPrintData.customer.gender} / {customerPrintData.customer.maritalStatus}</div>
                <div><strong>Date of Birth:</strong> {customerPrintData.customer.dateOfBirth ? new Date(customerPrintData.customer.dateOfBirth).toLocaleDateString("en-GB") : "N/A"}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "30px", fontSize: "12px", color: "#000" }}>
              <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>IDENTIFICATION</h4>
                <p style={{ margin: "5px 0" }}><strong>ID Type:</strong> {customerPrintData.customer.identificationType || "N/A"}</p>
                <p style={{ margin: "5px 0" }}><strong>ID Number:</strong> {customerPrintData.customer.identificationNumber || "N/A"}</p>
              </div>

              <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>OCCUPATION INFO</h4>
                <p style={{ margin: "5px 0" }}><strong>Occupation:</strong> {customerPrintData.customer.occupation || "N/A"}</p>
                <p style={{ margin: "5px 0" }}><strong>Company Name:</strong> {customerPrintData.customer.companyName || "N/A"}</p>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px", marginBottom: "30px", fontSize: "12px", color: "#000" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>RESIDENTIAL ADDRESS</h4>
              {customerPrintData.customer.address ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <p style={{ margin: "0" }}><strong>Street:</strong> {customerPrintData.customer.address.line1} {customerPrintData.customer.address.line2 || ""}</p>
                  <p style={{ margin: "0" }}><strong>City/Division/Country:</strong> {customerPrintData.customer.address.city || "—"}, {customerPrintData.customer.address.division || "—"}, {customerPrintData.customer.address.country || "Bangladesh"}</p>
                </div>
              ) : (
                <p style={{ margin: "0", fontStyle: "italic" }}>No address provided.</p>
              )}
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px", marginBottom: "30px", fontSize: "12px", color: "#000" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>EMERGENCY CONTACT</h4>
              {customerPrintData.customer.emergencyContact ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                  <p style={{ margin: "0" }}><strong>Name:</strong> {customerPrintData.customer.emergencyContact.name || "N/A"}</p>
                  <p style={{ margin: "0" }}><strong>Relation:</strong> {customerPrintData.customer.emergencyContact.relation || "N/A"}</p>
                  <p style={{ margin: "0" }}><strong>Phone:</strong> {customerPrintData.customer.emergencyContact.phoneNumber || "N/A"}</p>
                </div>
              ) : (
                <p style={{ margin: "0", fontStyle: "italic" }}>No emergency contact details provided.</p>
              )}
            </div>
          </PrintReportTemplate>
        </div>
      )}

      {folioPrintData && (
        <div style={{ display: "none" }}>
          <PrintReportTemplate
            ref={folioPrintRef}
            title={`Guest Folio Ledger - ${folioPrintData.stayNo}`}
            subtitle={`Folio account details for guest ${folioPrintData.customer?.fullName || "Guest"}`}
            dateRange={`Check-in: ${formatDateTime(folioPrintData.checkInDate)} to Expected Check-out: ${formatDateTime(folioPrintData.expectedCheckOutDate)}`}
          >
            <div style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", fontSize: "12px", color: "#000" }}>
              <strong>Customer Name:</strong> {folioPrintData.customer?.fullName} &nbsp;|&nbsp;
              <strong>Email:</strong> {folioPrintData.customer?.emailAddress || "N/A"} &nbsp;|&nbsp;
              <strong>Phone:</strong> {folioPrintData.customer?.phoneNumber || "N/A"} &nbsp;|&nbsp;
              <strong>Assigned Rooms:</strong> {folioPrintData.rooms?.map(r => r.room?.roomNumber).join(", ")}
            </div>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Debit (Charges)</th>
                  <th style={{ textAlign: "right" }}>Credit (Credits)</th>
                </tr>
              </thead>
              <tbody>
                {folioEntries.map((row) => (
                  <tr key={row._id}>
                    <td>{formatDateTime(row.date)}</td>
                    <td>{row.type}</td>
                    <td style={{ fontWeight: "bold" }}>{row.description}</td>
                    <td style={{ textAlign: "right", color: "red", fontWeight: "bold" }}>
                      {row.debit > 0 ? `৳${row.debit.toFixed(2)}` : "—"}
                    </td>
                    <td style={{ textAlign: "right", color: "green", fontWeight: "bold" }}>
                      {row.credit > 0 ? `৳${row.credit.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: "bold" }}>
                  <td colSpan="3">TOTALS</td>
                  <td style={{ textAlign: "right", color: "red" }}>৳{totalDebit.toFixed(2)}</td>
                  <td style={{ textAlign: "right", color: "green" }}>৳{totalCredit.toFixed(2)}</td>
                </tr>
                <tr style={{ fontWeight: "bold", fontSize: "12px" }}>
                  <td colSpan="3" style={{ borderTop: "2px solid black" }}>OUTSTANDING DUE BALANCE:</td>
                  <td colSpan="2" style={{ textAlign: "right", color: outstandingDue > 0 ? "red" : "green", borderTop: "2px solid black" }}>
                    ৳{outstandingDue.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </PrintReportTemplate>
        </div>
      )}

      {finalInvoiceRes && (
        <div style={{ display: "none" }}>
          {(() => {
            const summary = getInvoiceSummary(folioEntries);
            const isDue = summary.dueAmount > 0;
            return (
              <PrintReportTemplate
                ref={finalInvoicePrintRef}
                title="FINAL GUEST INVOICE"
                subtitle="Thank you for staying with us"
                dateRange=""
              >
                {/* Invoice Meta Header Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  marginBottom: "30px",
                  borderBottom: "2px solid #1e293b",
                  paddingBottom: "15px",
                  fontSize: "11px"
                }}>
                  <div>
                    <span style={{ textTransform: "uppercase", fontSize: "9px", fontWeight: "bold", color: "#1e293b", tracking: "widest" }}>Billing Info</span>
                    <p style={{ margin: "4px 0 2px 0", fontWeight: "bold", fontSize: "13px" }}>{finalInvoiceRes.customer?.fullName}</p>
                    <p style={{ margin: "2px 0", color: "#555" }}>Phone: {finalInvoiceRes.customer?.phoneNumber || "N/A"}</p>
                    <p style={{ margin: "2px 0", color: "#555" }}>Email: {finalInvoiceRes.customer?.emailAddress || finalInvoiceRes.customer?.email || "N/A"}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ textTransform: "uppercase", fontSize: "9px", fontWeight: "bold", color: "#1e293b", tracking: "widest" }}>Invoice Info</span>
                    <p style={{ margin: "4px 0 2px 0" }}><strong>Invoice Ref:</strong> INV-{finalInvoiceRes.stayNo.replace("STY-", "")}</p>
                    <p style={{ margin: "2px 0" }}><strong>Booking ID:</strong> {finalInvoiceRes.reservationNo || finalInvoiceRes.stayNo}</p>
                    <p style={{ margin: "2px 0" }}><strong>Check-In:</strong> {new Date(finalInvoiceRes.checkInDate).toLocaleDateString("en-GB")} 14:00</p>
                    <p style={{ margin: "2px 0" }}><strong>Check-Out:</strong> {finalInvoiceRes.actualCheckOutDate ? new Date(finalInvoiceRes.actualCheckOutDate).toLocaleDateString("en-GB") : new Date(finalInvoiceRes.expectedCheckOutDate).toLocaleDateString("en-GB")} 12:00</p>
                  </div>
                </div>

                {/* Booking Item Details */}
                <div style={{ marginBottom: "25px" }}>
                  <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Room & Reservation Details</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left", fontWeight: "bold", color: "#475569" }}>
                        <th style={{ padding: "10px", borderBottom: "1px solid #cbd5e1" }}>Stay Allocation</th>
                        <th style={{ padding: "10px", borderBottom: "1px solid #cbd5e1" }}>Meal Option</th>
                        <th style={{ padding: "10px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Nights</th>
                        <th style={{ padding: "10px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Total Rate (BDT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finalInvoiceRes.rooms?.map((rm, index) => {
                        const roomNo = rm.room?.roomNumber || rm.roomNo || "Unassigned";
                        return (
                          <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px" }}>
                              <div style={{ fontWeight: "bold", fontSize: "11px" }}>Room {roomNo}</div>
                              <div style={{ color: "#64748b", fontSize: "10px" }}>{rm.roomType || "Resort Room"}</div>
                            </td>
                            <td style={{ padding: "10px", color: "#475569" }}>{rm.mealPlan || "Room Only"}</td>
                            <td style={{ padding: "10px", textAlign: "right", color: "#475569" }}>{rm.nights || 1}</td>
                            <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold" }}>৳ {(rm.nightlyRate * (rm.nights || 1)).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Payment Summary & Financials */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "30px", marginBottom: "30px" }}>
                  {/* Collected Payments ledger */}
                  <div>
                    <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Payments Ledger</h4>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #cbd5e1", color: "#64748b", fontWeight: "bold", textAlign: "left" }}>
                          <th style={{ padding: "6px 0" }}>Payment Particulars</th>
                          <th style={{ padding: "6px 0" }}>Method</th>
                          <th style={{ padding: "6px 0", textAlign: "right" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {folioEntries.filter(e => e.credit > 0 && !e.description.toLowerCase().includes("discount")).map((e, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "6px 0", color: "#475569" }}>{e.description}</td>
                            <td style={{ padding: "6px 0", color: "#475569" }}>{e.type || "Cash/Online"}</td>
                            <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "bold", color: "green" }}>৳ {e.credit.toLocaleString()}</td>
                          </tr>
                        ))}
                        {folioEntries.filter(e => e.credit > 0 && !e.description.toLowerCase().includes("discount")).length === 0 && (
                          <tr>
                            <td colSpan="3" style={{ padding: "10px 0", color: "#94a3b8", fontStyle: "italic" }}>No payments collected yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bill calculation summary card */}
                  <div style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px",
                    fontSize: "11px"
                  }}>
                    <h4 style={{ fontSize: "11px", fontWeight: "black", color: "#1e293b", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Bill Summary</h4>
                    <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#475569" }}>
                      <span>Total Room Charges:</span>
                      <span>৳ {summary.roomTotal.toLocaleString()}</span>
                    </div>
                    {summary.serviceTotal > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#475569" }}>
                        <span>Resort Add-ons:</span>
                        <span>৳ {summary.serviceTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {summary.foodTotal > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#475569" }}>
                        <span>Restaurant Orders:</span>
                        <span>৳ {summary.foodTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {summary.discountTotal > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "green", fontWeight: "bold" }}>
                        <span>Discount:</span>
                        <span>(-) ৳ {summary.discountTotal.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ borderTop: "1px solid #cbd5e1", margin: "8px 0" }}></div>
                    <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", fontWeight: "bold", fontSize: "12px" }}>
                      <span>Total Net Bill:</span>
                      <span style={{ color: "#1e293b" }}>৳ {summary.netPayable.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#475569" }}>
                      <span>Total Paid:</span>
                      <span style={{ color: "green", fontWeight: "bold" }}>৳ {summary.paidTotal.toLocaleString()}</span>
                    </div>
                    <div style={{ borderTop: "1px solid #cbd5e1", margin: "8px 0" }}></div>

                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      margin: "4px 0 0 0",
                      fontWeight: "black",
                      fontSize: "13px",
                      color: isDue ? "#ef4444" : "#22c55e"
                    }}>
                      <span>{isDue ? "Outstanding Due:" : "Invoice Settled:"}</span>
                      <span>৳ {summary.dueAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Terms & Thank You Message Footer */}
                <div style={{
                  marginTop: "50px",
                  borderTop: "1px dashed #cbd5e1",
                  paddingTop: "15px",
                  textAlign: "center",
                  fontSize: "10px",
                  color: "#64748b"
                }}>
                  <p style={{ margin: "2px 0" }}>This is a computer-generated guest invoice from Chayatol Resort & Restaurant PMS.</p>
                  <p style={{ margin: "2px 0", fontWeight: "bold", color: "#1e293b" }}>We hope you enjoyed your stay! See you again soon.</p>
                </div>
              </PrintReportTemplate>
            );
          })()}
        </div>
      )}

      {resPrintData && (
        <div style={{ display: "none" }}>
          <PrintReportTemplate
            ref={resPrintRef}
            title="Reservation Invoice"
            subtitle={`Invoice for Reservation No: ${resPrintData.reservationNo}`}
            dateRange=""
          >
            {/* Guest & Reservation details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "25px", fontSize: "11px", color: "#000" }}>
              <div>
                <h3 style={{ fontWeight: "bold", borderBottom: "1px solid #ccc", paddingBottom: "4px", textTransform: "uppercase", margin: "0 0 8px 0" }}>Guest Information</h3>
                <p style={{ margin: "3px 0" }}><strong>Name:</strong> {resPrintData.customer?.fullName}</p>
                <p style={{ margin: "3px 0" }}><strong>Phone:</strong> {resPrintData.customer?.phoneNumber}</p>
                {resPrintData.customer?.emailAddress && <p style={{ margin: "3px 0" }}><strong>Email:</strong> {resPrintData.customer.emailAddress}</p>}
              </div>
              <div>
                <h3 style={{ fontWeight: "bold", borderBottom: "1px solid #ccc", paddingBottom: "4px", textTransform: "uppercase", margin: "0 0 8px 0" }}>Reservation Info</h3>
                <p style={{ margin: "3px 0" }}><strong>Check-In Date:</strong> {formatReservationDateTime(resPrintData.checkInDate, false)}</p>
                <p style={{ margin: "3px 0" }}><strong>Check-Out Date:</strong> {formatReservationDateTime(resPrintData.checkOutDate, true)}</p>
                <p style={{ margin: "3px 0" }}><strong>Booking Source:</strong> {resPrintData.bookingSource}</p>
                <p style={{ margin: "3px 0" }}><strong>Status:</strong> {resPrintData.status}</p>
              </div>
            </div>

            {/* Booked Rooms Table */}
            <div style={{ marginBottom: "25px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", margin: "0 0 8px 0" }}>Booked Rooms</h3>
              <table className="print-table" style={{ width: "100%", fontSize: "11px", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th>Room Type</th>
                    <th>Meal Plan</th>
                    <th>Assigned Room</th>
                    <th style={{ textAlign: "right" }}>Nightly Rate</th>
                    <th style={{ textAlign: "center" }}>Nights</th>
                    <th style={{ textAlign: "right" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {resPrintData.rooms.map((r, i) => {
                    const sub = r.nightlyRate * r.nights;
                    return (
                      <tr key={i}>
                        <td>{r.roomType}</td>
                        <td>{r.mealPlan || "Room Only"}</td>
                        <td>{r.room?.roomNumber || r.roomNo || "Unassigned"}</td>
                        <td style={{ textAlign: "right" }}>৳{r.nightlyRate}</td>
                        <td style={{ textAlign: "center" }}>{r.nights}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold" }}>৳{sub}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Prepayments / Deposits History Table */}
            <div style={{ marginBottom: "25px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", margin: "0 0 8px 0" }}>Prepayment & Deposits</h3>
              {paymentsList.length > 0 ? (
                <table className="print-table" style={{ width: "100%", fontSize: "11px", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Payment Method</th>
                      <th>Transaction Reference</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsList.map((p, i) => (
                      <tr key={i}>
                        <td>{new Date(p.paymentDate).toLocaleString("en-GB")}</td>
                        <td>{p.paymentType}</td>
                        <td>{p.transactionRef || "N/A"}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold", color: "green" }}>৳{p.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: "11px", fontStyle: "italic", color: "#6b7280", margin: 0 }}>No prepayment deposits collected for this reservation.</p>
              )}
            </div>

            {/* Cancellation details if Cancelled */}
            {resPrintData.status === "Cancelled" && (
              <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "5px", padding: "12px", marginBottom: "25px", fontSize: "11px", color: "#991b1b" }}>
                <h4 style={{ margin: "0 0 5px 0", fontWeight: "bold", textTransform: "uppercase" }}>Cancellation Summary</h4>
                <p style={{ margin: "3px 0" }}><strong>Cancellation Fee:</strong> ৳{resPrintData.cancellationFee || 0}</p>
                {resPrintData.cancellationReason && <p style={{ margin: "3px 0" }}><strong>Reason:</strong> {resPrintData.cancellationReason}</p>}
              </div>
            )}

            {/* Final financial calculations summary */}
            <div style={{ display: "flex", justifyContent: "end" }}>
              <div style={{ width: "250px", fontSize: "11px", border: "1px solid #ddd", padding: "10px", borderRadius: "5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "semibold", margin: "2px 0" }}>
                  <span>Grand Total Cost:</span>
                  <span>৳{
                    resPrintData.status === "Cancelled"
                      ? (resPrintData.cancellationFee || 0)
                      : resPrintData.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0)
                  }</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "semibold", color: "green", margin: "2px 0" }}>
                  <span>Total Deposit Paid:</span>
                  <span>৳{resPrintData.totalPaid || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #ccc", paddingTop: "5px", fontWeight: "bold", color: "red", fontSize: "12px" }}>
                  <span>Outstanding Due:</span>
                  <span>৳{
                    (resPrintData.status === "Cancelled"
                      ? (resPrintData.cancellationFee || 0)
                      : resPrintData.rooms.reduce((acc, r) => acc + (r.nightlyRate * r.nights), 0)) - (resPrintData.totalPaid || 0)
                  }</span>
                </div>
              </div>
            </div>
          </PrintReportTemplate>
        </div>
      )}

      {/* Inline Walk-In Guest Check-In Modal */}
      {isWalkinModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-3xl rounded-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <div>
                <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">Walk-In Check-In</h3>
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest font-mono">Create stays record directly from the timeline</span>
              </div>
              <button
                onClick={() => setIsWalkinModalOpen(false)}
                className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige dark:hover:bg-brand-offwhite/10"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto text-xs font-bold text-brand-sage">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Select Customer *</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={walkinPhoneSearch}
                    onChange={(e) => {
                      setWalkinPhoneSearch(e.target.value);
                      setSelectedWalkinCust(null);
                      setWalkinCustomer("");
                      setWalkinCustSearchResults([]);
                    }}
                    placeholder="Search by phone number (e.g. 01700000000)"
                    className="input input-bordered input-xs h-9 border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary flex-1 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  />
                  <button
                    type="button"
                    onClick={handleWalkinSearchCustomer}
                    disabled={walkinCustSearchLoading}
                    className="btn bg-brand-primary hover:bg-brand-secondary text-white border-none px-6 btn-xs h-9 font-bold uppercase tracking-widest"
                  >
                    {walkinCustSearchLoading ? "..." : "Search"}
                  </button>
                </div>

                {walkinCustSearchResults.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 dark:bg-brand-charcoal/30 border border-brand-beige/50 dark:border-brand-beige/20 rounded-lg">
                    <div className="text-[10px] font-bold text-brand-sage uppercase tracking-wider">Search Results</div>
                    {walkinCustSearchResults.map((cust) => {
                      const score = calculateCompleteness(cust);
                      const badgeClass = score <= 3
                        ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                        : score <= 7
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                          : score <= 9
                            ? "bg-lime-50 text-lime-600 dark:bg-lime-950/30 dark:text-lime-400 border border-lime-200 dark:border-lime-900/50"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";

                      return (
                        <div key={cust._id} className="flex justify-between items-center bg-white dark:bg-brand-charcoal p-2 rounded-lg border border-brand-beige/30 dark:border-brand-beige/10">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800 dark:text-brand-offwhite">{cust.fullName}</span>
                            <span className="text-xs text-brand-sage font-mono">{cust.phoneNumber}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                Profile: {score}/10
                              </span>
                              <div className="w-12 bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${score <= 3 ? "bg-red-500" : score <= 7 ? "bg-amber-500" : score <= 9 ? "bg-lime-500" : "bg-emerald-500"
                                    }`}
                                  style={{ width: `${score * 10}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectWalkinCust(cust)}
                            className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none px-3"
                          >
                            Select
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => { setWalkinCustSearchResults([]); setIsWalkinCustModalOpen(true); }}
                      className="text-xs text-blue-500 font-bold hover:underline self-start mt-1 cursor-pointer"
                    >
                      + Add New Customer
                    </button>
                  </div>
                )}

                {selectedWalkinCust && walkinCustSearchResults.length === 0 && (() => {
                  const score = calculateCompleteness(selectedWalkinCust);
                  const badgeClass = score <= 3
                    ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                    : score <= 7
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                      : score <= 9
                        ? "bg-lime-50 text-lime-600 dark:bg-lime-950/30 dark:text-lime-400 border border-lime-200 dark:border-lime-900/50"
                        : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";

                  return (
                    <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 p-3 rounded-lg border border-brand-beige dark:border-brand-beige/20 mt-2 flex justify-between items-center text-brand-charcoal dark:text-brand-offwhite">
                      <div>
                        <div className="text-[10px] text-brand-sage font-bold uppercase tracking-widest mb-1">Selected Guest</div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          {selectedWalkinCust.fullName}
                          <button
                            type="button"
                            onClick={() => {
                              setWalkinCustToEdit(selectedWalkinCust);
                              setIsWalkinCustModalOpen(true);
                            }}
                            className="btn btn-ghost btn-xs text-brand-primary p-0 h-auto hover:bg-transparent"
                            title="Edit Profile"
                          >
                            <FiEdit size={14} />
                          </button>
                        </div>
                        <div className="text-xs text-brand-sage font-mono">{selectedWalkinCust.phoneNumber}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                            Profile: {score}/10
                          </span>
                          <div className="w-12 bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${score <= 3 ? "bg-red-500" : score <= 7 ? "bg-amber-500" : score <= 9 ? "bg-lime-500" : "bg-emerald-500"
                                }`}
                              style={{ width: `${score * 10}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWalkinCust(null);
                          setWalkinCustomer("");
                          setWalkinPhoneSearch("");
                        }}
                        className="text-xs text-red-500 hover:underline font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Rooms Selection */}
              <div className="space-y-4 pt-4 border-t border-brand-beige/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest">Assign Rooms & Pricing Plan</span>
                  <button type="button" onClick={handleWalkinAddRoomRow} className="btn btn-xs bg-brand-primary text-white border-none rounded-full px-3 gap-1">
                    <FiPlus /> Add Room
                  </button>
                </div>

                {walkinRooms.map((r, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-3 p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige dark:border-brand-beige/15 rounded-xl">
                    <div className="form-control w-[140px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Room Number</span></label>
                      <select
                        value={r.room}
                        onChange={(e) => handleWalkinRoomRowChange(index, "room", e.target.value)}
                        className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                      >
                        <option value="">Select Room</option>
                        {availableRooms.map(rm => (
                          <option key={rm._id} value={rm._id}>{rm.roomNumber} ({getRoomStatusLabel(rm.status)}) ({rm.roomType})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control w-[160px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Meal Plan</span></label>
                      <select
                        value={r.mealPlan}
                        onChange={(e) => handleWalkinRoomRowChange(index, "mealPlan", e.target.value)}
                        className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                      >
                        <option value="Room Only">Room Only</option>
                        <option value="Breakfast Included">Breakfast Included</option>
                        <option value="All-Day Food Included">All-Day Food Included</option>
                      </select>
                    </div>

                    <div className="form-control w-[100px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Nightly Rate</span></label>
                      <input
                        type="number"
                        value={r.nightlyRate}
                        onChange={(e) => handleWalkinRoomRowChange(index, "nightlyRate", Number(e.target.value))}
                        className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                        min="0"
                      />
                    </div>

                    <div className="form-control w-[60px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Nights</span></label>
                      <input
                        type="number"
                        value={r.nights}
                        onChange={(e) => handleWalkinRoomRowChange(index, "nights", Number(e.target.value))}
                        className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                        min="1"
                      />
                    </div>

                    <div className="form-control w-[60px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Adults</span></label>
                      <input
                        type="number"
                        value={r.adults}
                        onChange={(e) => handleWalkinRoomRowChange(index, "adults", Number(e.target.value))}
                        className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                        min="1"
                      />
                    </div>

                    <div className="form-control w-[60px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Children</span></label>
                      <input
                        type="number"
                        value={r.children}
                        onChange={(e) => handleWalkinRoomRowChange(index, "children", Number(e.target.value))}
                        className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                        min="0"
                      />
                    </div>

                    <button type="button" onClick={() => handleWalkinRemoveRoomRow(index)} className="btn btn-square btn-outline btn-xs btn-error flex items-center justify-center h-8 w-8 cursor-pointer" disabled={walkinRooms.length === 1}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Expected Check-Out Date *</span></label>
                <input
                  type="date"
                  value={walkinExpectedCheckOutDate}
                  onChange={(e) => {
                    const newCheckOut = e.target.value;
                    setWalkinExpectedCheckOutDate(newCheckOut);
                    // Auto-calculate nights from today to the selected checkout date
                    if (newCheckOut) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const diff = Math.round((new Date(newCheckOut) - today) / 86400000);
                      const computedNights = diff > 0 ? diff : 1;
                      setWalkinRooms(prev => prev.map(r => ({ ...r, nights: computedNights })));
                    }
                  }}
                  className="input input-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-9 text-xs"
                />
              </div>

              {/* Initial Payment Settlement */}
              <div className="p-6 bg-brand-offwhite/50 dark:bg-brand-charcoal/30 border border-brand-beige/40 rounded-2xl space-y-4">
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block border-b border-brand-beige/35 pb-2">Initial Check-In Payment (Optional)</span>
                <div className="flex gap-4">
                  <div className="form-control w-1/2">
                    <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Payment Method</span></label>
                    <select
                      value={walkinInitialPayment.paymentType}
                      onChange={(e) => setWalkinInitialPayment({ ...walkinInitialPayment, paymentType: e.target.value })}
                      className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                    >
                      <option value="">Select Method</option>
                      {paymentTypes.map(pt => (
                        <option key={pt._id} value={pt.name}>{pt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control w-1/2">
                    <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Amount</span></label>
                    <input
                      type="number"
                      value={walkinInitialPayment.amount}
                      onChange={(e) => setWalkinInitialPayment({ ...walkinInitialPayment, amount: Number(e.target.value) })}
                      className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>
                <div className="form-control w-full">
                  <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Transaction Reference</span></label>
                  <input
                    type="text"
                    value={walkinInitialPayment.transactionRef}
                    onChange={(e) => setWalkinInitialPayment({ ...walkinInitialPayment, transactionRef: e.target.value })}
                    className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8 text-xs"
                    placeholder="e.g. Card Ref, Cash Receipt No"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button
                type="button"
                onClick={() => setIsWalkinModalOpen(false)}
                className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWalkInCheckinSubmit}
                className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md"
                disabled={isWalkinSubmitting}
              >
                {isWalkinSubmitting ? "Processing..." : "Check In Guest"}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Inline New Reservation Modal */}
      {isNewResModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-3xl rounded-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <div>
                <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">New Reservation</h3>
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest font-mono">Book and assign rooms for future stays</span>
              </div>
              <button
                onClick={() => setIsNewResModalOpen(false)}
                className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige dark:hover:bg-brand-offwhite/10"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto text-xs font-bold text-brand-sage">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Select Customer *</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newResPhoneSearch}
                    onChange={(e) => {
                      setNewResPhoneSearch(e.target.value);
                      setSelectedNewResCust(null);
                      setNewResFormData({ ...newResFormData, customer: "" });
                      setNewResCustSearchResults([]);
                    }}
                    placeholder="Search by phone number (e.g. 01700000000)"
                    className="input input-bordered input-xs h-9 border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary flex-1 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  />
                  <button
                    type="button"
                    onClick={handleNewResSearchCustomer}
                    disabled={newResCustSearchLoading}
                    className="btn bg-brand-primary hover:bg-brand-secondary text-white border-none px-6 btn-xs h-9 font-bold uppercase tracking-widest"
                  >
                    {newResCustSearchLoading ? "..." : "Search"}
                  </button>
                </div>

                {newResCustSearchResults.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 dark:bg-brand-charcoal/30 border border-brand-beige/50 dark:border-brand-beige/20 rounded-lg">
                    <div className="text-[10px] font-bold text-brand-sage uppercase tracking-wider">Search Results</div>
                    {newResCustSearchResults.map((cust) => {
                      const score = calculateCompleteness(cust);
                      const badgeClass = score <= 3
                        ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                        : score <= 7
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                          : score <= 9
                            ? "bg-lime-50 text-lime-600 dark:bg-lime-950/30 dark:text-lime-400 border border-lime-200 dark:border-lime-900/50"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";

                      return (
                        <div key={cust._id} className="flex justify-between items-center bg-white dark:bg-brand-charcoal p-2 rounded-lg border border-brand-beige/30 dark:border-brand-beige/10">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800 dark:text-brand-offwhite">{cust.fullName}</span>
                            <span className="text-xs text-brand-sage font-mono">{cust.phoneNumber}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                Profile: {score}/10
                              </span>
                              <div className="w-12 bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${score <= 3 ? "bg-red-500" : score <= 7 ? "bg-amber-500" : score <= 9 ? "bg-lime-500" : "bg-emerald-500"
                                    }`}
                                  style={{ width: `${score * 10}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectNewResCust(cust)}
                            className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none px-3"
                          >
                            Select
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => { setNewResCustSearchResults([]); setIsNewResCustModalOpen(true); }}
                      className="text-xs text-blue-500 font-bold hover:underline self-start mt-1 cursor-pointer"
                    >
                      + Add New Customer
                    </button>
                  </div>
                )}

                {selectedNewResCust && newResCustSearchResults.length === 0 && (() => {
                  const score = calculateCompleteness(selectedNewResCust);
                  const badgeClass = score <= 3
                    ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                    : score <= 7
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                      : score <= 9
                        ? "bg-lime-50 text-lime-600 dark:bg-lime-950/30 dark:text-lime-400 border border-lime-200 dark:border-lime-900/50"
                        : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";

                  return (
                    <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 p-3 rounded-lg border border-brand-beige dark:border-brand-beige/20 mt-2 flex justify-between items-center text-brand-charcoal dark:text-brand-offwhite">
                      <div>
                        <div className="text-[10px] text-brand-sage font-bold uppercase tracking-widest mb-1">Selected Guest</div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          {selectedNewResCust.fullName}
                          <button
                            type="button"
                            onClick={() => {
                              setNewResCustToEdit(selectedNewResCust);
                              setIsNewResCustModalOpen(true);
                            }}
                            className="btn btn-ghost btn-xs text-brand-primary p-0 h-auto hover:bg-transparent"
                            title="Edit Profile"
                          >
                            <FiEdit size={14} />
                          </button>
                        </div>
                        <div className="text-xs text-brand-sage font-mono">{selectedNewResCust.phoneNumber}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                            Profile: {score}/10
                          </span>
                          <div className="w-12 bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${score <= 3 ? "bg-red-500" : score <= 7 ? "bg-amber-500" : score <= 9 ? "bg-lime-500" : "bg-emerald-500"
                                }`}
                              style={{ width: `${score * 10}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNewResCust(null);
                          setNewResFormData({ ...newResFormData, customer: "" });
                          setNewResPhoneSearch("");
                        }}
                        className="text-xs text-red-500 hover:underline font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Checkin / Checkout dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Check-In Date *</span></label>
                  <input
                    type="date"
                    value={newResFormData.checkInDate}
                    onChange={(e) => {
                      const newCheckIn = e.target.value;
                      const checkOut = newResFormData.checkOutDate;
                      let computedNights = 1;
                      if (newCheckIn && checkOut) {
                        const diff = Math.round((new Date(checkOut) - new Date(newCheckIn)) / 86400000);
                        if (diff > 0) computedNights = diff;
                      }
                      setNewResFormData(prev => ({
                        ...prev,
                        checkInDate: newCheckIn,
                        rooms: prev.rooms.map(r => ({ ...r, nights: computedNights }))
                      }));
                    }}
                    className="input input-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-9 text-xs"
                  />
                </div>
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Expected Check-Out Date *</span></label>
                  <input
                    type="date"
                    value={newResFormData.checkOutDate}
                    onChange={(e) => {
                      const newCheckOut = e.target.value;
                      const checkIn = newResFormData.checkInDate;
                      let computedNights = 1;
                      if (checkIn && newCheckOut) {
                        const diff = Math.round((new Date(newCheckOut) - new Date(checkIn)) / 86400000);
                        if (diff > 0) computedNights = diff;
                      }
                      setNewResFormData(prev => ({
                        ...prev,
                        checkOutDate: newCheckOut,
                        rooms: prev.rooms.map(r => ({ ...r, nights: computedNights }))
                      }));
                    }}
                    className="input input-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-9 text-xs"
                  />
                </div>
              </div>

              {/* Source & Booking status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="form-control w-full">
                  <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Booking Source</span></label>
                  <select
                    value={newResFormData.bookingSource}
                    onChange={(e) => setNewResFormData({ ...newResFormData, bookingSource: e.target.value })}
                    className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                  >
                    <option value="Walk-in">Walk-in</option>
                    <option value="Phone Booking">Phone Booking</option>
                    <option value="OTA (Online Agent)">OTA (Online Agent)</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Resort Website">Resort Website</option>
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Reservation Status</span></label>
                  <select
                    value={newResFormData.status}
                    onChange={(e) => setNewResFormData({ ...newResFormData, status: e.target.value })}
                    className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                  >
                    <option value="Draft">Draft (Unconfirmed)</option>
                    <option value="Confirmed">Confirmed (Pre-Paid)</option>
                    <option value="Hold">Hold / Waitlist</option>
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Special Notes</span></label>
                  <input
                    type="text"
                    value={newResFormData.notes}
                    onChange={(e) => setNewResFormData({ ...newResFormData, notes: e.target.value })}
                    className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8 text-xs"
                    placeholder="e.g. high floor, honeymoon setup"
                  />
                </div>
              </div>

              {/* Rooms Selection */}
              <div className="space-y-4 pt-4 border-t border-brand-beige/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest">Assign Rooms & Rates</span>
                  <button type="button" onClick={handleNewResAddRoomRow} className="btn btn-xs bg-brand-primary text-white border-none rounded-full px-3 gap-1">
                    <FiPlus /> Add Room
                  </button>
                </div>

                {newResFormData.rooms.map((r, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-3 p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige dark:border-brand-beige/15 rounded-xl">
                    <div className="form-control w-[140px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Room Type</span></label>
                      <select
                        value={r.roomType}
                        onChange={(e) => handleNewResRoomRowChange(index, "roomType", e.target.value)}
                        className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                      >
                        <option value="">Select Type</option>
                        {roomTypes.map(rt => (
                          <option key={rt._id} value={rt.name}>{rt.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control w-[140px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Assign Specific Room</span></label>
                      <select
                        value={r.room}
                        onChange={(e) => handleNewResRoomRowChange(index, "room", e.target.value)}
                        className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                      >
                        <option value="">Auto Assign Room</option>
                        {availableRooms
                          .filter(rm => !r.roomType || rm.roomType === r.roomType)
                          .map(rm => (
                            <option key={rm._id} value={rm._id}>{rm.roomNumber} ({getRoomStatusLabel(rm.status)}) ({rm.roomType})</option>
                          ))}
                      </select>
                    </div>

                    <div className="form-control w-[160px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Meal Plan</span></label>
                      <select
                        value={r.mealPlan}
                        onChange={(e) => handleNewResRoomRowChange(index, "mealPlan", e.target.value)}
                        className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                      >
                        <option value="Room Only">Room Only</option>
                        <option value="Breakfast Included">Breakfast Included</option>
                        <option value="All-Day Food Included">All-Day Food Included</option>
                      </select>
                    </div>

                    <div className="form-control w-[100px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Nightly Rate</span></label>
                      <input
                        type="number"
                        value={r.nightlyRate}
                        onChange={(e) => handleNewResRoomRowChange(index, "nightlyRate", Number(e.target.value))}
                        className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                        min="0"
                      />
                    </div>

                    <div className="form-control w-[60px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Nights</span></label>
                      <input
                        type="number"
                        value={r.nights}
                        onChange={(e) => handleNewResRoomRowChange(index, "nights", Number(e.target.value))}
                        className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                        min="1"
                      />
                    </div>

                    <div className="form-control w-[60px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Adults</span></label>
                      <input
                        type="number"
                        value={r.adults}
                        onChange={(e) => handleNewResRoomRowChange(index, "adults", Number(e.target.value))}
                        className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                        min="1"
                      />
                    </div>

                    <div className="form-control w-[60px]">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Children</span></label>
                      <input
                        type="number"
                        value={r.children}
                        onChange={(e) => handleNewResRoomRowChange(index, "children", Number(e.target.value))}
                        className="input input-bordered input-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                        min="0"
                      />
                    </div>

                    <button type="button" onClick={() => handleNewResRemoveRoomRow(index)} className="btn btn-square btn-outline btn-xs btn-error flex items-center justify-center h-8 w-8 cursor-pointer" disabled={newResFormData.rooms.length === 1}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button
                type="button"
                onClick={() => setIsNewResModalOpen(false)}
                className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNewReservationSubmit}
                className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md"
                disabled={isNewResSubmitting}
              >
                {isNewResSubmitting ? "Processing..." : "Save Reservation"}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Customer Quick Registration Overlay */}
      <CustomerModal
        isOpen={isWalkinCustModalOpen}
        onClose={() => {
          setIsWalkinCustModalOpen(false);
          setWalkinCustToEdit(null);
        }}
        initialPhoneNumber={walkinPhoneSearch}
        customerToEdit={walkinCustToEdit}
        onSuccess={async (updatedCust) => {
          if (walkinCustToEdit) {
            setSelectedWalkinCust(updatedCust);
            setWalkinCustSearchResults(prev => prev.map(c => c._id === updatedCust._id ? updatedCust : c));
          } else {
            handleWalkinCustomerCreateSuccess(updatedCust);
          }
          setWalkinCustToEdit(null);
        }}
      />

      <CustomerModal
        isOpen={isNewResCustModalOpen}
        onClose={() => {
          setIsNewResCustModalOpen(false);
          setNewResCustToEdit(null);
        }}
        initialPhoneNumber={newResPhoneSearch}
        customerToEdit={newResCustToEdit}
        onSuccess={async (updatedCust) => {
          if (newResCustToEdit) {
            setSelectedNewResCust(updatedCust);
            setNewResCustSearchResults(prev => prev.map(c => c._id === updatedCust._id ? updatedCust : c));
          } else {
            handleNewResCustomerCreateSuccess(updatedCust);
          }
          setNewResCustToEdit(null);
        }}
      />

      {/* Hidden print container for Guest Food & Service Summary */}
      <div style={{ display: "none" }}>
        {foodServicePrintData && (
          <PrintReportTemplate
            ref={foodServicePrintRef}
            title={`Food & Service Summary - ${foodServicePrintData.stayNo}`}
            subtitle={`Summary of all room service foods and resort services received by ${foodServicePrintData.customer?.fullName || "Guest"}`}
            dateRange={`Check-in: ${new Date(foodServicePrintData.checkInDate).toLocaleDateString("en-GB")} to Expected Check-out: ${new Date(foodServicePrintData.expectedCheckOutDate).toLocaleDateString("en-GB")}`}
          >
            <div style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", fontSize: "12px" }}>
              <strong>Customer Name:</strong> {foodServicePrintData.customer?.fullName} &nbsp;|&nbsp;
              <strong>Email:</strong> {foodServicePrintData.customer?.emailAddress || "N/A"} &nbsp;|&nbsp;
              <strong>Phone:</strong> {foodServicePrintData.customer?.phoneNumber || "N/A"} &nbsp;|&nbsp;
              <strong>Assigned Rooms:</strong> {foodServicePrintData.rooms?.map(r => r.room?.roomNumber).join(", ")}
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "2px solid #333", paddingBottom: "5px", marginBottom: "10px", marginTop: "20px" }}>
              FOOD ORDERS RECEIVED
            </h3>
            {detailedFoodOrders.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#666" }}>No food orders recorded.</p>
            ) : (
              <table className="print-table" style={{ marginBottom: "20px" }}>
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Food Item</th>
                    <th style={{ textAlign: "right" }}>Quantity</th>
                    <th style={{ textAlign: "right" }}>Unit Price</th>
                    <th style={{ textAlign: "right" }}>Taxes (VAT/SC/SD)</th>
                    <th style={{ textAlign: "right" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedFoodOrders.map((order) =>
                    order.items?.map((item, itemIdx) => {
                      const subtotal = item.unitPrice * item.quantity;
                      const vat = (subtotal * (item.vat || 0)) / 100;
                      const sc = (subtotal * (item.sc || 0)) / 100;
                      const sd = (subtotal * (item.sd || 0)) / 100;
                      const totalItemCost = subtotal + vat + sc + sd;
                      return (
                        <tr key={`${order._id}-${itemIdx}`}>
                          <td>{new Date(order.createdAt).toLocaleString("en-GB")}</td>
                          <td style={{ fontWeight: "bold" }}>{item.foodItem?.foodName || "Unknown Food"}</td>
                          <td style={{ textAlign: "right" }}>{item.quantity}</td>
                          <td style={{ textAlign: "right" }}>৳{item.unitPrice.toFixed(2)}</td>
                          <td style={{ textAlign: "right" }}>
                            ৳{(vat + sc + sd).toFixed(2)} ({item.vat || 0}%/{item.sc || 0}%/{item.sd || 0}%)
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "bold" }}>৳{totalItemCost.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "2px solid #333", paddingBottom: "5px", marginBottom: "10px", marginTop: "20px" }}>
              RESORT SERVICES RECEIVED
            </h3>
            {detailedServiceOrders.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#666" }}>No service orders recorded.</p>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Service Name</th>
                    <th style={{ textAlign: "right" }}>Price / Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedServiceOrders.map((order, idx) => {
                    const vat = (order.price * (order.vat || 0)) / 100;
                    const sc = (order.price * (order.sc || 0)) / 100;
                    const sd = (order.price * (order.sd || 0)) / 100;
                    const totalServiceCost = order.price + vat + sc + sd;
                    return (
                      <tr key={order._id || idx}>
                        <td>{new Date(order.createdAt).toLocaleString("en-GB")}</td>
                        <td style={{ fontWeight: "bold" }}>{order.service?.serviceName || "Unknown Service"}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold" }}>৳{totalServiceCost.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </PrintReportTemplate>
        )}
      </div>

      {/* Room Status Modal Selection */}
      {isStatusModalOpen && selectedStatusRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-brand-beige/25 dark:border-zinc-850 animate-scale-in mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-gray-800 dark:text-zinc-100 uppercase tracking-wider">
                Room {selectedStatusRoom.roomNumber} Status
              </h3>
              <button
                onClick={() => {
                  setIsStatusModalOpen(false);
                  setSelectedStatusRoom(null);
                }}
                className="text-gray-450 hover:text-gray-600 dark:hover:text-zinc-350 font-bold text-sm cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {["Available", "Occupied", "Reserved", "Cleaning", "Maintenance"].map((status) => {
                const isSelected = selectedStatusRoom.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => handleUpdateStatus(status)}
                    className={`p-3.5 rounded-xl border font-bold text-sm text-center cursor-pointer transition-all hover:scale-[1.02]
                      ${isSelected
                        ? "bg-brand-primary border-brand-primary text-white"
                        : "border-gray-200 dark:border-zinc-800 bg-gray-50 hover:bg-brand-primary/10 hover:border-brand-primary dark:bg-zinc-800 dark:hover:bg-brand-primary/20 dark:hover:border-brand-primary text-gray-700 dark:text-zinc-300"}`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* View Restaurant Invoice Details Modal */}
      {viewingInvoice && (
        <dialog className="modal modal-open z-[99999] bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/25 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto animate-scale-in text-brand-charcoal dark:text-brand-offwhite">
            <button
              onClick={() => setViewingInvoice(null)}
              className="absolute top-4 right-4 text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite cursor-pointer bg-transparent border-none"
            >
              <FiX size={20} />
            </button>

            <h3 className="text-lg font-black text-brand-charcoal dark:text-brand-offwhite uppercase tracking-widest flex items-center gap-2 mb-2">
              <FiFileText className="text-brand-primary" /> POS Invoice Details
            </h3>
            <p className="text-xs font-bold text-brand-sage mb-4">
              Invoice Serial: {viewingInvoice.invoiceSerial || viewingInvoice.invoiceNo}
            </p>

            <div className="grid grid-cols-2 gap-4 border-b border-brand-beige/20 dark:border-brand-beige/10 pb-4 mb-4 text-xs font-semibold">
              <div>
                <p className="text-brand-sage uppercase tracking-wider">DateTime</p>
                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold">
                  {new Date(viewingInvoice.dateTime || viewingInvoice.createdAt).toLocaleString("en-GB")}
                </p>
              </div>
              <div>
                <p className="text-brand-sage uppercase tracking-wider">Guest</p>
                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold">
                  {viewingInvoice.customerName || viewingInvoice.customer?.name || "Walk-in Guest"}
                </p>
              </div>
              <div>
                <p className="text-brand-sage uppercase tracking-wider">Order Type</p>
                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold uppercase">
                  {viewingInvoice.orderType}
                </p>
              </div>
              <div>
                <p className="text-brand-sage uppercase tracking-wider">Payment Status</p>
                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-extrabold uppercase">
                  {viewingInvoice.paymentStatus || "Unpaid"}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <h4 className="text-xs font-extrabold text-brand-sage mb-2 uppercase tracking-widest">Order Items</h4>
              <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 border border-brand-beige/25 dark:border-brand-beige/10 rounded-2xl p-4">
                <table className="min-w-full text-xs font-semibold text-brand-charcoal dark:text-brand-offwhite">
                  <thead>
                    <tr className="border-b border-brand-beige dark:border-brand-beige/20 text-brand-sage uppercase text-[10px] tracking-wider">
                      <th className="text-left pb-2">Item Name</th>
                      <th className="text-center pb-2">Qty</th>
                      <th className="text-right pb-2">Rate</th>
                      <th className="text-right pb-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(viewingInvoice.products) && viewingInvoice.products.length > 0 ? (
                      viewingInvoice.products.map((item, index) => (
                        <tr key={index} className="border-b border-brand-beige/10">
                          <td className="py-2 text-left">{item.productName || item.foodName}</td>
                          <td className="py-2 text-center font-extrabold">{item.qty || item.quantity}</td>
                          <td className="py-2 text-right">৳ {(item.rate || item.unitPrice || 0).toFixed(0)}</td>
                          <td className="py-2 text-right">৳ {(item.subtotal || item.totalPrice || 0).toFixed(0)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-4">No items listed.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations */}
            <div className="flex flex-col items-end gap-1.5 text-xs font-semibold border-t border-brand-beige/25 dark:border-brand-beige/10 pt-4 mb-6">
              <p>Subtotal: ৳ {(viewingInvoice.subtotal || viewingInvoice.subTotal || 0).toFixed(0)}</p>
              {viewingInvoice.discount > 0 && <p className="text-green-600">Discount: -৳ {viewingInvoice.discount.toFixed(0)}</p>}
              {viewingInvoice.vat > 0 && <p>VAT: ৳ {viewingInvoice.vat.toFixed(0)}</p>}
              {viewingInvoice.sd > 0 && <p>SD: ৳ {viewingInvoice.sd.toFixed(0)}</p>}
              {viewingInvoice.serviceCharge > 0 && <p>Service Charge: ৳ {viewingInvoice.serviceCharge.toFixed(0)}</p>}
              {viewingInvoice.deliveryCharge > 0 && <p>Delivery Charge: ৳ {viewingInvoice.deliveryCharge.toFixed(0)}</p>}
              <p className="font-extrabold text-brand-primary dark:text-brand-sage text-sm mt-1">
                Total Amount: ৳ {(viewingInvoice.totalAmount || viewingInvoice.grandTotal || 0).toFixed(0)}
              </p>
            </div>

            {/* View Modal Actions */}
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setViewingInvoice(null)}
                className="btn btn-sm bg-transparent hover:bg-brand-beige/25 text-brand-sage font-bold text-[10px] uppercase tracking-wider px-4 py-2 cursor-pointer border-none shadow-none"
              >
                Close
              </button>
              <button
                onClick={() => handlePrintInvoiceAction("thermal")}
                className="btn btn-sm bg-[#1e293b] hover:bg-[#1e293b]/90 text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-3 shadow flex items-center gap-1"
                title="Print Thermal Receipt (80mm)"
              >
                <FiPrinter /> Thermal Print
              </button>
              <button
                onClick={() => handlePrintInvoiceAction("a4")}
                className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-3 shadow flex items-center gap-1"
                title="Print A4 Invoice Page"
              >
                <FiPrinter /> A4 Print
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Global/Hidden POS receipt print containers */}
      <div className="hidden">
        {invoicePrintData && (
          <>
            <ReceiptTemplate
              ref={receiptRef}
              profileData={company}
              invoiceData={invoicePrintData}
            />
            <A4ReceiptTemplate
              ref={a4ReceiptRef}
              profileData={company}
              invoiceData={invoicePrintData}
            />
          </>
        )}
      </div>

      {/* Loading Backdrop for fetching invoices */}
      {isInvoiceLoading && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
        </div>
      )}
    </div>
  );
};

export default FrontDeskTimelinePage;
