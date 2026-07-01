"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaChair,
    FaUserClock,
    FaUtensils,
    FaCheckCircle,
    FaBookmark,
    FaRedo
} from 'react-icons/fa';
import useAxiosSecure from '@/hooks/useAxiosSecure';

const statusConfig = {
    free: {
        display: 'Available',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-350 border border-emerald-200 dark:border-emerald-900',
        icon: FaChair,
        iconClass: 'text-emerald-500',
    },
    pending: {
        display: 'Occupied',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-350 border border-amber-200 dark:border-amber-900',
        icon: FaUserClock,
        iconClass: 'text-amber-500',
    },
    cooking: {
        display: 'Cooking',
        badgeClass: 'bg-orange-100 text-orange-850 dark:bg-orange-950 dark:text-orange-350 border border-orange-200 dark:border-orange-900',
        icon: FaUtensils,
        iconClass: 'text-orange-500',
    },
    served: {
        display: 'Served',
        badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-350 border border-indigo-200 dark:border-indigo-900',
        icon: FaCheckCircle,
        iconClass: 'text-indigo-500',
    },
    reserved: {
        display: 'Reserved',
        badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900',
        icon: FaBookmark,
        iconClass: 'text-red-500',
    },
};

function LobbyContent() {
    const axiosSecure = useAxiosSecure();
    const router = useRouter();
    
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hoveredTableId, setHoveredTableId] = useState(null);

    const fetchTablesStatus = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosSecure.get('/restauranttable/status');
            if (response.data) {
                setTables(response.data);
            }
        } catch (error) {
            console.error("Error fetching computed table statuses:", error);
        } finally {
            setLoading(false);
        }
    }, [axiosSecure]);

    useEffect(() => {
        fetchTablesStatus();
    }, [fetchTablesStatus]);

    const handleTableSelect = (table) => {
        if (table.status === 'free') {
            router.push(`/dashboard/pos?table=${encodeURIComponent(table.tableName)}`);
        } else if (['pending', 'cooking', 'served'].includes(table.status)) {
            router.push(`/dashboard/pos?invoiceId=${table.invoiceId}`);
        } else if (table.status === 'reserved') {
            if (table.invoiceId) {
                router.push(`/dashboard/pos?invoiceId=${table.invoiceId}`);
            } else {
                router.push(`/dashboard/pos?table=${encodeURIComponent(table.tableName)}`);
            }
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const cardVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: (i) => ({
            opacity: 1,
            scale: 1,
            transition: { delay: i * 0.05, duration: 0.4 }
        }),
        exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } },
    };

    return (
        <div className="bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-200">
            <motion.div
                className="card bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 shadow-xl w-full mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="card-body p-6">
                    <header className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-black text-gray-800 dark:text-zinc-100">Restaurant Lobby</h1>
                            <p className="text-sm text-gray-500 mt-1">Live table occupancy & service statuses</p>
                        </div>
                        <button 
                            onClick={fetchTablesStatus} 
                            className="btn btn-outline btn-sm rounded-lg flex items-center gap-1 cursor-pointer dark:border-zinc-800 dark:text-zinc-250"
                        >
                            <FaRedo /> Refresh
                        </button>
                    </header>
                    <div className="divider dark:before:bg-zinc-800 dark:after:bg-zinc-800" />
                    
                    <main>
                        {loading ? (
                            <div className="flex justify-center items-center py-24">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : tables && tables.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                <AnimatePresence>
                                    {tables.map((table, i) => {
                                        const config = statusConfig[table.status] || statusConfig.free;
                                        const isClickable = ['free', 'pending', 'reserved', 'cooking', 'served'].includes(table.status);
                                        const IconComponent = config.icon;

                                        return (
                                            <motion.div
                                                key={table._id}
                                                layout
                                                custom={i}
                                                variants={cardVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                whileHover={isClickable ? { scale: 1.05, y: -5 } : {}}
                                                whileTap={isClickable ? { scale: 0.95 } : {}}
                                                onMouseEnter={() => setHoveredTableId(table._id)}
                                                onMouseLeave={() => setHoveredTableId(null)}
                                                onClick={() => isClickable && handleTableSelect(table)}
                                                className={`card bg-white dark:bg-zinc-900 shadow-md transition-all duration-300 relative overflow-hidden border border-slate-200 dark:border-zinc-800/80 ${isClickable ? 'cursor-pointer hover:shadow-xl hover:border-blue-600 dark:hover:border-blue-500' : 'cursor-not-allowed opacity-70'}`}
                                            >
                                                <div className="card-body items-center text-center p-6 relative">
                                                    <div className="absolute top-4 right-4">
                                                        <IconComponent className={`w-12 h-12 ${config.iconClass} opacity-10`} />
                                                    </div>
                                                    <h2 className="text-3xl font-black text-slate-800 dark:text-zinc-150 mb-3 tracking-tight">
                                                        {table.tableName}
                                                    </h2>
                                                    <div className="card-actions justify-center w-full">
                                                        <div className={`badge ${config.badgeClass} font-bold p-3 rounded-full text-xs`}>
                                                            {config.display}
                                                            {table.status === 'reserved' && table.reservation?.startTime && (
                                                                <span className="ml-1.5 font-normal opacity-90 text-[10px]">
                                                                    ({formatTime(table.reservation.startTime)})
                                                                 </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <AnimatePresence>
                                                    {table.status === 'reserved' && hoveredTableId === table._id && table.reservation && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 10 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-3 bg-slate-800 dark:bg-zinc-800 text-white text-xs rounded-lg shadow-lg z-20 pointer-events-none"
                                                        >
                                                            <div className="font-bold text-sm mb-1">{table.reservation.customerName}</div>
                                                            <div className="text-slate-300 dark:text-zinc-400 font-medium">{table.reservation.customerPhone}</div>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800 dark:border-t-zinc-800"></div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="flex justify-center items-center py-24 text-gray-500 dark:text-zinc-400 font-bold text-lg">
                                No restaurant tables configured.
                            </div>
                        )}
                    </main>
                </div>
            </motion.div>
        </div>
    );
}

export default function TableLobbyPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <LobbyContent />
        </Suspense>
    );
}
