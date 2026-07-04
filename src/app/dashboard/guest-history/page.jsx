"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiEye, FiX, FiUser, FiFileText } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";
import Pagination from "@/components/Comon/Pagination";
import SectionHeader from "@/components/Comon/SectionHeader";
import useStandardPrint from "@/hooks/useStandardPrint";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

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

function GuestHistoryContent() {
    const axiosSecure = useAxiosSecure();

    // States
    const [stays, setStays] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Selected History Details Modal
    const [selectedStay, setSelectedStay] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [folioEntries, setFolioEntries] = useState([]);
    const [isFolioLoading, setIsFolioLoading] = useState(false);

    const handleViewCustomer = (stay) => {
        setSelectedStay(stay);
        setIsCustomerModalOpen(true);
    };

    // Month filter and export states
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth()}`;
    });
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [quickFilter, setQuickFilter] = useState("this-month");

    const handleQuickFilterChange = (filterType) => {
        setQuickFilter(filterType);
        setCurrentPage(1);
        const today = new Date();
        if (filterType === "1day") {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
            const lastDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            setFromDate(firstDay);
            setToDate(lastDay);
            setSelectedMonth("");
        } else if (filterType === "7days") {
            const past7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const firstDay = new Date(past7.getFullYear(), past7.getMonth(), past7.getDate(), 0, 0, 0, 0);
            const lastDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            setFromDate(firstDay);
            setToDate(lastDay);
            setSelectedMonth("");
        } else if (filterType === "this-month") {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            setFromDate(firstDay);
            setToDate(lastDay);
            setSelectedMonth(`${today.getFullYear()}-${today.getMonth()}`);
        } else if (filterType === "all") {
            setFromDate(null);
            setToDate(null);
            setSelectedMonth("all");
        }
    };

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

    // Print setup
    const {
        printData: exportStays,
        setPrintData: setExportStays,
        printRef,
        handlePrint
    } = useStandardPrint({
        documentTitle: "Guest_Stay_History_Report",
        onAfterPrint: () => setIsExporting(false)
    });

    const {
        printData: customerPrintRes,
        setPrintData: setCustomerPrintRes,
        printRef: customerPrintRef,
        handlePrint: handlePrintCustomer
    } = useStandardPrint({
        documentTitle: `Customer_Profile_${selectedStay?.customer?.fullName || "details"}`,
    });

    const {
        printData: folioPrintRes,
        setPrintData: setFolioPrintRes,
        printRef: folioPrintRef,
        handlePrint: handleFolioPrint
    } = useStandardPrint({
        documentTitle: `Folio_Ledger_${selectedStay?.stayNo || "Report"}`
    });

    // Print Food & Service Summary states
    const [foodServicePrintData, setFoodServicePrintData] = useState(null);
    const [detailedFoodOrders, setDetailedFoodOrders] = useState([]);
    const [detailedServiceOrders, setDetailedServiceOrders] = useState([]);

    // Final Invoice print setup
    const {
        printData: finalInvoiceRes,
        setPrintData: setFinalInvoiceRes,
        printRef: finalInvoicePrintRef
    } = useStandardPrint({
        documentTitle: `Final_Invoice_${selectedStay?.stayNo || "Report"}`,
    });

    const {
        printRef: foodServicePrintRef,
        handlePrint: handleFoodServicePrint
    } = useStandardPrint({
        documentTitle: `Food_Service_Summary_${selectedStay?.stayNo || "Report"}`,
        onAfterPrint: () => setFoodServicePrintData(null)
    });

    // Sync selectedMonth dropdown with fromDate/toDate changes
    useEffect(() => {
        if (selectedMonth === "all") {
            setFromDate(null);
            setToDate(null);
            setQuickFilter("all");
        } else if (selectedMonth) {
            const [y, m] = selectedMonth.split("-").map(Number);
            const firstDay = new Date(y, m, 1, 0, 0, 0, 0);
            const lastDay = new Date(y, m + 1, 0, 23, 59, 59, 999);
            setFromDate(firstDay);
            setToDate(lastDay);
            
            const now = new Date();
            if (y === now.getFullYear() && m === now.getMonth()) {
                setQuickFilter("this-month");
            } else {
                setQuickFilter("");
            }
        }
        setCurrentPage(1);
    }, [selectedMonth]);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch checked out stays
            const params = {
                page: currentPage,
                limit: 10,
                status: "Checked Out",
                search: searchTerm
            };
            if (fromDate) params.from = fromDate.toISOString();
            if (toDate) params.to = toDate.toISOString();

            const { data } = await axiosSecure.get("/stays", { params });
            if (data?.data) {
                setStays(data.data);
                setTotalPages(data.pagination?.totalPages || 1);
                setTotalItems(data.pagination?.totalDocs || data.pagination?.totalItems || data.data.length);
            }
        } catch (err) {
            console.error("Error fetching guest history:", err);
            setStays([]);
        } finally {
            setIsLoading(false);
        }
    }, [axiosSecure, currentPage, searchTerm, fromDate, toDate]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Handle view invoice ledger details
    const handleViewDetails = async (stay) => {
        setSelectedStay(stay);
        setIsModalOpen(true);
        setIsFolioLoading(true);
        try {
            const { data } = await axiosSecure.get(`/stays/${stay._id}/folio`);
            setFolioEntries(data || []);
        } catch (err) {
            console.error("Failed to load folio ledger:", err);
            setFolioEntries([]);
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

    const fetchAllHistoryForExport = async () => {
        try {
            let url = `/stays?page=1&limit=99999&status=Checked Out&search=${searchTerm}`;
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
            const data = await fetchAllHistoryForExport();
            const formatted = data.map((r, idx) => ({
                "Sl": idx + 1,
                "Stay No": r.stayNo,
                "Customer Name": r.customer?.fullName || "N/A",
                "Phone": r.customer?.phoneNumber || "N/A",
                "Rooms": r.rooms?.map(rm => rm.room?.roomNumber).join(", ") || "N/A",
                "Check-In Date": r.checkInDate ? new Date(r.checkInDate).toLocaleDateString("en-GB") : "N/A",
                "Checkout Date": r.actualCheckOutDate ? new Date(r.actualCheckOutDate).toLocaleDateString("en-GB") : (r.expectedCheckOutDate ? new Date(r.expectedCheckOutDate).toLocaleDateString("en-GB") : "N/A"),
                "Status": r.status,
            }));
            exportToExcel(formatted, "Guest_Stay_History_Report");
        } catch (err) {
            console.error(err);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const data = await fetchAllHistoryForExport();
            const formatted = data.map((r, idx) => ({
                "Sl": idx + 1,
                "Stay No": r.stayNo,
                "Customer Name": r.customer?.fullName || "N/A",
                "Phone": r.customer?.phoneNumber || "N/A",
                "Rooms": r.rooms?.map(rm => rm.room?.roomNumber).join(", ") || "N/A",
                "Check-In Date": r.checkInDate ? new Date(r.checkInDate).toLocaleDateString("en-GB") : "N/A",
                "Checkout Date": r.actualCheckOutDate ? new Date(r.actualCheckOutDate).toLocaleDateString("en-GB") : (r.expectedCheckOutDate ? new Date(r.expectedCheckOutDate).toLocaleDateString("en-GB") : "N/A"),
                "Status": r.status,
            }));
            exportToCsv(formatted, "Guest_Stay_History_Report");
        } catch (err) {
            console.error(err);
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrintReport = async () => {
        setIsExporting(true);
        try {
            const data = await fetchAllHistoryForExport();
            setExportStays(data);
        } catch (err) {
            console.error(err);
            setIsExporting(false);
        }
    };

    const totalDebit = useMemo(() => folioEntries.reduce((acc, e) => acc + e.debit, 0), [folioEntries]);
    const totalCredit = useMemo(() => folioEntries.reduce((acc, e) => acc + e.credit, 0), [folioEntries]);

    return (
        <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
            <div className="max-w-7xl mx-auto">
                <SectionHeader
                    title="Guest Stay History"
                    subtitle="Archived log files of checked-out stays and past reservations."
                />

                {/* Search Board & Export Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 shadow-sm mb-6 p-6"
                >
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
                            <div className="relative w-full sm:w-72">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="text-brand-sage" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by Guest name, Phone, or Room..."
                                    className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite input-sm w-full pl-9 text-xs h-9"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>

                            {/* Quick Date Filter Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5 border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-lg p-1 bg-brand-offwhite/50 dark:bg-brand-charcoal/50">
                                <button
                                    type="button"
                                    onClick={() => handleQuickFilterChange("1day")}
                                    className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all duration-200 cursor-pointer ${
                                        quickFilter === "1day"
                                            ? "bg-brand-primary text-white shadow-sm"
                                            : "text-brand-sage hover:bg-brand-beige/35 dark:hover:bg-brand-dark-grey"
                                    }`}
                                >
                                    1 Day
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickFilterChange("7days")}
                                    className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all duration-200 cursor-pointer ${
                                        quickFilter === "7days"
                                            ? "bg-brand-primary text-white shadow-sm"
                                            : "text-brand-sage hover:bg-brand-beige/35 dark:hover:bg-brand-dark-grey"
                                    }`}
                                >
                                    7 Days
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickFilterChange("this-month")}
                                    className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all duration-200 cursor-pointer ${
                                        quickFilter === "this-month"
                                            ? "bg-brand-primary text-white shadow-sm"
                                            : "text-brand-sage hover:bg-brand-beige/35 dark:hover:bg-brand-dark-grey"
                                    }`}
                                >
                                    This Month
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickFilterChange("all")}
                                    className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all duration-200 cursor-pointer ${
                                        quickFilter === "all"
                                            ? "bg-brand-primary text-white shadow-sm"
                                            : "text-brand-sage hover:bg-brand-beige/35 dark:hover:bg-brand-dark-grey"
                                    }`}
                                >
                                    All
                                </button>
                            </div>

                            {/* Monthly Selector */}
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="select select-bordered select-sm border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 rounded-lg h-9 text-xs font-semibold px-3 w-full sm:w-44 text-brand-charcoal dark:text-brand-offwhite shadow-sm border-brand-beige"
                            >
                                <option value="all">All Months</option>
                                {monthOptions.map((opt) => (
                                    <option key={opt.label} value={`${opt.year}-${opt.month}`}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <ExportButtons
                            onExportExcel={handleExportExcel}
                            onExportCsv={handleExportCsv}
                            onPrint={handlePrintReport}
                            isLoading={isExporting}
                        />
                    </div>
                </motion.div>

                {/* History table */}
                {isLoading ? <MtableLoading /> : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl shadow-sm overflow-hidden p-6"
                    >
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-brand-beige dark:divide-brand-beige/10">
                                <thead className="bg-brand-offwhite dark:bg-brand-charcoal/70 text-xs text-brand-sage font-bold uppercase">
                                    <tr>
                                        <th className="p-3 text-left rounded-tl-lg">Stay No</th>
                                        <th className="p-3 text-left">Guest Name</th>
                                        <th className="p-3 text-left">Rooms</th>
                                        <th className="p-3 text-left">Check-In Date</th>
                                        <th className="p-3 text-left">Checkout Date</th>
                                        <th className="p-3 text-left">Status</th>
                                        <th className="p-3 text-right rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-brand-charcoal/25 divide-y divide-brand-beige dark:divide-brand-beige/10 text-sm font-semibold text-brand-charcoal dark:text-brand-offwhite">
                                    {stays.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-6 text-center text-brand-sage">
                                                No archived guest history records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        stays.map((stay) => (
                                            <tr key={stay._id} className="hover:bg-brand-beige/20 dark:hover:bg-brand-offwhite/5 transition">
                                                <td className="p-3 text-left font-mono text-brand-primary dark:text-brand-sage font-bold">{stay.stayNo}</td>
                                                <td className="p-3 text-left">
                                                    <p className="font-bold">{stay.customer?.fullName}</p>
                                                    <p className="text-[10px] text-brand-sage">{stay.customer?.phoneNumber}</p>
                                                </td>
                                                <td className="p-3 text-left font-mono text-xs">
                                                    {stay.rooms?.map(r => r.room?.roomNumber).join(", ") || "N/A"}
                                                </td>
                                                <td className="p-3 text-left text-xs text-brand-sage">
                                                    {new Date(stay.checkInDate).toLocaleDateString("en-GB")}
                                                </td>
                                                <td className="p-3 text-left text-xs text-brand-sage">
                                                    {stay.actualCheckOutDate ? new Date(stay.actualCheckOutDate).toLocaleDateString("en-GB") : new Date(stay.expectedCheckOutDate).toLocaleDateString("en-GB")}
                                                </td>
                                                <td className="p-3 text-left text-xs">
                                                    <span className="px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-sage font-bold uppercase text-[9px]">
                                                        Checked Out
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleViewCustomer(stay)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-sage hover:bg-brand-sage/80 text-white rounded-md text-xs font-bold cursor-pointer shadow-sm"
                                                        >
                                                            <FiUser /> Customer Details
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewDetails(stay)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-md text-xs font-bold cursor-pointer shadow-sm"
                                                        >
                                                            <FiEye /> Invoice Details
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {stays.length > 0 && (
                            <div className="mt-6 flex justify-center">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    itemsPerPage={10}
                                    onPageChange={(page) => setCurrentPage(page)}
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* View Folio Invoice Modal */}
            {isModalOpen && selectedStay && (
                <div className="fixed inset-0 z-50 bg-brand-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-scale-in">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite cursor-pointer"
                        >
                            <FiX size={24} />
                        </button>
                        
                        <h2 className="text-2xl font-black text-brand-charcoal dark:text-brand-offwhite mb-4">
                            Folio Invoice: {selectedStay.stayNo}
                        </h2>

                        <div className="grid grid-cols-2 gap-4 border-b border-brand-beige dark:border-brand-beige/25 pb-4 mb-4 text-xs font-semibold">
                            <div>
                                <p className="text-brand-sage">Guest Name</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5">{selectedStay.customer?.fullName}</p>
                            </div>
                            <div>
                                <p className="text-brand-sage">Guest Contact</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5">{selectedStay.customer?.phoneNumber || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-brand-sage">Check-in Date</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5">{new Date(selectedStay.checkInDate).toLocaleString("en-GB")}</p>
                            </div>
                            <div>
                                <p className="text-brand-sage">Checkout Date</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5">
                                    {selectedStay.actualCheckOutDate ? new Date(selectedStay.actualCheckOutDate).toLocaleString("en-GB") : new Date(selectedStay.expectedCheckOutDate).toLocaleString("en-GB")}
                                </p>
                            </div>
                        </div>

                        {/* Folio entries */}
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-brand-sage mb-2 uppercase tracking-wider">Folio ledger breakdown</h3>
                            {isFolioLoading ? <MtableLoading /> : (
                                <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 rounded-xl p-3">
                                    <table className="min-w-full text-xs font-semibold text-brand-charcoal dark:text-brand-offwhite">
                                        <thead>
                                            <tr className="border-b border-brand-beige dark:border-brand-beige/10 text-brand-sage">
                                                <th className="text-left pb-2">Date</th>
                                                <th className="text-left pb-2">Description</th>
                                                <th className="text-right pb-2">Debit (+)</th>
                                                <th className="text-right pb-2">Credit (-)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {folioEntries.map((entry, index) => (
                                                <tr key={index} className="hover:bg-brand-beige/20 dark:hover:bg-brand-offwhite/5">
                                                    <td className="py-2 text-left text-brand-sage">{new Date(entry.date).toLocaleDateString("en-GB")}</td>
                                                    <td className="py-2 text-left font-bold text-brand-charcoal dark:text-brand-offwhite">{entry.description}</td>
                                                    <td className="py-2 text-right text-red-500">{entry.debit > 0 ? `৳ ${entry.debit.toFixed(0)}` : "-"}</td>
                                                    <td className="py-2 text-right text-green-500">{entry.credit > 0 ? `৳ ${entry.credit.toFixed(0)}` : "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Summary Calculations */}
                        <div className="flex flex-col items-end gap-1.5 text-xs font-semibold border-t border-brand-beige dark:border-brand-beige/25 pt-3">
                            <p>Total Charges (Debit): ৳ {totalDebit.toFixed(0)}</p>
                            <p className="text-green-600">Total Credits/Settlements: ৳ {totalCredit.toFixed(0)}</p>
                            <p className="text-base font-extrabold text-brand-sage mt-1">Outstanding Balance: ৳ {(totalDebit - totalCredit).toFixed(0)}</p>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-brand-offwhite dark:bg-brand-charcoal/50 border border-brand-beige dark:border-brand-beige/15 rounded-lg hover:bg-brand-beige/20 dark:hover:bg-brand-beige/10 text-brand-charcoal dark:text-brand-offwhite text-xs font-bold cursor-pointer animate-scale-in"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => handlePrintFoodServiceSummary(selectedStay)}
                                className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-xs font-bold cursor-pointer shadow-md animate-scale-in"
                            >
                                Food & Service Print
                            </button>
                            <button
                                onClick={() => setFolioPrintRes(selectedStay)}
                                className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-xs font-bold cursor-pointer shadow-md animate-scale-in"
                            >
                                Print Ledger
                            </button>
                            <button
                                onClick={() => setFinalInvoiceRes(selectedStay)}
                                className="px-4 py-2 bg-[#1e293b] hover:bg-[#1e293b]/90 text-white rounded-lg text-xs font-bold cursor-pointer shadow-md animate-scale-in"
                            >
                                Final Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Details Modal */}
            {isCustomerModalOpen && selectedStay && selectedStay.customer && (
                <div className="fixed inset-0 z-50 bg-brand-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 w-full max-w-2xl rounded-2xl shadow-2xl p-0 overflow-hidden animate-scale-in">
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
                </div>
            )}

            {/* Hidden print container for Guest History list */}
            <div style={{ display: "none" }}>
                <PrintReportTemplate
                    ref={printRef}
                    title="Guest Stay History Report"
                    subtitle="Resort Checked-Out Guests & Archived Stay Logs"
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
                                <th>Phone</th>
                                <th>Rooms</th>
                                <th>Check-In Date</th>
                                <th>Checkout Date</th>
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
                                    <td>{row.rooms?.map(rm => rm.room?.roomNumber).join(", ") || "N/A"}</td>
                                    <td>{row.checkInDate ? new Date(row.checkInDate).toLocaleDateString("en-GB") : "—"}</td>
                                    <td>{row.actualCheckOutDate ? new Date(row.actualCheckOutDate).toLocaleDateString("en-GB") : (row.expectedCheckOutDate ? new Date(row.expectedCheckOutDate).toLocaleDateString("en-GB") : "—")}</td>
                                    <td>{row.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </PrintReportTemplate>
            </div>

            {/* Hidden print container for Customer Profile */}
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
                                {folioEntries.map((row, idx) => (
                                    <tr key={row._id || idx}>
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
                                    <td colSpan="2" style={{ textAlign: "right", color: (totalDebit - totalCredit) > 0 ? "red" : "green", borderTop: "2px solid black" }}>
                                        ৳{(totalDebit - totalCredit).toFixed(2)}
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
            <div style={{ display: "none" }}>
                {finalInvoiceRes && (() => {
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
                                    <p style={{ margin: "2px 0" }}><strong>Payment Mode:</strong> {finalInvoiceRes.bookingSource || "Walk-in"}</p>
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
        </div>
    );
}

export default function GuestHistoryPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
            <GuestHistoryContent />
        </Suspense>
    );
}
