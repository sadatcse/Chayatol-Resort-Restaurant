"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { FiSearch, FiDollarSign, FiCheck, FiArrowRight, FiFileText, FiClock, FiUser, FiPrinter, FiX } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";
import SectionHeader from "@/components/Comon/SectionHeader";
import CustomerModal from "@/components/CustomerModal";
import useStandardPrint from "@/hooks/useStandardPrint";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import ReceiptTemplate from "@/components/Receipt/ReceiptTemplate";
import A4ReceiptTemplate from "@/components/Receipt/A4ReceiptTemplate";
import usePagePermission from "@/hooks/usePagePermission";

const getInvoiceSummary = (entries) => {
    let roomTotal = 0;
    let foodTotal = 0;
    let serviceTotal = 0;
    let discountTotal = 0;
    let paidTotal = 0;

    entries.forEach(e => {
        const desc = e.description.toLowerCase();
        if (e.debit > 0) {
            if (desc.includes("food")) {
                foodTotal += e.debit;
            } else if (desc.includes("service") || desc.includes("pickup") || desc.includes("laundry") || desc.includes("tax")) {
                serviceTotal += e.debit;
            } else {
                roomTotal += e.debit;
            }
        } else if (e.credit > 0) {
            if (desc.includes("discount")) {
                discountTotal += e.credit;
            } else {
                paidTotal += e.credit;
            }
        }
    });

    const netPayable = roomTotal + foodTotal + serviceTotal - discountTotal;
    const dueAmount = netPayable - paidTotal;

    return {
        roomTotal,
        foodTotal,
        serviceTotal,
        discountTotal,
        paidTotal,
        netPayable,
        dueAmount
    };
};

