"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { FiSearch, FiRefreshCw, FiArrowRight, FiCheck } from "react-icons/fi";
import { MdSwapHoriz } from "react-icons/md";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import usePagePermission from "@/hooks/usePagePermission";
import MtableLoading from "@/components/Comon/MtableLoading";
import SectionHeader from "@/components/Comon/SectionHeader";

const statusConfig = {
    pending: {
        display: 'Occupied',
        badgeClass: 'bg-amber-100 text-amber-850 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900',
    },
    cooking: {
        display: 'Cooking',
        badgeClass: 'bg-orange-100 text-orange-850 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-900',
    },
    served: {
        display: 'Served',
        badgeClass: 'bg-indigo-100 text-indigo-850 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900',
    },
};

function TableTransferContent() {
    const axiosSecure = useAxiosSecure();
    const { canEdit } = usePagePermission();

    // States
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [targetTableName, setTargetTableName] = useState("");
    const [reason, setReason] = useState("");

    // Fetch computed table status
    const fetchTablesStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await axiosSecure.get("/restauranttable/status");
            if (data) {
                setTables(data);
            }
        } catch (err) {
            console.error("Error fetching computed table statuses:", err);
            setTables([]);
        } finally {
            setIsLoading(false);
        }
    }, [axiosSecure]);

    useEffect(() => {
        fetchTablesStatus();
    }, [fetchTablesStatus]);

    // Fetch invoice details when selected table changes
    useEffect(() => {
        if (!selectedTable?.invoiceId) {
            setActiveInvoice(null);
            return;
        }

        const fetchInvoiceDetails = async () => {
            setIsLoadingInvoice(true);
            try {
                const { data } = await axiosSecure.get(`/pos/invoice/${selectedTable.invoiceId}`);
                if (data?.success && data?.data) {
                    setActiveInvoice(data.data);
                } else {
                    setActiveInvoice(null);
                }
            } catch (err) {
                console.error("Error fetching active table invoice details:", err);
                setActiveInvoice(null);
            } finally {
                setIsLoadingInvoice(false);
            }
        };

        fetchInvoiceDetails();
    }, [selectedTable, axiosSecure]);

    // Filter occupied tables
    const occupiedTables = useMemo(() => {
        return tables.filter(t => 
            t.invoiceId && ['pending', 'cooking', 'served'].includes(t.status)
        );
    }, [tables]);

    // Filter target vacant tables
    const vacantTables = useMemo(() => {
        return tables.filter(t => t.status === "free");
    }, [tables]);

    // Filtered occupied tables based on search term
    const filteredOccupiedTables = useMemo(() => {
        if (!searchTerm) return occupiedTables;
        const term = searchTerm.toLowerCase();
        return occupiedTables.filter(t => 
            t.tableName.toLowerCase().includes(term)
        );
    }, [occupiedTables, searchTerm]);

    const handleSelectTable = (table) => {
        setSelectedTable(table);
        setTargetTableName("");
        setReason("");
    };

    const handleExecuteTransfer = async () => {
        if (isTransferring) return;
        if (!canEdit) {
            Swal.fire("Restricted", "You do not have permission to transfer dining tables.", "warning");
            return;
        }
        if (!selectedTable?.invoiceId || !targetTableName) {
            Swal.fire("Warning", "Please select a target table to transfer the order.", "warning");
            return;
        }

        setIsTransferring(true);
        try {
            // Build notes description if a reason is provided
            let newNotes = activeInvoice?.notes || "";
            if (reason.trim()) {
                const noteAppend = `[Table Transfer] Moved from ${selectedTable.tableName} to ${targetTableName}. Reason: ${reason.trim()}`;
                newNotes = newNotes ? `${newNotes} | ${noteAppend}` : noteAppend;
            }

            const response = await axiosSecure.put(`/pos/invoice/${selectedTable.invoiceId}`, {
                tableNo: targetTableName,
                tableName: targetTableName,
                notes: newNotes
            });

            if (response.status === 200 || response.data?.success) {
                Swal.fire({
                    title: "Table Transferred!",
                    text: `Order successfully transferred from ${selectedTable.tableName} to ${targetTableName}.`,
                    icon: "success",
                    confirmButtonColor: "#1E3A8A"
                });

                setSelectedTable(null);
                setActiveInvoice(null);
                setTargetTableName("");
                setReason("");

                // Refresh table lists
                fetchTablesStatus();
            }
        } catch (err) {
            console.error("Table transfer execution failure:", err);
            Swal.fire("Error", err.response?.data?.message || "Failed to transfer table.", "error");
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
            <div className="max-w-7xl mx-auto">
                <SectionHeader
                    title="Table Transfer Dashboard"
                    subtitle="Transfer active dining orders and unpaid invoices to vacant tables."
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Occupied Tables Directory */}
                    <div className="lg:col-span-4 bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl p-5 shadow-sm">
                        <div className="mb-4">
                            <span className="text-xs font-bold text-brand-sage uppercase tracking-widest block mb-2">Occupied Tables Directory</span>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="text-brand-sage" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search occupied tables..."
                                    className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite input-sm w-full pl-9 text-xs"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="py-12"><MtableLoading /></div>
                        ) : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                {filteredOccupiedTables.length === 0 ? (
                                    <p className="text-center text-xs text-brand-sage py-12">No occupied dining tables found.</p>
                                ) : (
                                    filteredOccupiedTables.map((table) => {
                                        const isSelected = selectedTable?._id === table._id;
                                        const badgeConfig = statusConfig[table.status] || statusConfig.pending;
                                        return (
                                            <motion.div
                                                whileHover={{ scale: 1.01 }}
                                                key={table._id}
                                                onClick={() => handleSelectTable(table)}
                                                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                                    isSelected 
                                                        ? "bg-brand-primary/10 border-brand-primary dark:bg-brand-primary/20 dark:border-brand-primary" 
                                                        : "bg-brand-offwhite dark:bg-zinc-850 border-brand-beige dark:border-brand-beige/15 hover:bg-brand-beige/25 dark:hover:bg-brand-beige/10"
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-extrabold text-base text-brand-charcoal dark:text-brand-offwhite">
                                                        {table.tableName}
                                                    </h3>
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeConfig.badgeClass}`}>
                                                        {badgeConfig.display}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-brand-sage mt-2 font-semibold">
                                                    <span>Active Order</span>
                                                    <span className="font-mono">{table.invoiceId?.slice(-6).toUpperCase()}</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Transfer Detail Form */}
                    <div className="lg:col-span-8">
                        <AnimatePresence mode="wait">
                            {selectedTable ? (
                                <motion.div
                                    key={selectedTable._id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl p-6 shadow-sm space-y-6"
                                >
                                    <div className="border-b border-brand-beige dark:border-brand-beige/25 pb-4 flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-black text-brand-charcoal dark:text-brand-offwhite">
                                                Transfer Order from: {selectedTable.tableName}
                                            </h2>
                                            <p className="text-xs font-semibold text-brand-sage mt-0.5">
                                                Select a vacant dining table below to shift the active unpaid order.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={fetchTablesStatus}
                                            className="btn btn-outline btn-xs rounded flex items-center gap-1 cursor-pointer dark:border-zinc-800 dark:text-zinc-400"
                                            title="Refresh statuses"
                                        >
                                            <FiRefreshCw className="text-[10px]" /> Refresh
                                        </button>
                                    </div>

                                    {isLoadingInvoice ? (
                                        <div className="py-12"><MtableLoading /></div>
                                    ) : activeInvoice ? (
                                        <div className="space-y-6">
                                            {/* Order Details Preview */}
                                            <div className="p-4 rounded-xl bg-brand-offwhite dark:bg-zinc-850/50 border border-brand-beige dark:border-brand-beige/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                                                <div>
                                                    <span className="block text-brand-sage uppercase tracking-wider text-[10px] mb-0.5">Invoice No</span>
                                                    <span className="text-sm font-bold font-mono">{activeInvoice.invoiceNo}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-brand-sage uppercase tracking-wider text-[10px] mb-0.5">Customer</span>
                                                    <span className="text-sm font-bold">{activeInvoice.customerName || "Walk-in Guest"}</span>
                                                    {activeInvoice.customerMobile && activeInvoice.customerMobile !== "n/a" && (
                                                        <span className="block text-[10px] text-brand-sage font-mono mt-0.5">{activeInvoice.customerMobile}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="block text-brand-sage uppercase tracking-wider text-[10px] mb-0.5">Grand Total</span>
                                                    <span className="text-sm font-bold text-brand-primary dark:text-brand-sage">
                                                        ৳ {(activeInvoice.grandTotal || activeInvoice.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Products Preview */}
                                            {activeInvoice.products && activeInvoice.products.length > 0 && (
                                                <div>
                                                    <span className="text-xs font-bold text-brand-sage uppercase tracking-wider block mb-2">Items List</span>
                                                    <div className="border border-brand-beige dark:border-brand-beige/15 rounded-xl overflow-hidden text-xs">
                                                        <div className="grid grid-cols-12 bg-brand-offwhite dark:bg-zinc-850/70 p-2.5 font-bold text-brand-sage border-b border-brand-beige dark:border-brand-beige/15">
                                                            <div className="col-span-8">Product Name</div>
                                                            <div className="col-span-2 text-center">Qty</div>
                                                            <div className="col-span-2 text-right">Price</div>
                                                        </div>
                                                        <div className="max-h-40 overflow-y-auto divide-y divide-brand-beige dark:divide-brand-beige/15">
                                                            {activeInvoice.products.map((p, idx) => (
                                                                <div key={p.productId || idx} className="grid grid-cols-12 p-2.5 font-medium">
                                                                    <div className="col-span-8 flex flex-col">
                                                                        <span>{p.productName}</span>
                                                                        {p.isComplimentary && (
                                                                            <span className="text-[9px] font-bold text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-300 w-max px-1.5 py-0.2 rounded-full mt-0.5">COMPLIMENTARY</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="col-span-2 text-center font-bold">{p.qty || p.quantity || 0}</div>
                                                                    <div className="col-span-2 text-right font-mono">৳ {(p.rate || 0).toFixed(0)}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Transfer Form Details */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-semibold">
                                                {/* Select Vacant Target Table */}
                                                <div className="form-control w-full">
                                                    <label className="label">
                                                        <span className="label-text text-xs font-bold text-brand-sage uppercase">
                                                            Transfer Order To
                                                        </span>
                                                    </label>
                                                    <select
                                                        value={targetTableName}
                                                        onChange={(e) => setTargetTableName(e.target.value)}
                                                        className="select select-bordered select-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                                    >
                                                        <option value="">Choose Target Table</option>
                                                        {vacantTables.map(t => (
                                                            <option key={t._id} value={t.tableName}>
                                                                {t.tableName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Reason for Transfer */}
                                                <div className="form-control w-full md:col-span-2">
                                                    <label className="label">
                                                        <span className="label-text text-xs font-bold text-brand-sage uppercase">
                                                            Reason for Transfer
                                                        </span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={reason}
                                                        onChange={(e) => setReason(e.target.value)}
                                                        placeholder="e.g. Guest requested standard corner view table, table merger, etc."
                                                        className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                                    />
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex justify-end gap-3 pt-4 border-t border-brand-beige dark:border-brand-beige/25">
                                                <button
                                                    onClick={() => !isTransferring && setSelectedTable(null)}
                                                    disabled={isTransferring}
                                                    className="btn btn-sm btn-ghost cursor-pointer text-xs disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleExecuteTransfer}
                                                    disabled={isTransferring || !targetTableName}
                                                    className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isTransferring ? (
                                                        <>
                                                            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1"></span>
                                                            Transferring...
                                                        </>
                                                    ) : (
                                                        <>Execute Transfer <FiCheck /></>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center text-xs text-red-500 font-bold">
                                            Failed to fetch order details for this table.
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl p-12 text-center shadow-sm h-96 flex flex-col justify-center items-center"
                                >
                                    <MdSwapHoriz size={48} className="text-brand-sage animate-pulse" />
                                    <h3 className="font-extrabold text-base text-brand-charcoal dark:text-brand-offwhite mt-4">
                                        Select Dining Table
                                    </h3>
                                    <p className="text-xs text-brand-sage mt-1 max-w-xs">
                                        Select an occupied table directory item from the left pane to initialize order shifting.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TableTransferPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <TableTransferContent />
        </Suspense>
    );
}
