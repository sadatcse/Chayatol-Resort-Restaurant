"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import useResortServices from "@/hooks/useResortServices";
import useResortServiceCategories from "@/hooks/useResortServiceCategories";
import usePaymentTypes from "@/hooks/usePaymentTypes";
import useBookings from "@/hooks/useBookings";
import { MdAdd, MdRemove, MdPrint, MdOutlineTableRestaurant, MdPersonOutline, MdClose } from "react-icons/md";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import CustomerModal from "@/components/CustomerModal";
import { useSearchParams } from "next/navigation";

export default function ResortPOSPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");

  const axiosSecure = useAxiosSecure();
  const { services, isLoading: servicesLoading } = useResortServices(1, 1000);
  const { categories, isLoading: categoriesLoading } = useResortServiceCategories(1, 100);
  const { paymentTypes } = usePaymentTypes(1, 100);

  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [associatedBookingId, setAssociatedBookingId] = useState(null);
  const [associatedFoodInvoiceIds, setAssociatedFoodInvoiceIds] = useState([]);

  const [posMode, setPosMode] = useState("Booked Room"); // "Booked Room", "Service", "Food"
  const { bookings, isLoading: bookingsLoading } = useBookings(1, 100);

  // Tax & Discount States
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("PERCENT");

  const [chargeSettings, setChargeSettings] = useState(null);

  // POS States
  const [roomNo, setRoomNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  useEffect(() => {
    if (paymentTypes?.length > 0 && !selectedPaymentMethod) {
      const hasCash = paymentTypes.find(pt => pt.name?.toLowerCase() === "cash");
      setSelectedPaymentMethod(hasCash ? hasCash.name : paymentTypes[0].name);
    }
  }, [paymentTypes, selectedPaymentMethod]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [activeTab, setActiveTab] = useState("Order Details"); // "Order Details" or "Guest Info"

  // Data fetching for rooms
  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch rooms & settings
    const fetchData = async () => {
      try {
        const [roomsRes, settingsRes] = await Promise.all([
          axiosSecure.get("/room").catch(() => ({ data: [] })),
          axiosSecure.get("/settings/charges").catch(() => ({ data: null }))
        ]);
        if (roomsRes.data) setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : (roomsRes.data.data || []));
        if (settingsRes.data) setChargeSettings(settingsRes.data);

        // If editing an existing invoice, fetch its data
        if (invoiceId) {
          try {
            const invRes = await axiosSecure.get(`/resort-invoice/get/${invoiceId}`);
            if (invRes.data?.invoice) {
              const inv = invRes.data.invoice;
              setRoomNo(inv.roomNo || "");
              setCustomerName(inv.customer?.name || "");
              setCustomerPhone(inv.customer?.phone || "");
              setSelectedPaymentMethod(inv.paymentMethod || "");
              
              if (inv.items && inv.items.length > 0) {
                setCart(inv.items.map((item, idx) => ({
                  serviceId: `edit_item_${idx}`,
                  type: "custom",
                  itemName: item.itemName,
                  category: "Edited",
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  discountValue: 0,
                  discountType: "PERCENT",
                  vatRate: 0,
                  scRate: 0,
                  sdRate: 0
                })));
              }
              setDiscountValue(inv.discount || 0);
              setDiscountType("FLAT"); // Stored discounts are usually flat amounts in the final invoice
            }
          } catch (err) {
            console.error("Failed to fetch editing invoice", err);
          }
        }
      } catch (e) {
        console.error("Failed to fetch auxiliary data", e);
      }
    };
    fetchData();
  }, [axiosSecure]);

  // Tax & Discount States - Removed Duplicate
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");

  useEffect(() => {
    const fetchRoomDetails = async () => {
      // If we are editing an existing invoice, don't auto-fetch and overwrite the cart from the room details
      // unless the user intentionally selects a DIFFERENT room.
      if (!roomNo) {
        setCart(prev => prev.filter(item => item.type === "service"));
        setAssociatedBookingId(null);
        setAssociatedFoodInvoiceIds([]);
        setCustomerName("");
        setCustomerPhone("");
        setCheckInDate("");
        setCheckOutDate("");
        return;
      }

      // Skip fetching if we are initially loading an invoice for editing and haven't explicitly triggered a new room load
      // We know it's the initial load if the URL has invoiceId and we just set roomNo from it. 
      // To simplify, if invoiceId is present, we just don't auto-fetch room details to avoid overwriting the manual items.
      if (invoiceId) return;

      setLoading(true);
      try {
        const { data } = await axiosSecure.get(`/resort-pos/room-details?roomNo=${roomNo}`);
        if (data.success) {
          // Clear existing room/food items
          setCart(prev => prev.filter(item => item.type === "service"));
          setAssociatedBookingId(null);
          setAssociatedFoodInvoiceIds([]);
          
          let newItems = [];
          
          if (data.booking) {
            setAssociatedBookingId(data.booking._id);
            if (data.booking.customer) {
               setCustomerName(data.booking.customer.fullName || "");
               setCustomerPhone(data.booking.customer.phoneNumber || "");
            }
            if (data.booking.checkInDate) {
               setCheckInDate(new Date(data.booking.checkInDate).toISOString().split('T')[0]);
            }
            if (data.booking.checkOutDate) {
               setCheckOutDate(new Date(data.booking.checkOutDate).toISOString().split('T')[0]);
            }

            // Calculate advance or paid amount
            newItems.push({
              serviceId: `booking_${data.booking._id}`,
              type: "room_rent",
              itemName: `Room Rent (${roomNo})`,
              category: "Room",
              quantity: 1,
              unitPrice: data.booking.totalAmount,
              totalPrice: data.booking.totalAmount,
              discountValue: 0,
              discountType: "PERCENT",
              vatRate: 0, 
              scRate: 0,
              sdRate: 0
            });
          }

          if (data.foodInvoices && data.foodInvoices.length > 0) {
            const invoiceIds = [];
            data.foodInvoices.forEach((inv) => {
               invoiceIds.push(inv._id);
               newItems.push({
                  serviceId: `food_${inv._id}`,
                  type: "food_order",
                  itemName: `Room Service Food (Inv: ${inv.invoiceNo})`,
                  category: "Food",
                  quantity: 1,
                  unitPrice: inv.grandTotal, 
                  totalPrice: inv.grandTotal,
                  discountValue: 0,
                  discountType: "PERCENT",
                  vatRate: 0,
                  scRate: 0,
                  sdRate: 0
               });
            });
            setAssociatedFoodInvoiceIds(invoiceIds);
          }

          setCart(prev => [...prev, ...newItems]);
        }
      } catch (e) {
        console.error("Failed to fetch room details", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoomDetails();
  }, [roomNo, axiosSecure]);


  const handleCheckCustomer = async () => {
    if (!customerPhone || customerPhone.length < 3) return;
    setCustomerSearchLoading(true);
    setSearchResults([]);
    setSelectedCustomer(null);
    try {
      const res = await axiosSecure.get(`/customer/paginated?search=${encodeURIComponent(customerPhone)}&limit=5`);
      if (res.data.customers && res.data.customers.length > 0) {
        setSearchResults(res.data.customers);
      } else {
        setIsCustomerModalOpen(true);
      }
    } catch (e) {
      console.error("Check customer error", e);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  const selectCustomer = (cust) => {
    setCustomerName(cust.fullName);
    setCustomerPhone(cust.phoneNumber);
    setSelectedCustomer(cust);
    setSearchResults([]);
  };

  const filteredServices = useMemo(() => {
    if (activeCategory === "All") return services;
    return services.filter(s => s.category === activeCategory);
  }, [services, activeCategory]);

  const addToCart = (service) => {
    setCart((prev) => {
      const existing = prev.find(item => item.serviceId === service._id);
      if (existing) {
        return prev.map(item =>
          item.serviceId === service._id
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      return [...prev, {
        serviceId: service._id,
        itemName: service.serviceName,
        category: service.category || "Service",
        quantity: 1,
        unitPrice: service.price,
        totalPrice: service.price,
        discountValue: 0,
        discountType: "PERCENT",
        vatRate: Number(service.vat) || 0,
        scRate: Number(service.sc) || 0,
        sdRate: Number(service.sd) || 0
      }];
    });
  };

  const updateQuantity = (serviceId, delta) => {
    setCart((prev) => {
      return prev.map(item => {
        if (item.serviceId === serviceId) {
          const newQ = item.quantity + delta;
          if (newQ < 1) return item;
          return { ...item, quantity: newQ, totalPrice: newQ * item.unitPrice };
        }
        return item;
      });
    });
  };

  const removeFromCart = (serviceId) => {
    setCart(prev => prev.filter(item => item.serviceId !== serviceId));
  };

  const updateItemDiscount = (serviceId, value, type) => {
    setCart((prev) => {
      return prev.map(item => {
        if (item.serviceId === serviceId) {
          return { ...item, discountValue: value, discountType: type };
        }
        return item;
      });
    });
  };

  // Calculations
  const subTotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);

  const itemDiscounts = cart.reduce((acc, item) => {
    if (!item.discountValue) return acc;
    const itemDiscountAmt = item.discountType === "PERCENT"
      ? (item.totalPrice * item.discountValue) / 100
      : (item.discountValue * item.quantity);
    return acc + itemDiscountAmt;
  }, 0);

  const orderDiscount = discountType === "PERCENT" ? ((subTotal - itemDiscounts) * discountValue) / 100 : discountValue;
  const discount = itemDiscounts + orderDiscount;

  const subTotalAfterDiscount = subTotal - discount;
  const discountFactor = subTotal > 0 ? subTotalAfterDiscount / subTotal : 1;

  let dynamicVat = 0;
  let dynamicSd = 0;
  let dynamicSc = 0;

  const isVatEnabled = chargeSettings?.vat?.enabled;
  const isSdEnabled = chargeSettings?.sd?.enabled;
  const isScEnabled = chargeSettings?.sc?.enabled;

  cart.forEach(item => {
    const itemDiscountAmt = item.discountType === "PERCENT"
      ? (item.totalPrice * item.discountValue) / 100
      : (item.discountValue * item.quantity);

    const netItemPrice = item.totalPrice - itemDiscountAmt;
    const finalItemPrice = netItemPrice * discountFactor;

    const effectiveVatRate = isVatEnabled ? (item.vatRate || 0) : 0;
    const effectiveSdRate = isSdEnabled ? (item.sdRate || 0) : 0;
    const effectiveScRate = isScEnabled ? (item.scRate || 0) : 0;

    dynamicVat += finalItemPrice * (effectiveVatRate / 100);
    dynamicSd += finalItemPrice * (effectiveSdRate / 100);
    dynamicSc += finalItemPrice * (effectiveScRate / 100);
  });

  const vat = dynamicVat;
  const sdAmt = dynamicSd;
  const serviceChargeAmt = dynamicSc;

  const appliedVatRate = isVatEnabled ? cart.find(i => i.vatRate > 0)?.vatRate || 0 : 0;
  const appliedSdRate = isSdEnabled ? cart.find(i => i.sdRate > 0)?.sdRate || 0 : 0;
  const appliedScRate = isScEnabled ? cart.find(i => i.scRate > 0)?.scRate || 0 : 0;

  const displayGrandTotal = subTotalAfterDiscount + vat + sdAmt + serviceChargeAmt;

  const handleSubmitOrder = async (status = "Unpaid") => {
    if (cart.length === 0) {
      Swal.fire("Error", "Cart is empty", "error");
      return;
    }
    const finalCustomerName = customerName.trim() || "Walk-in Guest";

    setLoading(true);

    const payload = {
      customer: {
        name: finalCustomerName,
        phone: customerPhone
      },
      roomNo: roomNo || null,
      items: cart.map(c => ({
        itemName: c.itemName,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        totalPrice: c.totalPrice
      })),
      subTotal: subTotal,
      discount: discount,
      vat: vat,
      sd: sdAmt,
      serviceCharge: serviceChargeAmt,
      grandTotal: displayGrandTotal,
      paymentMethod: status === "Paid" ? (selectedPaymentMethod || "Cash") : "Due",
      paymentStatus: status,
    };

    try {
      if (invoiceId) {
        const { data } = await axiosSecure.put(`/resort-invoice/update/${invoiceId}`, payload);
        if (data.success) {
          setCart([]);
          Swal.fire({
            title: "Success",
            text: `Resort Invoice updated successfully.`,
            icon: "success",
            showCancelButton: true,
            confirmButtonText: "Go to Invoices",
            cancelButtonText: "Close"
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/dashboard/resort-invoices";
            }
          });
        }
      } else {
        const { data } = await axiosSecure.post("/resort-invoice/post", payload);
        if (data.success) {
          setCart([]);
          Swal.fire({
            title: "Success",
            text: `Resort Invoice ${status === "Paid" ? "Paid" : "Placed"} successfully.`,
            icon: "success",
            showCancelButton: true,
            confirmButtonText: "Go to Invoices",
            cancelButtonText: "Close"
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/dashboard/resort-invoices";
            }
          });
        }
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to submit resort invoice", "error");
    } finally {
      setLoading(false);
    }
  };

  if (servicesLoading || categoriesLoading) {
    return <div className="flex h-full items-center justify-center"><span className="loading loading-spinner text-brand-primary loading-lg"></span></div>;
  }

  return (
    <div className="h-[calc(100vh-100px)] flex gap-4">
      {/* MIDDLE: Main Content Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="bg-white dark:bg-brand-charcoal rounded-xl shadow-sm p-3 flex flex-wrap gap-2 border border-gray-100 dark:border-gray-800 shrink-0">
           <button 
             onClick={() => setPosMode("Booked Room")}
             className={`shrink-0 px-6 py-2 rounded-lg font-bold border-2 transition-all ${posMode === "Booked Room" ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-gray-200 text-gray-600 hover:border-brand-primary/50 dark:border-gray-700 dark:text-gray-300"}`}
           >
             Booked Room
           </button>
           <button 
             onClick={() => setPosMode("Service")}
             className={`shrink-0 px-6 py-2 rounded-lg font-bold border-2 transition-all ${posMode === "Service" ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-gray-200 text-gray-600 hover:border-brand-primary/50 dark:border-gray-700 dark:text-gray-300"}`}
           >
             Service
           </button>
           <button 
             onClick={() => setPosMode("Food")}
             className={`shrink-0 px-6 py-2 rounded-lg font-bold border-2 transition-all ${posMode === "Food" ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-gray-200 text-gray-600 hover:border-brand-primary/50 dark:border-gray-700 dark:text-gray-300"}`}
           >
             Food
           </button>
        </div>

        <div className="flex-1 bg-white dark:bg-brand-charcoal rounded-xl shadow-sm p-4 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-800">
           {posMode === "Booked Room" && (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
               {bookingsLoading ? (
                 <div className="col-span-full py-10 text-center text-brand-primary"><span className="loading loading-spinner"></span> Loading bookings...</div>
               ) : bookings.length === 0 ? (
                 <div className="col-span-full py-10 text-center text-gray-400 font-medium">No active bookings found.</div>
               ) : (
                 bookings.map(booking => (
                   <div 
                     key={booking._id} 
                     onClick={() => setRoomNo(booking.room?.roomNumber)}
                     className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${roomNo === booking.room?.roomNumber ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-200 hover:border-brand-primary/50 bg-white dark:bg-gray-800 dark:border-gray-700'}`}
                   >
                     <div className="flex justify-between items-start mb-2">
                       <h3 className={`font-bold text-lg ${roomNo === booking.room?.roomNumber ? 'text-brand-primary' : 'text-gray-800 dark:text-gray-100'}`}>
                         Room {booking.room?.roomNumber || "N/A"}
                       </h3>
                       <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${booking.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                         {booking.paymentStatus}
                       </span>
                     </div>
                     <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                       Guest: <span className="font-bold text-gray-800 dark:text-gray-200">{booking.customer?.fullName || booking.customer?.name || "Unknown"}</span>
                     </div>
                     <div className="flex justify-between items-end mt-auto">
                       <div className="text-xs text-gray-500 font-medium">
                         Check-in: {new Date(booking.checkInDate).toLocaleDateString()}
                       </div>
                       <div className="font-black text-brand-primary text-lg">
                         TK {booking.totalAmount}
                       </div>
                     </div>
                   </div>
                 ))
               )}
             </div>
           )}

           {posMode === "Service" && (
             <div className="flex items-center justify-center h-full">
               <p className="text-gray-400 font-medium">Services grid goes here...</p>
             </div>
           )}

           {posMode === "Food" && (
             <div className="flex items-center justify-center h-full">
               <p className="text-gray-400 font-medium">Food grid goes here...</p>
             </div>
           )}
        </div>
      </div>

      {/* RIGHT: Advanced Order Panel */}
      <div className="w-[340px] lg:w-[380px] xl:w-[420px] bg-white dark:bg-brand-charcoal rounded-xl shadow-lg flex flex-col border border-gray-100 dark:border-gray-800 shrink-0">

        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={() => setActiveTab("Order Details")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === "Order Details" ? "bg-white text-brand-primary border-b-2 border-brand-primary dark:bg-brand-charcoal" : "bg-gray-50 text-gray-500 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}
          >
            Invoice Details
          </button>
          <button
            onClick={() => setActiveTab("Guest Info")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === "Guest Info" ? "bg-white text-brand-primary border-b-2 border-brand-primary dark:bg-brand-charcoal" : "bg-gray-50 text-gray-500 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}
          >
            Guest Info
          </button>
        </div>

        {activeTab === "Order Details" ? (
          <div className="p-4 flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="grid grid-cols-1 gap-3 shrink-0">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block dark:text-gray-400">Bill to Room</label>
                <select value={roomNo} onChange={(e) => setRoomNo(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 text-sm font-medium dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-brand-primary">
                  <option value="">Select Room (Optional)</option>
                  {rooms.map(r => <option key={r._id} value={r.roomNumber}>{r.roomNumber}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Services</span>
              <button onClick={() => setCart([])} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">Clear All</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-3">
                  <MdOutlineTableRestaurant className="text-6xl" />
                  <p className="font-medium">No items selected</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.itemName}</span>
                        <button onClick={() => removeFromCart(item.serviceId)} className="text-gray-400 hover:text-red-500 transition-colors"><MdClose size={16} /></button>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                          <button onClick={() => updateQuantity(item.serviceId, -1)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><MdRemove size={16} /></button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.serviceId, 1)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><MdAdd size={16} /></button>
                        </div>
                        <span className="font-black text-brand-dark-grey dark:text-white">{(item.totalPrice).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] uppercase text-gray-500 font-bold">Disc:</span>
                          <select
                            className="text-xs bg-transparent border-none outline-none cursor-pointer text-brand-primary font-bold p-0 dark:text-brand-sage"
                            value={item.discountType || "PERCENT"}
                            onChange={(e) => updateItemDiscount(item.serviceId, item.discountValue, e.target.value)}
                          >
                            <option value="PERCENT">%</option>
                            <option value="FLAT">৳</option>
                          </select>
                          <input
                            type="text"
                            className="w-10 text-xs border-b border-gray-200 dark:border-gray-600 outline-none text-center bg-transparent dark:text-white"
                            value={item.discountValue || 0}
                            onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); updateItemDiscount(item.serviceId, raw === '' ? 0 : parseInt(raw, 10), item.discountType); }}
                          />
                        </div>
                        {item.discountValue > 0 && (
                          <span className="text-xs font-bold text-red-500">-{(item.discountType === 'PERCENT' ? (item.totalPrice * item.discountValue / 100) : (item.discountValue * item.quantity)).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shrink-0">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Advance</div>
              <div className="mb-3">
                <div className="flex items-center gap-4 mb-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Discount</label>
                </div>
                <div className="flex gap-2 h-10">
                  <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:border-brand-primary transition-colors">
                    <input type="text" value={discountValue} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setDiscountValue(raw === '' ? 0 : parseInt(raw, 10)); }} className="w-full h-full px-3 text-sm outline-none bg-transparent min-w-0" />
                  </div>
                  <div className="w-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:border-brand-primary transition-colors">
                    <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="w-full h-full px-2 text-xs font-bold text-gray-600 dark:text-gray-300 outline-none cursor-pointer bg-transparent">
                      <option value="PERCENT">PERCENT</option>
                      <option value="FLAT">FLAT</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span className="font-bold">TK {subTotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount</span>
                    <span className="font-bold">- TK {discount.toFixed(2)}</span>
                  </div>
                )}
                {vat > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>VAT {appliedVatRate > 0 ? `(${appliedVatRate}%)` : ''}</span>
                    <span className="font-bold">TK {vat.toFixed(2)}</span>
                  </div>
                )}
                {sdAmt > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>SD {appliedSdRate > 0 ? `(${appliedSdRate}%)` : ''}</span>
                    <span className="font-bold">TK {sdAmt.toFixed(2)}</span>
                  </div>
                )}
                {serviceChargeAmt > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>S. Charge {appliedScRate > 0 ? `(${appliedScRate}%)` : ''}</span>
                    <span className="font-bold">TK {serviceChargeAmt.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-4 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <MdPersonOutline className="text-brand-primary text-2xl" />
              <h3 className="font-bold text-gray-700 dark:text-gray-200">Customer Details</h3>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Phone Number</label>
              <div className="flex gap-2">
                <input type="text" value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); setSelectedCustomer(null); setCustomerName(""); setSearchResults([]); }} placeholder="e.g. 01700000000" className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg p-2.5 outline-none focus:border-brand-primary transition-colors" />
                <button type="button" onClick={handleCheckCustomer} disabled={customerSearchLoading} className="bg-brand-primary text-white px-4 rounded-lg font-bold disabled:opacity-50 hover:bg-brand-secondary transition-colors">
                  {customerSearchLoading ? "..." : "Search"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Customer Name</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg p-2.5 outline-none focus:border-brand-primary transition-colors" />
            </div>

            {searchResults.length > 0 && (
              <div className="flex flex-col gap-2 mt-2 animate-fade-in">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Search Results</div>
                {searchResults.map((cust) => (
                  <div key={cust._id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{cust.fullName}</span>
                      <span className="text-xs text-gray-500">{cust.phoneNumber}</span>
                    </div>
                    <button type="button" onClick={() => selectCustomer(cust)} className="btn btn-xs bg-brand-primary text-white border-none hover:bg-brand-secondary px-3">Select</button>
                  </div>
                ))}
                <button type="button" onClick={() => { setSearchResults([]); setIsCustomerModalOpen(true); }} className="text-xs text-blue-500 font-bold hover:underline self-start mt-1">
                  + Add New Customer
                </button>
              </div>
            )}

            {selectedCustomer && searchResults.length === 0 && (
              <div className="bg-brand-offwhite dark:bg-gray-800 p-3 rounded-lg border border-brand-beige dark:border-gray-700 mt-2">
                <div className="flex justify-between items-start">
                  <div className="text-xs text-brand-sage font-bold uppercase tracking-widest mb-1">Selected Customer</div>
                  <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerName(""); }} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
                <div className="font-bold text-gray-800 dark:text-white">{selectedCustomer.fullName}</div>
                <div className="text-xs text-gray-500">{selectedCustomer.phoneNumber}</div>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto shrink-0">
          {/* Payment Method Selector */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Payment Type</span>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {paymentTypes?.map(pt => (
                <button
                  key={pt._id}
                  onClick={() => setSelectedPaymentMethod(pt.name)}
                  className={`shrink-0 px-3 py-2 rounded-lg border-2 flex items-center gap-2 transition-all ${selectedPaymentMethod === pt.name ? "border-brand-primary bg-brand-primary/10" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-brand-primary/50"}`}
                >
                  {pt.image && <img src={pt.image} alt={pt.name} className="w-6 h-6 object-contain" />}
                  <span className={`text-sm font-bold ${selectedPaymentMethod === pt.name ? "text-brand-primary" : "text-gray-600 dark:text-gray-300"}`}>{pt.name}</span>
                </button>
              ))}
              {(!paymentTypes || paymentTypes.length === 0) && (
                <button
                  className="shrink-0 px-3 py-2 rounded-lg border-2 border-brand-primary bg-brand-primary/10 flex items-center gap-2"
                >
                  <span className="text-sm font-bold text-brand-primary">Cash</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-brand-primary p-3 px-4 flex justify-between items-center text-white">
            <span className="font-medium text-white/80">Total to Pay</span>
            <span className="font-black text-xl">TK {displayGrandTotal.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-charcoal rounded-b-xl overflow-hidden">
            <button
              disabled={loading || cart.length === 0}
              onClick={() => handleSubmitOrder("Paid")}
              className="py-3 px-2 font-bold text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:bg-gray-400"
            >
              <span className="text-xs uppercase tracking-wider opacity-80">Pay Now</span>
              <span className="text-sm">{displayGrandTotal.toFixed(0)}</span>
            </button>

            <button
              disabled={loading || cart.length === 0}
              onClick={() => handleSubmitOrder("Unpaid")}
              className="py-3 px-2 font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
            >
              <span className="text-xs uppercase tracking-wider">Save Bill</span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">Due Payment</span>
            </button>
          </div>
        </div>

      </div>

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        initialPhoneNumber={customerPhone}
        onSuccess={(formData) => {
          setCustomerName(formData.fullName);
          setCustomerPhone(formData.phoneNumber);
          setSelectedCustomer(formData);
        }}
      />
    </div>
  );
}