function CheckoutContent() {
    const { canView, canAdd, canEdit, canDelete } = usePagePermission();
    const axiosSecure = useAxiosSecure();

    // States
    const [stays, setStays] = useState([]);
    const [selectedStay, setSelectedStay] = useState(null);
    const [folioEntries, setFolioEntries] = useState([]);
    const [paymentTypes, setPaymentTypes] = useState([]);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFolioLoading, setIsFolioLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Payment fields
    const [paymentType, setPaymentType] = useState("");
    const [settlementAmount, setSettlementAmount] = useState(0);
    const [transactionRef, setTransactionRef] = useState("");

    // Restaurant Invoice integration states & refs
    const [viewingInvoice, setViewingInvoice] = useState(null);
    const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
    const [invoicePrintData, setInvoicePrintData] = useState(null);
    const receiptRef = useRef(null);
    const a4ReceiptRef = useRef(null);

    const handleViewInvoice = async (referenceId) => {
        if (!referenceId) return;
        setIsInvoiceLoading(true);
        try {
            const response = await axiosSecure.get(`/pos/invoice/${referenceId}`);
            if (response.data?.success) {
                setViewingInvoice(response.data.data || response.data.invoice);
            } else {
                Swal.fire("Error", "Could not retrieve POS invoice details.", "error");
            }
        } catch (err) {
            console.error("Error fetching invoice:", err);
            Swal.fire("Error", "Failed to fetch invoice details.", "error");
        } finally {
            setIsInvoiceLoading(false);
        }
    };

    const handlePrintInvoiceAction = (type) => {
        if (!viewingInvoice) return;
        setInvoicePrintData(viewingInvoice);
        setTimeout(() => {
            if (type === "a4" && a4ReceiptRef.current) {
                a4ReceiptRef.current.printReceipt();
            } else if (type === "thermal" && receiptRef.current) {
                receiptRef.current.printReceipt();
            }
        }, 100);
    };

    // Customer Profile & Print states
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const {
        printData: printLedgerRes,
        setPrintData: setPrintLedgerRes,
        printRef: ledgerPrintRef
    } = useStandardPrint({
        documentTitle: `Folio_Ledger_${selectedStay?.stayNo || "Report"}`
    });

    // Final Invoice print setup
    const {
        printData: finalInvoiceRes,
        setPrintData: setFinalInvoiceRes,
        printRef: finalInvoicePrintRef
    } = useStandardPrint({
        documentTitle: `Final_Invoice_${selectedStay?.stayNo || "Report"}`,
    });

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

    // Fetch payments & company info
    useEffect(() => {
        const fetchCompanyAndPayments = async () => {
            try {
                const [companyRes, paymentRes] = await Promise.all([
                    axiosSecure.get("/company").catch(() => null),
                    axiosSecure.get("/paymenttype").catch(() => null)
                ]);
                if (companyRes?.data && companyRes.data.length > 0) {
                    Promise.resolve().then(() => {
                        setCompanyInfo(companyRes.data[0]);
                    });
                }
                if (paymentRes?.data) {
                    Promise.resolve().then(() => {
                        setPaymentTypes(paymentRes.data);
                    });
                }
            } catch (err) {
                console.error("Error loading company/payment types:", err);
            }
        };
        fetchCompanyAndPayments();
        Promise.resolve().then(() => {
            fetchActiveStays();
        });
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
        Promise.resolve().then(() => {
            setSettlementAmount(outstandingDue);
        });
    }, [outstandingDue]);

    const handleCheckout = async () => {
        if (isFolioLoading) return;
        if (!canEdit) {
            Swal.fire("Restricted", "You do not have permission to perform checkout operations.", "warning");
            return;
        }
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

    if (!canView) {
        return (
            <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal flex items-center justify-center">
                <div className="text-center bg-white dark:bg-brand-charcoal p-8 rounded-2xl border border-brand-beige dark:border-brand-beige/25 shadow-md max-w-md w-full">
                    <h2 className="text-xl font-extrabold uppercase tracking-widest text-red-500 mb-2">Access Denied</h2>
                    <p className="text-sm text-brand-sage font-semibold">You do not have permission to view the check-out console.</p>
                </div>
            </div>
        );
    }

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
                                                className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                                                        ? "bg-brand-primary/10 border-brand-primary dark:bg-brand-primary/20 dark:border-brand-primary"
                                                        : "bg-brand-offwhite dark:bg-zinc-850 border-brand-beige dark:border-brand-beige/15 hover:bg-brand-beige/25 dark:hover:bg-brand-beige/10"
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
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-xl font-black text-brand-charcoal dark:text-brand-offwhite">{selectedStay.customer?.fullName}</h2>
                                                <button
                                                    onClick={() => setIsCustomerModalOpen(true)}
                                                    className="btn btn-xs btn-outline border-brand-primary text-brand-primary dark:border-brand-primary/50 dark:text-brand-sage hover:bg-brand-primary hover:text-white rounded-full uppercase text-[9px] h-6 min-h-0 flex items-center gap-1 cursor-pointer px-2"
                                                    title="View Guest Profile"
                                                >
                                                    <FiUser size={10} /> View Profile
                                                </button>
                                            </div>
                                            <p className="text-xs font-semibold text-brand-sage mt-0.5">Stay Reference: {selectedStay.stayNo} • Rooms: {selectedStay.rooms?.map(r => r.room?.roomNumber).join(", ")}</p>
                                        </div>
                                    </div>

                                    {/* Folio Grid Table */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block">Account Folio Ledger</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setPrintLedgerRes(selectedStay)}
                                                    className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none rounded px-3 h-7 flex items-center gap-1 shadow-sm uppercase tracking-widest font-bold text-[9px] cursor-pointer"
                                                    title="Print Guest Ledger"
                                                >
                                                    <FiPrinter size={11} /> Print Ledger
                                                </button>
                                                <button
                                                    onClick={() => setFinalInvoiceRes(selectedStay)}
                                                    className="btn btn-xs bg-[#1e293b] hover:bg-[#1e293b]/90 text-white border-none rounded px-3 h-7 flex items-center gap-1 shadow-sm uppercase tracking-widest font-bold text-[9px] cursor-pointer"
                                                    title="Print Final Invoice"
                                                >
                                                    <FiPrinter size={11} /> Final Invoice
                                                </button>
                                            </div>
                                        </div>
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
                                                                <td className="p-3 font-bold text-brand-charcoal dark:text-brand-offwhite">
                                                                    {entry.referenceId && (entry.type === "Food Charge" || entry.description.includes("Invoice")) ? (
                                                                        <button
                                                                            onClick={() => handleViewInvoice(entry.referenceId)}
                                                                            className="text-brand-primary hover:text-brand-secondary dark:text-brand-sage dark:hover:text-brand-sage/80 underline text-left font-bold cursor-pointer flex items-center gap-1 bg-transparent border-none p-0"
                                                                            title="Click to view detailed POS invoice and print"
                                                                        >
                                                                            <FiFileText className="flex-shrink-0" /> {entry.description}
                                                                        </button>
                                                                    ) : (
                                                                        entry.description
                                                                    )}
                                                                </td>
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
                                                disabled={isFolioLoading}
                                            >
                                                Cancel
                                            </button>
                                            {canEdit && (
                                                <button
                                                    onClick={handleCheckout}
                                                    disabled={isFolioLoading}
                                                    className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isFolioLoading ? (
                                                        <>
                                                            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1"></span>
                                                            Checking out...
                                                        </>
                                                    ) : (
                                                        <>Settle & Checkout <FiCheck /></>
                                                    )}
                                                </button>
                                            )}
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

            {/* Guest Profile Viewer Modal */}
            <AnimatePresence>
                {isCustomerModalOpen && selectedStay?.customer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="bg-brand-primary p-6 text-white flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-wider">Guest Profile Details</h2>
                                    <p className="text-xs text-brand-offwhite/85 font-semibold mt-0.5">Stay Reference: {selectedStay.stayNo}</p>
                                </div>
                                <button
                                    onClick={() => setIsCustomerModalOpen(false)}
                                    className="btn btn-sm btn-circle btn-ghost text-white hover:bg-brand-secondary/40"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            {/* Body (Scrollable) */}
                            <div className="p-6 overflow-y-auto space-y-6 text-xs text-brand-charcoal dark:text-brand-offwhite">
                                {/* Top Section: Photo and Basic Info */}
                                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start border-b border-brand-beige/35 dark:border-brand-beige/10 pb-6">
                                    {/* Guest Photo */}
                                    <div className="w-24 h-24 rounded-full border border-brand-beige bg-brand-offwhite overflow-hidden flex items-center justify-center shadow-sm">
                                        {selectedStay.customer.customerPhoto ? (
                                            <img
                                                src={selectedStay.customer.customerPhoto}
                                                alt={selectedStay.customer.fullName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <FiUser size={36} className="text-brand-sage" />
                                        )}
                                    </div>
                                    {/* Summary Details */}
                                    <div className="flex-1 text-center sm:text-left space-y-1">
                                        <h3 className="text-lg font-bold text-brand-primary dark:text-brand-sage">{selectedStay.customer.fullName}</h3>
                                        <p className="font-semibold text-brand-sage">Phone: {selectedStay.customer.phoneNumber}</p>
                                        <p className="font-semibold text-brand-sage">Email: {selectedStay.customer.emailAddress || "N/A"}</p>
                                        <p className="font-semibold text-brand-sage">Occupation: {selectedStay.customer.occupation || "N/A"} {selectedStay.customer.companyName ? `at ${selectedStay.customer.companyName}` : ""}</p>
                                    </div>
                                </div>

                                {/* Information Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Personal Information */}
                                    <div className="bg-brand-offwhite dark:bg-brand-charcoal/40 p-4 rounded-xl border border-brand-beige/20 space-y-3">
                                        <h4 className="font-bold text-brand-primary uppercase tracking-widest text-[10px]">Personal Information</h4>
                                        <div className="grid grid-cols-2 gap-2 font-semibold">
                                            <div>
                                                <span className="text-[10px] text-brand-sage block font-bold">Nationality</span>
                                                {selectedStay.customer.nationality || "N/A"}
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-brand-sage block font-bold">Gender</span>
                                                {selectedStay.customer.gender || "N/A"}
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-brand-sage block font-bold">Marital Status</span>
                                                {selectedStay.customer.maritalStatus || "N/A"}
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-brand-sage block font-bold">Date of Birth</span>
                                                {selectedStay.customer.dateOfBirth ? new Date(selectedStay.customer.dateOfBirth).toLocaleDateString("en-GB") : "N/A"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Identification */}
                                    <div className="bg-brand-offwhite dark:bg-brand-charcoal/40 p-4 rounded-xl border border-brand-beige/20 space-y-3">
                                        <h4 className="font-bold text-brand-primary uppercase tracking-widest text-[10px]">Identification</h4>
                                        <div className="space-y-2 font-semibold">
                                            <div>
                                                <span className="text-[10px] text-brand-sage block font-bold">ID Type / Number</span>
                                                {selectedStay.customer.identificationType || "N/A"}: {selectedStay.customer.identificationNumber || "N/A"}
                                            </div>
                                            {selectedStay.customer.uploadIdCopy && (
                                                <div>
                                                    <span className="text-[10px] text-brand-sage block font-bold mb-1">ID Copy Document</span>
                                                    <a
                                                        href={selectedStay.customer.uploadIdCopy}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-brand-primary hover:underline font-bold"
                                                    >
                                                        View Document File
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Address details */}
                                    <div className="bg-brand-offwhite dark:bg-brand-charcoal/40 p-4 rounded-xl border border-brand-beige/20 space-y-3">
                                        <h4 className="font-bold text-brand-primary uppercase tracking-widest text-[10px]">Permanent Address</h4>
                                        <div className="space-y-1 font-semibold">
                                            <p>{selectedStay.customer.address?.line1 || ""}</p>
                                            {selectedStay.customer.address?.line2 && <p>{selectedStay.customer.address.line2}</p>}
                                            <p>
                                                {selectedStay.customer.address?.city || ""}{selectedStay.customer.address?.division ? `, ${selectedStay.customer.address.division}` : ""}{selectedStay.customer.address?.country ? `, ${selectedStay.customer.address.country}` : ""}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Emergency Contact */}
                                    <div className="bg-brand-offwhite dark:bg-brand-charcoal/40 p-4 rounded-xl border border-brand-beige/20 space-y-3">
                                        <h4 className="font-bold text-brand-primary uppercase tracking-widest text-[10px]">Emergency Contact</h4>
                                        <div className="grid grid-cols-2 gap-2 font-semibold">
                                            <div className="col-span-2">
                                                <span className="text-[10px] text-brand-sage block font-bold">Contact Name</span>
                                                {selectedStay.customer.emergencyContact?.name || "N/A"}
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-brand-sage block font-bold">Relation</span>
                                                {selectedStay.customer.emergencyContact?.relation || "N/A"}
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-brand-sage block font-bold">Phone Number</span>
                                                {selectedStay.customer.emergencyContact?.phoneNumber || "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-brand-offwhite dark:bg-brand-charcoal/60 p-4 border-t border-brand-beige/35 dark:border-brand-beige/10 flex justify-end">
                                <button
                                    onClick={() => setIsCustomerModalOpen(false)}
                                    className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white border-none rounded uppercase tracking-wider text-[10px] px-6 cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Hidden print container for Guest Folio Ledger */}
            <div style={{ display: "none" }}>
                {printLedgerRes && (
                    <PrintReportTemplate
                        ref={ledgerPrintRef}
                        title={`Guest Folio Ledger - ${printLedgerRes.stayNo}`}
                        subtitle={`Detailed account transactions ledger for ${printLedgerRes.customer?.fullName || "Guest"}`}
                        dateRange={`Check-in: ${new Date(printLedgerRes.checkInDate).toLocaleDateString("en-GB")} to Expected Check-out: ${new Date(printLedgerRes.expectedCheckOutDate).toLocaleDateString("en-GB")}`}
                    >
                        <div style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", fontSize: "12px" }}>
                            <strong>Customer Name:</strong> {printLedgerRes.customer?.fullName} &nbsp;|&nbsp;
                            <strong>Email:</strong> {printLedgerRes.customer?.emailAddress || "N/A"} &nbsp;|&nbsp;
                            <strong>Phone:</strong> {printLedgerRes.customer?.phoneNumber || "N/A"} &nbsp;|&nbsp;
                            <strong>Assigned Rooms:</strong> {printLedgerRes.rooms?.map(r => r.room?.roomNumber).join(", ")}
                        </div>

                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th style={{ textAlign: "right" }}>Debit (+)</th>
                                    <th style={{ textAlign: "right" }}>Credit (-)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {folioEntries.map(entry => (
                                    <tr key={entry._id}>
                                        <td>{new Date(entry.date).toLocaleDateString("en-GB")}</td>
                                        <td style={{ fontWeight: "bold" }}>{entry.description}</td>
                                        <td style={{ textAlign: "right", color: "red" }}>{entry.debit > 0 ? `৳${entry.debit.toFixed(2)}` : "-"}</td>
                                        <td style={{ textAlign: "right", color: "green" }}>{entry.credit > 0 ? `৳${entry.credit.toFixed(2)}` : "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ fontWeight: "bold" }}>
                                    <td colSpan="2">TOTALS</td>
                                    <td style={{ textAlign: "right", color: "red" }}>৳{totalDebit.toFixed(2)}</td>
                                    <td style={{ textAlign: "right", color: "green" }}>৳{totalCredit.toFixed(2)}</td>
                                </tr>
                                <tr style={{ fontWeight: "bold", fontSize: "12px" }}>
                                    <td colSpan="2" style={{ borderTop: "2px solid black" }}>OUTSTANDING DUE BALANCE:</td>
                                    <td colSpan="2" style={{ textAlign: "right", color: outstandingDue > 0 ? "red" : "green", borderTop: "2px solid black" }}>
                                        ৳{outstandingDue.toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </PrintReportTemplate>
                )}
            </div>

            {/* Hidden print container for Guest Final Invoice */}
            <div style={{ display: "none" }}>
                {finalInvoiceRes && (() => {
                    const summary = getInvoiceSummary(folioEntries);
                    const isDue = summary.dueAmount > 0;
                    return (
                        <PrintReportTemplate
                            ref={finalInvoicePrintRef}
                            title="FINAL GUEST INVOICE"
                            subtitle="Thank you for staying with us"
                            dateRange=""
                        >
                            {/* Invoice Meta Header Grid */}
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "20px",
                                marginBottom: "30px",
                                borderBottom: "2px solid #1e293b",
                                paddingBottom: "15px",
                                fontSize: "11px"
                            }}>
                                <div>
                                    <span style={{ textTransform: "uppercase", fontSize: "9px", fontWeight: "bold", color: "#1e293b", tracking: "widest" }}>Billing Info</span>
                                    <p style={{ margin: "4px 0 2px 0", fontWeight: "bold", fontSize: "13px" }}>{finalInvoiceRes.customer?.fullName}</p>
                                    <p style={{ margin: "2px 0", color: "#555" }}>Phone: {finalInvoiceRes.customer?.phoneNumber || "N/A"}</p>
                                    <p style={{ margin: "2px 0", color: "#555" }}>Email: {finalInvoiceRes.customer?.emailAddress || finalInvoiceRes.customer?.email || "N/A"}</p>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <span style={{ textTransform: "uppercase", fontSize: "9px", fontWeight: "bold", color: "#1e293b", tracking: "widest" }}>Invoice Info</span>
                                    <p style={{ margin: "4px 0 2px 0" }}><strong>Invoice Ref:</strong> INV-{finalInvoiceRes.stayNo.replace("STY-", "")}</p>
                                    <p style={{ margin: "2px 0" }}><strong>Booking ID:</strong> {finalInvoiceRes.reservationNo || finalInvoiceRes.stayNo}</p>
                                    <p style={{ margin: "2px 0" }}><strong>Check-In:</strong> {new Date(finalInvoiceRes.checkInDate).toLocaleDateString("en-GB")} 14:00</p>
                                    <p style={{ margin: "2px 0" }}><strong>Check-Out:</strong> {finalInvoiceRes.actualCheckOutDate ? new Date(finalInvoiceRes.actualCheckOutDate).toLocaleDateString("en-GB") : new Date(finalInvoiceRes.expectedCheckOutDate).toLocaleDateString("en-GB")} 12:00</p>
                                    <p style={{ margin: "2px 0" }}><strong>Payment Mode:</strong> {finalInvoiceRes.bookingSource || "Walk-in"}</p>
                                </div>
                            </div>

                            {/* Booking Item Details */}
                            <div style={{ marginBottom: "25px" }}>
                                <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Room & Reservation Details</h4>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                    <thead>
                                        <tr style={{ background: "#f8fafc", textAlign: "left", fontWeight: "bold", color: "#475569" }}>
                                            <th style={{ padding: "10px", borderBottom: "1px solid #cbd5e1" }}>Stay Allocation</th>
                                            <th style={{ padding: "10px", borderBottom: "1px solid #cbd5e1" }}>Meal Option</th>
                                            <th style={{ padding: "10px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Nights</th>
                                            <th style={{ padding: "10px", borderBottom: "1px solid #cbd5e1", textAlign: "right" }}>Total Rate (BDT)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {finalInvoiceRes.rooms?.map((rm, index) => {
                                            const roomNo = rm.room?.roomNumber || rm.roomNo || "Unassigned";
                                            return (
                                                <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                    <td style={{ padding: "10px" }}>
                                                        <div style={{ fontWeight: "bold", fontSize: "11px" }}>Room {roomNo}</div>
                                                        <div style={{ color: "#64748b", fontSize: "10px" }}>{rm.roomType || "Resort Room"}</div>
                                                    </td>
                                                    <td style={{ padding: "10px", color: "#475569" }}>{rm.mealPlan || "Room Only"}</td>
                                                    <td style={{ padding: "10px", textAlign: "right", color: "#475569" }}>{rm.nights || 1}</td>
                                                    <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold" }}>৳ {(rm.nightlyRate * (rm.nights || 1)).toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Payment Summary & Financials */}
                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "30px", marginBottom: "30px" }}>
                                {/* Collected Payments ledger */}
                                <div>
                                    <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Payments Ledger</h4>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "1px solid #cbd5e1", color: "#64748b", fontWeight: "bold", textAlign: "left" }}>
                                                <th style={{ padding: "6px 0" }}>Payment Particulars</th>
                                                <th style={{ padding: "6px 0" }}>Method</th>
                                                <th style={{ padding: "6px 0", textAlign: "right" }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {folioEntries.filter(e => e.credit > 0 && !e.description.toLowerCase().includes("discount")).map((e, idx) => (
                                                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                    <td style={{ padding: "6px 0", color: "#475569" }}>{e.description}</td>
                                                    <td style={{ padding: "6px 0", color: "#475569" }}>{e.type || "Cash/Online"}</td>
                                                    <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "bold", color: "green" }}>৳ {e.credit.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {folioEntries.filter(e => e.credit > 0 && !e.description.toLowerCase().includes("discount")).length === 0 && (
                                                <tr>
                                                    <td colSpan="3" style={{ padding: "10px 0", color: "#94a3b8", fontStyle: "italic" }}>No payments collected yet.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Bill calculation summary card */}
                                <div style={{
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    padding: "16px",
                                    fontSize: "11px"
                                }}>
                                    <h4 style={{ fontSize: "11px", fontWeight: "black", color: "#1e293b", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Bill Summary</h4>
                                    <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#475569" }}>
                                        <span>Total Room Charges:</span>
                                        <span>৳ {summary.roomTotal.toLocaleString()}</span>
                                    </div>
                                    {summary.serviceTotal > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#475569" }}>
                                            <span>Resort Add-ons:</span>
                                            <span>৳ {summary.serviceTotal.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {summary.foodTotal > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#475569" }}>
                                            <span>Restaurant Orders:</span>
                                            <span>৳ {summary.foodTotal.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {summary.discountTotal > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "green", fontWeight: "bold" }}>
                                            <span>Discount:</span>
                                            <span>(-) ৳ {summary.discountTotal.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div style={{ borderTop: "1px solid #cbd5e1", margin: "8px 0" }}></div>
                                    <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", fontWeight: "bold", fontSize: "12px" }}>
                                        <span>Total Net Bill:</span>
                                        <span style={{ color: "#1e293b" }}>৳ {summary.netPayable.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#475569" }}>
                                        <span>Total Paid:</span>
                                        <span style={{ color: "green", fontWeight: "bold" }}>৳ {summary.paidTotal.toLocaleString()}</span>
                                    </div>
                                    <div style={{ borderTop: "1px solid #cbd5e1", margin: "8px 0" }}></div>

                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        margin: "4px 0 0 0",
                                        fontWeight: "black",
                                        fontSize: "13px",
                                        color: isDue ? "#ef4444" : "#22c55e"
                                    }}>
                                        <span>{isDue ? "Outstanding Due:" : "Invoice Settled:"}</span>
                                        <span>৳ {summary.dueAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Terms & Thank You Message Footer */}
                            <div style={{
                                marginTop: "50px",
                                borderTop: "1px dashed #cbd5e1",
                                paddingTop: "15px",
                                textAlign: "center",
                                fontSize: "10px",
                                color: "#64748b"
                            }}>
                                <p style={{ margin: "2px 0" }}>This is a computer-generated guest invoice from Chayatol Resort & Restaurant PMS.</p>
                                <p style={{ margin: "2px 0", fontWeight: "bold", color: "#1e293b" }}>We hope you enjoyed your stay! See you again soon.</p>
                            </div>
                        </PrintReportTemplate>
                    );
                })()}
            </div>

            {/* View Restaurant Invoice Details Modal */}
            {viewingInvoice && (
                <dialog className="modal modal-open z-[99999] bg-brand-charcoal/40 backdrop-blur-sm">
                    <div className="modal-box bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/25 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto animate-scale-in">
                        <button
                            onClick={() => setViewingInvoice(null)}
                            className="absolute top-4 right-4 text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite cursor-pointer bg-transparent border-none"
                        >
                            <FiX size={20} />
                        </button>

                        <h3 className="text-lg font-black text-brand-charcoal dark:text-brand-offwhite uppercase tracking-widest flex items-center gap-2 mb-2">
                            <FiFileText className="text-brand-primary" /> POS Invoice Details
                        </h3>
                        <p className="text-xs font-bold text-brand-sage mb-4">
                            Invoice Serial: {viewingInvoice.invoiceSerial || viewingInvoice.invoiceNo}
                        </p>

                        <div className="grid grid-cols-2 gap-4 border-b border-brand-beige/20 dark:border-brand-beige/10 pb-4 mb-4 text-xs font-semibold">
                            <div>
                                <p className="text-brand-sage uppercase tracking-wider">DateTime</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold">
                                    {new Date(viewingInvoice.dateTime || viewingInvoice.createdAt).toLocaleString("en-GB")}
                                </p>
                            </div>
                            <div>
                                <p className="text-brand-sage uppercase tracking-wider">Guest</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold">
                                    {viewingInvoice.customerName || viewingInvoice.customer?.name || "Walk-in Guest"}
                                </p>
                            </div>
                            <div>
                                <p className="text-brand-sage uppercase tracking-wider">Order Type</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-bold uppercase">
                                    {viewingInvoice.orderType}
                                </p>
                            </div>
                            <div>
                                <p className="text-brand-sage uppercase tracking-wider">Payment Status</p>
                                <p className="text-brand-charcoal dark:text-brand-offwhite mt-0.5 font-extrabold uppercase">
                                    {viewingInvoice.paymentStatus || "Unpaid"}
                                </p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="mb-4">
                            <h4 className="text-xs font-extrabold text-brand-sage mb-2 uppercase tracking-widest">Order Items</h4>
                            <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 border border-brand-beige/25 dark:border-brand-beige/10 rounded-2xl p-4">
                                <table className="min-w-full text-xs font-semibold text-brand-charcoal dark:text-brand-offwhite">
                                    <thead>
                                        <tr className="border-b border-brand-beige dark:border-brand-beige/20 text-brand-sage uppercase text-[10px] tracking-wider">
                                            <th className="text-left pb-2">Item Name</th>
                                            <th className="text-center pb-2">Qty</th>
                                            <th className="text-right pb-2">Rate</th>
                                            <th className="text-right pb-2">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(viewingInvoice.products) && viewingInvoice.products.length > 0 ? (
                                            viewingInvoice.products.map((item, index) => (
                                                <tr key={index} className="border-b border-brand-beige/10">
                                                    <td className="py-2 text-left">{item.productName || item.foodName}</td>
                                                    <td className="py-2 text-center font-extrabold">{item.qty || item.quantity}</td>
                                                    <td className="py-2 text-right">৳ {(item.rate || item.unitPrice || 0).toFixed(0)}</td>
                                                    <td className="py-2 text-right">৳ {(item.subtotal || item.totalPrice || 0).toFixed(0)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="text-center py-4">No items listed.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Calculations */}
                        <div className="flex flex-col items-end gap-1.5 text-xs font-semibold border-t border-brand-beige/25 dark:border-brand-beige/10 pt-4 mb-6">
                            <p>Subtotal: ৳ {(viewingInvoice.subtotal || viewingInvoice.subTotal || 0).toFixed(0)}</p>
                            {viewingInvoice.discount > 0 && <p className="text-green-600">Discount: -৳ {viewingInvoice.discount.toFixed(0)}</p>}
                            {viewingInvoice.vat > 0 && <p>VAT: ৳ {viewingInvoice.vat.toFixed(0)}</p>}
                            {viewingInvoice.sd > 0 && <p>SD: ৳ {viewingInvoice.sd.toFixed(0)}</p>}
                            {viewingInvoice.serviceCharge > 0 && <p>Service Charge: ৳ {viewingInvoice.serviceCharge.toFixed(0)}</p>}
                            {viewingInvoice.deliveryCharge > 0 && <p>Delivery Charge: ৳ {viewingInvoice.deliveryCharge.toFixed(0)}</p>}
                            <p className="font-extrabold text-brand-primary dark:text-brand-sage text-sm mt-1">
                                Total Amount: ৳ {(viewingInvoice.totalAmount || viewingInvoice.grandTotal || 0).toFixed(0)}
                            </p>
                        </div>

                        {/* View Modal Actions */}
                        <div className="flex justify-end gap-2.5">
                            <button
                                onClick={() => setViewingInvoice(null)}
                                className="btn btn-sm bg-transparent hover:bg-brand-beige/25 text-brand-sage font-bold text-[10px] uppercase tracking-wider px-4 py-2 cursor-pointer border-none shadow-none"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => handlePrintInvoiceAction("thermal")}
                                className="btn btn-sm bg-[#1e293b] hover:bg-[#1e293b]/90 text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-3 shadow flex items-center gap-1"
                                title="Print Thermal Receipt (80mm)"
                            >
                                <FiPrinter /> Thermal Print
                            </button>
                            <button
                                onClick={() => handlePrintInvoiceAction("a4")}
                                className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-3 shadow flex items-center gap-1"
                                title="Print A4 Invoice Page"
                            >
                                <FiPrinter /> A4 Print
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            {/* Global/Hidden POS receipt print containers */}
            <div className="hidden">
                {invoicePrintData && (
                    <>
                        <ReceiptTemplate
                            ref={receiptRef}
                            profileData={companyInfo}
                            invoiceData={invoicePrintData}
                        />
                        <A4ReceiptTemplate
                            ref={a4ReceiptRef}
                            profileData={companyInfo}
                            invoiceData={invoicePrintData}
                        />
                    </>
                )}
            </div>

            {/* Loading Backdrop for fetching invoices */}
            {isInvoiceLoading && (
                <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
                </div>
            )}
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
