"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";

function DailyOrdersContent() {
    const axiosSecure = useAxiosSecure();

    const getFormattedDate = (date) => {
        return date.toISOString().slice(0, 10);
    };

    const [fromDate, setFromDate] = useState(getFormattedDate(new Date()));
    const [toDate, setToDate] = useState(getFormattedDate(new Date()));
    const [data, setData] = useState([]);
    const [counter, setCounter] = useState("Counter 1");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSearch = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await axiosSecure.get("/pos/invoice/date-range", { 
                params: { startDate: fromDate, endDate: toDate, counter } 
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
                    discount: item.totalDiscount,
                    totalAmount: item.totalAmount,
                }));
                setData(transformedData);
            }
        } catch (err) {
            console.error("Fetch daily orders error:", err);
            setError("Failed to fetch data. Please try again.");
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [axiosSecure, fromDate, toDate, counter]);

    useEffect(() => {
        handleSearch();
    }, [handleSearch]);

    const totals = data.reduce((acc, item) => ({
        quantity: acc.quantity + item.quantity,
        grandAmount: acc.grandAmount + item.grandAmount,
        vat: acc.vat + item.vat,
        sd: acc.sd + item.sd,
        discount: acc.discount + item.discount,
        totalAmount: acc.totalAmount + item.totalAmount,
    }), { quantity: 0, grandAmount: 0, vat: 0, sd: 0, discount: 0, totalAmount: 0 });

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-950 min-h-screen text-gray-800 dark:text-zinc-100 font-sans transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-850 dark:text-zinc-100">Daily Order Report</h1>
                        <p className="text-sm text-gray-500 mt-1">Aggregated counter transaction and register sales records</p>
                    </div>
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
                            <label className="mb-2 text-xs font-bold text-gray-500">Select Counter</label>
                            <select
                                value={counter}
                                onChange={(e) => setCounter(e.target.value)}
                                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                            >
                                <option value="Counter 1">Counter 1</option>
                                <option value="Counter 2">Counter 2</option>
                                <option value="Counter 3">Counter 3</option>
                                <option value="Counter 4">Counter 4</option>
                            </select>
                        </div>

                        <button
                            onClick={handleSearch}
                            className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow"
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
                    <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">
                        Report for {counter} from {new Date(fromDate).toLocaleDateString("en-GB")} to {new Date(toDate).toLocaleDateString("en-GB")}
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
                                                    <td className="p-3 text-center text-blue-650 dark:text-blue-400 font-bold">{item.order}</td>
                                                    <td className="p-3 text-center">{item.quantity}</td>
                                                    <td className="p-3 text-right">৳ {item.grandAmount.toFixed(0)}</td>
                                                    <td className="p-3 text-right">৳ {item.vat.toFixed(0)}</td>
                                                    <td className="p-3 text-right">৳ {item.sd.toFixed(0)}</td>
                                                    <td className="p-3 text-right text-red-500">-৳ {item.discount.toFixed(0)}</td>
                                                    <td className="p-3 text-right font-extrabold text-blue-600 dark:text-blue-450">৳ {item.totalAmount.toFixed(0)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td className="p-3 text-center text-gray-400" colSpan="9">
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
                                            <td className="p-3 text-right text-red-500">-৳ {totals.discount.toFixed(0)}</td>
                                            <td className="p-3 text-right text-blue-650 dark:text-blue-400 rounded-br-lg">৳ {totals.totalAmount.toFixed(0)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

export default function DailyOrdersPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <DailyOrdersContent />
        </Suspense>
    );
}
