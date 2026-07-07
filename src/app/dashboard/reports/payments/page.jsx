"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FiTrendingUp, FiCalendar, FiBookOpen, FiDollarSign, FiSearch, FiCreditCard, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Swal from "sweetalert2";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

import SectionHeader from "@/components/Comon/SectionHeader";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import useStandardPrint from "@/hooks/useStandardPrint";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

const COLORS = ["#346E36", "#8C5A35", "#3b82f6", "#eab308", "#8b5cf6", "#6b7280"];

const PaymentCollectionsReport = () => {
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const axiosSecure = useAxiosSecure();

  const {
    printData,
    setPrintData,
    printRef,
  } = useStandardPrint({
    documentTitle: "Payment_Collections_Report"
  });

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/reports/payments?startDate=${startDate}&endDate=${endDate}&method=${methodFilter}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Error fetching payment collections report:", error);
      Swal.fire("Error", "Could not fetch payment report details.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, startDate, endDate, methodFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, methodFilter]);

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setMethodFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const filteredPayments = data?.payments?.filter(pay => 
    pay.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pay.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pay.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pay.source.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalItems = filteredPayments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportExcel = () => {
    const formatted = filteredPayments.map((pay, index) => ({
      "Sl No": index + 1,
      "Payment Date": pay.date ? new Date(pay.date).toLocaleDateString("en-GB") : "N/A",
      "Source Department": pay.source,
      "Customer Name": pay.customerName,
      "Payment Method": pay.paymentMethod,
      "Reference No / Invoice": pay.reference,
      "Collected Amount ($)": pay.amount
    }));
    exportToExcel(formatted, "Payment_Collections_Report");
  };

  const handleExportCsv = () => {
    const formatted = filteredPayments.map((pay, index) => ({
      "Sl No": index + 1,
      "Payment Date": pay.date ? new Date(pay.date).toLocaleDateString("en-GB") : "N/A",
      "Source Department": pay.source,
      "Customer Name": pay.customerName,
      "Payment Method": pay.paymentMethod,
      "Reference No / Invoice": pay.reference,
      "Collected Amount ($)": pay.amount
    }));
    exportToCsv(formatted, "Payment_Collections_Report");
  };

  const handlePrintClick = () => {
    setPrintData(filteredPayments);
  };

  const totals = filteredPayments.reduce((acc, pay) => ({
    amount: acc.amount + (pay.amount || 0),
  }), { amount: 0 });

  const pieData = data?.summary?.unitBreakdown
    ? data.summary.unitBreakdown.filter(item => item.value > 0)
    : [];

  const getMethodTotal = (methodName) => {
    if (!data || !data.summary || !data.summary.methodBreakdown) return 0;
    const found = data.summary.methodBreakdown.find(m => m.method === methodName);
    return found ? found.amount : 0;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-955 min-h-screen text-gray-800 dark:text-zinc-100 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <SectionHeader
            title="Payment Collections Report"
            subtitle="Group and monitor incoming resort stay payments, restaurant checks, and event deposits by method."
          />
          {filteredPayments.length > 0 && (
            <ExportButtons
              onExportExcel={handleExportExcel}
              onExportCsv={handleExportCsv}
              onPrint={handlePrintClick}
              isLoading={isLoading}
            />
          )}
        </header>

        {/* Filters Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl p-6 mt-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500 dark:text-zinc-400">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs h-10 px-3 cursor-pointer"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-555 dark:text-zinc-400">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs h-10 px-3 cursor-pointer"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 text-xs font-bold text-gray-500 dark:text-zinc-400">
                Payment Method
              </label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs h-10 cursor-pointer"
              >
                <option value="all">All Payment Methods</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={handleResetFilters}
                className="btn btn-sm btn-ghost border border-gray-250 dark:border-zinc-750 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl h-10 text-xs px-4 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="mt-8">
            <MtableLoading />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 p-5 rounded-2xl shadow-xl flex items-center gap-4"
              >
                <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
                  <FiDollarSign size={24} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">Total Collected</span>
                  <p className="text-xl font-bold text-gray-800 dark:text-zinc-200 mt-0.5">${data?.summary?.totalCollected?.toLocaleString() || 0}</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 p-5 rounded-2xl shadow-xl flex items-center gap-4"
              >
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <FiDollarSign size={24} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">Cash Collections</span>
                  <p className="text-xl font-bold text-gray-800 dark:text-zinc-200 mt-0.5">${getMethodTotal("Cash")?.toLocaleString() || 0}</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 p-5 rounded-2xl shadow-xl flex items-center gap-4"
              >
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                  <FiCreditCard size={24} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">Card Collections</span>
                  <p className="text-xl font-bold text-gray-800 dark:text-zinc-200 mt-0.5">${getMethodTotal("Card")?.toLocaleString() || 0}</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 p-5 rounded-2xl shadow-xl flex items-center gap-4"
              >
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
                  <FiTrendingUp size={24} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500 dark:text-zinc-400">Mobile/bKash</span>
                  <p className="text-xl font-bold text-gray-800 dark:text-zinc-200 mt-0.5">${getMethodTotal("bKash")?.toLocaleString() || 0}</p>
                </div>
              </motion.div>
            </div>

            {/* Recharts Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Method breakdown Bar Chart */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 p-6 rounded-2xl shadow-xl lg:col-span-2">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-800 dark:text-zinc-200 mb-4">
                  Collection By Payment Method
                </h3>
                <div className="h-64">
                  {data?.summary?.methodBreakdown && data.summary.methodBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.summary.methodBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="method" stroke="#9ca3af" fontSize={10} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="amount" fill="#346E36" name="Collected Amount ($)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 font-bold">
                      No collections data to plot.
                    </div>
                  )}
                </div>
              </div>

              {/* Operational Units Pie Chart */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 p-6 rounded-2xl shadow-xl">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-800 dark:text-zinc-200 mb-4">
                  Collection Source share
                </h3>
                <div className="h-64 flex flex-col justify-center items-center">
                  {pieData.length > 0 ? (
                    <div className="w-full h-full relative">
                      <ResponsiveContainer width="100%" height="150">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-bold">
                        {pieData.map((entry, index) => (
                          <div key={entry.name} className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-400">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span>{entry.name}: ${entry.value?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 font-bold">No collections stats.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Combined Collections Table */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-250 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-900/50">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                  Detailed Payment Transactions List
                </h3>
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-450 dark:text-zinc-400">
                    <FiSearch size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search method, reference, guest..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs h-10 pl-9"
                  />
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                  <thead className="bg-slate-50 dark:bg-zinc-800 text-xs text-gray-555 dark:text-zinc-250 font-bold uppercase border-b border-gray-250 dark:border-zinc-850">
                    <tr>
                      <th className="pl-8 py-5 text-left">#</th>
                      <th className="py-5 text-left">Date</th>
                      <th className="py-5 text-left">Source Unit</th>
                      <th className="py-5 text-left">Customer / Guest</th>
                      <th className="py-5 text-left">Payment Method</th>
                      <th className="py-5 text-left">Reference No</th>
                      <th className="pr-8 py-5 text-right">Collected Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-250 dark:divide-zinc-800 text-sm font-semibold text-gray-700 dark:text-zinc-355">
                    {paginatedPayments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-20 text-gray-400 text-sm font-bold tracking-widest uppercase">
                          No payment collection transactions found.
                        </td>
                      </tr>
                    ) : (
                      paginatedPayments.map((pay, index) => (
                        <tr
                          key={pay._id || index}
                          className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-gray-250 dark:border-zinc-800 last:border-none text-xs"
                        >
                          <td className="pl-8 py-4 font-bold text-brand-primary dark:text-brand-sage">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="py-4 font-mono text-gray-550 dark:text-zinc-400">
                            {pay.date ? new Date(pay.date).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              pay.source === "Resort Stay"
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : pay.source === "Restaurant POS"
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                            }`}>
                              {pay.source}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="font-bold text-xs uppercase tracking-wide text-gray-800 dark:text-zinc-200">{pay.customerName}</span>
                          </td>
                          <td className="py-4 font-semibold text-gray-800 dark:text-zinc-200 uppercase tracking-wide">{pay.paymentMethod}</td>
                          <td className="py-4 font-mono text-gray-500 dark:text-zinc-400">{pay.reference}</td>
                          <td className="pr-8 py-4 font-bold text-right text-brand-primary dark:text-brand-sage font-mono">
                            ${pay.amount?.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="p-5 border-t border-gray-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                <span className="text-xs font-bold text-gray-555 dark:text-zinc-400">
                  Total Items: {totalItems}
                </span>
                <div className="join gap-2 flex items-center">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-sm bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-gray-250 dark:border-zinc-700 rounded-xl disabled:opacity-40 cursor-pointer px-4"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button className="btn btn-sm bg-brand-primary text-white hover:bg-brand-secondary border-none rounded-xl font-bold cursor-default px-6 tracking-wider text-xs uppercase">
                    Page {currentPage} of {totalPages}
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn btn-sm bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-gray-250 dark:border-zinc-700 rounded-xl disabled:opacity-40 cursor-pointer px-4"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Print Container */}
      <div className="hidden">
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title="Payment Collections Report"
            subtitle="Group and monitor incoming resort stay payments, restaurant checks, and event deposits by method."
            dateRange={`Generated: ${new Date().toLocaleString()}`}
          >
            <table className="print-table">
              <thead>
                <tr>
                  <th>SL.No</th>
                  <th>Payment Date</th>
                  <th>Source Department</th>
                  <th>Customer / Guest</th>
                  <th>Payment Method</th>
                  <th>Reference / Invoice</th>
                  <th style={{ textAlign: "right" }}>Collected Amount</th>
                </tr>
              </thead>
              <tbody>
                {printData.map((pay, index) => (
                  <tr key={pay._id || index}>
                    <td>{index + 1}</td>
                    <td>{pay.date ? new Date(pay.date).toLocaleDateString() : "N/A"}</td>
                    <td>{pay.source}</td>
                    <td>{pay.customerName}</td>
                    <td>{pay.paymentMethod}</td>
                    <td>{pay.reference}</td>
                    <td style={{ textAlign: "right" }}>${pay.amount?.toLocaleString()}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: "bold", backgroundColor: "#f3f4f6" }}>
                  <td colSpan={6}>Total Collections</td>
                  <td style={{ textAlign: "right" }}>${totals.amount?.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </PrintReportTemplate>
        )}
      </div>
    </div>
  );
};

export default PaymentCollectionsReport;
