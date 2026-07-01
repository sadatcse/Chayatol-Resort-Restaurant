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
import MtableLoading from "@/components/Comon/MtableLoading";
import QRCodeGenerator from "@/components/pos/QRCodeGenerator";

const ITEMS_PER_PAGE = 10;

function PendingOrdersContent() {
    const axiosSecure = useAxiosSecure();
    const receiptRef = useRef();
    const { user } = useContext(AuthContext);

    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewOrder, setViewOrder] = useState(null);

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState(null);
    const [companyInfo, setCompanyInfo] = useState(null);

    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [selectedOrderForQR, setSelectedOrderForQR] = useState(null);

    const [filters, setFilters] = useState({
        searchTerm: '',
        orderType: ''
    });
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    // Fetch company profile for invoice printing
    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const res = await axiosSecure.get("/company");
                if (res.data && res.data.length > 0) {
                    setCompanyInfo(res.data[0]);
                }
            } catch (err) {
                console.error("Error fetching company profile:", err);
            }
        };
        fetchCompany();
    }, [axiosSecure]);

    // Debounce search input
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(filters.searchTerm);
        }, 500);
        return () => clearTimeout(timerId);
    }, [filters.searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, filters.orderType]);

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
    }, [axiosSecure, debouncedSearchTerm, filters.orderType, currentPage]);

    useEffect(() => {
        fetchPendingOrders();
    }, [fetchPendingOrders]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({ searchTerm: '', orderType: '' });
    };

    const handleOrderUpdate = async (id, status) => {
        try {
            setIsLoading(true);
            await axiosSecure.put(`/pos/invoice/${id}`, { 
                orderStatus: status === 'completed' ? 'served' : status,
                paymentStatus: status === 'completed' ? 'Paid' : 'Unpaid'
            });
            fetchPendingOrders();
            Swal.fire("Success!", `Order has been updated to ${status}.`, "success");
        } catch (error) {
            console.error("Error updating order status:", error);
            Swal.fire("Error!", "Failed to update order status. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteClick = (id) => {
        Swal.fire({
            title: 'Confirm Payment',
            text: "Is the payment for this order cleared?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, payment is clear!',
            cancelButtonText: 'No, not yet'
        }).then((result) => {
            if (result.isConfirmed) {
                handleOrderUpdate(id, "completed");
            }
        });
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

    const handlePrintOrder = (id) => {
        const orderToPrint = orders.find(order => order._id === id);
        if (orderToPrint) {
            setPrintData(orderToPrint);
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
        if (isPrintModalOpen && printData && receiptRef.current) {
            const timer = setTimeout(() => {
                receiptRef.current.printReceipt();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isPrintModalOpen, printData]);

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
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 p-4 sm:p-6 lg:p-8 font-inter transition-colors duration-200">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-800 dark:text-zinc-100 mb-6">Pending Orders</h1>

                <section className="my-6 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm rounded-lg">
                    <div className="flex flex-col md:flex-row md:items-end md:gap-3 space-y-4 md:space-y-0">
                        <div className="w-full md:flex-1">
                            <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Search</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                                </div>
                                <input
                                    type="text"
                                    name="searchTerm"
                                    id="searchTerm"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-850 dark:text-zinc-150 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Order ID, name, mobile..."
                                    value={filters.searchTerm}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-48">
                            <label htmlFor="orderType" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Order Type</label>
                            <select id="orderType" name="orderType" className="block w-full py-2 px-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-850 dark:text-zinc-150 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={filters.orderType} onChange={handleFilterChange}>
                                <option value="">All Types</option>
                                <option value="dine-in">Dine-In</option>
                                <option value="takeaway">Takeaway</option>
                                <option value="delivery">Delivery</option>
                                <option value="room service">Room Service</option>
                            </select>
                        </div>
                        <button
                            onClick={resetFilters}
                            className="inline-flex items-center justify-center p-2 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 h-[42px] w-[42px] cursor-pointer"
                            title="Reset Filters"
                        >
                            <FiRefreshCw className="h-5 w-5" />
                        </button>
                    </div>
                </section>
                
                {isLoading ? <MtableLoading data={null} /> : (
                    <>
                        <section className="overflow-x-auto border border-gray-200 dark:border-zinc-800 shadow-sm rounded-lg p-4 bg-white dark:bg-zinc-900">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-blue-600 dark:bg-zinc-800">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider rounded-tl-lg">Age & Status</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date & Time</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Guest Name</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Total</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Order Type</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Table / Room</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-sm text-gray-500 dark:text-zinc-400 text-center">
                                                No pending orders match the current filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((order) => {
                                            const timeStyle = getElapsedTimeStyle(order.dateTime || order.createdAt);
                                            return (
                                                <tr key={order._id} className={`hover:bg-gray-50 dark:hover:bg-zinc-850/50 transition-colors duration-200 border-b border-gray-200 dark:border-zinc-800 ${timeStyle.borderClass}`}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                        <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${timeStyle.badgeClass}`}>
                                                            {timeStyle.text}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-zinc-300">
                                                        {new Date(order.dateTime || order.createdAt).toLocaleString("en-GB")}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-750 dark:text-zinc-200 font-bold">
                                                        {order.customerName || order.customer?.name || 'Walk-in Guest'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-zinc-150 font-extrabold">
                                                        ৳ {(order.totalAmount || order.grandTotal || 0).toFixed(0)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-zinc-300 capitalize">
                                                        {order.orderType}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-750 dark:text-zinc-200 font-semibold">
                                                        {order.tableName || order.roomNo || order.tableNo || order.deliveryProvider || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end items-center flex-wrap gap-2">
                                                            <button onClick={() => handleViewOrder(order)} title="View Order" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-semibold bg-blue-600 hover:bg-blue-700 cursor-pointer"><FiEye size={13} /><span>View</span></button>
                                                            <button onClick={() => handleCompleteClick(order._id)} title="Complete/Paid" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 cursor-pointer"><FiCheckCircle size={13} /><span>Pay</span></button>
                                                            <button onClick={() => handleEditClick(order._id)} title="Edit Order" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 cursor-pointer"><FiEdit size={13} /><span>Edit</span></button>
                                                            <button onClick={() => handleRemove(order._id)} title="Delete Order" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-semibold bg-red-650 hover:bg-red-750 cursor-pointer"><FiTrash2 size={13} /><span>Delete</span></button>
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
                                <span className="text-sm text-gray-750 dark:text-zinc-400">Page {currentPage} of {totalPages}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="btn btn-sm btn-outline dark:border-zinc-800 disabled:opacity-50 cursor-pointer"
                                    >
                                        <FiChevronLeft /> Prev
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="btn btn-sm btn-outline dark:border-zinc-800 disabled:opacity-50 cursor-pointer"
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
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        >
                            <FiX size={24} />
                        </button>
                        
                        <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                            <FaHashtag /> {viewOrder.invoiceSerial || viewOrder.invoiceNo}
                        </h2>

                        <div className="grid grid-cols-2 gap-4 border-b border-gray-150 dark:border-zinc-800 pb-4 mb-4 text-xs font-semibold">
                            <div>
                                <p className="text-gray-550 flex items-center gap-1.5"><FaCalendarAlt /> DateTime</p>
                                <p className="text-gray-800 dark:text-zinc-250 mt-0.5">{new Date(viewOrder.dateTime || viewOrder.createdAt).toLocaleString("en-GB")}</p>
                            </div>
                            <div>
                                <p className="text-gray-550 flex items-center gap-1.5"><FaUserAlt /> Guest</p>
                                <p className="text-gray-800 dark:text-zinc-250 mt-0.5">{viewOrder.customerName || viewOrder.customer?.name || "Walk-in Guest"}</p>
                            </div>
                            <div>
                                <p className="text-gray-550 flex items-center gap-1.5"><FaClock /> Order Type</p>
                                <p className="text-gray-800 dark:text-zinc-250 mt-0.5 uppercase">{viewOrder.orderType}</p>
                            </div>
                            <div>
                                <p className="text-gray-550 flex items-center gap-1.5"><FaMoneyBillWave /> Payment Status</p>
                                <p className="text-red-500 mt-0.5 font-extrabold uppercase">{viewOrder.paymentStatus || "Unpaid"}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-gray-600 dark:text-zinc-400 mb-2 uppercase tracking-wider">Order Items</h3>
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
                                        {Array.isArray(viewOrder.products) && viewOrder.products.length > 0 ? (
                                            viewOrder.products.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="py-2 text-left">{item.productName}</td>
                                                    <td className="py-2 text-center">{item.qty || item.quantity}</td>
                                                    <td className="py-2 text-right">৳ {(item.rate || item.unitPrice || 0).toFixed(0)}</td>
                                                    <td className="py-2 text-right">৳ {(item.subtotal || item.totalPrice || 0).toFixed(0)}</td>
                                                </tr>
                                            ))
                                        ) : Array.isArray(viewOrder.orderBatches) && viewOrder.orderBatches.length > 0 ? (
                                            viewOrder.orderBatches.flatMap(b => b.items || []).map((item, index) => (
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

                        {/* Order Summary Calculations */}
                        <div className="flex flex-col items-end gap-1.5 text-xs font-semibold border-t border-gray-150 dark:border-zinc-800 pt-3">
                            <p>Subtotal: ৳ {(viewOrder.subtotal || viewOrder.subTotal || 0).toFixed(0)}</p>
                            {viewOrder.vat > 0 && <p>VAT: ৳ {viewOrder.vat.toFixed(0)}</p>}
                            {viewOrder.sd > 0 && <p>SD: ৳ {viewOrder.sd.toFixed(0)}</p>}
                            {viewOrder.discount > 0 && <p className="text-green-600">Discount: -৳ {viewOrder.discount.toFixed(0)}</p>}
                            <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-1">Total Payable: ৳ {(viewOrder.totalAmount || viewOrder.grandTotal || 0).toFixed(0)}</p>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => handlePrintOrder(viewOrder._id)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs cursor-pointer shadow"
                            >
                                <FiPrinter /> Print Receipt
                            </button>
                            <button
                                onClick={() => handleQRCodeClick(viewOrder)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-xs cursor-pointer shadow"
                            >
                                <FaQrcode /> Review QR
                            </button>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-zinc-850 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-800 text-xs font-bold cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {isQrModalOpen && selectedOrderForQR && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="relative">
                        <button
                            onClick={() => setIsQrModalOpen(false)}
                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-750 cursor-pointer shadow"
                        >
                            <FiX size={18} />
                        </button>
                        <QRCodeGenerator type="invoice" id={selectedOrderForQR._id} />
                    </div>
                </div>
            )}

            {/* Hidden Printing Iframe Components */}
            <div className="hidden">
                {isPrintModalOpen && printData && (
                    <ReceiptTemplate
                        ref={receiptRef}
                        onPrintComplete={handlePrintComplete}
                        profileData={companyInfo}
                        invoiceData={printData}
                    />
                )}
            </div>
        </div>
    );
}

export default function PendingOrdersPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] w-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <PendingOrdersContent />
        </Suspense>
    );
}
