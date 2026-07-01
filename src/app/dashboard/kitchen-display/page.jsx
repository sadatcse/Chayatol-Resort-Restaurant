"use client";

import React, { useState, useEffect, useContext, useRef, useMemo, useCallback, Suspense } from 'react';
import { AuthContext } from '@/providers/AuthProvider';
import useAxiosSecure from '@/hooks/useAxiosSecure';
import { 
    IoRestaurant, IoTimeOutline, IoVolumeMuteOutline, 
    IoVolumeHighOutline, IoBeerOutline 
} from "react-icons/io5";
import { 
    MdDeliveryDining, MdOutlineFoodBank, MdSoupKitchen, MdFastfood, MdHistory 
} from "react-icons/md";
import { BsHandbagFill } from "react-icons/bs";
import { FaCheckCircle, FaUtensils, FaFire, FaClock, FaHotel } from "react-icons/fa";

// Time ago calculation helper
const useTimeAgo = (startTime) => {
    const [timeAgo, setTimeAgo] = useState('');
    useEffect(() => {
        const updateTimer = () => {
            if (!startTime) return;
            const diffMs = new Date() - new Date(startTime);
            const durationSec = Math.floor(diffMs / 1000);
            const days = Math.floor(durationSec / 86400);
            const hours = Math.floor((durationSec % 86400) / 3600);
            const minutes = Math.floor((durationSec % 3600) / 60);
            const seconds = durationSec % 60;
            
            let parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0) parts.push(`${hours}h`);
            parts.push(`${String(minutes).padStart(2, '0')}m`);
            parts.push(`${String(seconds).padStart(2, '0')}s`);
            setTimeAgo(parts.join(' '));
        };
        const intervalId = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(intervalId);
    }, [startTime]);
    return timeAgo;
};

// Double-chime synthesizer (chime for kitchen alerts)
const playChime = () => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // First tone
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.4);

        // Second tone
        setTimeout(() => {
            if (audioCtx.state === 'closed') return;
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5
            gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.6);
        }, 150);
    } catch (e) {
        console.warn("Audio context chime failed:", e);
    }
};

