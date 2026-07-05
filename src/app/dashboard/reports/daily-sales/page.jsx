"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiCalendar, FiRefreshCw } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import useStandardPrint from "@/hooks/useStandardPrint";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";
import usePagePermission from "@/hooks/usePagePermission";

function DailySalesContent() {
    const axiosSecure = useAxiosSecure();
    const { canEdit } = usePagePermission();

    const getFormattedDate = (date) => {
        return date.toISOString().slice(0, 10);
    };

    const [fromDate, setFromDate] = useState(getFormattedDate(new Date()));
    const [toDate, setToDate] = useState(getFormattedDate(new Date()));
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const {
        printData,
        setPrintData,
        printRef,
    } = useStandardPrint({
        documentTitle: "Daily_Sales_Report"
    });

    const handleSearch = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await axiosSecure.get("/pos/invoice/date-range", { 
                params: { startDate: fromDate, endDate: toDate } 
            });
            if (response.data) {
                const transformedData = response.data.map((item, index) => ({
                    id: index + 1,
                    date: item.date,
                    order: item.orderCount,
                    quantity: item.totalQty,
                    grandAmount: item.totalSubtotal,
                    vat: item.totalVat,
                    sd: item.totalSd,
                    sc: item.totalSc || 0,
                    discount: item.totalDiscount,
                    totalAmount: item.totalAmount,
                }));
                setData(transformedData);
            }
        } catch (err) {
            console.error("Fetch daily sales error:", err);
            setError("Failed to fetch data. Please try again.");
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [axiosSecure, fromDate, toDate]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        handleSearch();
    }, [handleSearch]);

    const handleExportExcel = () => {
        const formatted = data.map((item) => ({
            "Sl No": item.id,
            "Date": new Date(item.date).toLocaleDateString("en-GB"),
            "Orders Count": item.order,
            "Qty Sold": item.quantity,
            "Subtotal": item.grandAmount,
            "Vat": item.vat,
            "SD": item.sd,
            "SC": item.sc,
            "Discount": item.discount,
            "Net Revenue": item.totalAmount
        }));
        exportToExcel(formatted, "Daily_Sales_Report");
    };

    const handleExportCsv = () => {
        const formatted = data.map((item) => ({
            "Sl No": item.id,
            "Date": new Date(item.date).toLocaleDateString("en-GB"),
            "Orders Count": item.order,
            "Qty Sold": item.quantity,
            "Subtotal": item.grandAmount,
            "Vat": item.vat,
            "SD": item.sd,
            "SC": item.sc,
            "Discount": item.discount,
            "Net Revenue": item.totalAmount
        }));
        exportToCsv(formatted, "Daily_Sales_Report");
    };

    const handlePrintClick = () => {
        setPrintData(data);
    };

    const handleQuickRange = (range) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (range) {
            case 'today':
                start = today;
                break;
            case '7days':
                start.setDate(today.getDate() - 6);
                break;
            case '30days':
                start.setDate(today.getDate() - 29);
                break;
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            default:
                return;
        }

        setFromDate(getFormattedDate(start));
        setToDate(getFormattedDate(end));
    };

    const totals = data.reduce((acc, item) => ({
        quantity: acc.quantity + item.quantity,
        grandAmount: acc.grandAmount + item.grandAmount,
        vat: acc.vat + item.vat,
        sd: acc.sd + item.sd,
        sc: acc.sc + item.sc,
        discount: acc.discount + item.discount,
        totalAmount: acc.totalAmount + item.totalAmount,
    }), { quantity: 0, grandAmount: 0, vat: 0, sd: 0, sc: 0, discount: 0, totalAmount: 0 });

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-950 min-h-screen text-gray-800 dark:text-zinc-100 font-sans transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-850 dark:text-zinc-100">Daily Sales Report</h1>
                        <p className="text-sm text-gray-500 mt-1">Aggregated sales metrics grouped by date</p>
                    </div>
                    {data.length > 0 && canEdit && (
                        <ExportButtons
                            onExportExcel={handleExportExcel}
                            onExportCsv={handleExportCsv}
                            onPrint={handlePrintClick}
                            isLoading={loading}
                        />
                    )}
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-250 dark:border-zinc-800 p-6 mb-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="flex flex-col">
                            <label className="mb-2 text-xs font-bold text-gray-500">From Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="mb-2 text-xs font-bold text-gray-500">To Date</label>
                            <input
                                type="date"
                                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="mb-2 text-xs font-bold text-gray-500">Quick Range</label>
                            <select
                                onChange={(e) => handleQuickRange(e.target.value)}
                                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                            >
                                <option value="">Select Range</option>
                                <option value="today">Today</option>
                                <option value="7days">Last 7 Days</option>
                                <option value="30days">Last 30 Days</option>
                                <option value="thisMonth">This Month</option>
                                <option value="lastMonth">Last Month</option>
                            </select>
                        </div>

                        <button
                            onClick={handleSearch}
                            className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow border-none"
                            disabled={loading}
                        >
                            <FiSearch />
                            <span>Search</span>
                        </button>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.1 }} 
                    className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl p-6"
                >
                    <h3 className="text-lg font-bold text-brand-primary dark:text-brand-sage mb-4">
                        Report from {new Date(fromDate).toLocaleDateString("en-GB")} to {new Date(toDate).toLocaleDateString("en-GB")}
                    </h3>
                    {loading ? <MtableLoading /> : error ? (
                        <div className="text-center py-12 text-red-500 font-semibold">{error}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-slate-50 dark:bg-zinc-800 text-xs text-gray-550 dark:text-zinc-200 font-bold uppercase">
                                    <tr>
                                        <th className="p-3 text-left rounded-tl-lg">SL.No</th>
                                        <th className="p-3 text-left">Date</th>
                                        <th className="p-3 text-center">Orders Count</th>
                                        <th className="p-3 text-center">Qty Sold</th>
                                        <th className="p-3 text-right">Subtotal</th>
                                        <th className="p-3 text-right">Vat</th>
                                        <th className="p-3 text-right">SD</th>
                                        <th className="p-3 text-right">SC</th>
                                        <th className="p-3 text-right">Discount</th>
                                        <th className="p-3 text-right rounded-tr-lg">Net Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-250 dark:divide-zinc-800 text-sm font-semibold text-gray-700 dark:text-zinc-350">
                                    <AnimatePresence>
                                        {data.length > 0 ? (
                                            data.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-zinc-850/50 transition border-b border-gray-200 dark:border-zinc-800">
                                                    <td className="p-3 text-left">{item.id}</td>
                                                    <td className="p-3 text-left">{new Date(item.date).toLocaleDateString("en-GB")}</td>
                                                    <td className="p-3 text-center text-brand-primary dark:text-brand-sage font-bold">{item.order}</td>
                                                    <td className="p-3 text-center">{item.quantity}</td>
                                                    <td className="p-3 text-right">৳ {item.grandAmount.toFixed(0)}</td>
                                                    <td className="p-3 text-right">৳ {item.vat.toFixed(0)}</td>
                                                    <td className="p-3 text-right">৳ {item.sd.toFixed(0)}</td>
                                                    <td className="p-3 text-right">৳ {item.sc.toFixed(0)}</td>
                                                    <td className="p-3 text-right text-red-500">-৳ {item.discount.toFixed(0)}</td>
                                                    <td className="p-3 text-right font-extrabold text-brand-primary dark:text-brand-sage">৳ {item.totalAmount.toFixed(0)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td className="p-3 text-center text-gray-400" colSpan="10">
                                                    No sales records found for this period.
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </tbody>
                                {data.length > 0 && (
                                    <tfoot className="font-extrabold bg-slate-100 dark:bg-zinc-850 text-slate-800 dark:text-zinc-200">
                                        <tr>
                                            <td className="p-3 rounded-bl-lg" colSpan={3}>Summary Totals</td>
                                            <td className="p-3 text-center">{totals.quantity}</td>
                                            <td className="p-3 text-right">৳ {totals.grandAmount.toFixed(0)}</td>
                                            <td className="p-3 text-right">৳ {totals.vat.toFixed(0)}</td>
                                            <td className="p-3 text-right">৳ {totals.sd.toFixed(0)}</td>
                                            <td className="p-3 text-right">৳ {totals.sc.toFixed(0)}</td>
                                            <td className="p-3 text-right text-red-500">-৳ {totals.discount.toFixed(0)}</td>
                                            <td className="p-3 text-right text-brand-primary dark:text-brand-sage rounded-br-lg">৳ {totals.totalAmount.toFixed(0)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Hidden Print Container */}
            <div className="hidden">
                {printData && (
                    <PrintReportTemplate
                        ref={printRef}
                        title="Daily Sales Report"
                        subtitle="Aggregated sales metrics grouped by date"
                        dateRange={`From: ${new Date(fromDate).toLocaleDateString("en-GB")} To: ${new Date(toDate).toLocaleDateString("en-GB")}`}
                    >
                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th>SL.No</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: "center" }}>Orders Count</th>
                                    <th style={{ textAlign: "center" }}>Qty Sold</th>
                                    <th style={{ textAlign: "right" }}>Subtotal</th>
                                    <th style={{ textAlign: "right" }}>Vat</th>
                                    <th style={{ textAlign: "right" }}>SD</th>
                                    <th style={{ textAlign: "right" }}>SC</th>
                                    <th style={{ textAlign: "right" }}>Discount</th>
                                    <th style={{ textAlign: "right" }}>Net Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {printData.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td>{new Date(item.date).toLocaleDateString("en-GB")}</td>
                                        <td style={{ textAlign: "center" }}>{item.order}</td>
                                        <td style={{ textAlign: "center" }}>{item.quantity}</td>
                                        <td style={{ textAlign: "right" }}>৳ {item.grandAmount.toFixed(0)}</td>
                                        <td style={{ textAlign: "right" }}>৳ {item.vat.toFixed(0)}</td>
                                        <td style={{ textAlign: "right" }}>৳ {item.sd.toFixed(0)}</td>
                                        <td style={{ textAlign: "right" }}>৳ {item.sc.toFixed(0)}</td>
                                        <td style={{ textAlign: "right" }}>-৳ {item.discount.toFixed(0)}</td>
                                        <td style={{ textAlign: "right" }}>৳ {item.totalAmount.toFixed(0)}</td>
                                    </tr>
                                ))}
                                <tr style={{ fontWeight: "bold", backgroundColor: "#f3f4f6" }}>
                                    <td colSpan={3}>Summary Totals</td>
                                    <td style={{ textAlign: "center" }}>{totals.quantity}</td>
                                    <td style={{ textAlign: "right" }}>৳ {totals.grandAmount.toFixed(0)}</td>
                                    <td style={{ textAlign: "right" }}>৳ {totals.vat.toFixed(0)}</td>
                                    <td style={{ textAlign: "right" }}>৳ {totals.sd.toFixed(0)}</td>
                                    <td style={{ textAlign: "right" }}>৳ {totals.sc.toFixed(0)}</td>
                                    <td style={{ textAlign: "right" }}>-৳ {totals.discount.toFixed(0)}</td>
                                    <td style={{ textAlign: "right" }}>৳ {totals.totalAmount.toFixed(0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </PrintReportTemplate>
                )}
            </div>
        </div>
    );
}

export default function DailySalesPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
            <DailySalesContent />
        </Suspense>
    );
}
