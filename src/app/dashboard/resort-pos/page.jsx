"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import useResortServices from "@/hooks/useResortServices";
import useResortServiceCategories from "@/hooks/useResortServiceCategories";
import useFood from "@/hooks/useFood";
import useFoodCategories from "@/hooks/useFoodCategories";
import usePaymentTypes from "@/hooks/usePaymentTypes";
import useBookings from "@/hooks/useBookings";
import { MdAdd, MdRemove, MdPrint, MdRestaurantMenu, MdOutlineTableRestaurant, MdPersonOutline, MdClose, MdKeyboardArrowDown } from "react-icons/md";
import Swal from "sweetalert2";
import CustomerModal from "@/components/CustomerModal";
import { useSearchParams } from "next/navigation";
import { FiX, FiPrinter } from "react-icons/fi";
import ReceiptPrint from "@/components/pos/ReceiptPrint";
import { useReactToPrint } from "react-to-print";
import useAxiosSecure from "@/hooks/useAxiosSecure";

export default function ResortPOSPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");

  const axiosSecure = useAxiosSecure();
  const { services, isLoading: servicesLoading } = useResortServices(1, 1000);
  const { categories, isLoading: categoriesLoading } = useResortServiceCategories(1, 100);
  const { foods, isLoading: foodsLoading } = useFood(1, 1000);
  const { categories: foodCategories, isLoading: foodCategoriesLoading } = useFoodCategories(1, 100);
  const { paymentTypes } = usePaymentTypes(1, 100);

  const [activeServiceCategory, setActiveServiceCategory] = useState("All");
  const [activeFoodCategory, setActiveFoodCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [associatedBookingId, setAssociatedBookingId] = useState(null);
  const [associatedFoodInvoiceIds, setAssociatedFoodInvoiceIds] = useState([]);
  const [associatedResortInvoiceIds, setAssociatedResortInvoiceIds] = useState([]);

  const [posMode, setPosMode] = useState("Booked Room"); // "Booked Room", "Service", "Food"
  const { bookings, isLoading: bookingsLoading } = useBookings(1, 100);

  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("PERCENT");
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);

  const [chargeSettings, setChargeSettings] = useState(null);

  // POS States
  const [roomNo, setRoomNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [activeTab, setActiveTab] = useState("Order Details"); // "Order Details" or "Guest Info"

  const [bookingSearch, setBookingSearch] = useState("");

  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [viewingBookingInfo, setViewingBookingInfo] = useState(null);
  const [isBookingInfoModalOpen, setIsBookingInfoModalOpen] = useState(false);
  
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const openPrint = (invoice) => {
    setViewingInvoice(invoice);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const handleViewPaidInvoice = async (roomNo, e) => {
    e.stopPropagation();
    try {
      const { data } = await axiosSecure.get(`/resort-invoice?search=${roomNo}`);
      if (data.success && data.invoices.length > 0) {
        // Find the latest paid invoice for this room
        const paidInvoice = data.invoices.find(inv => inv.roomNo === roomNo && inv.paymentStatus === 'Paid');
        if (paidInvoice) {
           setViewingInvoice(paidInvoice);
           setIsViewModalOpen(true);
        } else {
           Swal.fire("Not Found", "No paid invoice found for this room.", "info");
        }
      } else {
        Swal.fire("Not Found", "No invoice found for this room.", "info");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load invoice.", "error");
    }
  };

  const openBookingInfo = (booking, e) => {
    e.stopPropagation();
    setViewingBookingInfo(booking);
    setIsBookingInfoModalOpen(true);
  };

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
        setAssociatedResortInvoiceIds([]);
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
          setAssociatedResortInvoiceIds([]);
          
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

          if (data.unpaidResortInvoices && data.unpaidResortInvoices.length > 0) {
            const resortInvoiceIds = [];
            data.unpaidResortInvoices.forEach((inv) => {
               // We only want to merge invoices that are NOT the one we are currently editing (if we are editing)
               if (invoiceId && inv._id.toString() === invoiceId.toString()) return;
               
               resortInvoiceIds.push(inv._id);
               if (inv.items && inv.items.length > 0) {
                 inv.items.forEach((item, idx) => {
                   newItems.push({
                     serviceId: `resort_inv_${inv._id}_${idx}`,
                     type: "resort_service",
                     itemName: item.itemName,
                     category: "Merged Service",
                     quantity: item.quantity,
                     unitPrice: item.unitPrice,
                     totalPrice: item.totalPrice,
                     discountValue: 0,
                     discountType: "PERCENT",
                     vatRate: 0,
                     scRate: 0,
                     sdRate: 0
                   });
                 });
               }
            });
            setAssociatedResortInvoiceIds(resortInvoiceIds);
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
    if (activeServiceCategory === "All") return services;
    return services.filter(s => s.category === activeServiceCategory);
  }, [services, activeServiceCategory]);

  const filteredFoods = useMemo(() => {
    if (activeFoodCategory === "All") return foods;
    return foods.filter(f => f.category === activeFoodCategory);
  }, [foods, activeFoodCategory]);

  const addToCart = (item, type = "service") => {
    setCart((prev) => {
      const uniqueId = type === "food" ? `food_${item._id}` : `service_${item._id}`;
      const name = type === "food" ? item.foodName : item.serviceName;

      const existing = prev.find(i => i.serviceId === uniqueId);
      if (existing) {
        return prev.map(i =>
          i.serviceId === uniqueId
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [...prev, {
        serviceId: uniqueId,
        itemName: name,
        category: item.category || (type === "food" ? "Food" : "Service"),
        quantity: 1,
        unitPrice: item.price,
        totalPrice: item.price,
        discountValue: 0,
        discountType: "PERCENT",
        vatRate: Number(item.vat) || 0,
        scRate: Number(item.sc) || 0,
        sdRate: Number(item.sd) || 0
      }];
    });
  };

  const updateQuantity = (serviceId, delta) => {
    setCart((prev) => {
      const updated = prev.map(item => {
        if (item.serviceId === serviceId) {
          const newQ = item.quantity + delta;
          if (newQ < 1) return null;
          return { ...item, quantity: newQ, totalPrice: newQ * item.unitPrice };
        }
        return item;
      });
      return updated.filter(Boolean);
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

    if (status === "Paid" && !selectedPaymentMethod) {
      Swal.fire("Warning", "Please select a Payment Type before clicking Pay Now.", "warning");
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
      associatedBookingId,
      associatedFoodInvoiceIds,
      associatedResortInvoiceIds,
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
      paymentMethod: status === "Paid" ? selectedPaymentMethod : "Due",
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

  if (servicesLoading || categoriesLoading || foodsLoading || foodCategoriesLoading) {
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
           <button 
             onClick={() => setPosMode("Room")}
             className={`shrink-0 px-6 py-2 rounded-lg font-bold border-2 transition-all ${posMode === "Room" ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-gray-200 text-gray-600 hover:border-brand-primary/50 dark:border-gray-700 dark:text-gray-300"}`}
           >
             Room
           </button>
        </div>

        <div className="flex-1 bg-white dark:bg-brand-charcoal rounded-xl shadow-sm p-4 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-800">
           {posMode === "Booked Room" && (
             <div className="flex flex-col gap-4">
               <div className="shrink-0">
                  <input 
                    type="text" 
                    placeholder="Search by Room No or Phone..." 
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="w-full max-w-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg p-2.5 outline-none focus:border-brand-primary transition-colors text-sm"
                  />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                 {bookingsLoading ? (
                   <div className="col-span-full py-10 text-center text-brand-primary"><span className="loading loading-spinner"></span> Loading bookings...</div>
                 ) : bookings.length === 0 ? (
                   <div className="col-span-full py-10 text-center text-gray-400 font-medium">No active bookings found.</div>
                 ) : (
                   bookings.filter(b => {
                     if (!bookingSearch) return true;
                     const lowerSearch = bookingSearch.toLowerCase();
                     const roomMatch = b.room?.roomNumber?.toLowerCase().includes(lowerSearch);
                     const phoneMatch = b.customer?.phoneNumber?.toLowerCase().includes(lowerSearch) || b.customer?.phone?.toLowerCase().includes(lowerSearch);
                     const nameMatch = b.customer?.fullName?.toLowerCase().includes(lowerSearch) || b.customer?.name?.toLowerCase().includes(lowerSearch);
                     return roomMatch || phoneMatch || nameMatch;
                   }).map(booking => (
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
                       <div className="flex flex-col">
                         <div className="text-xs text-gray-500 font-medium">
                           Check-in: {new Date(booking.checkInDate).toLocaleDateString()}
                         </div>
                         <div className="flex gap-2 mt-1">
                           {booking.paymentStatus === 'Paid' && (
                             <button 
                               onClick={(e) => handleViewPaidInvoice(booking.room?.roomNumber, e)}
                               className="text-[10px] uppercase tracking-wider font-bold text-brand-primary hover:text-brand-secondary text-left w-max bg-brand-primary/10 px-2 py-1 rounded transition-colors"
                             >
                               View Invoice
                             </button>
                           )}
                           <button 
                             onClick={(e) => openBookingInfo(booking, e)}
                             className="text-[10px] uppercase tracking-wider font-bold text-gray-500 hover:text-gray-700 text-left w-max bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded transition-colors"
                           >
                             View Info
                           </button>
                         </div>
                       </div>
                       <div className="font-black text-brand-primary text-lg">
                         TK {booking.totalAmount}
                       </div>
                     </div>
                   </div>
                 ))
               )}
                 {bookings.length > 0 && bookings.filter(b => {
                     if (!bookingSearch) return true;
                     const lowerSearch = bookingSearch.toLowerCase();
                     const roomMatch = b.room?.roomNumber?.toLowerCase().includes(lowerSearch);
                     const phoneMatch = b.customer?.phoneNumber?.toLowerCase().includes(lowerSearch) || b.customer?.phone?.toLowerCase().includes(lowerSearch);
                     const nameMatch = b.customer?.fullName?.toLowerCase().includes(lowerSearch) || b.customer?.name?.toLowerCase().includes(lowerSearch);
                     return roomMatch || phoneMatch || nameMatch;
                 }).length === 0 && (
                    <div className="col-span-full py-10 text-center text-gray-400 font-medium">No matches found.</div>
                 )}
               </div>
             </div>
           )}

           {posMode === "Room" && (
             <div className="flex flex-col gap-6">
               {rooms.length === 0 ? (
                 <div className="py-10 text-center text-gray-400 font-medium">No rooms found.</div>
               ) : (
                 <>
                   {["Available", "Occupied", "Maintenance"].map((statusGroup) => {
                     const filteredRooms = rooms.filter(r => r.status === statusGroup);
                     if (filteredRooms.length === 0) return null;
                     
                     return (
                       <div key={statusGroup} className="flex flex-col gap-3">
                         <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                           {statusGroup} Rooms ({filteredRooms.length})
                         </h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                           {filteredRooms.map(room => (
                             <div 
                               key={room._id} 
                               onClick={() => setRoomNo(room.roomNumber)}
                               className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${roomNo === room.roomNumber ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-200 hover:border-brand-primary/50 bg-white dark:bg-gray-800 dark:border-gray-700'}`}
                             >
                               <div className="flex justify-between items-start mb-2">
                                 <h3 className={`font-bold text-lg ${roomNo === room.roomNumber ? 'text-brand-primary' : 'text-gray-800 dark:text-gray-100'}`}>
                                   Room {room.roomNumber}
                                 </h3>
                                 <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${room.status === 'Available' ? 'bg-green-100 text-green-700' : room.status === 'Occupied' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                   {room.status}
                                 </span>
                               </div>
                               <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                 Type: <span className="font-bold text-gray-800 dark:text-gray-200">{room.roomType}</span>
                               </div>
                               <div className="flex justify-between items-end mt-auto">
                                 <div className="text-xs text-gray-500 font-medium">
                                   Capacity: {room.capacity}
                                 </div>
                                 <div className="font-black text-brand-primary text-lg">
                                   TK {room.price}
                                 </div>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     );
                   })}
                 </>
               )}
             </div>
           )}

           {posMode === "Service" && (
             <div className="flex flex-col h-full gap-4">
                <div className="bg-white dark:bg-brand-charcoal rounded-xl shadow-sm p-3 flex flex-wrap gap-2 border border-gray-100 dark:border-gray-800 shrink-0">
                  <button 
                    onClick={() => setActiveServiceCategory("All")}
                    className={`shrink-0 px-6 py-2 rounded-lg font-bold border-2 transition-all ${activeServiceCategory === "All" ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-gray-200 text-gray-600 hover:border-brand-primary/50 dark:border-gray-700 dark:text-gray-300"}`}
                  >
                    All Services
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat._id}
                      onClick={() => setActiveServiceCategory(cat.categoryName)}
                      className={`shrink-0 px-6 py-2 rounded-lg font-bold border-2 transition-all ${activeServiceCategory === cat.categoryName ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-gray-200 text-gray-600 hover:border-brand-primary/50 dark:border-gray-700 dark:text-gray-300"}`}
                    >
                      {cat.categoryName}
                    </button>
                  ))}
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                     {filteredServices.map(service => (
                       <div 
                         key={service._id} 
                         onClick={() => addToCart(service, "service")}
                         className="rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all group bg-white dark:bg-gray-800 flex flex-col"
                       >
                         <div className="h-32 w-full bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                            {service.image ? (
                               <img src={service.image} alt={service.serviceName} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300" />
                            ) : (
                               <div className="flex h-full items-center justify-center text-gray-400">
                                  <span className="opacity-20 font-bold uppercase">No Image</span>
                               </div>
                            )}
                            <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/70 px-2 py-0.5 rounded text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm backdrop-blur-sm">
                               {service.category}
                            </div>
                         </div>
                         <div className="p-3 flex-1 flex flex-col justify-between">
                           <h4 className="font-bold text-sm line-clamp-2 leading-tight mb-2 dark:text-white text-gray-800 group-hover:text-brand-primary transition-colors">{service.serviceName}</h4>
                           <p className="text-brand-primary font-black">TK {service.price}</p>
                         </div>
                       </div>
                     ))}
                     {filteredServices.length === 0 && (
                       <div className="col-span-full py-10 text-center text-gray-400 font-medium">No services found in this category.</div>
                     )}
                   </div>
                </div>
             </div>
           )}

           {posMode === "Food" && (
             <div className="flex flex-col h-full gap-4">
                <div className="bg-white dark:bg-brand-charcoal rounded-xl shadow-sm p-3 flex flex-wrap gap-2 border border-gray-100 dark:border-gray-800 shrink-0">
                  <button 
                    onClick={() => setActiveFoodCategory("All")}
                    className={`shrink-0 px-6 py-2 rounded-lg font-bold border-2 transition-all ${activeFoodCategory === "All" ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-gray-200 text-gray-600 hover:border-brand-primary/50 dark:border-gray-700 dark:text-gray-300"}`}
                  >
                    All Foods
                  </button>
                  {foodCategories.map(cat => (
                    <button 
                      key={cat._id}
                      onClick={() => setActiveFoodCategory(cat.categoryName)}
                      className={`shrink-0 px-6 py-2 rounded-lg font-bold border-2 transition-all ${activeFoodCategory === cat.categoryName ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-gray-200 text-gray-600 hover:border-brand-primary/50 dark:border-gray-700 dark:text-gray-300"}`}
                    >
                      {cat.categoryName}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                     {filteredFoods.map(food => (
                       <div 
                         key={food._id} 
                         onClick={() => addToCart(food, "food")}
                         className="rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all group bg-white dark:bg-gray-800 flex flex-col"
                       >
                         <div className="h-32 w-full bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                            {food.image ? (
                               <img src={food.image} alt={food.foodName} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300" />
                            ) : (
                               <div className="flex h-full items-center justify-center text-gray-400">
                                  <MdRestaurantMenu size={40} className="opacity-20" />
                               </div>
                            )}
                            <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/70 px-2 py-0.5 rounded text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm backdrop-blur-sm">
                               {food.category}
                            </div>
                         </div>
                         <div className="p-3 flex-1 flex flex-col justify-between">
                           <h4 className="font-bold text-sm line-clamp-2 leading-tight mb-2 dark:text-white text-gray-800 group-hover:text-brand-primary transition-colors">{food.foodName}</h4>
                           <p className="text-brand-primary font-black">TK {food.price}</p>
                         </div>
                       </div>
                     ))}
                     {filteredFoods.length === 0 && (
                       <div className="col-span-full py-10 text-center text-gray-400 font-medium">No foods found in this category.</div>
                     )}
                   </div>
                </div>
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
            {roomNo && (
              <div className="mb-3 p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg flex justify-between items-center shrink-0">
                <div>
                  <div className="text-xs text-brand-primary font-bold uppercase tracking-wider">Selected Room</div>
                  <div className="font-black text-gray-800 dark:text-gray-200 text-lg">Room {roomNo}</div>
                </div>
                <button onClick={() => setRoomNo("")} className="btn btn-xs btn-outline border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300">
                  Deselect
                </button>
              </div>
            )}

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
              <button 
                onClick={() => setIsDiscountOpen(!isDiscountOpen)} 
                className="w-full flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-brand-primary transition-colors"
              >
                <span>Total Discount</span>
                <MdKeyboardArrowDown className={`text-xl transition-transform duration-300 ${isDiscountOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`grid transition-all duration-300 ease-in-out ${isDiscountOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="flex gap-2 h-10 mt-3 mb-1">
                    <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:border-brand-primary transition-colors">
                      <input type="text" value={discountValue} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setDiscountValue(raw === '' ? 0 : parseInt(raw, 10)); }} className="w-full h-full px-3 text-sm outline-none bg-transparent min-w-0" placeholder="0" />
                    </div>
                    <div className="w-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:border-brand-primary transition-colors">
                      <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="w-full h-full px-2 text-xs font-bold text-gray-600 dark:text-gray-300 outline-none cursor-pointer bg-transparent">
                        <option value="PERCENT">PERCENT</option>
                        <option value="FLAT">FLAT</option>
                      </select>
                    </div>
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
          <div className="bg-gray-50 dark:bg-gray-800 p-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Payment Type</span>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
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

      {/* BOOKING INFO MODAL */}
      {isBookingInfoModalOpen && viewingBookingInfo && (
        <dialog className="modal modal-open bg-brand-charcoal/50">
          <div className="modal-box bg-white dark:bg-brand-charcoal rounded-2xl p-0">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-lg text-brand-primary uppercase">Booking Info: Room {viewingBookingInfo.room?.roomNumber}</h3>
              <button onClick={() => setIsBookingInfoModalOpen(false)} className="btn btn-sm btn-circle btn-ghost"><FiX /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-500 text-xs">Guest Name</p>
                  <p className="font-bold">{viewingBookingInfo.customer?.fullName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Phone</p>
                  <p className="font-bold">{viewingBookingInfo.customer?.phoneNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Room Type</p>
                  <p className="font-bold">{viewingBookingInfo.room?.roomType || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Booking Status</p>
                  <p className={`font-bold ${viewingBookingInfo.bookingStatus === 'Checked-out' ? 'text-gray-500' : 'text-brand-primary'}`}>{viewingBookingInfo.bookingStatus}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Check-in Date</p>
                  <p className="font-bold">{viewingBookingInfo.checkInDate ? new Date(viewingBookingInfo.checkInDate).toLocaleDateString() : "Not Set"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Check-out Date</p>
                  <p className="font-bold">{viewingBookingInfo.checkOutDate ? new Date(viewingBookingInfo.checkOutDate).toLocaleDateString() : "Not Set"}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 text-sm flex justify-between items-center">
                 <div>
                   <p className="text-gray-500 text-xs">Payment Status</p>
                   <p className={`font-bold ${viewingBookingInfo.paymentStatus === 'Paid' ? 'text-green-600' : 'text-orange-500'}`}>{viewingBookingInfo.paymentStatus}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-gray-500 text-xs">Total Amount</p>
                   <p className="font-bold text-brand-primary text-xl">TK {viewingBookingInfo.totalAmount}</p>
                 </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
              <button onClick={() => { setIsBookingInfoModalOpen(false); setRoomNo(viewingBookingInfo.room?.roomNumber); }} className="btn bg-brand-primary text-white border-none btn-sm px-6">Load to POS</button>
              <button onClick={() => setIsBookingInfoModalOpen(false)} className="btn btn-ghost btn-sm px-6">Close</button>
            </div>
          </div>
        </dialog>
      )}

      {/* VIEW INVOICE MODAL */}
      {isViewModalOpen && viewingInvoice && (
        <dialog className="modal modal-open bg-brand-charcoal/50">
          <div className="modal-box bg-white dark:bg-brand-charcoal rounded-2xl p-0">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-lg text-brand-primary uppercase">View Invoice: {viewingInvoice.invoiceNo}</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="btn btn-sm btn-circle btn-ghost"><FiX /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-500 text-xs">Customer Name</p>
                  <p className="font-bold">{viewingInvoice.customer?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Phone</p>
                  <p className="font-bold">{viewingInvoice.customer?.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Room No</p>
                  <p className="font-bold">{viewingInvoice.roomNo || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Status</p>
                  <p className={`font-bold ${viewingInvoice.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-500'}`}>{viewingInvoice.paymentStatus}</p>
                </div>
              </div>

              <h4 className="font-bold text-sm mb-2 border-b pb-2">Items</h4>
              <ul className="space-y-1 text-sm mb-4 max-h-40 overflow-y-auto">
                {viewingInvoice.items?.map((item, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{item.itemName} x{item.quantity}</span>
                    <span>৳{item.totalPrice?.toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t pt-2 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Sub Total:</span>
                  <span>৳{viewingInvoice.subTotal?.toFixed(2)}</span>
                </div>
                {viewingInvoice.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-৳{viewingInvoice.discount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-brand-primary text-base border-t mt-2 pt-2">
                  <span>Grand Total:</span>
                  <span>৳{viewingInvoice.grandTotal?.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
              <button onClick={() => openPrint(viewingInvoice)} className="btn bg-brand-sage text-white border-none btn-sm px-6">Print</button>
              <button onClick={() => setIsViewModalOpen(false)} className="btn btn-ghost btn-sm px-6">Close</button>
            </div>
          </div>
        </dialog>
      )}

      {/* Hidden Print Component */}
      <ReceiptPrint ref={printRef} invoice={viewingInvoice} />

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