// Batch Item Row Component
const ProductBatchRow = ({ batch, isDrink, onStatusChange }) => {
    const getStatusStyle = (status) => {
        switch (status?.toUpperCase()) {
            case 'PENDING': 
                return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-250 dark:border-yellow-900/40 text-yellow-800 dark:text-yellow-400';
            case 'COOKING': 
                return 'bg-orange-50 dark:bg-orange-950/20 border-orange-250 dark:border-orange-900/40 text-orange-850 dark:text-orange-400';
            case 'SERVED': 
                return 'bg-gray-50 dark:bg-zinc-800/40 border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 opacity-60';
            default: 
                return 'bg-gray-50 dark:bg-zinc-800/50';
        }
    };

    return (
        <div className={`flex items-center justify-between p-2 mb-1.5 rounded-md border ${getStatusStyle(batch.cookStatus)}`}>
            <div className="flex items-center gap-3">
                <div className={`text-xs font-black px-2 py-1 rounded border ${isDrink ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40' : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200'}`}>
                    +{batch.qty}
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                        <MdHistory /> {new Date(batch.updateTime || Date.now()).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider">
                        {batch.cookStatus || 'PENDING'}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1">
                {batch.cookStatus?.toUpperCase() === 'PENDING' && (
                    <button 
                        onClick={() => onStatusChange(batch._id, 'COOKING')}
                        className="btn btn-xs bg-amber-500 hover:bg-amber-600 border-none text-white cursor-pointer px-2 py-1 flex items-center gap-1 font-bold"
                    >
                        <FaFire size={10} /> Cook
                    </button>
                )}
                {batch.cookStatus?.toUpperCase() === 'COOKING' && (
                    <button 
                        onClick={() => onStatusChange(batch._id, 'SERVED')}
                        className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 border-none text-white cursor-pointer px-2 py-1 flex items-center gap-1 font-bold"
                    >
                        <FaUtensils size={10} /> Serve
                    </button>
                )}
                {batch.cookStatus?.toUpperCase() === 'SERVED' && (
                    <FaCheckCircle className="text-emerald-500" />
                )}
            </div>
        </div>
    );
};

// Parent Product container
const ProductItem = ({ product, onUpdateHistory }) => {
    const batches = useMemo(() => {
        if (!product.history || product.history.length === 0) {
            return [{
                _id: product._id,
                qty: product.qty,
                cookStatus: product.cookStatus || 'PENDING',
                updateTime: product.updatedAt || new Date().toISOString()
            }];
        }

        return [...product.history]
            .sort((a, b) => (a.updateNumber || 0) - (b.updateNumber || 0))
            .map((item, index, arr) => {
                const prevQty = index > 0 ? arr[index - 1].qty : 0;
                const batchQty = item.qty - prevQty;
                return { ...item, batchQty };
            })
            .filter(b => b.batchQty > 0)
            .reverse(); // Newest updates first
    }, [product]);

    const isDrink = product.drinkBar === true;

    return (
        <li className="flex flex-col w-full py-3 border-b border-gray-150 dark:border-zinc-800 last:border-none">
            <div className="flex items-center gap-3 mb-2 px-2">
                <div className={`p-2 rounded-lg ${isDrink ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'}`}>
                    {isDrink ? <IoBeerOutline size={20} /> : <MdFastfood size={20} />}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-gray-800 dark:text-zinc-150">Total: {product.qty}x</span>
                        <span className="font-bold text-sm text-gray-700 dark:text-zinc-300">{product.productName}</span>
                    </div>
                </div>
            </div>

            <div className="pl-12 pr-2 w-full">
                {batches.map(batch => (
                    <ProductBatchRow 
                        key={batch._id}
                        batch={{...batch, qty: batch.batchQty || batch.qty}}
                        isDrink={isDrink}
                        onStatusChange={(historyId, status) => onUpdateHistory(product._id, historyId, status)}
                    />
                ))}
            </div>
        </li>
    );
};

// Order Card Component
const OrderCard = ({ order, onUpdate }) => {
    const timeAgo = useTimeAgo(order.dateTime || order.createdAt);

    const getOrderTypeDetails = (type) => {
        switch (type?.toLowerCase()) {
            case 'dine-in': 
                return { className: 'bg-rose-600 text-white', icon: <IoRestaurant size={22} /> };
            case 'delivery': 
                return { className: 'bg-emerald-600 text-white', icon: <MdDeliveryDining size={22} /> };
            case 'takeaway': 
                return { className: 'bg-amber-500 text-white', icon: <BsHandbagFill size={18} /> };
            case 'room service': 
                return { className: 'bg-indigo-600 text-white', icon: <FaHotel size={18} /> };
            default: 
                return { className: 'bg-slate-500 text-white', icon: <MdSoupKitchen size={22} /> };
        }
    };

    const handleHistoryUpdate = (productId, historyId, newStatus) => {
        const updatedProducts = order.products.map(p => {
            if (p._id !== productId) return p;

            let updatedHistory;
            if (p.history && p.history.length > 0) {
                updatedHistory = p.history.map(h => 
                    h._id === historyId ? { ...h, cookStatus: newStatus } : h
                );
            } else {
                return { ...p, cookStatus: newStatus };
            }

            const allServed = updatedHistory.every(h => h.cookStatus === 'SERVED');
            const anyCooking = updatedHistory.some(h => h.cookStatus === 'COOKING');
            const parentStatus = allServed ? 'SERVED' : (anyCooking ? 'COOKING' : 'PENDING');

            return { ...p, history: updatedHistory, cookStatus: parentStatus };
        });

        const orderAllServed = updatedProducts.every(p => p.cookStatus === 'SERVED');
        const orderAnyCooking = updatedProducts.some(p => p.cookStatus === 'COOKING');
        const newOrderStatus = orderAllServed ? 'served' : (orderAnyCooking ? 'cooking' : order.orderStatus);

        const updatedOrder = { ...order, products: updatedProducts, orderStatus: newOrderStatus };
        onUpdate(updatedOrder);
    };

    const handleCookAllPending = () => {
        const updatedProducts = order.products.map(p => {
            if (!p.history || p.history.length === 0) {
                return p.cookStatus === 'PENDING' ? {...p, cookStatus: 'COOKING'} : p;
            }

            const updatedHistory = p.history.map(h => 
                h.cookStatus === 'PENDING' ? { ...h, cookStatus: 'COOKING' } : h
            );
            
            const anyCooking = updatedHistory.some(h => h.cookStatus === 'COOKING');
            const parentStatus = anyCooking ? 'COOKING' : p.cookStatus;

            return { ...p, history: updatedHistory, cookStatus: parentStatus };
        });

        const updatedOrder = { ...order, products: updatedProducts, orderStatus: 'cooking' };
        onUpdate(updatedOrder);
    };

    const orderTypeDetails = getOrderTypeDetails(order.orderType);
    
    let identifier = `Token: ${order.invoiceSerial?.slice(-4) || 'N/A'}`;
    if (order.orderType?.toLowerCase() === 'dine-in') {
        identifier = `Table: ${order.tableName || order.tableNo || 'N/A'}`;
    } else if (order.orderType?.toLowerCase() === 'room service') {
        identifier = `Room: ${order.roomNo || 'N/A'}`;
    }

    const hasPending = order.products?.some(p => {
        if (p.history?.length > 0) return p.history.some(h => h.cookStatus === 'PENDING');
        return p.cookStatus === 'PENDING';
    });

    return (
        <div className="card bg-white dark:bg-zinc-900 shadow-xl border border-gray-200 dark:border-zinc-800 flex flex-col h-full text-gray-800 dark:text-zinc-100 rounded-2xl overflow-hidden">
            <div className={`p-4 flex justify-between items-start ${orderTypeDetails.className}`}>
                <div className="flex gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm h-fit">
                        {orderTypeDetails.icon}
                    </div>
                    <div>
                        <h2 className="text-lg font-black">{identifier}</h2>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-bold bg-black/20 px-2 py-0.5 rounded text-white">
                                {order.customerName || "Walk-in Guest"}
                            </span>
                            {order.kotRound > 0 && (
                                <span className="text-[10px] font-black bg-yellow-400 text-yellow-950 px-2 py-0.5 rounded">
                                    Round {order.kotRound}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end text-xs font-semibold opacity-90">
                    <span className="flex items-center gap-1"><FaClock /> {timeAgo}</span>
                    <span className="mt-1">#{order.invoiceSerial?.slice(-6)}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] p-2">
                <ul className="flex flex-col">
                    {order.products?.map(product => (
                        <ProductItem 
                            key={product._id} 
                            product={product} 
                            onUpdateHistory={handleHistoryUpdate} 
                        />
                    ))}
                </ul>
            </div>

            <div className="p-3 border-t border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-850">
                <button 
                    className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors
                        ${hasPending 
                            ? 'bg-zinc-800 hover:bg-black text-white dark:bg-zinc-700 dark:hover:bg-zinc-650' 
                            : 'bg-gray-250 text-gray-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'}`}
                    onClick={hasPending ? handleCookAllPending : undefined}
                    disabled={!hasPending}
                >
                    <FaFire className={hasPending ? "text-orange-500" : ""} /> 
                    {hasPending ? "Cook All New Items" : "All Items Processing"}
                </button>
            </div>
        </div>
    );
};

// Main Kitchen Display Page
function KitchenDisplayContent() {
    const axiosSecure = useAxiosSecure();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAlertEnabled, setIsAlertEnabled] = useState(true);
    const [showAlert, setShowAlert] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            const response = await axiosSecure.get(`/pos/invoice?isKitchen=true`);
            if (response.data?.success) {
                const activeOrders = response.data.invoices || response.data.data || [];
                
                // Play notification chime for new orders or rounds
                setOrders(prev => {
                    const prevMap = new Map(prev.map(o => [o._id, o]));
                    let triggerAlert = false;

                    activeOrders.forEach(newOrder => {
                        const oldOrder = prevMap.get(newOrder._id);
                        if (!oldOrder) {
                            triggerAlert = true;
                        } else if (newOrder.kotRound > oldOrder.kotRound) {
                            triggerAlert = true;
                        }
                    });

                    if (triggerAlert && isAlertEnabled) {
                        playChime();
                        setShowAlert(true);
                        setTimeout(() => setShowAlert(false), 4000);
                    }
                    return activeOrders.sort((a, b) => new Date(a.dateTime || a.createdAt) - new Date(b.dateTime || b.createdAt));
                });
            }
        } catch (err) {
            console.error("Failed to fetch kitchen orders:", err);
        } finally {
            setLoading(false);
        }
    }, [axiosSecure, isAlertEnabled]);

    useEffect(() => {
        fetchOrders();

        // 10 second short polling for fast updates in serverless environment
        const intervalId = setInterval(fetchOrders, 10000);

        // Cross-tab sync BroadcastChannel
        const channel = new BroadcastChannel('teaxo-pos-offline-sync');
        channel.onmessage = (event) => {
            if (event.data.type === 'INVOICE_UPDATED') {
                fetchOrders();
            }
        };

        return () => {
            clearInterval(intervalId);
            channel.close();
        };
    }, [fetchOrders]);

    const handleUpdateOrder = async (updatedOrder) => {
        // Optimistic UI update
        setOrders(prev => 
            prev.map(o => o._id === updatedOrder._id ? updatedOrder : o)
                .filter(o => o.orderStatus !== 'served')
        );

        try {
            await axiosSecure.put(`/pos/invoice/${updatedOrder._id}`, updatedOrder);
            
            // Broadcast update to other tabs
            const channel = new BroadcastChannel('teaxo-pos-offline-sync');
            channel.postMessage({ type: 'INVOICE_UPDATED' });
            channel.close();
        } catch (err) {
            console.error("Failed to sync status update to server:", err);
            toast.error("Failed to update status on server.");
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-zinc-950 min-h-screen p-4 font-sans text-gray-800 dark:text-zinc-100 transition-colors duration-200">
            <div className="max-w-[1920px] mx-auto">
                {/* Upper bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-150 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
                            <MdOutlineFoodBank size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-800 dark:text-zinc-100 tracking-tight">KITCHEN BOARD</h1>
                            <p className="text-gray-500 dark:text-zinc-400 font-medium">Live Order Tickets Management</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 sm:mt-0">
                        <div className="text-2xl font-bold text-gray-700 dark:text-zinc-300 bg-gray-55 dark:bg-zinc-800 px-4 py-2 rounded-lg border border-gray-150 dark:border-zinc-700">
                            {orders.length} <span className="text-sm font-normal text-gray-400">Tickets</span>
                        </div>
                        <button 
                            onClick={() => setIsAlertEnabled(!isAlertEnabled)} 
                            className={`btn btn-circle cursor-pointer p-2.5 rounded-full border border-gray-250 dark:border-zinc-700 ${isAlertEnabled ? 'bg-zinc-800 text-white dark:bg-zinc-700' : 'bg-transparent text-gray-400 dark:text-zinc-550'}`}
                            title={isAlertEnabled ? "Mute Alert Sound" : "Enable Alert Sound"}
                        >
                            {isAlertEnabled ? <IoVolumeHighOutline size={20} /> : <IoVolumeMuteOutline size={20} />}
                        </button>
                    </div>
                </div>

                {/* New order pop alert */}
                {showAlert && (
                    <div className="fixed top-20 right-10 z-50 animate-bounce">
                        <div className="flex items-center gap-2 bg-red-500 text-white px-5 py-3 rounded-xl shadow-2xl font-bold">
                            <IoRestaurant size={20} /> <span>New Order Round Received!</span>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center mt-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {orders.map(order => (
                            <OrderCard key={order._id} order={order} onUpdate={handleUpdateOrder} />
                        ))}
                        {orders.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-400 dark:text-zinc-500">
                                <FaCheckCircle size={60} className="mx-auto mb-4 opacity-20" />
                                <p className="text-xl font-bold">All Orders Cleared</p>
                                <p className="text-sm text-gray-400 mt-1">Waiting for incoming tickets...</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function KitchenDisplayPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] w-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
            <KitchenDisplayContent />
        </Suspense>
    );
}
