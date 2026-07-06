"use client";

import React, { useState, useEffect, useContext, useRef, useMemo, useCallback, Suspense } from 'react';
import { AuthContext } from '@/providers/AuthProvider';
import useAxiosSecure from '@/hooks/useAxiosSecure';
import usePagePermission from '@/hooks/usePagePermission';
import { 
    IoRestaurant, IoTimeOutline, IoVolumeMuteOutline, 
    IoVolumeHighOutline, IoBeerOutline 
} from "react-icons/io5";
import { 
    MdDeliveryDining, MdOutlineFoodBank, MdSoupKitchen, MdFastfood, MdHistory 
} from "react-icons/md";
import { BsHandbagFill } from "react-icons/bs";
import { FaCheckCircle, FaUtensils, FaFire, FaClock, FaHotel } from "react-icons/fa";

// Kitchen preparation routing helper
export const getProductKitchen = (p) => {
    if (p.cookOn) return p.cookOn;
    const name = (p.productName || p.itemName || "").toLowerCase();
    if (name.includes("juice") || name.includes("lassi") || name.includes("shake") || name.includes("lemonade")) {
        return "JUICE BAR";
    }
    return "MAIN KITCHEN";
};

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
const ProductBatchRow = ({ batch, isDrink, onStatusChange, isUpdating }) => {
    const getStatusStyle = (status) => {
        switch (status?.toUpperCase()) {
            case 'PENDING': 
                return 'bg-yellow-500/10 dark:bg-yellow-950/20 border-yellow-500/20 text-yellow-600 dark:text-yellow-400';
            case 'COOKING': 
                return 'bg-orange-500/10 dark:bg-orange-950/20 border-orange-500/20 text-orange-600 dark:text-orange-405';
            case 'SERVED': 
                return 'bg-brand-beige/5 dark:bg-brand-charcoal/20 border-brand-beige/10 text-brand-sage/55 opacity-60';
            default: 
                return 'bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border-brand-beige/10';
        }
    };

    return (
        <div className={`flex items-center justify-between p-2 mb-1.5 rounded-md border ${getStatusStyle(batch.cookStatus)}`}>
            <div className="flex items-center gap-3">
                <div className={`text-xs font-black px-2 py-1 rounded border ${isDrink ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' : 'bg-brand-primary/10 text-brand-primary dark:text-brand-sage border-brand-primary/20'}`}>
                    +{batch.qty}
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-brand-sage flex items-center gap-1">
                        <MdHistory /> {batch.updateTime ? new Date(batch.updateTime).toLocaleTimeString() : ""}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider">
                        {batch.cookStatus || 'PENDING'}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1">
                {batch.cookStatus?.toUpperCase() === 'PENDING' && (
                    <button 
                        onClick={() => !isUpdating && onStatusChange(batch._id, 'COOKING')}
                        disabled={isUpdating}
                        className="btn btn-xs bg-yellow-500 hover:bg-yellow-600 border-none text-yellow-950 cursor-pointer px-2 py-1 flex items-center gap-1 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUpdating ? (
                            <span className="animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full"></span>
                        ) : (
                            <><FaFire size={10} /> Cook</>
                        )}
                    </button>
                )}
                {batch.cookStatus?.toUpperCase() === 'COOKING' && (
                    <button 
                        onClick={() => !isUpdating && onStatusChange(batch._id, 'SERVED')}
                        disabled={isUpdating}
                        className="btn btn-xs bg-brand-primary hover:bg-brand-secondary border-none text-white cursor-pointer px-2 py-1 flex items-center gap-1 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUpdating ? (
                            <span className="animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full"></span>
                        ) : (
                            <><FaUtensils size={10} /> Serve</>
                        )}
                    </button>
                )}
                {batch.cookStatus?.toUpperCase() === 'SERVED' && (
                    <FaCheckCircle className="text-brand-primary" />
                )}
            </div>
        </div>
    );
};

// Parent Product container
const ProductItem = ({ product, onUpdateHistory, isUpdating }) => {
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
        <li className="flex flex-col w-full py-3 border-b border-brand-beige/20 dark:border-brand-beige/10 last:border-none">
            <div className="flex items-center gap-3 mb-2 px-2">
                <div className={`p-2 rounded-lg ${isDrink ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-brand-primary/10 text-brand-primary dark:text-brand-sage'}`}>
                    {isDrink ? <IoBeerOutline size={20} /> : <MdFastfood size={20} />}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-brand-charcoal dark:text-brand-offwhite">Total: {product.qty}x</span>
                        <span className="font-bold text-sm text-brand-charcoal dark:text-brand-offwhite">{product.productName}</span>
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
                        isUpdating={isUpdating}
                    />
                ))}
            </div>
        </li>
    );
};

