"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import Swal from 'sweetalert2';
import {
    FaPlus, FaMinus, FaTrash, FaSearch, FaUser, FaMobileAlt, FaUtensils,
    FaTruck, FaSave, FaPrint, FaRedo, FaGift, FaClock, FaHotel
} from "react-icons/fa";
import { FaCcVisa, FaCcAmex } from "react-icons/fa6";
import { RiMastercardFill } from "react-icons/ri";

const OrderSummary = ({
    user, canAdd, canEdit, isEditing, customDateTime, setCustomDateTime,
    customer, mobile, setMobile, handleCustomerSearch,
    orderType, handleOrderTypeChange, TableName, roomNo, setRoomNo, deliveryProvider,
    addedProducts, incrementQuantity, decrementQuantity, removeProduct,
    invoiceSummary, setInvoiceSummary, subtotal, vat, sd, payable, paid, change,
    printInvoice, handleKitchenClick, resetOrder, isProcessing, toggleComplimentaryStatus,
    selectedPaymentMethod,
    selectedSubMethod,
    discountType,
    setDiscountType,
    tables, // list of table objects
    rooms,  // list of room objects
    activeStays = [],
    TableNameState, setTableNameState,
    deliveryProviderState, setDeliveryProviderState,
    sc = 0,
    deliveryCharge = 0,
    custSearchResults = [],
    setCustSearchResults,
    custSearchLoading = false,
    setIsCustomerModalOpen,
    setCustomer
}) => {
    const [activeTab, setActiveTab] = useState('invoiceDetails');
    const [searchType, setSearchType] = useState('mobile'); // 'mobile' or 'room'

    const cardOptions = [
        { name: "Visa Card", icon: <FaCcVisa /> },
        { name: "Master Card", icon: <RiMastercardFill /> },
        { name: "Amex Card", icon: <FaCcAmex /> },
    ];
    const mobileOptions = [
        { name: "Bkash", icon: "BkashLogo" },
        { name: "Nagad", icon: "NagadLogo" },
        { name: "Rocket", icon: "RocketLogo" },
    ];

    const validateOrder = () => {
        if (!orderType) {
            Swal.fire({ icon: 'error', title: 'No Order Type Selected', text: 'Please select an order type for this transaction.' });
            return false;
        }
        if (addedProducts.length === 0) {
            Swal.fire({ icon: 'error', title: 'No Products Added', text: 'Please add at least one product to the invoice.' });
            return false;
        }
        if (orderType?.toLowerCase() === 'dine-in' && !TableName) {
            Swal.fire({ icon: 'error', title: 'No Table Selected', text: 'Please select a table for this dine-in order.' });
            return false;
        }
        if (orderType?.toLowerCase() === 'room service' && !roomNo) {
            Swal.fire({ icon: 'error', title: 'No Room Selected', text: 'Please select a room for room service.' });
            return false;
        }
        if (orderType?.toLowerCase() === 'delivery' && !deliveryProvider) {
            Swal.fire({ icon: 'error', title: 'No Delivery Provider', text: 'Please select a delivery provider for this order.' });
            return false;
        }
        if (selectedPaymentMethod === 'Card' && !cardOptions.some(o => o.name === selectedSubMethod)) {
            Swal.fire({ icon: 'error', title: 'Card Type Not Selected', text: 'Please select a specific card type.' });
            return false;
        }
        if (selectedPaymentMethod === 'Mobile' && !mobileOptions.some(o => o.name === selectedSubMethod)) {
            Swal.fire({ icon: 'error', title: 'Mobile Payment Not Selected', text: 'Please select a specific mobile payment option.' });
            return false;
        }
        return true;
    };

    const handleFinalizeOrder = (actionCallback, withPrint) => {
        const hasPermission = isEditing ? canEdit : canAdd;
        if (!hasPermission) {
            Swal.fire({
                icon: "error",
                title: "Restricted Action",
                text: `You do not have permission to ${isEditing ? "edit" : "create"} restaurant orders.`,
                confirmButtonColor: "#8C5A35"
            });
            return;
        }
        if (!validateOrder()) {
            return;
        }
        actionCallback(withPrint);
    };

    return (
        <div className="w-full lg:w-2/6 p-1 md:p-2 font-inter text-gray-800 dark:text-zinc-100">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-3 md:p-6 mb-6 border border-gray-150 dark:border-zinc-800">
                <div className="flex border-b border-brand-beige dark:border-zinc-800 mb-4">
                    <button
                        className={`flex-1 py-3 text-center text-sm md:text-base font-semibold rounded-tl-xl rounded-tr-xl transition-colors duration-300 cursor-pointer
                            ${activeTab === 'invoiceDetails' ? 'bg-brand-primary text-white shadow-md' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'}`}
                        onClick={() => setActiveTab('invoiceDetails')}
                    >
                        Invoice Details
                    </button>
                    <button
                        className={`flex-1 py-3 text-center text-sm md:text-base font-semibold rounded-tl-xl rounded-tr-xl transition-colors duration-300 cursor-pointer
                            ${activeTab === 'customerInfo' ? 'bg-brand-primary text-white shadow-md' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'}`}
                        onClick={() => setActiveTab('customerInfo')}
                    >
                        Other Info
                    </button>
                </div>

                {activeTab === 'invoiceDetails' && (
                    <div>
                        <div className="flex flex-col justify-between mb-4 pb-2 border-b border-gray-200 dark:border-zinc-850">
                            <h2 className="text-xl font-extrabold text-gray-900 dark:text-zinc-100">Invoice Summary</h2>
                        </div>

                        {/* Product List Section */}
                        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2 mb-4">
                            <AnimatePresence>
                                {addedProducts.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-center py-10 px-4"
                                    >
                                        <p className="text-gray-500 italic">Your order is empty.</p>
                                        <p className="text-gray-400 text-sm mt-1">Add products to get started!</p>
                                    </motion.div>
                                ) : (
                                    addedProducts.map((product) => (
                                        <motion.div
                                            key={product._id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, x: -50 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                            className="flex items-center p-3 rounded-xl bg-gray-50 dark:bg-zinc-850 shadow-sm gap-2"
                                        >
                                            <div className="flex-grow">
                                                <p className="font-bold text-gray-800 dark:text-zinc-200 text-xs md:text-sm">
                                                    {product.foodName || product.productName}
                                                </p>
                                                {product.isComplimentary && (
                                                    <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                                        FREE
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!product.isComplimentary && (
                                                    <div className="flex items-center justify-center gap-1 bg-slate-100 dark:bg-zinc-800 rounded-full p-1">
                                                        <button
                                                            onClick={() => decrementQuantity(product._id)}
                                                            className="w-6 h-6 flex items-center justify-center bg-white dark:bg-zinc-700 rounded-full text-slate-600 dark:text-zinc-350 hover:bg-slate-200 transition-colors cursor-pointer"
                                                        >
                                                            <FaMinus className="text-[10px]" />
                                                        </button>
                                                        <span className="font-extrabold text-xs text-gray-900 dark:text-zinc-100 w-4 text-center">{product.quantity}</span>
                                                        <button
                                                            onClick={() => incrementQuantity(product._id)}
                                                            className="w-6 h-6 flex items-center justify-center bg-white dark:bg-zinc-700 rounded-full text-slate-600 dark:text-zinc-350 hover:bg-slate-200 transition-colors cursor-pointer"
                                                        >
                                                            <FaPlus className="text-[10px]" />
                                                        </button>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => removeProduct(product._id)}
                                                    className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 cursor-pointer"
                                                    title="Remove Product"
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Order Type & Conditional Destination (Inline on Main Tab) */}
                        <div className="mb-4 grid grid-cols-2 gap-2 text-xs font-semibold">
                            <div>
                                <label className="block text-gray-500 mb-1">Order Type</label>
                                <select
                                    value={orderType || ''}
                                    onChange={(e) => handleOrderTypeChange(e.target.value)}
                                    className="select select-bordered select-sm w-full dark:bg-zinc-800 dark:border-zinc-700 bg-white"
                                >
                                    <option value="dine-in">Dine In</option>
                                    <option value="takeaway">Takeaway</option>
                                    <option value="delivery">Delivery</option>
                                    <option value="room service">Room Service</option>
                                </select>
                            </div>

                            {/* Dine-in Table Selection */}
                            {orderType?.toLowerCase() === 'dine-in' && (
                                <div>
                                    <label className="block text-gray-500 mb-1">Dine-in Table</label>
                                    <select
                                        value={TableName || ''}
                                        onChange={(e) => setTableNameState(e.target.value)}
                                        className="select select-bordered select-sm w-full dark:bg-zinc-800 dark:border-zinc-700 bg-white"
                                    >
                                        <option value="">Select Table</option>
                                        {tables.map(t => (
                                            <option key={t._id} value={t.tableName}>{t.tableName}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Room Service Room Selection */}
                            {orderType?.toLowerCase() === 'room service' && (
                                <div>
                                    <label className="block text-gray-500 mb-1">Guest Room</label>
                                    <select
                                        value={roomNo || ''}
                                        onChange={(e) => {
                                            const selectedRoom = e.target.value;
                                            setRoomNo(selectedRoom);

                                            // Automatically select the active guest staying in this room
                                            if (selectedRoom) {
                                                const associatedStay = activeStays.find(s => s.rooms?.some(sr => sr.room?.roomNumber === selectedRoom));
                                                if (associatedStay && associatedStay.customer) {
                                                    setCustomer(associatedStay.customer);
                                                    setMobile(associatedStay.customer.phone || '');
                                                    Swal.fire({
                                                        title: 'Guest Selected',
                                                        text: `Guest auto-selected: ${associatedStay.customer.fullName || associatedStay.customer.name}`,
                                                        icon: 'success',
                                                        timer: 1500,
                                                        showConfirmButton: false
                                                    });
                                                }
                                            }
                                        }}
                                        className="select select-bordered select-sm w-full dark:bg-zinc-800 dark:border-zinc-700 bg-white"
                                    >
                                        <option value="">Select Room</option>
                                        {rooms
                                            .filter(r => activeStays.some(s => s.rooms?.some(sr => sr.room?.roomNumber === r.roomNumber)))
                                            .map(r => {
                                                const occupiedStay = activeStays.find(s => s.rooms?.some(sr => sr.room?.roomNumber === r.roomNumber));
                                                const guestName = occupiedStay?.customer?.fullName || occupiedStay?.customer?.name || "Guest";
                                                const label = `Room ${r.roomNumber} - ${guestName}`;
                                                return (
                                                    <option key={r._id} value={r.roomNumber}>{label}</option>
                                                );
                                            })}
                                    </select>
                                </div>
                            )}

                            {/* Delivery Provider */}
                            {orderType?.toLowerCase() === 'delivery' && (
                                <div>
                                    <label className="block text-gray-500 mb-1">Provider</label>
                                    <select
                                        value={deliveryProvider || ''}
                                        onChange={(e) => setDeliveryProviderState(e.target.value)}
                                        className="select select-bordered select-sm w-full dark:bg-zinc-800 dark:border-zinc-700 bg-white"
                                    >
                                        <option value="">Select Provider</option>
                                        <option value="Foodpanda">Foodpanda</option>
                                        <option value="Foodi">Foodi</option>
                                        <option value="Pathao">Pathao</option>
                                        <option value="Self Delivery">Self Delivery</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Charges breakdown */}
                        <div className="p-3 bg-gray-50 dark:bg-zinc-850 rounded-xl space-y-2 mb-4 text-xs font-semibold">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>TK {subtotal.toFixed(0)}</span>
                            </div>
                            {sc > 0 && (
                                <div className="flex justify-between">
                                    <span>SC (Service Charge):</span>
                                    <span>TK {sc.toFixed(0)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>VAT:</span>
                                <span>TK {vat.toFixed(0)}</span>
                            </div>
                            {sd > 0 && (
                                <div className="flex justify-between">
                                    <span>SD:</span>
                                    <span>TK {sd.toFixed(0)}</span>
                                </div>
                            )}
                            {deliveryCharge > 0 && (
                                <div className="flex justify-between text-brand-primary dark:text-brand-sage font-bold">
                                    <span>Delivery Charge:</span>
                                    <span>TK {deliveryCharge.toFixed(0)}</span>
                                </div>
                            )}

                            {/* Discount selector & input */}
                            <div className="border-t border-gray-200 dark:border-zinc-800 pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span>Discount ({discountType}):</span>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value)}
                                            className="select select-bordered select-xs dark:bg-zinc-800 dark:border-zinc-700 text-xs"
                                        >
                                            <option value="Percent">Percent %</option>
                                            <option value="Fixed">Fixed ৳</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={invoiceSummary.discount}
                                            onChange={(e) => setInvoiceSummary({ ...invoiceSummary, discount: parseFloat(e.target.value) || 0 })}
                                            className="w-16 px-1.5 py-0.5 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-right text-xs rounded-md"
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between text-sm font-bold border-t border-gray-250 dark:border-zinc-800 pt-2 text-brand-primary dark:text-brand-sage">
                                <span>Payable:</span>
                                <span>TK {payable.toFixed(0)}</span>
                            </div>

                            <div className="border-t border-gray-200 dark:border-zinc-800 pt-2">
                                <div className="flex items-center justify-between">
                                    <span>Paid Amount:</span>
                                    <input
                                        type="number"
                                        value={invoiceSummary.paid || ""}
                                        onChange={(e) => setInvoiceSummary({ ...invoiceSummary, paid: parseFloat(e.target.value) || 0 })}
                                        className="w-24 px-1.5 py-0.5 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-right text-xs rounded-md"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-green-600 dark:text-green-400">
                                <span>Change Return:</span>
                                <span>TK {change.toFixed(0)}</span>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            {/* <button
                                onClick={() => handleFinalizeOrder((p) => printInvoice(p), false)}
                                className="bg-[#346E36] hover:bg-[#346E36]/90 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <><FaSave /> Save Due</>
                                )}
                            </button> */}
                            <button
                                onClick={() => handleFinalizeOrder((p) => printInvoice(p), true)}
                                className="col-span-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <><FaPrint /> Pay & Print</>
                                )}
                            </button>
                            <button
                                onClick={() => handleFinalizeOrder(handleKitchenClick)}
                                className="col-span-2 bg-[#1e293b] hover:bg-[#1e293b]/90 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                                        Processing KOT...
                                    </>
                                ) : (
                                    <><FaUtensils /> Send to Kitchen (KOT)</>
                                )}
                            </button>
                            <button
                                onClick={resetOrder}
                                className="col-span-2 bg-gray-150 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                            >
                                <FaRedo /> Reset Order
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'customerInfo' && (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-lg font-bold">Additional Settings</h2>

                        {/* Search Type Toggle */}
                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg text-xs">
                            <button
                                type="button"
                                onClick={() => { setSearchType('room'); setMobile(''); setCustSearchResults([]); }}
                                className={`flex-1 py-1.5 text-center font-bold rounded-md transition-all cursor-pointer ${searchType === 'room' ? 'bg-white dark:bg-zinc-700 shadow text-brand-primary' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                <span className="flex items-center justify-center gap-1"><FaHotel /> Room Stay Guest</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setSearchType('mobile'); setMobile(''); setCustSearchResults([]); }}
                                className={`flex-1 py-1.5 text-center font-bold rounded-md transition-all cursor-pointer ${searchType === 'mobile' ? 'bg-white dark:bg-zinc-700 shadow text-brand-primary' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                <span className="flex items-center justify-center gap-1"><FaMobileAlt /> Walk-in Guest</span>
                            </button>
                        </div>

                        {/* Search Input or Dropdown */}
                        {searchType === 'mobile' ? (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Search (Mobile)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={mobile}
                                            onChange={(e) => {
                                                setMobile(e.target.value);
                                                setCustSearchResults([]);
                                            }}
                                            className="input input-bordered flex-1 dark:bg-zinc-800 dark:border-zinc-700"
                                            placeholder="Search by phone/mobile"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCustomerSearch}
                                            disabled={custSearchLoading}
                                            className="btn bg-brand-primary hover:bg-brand-secondary text-white cursor-pointer"
                                        >
                                            {custSearchLoading ? "..." : <FaSearch />}
                                        </button>
                                    </div>
                                </div>

                                {custSearchResults && custSearchResults.length > 0 && (
                                    <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-800 rounded-lg max-h-60 overflow-y-auto">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Search Results</div>
                                        {custSearchResults.map((cust) => (
                                            <div key={cust._id} className="flex justify-between items-center bg-white dark:bg-zinc-900 p-2 rounded-lg border border-gray-100 dark:border-zinc-800">
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-bold text-gray-800 dark:text-zinc-200">{cust.fullName || cust.name}</span>
                                                    <span className="text-gray-400 font-mono">{cust.phoneNumber}</span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        setCustomer(cust);
                                                        setMobile(cust.fullName || cust.name || "");
                                                        setRoomNo("");
                                                        setCustSearchResults([]);
                                                    }} 
                                                    className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none px-3"
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={() => { setCustSearchResults([]); setIsCustomerModalOpen(true); }} 
                                            className="text-xs text-blue-500 font-bold hover:underline self-start mt-1"
                                        >
                                            + Add New Customer
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Select Occupied Room / Guest</label>
                                <select
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) {
                                            const selectedStay = activeStays.find(s => s._id === val);
                                            if (selectedStay && selectedStay.customer) {
                                                const roomNumbers = selectedStay.rooms?.map(sr => sr.room?.roomNumber).filter(Boolean).join(", ") || "N/A";
                                                const roomGuest = {
                                                    ...selectedStay.customer,
                                                    roomNumber: roomNumbers,
                                                    stayNo: selectedStay.stayNo
                                                };
                                                setCustomer(roomGuest);
                                                setRoomNo(roomNumbers);
                                                setMobile(`Room ${roomNumbers} - ${roomGuest.fullName || roomGuest.name}`);
                                            }
                                        } else {
                                            setCustomer(null);
                                            setRoomNo("");
                                            setMobile("");
                                        }
                                    }}
                                    className="select select-bordered w-full text-xs dark:bg-zinc-800 dark:border-zinc-700 bg-white"
                                    value={customer?.stayNo ? activeStays.find(s => s.stayNo === customer.stayNo)?._id || "" : ""}
                                >
                                    <option value="">-- Select Guest / Room --</option>
                                    {activeStays.map((stay) => {
                                        const roomNumbers = stay.rooms?.map(sr => sr.room?.roomNumber).filter(Boolean).join(", ") || "N/A";
                                        const guestName = stay.customer?.fullName || stay.customer?.name || "Guest";
                                        return (
                                            <option key={stay._id} value={stay._id}>
                                                Room {roomNumbers} - {guestName}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        {/* Display / Update Customer Name */}
                        {customer && (
                            <div className="p-3 bg-gray-50 dark:bg-zinc-850 rounded-xl text-xs space-y-1 relative">
                                <p><strong>Name:</strong> {customer.fullName || customer.name}</p>
                                <p><strong>Phone:</strong> {customer.phoneNumber || customer.mobile || customer.phone}</p>
                                <button
                                    onClick={() => {
                                        setCustomer(null);
                                        setMobile("");
                                        setRoomNo("");
                                    }}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xs"
                                >
                                    Clear
                                </button>
                            </div>
                        )}

                        {/* Custom Date-Time for past backdates (Admin only) */}
                        {user?.role?.toLowerCase() === 'admin' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Custom DateTime (Backdate)</label>
                                <input
                                    type="datetime-local"
                                    value={customDateTime}
                                    onChange={(e) => setCustomDateTime(e.target.value)}
                                    className="input input-bordered w-full dark:bg-zinc-800 dark:border-zinc-700 text-xs bg-white"
                                />
                                <span className="text-[10px] text-gray-400">Allows posting sales into past date/time logs.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderSummary;
