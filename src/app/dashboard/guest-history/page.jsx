"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiEye, FiX } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";
import Pagination from "@/components/Comon/Pagination";
import SectionHeader from "@/components/Comon/SectionHeader";
import useStandardPrint from "@/hooks/useStandardPrint";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

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
    const [folioEntries, setFolioEntries] = useState([]);
    const [isFolioLoading, setIsFolioLoading] = useState(false);

    // Month filter and export states
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth()}`;
    });
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

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

    // Sync selectedMonth dropdown with fromDate/toDate changes
    useEffect(() => {
        if (selectedMonth === "all") {
            setFromDate(null);
            setToDate(null);
        } else {
            const [y, m] = selectedMonth.split("-").map(Number);
            const firstDay = new Date(y, m, 1, 0, 0, 0, 0);
            const lastDay = new Date(y, m + 1, 0, 23, 59, 59, 999);
            setFromDate(firstDay);
            setToDate(lastDay);
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
                                                    <button
                                                        onClick={() => handleViewDetails(stay)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-md text-xs font-bold cursor-pointer"
                                                    >
                                                        <FiEye /> Folio
                                                    </button>
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
