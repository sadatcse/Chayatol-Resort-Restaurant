"use client";

import React, { useState, useEffect, useContext, useCallback, Suspense } from "react";
import { FiEdit, FiTrash2, FiX, FiPlus, FiCalendar, FiPhone, FiUser, FiInfo, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';

import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import MtableLoading from "@/components/Comon/MtableLoading";

function TableReservationContent() {
    const axiosSecure = useAxiosSecure();
    const { user } = useContext(AuthContext);

    const [reservations, setReservations] = useState([]);
    const [availableTables, setAvailableTables] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));

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
            const response = await axiosSecure.get(`/tablereservation?date=${filterDate}`);
            if (response.data) {
                setReservations(response.data);
            }
        } catch (error) {
            console.error("Error fetching reservations:", error);
            Swal.fire({ icon: "error", title: "Error!", text: "Failed to fetch reservations." });
        } finally {
            setLoading(false);
        }
    }, [axiosSecure, filterDate]);

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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-150 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 dark:text-zinc-100">Table Reservations</h1>
                        <p className="text-sm text-gray-500 mt-1">Book and coordinate restaurant table time-slots</p>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Date Filter */}
                        <div className="flex items-center border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg shadow-xs">
                            <FiCalendar className="text-gray-400 mr-2" />
                            <input
                                type="date"
                                className="bg-transparent focus:outline-none text-sm font-bold dark:text-zinc-100"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={() => {
                                setEditId(null);
                                setFormData({
                                    tableName: "",
                                    startTime: filterDate + "T12:00",
                                    endTime: filterDate + "T14:00",
                                    customerName: "",
                                    customerPhone: "",
                                    customerEmail: "",
                                    additionalInfo: "",
                                    status: "Pending",
                                });
                                setIsModalOpen(true);
                            }}
                            className="btn bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                        >
                            <FiPlus size={18} /> New Reservation
                        </button>
                    </div>
                </div>

                {/* Grid list or Table list */}
                {loading ? <MtableLoading data={null} /> : (
                    <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-slate-50 dark:bg-zinc-800">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-505 dark:text-zinc-400 uppercase tracking-wider">Table</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-505 dark:text-zinc-400 uppercase tracking-wider">Start Time</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-505 dark:text-zinc-400 uppercase tracking-wider">End Time</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-505 dark:text-zinc-400 uppercase tracking-wider">Guest</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-505 dark:text-zinc-400 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-505 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-505 dark:text-zinc-400 uppercase tracking-wider rounded-tr-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-250 dark:divide-zinc-850 text-sm font-semibold">
                                    {reservations.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-gray-400 dark:text-zinc-500 font-bold">
                                                No reservations booked for {new Date(filterDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' })}.
                                            </td>
                                        </tr>
                                    ) : (
                                        reservations.map((res) => (
                                            <tr key={res._id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-850/40 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-extrabold text-gray-900 dark:text-zinc-150 text-base">
                                                    {res.tableName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-650 dark:text-zinc-350">
                                                    {new Date(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-650 dark:text-zinc-350">
                                                    {new Date(res.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-zinc-200">
                                                    {res.customerName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-zinc-300">
                                                    {res.customerPhone}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs">
                                                    <span className={`px-2.5 py-1 rounded-full font-bold uppercase ${getStatusBadgeClass(res.status)}`}>
                                                        {res.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(res)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-150 hover:bg-blue-200 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-md font-bold cursor-pointer"
                                                        >
                                                            <FiEdit /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemove(res._id)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-150 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-md font-bold cursor-pointer"
                                                        >
                                                            <FiTrash2 /> Delete
                                                        </button>
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
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        >
                            <FiX size={20} />
                        </button>
                        
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-1.5">
                            <FiCalendar /> {editId ? "Edit Table Reservation" : "New Table Reservation"}
                        </h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Select Table *</label>
                                <select
                                    name="tableName"
                                    className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700"
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
                                <label className="block text-xs font-bold text-gray-500 mb-1">Status</label>
                                <select
                                    name="status"
                                    className="select select-bordered select-sm w-full dark:bg-zinc-850 dark:border-zinc-700"
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
                                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><FiClock /> Start Time *</label>
                                <input
                                    type="datetime-local"
                                    name="startTime"
                                    className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                                    value={formData.startTime}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><FiClock /> End Time *</label>
                                <input
                                    type="datetime-local"
                                    name="endTime"
                                    className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700 text-xs"
                                    value={formData.endTime}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <hr className="border-gray-200 dark:border-zinc-800 my-2" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><FiUser /> Guest Name *</label>
                                <input
                                    type="text"
                                    name="customerName"
                                    placeholder="Enter full name"
                                    className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700"
                                    value={formData.customerName}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><FiPhone /> Guest Mobile *</label>
                                <input
                                    type="text"
                                    name="customerPhone"
                                    placeholder="Enter contact number"
                                    className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700"
                                    value={formData.customerPhone}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Guest Email</label>
                                <input
                                    type="email"
                                    name="customerEmail"
                                    placeholder="e.g. guest@example.com"
                                    className="input input-bordered input-sm w-full dark:bg-zinc-850 dark:border-zinc-700"
                                    value={formData.customerEmail}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><FiInfo /> Special Notes</label>
                                <textarea
                                    name="additionalInfo"
                                    placeholder="Any details (e.g. birthday setup, allergen info)..."
                                    className="textarea textarea-bordered textarea-sm w-full dark:bg-zinc-850 dark:border-zinc-700"
                                    rows={2}
                                    value={formData.additionalInfo}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="btn btn-sm btn-ghost dark:text-zinc-400 cursor-pointer"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddOrEditReservation}
                                className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                                disabled={isLoading}
                            >
                                {isLoading ? "Booking..." : "Book Reservation"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TableReservationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <TableReservationContent />
        </Suspense>
    );
}
