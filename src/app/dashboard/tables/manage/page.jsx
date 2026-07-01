"use client";

import React, { useState, useEffect, useContext, useCallback, Suspense } from "react";
import { FiEdit, FiTrash2, FiX } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { GoPlus } from "react-icons/go";
import { motion, AnimatePresence } from 'framer-motion';
import { BsQrCode } from "react-icons/bs";

import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import QRCodeGenerator from "@/components/pos/QRCodeGenerator";
import MtableLoading from "@/components/Comon/MtableLoading";

function TableManagementContent() {
    const axiosSecure = useAxiosSecure();
    const { user } = useContext(AuthContext);
    const isAdmin = user?.role === "admin";

    const [tables, setTables] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ tableName: "" });
    const [editId, setEditId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);

    const fetchTables = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosSecure.get("/restauranttable");
            if (response.data) {
                setTables(response.data);
            }
        } catch (error) {
            console.error("Error fetching tables:", error);
            toast.error("Failed to fetch tables.");
        } finally {
            setLoading(false);
        }
    }, [axiosSecure]);

    useEffect(() => {
        fetchTables();
    }, [fetchTables]);

    const handleAddOrEditTable = async () => {
        if (!formData.tableName.trim()) {
            Swal.fire("Error", "Table Name is required.", "error");
            return;
        }
        setIsLoading(true);
        try {
            if (editId) {
                await axiosSecure.put(`/restauranttable/update/${editId}`, formData);
                Swal.fire("Updated!", "Table details updated successfully.", "success");
            } else {
                await axiosSecure.post("/restauranttable/post", formData);
                Swal.fire("Created!", "New restaurant table added.", "success");
            }
            fetchTables();
            setIsModalOpen(false);
            setFormData({ tableName: "" });
            setEditId(null);
        } catch (error) {
            console.error("Error saving table:", error);
            Swal.fire({ icon: "error", title: "Error!", text: "Failed to save table. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (table) => {
        setEditId(table._id);
        setFormData({ tableName: table.tableName });
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
                    await axiosSecure.delete(`/restauranttable/delete/${id}`);
                    fetchTables();
                    Swal.fire("Deleted!", "The table has been deleted.", "success");
                } catch (error) {
                    console.error("Error deleting table:", error);
                    Swal.fire("Error!", "Failed to delete table.", "error");
                }
            }
        });
    };

    const handleOpenQrModal = (table) => {
        setSelectedTable(table);
        setIsQrModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 dark:text-zinc-100">Table Management</h1>
                        <p className="text-sm text-gray-500 mt-1">Add, update, and manage restaurant table QR codes</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditId(null);
                            setFormData({ tableName: "" });
                            setIsModalOpen(true);
                        }}
                        className="btn bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                    >
                        <GoPlus size={18} /> Add Table
                    </button>
                </div>

                {/* Table List */}
                {loading ? <MtableLoading data={null} /> : (
                    <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                            <thead className="bg-slate-50 dark:bg-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Table Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Created At</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-250 dark:divide-zinc-800 text-sm font-semibold">
                                {tables.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-gray-400">
                                            No tables found. Click &quot;Add Table&quot; to create one.
                                        </td>
                                    </tr>
                                ) : (
                                    tables.map((table) => (
                                        <tr key={table._id} className="hover:bg-gray-50 dark:hover:bg-zinc-850/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-zinc-200 font-extrabold text-base">
                                                {table.tableName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-zinc-400">
                                                {new Date(table.createdAt).toLocaleString("en-GB")}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenQrModal(table)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-150 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-md font-bold text-xs cursor-pointer transition-colors"
                                                        title="QR Code"
                                                    >
                                                        <BsQrCode /> QR Code
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(table)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-150 hover:bg-blue-200 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-md font-bold text-xs cursor-pointer transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FiEdit /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(table._id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-150 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-md font-bold text-xs cursor-pointer transition-colors"
                                                        title="Delete"
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
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-md w-full relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        >
                            <FiX size={20} />
                        </button>
                        
                        <h2 className="text-xl font-bold mb-4">{editId ? "Edit Table" : "Add New Table"}</h2>
                        
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Table Name/No</label>
                            <input
                                type="text"
                                className="input input-bordered w-full dark:bg-zinc-800 dark:border-zinc-700"
                                placeholder="e.g. Table 01, Table A"
                                value={formData.tableName}
                                onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="btn btn-sm btn-ghost dark:text-zinc-400 cursor-pointer"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddOrEditTable}
                                className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                                disabled={isLoading}
                            >
                                {isLoading ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {isQrModalOpen && selectedTable && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="relative">
                        <button
                            onClick={() => setIsQrModalOpen(false)}
                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-700 shadow cursor-pointer z-50"
                        >
                            <FiX size={18} />
                        </button>
                        <QRCodeGenerator type="table" id={selectedTable._id} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TableManagementPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <TableManagementContent />
        </Suspense>
    );
}
