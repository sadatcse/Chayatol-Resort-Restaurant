"use client";

import React, { useState, useEffect, useContext, useRef, useCallback, Suspense } from "react";
import {
    FiSearch, FiRefreshCw, FiX, FiEye, FiPrinter, FiChevronLeft, FiChevronRight, FiFilter,
    FiClock
} from "react-icons/fi";
import { FaCalendarAlt, FaUser as FaUserAlt, FaHashtag, FaMoneyBillWave, FaQrcode } from "react-icons/fa";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import ReceiptTemplate from "@/components/Receipt/ReceiptTemplate";
import A4ReceiptTemplate from "@/components/Receipt/A4ReceiptTemplate";
import MtableLoading from "@/components/Comon/MtableLoading";
import QRCodeGenerator from "@/components/pos/QRCodeGenerator";
import SectionHeader from "@/components/Comon/SectionHeader";

const ITEMS_PER_PAGE = 15;

function FinishedOrdersContent() {
    const axiosSecure = useAxiosSecure();
    const receiptRef = useRef();
    const a4ReceiptRef = useRef();
    const { user } = useContext(AuthContext);

    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationInfo, setPaginationInfo] = useState({
        totalDocs: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
    });

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [printType, setPrintType] = useState("thermal"); // thermal or a4
    const [companyInfo, setCompanyInfo] = useState(null);

    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const todayStr = getTodayDateString();

    // Filters
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [filters, setFilters] = useState({
        orderType: "",
        paymentStatus: "Paid" // Default to showing paid/finished orders
    });

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

    // Fetch company info
    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const res = await axiosSecure.get("/company");
                if (res.data && res.data.length > 0) {
                    setCompanyInfo(res.data[0]);
                }
            } catch (err) {
                console.error("Error fetching company details:", err);
            }
        };
        fetchCompany();
    }, [axiosSecure]);

    // Search debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Reset pagination to 1 when filters change
    useEffect(() => {
        Promise.resolve().then(() => {
            setCurrentPage(1);
        });
    }, [debouncedSearchTerm, startDate, endDate, filters]);

    const fetchOrders = useCallback(async (pageToFetch) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);
            if (filters.orderType) params.append("orderType", filters.orderType);
            if (filters.paymentStatus) params.append("paymentStatus", filters.paymentStatus);

            params.append("page", pageToFetch);
            params.append("limit", ITEMS_PER_PAGE);

            const response = await axiosSecure.get(`/pos/invoice?${params.toString()}`);
            if (response.data?.success) {
                setOrders(response.data.invoices || response.data.data || []);
                setPaginationInfo({
                    totalDocs: response.data.total || 0,
                    totalPages: response.data.totalPages || 1,
                    hasNextPage: response.data.pagination?.hasNextPage || (pageToFetch < response.data.totalPages),
                    hasPrevPage: response.data.pagination?.hasPrevPage || (pageToFetch > 1)
                });
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error("Failed to fetch order history.");
        } finally {
            setIsLoading(false);
        }
    }, [axiosSecure, debouncedSearchTerm, startDate, endDate, filters]);

    useEffect(() => {
        Promise.resolve().then(() => {
            fetchOrders(currentPage);
        });
    }, [fetchOrders, currentPage]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({ orderType: "", paymentStatus: "Paid" });
        setSearchTerm("");
        setStartDate(todayStr);
        setEndDate(todayStr);
        setIsFilterOpen(false);
        setCurrentPage(1);
    };

    const handleViewOrder = (order) => {
        setSelectedOrder(order);
        setIsViewModalOpen(true);
    };

    const handlePrintOrder = (type = "thermal") => {
        setPrintType(type);
        setIsViewModalOpen(false);
        setIsPrintModalOpen(true);
    };

    const handleQRCodeClick = () => {
        setIsViewModalOpen(false);
        setIsQrModalOpen(true);
    };

    useEffect(() => {
        if (isPrintModalOpen && selectedOrder) {
            const timer = setTimeout(() => {
                if (printType === "a4" && a4ReceiptRef.current) {
                    a4ReceiptRef.current.printReceipt();
                } else if (printType === "thermal" && receiptRef.current) {
                    receiptRef.current.printReceipt();
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isPrintModalOpen, selectedOrder, printType]);

    const handlePrintComplete = () => {
        setIsPrintModalOpen(false);
    };

    // Calculate stats
    const totalOrdersCount = orders.length;
    const totalRevenueSum = orders.reduce((sum, order) => sum + (order.totalAmount || order.grandTotal || 0), 0);
    const averageOrderAmt = totalOrdersCount > 0 ? (totalRevenueSum / totalOrdersCount) : 0;

    return (
        <div className="min-h-screen bg-brand-offwhite dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200 animate-scale-in">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <SectionHeader
                    title="Finished Orders"
                    subtitle="Complete historic record of sales invoices"
                >
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg shadow-sm text-sm font-semibold cursor-pointer transition-all duration-200
                            ${isFilterOpen ? "bg-brand-primary border-brand-primary text-white" : "bg-white border-brand-beige dark:bg-brand-charcoal dark:border-brand-beige/25 dark:text-brand-offwhite dark:hover:bg-brand-beige/10"}`}
                    >
                        <FiFilter /> Filters {isFilterOpen ? "Open" : ""}
                    </button>
                </SectionHeader>

                {/* Filter Section */}
                {isFilterOpen && (
                    <section className="mb-6 p-4 bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 shadow-md rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-scale-in">
                        <div>
                            <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Search Keyword</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="text-brand-sage" size={14} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Invoice, Customer, Table..."
                                    className="input input-bordered input-sm w-full pl-9 border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Start Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">End Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Order Type</label>
                            <select
                                name="orderType"
                                value={filters.orderType}
                                onChange={handleFilterChange}
                                className="select select-bordered select-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                            >
                                <option value="">All Types</option>
                                <option value="dine-in">Dine In</option>
                                <option value="takeaway">Takeaway</option>
                                <option value="delivery">Delivery</option>
                                <option value="room service">Room Service</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Payment Status</label>
                            <select
                                name="paymentStatus"
                                value={filters.paymentStatus}
                                onChange={handleFilterChange}
                                className="select select-bordered select-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                            >
                                <option value="">All Payments</option>
                                <option value="Paid">Paid / Finished</option>
                                <option value="Unpaid">Due / Pending</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2 md:col-span-3 flex justify-end items-end gap-2">
                            <button
                                onClick={clearFilters}
                                className="btn btn-sm btn-ghost text-brand-sage text-xs cursor-pointer"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </section>
                )}

                {/* Stats Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 mt-4 animate-scale-in">
                    {/* Card 1: Total Completed Orders */}
                    <div className="relative overflow-hidden bg-white dark:bg-brand-charcoal border border-brand-beige/50 dark:border-zinc-800 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl p-6 flex items-center justify-between group">
                        <div className="absolute top-0 left-0 h-full w-1.5 bg-brand-primary" />
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-wider text-brand-sage dark:text-zinc-400">Total Orders</p>
                            <p className="text-3xl font-black text-brand-charcoal dark:text-brand-offwhite mt-2 font-mono group-hover:scale-105 transition-transform duration-300 origin-left">
                                {totalOrdersCount}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">Matched under filters</p>
                        </div>
                        <div className="p-3 bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-sage rounded-2xl group-hover:rotate-12 transition-transform duration-300">
                            <FiFilter size={24} />
                        </div>
                    </div>

                    {/* Card 2: Total Revenue */}
                    <div className="relative overflow-hidden bg-white dark:bg-brand-charcoal border border-brand-beige/50 dark:border-zinc-800 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl p-6 flex items-center justify-between group">
                        <div className="absolute top-0 left-0 h-full w-1.5 bg-emerald-500" />
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-wider text-brand-sage dark:text-zinc-400">Total Revenue</p>
                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono group-hover:scale-105 transition-transform duration-300 origin-left">
                                ৳ {totalRevenueSum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">Sum of order totals</p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-2xl group-hover:rotate-12 transition-transform duration-300">
                            <span className="text-xl font-bold font-mono">৳</span>
                        </div>
                    </div>

                    {/* Card 3: Avg Order Value */}
                    <div className="relative overflow-hidden bg-white dark:bg-brand-charcoal border border-brand-beige/50 dark:border-zinc-800 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl p-6 flex items-center justify-between group">
                        <div className="absolute top-0 left-0 h-full w-1.5 bg-amber-500" />
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-wider text-brand-sage dark:text-zinc-400">Avg Order Value</p>
                            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono group-hover:scale-105 transition-transform duration-300 origin-left">
                                ৳ {averageOrderAmt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">Average per sale ticket</p>
                        </div>
                        <div className="p-3 bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-2xl group-hover:rotate-12 transition-transform duration-300">
                            <FiClock size={24} />
                        </div>
                    </div>
                </div>

                {/* Table View */}
                {isLoading ? <MtableLoading data={null} /> : (
                    <>
                        <section className="overflow-x-auto border border-brand-beige/50 dark:border-zinc-800 shadow-lg rounded-2xl bg-white dark:bg-brand-charcoal">
                            <table className="min-w-full divide-y divide-brand-beige/30 dark:divide-zinc-800">
                                <thead className="bg-brand-offwhite/80 dark:bg-zinc-850">
                                    <tr>
                                        <th scope="col" className="px-5 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider rounded-tl-lg">Invoice No</th>
                                        <th scope="col" className="px-5 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Date & Time</th>
                                        <th scope="col" className="px-5 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Guest</th>
                                        <th scope="col" className="px-5 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Order Type</th>
                                        <th scope="col" className="px-5 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Table / Room</th>
                                        <th scope="col" className="px-5 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Amount</th>
                                        <th scope="col" className="px-5 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Payment Status</th>
                                        <th scope="col" className="px-5 py-4 text-right text-xs font-bold text-brand-sage uppercase tracking-wider rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white/50 dark:bg-brand-charcoal/30 divide-y divide-brand-beige/20 dark:divide-zinc-800 text-sm font-semibold">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-5 py-10 text-center text-brand-sage font-bold">
                                                No finished orders found.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((order) => {
                                            // Dynamic order type styles
                                            const typeLower = (order.orderType || "").toLowerCase().trim();
                                            let orderTypeBadge = "bg-brand-primary/10 text-brand-primary dark:text-brand-sage border border-brand-primary/20";
                                            if (typeLower === "takeaway") {
                                                orderTypeBadge = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
                                            } else if (typeLower === "delivery") {
                                                orderTypeBadge = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
                                            } else if (typeLower === "room service") {
                                                orderTypeBadge = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20";
                                            }

                                            const isPaid = order.paymentStatus === 'Paid' || order.paymentMethod !== 'Due';

                                            return (
                                                <tr key={order._id} className="hover:bg-brand-beige/15 dark:hover:bg-zinc-800/40 transition-colors duration-200 border-b border-brand-beige/10 dark:border-zinc-800/30">
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span 
                                                            onClick={() => handleViewOrder(order)}
                                                            className="text-brand-primary dark:text-brand-sage font-black hover:underline cursor-pointer transition-colors duration-200"
                                                        >
                                                            {order.invoiceSerial || order.invoiceNo}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-brand-sage dark:text-zinc-400 font-medium font-mono text-xs">
                                                        {new Date(order.dateTime || order.createdAt).toLocaleString("en-GB")}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-brand-charcoal dark:text-zinc-200 font-bold">
                                                        {order.customerName || order.customer?.name || "Walk-in Guest"}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                                                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${orderTypeBadge}`}>
                                                            {order.orderType}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-brand-charcoal dark:text-zinc-300 font-semibold">
                                                        {order.tableName || order.roomNo || order.tableNo || order.deliveryProvider || "N/A"}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-brand-charcoal dark:text-brand-offwhite font-black text-base">
                                                        ৳ {(order.totalAmount || order.grandTotal || 0).toFixed(0)}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                                                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border
                                                            ${isPaid 
                                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-500/20' 
                                                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-500/20'}`}>
                                                            {isPaid ? 'Paid' : 'Due'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                                                        <button
                                                            onClick={() => handleViewOrder(order)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-sage rounded-lg font-bold text-xs cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
                                                        >
                                                            <FiEye size={13} /> View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </section>

                        {/* Pagination */}
                        {paginationInfo.totalPages > 1 && (
                            <div className="flex justify-between items-center mt-6">
                                <span className="text-sm font-bold text-brand-sage">Page {currentPage} of {paginationInfo.totalPages}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={!paginationInfo.hasPrevPage}
                                        className="btn btn-sm btn-outline border-brand-primary hover:bg-brand-primary text-brand-primary hover:text-white rounded-md disabled:opacity-50 cursor-pointer"
                                    >
                                        <FiChevronLeft /> Prev
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationInfo.totalPages))}
                                        disabled={!paginationInfo.hasNextPage}
                                        className="btn btn-sm btn-outline border-brand-primary hover:bg-brand-primary text-brand-primary hover:text-white rounded-md disabled:opacity-50 cursor-pointer"
                                    >
                                        Next <FiChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* View Order Modal */}
            {isViewModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/25 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-scale-in">
                        <button
                            onClick={() => setIsViewModalOpen(false)}
                            className="absolute top-4 right-4 text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite cursor-pointer"
                        >
                            <FiX size={24} />
                        </button>
                        
                        <h2 className="text-2xl font-black text-brand-charcoal dark:text-brand-offwhite uppercase tracking-widest flex items-center gap-2 mb-4">
                            <FaHashtag /> {selectedOrder.invoiceSerial || selectedOrder.invoiceNo}
                        </h2>

                        <div className="grid grid-cols-2 gap-4 border-b border-brand-beige/20 dark:border-brand-beige/10 pb-4 mb-4 text-xs font-semibold">
                            <div>
                                <p className="text-brand-sage flex items-center gap-1.5 uppercase tracking-wider"><FaCalendarAlt /> DateTime</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold">{new Date(selectedOrder.dateTime || selectedOrder.createdAt).toLocaleString("en-GB")}</p>
                            </div>
                            <div>
                                <p className="text-brand-sage flex items-center gap-1.5 uppercase tracking-wider"><FaUserAlt /> Guest</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold">{selectedOrder.customerName || selectedOrder.customer?.name || "Walk-in Guest"}</p>
                            </div>
                            <div>
                                <p className="text-brand-sage flex items-center gap-1.5 uppercase tracking-wider"><FiClock /> Order Type</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold uppercase">{selectedOrder.orderType}</p>
                            </div>
                            <div>
                                <p className="text-brand-sage flex items-center gap-1.5 uppercase tracking-wider"><FaMoneyBillWave /> Payment Status</p>
                                <p className="text-brand-primary dark:text-brand-sage mt-0.5 font-extrabold uppercase">{selectedOrder.paymentStatus || "Paid"}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="mb-4">
                            <h3 className="text-xs font-extrabold text-brand-sage mb-2 uppercase tracking-widest">Order Items</h3>
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
                                        {Array.isArray(selectedOrder.products) && selectedOrder.products.length > 0 ? (
                                            selectedOrder.products.map((item, index) => (
                                                <tr key={index} className="border-b border-brand-beige/10">
                                                    <td className="py-2 text-left">{item.productName}</td>
                                                    <td className="py-2 text-center font-extrabold">{item.qty || item.quantity}</td>
                                                    <td className="py-2 text-right">৳ {(item.rate || item.unitPrice || 0).toFixed(0)}</td>
                                                    <td className="py-2 text-right">৳ {(item.subtotal || item.totalPrice || 0).toFixed(0)}</td>
                                                </tr>
                                            ))
                                        ) : Array.isArray(selectedOrder.orderBatches) && selectedOrder.orderBatches.length > 0 ? (
                                            selectedOrder.orderBatches.flatMap(b => b.items || []).map((item, index) => (
                                                <tr key={index} className="border-b border-brand-beige/10">
                                                    <td className="py-2 text-left">{item.itemName}</td>
                                                    <td className="py-2 text-center font-extrabold">{item.quantity}</td>
                                                    <td className="py-2 text-right">৳ {(item.unitPrice || 0).toFixed(0)}</td>
                                                    <td className="py-2 text-right">৳ {(item.totalPrice || 0).toFixed(0)}</td>
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

                        {/* Order Summary Calculations */}
                        <div className="flex flex-col items-end gap-1.5 text-xs font-semibold border-t border-brand-beige/25 dark:border-brand-beige/10 pt-4">
                            <p>Subtotal: ৳ {(selectedOrder.subtotal || selectedOrder.subTotal || 0).toFixed(0)}</p>
                            {selectedOrder.vat > 0 && <p>VAT: ৳ {selectedOrder.vat.toFixed(0)}</p>}
                            {selectedOrder.sd > 0 && <p>SD: ৳ {selectedOrder.sd.toFixed(0)}</p>}
                            {selectedOrder.serviceCharge > 0 && <p>Service Charge: ৳ {selectedOrder.serviceCharge.toFixed(0)}</p>}
                            {selectedOrder.deliveryCharge > 0 && <p>Delivery Charge: ৳ {selectedOrder.deliveryCharge.toFixed(0)}</p>}
                            {selectedOrder.discount > 0 && <p className="text-green-600">Discount: -৳ {selectedOrder.discount.toFixed(0)}</p>}
                            <p className="text-lg font-black text-brand-primary dark:text-brand-sage mt-1 uppercase tracking-wider">Total Payable: ৳ {(selectedOrder.totalAmount || selectedOrder.grandTotal || 0).toFixed(0)}</p>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => handlePrintOrder("thermal")}
                                className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-3 shadow flex items-center gap-1"
                                title="Print POS Thermal Receipt (80mm)"
                            >
                                <FiPrinter /> Print Thermal
                            </button>
                            <button
                                onClick={() => handlePrintOrder("a4")}
                                className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-3 shadow flex items-center gap-1"
                                title="Print A4 Page Invoice"
                            >
                                <FiPrinter /> Print A4
                            </button>
                            <button
                                onClick={handleQRCodeClick}
                                className="btn btn-sm bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-sage font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow flex items-center gap-1.5"
                            >
                                <FaQrcode /> Review QR
                            </button>
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="btn btn-sm bg-transparent hover:bg-brand-beige/25 text-brand-sage font-bold text-[10px] uppercase tracking-wider px-4 py-2 cursor-pointer border-none shadow-none"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {isQrModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 bg-brand-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative animate-scale-in">
                        <button
                            onClick={() => setIsQrModalOpen(false)}
                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-750 cursor-pointer shadow z-50"
                        >
                            <FiX size={18} />
                        </button>
                        <QRCodeGenerator type="invoice" id={selectedOrder._id} />
                    </div>
                </div>
            )}

            <div className="hidden">
                {isPrintModalOpen && selectedOrder && (
                    <>
                        <ReceiptTemplate
                            ref={receiptRef}
                            onPrintComplete={handlePrintComplete}
                            profileData={companyInfo}
                            invoiceData={selectedOrder ? { ...selectedOrder, loginUserName: selectedOrder.loginUserName || user?.name || "Staff" } : null}
                        />
                        <A4ReceiptTemplate
                            ref={a4ReceiptRef}
                            onPrintComplete={handlePrintComplete}
                            profileData={companyInfo}
                            invoiceData={selectedOrder}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export default function FinishedOrdersPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] w-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
            <FinishedOrdersContent />
        </Suspense>
    );
}
