"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiRefreshCw, FiEye, FiX, FiPrinter } from "react-icons/fi";
import { FaPrint } from "react-icons/fa";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";
import ReceiptTemplate from "@/components/Receipt/ReceiptTemplate";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import CustomOrdersThermalTemplate from "@/components/Receipt/CustomOrdersThermalTemplate";
import useStandardPrint from "@/hooks/useStandardPrint";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";
import usePagePermission from "@/hooks/usePagePermission";

function CustomOrdersContent() {
    const axiosSecure = useAxiosSecure();
    const receiptRef = useRef();
    const { canEdit } = usePagePermission();
    const thermalPrintRef = useRef();

    const handleThermalPrintClick = () => {
        if (thermalPrintRef.current) {
            thermalPrintRef.current.printReceipt();
        }
    };

    const getFormattedDate = (date) => {
        return date.toISOString().slice(0, 10);
    };

    const [fromDate, setFromDate] = useState(getFormattedDate(new Date()));
    const [toDate, setToDate] = useState(getFormattedDate(new Date()));
    const [orders, setOrders] = useState([]);
    const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });
    const [isLoading, setIsLoading] = useState(false);
    
    // Detailed Modal View
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [companyInfo, setCompanyInfo] = useState(null);

    const {
        printData,
        setPrintData,
        printRef,
    } = useStandardPrint({
        documentTitle: "Custom_Orders_Report"
    });

    const [filters, setFilters] = useState({
        orderType: "",
        orderStatus: "",
        paymentStatus: "",
        searchTerm: ""
    });

    // Fetch company info for invoice templates
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

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSearch = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {
                startDate: fromDate,
                endDate: toDate,
                orderType: filters.orderType,
                orderStatus: filters.orderStatus,
                paymentStatus: filters.paymentStatus,
                search: filters.searchTerm,
                limit: 100 // fetch a large range for report listing
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const response = await axiosSecure.get("/pos/invoice", { params });
            if (response.data?.success) {
                const invs = response.data.invoices || response.data.data || [];
                setOrders(invs);
                
                // Group summary calculations
                const totalAmount = invs.reduce((sum, item) => sum + (item.totalAmount || item.grandTotal || 0), 0);
                setSummary({
                    totalAmount,
                    count: invs.length
                });
            }
        } catch (error) {
            console.error("Error fetching filtered custom orders:", error);
            setOrders([]);
            setSummary({ totalAmount: 0, count: 0 });
        } finally {
            setIsLoading(false);
        }
    }, [axiosSecure, fromDate, toDate, filters]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        handleSearch();
    }, [handleSearch]);

    const handleExportExcel = () => {
        const formatted = orders.map((order, idx) => ({
            "Sl No": idx + 1,
            "Invoice No": order.invoiceSerial || order.invoiceNo,
            "Date": new Date(order.dateTime || order.createdAt).toLocaleString("en-GB"),
            "Customer": order.customerName || order.customer?.name || "Walk-in Guest",
            "Type": order.orderType,
            "Table/Room": order.tableName || order.roomNo || order.tableNo || "N/A",
            "Amount": order.totalAmount || order.grandTotal || 0,
            "Status": order.paymentStatus || "Unpaid"
        }));
        exportToExcel(formatted, "Custom_Orders_Report");
    };

    const handleExportCsv = () => {
        const formatted = orders.map((order, idx) => ({
            "Sl No": idx + 1,
            "Invoice No": order.invoiceSerial || order.invoiceNo,
            "Date": new Date(order.dateTime || order.createdAt).toLocaleString("en-GB"),
            "Customer": order.customerName || order.customer?.name || "Walk-in Guest",
            "Type": order.orderType,
            "Table/Room": order.tableName || order.roomNo || order.tableNo || "N/A",
            "Amount": order.totalAmount || order.grandTotal || 0,
            "Status": order.paymentStatus || "Unpaid"
        }));
        exportToCsv(formatted, "Custom_Orders_Report");
    };

    const handlePrintClick = () => {
        setPrintData(orders);
    };

    const resetFilters = () => {
        setFromDate(getFormattedDate(new Date()));
        setToDate(getFormattedDate(new Date()));
        setFilters({
            orderType: "",
            orderStatus: "",
            paymentStatus: "",
            searchTerm: ""
        });
    };

    const handleViewDetails = (order) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };

    const handlePrintOrder = () => {
        setIsDetailModalOpen(false);
        setIsPrintModalOpen(true);
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
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen font-sans transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Custom Order Report</h1>
                        <p className="text-sm text-gray-500 mt-1">Run advanced sales query logs from the transaction database</p>
                    </div>
                    {orders.length > 0 && canEdit && (
                        <div className="flex gap-2 items-center flex-wrap">
                            <ExportButtons
                                onExportExcel={handleExportExcel}
                                onExportCsv={handleExportCsv}
                                onPrint={handlePrintClick}
                                isLoading={isLoading}
                            />
                            <button
                                onClick={handleThermalPrintClick}
                                disabled={isLoading}
                                className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-850 text-white border-none rounded-full flex items-center gap-2 px-4 shadow-sm active:scale-95 transition-all text-xs font-semibold cursor-pointer h-9"
                                title="Print Thermal Receipt"
                            >
                                <FaPrint className="text-sm shrink-0" />
                                <span>Thermal Print</span>
                            </button>
                        </div>
                    )}
                </header>

                {/* Filters Board */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 shadow-xl mb-6 p-6"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs font-bold text-gray-500">From Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="mb-1 text-xs font-bold text-gray-500">To Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="mb-1 text-xs font-bold text-gray-500">Order Type</label>
                            <select
                                name="orderType"
                                value={filters.orderType}
                                onChange={handleFilterChange}
                                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                            >
                                <option value="">All Types</option>
                                <option value="dine-in">Dine In</option>
                                <option value="takeaway">Takeaway</option>
                                <option value="delivery">Delivery</option>
                                <option value="room service">Room Service</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="mb-1 text-xs font-bold text-gray-500">Payment Status</label>
                            <select
                                name="paymentStatus"
                                value={filters.paymentStatus}
                                onChange={handleFilterChange}
                                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                            >
                                <option value="">All Payment</option>
                                <option value="Paid">Paid</option>
                                <option value="Unpaid">Due / Unpaid</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="mb-1 text-xs font-bold text-gray-500">Search Keyword</label>
                            <input
                                type="text"
                                name="searchTerm"
                                value={filters.searchTerm}
                                onChange={handleFilterChange}
                                placeholder="Invoice, Customer, Table..."
                                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={resetFilters}
                                className="btn btn-sm btn-ghost dark:text-zinc-400 cursor-pointer flex-1"
                            >
                                <FiRefreshCw />
                            </button>
                            <button
                                onClick={handleSearch}
                                className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer shadow flex-1 border-none"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Dashboard Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-250 dark:border-zinc-800 shadow">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Filtered Sales Count</span>
                        <h3 className="text-2xl font-black text-brand-primary dark:text-brand-sage mt-1">{summary.count} Orders</h3>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-250 dark:border-zinc-800 shadow">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Total Filtered Net Revenue</span>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-1">৳ {summary.totalAmount.toFixed(0)}</h3>
                    </div>
                </div>

                {/* Listing Results */}
                {isLoading ? <MtableLoading /> : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl p-6"
                    >
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-slate-50 dark:bg-zinc-800 text-xs text-gray-500 dark:text-zinc-200 uppercase font-bold">
                                    <tr>
                                        <th className="p-3 text-left rounded-tl-lg">Invoice No</th>
                                        <th className="p-3 text-left">Date & Time</th>
                                        <th className="p-3 text-left">Customer</th>
                                        <th className="p-3 text-left">Type</th>
                                        <th className="p-3 text-left">Table/Room</th>
                                        <th className="p-3 text-right">Paid Amount</th>
                                        <th className="p-3 text-left">Status</th>
                                        <th className="p-3 text-right rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-250 dark:divide-zinc-800 text-sm font-semibold text-gray-700 dark:text-zinc-350">
                                    <AnimatePresence>
                                        {orders.length > 0 ? (
                                            orders.map((order) => (
                                                <tr key={order._id} className="hover:bg-slate-50 dark:hover:bg-zinc-850/50 transition">
                                                    <td className="p-3 text-left text-gray-900 dark:text-zinc-150 font-bold">{order.invoiceSerial || order.invoiceNo}</td>
                                                    <td className="p-3 text-left text-xs text-gray-500 dark:text-zinc-400">
                                                        {new Date(order.dateTime || order.createdAt).toLocaleString("en-GB")}
                                                    </td>
                                                    <td className="p-3 text-left">{order.customerName || order.customer?.name || "Walk-in Guest"}</td>
                                                    <td className="p-3 text-left capitalize">{order.orderType}</td>
                                                    <td className="p-3 text-right">
                                                        {order.tableName || order.roomNo || order.tableNo || "N/A"}
                                                    </td>
                                                    <td className="p-3 text-right font-extrabold text-brand-primary dark:text-brand-sage">
                                                        ৳ {(order.totalAmount || order.grandTotal || 0).toFixed(0)}
                                                    </td>
                                                    <td className="p-3 text-left text-xs">
                                                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${order.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'}`}>
                                                            {order.paymentStatus === 'Paid' ? 'Paid' : 'Due'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => handleViewDetails(order)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-md text-xs font-bold cursor-pointer border-none"
                                                        >
                                                            <FiEye /> View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td className="p-3 text-center text-gray-400" colSpan="8">
                                                    No invoices matched the custom range query.
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* View Details Modal */}
            {isDetailModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsDetailModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-505 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        >
                            <FiX size={24} />
                        </button>
                        
                        <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 mb-4">
                            Invoice: {selectedOrder.invoiceSerial || selectedOrder.invoiceNo}
                        </h2>

                        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 dark:border-zinc-850 pb-4 mb-4 text-xs font-semibold">
                            <div>
                                <p className="text-gray-500">Date & Time</p>
                                <p className="text-gray-800 dark:text-zinc-250 mt-0.5">{new Date(selectedOrder.dateTime || selectedOrder.createdAt).toLocaleString("en-GB")}</p>
                            </div>
                            <div>
                                <p className="text-gray-550">Guest Details</p>
                                <p className="text-gray-800 dark:text-zinc-250 mt-0.5">{selectedOrder.customerName || selectedOrder.customer?.name || "Walk-in Guest"} ({selectedOrder.customerMobile || selectedOrder.customer?.phone || "n/a"})</p>
                            </div>
                            <div>
                                <p className="text-gray-550">Order Type</p>
                                <p className="text-gray-800 dark:text-zinc-250 mt-0.5 uppercase">{selectedOrder.orderType}</p>
                            </div>
                            <div>
                                <p className="text-gray-550">Payment Status</p>
                                <p className={`mt-0.5 font-bold uppercase ${selectedOrder.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-500'}`}>{selectedOrder.paymentStatus || "Unpaid"}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-gray-650 dark:text-zinc-450 mb-2 uppercase tracking-wider">Items Breakdown</h3>
                            <div className="bg-gray-50 dark:bg-zinc-850 rounded-xl p-3">
                                <table className="min-w-full text-xs font-semibold text-gray-700 dark:text-zinc-250">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-zinc-800">
                                            <th className="text-left pb-2">Item</th>
                                            <th className="text-center pb-2">Qty</th>
                                            <th className="text-right pb-2">Rate</th>
                                            <th className="text-right pb-2">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(selectedOrder.products) && selectedOrder.products.map((item, index) => (
                                            <tr key={index}>
                                                <td className="py-2 text-left">{item.productName}</td>
                                                <td className="py-2 text-center">{item.qty || item.quantity}</td>
                                                <td className="py-2 text-right">৳ {(item.rate || item.unitPrice || 0).toFixed(0)}</td>
                                                <td className="py-2 text-right">৳ {(item.subtotal || item.totalPrice || 0).toFixed(0)}</td>
                                            </tr>
                                        ))}
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
                            <p className="text-base font-extrabold text-brand-primary dark:text-brand-sage mt-1">Total Amount: ৳ {(selectedOrder.totalAmount || selectedOrder.grandTotal || 0).toFixed(0)}</p>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={handlePrintOrder}
                                className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg font-bold text-xs cursor-pointer shadow border-none"
                            >
                                <FiPrinter /> Print Receipt
                            </button>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-zinc-850 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-800 text-xs font-bold cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Container */}
            <div className="hidden">
                {isPrintModalOpen && selectedOrder && (
                    <ReceiptTemplate
                        ref={receiptRef}
                        onPrintComplete={handlePrintComplete}
                        profileData={companyInfo}
                        invoiceData={selectedOrder}
                    />
                )}
                {printData && (
                    <PrintReportTemplate
                        ref={printRef}
                        title="Custom Order Report"
                        subtitle="Advanced POS sales query logs from database"
                        dateRange={`From: ${new Date(fromDate).toLocaleDateString("en-GB")} To: ${new Date(toDate).toLocaleDateString("en-GB")}`}
                    >
                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th>Invoice No</th>
                                    <th>Date & Time</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Table/Room</th>
                                    <th style={{ textAlign: "right" }}>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {printData.map((order) => (
                                    <tr key={order._id}>
                                        <td style={{ fontWeight: "bold" }}>{order.invoiceSerial || order.invoiceNo}</td>
                                        <td>{new Date(order.dateTime || order.createdAt).toLocaleString("en-GB")}</td>
                                        <td>{order.customerName || order.customer?.name || "Walk-in Guest"}</td>
                                        <td style={{ textTransform: "capitalize" }}>{order.orderType}</td>
                                        <td>{order.tableName || order.roomNo || order.tableNo || "N/A"}</td>
                                        <td style={{ textAlign: "right", fontWeight: "bold" }}>৳ {(order.totalAmount || order.grandTotal || 0).toFixed(0)}</td>
                                        <td style={{ fontWeight: "bold" }}>{order.paymentStatus || "Unpaid"}</td>
                                    </tr>
                                ))}
                                <tr style={{ fontWeight: "bold", backgroundColor: "#f3f4f6" }}>
                                    <td colSpan={5}>Summary Totals ({summary.count} Orders)</td>
                                    <td style={{ textAlign: "right" }}>৳ {summary.totalAmount.toFixed(0)}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </PrintReportTemplate>
                )}
                <div className="hidden">
                    <CustomOrdersThermalTemplate
                        ref={thermalPrintRef}
                        profileData={companyInfo}
                        data={orders}
                        fromDate={fromDate}
                        toDate={toDate}
                        summary={summary}
                    />
                </div>
            </div>
        </div>
    );
}

export default function CustomOrdersPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
            <CustomOrdersContent />
        </Suspense>
    );
}
