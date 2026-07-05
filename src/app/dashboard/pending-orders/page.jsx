"use client";

import React, { useState, useEffect, useContext, useRef, useCallback, Suspense } from "react";
import {
    FiTrash2, FiSearch, FiRefreshCw, FiX, FiGrid,
    FiEye, FiEdit, FiCheckCircle, FiPrinter, FiChevronLeft, FiChevronRight
} from "react-icons/fi";
import { FaCalendarAlt, FaUser as FaUserAlt, FaHashtag, FaMoneyBillWave, FaTimesCircle, FaClock, FaQrcode } from "react-icons/fa";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import ReceiptTemplate from "@/components/Receipt/ReceiptTemplate";
import A4ReceiptTemplate from "@/components/Receipt/A4ReceiptTemplate";
import MtableLoading from "@/components/Comon/MtableLoading";
import QRCodeGenerator from "@/components/pos/QRCodeGenerator";
import SectionHeader from "@/components/Comon/SectionHeader";

const ITEMS_PER_PAGE = 10;

function PendingOrdersContent() {
    const axiosSecure = useAxiosSecure();
    const receiptRef = useRef();
    const a4ReceiptRef = useRef();
    const { user } = useContext(AuthContext);

    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewOrder, setViewOrder] = useState(null);

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState(null);
    const [printType, setPrintType] = useState("thermal"); // thermal or a4
    const [companyInfo, setCompanyInfo] = useState(null);

    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [selectedOrderForQR, setSelectedOrderForQR] = useState(null);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState("Cash");
    const [paymentTypes, setPaymentTypes] = useState([]);

    const [filters, setFilters] = useState({
        searchTerm: '',
        orderType: '',
        dateFilter: 'today'
    });
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    // Fetch company profile & payment types for invoice printing & payment modal
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

    // Debounce search input
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(filters.searchTerm);
        }, 500);
        return () => clearTimeout(timerId);
    }, [filters.searchTerm]);

    useEffect(() => {
        Promise.resolve().then(() => {
            setCurrentPage(1);
        });
    }, [debouncedSearchTerm, filters.orderType, filters.dateFilter]);

    const fetchPendingOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {
                orderStatus: 'Pending',
                searchTerm: debouncedSearchTerm,
                orderType: filters.orderType,
                page: currentPage,
                limit: ITEMS_PER_PAGE,
            };

            if (filters.dateFilter) {
                const today = new Date();
                let start = null;
                let end = today;

                switch (filters.dateFilter) {
                    case "today":
                        start = today;
                        end = today;
                        break;
                    case "lastweek":
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
                        end = new Date(today.getFullYear(), today.getMonth(), 0);
                        break;
                    case "last6months":
                        const sixMonthsAgo = new Date();
                        sixMonthsAgo.setMonth(today.getMonth() - 5);
                        sixMonthsAgo.setDate(1);
                        start = sixMonthsAgo;
                        end = today;
                        break;
                    case "last1year":
                        const oneYearAgo = new Date();
                        oneYearAgo.setFullYear(today.getFullYear() - 1);
                        start = oneYearAgo;
                        end = today;
                        break;
                    default:
                        break;
                }

                if (start) {
                    const formatDate = (date) => {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, "0");
                        const day = String(date.getDate()).padStart(2, "0");
                        return `${year}-${month}-${day}`;
                    };
                    params.startDate = formatDate(start);
                    params.endDate = formatDate(end);
                }
            }

            // Remove empty keys
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const response = await axiosSecure.get("/pos/invoice", { params });
            if (response.data?.success) {
                setOrders(response.data.invoices || response.data.data || []);
                setTotalPages(response.data.totalPages || 1);
            }
        } catch (error) {
            console.error("Error fetching pending orders:", error);
            toast.error("Failed to fetch pending orders.");
        } finally {
            setIsLoading(false);
        }
    }, [axiosSecure, debouncedSearchTerm, filters.orderType, filters.dateFilter, currentPage]);

    useEffect(() => {
        Promise.resolve().then(() => {
            fetchPendingOrders();
        });
    }, [fetchPendingOrders]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({ searchTerm: '', orderType: '', dateFilter: 'today' });
    };

    const handleOrderUpdate = async (id, status, paymentMethod) => {
        try {
            setIsLoading(true);
            const updatePayload = { 
                orderStatus: status === 'completed' ? 'served' : status,
                paymentStatus: status === 'completed' ? 'Paid' : 'Unpaid'
            };
            if (paymentMethod) {
                updatePayload.paymentMethod = paymentMethod;
            }
            await axiosSecure.put(`/pos/invoice/${id}`, updatePayload);
            fetchPendingOrders();
            Swal.fire("Success!", `Order has been updated to ${status} via ${paymentMethod || "default billing"}.`, "success");
        } catch (error) {
            console.error("Error updating order status:", error);
            Swal.fire("Error!", "Failed to update order status. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteClick = (order) => {
        setPaymentOrder(order);
        setSelectedMethod("Cash");
        setIsPaymentModalOpen(true);
    };

    const handleViewOrder = (order) => {
        setViewOrder(order);
        setIsModalOpen(true);
    };

    const handleRemove = async (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    setIsLoading(true);
                    await axiosSecure.delete(`/pos/invoice/${id}`);
                    fetchPendingOrders();
                    Swal.fire("Deleted!", "The order has been deleted.", "success");
                } catch (error) {
                    console.error("Error deleting order:", error);
                    Swal.fire("Error!", "Failed to delete order.", "error");
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const handleEditClick = (orderId) => {
        window.location.href = `/dashboard/pos?invoiceId=${orderId}`;
    };

    const handlePrintOrder = (id, type = "thermal") => {
        const orderToPrint = orders.find(order => order._id === id);
        if (orderToPrint) {
            setPrintData(orderToPrint);
            setPrintType(type);
            setIsPrintModalOpen(true);
            setIsModalOpen(false);
        }
    };

    const handleQRCodeClick = (order) => {
        setSelectedOrderForQR(order);
        setIsQrModalOpen(true);
        setIsModalOpen(false);
    };

    useEffect(() => {
        if (isPrintModalOpen && printData) {
            const timer = setTimeout(() => {
                if (printType === "a4" && a4ReceiptRef.current) {
                    a4ReceiptRef.current.printReceipt();
                } else if (printType === "thermal" && receiptRef.current) {
                    receiptRef.current.printReceipt();
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isPrintModalOpen, printData, printType]);

    const handlePrintComplete = () => {
        setIsPrintModalOpen(false);
    };

    // Calculate elapsed time in minutes
    const getElapsedMinutes = (dateTimeStr) => {
        if (!dateTimeStr) return 0;
        const diffMs = new Date() - new Date(dateTimeStr);
        return Math.floor(diffMs / 60000);
    };

    // Get time-based styling colors for elapsed time
    const getElapsedTimeStyle = (dateTimeStr) => {
        const mins = getElapsedMinutes(dateTimeStr);
        if (mins < 10) {
            return {
                borderClass: "border-l-4 border-emerald-500",
                badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-350",
                text: `${mins} min ago (Fresh)`
            };
        } else if (mins >= 10 && mins < 20) {
            return {
                borderClass: "border-l-4 border-amber-500",
                badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-350",
                text: `${mins} min ago (Delayed)`
            };
        } else {
            return {
                borderClass: "border-l-4 border-red-500 bg-red-50/10 dark:bg-red-950/5 animate-pulse",
                badgeClass: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold",
                text: `${mins} min ago (Urgent!)`
            };
        }
    };

    return (
        <div className="min-h-screen bg-brand-offwhite dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
            <div className="max-w-7xl mx-auto animate-scale-in">
                <SectionHeader
                    title="Pending Orders"
                    subtitle="Track and manage active unpaid/pending dine-in, takeaway, and room service orders."
                />

                <section className="my-6 p-4 bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 shadow-md rounded-2xl">
                    <div className="flex flex-col md:flex-row md:items-end md:gap-3 space-y-4 md:space-y-0">
                        <div className="w-full md:flex-1">
                            <label htmlFor="searchTerm" className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Search</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="h-4 w-4 text-brand-sage" />
                                </div>
                                <input
                                    type="text"
                                    name="searchTerm"
                                    id="searchTerm"
                                    className="block w-full pl-10 pr-3 py-2 border border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-10 rounded-md focus:outline-none focus:border-brand-primary"
                                    placeholder="Order ID, name, mobile..."
                                    value={filters.searchTerm}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-48">
                            <label htmlFor="orderType" className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Order Type</label>
                            <select id="orderType" name="orderType" className="block w-full py-2 px-3 border border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-10 rounded-md focus:outline-none focus:border-brand-primary" value={filters.orderType} onChange={handleFilterChange}>
                                <option value="">All Types</option>
                                <option value="dine-in">Dine-In</option>
                                <option value="takeaway">Takeaway</option>
                                <option value="delivery">Delivery</option>
                                <option value="room service">Room Service</option>
                            </select>
                        </div>
                        <div className="w-full md:w-48">
                            <label htmlFor="dateFilter" className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Date</label>
                            <select id="dateFilter" name="dateFilter" className="block w-full py-2 px-3 border border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-10 rounded-md focus:outline-none focus:border-brand-primary" value={filters.dateFilter} onChange={handleFilterChange}>
                                <option value="">All Dates</option>
                                <option value="today">Today</option>
                                <option value="lastweek">Last Week</option>
                                <option value="thisMonth">This Month</option>
                                <option value="previousMonth">Previous Month</option>
                                <option value="last6months">Last 6 Months</option>
                                <option value="last1year">Last 1 Year</option>
                            </select>
                        </div>
                        <button
                            onClick={resetFilters}
                            className="inline-flex items-center justify-center border border-red-500/30 text-red-500 rounded-md bg-transparent hover:bg-red-500/10 h-10 w-10 cursor-pointer"
                            title="Reset Filters"
                        >
                            <FiRefreshCw className="h-5 w-5" />
                        </button>
                    </div>
                </section>
                
                {isLoading ? <MtableLoading data={null} /> : (
                    <>
                        <section className="overflow-x-auto border border-brand-beige dark:border-brand-beige/25 shadow-xl rounded-2xl bg-white dark:bg-brand-charcoal">
                            <table className="min-w-full divide-y divide-brand-beige dark:divide-brand-beige/25">
                                <thead className="bg-brand-offwhite dark:bg-zinc-850">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-brand-sage uppercase tracking-wider rounded-tl-lg">Age & Status</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Date & Time</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Guest Name</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Total</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Order Type</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Table / Room</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-brand-sage uppercase tracking-wider rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-brand-charcoal/30 divide-y divide-brand-beige dark:divide-brand-beige/15 text-sm font-semibold">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-brand-sage font-bold">
                                                No pending orders match the current filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((order) => {
                                            const timeStyle = getElapsedTimeStyle(order.dateTime || order.createdAt);
                                            return (
                                                <tr key={order._id} className={`hover:bg-brand-beige/10 dark:hover:bg-brand-beige/5 transition-colors duration-200 border-b border-brand-beige/20 dark:border-brand-beige/15 ${timeStyle.borderClass}`}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                        <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${timeStyle.badgeClass}`}>
                                                            {timeStyle.text}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-brand-sage font-medium">
                                                        {new Date(order.dateTime || order.createdAt).toLocaleString("en-GB")}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-brand-charcoal dark:text-brand-offwhite font-bold">
                                                        {order.customerName || order.customer?.name || 'Walk-in Guest'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-brand-charcoal dark:text-brand-offwhite font-extrabold text-base">
                                                        ৳ {(order.totalAmount || order.grandTotal || 0).toFixed(0)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-brand-charcoal dark:text-brand-offwhite capitalize">
                                                        {order.orderType}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-brand-charcoal dark:text-brand-offwhite font-semibold">
                                                        {order.tableName || order.roomNo || order.tableNo || order.deliveryProvider || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                                        <div className="flex justify-end items-center flex-wrap gap-2">
                                                            <button onClick={() => handleViewOrder(order)} title="View Order" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 dark:bg-brand-primary/20 dark:text-brand-sage text-xs font-semibold cursor-pointer"><FiEye size={13} /><span>View</span></button>
                                                            <button onClick={() => handleCompleteClick(order)} title="Complete/Paid" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-400 text-xs font-semibold cursor-pointer"><FiCheckCircle size={13} /><span>Pay</span></button>
                                                            <button onClick={() => handleEditClick(order._id)} title="Edit Order" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 dark:bg-brand-primary/20 dark:text-brand-sage text-xs font-semibold cursor-pointer"><FiEdit size={13} /><span>Edit</span></button>
                                                            <button onClick={() => handleRemove(order._id)} title="Delete Order" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-red-600 bg-red-500/10 hover:bg-red-500/20 dark:bg-red-950/20 dark:text-red-400 text-xs font-semibold cursor-pointer"><FiTrash2 size={13} /><span>Delete</span></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </section>

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-6">
                                <span className="text-sm font-bold text-brand-sage">Page {currentPage} of {totalPages}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="btn btn-sm btn-outline border-brand-primary hover:bg-brand-primary text-brand-primary hover:text-white rounded-md disabled:opacity-50 cursor-pointer"
                                    >
                                        <FiChevronLeft /> Prev
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
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
            {isModalOpen && viewOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/25 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-scale-in">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite cursor-pointer"
                        >
                            <FiX size={24} />
                        </button>
                        
                        <h2 className="text-2xl font-black text-brand-charcoal dark:text-brand-offwhite uppercase tracking-widest flex items-center gap-2 mb-4">
                            <FaHashtag /> {viewOrder.invoiceSerial || viewOrder.invoiceNo}
                        </h2>
 
                        <div className="grid grid-cols-2 gap-4 border-b border-brand-beige/20 dark:border-brand-beige/10 pb-4 mb-4 text-xs font-semibold">
                            <div>
                                <p className="text-brand-sage flex items-center gap-1.5 uppercase tracking-wider"><FaCalendarAlt /> DateTime</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold">{new Date(viewOrder.dateTime || viewOrder.createdAt).toLocaleString("en-GB")}</p>
                            </div>
                            <div>
                                <p className="text-brand-sage flex items-center gap-1.5 uppercase tracking-wider"><FaUserAlt /> Guest</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold">{viewOrder.customerName || viewOrder.customer?.name || "Walk-in Guest"}</p>
                            </div>
                            <div>
                                <p className="text-brand-sage flex items-center gap-1.5 uppercase tracking-wider"><FaClock /> Order Type</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold uppercase">{viewOrder.orderType}</p>
                            </div>
                            <div>
                                <p className="text-brand-sage flex items-center gap-1.5 uppercase tracking-wider"><FaMoneyBillWave /> Payment Status</p>
                                <p className="text-red-500 mt-0.5 font-extrabold uppercase">{viewOrder.paymentStatus || "Unpaid"}</p>
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
                                        {Array.isArray(viewOrder.products) && viewOrder.products.length > 0 ? (
                                            viewOrder.products.map((item, index) => (
                                                <tr key={index} className="border-b border-brand-beige/10">
                                                    <td className="py-2 text-left">{item.productName}</td>
                                                    <td className="py-2 text-center font-extrabold">{item.qty || item.quantity}</td>
                                                    <td className="py-2 text-right">৳ {(item.rate || item.unitPrice || 0).toFixed(0)}</td>
                                                    <td className="py-2 text-right">৳ {(item.subtotal || item.totalPrice || 0).toFixed(0)}</td>
                                                </tr>
                                            ))
                                        ) : Array.isArray(viewOrder.orderBatches) && viewOrder.orderBatches.length > 0 ? (
                                            viewOrder.orderBatches.flatMap(b => b.items || []).map((item, index) => (
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
                            <p>Subtotal: ৳ {(viewOrder.subtotal || viewOrder.subTotal || 0).toFixed(0)}</p>
                            {viewOrder.vat > 0 && <p>VAT: ৳ {viewOrder.vat.toFixed(0)}</p>}
                            {viewOrder.sd > 0 && <p>SD: ৳ {viewOrder.sd.toFixed(0)}</p>}
                            {viewOrder.serviceCharge > 0 && <p>Service Charge: ৳ {viewOrder.serviceCharge.toFixed(0)}</p>}
                            {viewOrder.deliveryCharge > 0 && <p>Delivery Charge: ৳ {viewOrder.deliveryCharge.toFixed(0)}</p>}
                            {viewOrder.discount > 0 && <p className="text-green-600">Discount: -৳ {viewOrder.discount.toFixed(0)}</p>}
                            <p className="text-lg font-black text-brand-primary dark:text-brand-sage mt-1 uppercase tracking-wider">Total Payable: ৳ {(viewOrder.totalAmount || viewOrder.grandTotal || 0).toFixed(0)}</p>
                        </div>
 
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => handlePrintOrder(viewOrder._id, "thermal")}
                                className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-3 shadow flex items-center gap-1"
                                title="Print POS Thermal Receipt (80mm)"
                            >
                                <FiPrinter /> Print Thermal
                            </button>
                            <button
                                onClick={() => handlePrintOrder(viewOrder._id, "a4")}
                                className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-3 shadow flex items-center gap-1"
                                title="Print A4 Page Invoice"
                            >
                                <FiPrinter /> Print A4
                            </button>
                            <button
                                onClick={() => handleQRCodeClick(viewOrder)}
                                className="btn btn-sm bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-sage font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow flex items-center gap-1.5"
                            >
                                <FaQrcode /> Review QR
                            </button>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="btn btn-sm bg-transparent hover:bg-brand-beige/25 text-brand-sage font-bold text-[10px] uppercase tracking-wider px-4 py-2 cursor-pointer border-none shadow-none"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
 
            {/* QR Code Modal */}
            {isQrModalOpen && selectedOrderForQR && (
                <div className="fixed inset-0 z-50 bg-brand-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative animate-scale-in">
                        <button
                            onClick={() => setIsQrModalOpen(false)}
                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-750 cursor-pointer shadow z-50"
                        >
                            <FiX size={18} />
                        </button>
                        <QRCodeGenerator type="invoice" id={selectedOrderForQR._id} />
                    </div>
                </div>
             )}

            {/* Custom Payment Modal */}
            {isPaymentModalOpen && paymentOrder && (
                <div className="fixed inset-0 z-50 bg-brand-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/25 w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-scale-in">
                        <button
                            onClick={() => setIsPaymentModalOpen(false)}
                            className="absolute top-4 right-4 text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite cursor-pointer border-none bg-transparent"
                        >
                            <FiX size={20} />
                        </button>

                        <h3 className="text-lg font-extrabold text-brand-charcoal dark:text-zinc-100 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <FaMoneyBillWave className="text-brand-primary" /> Settle Payment
                        </h3>
                        <p className="text-xs text-brand-sage font-bold mb-4">
                            Invoice: {paymentOrder.invoiceSerial || paymentOrder.invoiceNo || "N/A"}
                        </p>

                        {/* Order Summary Calculations */}
                        <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 rounded-2xl p-4 border border-brand-beige/25 dark:border-brand-beige/10 mb-6 text-sm font-semibold">
                            <div className="flex justify-between mb-2">
                                <span className="text-brand-sage">Subtotal:</span>
                                <span>৳ {(paymentOrder.subtotal || paymentOrder.subTotal || 0).toFixed(0)}</span>
                            </div>
                            {paymentOrder.discount > 0 && (
                                <div className="flex justify-between mb-2 text-green-600">
                                    <span>Discount:</span>
                                    <span>-৳ {paymentOrder.discount.toFixed(0)}</span>
                                </div>
                            )}
                            {paymentOrder.vat > 0 && (
                                <div className="flex justify-between mb-2">
                                    <span className="text-brand-sage">VAT:</span>
                                    <span>৳ {paymentOrder.vat.toFixed(0)}</span>
                                </div>
                            )}
                            {paymentOrder.sd > 0 && (
                                <div className="flex justify-between mb-2">
                                    <span className="text-brand-sage">SD:</span>
                                    <span>৳ {paymentOrder.sd.toFixed(0)}</span>
                                </div>
                            )}
                            {paymentOrder.serviceCharge > 0 && (
                                <div className="flex justify-between mb-2">
                                    <span className="text-brand-sage">Service Charge:</span>
                                    <span>৳ {paymentOrder.serviceCharge.toFixed(0)}</span>
                                </div>
                            )}
                            {paymentOrder.deliveryCharge > 0 && (
                                <div className="flex justify-between mb-2">
                                    <span className="text-brand-sage">Delivery Charge:</span>
                                    <span>৳ {paymentOrder.deliveryCharge.toFixed(0)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-brand-beige/25 dark:border-brand-beige/10 pt-2 font-black text-lg text-brand-primary dark:text-brand-sage">
                                <span>TOTAL DUE:</span>
                                <span>৳ {(paymentOrder.totalAmount || paymentOrder.grandTotal || 0).toFixed(0)}</span>
                            </div>
                        </div>

                        {/* Payment Methods Grid */}
                        <div className="mb-6">
                            <h4 className="text-xs font-black text-brand-sage uppercase tracking-wider mb-3">Select Payment Method</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {paymentTypes && paymentTypes.length > 0 ? (
                                    paymentTypes.map((pt) => {
                                        const method = pt.name;
                                        const isSelected = selectedMethod === method;
                                        const getPaymentColor = (name) => {
                                            const lower = name.toLowerCase();
                                            if (lower.includes("cash")) return "border-emerald-600 hover:bg-emerald-50/10 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20";
                                            if (lower.includes("bkash")) return "border-pink-600 hover:bg-pink-50/10 text-pink-700 bg-pink-50 dark:bg-pink-950/20";
                                            if (lower.includes("nagad")) return "border-orange-600 hover:bg-orange-50/10 text-orange-700 bg-orange-50 dark:bg-orange-950/20";
                                            if (lower.includes("rocket")) return "border-purple-600 hover:bg-purple-50/10 text-purple-700 bg-purple-50 dark:bg-purple-950/20";
                                            if (lower.includes("visa")) return "border-blue-600 hover:bg-blue-50/10 text-blue-700 bg-blue-50 dark:bg-blue-950/20";
                                            if (lower.includes("master")) return "border-red-600 hover:bg-red-50/10 text-red-700 bg-red-50 dark:bg-red-950/20";
                                            return "border-zinc-600 hover:bg-zinc-50/10 text-zinc-700 bg-zinc-50 dark:bg-zinc-950/20";
                                        };
                                        return (
                                            <button
                                                key={pt._id}
                                                type="button"
                                                onClick={() => setSelectedMethod(method)}
                                                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-[1.02]
                                                    ${isSelected 
                                                        ? "bg-brand-primary text-white border-brand-primary border-2" 
                                                        : `border-brand-beige/25 dark:border-zinc-850 bg-transparent ${getPaymentColor(method).split(" ").slice(1).join(" ")}`}`}
                                            >
                                                <span className="text-xs font-black uppercase tracking-wider">{method}</span>
                                                <span className={`text-[9px] ${isSelected ? "text-white/80" : "text-brand-sage"}`}>{pt.type || "Billing Method"}</span>
                                            </button>
                                        );
                                    })
                                ) : (
                                    ["Cash", "Card", "Mobile", "Bank"].map((method) => {
                                        const isSelected = selectedMethod === method;
                                        return (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setSelectedMethod(method)}
                                                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-[1.02]
                                                    ${isSelected 
                                                        ? "bg-brand-primary text-white border-brand-primary" 
                                                        : "border-brand-beige/25 dark:border-zinc-850 text-brand-charcoal dark:text-zinc-300 bg-transparent"}`}
                                            >
                                                <span className="text-xs font-black uppercase tracking-wider">{method}</span>
                                                <span className={`text-[9px] ${isSelected ? "text-white/80" : "text-brand-sage"}`}>Payment Method</span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Confirmation Buttons */}
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="btn btn-sm bg-transparent hover:bg-brand-beige/25 text-brand-sage font-bold text-[10px] uppercase tracking-wider px-4 py-2 cursor-pointer border-none shadow-none"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleOrderUpdate(paymentOrder._id, "completed", selectedMethod);
                                    setIsPaymentModalOpen(false);
                                }}
                                className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow flex items-center gap-1.5"
                            >
                                <FaMoneyBillWave /> Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
 
            <div className="hidden">
                {isPrintModalOpen && printData && (
                    <>
                        <ReceiptTemplate
                            ref={receiptRef}
                            onPrintComplete={handlePrintComplete}
                            profileData={companyInfo}
                            invoiceData={printData ? { ...printData, loginUserName: printData.loginUserName || user?.name || "Staff" } : null}
                        />
                        <A4ReceiptTemplate
                            ref={a4ReceiptRef}
                            onPrintComplete={handlePrintComplete}
                            profileData={companyInfo}
                            invoiceData={printData}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export default function PendingOrdersPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] w-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
            <PendingOrdersContent />
        </Suspense>
    );
}
