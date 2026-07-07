"use client";

import React, { useState, useEffect, useContext, useCallback } from "react";
import { FiTrash2, FiChevronLeft, FiChevronRight, FiEye, FiSearch, FiCopy, FiCheck, FiInfo } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import SectionHeader from "@/components/Comon/SectionHeader";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import MtableLoading from "@/components/Comon/MtableLoading";
import usePagePermission from "@/hooks/usePagePermission";

const TransactionLogs = () => {
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedMethodFilter, setSelectedMethodFilter] = useState("all");
  const [selectedUserFilter, setSelectedUserFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const { canDelete } = usePagePermission();
  const [isLoading, setIsLoading] = useState(true);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load staff list
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const response = await axiosSecure.get("/user");
        setStaffList(response.data || []);
      } catch (error) {
        console.error("Error loading staff for filters:", error);
      }
    };
    loadStaff();
  }, [axiosSecure]);

  const fetchLogs = useCallback(async (
    page,
    status = selectedStatusFilter,
    method = selectedMethodFilter,
    userEmail = selectedUserFilter,
    start = startDate,
    end = endDate,
    search = debouncedSearch
  ) => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/transaction-logs/paginated?page=${page}&limit=10&status=${status}&method=${method}&userEmail=${userEmail}&startDate=${start}&endDate=${end}&search=${search}`
      );
      const { logs: fetchedLogs, totalPages: pages, totalLogs } = response.data;
      setLogs(fetchedLogs || []);
      setTotalPages(pages || 1);
      setTotalLogsCount(totalLogs || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching transaction logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    axiosSecure,
    selectedStatusFilter,
    selectedMethodFilter,
    selectedUserFilter,
    startDate,
    endDate,
    debouncedSearch
  ]);

  useEffect(() => {
    fetchLogs(currentPage);
  }, [fetchLogs, currentPage]);

  const handleStatusFilterChange = (e) => {
    setSelectedStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleMethodFilterChange = (e) => {
    setSelectedMethodFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleUserFilterChange = (e) => {
    setSelectedUserFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setCurrentPage(1);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedStatusFilter("all");
    setSelectedMethodFilter("all");
    setSelectedUserFilter("all");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id) => {
    if (!canDelete) {
      Swal.fire({
        title: "Access Denied!",
        text: "You do not have permission to delete transaction logs.",
        icon: "error",
        confirmButtonColor: "#8C5A35",
        confirmButtonText: "OK",
      });
      return;
    }
    if (isDeleting) return;

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this log deletion!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#8C5A35",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsDeleting(true);
        try {
          await axiosSecure.delete(`/transaction-logs/delete/${id}`);
          Swal.fire("Deleted!", "The transaction log has been deleted.", "success");
          fetchLogs(currentPage);
        } catch (error) {
          console.error("Error deleting transaction log:", error);
          Swal.fire("Error!", "Failed to delete the transaction log.", "error");
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "success":
        return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20";
      case "failed":
        return "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20";
    }
  };

  const getMethodBadgeClass = (method) => {
    switch (method?.toUpperCase()) {
      case "GET":
        return "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400";
      case "POST":
        return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";
      case "PUT":
      case "PATCH":
        return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400";
      case "DELETE":
        return "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-zinc-950 min-h-screen text-gray-800 dark:text-zinc-100 font-sans transition-colors duration-200">
      <SectionHeader
        title="Transaction Logs"
        subtitle="Monitor system requests, API calls, response statuses, and exception stack traces."
      />

      {/* Filter Section Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl p-6 mt-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          {/* Search Input */}
          <div className="flex flex-col gap-1.5">
            <label className="mb-2 text-xs font-bold text-gray-500 dark:text-zinc-400">
              Search Details
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-550 dark:text-zinc-400">
                <FiSearch size={14} />
              </span>
              <input
                type="text"
                placeholder="Log ID or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs h-10 pl-9"
              />
            </div>
          </div>

          {/* User Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="mb-2 text-xs font-bold text-gray-500 dark:text-zinc-400">
              Filter by User
            </label>
            <select
              value={selectedUserFilter}
              onChange={handleUserFilterChange}
              className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs h-10 cursor-pointer"
            >
              <option value="all">All Users</option>
              {staffList
                .filter((staff) => staff.email !== "sadatcse@gmail.com")
                .map((staff) => (
                  <option key={staff._id} value={staff.email}>
                    {staff.name} ({staff.email})
                  </option>
                ))}
            </select>
          </div>

          {/* Method Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="mb-2 text-xs font-bold text-gray-500 dark:text-zinc-400">
              Filter by Method
            </label>
            <select
              value={selectedMethodFilter}
              onChange={handleMethodFilterChange}
              className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs h-10 cursor-pointer"
            >
              <option value="all">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="mb-2 text-xs font-bold text-gray-500 dark:text-zinc-400">
              Filter by Status
            </label>
            <select
              value={selectedStatusFilter}
              onChange={handleStatusFilterChange}
              className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs h-10 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="mb-2 text-xs font-bold text-gray-500 dark:text-zinc-400">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs h-10 cursor-pointer"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="mb-2 text-xs font-bold text-gray-500 dark:text-zinc-400">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs h-10 cursor-pointer"
            />
          </div>
        </div>

        {/* Clear Filters Option */}
        {(selectedStatusFilter !== "all" || selectedMethodFilter !== "all" || selectedUserFilter !== "all" || startDate || endDate || searchTerm) && (
          <div className="flex justify-end mt-4">
            <button
              onClick={handleResetFilters}
              className="btn btn-xs bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/20 rounded-lg px-4 h-8 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl mt-6 overflow-hidden"
      >
        <div className="p-0">
          {isLoading ? (
            <div className="p-6">
              <MtableLoading />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                <thead className="bg-slate-50 dark:bg-zinc-850 text-xs text-gray-550 dark:text-zinc-250 font-bold uppercase border-b border-gray-250 dark:border-zinc-800">
                  <tr>
                    <th className="pl-8 py-5 text-left">#</th>
                    <th className="py-5 text-left">Log ID / Method</th>
                    <th className="py-5 text-left">User</th>
                    <th className="py-5 text-left">Code / Status</th>
                    <th className="py-5 text-left">Details</th>
                    <th className="py-5 text-left">IP Address</th>
                    <th className="py-5 text-left">Timestamp</th>
                    <th className="pr-8 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-20 text-brand-primary dark:text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-zinc-900">
                          No transaction logs found.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, index) => (
                        <motion.tr
                          key={log._id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-gray-250 dark:border-zinc-800 last:border-none bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-350 text-sm"
                        >
                          <td className="pl-8 py-4 font-bold text-brand-primary dark:text-brand-sage">
                            {(currentPage - 1) * 10 + index + 1}
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-xs font-semibold text-gray-500 dark:text-zinc-400">
                                {log.logId || "N/A"}
                              </span>
                              <div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${getMethodBadgeClass(log.transactionType)}`}>
                                  {log.transactionType}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-xs uppercase tracking-wide text-gray-800 dark:text-zinc-200">{log.userName}</span>
                              <span className="text-[11px] text-gray-500 dark:text-zinc-400">{log.userEmail}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="font-mono text-xs font-bold text-brand-primary dark:text-brand-sage">
                                HTTP {log.transactionCode}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${getStatusBadgeClass(log.status)}`}>
                                {log.status}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 max-w-[200px] truncate">
                            <span className="text-xs text-gray-700 dark:text-zinc-300" title={log.details}>
                              {log.details || "No details provided"}
                            </span>
                          </td>
                          <td className="py-4 font-mono text-xs text-gray-500 dark:text-zinc-450">
                            {log.ipAddress}
                          </td>
                          <td className="py-4 font-mono text-xs text-gray-500 dark:text-zinc-450">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : new Date(log.transactionTime).toLocaleString()}
                          </td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setSelectedLog(log)}
                                className="btn btn-sm btn-circle btn-ghost text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer"
                                title="View Full Details"
                              >
                                <FiEye size={16} />
                              </motion.button>
                              {canDelete ? (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleDelete(log._id)}
                                  className="btn btn-sm btn-circle btn-ghost text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shadow-none cursor-pointer"
                                  title="Delete Log"
                                >
                                  <FiTrash2 size={16} />
                                </motion.button>
                              ) : (
                                <div className="badge badge-ghost badge-sm text-[9px] font-extrabold uppercase tracking-widest text-gray-400 bg-slate-100 dark:bg-zinc-800 border-none">
                                  Restricted
                                </div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
 
              {/* Pagination controls */}
              <div className="p-5 border-t border-gray-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                  Total Logs: {totalLogsCount}
                </span>
                <div className="join gap-2 flex items-center">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn btn-sm bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-gray-250 dark:border-zinc-700 rounded-xl disabled:opacity-40 cursor-pointer px-4"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button className="btn btn-sm bg-brand-primary text-white hover:bg-brand-secondary border-none rounded-xl font-bold cursor-default px-6 tracking-wider text-xs uppercase">
                    Page {currentPage} of {totalPages}
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn btn-sm bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-gray-250 dark:border-zinc-700 rounded-xl disabled:opacity-40 cursor-pointer px-4"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
 
      {/* Details Inspect Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-250 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <FiInfo className="text-brand-primary text-xl" />
                  <div>
                    <h3 className="font-extrabold text-base tracking-wide text-gray-800 dark:text-zinc-150 uppercase">
                      Transaction Log Details
                    </h3>
                    <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-400">
                      ID: {selectedLog.logId || "N/A"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="btn btn-sm btn-circle btn-ghost text-gray-550 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
                {/* Meta details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-slate-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-gray-250 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">User Details</span>
                    <p className="font-bold text-gray-800 dark:text-zinc-200 uppercase">{selectedLog.userName}</p>
                    <p className="font-mono text-[11px] text-gray-500 dark:text-zinc-400">{selectedLog.userEmail}</p>
                  </div>
                  <div className="space-y-1 bg-slate-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-gray-250 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">Request Info</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getMethodBadgeClass(selectedLog.transactionType)}`}>
                        {selectedLog.transactionType}
                      </span>
                      <span className="font-mono font-bold text-brand-primary dark:text-brand-sage">
                        Status {selectedLog.transactionCode}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-gray-500 dark:text-zinc-450 mt-1">IP Address: {selectedLog.ipAddress}</p>
                  </div>
                  <div className="space-y-1 bg-slate-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-gray-250 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">Log Status</span>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${getStatusBadgeClass(selectedLog.status)}`}>
                        {selectedLog.status}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 bg-slate-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-gray-250 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">Metadata</span>
                    <p className="font-bold text-gray-700 dark:text-zinc-300">Amount: <span className="font-normal font-mono">{selectedLog.amount || 0}</span></p>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">Details / Path URL</span>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-850 border border-gray-250 dark:border-zinc-800 rounded-xl font-mono text-[11px] select-all break-all text-gray-700 dark:text-zinc-300">
                    {selectedLog.details || "N/A"}
                  </div>
                </div>

                {/* Message Section (If present) */}
                {selectedLog.message && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">Exception Message</span>
                    <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400 font-semibold select-text">
                      {selectedLog.message}
                    </div>
                  </div>
                )}

                {/* Stack Trace (If present) */}
                {selectedLog.stackTrace && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">Error Stack Trace</span>
                      <button
                        onClick={() => handleCopyText(selectedLog.stackTrace)}
                        className="btn btn-xs bg-slate-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-250 dark:border-zinc-705 rounded-lg flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer"
                      >
                        {copied ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                        {copied ? "Copied!" : "Copy Trace"}
                      </button>
                    </div>
                    <pre className="p-4 bg-slate-950 dark:bg-black/45 text-red-300 dark:text-red-400/90 rounded-xl font-mono text-[10px] overflow-auto max-h-48 border border-red-500/10 select-text leading-relaxed">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                )}

                {/* Log creation dates */}
                <div className="pt-2 flex justify-between text-[10px] font-mono text-gray-500 dark:text-zinc-550">
                  <span>Logged at: {new Date(selectedLog.createdAt || selectedLog.transactionTime).toLocaleString()}</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="btn btn-sm bg-brand-primary text-white border-none rounded-xl hover:bg-brand-secondary px-6 font-bold cursor-pointer text-xs uppercase"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionLogs;