// Order Card Component
const OrderCard = ({ order, selectedKitchen, onUpdate, isUpdating }) => {
    const timeAgo = useTimeAgo(order.dateTime || order.createdAt);

    const getOrderTypeDetails = (type) => {
        switch (type?.toLowerCase()) {
            case 'dine-in': 
                return { className: 'bg-brand-primary text-white', icon: <IoRestaurant size={22} /> };
            case 'delivery': 
                return { className: 'bg-emerald-700 text-white', icon: <MdDeliveryDining size={22} /> };
            case 'takeaway': 
                return { className: 'bg-amber-600 text-white', icon: <BsHandbagFill size={18} /> };
            case 'room service': 
                return { className: 'bg-indigo-700 text-white', icon: <FaHotel size={18} /> };
            default: 
                return { className: 'bg-brand-primary text-white', icon: <MdSoupKitchen size={22} /> };
        }
    };

    const displayedProducts = useMemo(() => {
        if (!selectedKitchen || selectedKitchen === "All") return order.products || [];
        return order.products?.filter(p => getProductKitchen(p) === selectedKitchen) || [];
    }, [order.products, selectedKitchen]);

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
            if (selectedKitchen !== "All" && getProductKitchen(p) !== selectedKitchen) {
                return p;
            }
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

    const hasPending = displayedProducts?.some(p => {
        if (p.history?.length > 0) return p.history.some(h => h.cookStatus === 'PENDING');
        return p.cookStatus === 'PENDING';
    });

    return (
        <div className="card bg-white dark:bg-brand-charcoal/50 shadow-xl border border-brand-beige dark:border-brand-beige/25 flex flex-col h-full text-brand-charcoal dark:text-brand-offwhite rounded-2xl overflow-hidden animate-scale-in">
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
                    {displayedProducts?.map(product => (
                        <ProductItem 
                            key={product._id} 
                            product={product} 
                            onUpdateHistory={handleHistoryUpdate} 
                            isUpdating={isUpdating}
                        />
                    ))}
                </ul>
            </div>

            <div className="p-3 border-t border-brand-beige/25 dark:border-brand-beige/10 bg-brand-offwhite/50 dark:bg-brand-charcoal">
                <button 
                    className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors border-none
                        ${(hasPending && !isUpdating)
                            ? 'bg-brand-primary hover:bg-brand-secondary text-white' 
                            : 'bg-brand-beige/25 text-brand-sage/50 cursor-not-allowed shadow-none'}`}
                    onClick={(hasPending && !isUpdating) ? handleCookAllPending : undefined}
                    disabled={!hasPending || isUpdating}
                >
                    {isUpdating ? (
                        <>
                            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                            Updating...
                        </>
                    ) : (
                        <>
                            <FaFire className={hasPending ? "text-yellow-400 animate-pulse" : ""} /> 
                            {hasPending ? "Cook All New Items" : "All Items Processing"}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

// Main Kitchen Display Page
function KitchenDisplayContent() {
    const axiosSecure = useAxiosSecure();
    const { canEdit } = usePagePermission();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAlertEnabled, setIsAlertEnabled] = useState(true);
    const [showAlert, setShowAlert] = useState(false);
    
    // Outlets state
    const [kitchens, setKitchens] = useState([]);
    const [selectedKitchen, setSelectedKitchen] = useState("All");
    const [inFlightUpdates, setInFlightUpdates] = useState(new Set());

    // Filter states
    const [dateFilter, setDateFilter] = useState("all");
    const [orderTypeFilter, setOrderTypeFilter] = useState("All");

    const fetchOrders = useCallback(async () => {
        try {
            let url = `/pos/invoice?isKitchen=true`;

            // Order type filter
            if (orderTypeFilter && orderTypeFilter !== "All") {
                url += `&orderType=${encodeURIComponent(orderTypeFilter)}`;
            }

            // Date filter logic
            if (dateFilter && dateFilter !== "all") {
                const today = new Date();
                let start = null;
                let end = today;

                if (dateFilter === "today") {
                    start = today;
                    end = today;
                } else if (dateFilter === "yesterday") {
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    start = yesterday;
                    end = yesterday;
                } else if (dateFilter === "last7") {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(today.getDate() - 6);
                    start = sevenDaysAgo;
                    end = today;
                } else if (dateFilter === "last6months") {
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(today.getMonth() - 5);
                    sixMonthsAgo.setDate(1);
                    start = sixMonthsAgo;
                    end = today;
                }

                if (start && end) {
                    const formatDate = (date) => {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, "0");
                        const day = String(date.getDate()).padStart(2, "0");
                        return `${year}-${month}-${day}`;
                    };
                    url += `&startDate=${formatDate(start)}&endDate=${formatDate(end)}`;
                }
            }

            const response = await axiosSecure.get(url);
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
    }, [axiosSecure, isAlertEnabled, dateFilter, orderTypeFilter]);

    // Fetch dynamic kitchens list
    useEffect(() => {
        const fetchKitchens = async () => {
            try {
                const res = await axiosSecure.get("/kitchen");
                if (res.data) {
                    setKitchens(res.data);
                }
            } catch (err) {
                console.error("Error fetching kitchens list:", err);
            }
        };
        fetchKitchens();
    }, [axiosSecure]);

    useEffect(() => {
        Promise.resolve().then(() => {
            fetchOrders();
        });

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
        if (!canEdit) {
            toast.error("You do not have permission to modify order status.");
            fetchOrders();
            return;
        }
        if (inFlightUpdates.has(updatedOrder._id)) return;
        setInFlightUpdates(prev => {
            const next = new Set(prev);
            next.add(updatedOrder._id);
            return next;
        });

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
            fetchOrders();
        } finally {
            setInFlightUpdates(prev => {
                const next = new Set(prev);
                next.delete(updatedOrder._id);
                return next;
            });
        }
    };

    const activeTicketsCount = useMemo(() => {
        return orders.filter(order => {
            const hasItemsForKitchen = selectedKitchen === "All" || order.products?.some(p => getProductKitchen(p) === selectedKitchen);
            if (!hasItemsForKitchen) return false;

            if (selectedKitchen !== "All") {
                const kitchenProducts = order.products?.filter(p => getProductKitchen(p) === selectedKitchen) || [];
                const allKitchenProductsServed = kitchenProducts.every(p => p.cookStatus === 'SERVED');
                return !(allKitchenProductsServed && kitchenProducts.length > 0);
            } else {
                const allProductsServed = order.products?.every(p => p.cookStatus === 'SERVED');
                return !allProductsServed;
            }
        }).length;
    }, [orders, selectedKitchen]);

    return (
        <div className="bg-brand-offwhite dark:bg-brand-charcoal min-h-screen p-4 font-sans text-brand-charcoal dark:text-brand-offwhite transition-colors duration-200 animate-scale-in">
            <div className="max-w-[1920px] mx-auto">
                {/* Upper bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white dark:bg-brand-charcoal p-5 rounded-2xl shadow-md border border-brand-beige dark:border-brand-beige/25">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-sage rounded-xl">
                            <MdOutlineFoodBank size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-brand-charcoal dark:text-brand-offwhite tracking-tight uppercase">KITCHEN BOARD</h1>
                            <p className="text-brand-sage font-bold text-xs uppercase tracking-widest mt-1">Live Order Tickets Management</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
                        {/* Order Type Filter */}
                        <div className="relative w-full sm:w-40">
                            <select
                                value={orderTypeFilter}
                                onChange={(e) => setOrderTypeFilter(e.target.value)}
                                className="select select-bordered w-full bg-white dark:bg-zinc-800 dark:border-zinc-700 text-xs font-bold h-11 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer border-brand-beige/80 dark:border-brand-beige/20 shadow-sm pl-4 pr-10"
                            >
                                <option value="All">All Types</option>
                                <option value="Dine In">Dine In</option>
                                <option value="Takeaway">Takeaway</option>
                                <option value="Delivery">Delivery</option>
                                <option value="Room Service">Room Service</option>
                            </select>
                        </div>

                        {/* Date Range Filter */}
                        <div className="relative w-full sm:w-40">
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="select select-bordered w-full bg-white dark:bg-zinc-800 dark:border-zinc-700 text-xs font-bold h-11 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer border-brand-beige/80 dark:border-brand-beige/20 shadow-sm pl-4 pr-10"
                            >
                                <option value="all">All Dates</option>
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="last7">Last 7 Days</option>
                                <option value="last6months">Last 6 Months</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <div className="text-xl font-extrabold text-brand-charcoal dark:text-brand-offwhite bg-brand-offwhite dark:bg-brand-charcoal px-4 py-2 rounded-xl border border-brand-beige dark:border-brand-beige/25 shadow-inner h-11 flex items-center justify-center whitespace-nowrap min-w-[110px]">
                                {activeTicketsCount} <span className="text-xs font-normal text-brand-sage uppercase tracking-wider ml-1">Tickets</span>
                            </div>
                            <button 
                                onClick={() => setIsAlertEnabled(!isAlertEnabled)} 
                                className={`btn btn-circle cursor-pointer rounded-xl border h-11 w-11 flex items-center justify-center transition-all ${isAlertEnabled ? 'border-brand-primary bg-brand-primary text-white hover:bg-brand-secondary shadow-md' : 'bg-transparent border-brand-beige dark:border-brand-beige/25 text-brand-primary hover:bg-brand-primary/5 shadow-sm'}`}
                                title={isAlertEnabled ? "Mute Alert Sound" : "Enable Alert Sound"}
                            >
                                {isAlertEnabled ? <IoVolumeHighOutline size={20} /> : <IoVolumeMuteOutline size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Kitchen Selector tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                    <button
                        onClick={() => setSelectedKitchen("All")}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer border-none shadow
                            ${selectedKitchen === "All" 
                                ? "bg-brand-primary text-white" 
                                : "bg-white dark:bg-brand-charcoal/50 text-brand-sage hover:bg-brand-primary/10 border border-brand-beige dark:border-brand-beige/25"}`}
                    >
                        ALL OUTLETS
                    </button>
                    {kitchens.map((k) => (
                        <button
                            key={k._id}
                            onClick={() => setSelectedKitchen(k.name)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer border-none shadow uppercase
                                ${selectedKitchen === k.name 
                                    ? "bg-brand-primary text-white" 
                                    : "bg-white dark:bg-brand-charcoal/50 text-brand-sage hover:bg-brand-primary/10 border border-brand-beige dark:border-brand-beige/25"}`}
                        >
                            {k.name}
                        </button>
                    ))}
                </div>

                {/* New order pop alert */}
                {showAlert && (
                    <div className="fixed top-20 right-10 z-50 animate-bounce">
                        <div className="flex items-center gap-2 bg-brand-primary text-white px-5 py-3 rounded-xl shadow-2xl border border-brand-beige font-bold">
                            <IoRestaurant size={20} /> <span>New Order Round Received!</span>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center mt-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {orders.map(order => {
                            const hasItemsForKitchen = selectedKitchen === "All" || order.products?.some(p => getProductKitchen(p) === selectedKitchen);
                            if (!hasItemsForKitchen) return null;

                            if (selectedKitchen !== "All") {
                                const kitchenProducts = order.products?.filter(p => getProductKitchen(p) === selectedKitchen) || [];
                                const allKitchenProductsServed = kitchenProducts.every(p => p.cookStatus === 'SERVED');
                                if (allKitchenProductsServed && kitchenProducts.length > 0) return null;
                            } else {
                                const allProductsServed = order.products?.every(p => p.cookStatus === 'SERVED');
                                if (allProductsServed) return null;
                            }
                            return (
                                <OrderCard 
                                    key={order._id} 
                                    order={order} 
                                    selectedKitchen={selectedKitchen} 
                                    onUpdate={handleUpdateOrder} 
                                    isUpdating={inFlightUpdates.has(order._id)}
                                />
                            );
                        })}
                        {activeTicketsCount === 0 && (
                            <div className="col-span-full text-center py-20 text-brand-sage">
                                <FaCheckCircle size={60} className="mx-auto mb-4 opacity-25" />
                                <p className="text-xl font-black uppercase tracking-widest">All Orders Cleared</p>
                                <p className="text-sm mt-1 text-brand-sage/80 font-medium">Waiting for incoming tickets...</p>
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
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] w-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div></div>}>
            <KitchenDisplayContent />
        </Suspense>
    );
}
