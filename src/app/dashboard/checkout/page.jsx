"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { FiSearch, FiDollarSign, FiCheck, FiArrowRight, FiFileText, FiClock } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";
import SectionHeader from "@/components/Comon/SectionHeader";

function CheckoutContent() {
    const axiosSecure = useAxiosSecure();

    // States
    const [stays, setStays] = useState([]);
    const [selectedStay, setSelectedStay] = useState(null);
    const [folioEntries, setFolioEntries] = useState([]);
    const [paymentTypes, setPaymentTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFolioLoading, setIsFolioLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Payment fields
    const [paymentType, setPaymentType] = useState("");
    const [settlementAmount, setSettlementAmount] = useState(0);
    const [transactionRef, setTransactionRef] = useState("");

    // Fetch in house guests
    const fetchActiveStays = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await axiosSecure.get("/stays?status=In House&limit=1000");
            if (data?.data) {
                setStays(data.data);
            }
        } catch (err) {
            console.error("Error fetching active stays:", err);
            setStays([]);
        } finally {
            setIsLoading(false);
        }
    }, [axiosSecure]);

    // Fetch payments
    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const res = await axiosSecure.get("/paymenttype");
                if (res.data) setPaymentTypes(res.data);
            } catch (err) {
                console.error("Error loading payment types:", err);
            }
        };
        fetchPayments();
        fetchActiveStays();
    }, [axiosSecure, fetchActiveStays]);

    // Filter stays by name or room
    const filteredStays = useMemo(() => {
        if (!searchTerm) return stays;
        const term = searchTerm.toLowerCase();
        return stays.filter(s => 
            s.stayNo.toLowerCase().includes(term) ||
            s.customer?.fullName?.toLowerCase().includes(term) ||
            s.rooms?.some(r => r.room?.roomNumber?.toLowerCase().includes(term))
        );
    }, [stays, searchTerm]);

    const fetchFolio = async (stayId) => {
        setIsFolioLoading(true);
        try {
            const { data } = await axiosSecure.get(`/stays/${stayId}/folio`);
            setFolioEntries(data || []);
        } catch (err) {
            console.error("Failed to load folio ledger:", err);
        } finally {
            setIsFolioLoading(false);
        }
    };

    const handleSelectStay = async (stay) => {
        setSelectedStay(stay);
        await fetchFolio(stay._id);
        setPaymentType("");
        setTransactionRef("");
    };

    // Calculate totals
    const totalDebit = useMemo(() => folioEntries.reduce((acc, e) => acc + e.debit, 0), [folioEntries]);
    const totalCredit = useMemo(() => folioEntries.reduce((acc, e) => acc + e.credit, 0), [folioEntries]);
    const outstandingDue = Math.max(0, totalDebit - totalCredit);

    // Sync settlement amount automatically when due changes
    useEffect(() => {
        setSettlementAmount(outstandingDue);
    }, [outstandingDue]);

    const handleCheckout = async () => {
        const finalPayments = [];
        if (settlementAmount > 0) {
            if (!paymentType) {
                Swal.fire("Error", "Please select payment method for the settlement payment.", "warning");
                return;
            }
            finalPayments.push({
                paymentType,
                amount: Number(settlementAmount),
                transactionRef
            });
        }

        try {
            setIsFolioLoading(true);
            await axiosSecure.post(`/stays/${selectedStay._id}/checkout`, {
                payments: finalPayments
            });

            Swal.fire({
                title: "Checked Out!",
                text: "Guest checkout completed and room released.",
                icon: "success"
            });

            setSelectedStay(null);
            setFolioEntries([]);
            setPaymentType("");
            setTransactionRef("");
            fetchActiveStays();
        } catch (err) {
            Swal.fire("Error", err.response?.data?.message || "Failed to checkout guest.", "error");
        } finally {
            setIsFolioLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
            <div className="max-w-7xl mx-auto">
                <SectionHeader
                    title="Front-Desk Check-out"
                    subtitle="Settle outstanding guest folios and finalize checkout departures."
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Active Guests Directory */}
                    <div className="lg:col-span-4 bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl p-5 shadow-sm">
                        <div className="mb-4">
                            <span className="text-xs font-bold text-brand-sage uppercase tracking-widest block mb-2">Active Guests Directory</span>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="text-brand-sage" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by Room, Name or StayNo..."
                                    className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite input-sm w-full pl-9 text-xs"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {isLoading ? <MtableLoading /> : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                {filteredStays.length === 0 ? (
                                    <p className="text-center text-xs text-brand-sage py-12">No in-house guests found.</p>
                                ) : (
                                    filteredStays.map((stay) => {
                                        const isSelected = selectedStay?._id === stay._id;
                                        return (
                                            <motion.div
                                                whileHover={{ scale: 1.01 }}
                                                key={stay._id}
                                                onClick={() => handleSelectStay(stay)}
                                                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                                    isSelected 
                                                        ? "bg-brand-primary/10 border-brand-primary dark:bg-brand-primary/20 dark:border-brand-primary" 
                                                        : "bg-brand-offwhite border-brand-beige dark:border-brand-beige/15 hover:bg-brand-beige/25 dark:hover:bg-brand-beige/10"
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-mono font-bold text-brand-primary dark:text-brand-sage">{stay.stayNo}</span>
                                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-primary text-white">In House</span>
                                                </div>
                                                <h3 className="font-extrabold text-sm text-brand-charcoal dark:text-brand-offwhite mt-2">{stay.customer?.fullName}</h3>
                                                <div className="flex justify-between items-center text-[10px] text-brand-sage mt-1 font-semibold">
                                                    <span>Room: {stay.rooms?.map(r => r.room?.roomNumber).join(", ")}</span>
                                                    <span>Out: {new Date(stay.expectedCheckOutDate).toLocaleDateString("en-GB")}</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Selected Stay Folio Ledger and Settle Checkout */}
                    <div className="lg:col-span-8 space-y-6">
                        <AnimatePresence mode="wait">
                            {selectedStay ? (
                                <motion.div
                                    key={selectedStay._id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl p-6 shadow-sm space-y-6"
                                >
                                    <div className="border-b border-brand-beige dark:border-brand-beige/25 pb-4 flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-black text-brand-charcoal dark:text-brand-offwhite">{selectedStay.customer?.fullName}</h2>
                                            <p className="text-xs font-semibold text-brand-sage mt-0.5">Stay Reference: {selectedStay.stayNo} • Rooms: {selectedStay.rooms?.map(r => r.room?.roomNumber).join(", ")}</p>
                                        </div>
                                    </div>

                                    {/* Folio Grid Table */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block">Account Folio Ledger</span>
                                        {isFolioLoading ? <MtableLoading /> : (
                                            <div className="border border-brand-beige dark:border-brand-beige/25 rounded-xl overflow-hidden max-h-[30vh] overflow-y-auto">
                                                <table className="min-w-full text-xs font-semibold text-brand-charcoal dark:text-brand-offwhite divide-y divide-brand-beige dark:divide-brand-beige/10">
                                                    <thead className="bg-brand-offwhite dark:bg-brand-charcoal/70 text-[10px] text-brand-sage uppercase tracking-wider">
                                                        <tr>
                                                            <th className="p-3 text-left">Date</th>
                                                            <th className="p-3 text-left">Description</th>
                                                            <th className="p-3 text-right">Debit (+)</th>
                                                            <th className="p-3 text-right">Credit (-)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-brand-beige dark:divide-brand-beige/10 bg-white dark:bg-brand-charcoal/20">
                                                        {folioEntries.map(entry => (
                                                            <tr key={entry._id} className="hover:bg-brand-beige/20 dark:hover:bg-brand-offwhite/5">
                                                                <td className="p-3 text-brand-sage">{new Date(entry.date).toLocaleDateString("en-GB")}</td>
                                                                <td className="p-3 font-bold text-brand-charcoal dark:text-brand-offwhite">{entry.description}</td>
                                                                <td className="p-3 text-right text-red-500">{entry.debit > 0 ? `৳ ${entry.debit.toFixed(0)}` : "-"}</td>
                                                                <td className="p-3 text-right text-green-500">{entry.credit > 0 ? `৳ ${entry.credit.toFixed(0)}` : "-"}</td>
                                                            </tr>
                                                        ))}
                                                        {folioEntries.length === 0 && (
                                                            <tr>
                                                                <td colSpan="4" className="p-6 text-center text-brand-sage">No account ledger transactions.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Account Summary Running Block */}
                                    <div className="flex justify-between items-center p-4 bg-brand-offwhite dark:bg-brand-charcoal/50 rounded-xl border border-brand-beige dark:border-brand-beige/15">
                                        <div>
                                            <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block">Account Balance</span>
                                            <h3 className="text-xl font-black text-rose-500">Due: ৳ {outstandingDue.toFixed(0)}</h3>
                                        </div>
                                        <div className="text-right text-[11px] text-brand-sage font-bold space-y-0.5">
                                            <p>Total Debits: ৳ {totalDebit.toFixed(0)}</p>
                                            <p>Total Credits: ৳ {totalCredit.toFixed(0)}</p>
                                        </div>
                                    </div>

                                    {/* Settle Form Section */}
                                    <div className="border-t border-brand-beige dark:border-brand-beige/25 pt-6 space-y-4">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-brand-charcoal dark:text-brand-offwhite">Checkout Settle Panel</h3>

                                        {outstandingDue > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-brand-offwhite dark:bg-brand-charcoal/50 p-4 rounded-xl border border-brand-beige dark:border-brand-beige/15">
                                                <div className="form-control">
                                                    <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase">Payment Type</span></label>
                                                    <select
                                                        value={paymentType}
                                                        onChange={(e) => setPaymentType(e.target.value)}
                                                        className="select select-bordered select-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs"
                                                    >
                                                        <option value="">Select Method</option>
                                                        {paymentTypes.map(pt => (
                                                            <option key={pt._id} value={pt.name}>{pt.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="form-control">
                                                    <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase">Settlement Amount</span></label>
                                                    <input
                                                        type="number"
                                                        value={settlementAmount}
                                                        onChange={(e) => setSettlementAmount(Number(e.target.value))}
                                                        className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-bold"
                                                    />
                                                </div>

                                                <div className="form-control">
                                                    <label className="label py-1"><span className="label-text text-[10px] font-bold text-brand-sage uppercase">Transaction Reference</span></label>
                                                    <input
                                                        type="text"
                                                        value={transactionRef}
                                                        onChange={(e) => setTransactionRef(e.target.value)}
                                                        placeholder="Card trx ref, bkash ID, etc"
                                                        className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 text-xs font-bold rounded-xl text-center">
                                                Ledger settled. Guest can checkout without additional payment.
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 pt-2">
                                            <button
                                                onClick={() => setSelectedStay(null)}
                                                className="btn btn-sm btn-ghost cursor-pointer text-xs"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleCheckout}
                                                className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow flex items-center gap-1"
                                            >
                                                Settle & Checkout <FiCheck />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl p-12 text-center shadow-sm h-96 flex flex-col justify-center items-center"
                                >
                                    <FiArrowRight size={48} className="text-brand-sage animate-pulse" />
                                    <h3 className="font-extrabold text-base text-brand-charcoal dark:text-brand-offwhite mt-4">Select Guest Stay</h3>
                                    <p className="text-xs text-brand-sage mt-1 max-w-xs">Choose any active stay from the left directory to display account breakdown and finalize departure checkouts.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
            <CheckoutContent />
        </Suspense>
    );
}
