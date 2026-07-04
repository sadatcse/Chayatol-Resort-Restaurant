"use client";

import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { FiEye, FiX, FiSearch, FiPlus, FiArrowRight, FiBriefcase, FiDollarSign, FiClock, FiFileText, FiPrinter } from "react-icons/fi";
import { MdRestaurant } from "react-icons/md";
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
import useStays from "@/hooks/useStays";
import { AuthContext } from "@/providers/AuthProvider";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

const StaysPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const searchParams = useSearchParams();
  const stayId = searchParams.get("stayId");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState("In House"); // Default to showing currently in house guests

  // Generate list of the last 12 months dynamically
  const monthOptions = useMemo(() => {
    const options = [];
    const date = new Date();
    date.setDate(1); // Set to day 1 to avoid rollover bugs when subtracting months
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

  const handleMonthChange = (e) => {
    const val = e.target.value;
    setSelectedMonth(val);
    setCurrentPage(1);
    setSelectedStay(null);

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

  const { stays, totalPages, totalItems, isLoading, refetch } = useStays(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    statusFilter,
    fromDate,
    toDate
  );

  // Loaded metadata for postings
  const [foodMenu, setFoodMenu] = useState([]);
  const [services, setServices] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [foodCategories, setFoodCategories] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);

  // Selected categories in modals
  const [selectedFoodCategory, setSelectedFoodCategory] = useState("");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");

  // Selected guest stay detail
  const [selectedStay, setSelectedStay] = useState(null);
  const [folioEntries, setFolioEntries] = useState([]);
  const [isFolioLoading, setIsFolioLoading] = useState(false);

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Print Food & Service Summary states
  const [foodServicePrintData, setFoodServicePrintData] = useState(null);
  const [detailedFoodOrders, setDetailedFoodOrders] = useState([]);
  const [detailedServiceOrders, setDetailedServiceOrders] = useState([]);

  const {
    printRef: foodServicePrintRef,
    handlePrint: handleFoodServicePrint
  } = useStandardPrint({
    documentTitle: `Food_Service_Summary_${selectedStay?.stayNo || "Report"}`,
    onAfterPrint: () => setFoodServicePrintData(null)
  });

  // Status counts states
  const [inHouseCount, setInHouseCount] = useState(0);
  const [extendedCount, setExtendedCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    try {
      const baseParams = {};
      if (debouncedSearchTerm) baseParams.search = debouncedSearchTerm;
      if (fromDate) baseParams.from = fromDate.toISOString();
      if (toDate) baseParams.to = toDate.toISOString();

      const [inHouseRes, extendedRes] = await Promise.all([
        axiosSecure.get("/stays", { params: { ...baseParams, status: "In House", limit: 1 } }),
        axiosSecure.get("/stays", { params: { ...baseParams, status: "Extended", limit: 1 } })
      ]);
      setInHouseCount(inHouseRes.data?.total || 0);
      setExtendedCount(extendedRes.data?.total || 0);
    } catch (err) {
      console.error("Failed to fetch stays status counts:", err);
    }
  }, [axiosSecure, debouncedSearchTerm, fromDate, toDate]);

  useEffect(() => {
    if (currentUser) {
      fetchCounts();
    }
  }, [fetchCounts, currentUser, stays]);

  const {
    printData: exportStays,
    setPrintData: setExportStays,
    printRef,
    handlePrint
  } = useStandardPrint({
    documentTitle: "Stay_and_Folio_Report",
    onAfterPrint: () => setIsExporting(false)
  });

  const {
    printData: folioPrintRes,
    setPrintData: setFolioPrintRes,
    printRef: folioPrintRef,
    handlePrint: handleFolioPrint
  } = useStandardPrint({
    documentTitle: `Folio_Ledger_${selectedStay?.stayNo || "Report"}`
  });

  const {
    printData: customerPrintRes,
    setPrintData: setCustomerPrintRes,
    printRef: customerPrintRef,
    handlePrint: handleCustomerPrint
  } = useStandardPrint({
    documentTitle: `Customer_Profile_${selectedStay?.customer?.fullName || "Report"}`
  });

  // Posting modals state
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [foodFormData, setFoodFormData] = useState({ foodItem: "", quantity: 1, isChargeable: true });

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({ serviceId: "", isChargeable: true });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({ paymentType: "", amount: "", transactionRef: "", notes: "" });

  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendFormData, setExtendFormData] = useState({ newCheckOutDate: "" });

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutPayment, setCheckoutPayment] = useState({ paymentType: "", amount: "", transactionRef: "" });

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountFormData, setDiscountFormData] = useState({ discountType: "percentage", value: "", applyTo: "all", reason: "" });

  useEffect(() => {
    const fetchPostingData = async () => {
      try {
        const [foodRes, serviceRes, payRes, foodCatRes, serviceCatRes] = await Promise.all([
          axiosSecure.get("/food/get?limit=10000"),
          axiosSecure.get("/resort-service/get"),
          axiosSecure.get("/paymenttype"),
          axiosSecure.get("/category"),
          axiosSecure.get("/resort-service-category/get")
        ]);
        setFoodMenu(foodRes.data?.data || foodRes.data || []);
        setServices(serviceRes.data?.data || serviceRes.data || []);
        setPaymentTypes(payRes.data || []);
        setFoodCategories(foodCatRes.data || []);
        setServiceCategories(serviceCatRes.data || []);
      } catch (err) {
        console.error("Error loading posting dropdown details:", err);
      }
    };
    if (currentUser) {
      fetchPostingData();
    }
  }, [axiosSecure, currentUser]);

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

  const handleSelectStay = async (stay) => {
    setSelectedStay(stay);
    await fetchFolio(stay._id);
  };

  useEffect(() => {
    if (stayId) {
      const loadStayFromUrl = async () => {
        try {
          const { data } = await axiosSecure.get(`/stays/${stayId}`);
          if (data) {
            setSelectedMonth("all");
            setFromDate(null);
            setToDate(null);
            setStatusFilter(""); // Clear status filter to show in table
            setSearchTerm(data.stayNo); // Search for this stay specifically
            setSelectedStay(data);
            fetchFolio(stayId);
            window.history.replaceState(null, "", "/dashboard/stays");
          }
        } catch (err) {
          console.error("Failed to load stay from query param:", err);
        }
      };
      loadStayFromUrl();
    }
  }, [stayId, axiosSecure]);

  // Folio calculations
  const totalDebit = folioEntries.reduce((acc, entry) => acc + (entry.debit || 0), 0);
  const totalCredit = folioEntries.reduce((acc, entry) => acc + (entry.credit || 0), 0);
  const outstandingDue = totalDebit - totalCredit;

  // Add Direct Ledger Postings & Export Operations
  const fetchAllStaysForExport = async () => {
    try {
      let url = `/stays?page=1&limit=99999&search=${debouncedSearchTerm}&status=${statusFilter}`;
      if (fromDate) url += `&from=${fromDate.toISOString()}`;
      if (toDate) url += `&to=${toDate.toISOString()}`;
      const response = await axiosSecure.get(url);
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch stays for export:", error);
      return [];
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllStaysForExport();
      const formatted = data.map((r, idx) => ({
        "Sl": idx + 1,
        "Stay No": r.stayNo,
        "Customer Name": r.customer?.fullName || "N/A",
        "Phone": r.customer?.phoneNumber || "N/A",
        "Email": r.customer?.email || "N/A",
        "Rooms": r.rooms?.map(rm => rm.room?.roomNumber).join(", ") || "N/A",
        "Check-In Date": r.checkInDate ? new Date(r.checkInDate).toLocaleDateString("en-GB") : "N/A",
        "Expected Check-Out": r.expectedCheckOutDate ? new Date(r.expectedCheckOutDate).toLocaleDateString("en-GB") : "N/A",
        "Actual Check-Out": r.actualCheckOutDate ? new Date(r.actualCheckOutDate).toLocaleDateString("en-GB") : "N/A",
        "Status": r.status,
      }));
      exportToExcel(formatted, "Stay_and_Folio_Report");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllStaysForExport();
      const formatted = data.map((r, idx) => ({
        "Sl": idx + 1,
        "Stay No": r.stayNo,
        "Customer Name": r.customer?.fullName || "N/A",
        "Phone": r.customer?.phoneNumber || "N/A",
        "Email": r.customer?.email || "N/A",
        "Rooms": r.rooms?.map(rm => rm.room?.roomNumber).join(", ") || "N/A",
        "Check-In Date": r.checkInDate ? new Date(r.checkInDate).toLocaleDateString("en-GB") : "N/A",
        "Expected Check-Out": r.expectedCheckOutDate ? new Date(r.expectedCheckOutDate).toLocaleDateString("en-GB") : "N/A",
        "Actual Check-Out": r.actualCheckOutDate ? new Date(r.actualCheckOutDate).toLocaleDateString("en-GB") : "N/A",
        "Status": r.status,
      }));
      exportToCsv(formatted, "Stay_and_Folio_Report");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintReport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchAllStaysForExport();
      setExportStays(data);
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

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

  const handlePrintFolioReport = () => {
    setFolioPrintRes(selectedStay);
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
      Swal.fire("Food Posted", "Food charge added to guest folio ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post food charge", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostService = async () => {
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
      Swal.fire("Service Posted", "Service charge added to guest folio ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post service charge", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostPayment = async () => {
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
      Swal.fire("Payment Recorded", "Payment credited to guest ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post payment", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleExtendStay = async () => {
    if (isPosting) return;
    if (!extendFormData.newCheckOutDate) {
      Swal.fire("Error", "Please select a check-out date.", "warning");
      return;
    }
    setIsPosting(true);
    try {
      const { data } = await axiosSecure.post(`/stays/${selectedStay._id}/extend`, {
        newCheckOutDate: extendFormData.newCheckOutDate
      });
      // Refresh current stay state
      setSelectedStay(data);
      await fetchFolio(selectedStay._id);
      setIsExtendModalOpen(false);
      setExtendFormData({ newCheckOutDate: "" });
      refetch();
      Swal.fire("Stay Extended", "Stay extended and additional night charges posted.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to extend stay", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleCheckoutGuest = async () => {
    if (isPosting) return;
    // Checkout payload: final payment list
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
        payments: checkPaymentList
      });
      
      // Fetch latest folio entries to reflect checkout settlement payment on the final printed bill
      await fetchFolio(selectedStay._id);

      Swal.fire({
        title: "Checked Out",
        text: "Guest stay checkout finalized. Room status changed to cleaning. The final bill will now print.",
        icon: "success",
        confirmButtonText: "OK"
      }).then(() => {
        setFolioPrintRes(selectedStay);
        setIsCheckoutModalOpen(false);
        setSelectedStay(null);
        setCheckoutPayment({ paymentType: "", amount: "", transactionRef: "" });
        refetch();
      });
    } catch (err) {
      Swal.fire("Failed Checkout", err.response?.data?.message || "Failed to checkout guest.", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostDiscount = async () => {
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
      Swal.fire("Discount Posted", "Discount adjustment credited to guest ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post discount", "error");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="Stay & Folio Management"
        subtitle="Track active in-house guests, update folios with food & service charges, extend stays, and settle checkout balances."
      />

      {/* Filter controls panel */}
      <div className="bg-white dark:bg-brand-charcoal p-5 rounded-2xl border border-brand-beige dark:border-brand-beige/20 shadow-sm mb-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Monthly Selector */}
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-full h-11 text-xs font-semibold px-4 w-full sm:w-44 text-brand-charcoal dark:text-brand-offwhite border-brand-beige shadow-sm"
          >
            <option value="all">All Months</option>
            {monthOptions.map((opt) => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                {opt.label}
              </option>
            ))}
            <option value="custom" disabled={selectedMonth !== "custom"}>Custom Range</option>
          </select>

          <DatePicker selected={fromDate} onChange={(d) => { setFromDate(d); setCurrentPage(1); setSelectedStay(null); }}
            dateFormat="dd/MM/yyyy" placeholderText="From Date" isClearable 
            wrapperClassName="!w-auto inline-block"
            className="input input-bordered border-brand-primary focus:outline-none bg-white dark:bg-brand-charcoal/50 rounded-full h-11 text-xs font-semibold px-4 w-full sm:w-36 text-center text-brand-charcoal dark:text-brand-offwhite border-brand-beige shadow-sm" />

          <DatePicker selected={toDate} onChange={(d) => { setToDate(d); setCurrentPage(1); setSelectedStay(null); }}
            dateFormat="dd/MM/yyyy" placeholderText="To Date" isClearable 
            wrapperClassName="!w-auto inline-block"
            className="input input-bordered border-brand-primary focus:outline-none bg-white dark:bg-brand-charcoal/50 rounded-full h-11 text-xs font-semibold px-4 w-full sm:w-36 text-center text-brand-charcoal dark:text-brand-offwhite border-brand-beige shadow-sm" />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
              setSelectedStay(null);
            }}
            className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite rounded-full px-5 h-11 text-xs font-semibold w-full sm:w-40 border-brand-beige shadow-sm"
          >
            <option value="In House">In House</option>
            <option value="Checked Out">Checked Out</option>
            <option value="Extended">Extended</option>
            <option value="Cancelled">Cancelled</option>
            <option value="">All Statuses</option>
          </select>

          <label className="input input-bordered border-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 border-brand-beige dark:border-brand-beige/20 w-full sm:w-64 h-11 shadow-sm">
            <FiSearch className="text-brand-sage text-lg shrink-0" />
            <input
              type="text"
              className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none text-xs font-semibold"
              placeholder="Search Stay/Room/Guest..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
                setSelectedStay(null);
              }}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Stays List Table */}
        <div className={`${selectedStay ? "lg:col-span-6" : "lg:col-span-12"} transition-all duration-300`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden"
          >
            <div className="flex flex-wrap justify-between items-center p-5 border-b border-brand-beige dark:border-brand-beige/20 gap-4 bg-brand-offwhite/10 dark:bg-brand-charcoal/30">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-brand-sage uppercase tracking-widest">
                  Stays Directory ({totalItems} records)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-sage">
                  In House: {inHouseCount}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  Extended: {extendedCount}
                </span>
              </div>
              <ExportButtons
                onExportExcel={handleExportExcel}
                onExportCsv={handleExportCsv}
                onPrint={handlePrintReport}
                isLoading={isExporting}
              />
            </div>
            {isLoading ? (
              <div className="p-6">
                <MtableLoading />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige dark:border-brand-beige/20">
                    <tr>
                      <th className="pl-6 py-5">Stay No</th>
                      <th className="py-5">Customer</th>
                      <th className="py-5">Rooms</th>
                      <th className="py-5">Check-In / Out Dates</th>
                      <th className="py-5">Status</th>
                      <th className="pr-6 text-center py-5">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stays.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No stay records found.
                        </td>
                      </tr>
                    ) : (
                      stays.map((stay) => {
                        const statusColors = {
                          "In House": "bg-green-100 text-green-700",
                          "Checked Out": "bg-gray-100 text-gray-500",
                          Extended: "bg-blue-100 text-blue-700",
                          Cancelled: "bg-red-100 text-red-700"
                        };

                        return (
                          <tr
                            key={stay._id}
                            className={`hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none text-sm cursor-pointer ${selectedStay?._id === stay._id ? "bg-brand-offwhite/70 dark:bg-brand-offwhite/5" : "bg-white dark:bg-brand-charcoal"}`}
                            onClick={() => handleSelectStay(stay)}
                          >
                            <td className="pl-6 py-4 font-mono font-bold">{stay.stayNo}</td>
                            <td className="py-4">
                              <div className="font-bold">{stay.customer?.fullName}</div>
                            </td>
                            <td className="py-4 text-xs font-bold font-mono">
                              {stay.rooms?.map(r => r.room?.roomNumber).join(", ")}
                            </td>
                            <td className="py-4 text-xs font-bold text-brand-sage">
                              {formatDateTime(stay.checkInDate)} → {formatDateTime(stay.expectedCheckOutDate)}
                            </td>
                            <td className="py-4">
                              <span className={`badge badge-sm font-bold tracking-wider uppercase text-[10px] border-none ${statusColors[stay.status]}`}>
                                {stay.status}
                              </span>
                            </td>
                            <td className="pr-6 py-4 text-center">
                              <button className="btn btn-ghost btn-circle btn-xs text-brand-sage hover:text-brand-primary">
                                <FiEye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                <div className="p-5 border-t border-brand-beige bg-brand-offwhite/30 flex justify-center">
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
          </motion.div>
        </div>

        {/* Selected Stay Folio / Ledger View */}
        {selectedStay && (
          <div className="lg:col-span-6 transition-all duration-300">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 p-6 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-brand-beige pb-4">
                <div>
                  <h3 className="font-bold text-base uppercase tracking-wider text-brand-black dark:text-brand-offwhite">Folio Ledger</h3>
                  <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest font-mono">Guest Stay: {selectedStay.stayNo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ExportButtons
                    onExportExcel={handleExportFolioExcel}
                    onExportCsv={handleExportFolioCsv}
                    onPrint={() => setFolioPrintRes(selectedStay)}
                    isLoading={false}
                  />
                  <button
                    onClick={() => handlePrintFoodServiceSummary(selectedStay)}
                    className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none rounded px-3 h-7 flex items-center gap-1 shadow-sm uppercase tracking-widest font-bold text-[9px] cursor-pointer"
                    title="Print Food & Service Summary"
                  >
                    <FiPrinter size={11} /> Food & Service Print
                  </button>
                  <button onClick={() => setSelectedStay(null)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige">
                    <FiX size={20} />
                  </button>
                </div>
              </div>

              {/* Guest metadata short-block */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-brand-offwhite dark:bg-brand-charcoal/45 p-4 rounded-xl">
                <div>
                  <span className="text-brand-sage">Customer:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-sm">{selectedStay.customer?.fullName}</span>
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
                  <div className="font-bold font-mono">{selectedStay.rooms?.map(r => r.room?.roomNumber).join(", ")}</div>
                </div>
              </div>

              {/* Folio Ledger Entries List */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block">Account Entries</span>
                {isFolioLoading ? (
                  <MtableLoading />
                ) : (
                  <div className="max-h-[30vh] overflow-y-auto space-y-2 border border-brand-beige/40 dark:border-brand-beige/10 rounded-xl p-2">
                    {folioEntries.length === 0 ? (
                      <div className="p-6 text-center text-xs font-bold text-brand-sage uppercase tracking-widest">No ledger transactions posted.</div>
                    ) : (
                      <table className="table w-full text-xs">
                        <thead className="text-[9px] uppercase tracking-wider text-brand-sage">
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th className="text-right">Debit (+)</th>
                            <th className="text-right">Credit (-)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {folioEntries.map(entry => (
                            <tr key={entry._id} className="border-b border-brand-beige/10 last:border-none">
                              <td className="text-brand-sage text-[10px]">{new Date(entry.date).toLocaleDateString()}</td>
                              <td className="font-bold">{entry.description}</td>
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

              {/* running balance block */}
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
                <div className="grid grid-cols-2 gap-3 pt-2">
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
                  <button onClick={() => setIsExtendModalOpen(true)} className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2 col-span-2">
                    <FiClock /> Extend Stay
                  </button>
                  <button onClick={() => {
                    setCheckoutPayment({ paymentType: "", amount: outstandingDue > 0 ? outstandingDue : "", transactionRef: "" });
                    setIsCheckoutModalOpen(true);
                  }} className="btn btn-sm bg-brand-primary text-white border-none w-full col-span-2 rounded-full cursor-pointer mt-2 font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow">
                    Checkout Guest <FiArrowRight />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Post Food Order Modal */}
      {isFoodModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest">Post Food Order to Folio</span>
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
                  className="input input-bordered border-brand-primary w-full h-9"
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
              <span className="font-bold text-sm uppercase tracking-widest">Post Service Charge to Folio</span>
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
              <span className="font-bold text-sm uppercase tracking-widest">Post Direct Payment Credit</span>
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
                  className="input input-bordered border-brand-primary w-full h-9"
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Transaction Reference</span></label>
                <input
                  type="text"
                  value={paymentFormData.transactionRef}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, transactionRef: e.target.value })}
                  className="input input-bordered border-brand-primary w-full h-9"
                  placeholder="e.g. BKash trxID, Card Ref"
                />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Notes / Remarks</span></label>
                <input
                  type="text"
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="input input-bordered border-brand-primary w-full h-9"
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
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest">Extend Expected Check-Out</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">New Expected Check-Out Date</span></label>
                <input
                  type="date"
                  value={extendFormData.newCheckOutDate}
                  onChange={(e) => setExtendFormData({ newCheckOutDate: e.target.value })}
                  className="input input-bordered border-brand-primary w-full"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setIsExtendModalOpen(false)} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Cancel</button>
                <button onClick={handleExtendStay} disabled={isPosting} className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6 disabled:opacity-50">
                  {isPosting ? "Extending..." : "Extend Date"}
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

            <div className="p-8 space-y-4">
              {/* Checkout Bill Break-down info */}
              <div className="p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/25 rounded-2xl space-y-2 text-xs">
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block border-b border-brand-beige/20 pb-2">Folio Ledger Account Summary</span>
                <div className="flex justify-between">
                  <span>Room Charges (Debit):</span>
                  <span className="font-bold">৳{folioEntries.filter(e => e.type === "Room Charge").reduce((acc, e) => acc + e.debit, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Food Charges (Debit):</span>
                  <span className="font-bold">৳{folioEntries.filter(e => e.type === "Food Charge").reduce((acc, e) => acc + e.debit, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charges (Debit):</span>
                  <span className="font-bold">৳{folioEntries.filter(e => e.type === "Service Charge").reduce((acc, e) => acc + e.debit, 0).toFixed(2)}</span>
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
                <div className="p-4 bg-brand-offwhite/50 border border-brand-beige/20 rounded-2xl space-y-3">
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
              <div className="flex justify-end gap-2 pt-2">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-3/4 text-sm">
                  <div>
                    <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Full Name</span>
                    <span className="font-extrabold text-brand-charcoal dark:text-brand-offwhite">{selectedStay.customer.fullName}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-brand-beige/30">
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
              <div className="pt-4 border-t border-brand-beige/30 text-sm">
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
              <div className="pt-4 border-t border-brand-beige/30 text-sm">
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
                onClick={() => setCustomerPrintRes(selectedStay)} 
                className="btn bg-brand-primary hover:bg-brand-secondary text-white border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md"
              >
                Print Profile
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Hidden print container for Customer Profile Details */}
      {customerPrintRes && customerPrintRes.customer && (
        <div style={{ display: "none" }}>
          <PrintReportTemplate
            ref={customerPrintRef}
            title="Guest Information Profile Report"
            subtitle={`Customer Profile details for guest: ${customerPrintRes.customer.fullName}`}
            dateRange=""
          >
            <div style={{ display: "flex", gap: "30px", marginBottom: "30px", borderBottom: "1px solid #ccc", paddingBottom: "20px" }}>
              <div style={{ width: "120px" }}>
                {customerPrintRes.customer.customerPhoto ? (
                  <img src={customerPrintRes.customer.customerPhoto} alt="Photo" style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "4px" }} />
                ) : (
                  <div style={{ width: "120px", height: "120px", border: "1px solid #ccc", display: "flex", alignItems: "center", justifycontent: "center", fontWeight: "bold", fontSize: "40px", backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                    {customerPrintRes.customer.fullName?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 30px", width: "100%", fontSize: "12px" }}>
                <div><strong>Full Name:</strong> {customerPrintRes.customer.fullName}</div>
                <div><strong>Phone Number:</strong> {customerPrintRes.customer.phoneNumber}</div>
                <div><strong>Email Address:</strong> {customerPrintRes.customer.emailAddress || "N/A"}</div>
                <div><strong>Nationality:</strong> {customerPrintRes.customer.nationality || "Bangladeshi"}</div>
                <div><strong>Gender / Marital Status:</strong> {customerPrintRes.customer.gender} / {customerPrintRes.customer.maritalStatus}</div>
                <div><strong>Date of Birth:</strong> {customerPrintRes.customer.dateOfBirth ? new Date(customerPrintRes.customer.dateOfBirth).toLocaleDateString("en-GB") : "N/A"}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "30px", fontSize: "12px" }}>
              <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>IDENTIFICATION</h4>
                <p style={{ margin: "5px 0" }}><strong>ID Type:</strong> {customerPrintRes.customer.identificationType || "N/A"}</p>
                <p style={{ margin: "5px 0" }}><strong>ID Number:</strong> {customerPrintRes.customer.identificationNumber || "N/A"}</p>
              </div>

              <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>OCCUPATION INFO</h4>
                <p style={{ margin: "5px 0" }}><strong>Occupation:</strong> {customerPrintRes.customer.occupation || "N/A"}</p>
                <p style={{ margin: "5px 0" }}><strong>Company Name:</strong> {customerPrintRes.customer.companyName || "N/A"}</p>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px", marginBottom: "30px", fontSize: "12px" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>RESIDENTIAL ADDRESS</h4>
              {customerPrintRes.customer.address ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <p style={{ margin: "0" }}><strong>Street:</strong> {customerPrintRes.customer.address.line1} {customerPrintRes.customer.address.line2 || ""}</p>
                  <p style={{ margin: "0" }}><strong>City/Division/Country:</strong> {customerPrintRes.customer.address.city || "—"}, {customerPrintRes.customer.address.division || "—"}, {customerPrintRes.customer.address.country || "Bangladesh"}</p>
                </div>
              ) : (
                <p style={{ margin: "0", fontStyle: "italic" }}>No address provided.</p>
              )}
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "12px", marginBottom: "30px", fontSize: "12px" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#346E36", borderBottom: "1px solid #ddd", paddingBottom: "5px", fontSize: "13px" }}>EMERGENCY CONTACT</h4>
              {customerPrintRes.customer.emergencyContact ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                  <p style={{ margin: "0" }}><strong>Name:</strong> {customerPrintRes.customer.emergencyContact.name || "N/A"}</p>
                  <p style={{ margin: "0" }}><strong>Relation:</strong> {customerPrintRes.customer.emergencyContact.relation || "N/A"}</p>
                  <p style={{ margin: "0" }}><strong>Phone:</strong> {customerPrintRes.customer.emergencyContact.phoneNumber || "N/A"}</p>
                </div>
              ) : (
                <p style={{ margin: "0", fontStyle: "italic" }}>No emergency contact details provided.</p>
              )}
            </div>
          </PrintReportTemplate>
        </div>
      )}

      {/* Hidden print container for Stay directory list */}
      <div style={{ display: "none" }}>
        <PrintReportTemplate
          ref={printRef}
          title="Guest Stays Directory Report"
          subtitle="Resort Guest Stay Records & Statuses"
          dateRange={
            fromDate && toDate
              ? `${fromDate.toLocaleDateString("en-GB")} to ${toDate.toLocaleDateString("en-GB")}`
              : "All Time"
          }
        >
          <table className="print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Stay No</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Rooms</th>
                <th>Check-In Date</th>
                <th>Expected Check-Out</th>
                <th>Actual Check-Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {exportStays && exportStays.map((row, idx) => (
                <tr key={row._id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: "bold" }}>{row.stayNo}</td>
                  <td>{row.customer?.fullName}</td>
                  <td>{row.customer?.phoneNumber || "N/A"}</td>
                  <td>{row.rooms?.map(rm => rm.room?.roomNumber).join(", ")}</td>
                  <td>{row.checkInDate ? new Date(row.checkInDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td>{row.expectedCheckOutDate ? new Date(row.expectedCheckOutDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td>{row.actualCheckOutDate ? new Date(row.actualCheckOutDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td style={{ fontWeight: "bold" }}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintReportTemplate>
      </div>

      {/* Hidden print container for Guest Folio Ledger */}
      <div style={{ display: "none" }}>
        {folioPrintRes && (
          <PrintReportTemplate
            ref={folioPrintRef}
            title={`Guest Folio Ledger - ${folioPrintRes.stayNo}`}
            subtitle={`Folio account details for guest ${folioPrintRes.customer?.fullName || "Guest"}`}
            dateRange={`Check-in: ${new Date(folioPrintRes.checkInDate).toLocaleDateString("en-GB")} to Expected Check-out: ${new Date(folioPrintRes.expectedCheckOutDate).toLocaleDateString("en-GB")}`}
          >
            <div style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", fontSize: "12px" }}>
              <strong>Customer Name:</strong> {folioPrintRes.customer?.fullName} &nbsp;|&nbsp; 
              <strong>Email:</strong> {folioPrintRes.customer?.emailAddress || "N/A"} &nbsp;|&nbsp; 
              <strong>Phone:</strong> {folioPrintRes.customer?.phoneNumber || "N/A"} &nbsp;|&nbsp; 
              <strong>Assigned Rooms:</strong> {folioPrintRes.rooms?.map(r => r.room?.roomNumber).join(", ")}
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
                    <td>{new Date(row.date).toLocaleDateString("en-GB")}</td>
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
        )}
      </div>

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
    </div>
  );
};

export default StaysPage;
