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
import SectionHeader from "@/components/Comon/SectionHeader";
import usePagePermission from "@/hooks/usePagePermission";

function TableManagementContent() {
    const axiosSecure = useAxiosSecure();
    const { user } = useContext(AuthContext);
    const { canAdd, canEdit, canDelete } = usePagePermission();
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

    const [isDeleting, setIsDeleting] = useState(false);

    const handleAddOrEditTable = async () => {
        if (isLoading) return;
        if (!formData.tableName.trim()) {
            Swal.fire("Error", "Table Name is required.", "error");
            return;
        }

        if (editId) {
            if (!canEdit) {
                Swal.fire("Restricted", "You do not have permission to edit table settings.", "warning");
                return;
            }
        } else {
            if (!canAdd) {
                Swal.fire("Restricted", "You do not have permission to add new tables.", "warning");
                return;
            }
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
        if (!canDelete) {
            Swal.fire("Restricted", "You do not have permission to delete table records.", "warning");
            return;
        }
        if (isDeleting) return;
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
                setIsDeleting(true);
                try {
                    await axiosSecure.delete(`/restauranttable/delete/${id}`);
                    fetchTables();
                    Swal.fire("Deleted!", "The table has been deleted.", "success");
                } catch (error) {
                    console.error("Error deleting table:", error);
                    Swal.fire("Error!", "Failed to delete table.", "error");
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    const handleOpenQrModal = (table) => {
        setSelectedTable(table);
        setIsQrModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-brand-offwhite dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200 animate-scale-in">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <SectionHeader
                    title="Table Management"
                    subtitle="Add, update, and manage restaurant table QR codes"
                >
                    {canAdd && (
                        <button
                            onClick={() => {
                                setEditId(null);
                                setFormData({ tableName: "" });
                                setIsModalOpen(true);
                            }}
                            className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow flex items-center gap-1.5"
                        >
                            <GoPlus size={14} /> Add Table
                        </button>
                    )}
                </SectionHeader>

                {/* Table List */}
                {loading ? <MtableLoading data={null} /> : (
                    <div className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl shadow-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-brand-beige dark:divide-brand-beige/25">
                            <thead className="bg-brand-offwhite dark:bg-zinc-850">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-brand-sage uppercase tracking-wider">Table Name</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-brand-sage uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-brand-charcoal/30 divide-y divide-brand-beige dark:divide-brand-beige/15 text-sm font-semibold">
                                {tables.length === 0 ? (
                                    <tr>
                                        <td colSpan="2" className="px-6 py-8 text-center text-brand-sage font-bold">
                                            No tables found. Click &quot;Add Table&quot; to create one.
                                        </td>
                                    </tr>
                                ) : (
                                    tables.map((table) => (
                                        <tr key={table._id} className="hover:bg-brand-beige/10 dark:hover:bg-brand-beige/5 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-brand-charcoal dark:text-brand-offwhite font-extrabold text-base">
                                                {table.tableName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenQrModal(table)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-sage rounded-md font-bold text-xs cursor-pointer transition-colors"
                                                        title="QR Code"
                                                    >
                                                        <BsQrCode /> QR Code
                                                    </button>
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => handleEdit(table)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-sage rounded-md font-bold text-xs cursor-pointer transition-colors"
                                                            title="Edit"
                                                        >
                                                            <FiEdit /> Edit
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleRemove(table._id)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-md font-bold text-xs cursor-pointer transition-colors"
                                                            title="Delete"
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
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-brand-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/25 rounded-2xl p-6 shadow-2xl max-w-md w-full relative animate-scale-in">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite cursor-pointer"
                        >
                            <FiX size={20} />
                        </button>
                        
                        <h2 className="text-xl font-bold mb-4 text-brand-charcoal dark:text-brand-offwhite uppercase tracking-widest">{editId ? "Edit Table" : "Add New Table"}</h2>
                        
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-brand-sage uppercase tracking-wider mb-1">Table Name/No</label>
                            <input
                                type="text"
                                className="input input-bordered w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                placeholder="e.g. Table 01, Table A"
                                value={formData.tableName}
                                onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="btn btn-sm btn-ghost cursor-pointer text-brand-sage text-xs"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddOrEditTable}
                                className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1.5"></span>
                                        Saving...
                                    </>
                                ) : (
                                    "Save"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {isQrModalOpen && selectedTable && (
                <div className="fixed inset-0 z-50 bg-brand-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4">
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
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
            <TableManagementContent />
        </Suspense>
    );
}
