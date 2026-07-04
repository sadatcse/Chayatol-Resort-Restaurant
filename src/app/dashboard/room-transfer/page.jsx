"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { FiSearch, FiRefreshCw, FiArrowRight, FiCheck } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import MtableLoading from "@/components/Comon/MtableLoading";
import SectionHeader from "@/components/Comon/SectionHeader";

function RoomTransferContent() {
    const axiosSecure = useAxiosSecure();

    // States
    const [stays, setStays] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedStay, setSelectedStay] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Transfer fields
    const [oldRoomId, setOldRoomId] = useState("");
    const [newRoomId, setNewRoomId] = useState("");
    const [newRate, setNewRate] = useState(0);
    const [reason, setReason] = useState("");

    // Fetch stays and rooms
    const fetchActiveStays = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await axiosSecure.get("/stays?status=In House&limit=1000");
            if (data?.data) {
                setStays(data.data);
            }
        } catch (err) {
            console.error("Error fetching stays:", err);
            setStays([]);
        } finally {
            setIsLoading(false);
        }
    }, [axiosSecure]);

    const fetchAvailableRooms = useCallback(async () => {
        try {
            const { data } = await axiosSecure.get("/room/paginated?limit=1000");
            if (data?.rooms) {
                setRooms(data.rooms);
            }
        } catch (err) {
            console.error("Error fetching rooms:", err);
            setRooms([]);
        }
    }, [axiosSecure]);

    useEffect(() => {
        fetchActiveStays();
        fetchAvailableRooms();
    }, [fetchActiveStays, fetchAvailableRooms]);

    // Search filter for stays
    const filteredStays = useMemo(() => {
        if (!searchTerm) return stays;
        const term = searchTerm.toLowerCase();
        return stays.filter(s => 
            s.stayNo.toLowerCase().includes(term) ||
            s.customer?.fullName?.toLowerCase().includes(term) ||
            s.rooms?.some(r => r.room?.roomNumber?.toLowerCase().includes(term))
        );
    }, [stays, searchTerm]);

    const handleSelectStay = (stay) => {
        setSelectedStay(stay);
        setOldRoomId(stay.rooms?.[0]?.room?._id || "");
        setNewRoomId("");
        setNewRate(0);
        setReason("");
    };

    // Filter target vacant rooms
    const vacantRooms = useMemo(() => {
        return rooms.filter(r => r.status === "Available");
    }, [rooms]);

    // Sync nightly rate when target room is chosen
    const handleNewRoomChange = (e) => {
        const roomId = e.target.value;
        setNewRoomId(roomId);
        const matchRoom = rooms.find(r => r._id === roomId);
        if (matchRoom) {
            setNewRate(matchRoom.price);
        } else {
            setNewRate(0);
        }
    };

    const handleExecuteTransfer = async () => {
        if (!selectedStay || !oldRoomId || !newRoomId) {
            Swal.fire("Error", "Please fill in stay, old room, and new target room.", "warning");
            return;
        }

        setIsTransferring(true);
        try {
            const response = await axiosSecure.post(`/stays/${selectedStay._id}/transfer`, {
                oldRoomId,
                newRoomId,
                reason
            });

            if (response.status === 200 || response.data?.success) {
                Swal.fire({
                    title: "Room Transferred!",
                    text: "Room transfer completed successfully. Old room status set to cleaning.",
                    icon: "success"
                });
                
                setSelectedStay(null);
                setOldRoomId("");
                setNewRoomId("");
                setNewRate(0);
                setReason("");
                
                // Refresh records
                fetchActiveStays();
                fetchAvailableRooms();
            }
        } catch (err) {
            console.error("Room transfer error:", err);
            Swal.fire("Error", err.response?.data?.message || "Failed to complete room transfer.", "error");
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
            <div className="max-w-7xl mx-auto">
                <SectionHeader
                    title="Room Transfer Dashboard"
                    subtitle="Reassign rooms and transfer active guests to vacant clean rooms."
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

                    {/* Right: Transfer Detail Form */}
                    <div className="lg:col-span-8">
                        <AnimatePresence mode="wait">
                            {selectedStay ? (
                                <motion.div
                                    key={selectedStay._id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl p-6 shadow-sm space-y-6"
                                >
                                    <div className="border-b border-brand-beige dark:border-brand-beige/25 pb-4">
                                        <h2 className="text-xl font-black text-brand-charcoal dark:text-brand-offwhite">Transfer Guest: {selectedStay.customer?.fullName}</h2>
                                        <p className="text-xs font-semibold text-brand-sage mt-0.5">Stay Ref: {selectedStay.stayNo} • Expected Check-out: {new Date(selectedStay.expectedCheckOutDate).toLocaleDateString("en-GB")}</p>
                                    </div>

                                    {/* Transfer Form Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-semibold">
                                        {/* Select Old Room */}
                                        <div className="form-control w-full">
                                            <label className="label"><span className="label-text text-xs font-bold text-brand-sage uppercase">Select Old Room to vacate</span></label>
                                            <select
                                                value={oldRoomId}
                                                onChange={(e) => setOldRoomId(e.target.value)}
                                                className="select select-bordered select-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                            >
                                                {selectedStay.rooms?.map(r => (
                                                    <option key={r.room?._id} value={r.room?._id}>
                                                        Room {r.room?.roomNumber} (৳ {r.nightlyRate.toFixed(0)}/night)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Select Vacant Target Room */}
                                        <div className="form-control w-full">
                                            <label className="label"><span className="label-text text-xs font-bold text-brand-sage uppercase">Select New vacant Room</span></label>
                                            <select
                                                value={newRoomId}
                                                onChange={handleNewRoomChange}
                                                className="select select-bordered select-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                            >
                                                <option value="">Choose Room</option>
                                                {vacantRooms.map(r => (
                                                    <option key={r._id} value={r._id}>
                                                        Room {r.roomNumber} ({r.roomType}) - ৳ {r.price.toFixed(0)}/night
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* New Rate display */}
                                        <div className="form-control w-full">
                                            <label className="label"><span className="label-text text-xs font-bold text-brand-sage uppercase">Target Nightly Rate</span></label>
                                            <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 p-2.5 rounded-lg border border-brand-beige dark:border-brand-beige/15 text-brand-charcoal dark:text-brand-offwhite font-bold font-mono">
                                                ৳ {newRate.toFixed(0)}
                                            </div>
                                        </div>

                                        {/* Reason for Transfer */}
                                        <div className="form-control w-full md:col-span-2">
                                            <label className="label"><span className="label-text text-xs font-bold text-brand-sage uppercase">Reason for Transfer</span></label>
                                            <input
                                                type="text"
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                placeholder="e.g. Guest requested upgraded view, AC malfunction, etc."
                                                className="input input-bordered input-sm w-full border-brand-primary focus:outline-none focus:border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite text-xs h-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-brand-beige dark:border-brand-beige/25">
                                        <button
                                            onClick={() => setSelectedStay(null)}
                                            className="btn btn-sm btn-ghost cursor-pointer text-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleExecuteTransfer}
                                            disabled={isTransferring}
                                            className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white font-bold cursor-pointer border-none rounded uppercase tracking-wider text-[10px] px-4 shadow flex items-center gap-1"
                                        >
                                            {isTransferring ? "Transferring..." : <>Execute Transfer <FiCheck /></>}
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 rounded-2xl p-12 text-center shadow-sm h-96 flex flex-col justify-center items-center"
                                >
                                    <FiRefreshCw size={48} className="text-brand-sage animate-spin" style={{ animationDuration: "12s" }} />
                                    <h3 className="font-extrabold text-base text-brand-charcoal dark:text-brand-offwhite mt-4">Select Guest Stay</h3>
                                    <p className="text-xs text-brand-sage mt-1 max-w-xs">Select any checked-in guest stay from the left pane to reallocate rooms or upgrade rates.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RoomTransferPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
            <RoomTransferContent />
        </Suspense>
    );
}
