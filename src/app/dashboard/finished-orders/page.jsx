"use client";

import React, { useState, useEffect, useContext, useRef, useCallback, Suspense } from "react";
import {
    FiSearch, FiRefreshCw, FiX, FiEye, FiPrinter, FiChevronLeft, FiChevronRight, FiFilter
} from "react-icons/fi";
import { FaCalendarAlt, FaUser as FaUserAlt, FaHashtag, FaMoneyBillWave, FaQrcode } from "react-icons/fa";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import ReceiptTemplate from "@/components/Receipt/ReceiptTemplate";
import MtableLoading from "@/components/Comon/MtableLoading";
import QRCodeGenerator from "@/components/pos/QRCodeGenerator";

const ITEMS_PER_PAGE = 15;

function FinishedOrdersContent() {
    const axiosSecure = useAxiosSecure();
    const receiptRef = useRef();
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
    const [companyInfo, setCompanyInfo] = useState(null);

    // Filters
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
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
        setCurrentPage(1);
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
        fetchOrders(currentPage);
    }, [fetchOrders, currentPage]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({ orderType: "", paymentStatus: "Paid" });
        setSearchTerm("");
        setStartDate("");
        setEndDate("");
        setIsFilterOpen(false);
        setCurrentPage(1);
    };

    const handleViewOrder = (order) => {
        setSelectedOrder(order);
        setIsViewModalOpen(true);
    };

    const handlePrintOrder = () => {
        setIsViewModalOpen(false);
        setIsPrintModalOpen(true);
    };

    const handleQRCodeClick = () => {
        setIsViewModalOpen(false);
        setIsQrModalOpen(true);
    };

    useEffect(() => {
        if (isPrintModalOpen && selectedOrder && receiptRef.current) {
            const timer = setTimeout(() => {
                receiptRef.current.printReceipt();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isPrintModalOpen, selectedOrder]);

    const handlePrintComplete = () => {
        setIsPrintModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-150 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
            <div>
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-800 dark:text-zinc-100">Finished Orders</h1>
                        <p className="text-sm text-gray-500 mt-1">Complete historic record of sales invoices</p>
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`mt-3 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 border rounded-lg shadow-sm text-sm font-semibold cursor-pointer transition-colors duration-200
                            ${isFilterOpen ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 hover:bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-250 dark:hover:bg-zinc-800"}`}
                    >
                        <FiFilter /> Filters {isFilterOpen ? "Open" : ""}
                    </button>
                </div>

                {/* Filter Section */}
                {isFilterOpen && (
                    <section className="mb-6 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-md rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                        <div>
                            <label className="block text-xs font-semibold text-gray-550 mb-1">Search Keyword</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Invoice, Customer, Table..."
                                    className="input input-bordered input-sm w-full pl-9 dark:bg-zinc-800 dark:border-zinc-700"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-550 mb-1">Start Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full dark:bg-zinc-800 dark:border-zinc-700"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-550 mb-1">End Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full dark:bg-zinc-800 dark:border-zinc-700"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-550 mb-1">Order Type</label>
                            <select
                                name="orderType"
                                value={filters.orderType}
                                onChange={handleFilterChange}
                                className="select select-bordered select-sm w-full dark:bg-zinc-800 dark:border-zinc-700"
                            >
                                <option value="">All Types</option>
                                <option value="dine-in">Dine In</option>
                                <option value="takeaway">Takeaway</option>
                                <option value="delivery">Delivery</option>
                                <option value="room service">Room Service</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-550 mb-1">Payment Status</label>
                            <select
                                name="paymentStatus"
                                value={filters.paymentStatus}
                                onChange={handleFilterChange}
                                className="select select-bordered select-sm w-full dark:bg-zinc-800 dark:border-zinc-700"
                            >
                                <option value="">All Payments</option>
                                <option value="Paid">Paid / Finished</option>
                                <option value="Unpaid">Due / Pending</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2 md:col-span-3 flex justify-end items-end gap-2">
                            <button
                                onClick={clearFilters}
                                className="btn btn-sm btn-ghost dark:text-zinc-400 cursor-pointer"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </section>
                )}

                {/* Table View */}
                {isLoading ? <MtableLoading data={null} /> : (
                    <>
                        <section className="overflow-x-auto border border-gray-200 dark:border-zinc-800 shadow-sm rounded-lg p-4 bg-white dark:bg-zinc-900">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-slate-100 dark:bg-zinc-800">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-200 uppercase tracking-wider rounded-tl-lg">Invoice No</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-200 uppercase tracking-wider">Date & Time</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-200 uppercase tracking-wider">Guest</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-200 uppercase tracking-wider">Order Type</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-200 uppercase tracking-wider">Table / Room</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-200 uppercase tracking-wider">Amount</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-200 uppercase tracking-wider">Payment Status</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-zinc-200 uppercase tracking-wider rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-8 text-sm text-gray-500 dark:text-zinc-400 text-center">
                                                No finished orders found.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((order) => (
                                            <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-zinc-850/50 transition-colors duration-200 border-b border-gray-250 dark:border-zinc-800/80">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-zinc-200 font-bold">
                                                    {order.invoiceSerial || order.invoiceNo}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-zinc-400">
                                                    {new Date(order.dateTime || order.createdAt).toLocaleString("en-GB")}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-zinc-250">
                                                    {order.customerName || order.customer?.name || "Walk-in Guest"}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm capitalize">
                                                    {order.orderType}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                                                    {order.tableName || order.roomNo || order.tableNo || order.deliveryProvider || "N/A"}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-extrabold text-blue-600 dark:text-blue-400">
                                                    ৳ {(order.totalAmount || order.grandTotal || 0).toFixed(0)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider
                                                        ${(order.paymentStatus === 'Paid' || order.paymentMethod !== 'Due') ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'}`}>
                                                        {order.paymentStatus === 'Paid' ? 'Paid' : 'Due'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                                    <button
                                                        onClick={() => handleViewOrder(order)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold text-xs cursor-pointer"
                                                    >
                                                        <FiEye /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </section>

                        {/* Pagination */}
                        {paginationInfo.totalPages > 1 && (
                            <div className="flex justify-between items-center mt-6">
                                <span className="text-sm text-gray-500">Page {currentPage} of {paginationInfo.totalPages}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={!paginationInfo.hasPrevPage}
                                        className="btn btn-sm btn-outline disabled:opacity-50 cursor-pointer"
                                    >
                                        <FiChevronLeft /> Prev
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationInfo.totalPages))}
                                        disabled={!paginationInfo.hasNextPage}
                                        className="btn btn-sm btn-outline disabled:opacity-50 cursor-pointer"
                                    >
                                        Next <FiChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* View Modal */}
            {isViewModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto text-gray-800 dark:text-zinc-150">
                        <button
                            onClick={() => setIsViewModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        >
                            <FiX size={24} />
                        </button>

                        <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                            <FaHashtag /> {selectedOrder.invoiceSerial || selectedOrder.invoiceNo}
                        </h2>

                        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 dark:border-zinc-850 pb-4 mb-4 text-xs font-semibold">
                            <div>
                                <p className="text-gray-500 flex items-center gap-1.5"><FaCalendarAlt /> Date & Time</p>
                                <p className="text-gray-800 dark:text-zinc-250 mt-0.5">{new Date(selectedOrder.dateTime || selectedOrder.createdAt).toLocaleString("en-GB")}</p>
                            </div>
                            <div>
                                <p className="text-gray-550 flex items-center gap-1.5"><FaUserAlt /> Guest Name</p>
                                <p className="text-gray-800 dark:text-zinc-250 mt-0.5">{selectedOrder.customerName || selectedOrder.customer?.name || "Walk-in Guest"}</p>
                            </div>
                            <div>
                                <p className="text-gray-550 flex items-center gap-1.5">Order Type</p>
                                <p className="text-gray-800 dark:text-zinc-250 mt-0.5 uppercase">{selectedOrder.orderType}</p>
                            </div>
                            <div>
                                <p className="text-gray-550 flex items-center gap-1.5">Payment Method</p>
                                <p className="text-green-600 mt-0.5 font-bold uppercase">{selectedOrder.paymentMethod || "Cash"}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-gray-600 dark:text-zinc-450 mb-2 uppercase tracking-wider">Order Items</h3>
                            <div className="bg-gray-50 dark:bg-zinc-850 rounded-xl p-3">
                                <table className="min-w-full text-xs font-semibold text-gray-700 dark:text-zinc-250">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-zinc-800">
                                            <th className="text-left pb-2">Item Name</th>
                                            <th className="text-center pb-2">Qty</th>
                                            <th className="text-right pb-2">Rate</th>
                                            <th className="text-right pb-2">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(selectedOrder.products) && selectedOrder.products.length > 0 ? (
                                            selectedOrder.products.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="py-2 text-left">{item.productName}</td>
                                                    <td className="py-2 text-center">{item.qty || item.quantity}</td>
                                                    <td className="py-2 text-right">৳ {(item.rate || item.unitPrice || 0).toFixed(0)}</td>
                                                    <td className="py-2 text-right">৳ {(item.subtotal || item.totalPrice || 0).toFixed(0)}</td>
                                                </tr>
                                            ))
                                        ) : Array.isArray(selectedOrder.orderBatches) && selectedOrder.orderBatches.length > 0 ? (
                                            selectedOrder.orderBatches.flatMap(b => b.items || []).map((item, index) => (
                                                <tr key={index}>
                                                    <td className="py-2 text-left">{item.itemName}</td>
                                                    <td className="py-2 text-center">{item.quantity}</td>
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

                        {/* Summary Calculations */}
                        <div className="flex flex-col items-end gap-1.5 text-xs font-semibold border-t border-gray-200 dark:border-zinc-800 pt-3">
                            <p>Subtotal: ৳ {(selectedOrder.subtotal || selectedOrder.subTotal || 0).toFixed(0)}</p>
                            {selectedOrder.vat > 0 && <p>VAT: ৳ {selectedOrder.vat.toFixed(0)}</p>}
                            {selectedOrder.sd > 0 && <p>SD: ৳ {selectedOrder.sd.toFixed(0)}</p>}
                            {selectedOrder.discount > 0 && <p className="text-green-600 font-bold">Discount: -৳ {selectedOrder.discount.toFixed(0)}</p>}
                            <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-1">Total Amount: ৳ {(selectedOrder.totalAmount || selectedOrder.grandTotal || 0).toFixed(0)}</p>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={handlePrintOrder}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs cursor-pointer shadow"
                            >
                                <FiPrinter /> Print Receipt
                            </button>
                            <button
                                onClick={handleQRCodeClick}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-xs cursor-pointer shadow"
                            >
                                <FaQrcode /> Review QR
                            </button>
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="px-4 py-2 bg-gray-250 dark:bg-zinc-850 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-800 text-xs font-bold cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {isQrModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="relative">
                        <button
                            onClick={() => setIsQrModalOpen(false)}
                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-750 cursor-pointer shadow"
                        >
                            <FiX size={18} />
                        </button>
                        <QRCodeGenerator type="invoice" id={selectedOrder._id} />
                    </div>
                </div>
            )}

            {/* Print template container */}
            <div className="hidden">
                {isPrintModalOpen && selectedOrder && (
                    <ReceiptTemplate
                        ref={receiptRef}
                        onPrintComplete={handlePrintComplete}
                        profileData={companyInfo}
                        invoiceData={selectedOrder}
                    />
                )}
            </div>
        </div>
    );
}

export default function FinishedOrdersPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] w-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <FinishedOrdersContent />
        </Suspense>
    );
}
