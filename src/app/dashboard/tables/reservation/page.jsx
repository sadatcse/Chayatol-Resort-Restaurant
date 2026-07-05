"use client";

import React, { useState, useEffect, useContext, useCallback, Suspense } from "react";
import { FiEdit, FiTrash2, FiX, FiPlus, FiCalendar, FiPhone, FiUser, FiInfo, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';

import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import MtableLoading from "@/components/Comon/MtableLoading";
import SectionHeader from "@/components/Comon/SectionHeader";
import useStandardPrint from "@/hooks/useStandardPrint";
import ExportButtons from "@/components/Comon/ExportButtons";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

function TableReservationContent() {
    const axiosSecure = useAxiosSecure();
    const { user } = useContext(AuthContext);
    const { canAdd, canEdit, canDelete } = usePagePermission();

    const [reservations, setReservations] = useState([]);
    const [availableTables, setAvailableTables] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));

    // Advanced Filters & Exports
    const [tableNameFilter, setTableNameFilter] = useState("");
    const [dateFilterType, setDateFilterType] = useState("today");
    const [isExporting, setIsExporting] = useState(false);

    const {
        printData: printReservations,
        setPrintData: setPrintReservations,
        printRef: printRef,
        handlePrint: handlePrint
    } = useStandardPrint({
        documentTitle: "Table_Reservations_Report",
        onAfterPrint: () => setPrintReservations(null)
    });

    const getDateRange = (type, customDate) => {
        const now = new Date();
        switch (type) {
            case "today": {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                return { startDate: start.toISOString(), endDate: end.toISOString() };
            }
            case "next7": {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);
                return { startDate: start.toISOString(), endDate: end.toISOString() };
            }
            case "thisMonth": {
                const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                return { startDate: start.toISOString(), endDate: end.toISOString() };
            }
            case "nextMonth": {
                const start = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
                const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
                return { startDate: start.toISOString(), endDate: end.toISOString() };
            }
            case "custom": {
                if (!customDate) return { startDate: "", endDate: "" };
                const parts = customDate.split("-");
                const start = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
                const end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
                return { startDate: start.toISOString(), endDate: end.toISOString() };
            }
            case "all":
            default:
                return { startDate: "", endDate: "" };
        }
    };

    const [formData, setFormData] = useState({
        tableName: "",
        startTime: "",
        endTime: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        additionalInfo: "",
        status: "Pending",
    });

    const [editId, setEditId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange(dateFilterType, filterDate);
            let url = "/tablereservation?";
            if (dateFilterType === "custom" && filterDate) {
                url += `date=${filterDate}&`;
            } else {
                if (startDate) url += `startDate=${encodeURIComponent(startDate)}&`;
                if (endDate) url += `endDate=${encodeURIComponent(endDate)}&`;
            }
            if (tableNameFilter) {
                url += `tableName=${encodeURIComponent(tableNameFilter)}&`;
            }
            const response = await axiosSecure.get(url);
            if (response.data) {
                setReservations(response.data);
            }
        } catch (error) {
            console.error("Error fetching reservations:", error);
            Swal.fire({ icon: "error", title: "Error!", text: "Failed to fetch reservations." });
        } finally {
            setLoading(false);
        }
    }, [axiosSecure, dateFilterType, filterDate, tableNameFilter]);

    const fetchAvailableTables = useCallback(async () => {
        try {
            const response = await axiosSecure.get("/restauranttable");
            if (response.data) {
                setAvailableTables(response.data);
            }
        } catch (error) {
            console.error("Error fetching tables:", error);
        }
    }, [axiosSecure]);

    useEffect(() => {
        fetchAvailableTables();
        fetchReservations();
    }, [fetchAvailableTables, fetchReservations]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddOrEditReservation = async () => {
        // Validation
        if (!formData.tableName || !formData.startTime || !formData.endTime || !formData.customerName || !formData.customerPhone) {
            Swal.fire("Error", "Please fill in all required fields (Table, Start Time, End Time, Name, Phone).", "error");
            return;
        }

        if (editId) {
            if (!canEdit) {
                Swal.fire("Restricted", "You do not have permission to edit table reservations.", "warning");
                return;
            }
        } else {
            if (!canAdd) {
                Swal.fire("Restricted", "You do not have permission to add table reservations.", "warning");
                return;
            }
        }

        setIsLoading(true);
        try {
            const reservationData = {
                ...formData,
                bookedBy: user?._id || user?.uid,
            };

            if (editId) {
                await axiosSecure.put(`/tablereservation/${editId}`, reservationData);
                Swal.fire("Updated!", "Reservation has been updated.", "success");
            } else {
                await axiosSecure.post("/tablereservation", reservationData);
                Swal.fire("Added!", "New reservation has been added.", "success");
            }
            fetchReservations();
            setIsModalOpen(false);
            setEditId(null);
            setFormData({
                tableName: "",
                startTime: "",
                endTime: "",
                customerName: "",
                customerPhone: "",
                customerEmail: "",
                additionalInfo: "",
                status: "Pending",
            });
        } catch (error) {
            console.error("Error saving reservation:", error);
            Swal.fire({ icon: "error", title: "Error!", text: "Failed to save reservation." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (res) => {
        setEditId(res._id);
        setFormData({
            tableName: res.tableName,
            startTime: res.startTime ? new Date(res.startTime).toISOString().slice(0, 16) : "",
            endTime: res.endTime ? new Date(res.endTime).toISOString().slice(0, 16) : "",
            customerName: res.customerName || "",
            customerPhone: res.customerPhone || "",
            customerEmail: res.customerEmail || "",
            additionalInfo: res.additionalInfo || "",
            status: res.status || "Pending",
        });
        setIsModalOpen(true);
    };

    const handleRemove = (id) => {
        if (!canDelete) {
            Swal.fire("Restricted", "You do not have permission to delete table reservations.", "warning");
            return;
        }
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
                    await axiosSecure.delete(`/tablereservation/${id}`);
                    fetchReservations();
                    Swal.fire("Deleted!", "The reservation has been deleted.", "success");
                } catch (error) {
                    console.error("Error deleting reservation:", error);
                    Swal.fire("Error!", "Failed to delete reservation.", "error");
                }
            }
        });
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toUpperCase()) {
            case "PENDING": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900";
            case "CONFIRMED": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900";
            case "SEATED": return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900";
            case "CANCELLED": return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900";
            default: return "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300";
        }
    };

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const formatted = reservations.map((res, idx) => ({
                "Sl": idx + 1,
                "Table": res.tableName,
                "Start Time": new Date(res.startTime).toLocaleString("en-GB"),
                "End Time": new Date(res.endTime).toLocaleString("en-GB"),
                "Guest Name": res.customerName,
                "Phone": res.customerPhone,
                "Email": res.customerEmail || "N/A",
                "Status": res.status,
                "Notes": res.additionalInfo || "N/A"
            }));
            exportToExcel(formatted, "Table_Reservations_Report");
        } catch (err) {
            console.error("Excel export error:", err);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const formatted = reservations.map((res, idx) => ({
                "Sl": idx + 1,
                "Table": res.tableName,
                "Start Time": new Date(res.startTime).toLocaleString("en-GB"),
                "End Time": new Date(res.endTime).toLocaleString("en-GB"),
                "Guest Name": res.customerName,
                "Phone": res.customerPhone,
                "Email": res.customerEmail || "N/A",
                "Status": res.status,
                "Notes": res.additionalInfo || "N/A"
            }));
            exportToCsv(formatted, "Table_Reservations_Report");
        } catch (err) {
            console.error("CSV export error:", err);
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrintClick = () => {
        setPrintReservations(reservations);
    };

    return (
        <div className="min-h-screen bg-brand-offwhite dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
            <div className="max-w-7xl mx-auto animate-scale-in">
                
                {/* Header */}
                <SectionHeader
                    title="Table Reservations"
                    subtitle="Book and coordinate restaurant table time-slots"
                >
                    {canAdd && (
                        <button
                            onClick={() => {
                                setEditId(null);
                                setFormData({
                                    tableName: "",
                                    startTime: (dateFilterType === "custom" ? filterDate : new Date().toISOString().slice(0, 10)) + "T12:00",
                                    endTime: (dateFilterType === "custom" ? filterDate : new Date().toISOString().slice(0, 10)) + "T14:00",
                                    customerName: "",
                                    customerPhone: "",
                                    customerEmail: "",
                                    additionalInfo: "",
                                    status: "Pending",
                                });
                                setIsModalOpen(true);
                            }}
                            className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow flex items-center gap-1.5"
                        >
                            <FiPlus size={14} /> New Reservation
                        </button>
                    )}
                </SectionHeader>

                {/* Filter and Action Controls */}
                <div className="bg-white dark:bg-brand-charcoal p-4 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-sm mb-6 flex flex-col lg:flex-row justify-between items-center gap-4 animate-scale-in">
                    {/* Quick Date Range Buttons */}
                    <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
                        <span className="text-xs font-bold text-brand-sage uppercase tracking-widest mr-2">Quick Dates:</span>
                        {[
                            { value: "today", label: "Today" },
                            { value: "next7", label: "Next 7 Days" },
                            { value: "thisMonth", label: "This Month" },
                            { value: "nextMonth", label: "Next Month" },
                            { value: "all", label: "All" },
                            { value: "custom", label: "Custom Date" },
                        ].map((btn) => (
                            <button
                                key={btn.value}
                                type="button"
                                onClick={() => setDateFilterType(btn.value)}
                                className={`btn btn-xs rounded-full px-4 h-8 uppercase tracking-wider font-bold text-[10px] transition-all duration-200 cursor-pointer ${
                                    dateFilterType === btn.value
                                        ? "bg-brand-primary text-white border-none shadow-sm"
                                        : "btn-outline border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}

                        {/* Custom Date Input */}
                        {dateFilterType === "custom" && (
                            <div className="flex items-center border border-brand-primary bg-white dark:bg-brand-charcoal/50 px-3 py-1.5 rounded-lg shadow-xs ml-2 h-8">
                                <FiCalendar className="text-brand-sage mr-2" size={14} />
                                <input
                                    type="date"
                                    className="bg-transparent focus:outline-none text-[11px] font-bold text-brand-charcoal dark:text-brand-offwhite"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Table Select Filter & Export Buttons */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-brand-sage uppercase tracking-widest">Table:</span>
                            <select
                                value={tableNameFilter}
                                onChange={(e) => setTableNameFilter(e.target.value)}
                                className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9 px-3 rounded-full outline-none focus:outline-none"
                            >
                                <option value="">All Tables</option>
                                {availableTables.map((t) => (
                                    <option key={t._id} value={t.tableName}>{t.tableName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="h-6 w-px bg-brand-beige/50 dark:bg-brand-beige/20 hidden sm:block"></div>

                        {canEdit && (
                            <ExportButtons
                                onExportExcel={handleExportExcel}
                                onExportCsv={handleExportCsv}
                                onPrint={handlePrintClick}
                                isLoading={isExporting}
                            />
                        )}
                    </div>
                </div>

                {/* Grid list or Table list */}
                {loading ? <MtableLoading data={null} /> : (
                    <div className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-brand-beige dark:divide-brand-beige/25">
                                <thead className="bg-brand-offwhite dark:bg-zinc-850">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Table</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Start Time</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">End Time</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Guest</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-brand-sage uppercase tracking-wider rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-brand-charcoal/30 divide-y divide-brand-beige dark:divide-brand-beige/15 text-sm font-semibold">
                                    {reservations.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-brand-sage font-bold">
                                                No reservations booked for {new Date(filterDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' })}.
                                            </td>
                                        </tr>
                                    ) : (
                                        reservations.map((res) => (
                                            <tr key={res._id} className="hover:bg-brand-beige/10 dark:hover:bg-brand-beige/5 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-extrabold text-brand-charcoal dark:text-brand-offwhite text-base">
                                                    {res.tableName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-brand-sage font-medium">
                                                    {new Date(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-brand-sage font-medium">
                                                    {new Date(res.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-brand-charcoal dark:text-brand-offwhite">
                                                    {res.customerName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-brand-charcoal dark:text-brand-offwhite">
                                                    {res.customerPhone}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs">
                                                    <span className={`px-2.5 py-1 rounded-full font-bold uppercase ${getStatusBadgeClass(res.status)}`}>
                                                        {res.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                    <div className="flex justify-end gap-2">
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => handleEdit(res)}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-sage rounded-md font-bold cursor-pointer"
                                                            >
                                                                <FiEdit /> Edit
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleRemove(res._id)}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-md font-bold cursor-pointer"
                                                            >
                                                                <FiTrash2 /> Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-brand-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/25 rounded-2xl p-6 shadow-2xl max-w-lg w-full relative max-h-[90vh] overflow-y-auto animate-scale-in">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite cursor-pointer"
                        >
                            <FiX size={20} />
                        </button>
                        
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-1.5 text-brand-charcoal dark:text-brand-offwhite uppercase tracking-widest">
                            <FiCalendar /> {editId ? "Edit Table Reservation" : "New Table Reservation"}
                        </h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Select Table *</label>
                                <select
                                    name="tableName"
                                    className="select select-bordered select-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                    value={formData.tableName}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Choose a table</option>
                                    {availableTables.map(table => (
                                        <option key={table._id} value={table.tableName}>{table.tableName}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Status</label>
                                <select
                                    name="status"
                                    className="select select-bordered select-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Seated">Seated</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1 flex items-center gap-1"><FiClock /> Start Time *</label>
                                <input
                                    type="datetime-local"
                                    name="startTime"
                                    className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                    value={formData.startTime}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1 flex items-center gap-1"><FiClock /> End Time *</label>
                                <input
                                    type="datetime-local"
                                    name="endTime"
                                    className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                    value={formData.endTime}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <hr className="border-brand-beige/30 dark:border-brand-beige/10 my-2" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1 flex items-center gap-1"><FiUser /> Guest Name *</label>
                                <input
                                    type="text"
                                    name="customerName"
                                    placeholder="Enter full name"
                                    className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                    value={formData.customerName}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1 flex items-center gap-1"><FiPhone /> Guest Mobile *</label>
                                <input
                                    type="text"
                                    name="customerPhone"
                                    placeholder="Enter contact number"
                                    className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                    value={formData.customerPhone}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Guest Email</label>
                                <input
                                    type="email"
                                    name="customerEmail"
                                    placeholder="e.g. guest@example.com"
                                    className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                    value={formData.customerEmail}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1 flex items-center gap-1"><FiInfo /> Special Notes</label>
                                <textarea
                                    name="additionalInfo"
                                    placeholder="Any details (e.g. birthday setup, allergen info)..."
                                    className="textarea textarea-bordered textarea-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs"
                                    rows={2}
                                    value={formData.additionalInfo}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="btn btn-sm btn-ghost cursor-pointer text-brand-sage text-xs"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddOrEditReservation}
                                className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow"
                                disabled={isLoading}
                            >
                                {isLoading ? "Booking..." : "Book Reservation"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Container */}
            <div className="hidden">
                {printReservations && (
                    <PrintReportTemplate
                        ref={printRef}
                        title="Table Reservations Report"
                        subtitle="Detailed record of restaurant table bookings and time-slots."
                        dateRange={
                            dateFilterType === "all" ? "All Dates" :
                            dateFilterType === "custom" ? `Date: ${filterDate}` :
                            `Date Range: ${dateFilterType.toUpperCase()}`
                        }
                    >
                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th>SL</th>
                                    <th>Table</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Guest Name</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {printReservations.map((r, idx) => (
                                    <tr key={r._id || idx}>
                                        <td>{idx + 1}</td>
                                        <td style={{ fontWeight: "bold" }}>{r.tableName}</td>
                                        <td>{new Date(r.startTime).toLocaleString("en-GB")}</td>
                                        <td>{new Date(r.endTime).toLocaleString("en-GB")}</td>
                                        <td>{r.customerName}</td>
                                        <td>{r.customerPhone}</td>
                                        <td>{r.customerEmail || "N/A"}</td>
                                        <td style={{ fontWeight: "bold" }}>{r.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </PrintReportTemplate>
                )}
            </div>
        </div>
    );
}

export default function TableReservationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
            <TableReservationContent />
        </Suspense>
    );
}
