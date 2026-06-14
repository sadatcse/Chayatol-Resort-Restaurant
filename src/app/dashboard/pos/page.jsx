"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import useFood from "@/hooks/useFood";
import useFoodCategories from "@/hooks/useFoodCategories";
import usePaymentTypes from "@/hooks/usePaymentTypes";
import { MdAdd, MdRemove, MdPrint, MdRestaurantMenu, MdOutlineTableRestaurant, MdPersonOutline, MdClose } from "react-icons/md";
import ReceiptPrint from "@/components/pos/ReceiptPrint";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import CustomerModal from "@/components/CustomerModal";
import { useSearchParams } from "next/navigation";

export default function POSPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");
  
  const axiosSecure = useAxiosSecure();
  const { foods, isLoading: foodsLoading } = useFood(1, 1000);
  const { categories, isLoading: categoriesLoading } = useFoodCategories(1, 100);
  const { paymentTypes } = usePaymentTypes(1, 100);

  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  
  // Tax & Discount States
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("PERCENT");
  const [discountScope, setDiscountScope] = useState("Full"); // "Full" or "Item Wise"

  const [vatValue, setVatValue] = useState(5);
  const [vatType, setVatType] = useState("PERCENT");

  const [sdValue, setSdValue] = useState(0);
  const [sdType, setSdType] = useState("PERCENT");

  const [serviceChargeValue, setServiceChargeValue] = useState(0);
  const [serviceChargeType, setServiceChargeType] = useState("FLAT");

  const [deliveryChargeValue, setDeliveryChargeValue] = useState(0);
  const [deliveryChargeType, setDeliveryChargeType] = useState("FLAT");

  // Charge Settings
  const [chargeSettings, setChargeSettings] = useState(null);

  // New POS States
  const [orderType, setOrderType] = useState("Dine In");
  const [tableNo, setTableNo] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [waiterName, setWaiterName] = useState("");
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  
  useEffect(() => {
    if (paymentTypes?.length > 0 && !selectedPaymentMethod) {
      const hasCash = paymentTypes.find(pt => pt.name?.toLowerCase() === "cash");
      setSelectedPaymentMethod(hasCash ? hasCash.name : paymentTypes[0].name);
    }
  }, [paymentTypes, selectedPaymentMethod]);
  
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [activeTab, setActiveTab] = useState("Order Details"); // "Order Details" or "Guest Info"

  // Data fetching for tables and rooms
  const [tables, setTables] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);

  const [loading, setLoading] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [existingInvoice, setExistingInvoice] = useState(null);

  const printRef = useRef(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    // Fetch tables, rooms, staff
    const fetchData = async () => {
      try {
        const [tablesRes, roomsRes, staffRes, settingsRes] = await Promise.all([
          axiosSecure.get("/restauranttable").catch(() => ({ data: [] })),
          axiosSecure.get("/room").catch(() => ({ data: [] })),
          axiosSecure.get("/userrole").catch(() => ({ data: { data: [] } })),
          axiosSecure.get("/settings/charges").catch(() => ({ data: null }))
        ]);
        if (tablesRes.data) setTables(tablesRes.data);
        if (roomsRes.data) setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : (roomsRes.data.data || []));
        if (staffRes.data && staffRes.data.data) setStaff(staffRes.data.data);
        if (settingsRes.data) setChargeSettings(settingsRes.data);
      } catch (e) {
        console.error("Failed to fetch auxiliary data", e);
      }
    };
    fetchData();
  }, [axiosSecure]);

  // Fetch Existing Invoice if ID is provided
  useEffect(() => {
    if (!invoiceId) return;
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const { data } = await axiosSecure.get(`/pos/invoice/${invoiceId}`);
        if (data.success && data.data) {
          const inv = data.data;
          setExistingInvoice(inv);
          setOrderType(inv.orderType || "Dine In");
          setTableNo(inv.tableNo || "");
          setRoomNo(inv.roomNo || "");
          setWaiterName(inv.waiterName || "");
          setCustomerName(inv.customer?.name || "");
          setCustomerPhone(inv.customer?.phone || "");
        }
      } catch (err) {
        console.error("Error fetching invoice", err);
        Swal.fire("Error", "Could not load the invoice for editing.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoiceId, axiosSecure]);

  useEffect(() => {
    if (!chargeSettings) return;

    // Evaluate VAT
    if (chargeSettings.vat?.enabled) {
      setVatType("PERCENT"); // Settings are always percent
      if (chargeSettings.vat.customApplicability) {
        setVatValue(chargeSettings.vat.applicability[orderType] ? chargeSettings.vat.value : 0);
      } else {
        setVatValue(chargeSettings.vat.value);
      }
    } else {
      setVatValue(0);
    }

    // Evaluate SC
    if (chargeSettings.sc?.enabled) {
      setServiceChargeType("PERCENT"); // Settings are always percent
      if (chargeSettings.sc.customApplicability) {
        setServiceChargeValue(chargeSettings.sc.applicability[orderType] ? chargeSettings.sc.value : 0);
      } else {
        setServiceChargeValue(chargeSettings.sc.value);
      }
    } else {
      setServiceChargeValue(0);
    }

    // Evaluate SD
    if (chargeSettings.sd?.enabled) {
      setSdType("PERCENT"); // Settings are always percent
      if (chargeSettings.sd.customApplicability) {
        setSdValue(chargeSettings.sd.applicability[orderType] ? chargeSettings.sd.value : 0);
      } else {
        setSdValue(chargeSettings.sd.value);
      }
    } else {
      setSdValue(0);
    }

    // Evaluate Delivery
    if (chargeSettings.deliveryCharge?.enabled) {
      if (["Delivery", "Foodpanda", "Foodi", "Pathao"].includes(orderType)) {
         setDeliveryChargeValue(chargeSettings.deliveryCharge.value);
         setDeliveryChargeType(chargeSettings.deliveryCharge.type);
      } else {
         setDeliveryChargeValue(0);
      }
    } else {
      setDeliveryChargeValue(0);
    }
  }, [orderType, chargeSettings]);

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

  const filteredFoods = useMemo(() => {
    if (activeCategory === "All") return foods;
    return foods.filter(f => f.category === activeCategory);
  }, [foods, activeCategory]);

  const addToCart = (food) => {
    setCart((prev) => {
      const existing = prev.find(item => item.foodId === food._id);
      if (existing) {
        return prev.map(item =>
          item.foodId === food._id
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      return [...prev, {
        foodId: food._id,
        itemName: food.foodName,
        category: food.category || "Food",
        quantity: 1,
        unitPrice: food.price,
        totalPrice: food.price,
        discountValue: 0,
        discountType: "PERCENT",
        orderStatus: "Pending",
        vatRate: Number(food.vat) || 0,
        scRate: Number(food.sc) || 0,
        sdRate: Number(food.sd) || 0
      }];
    });
  };

  const updateQuantity = (foodId, delta) => {
    setCart((prev) => {
      return prev.map(item => {
        if (item.foodId === foodId) {
          const newQ = item.quantity + delta;
          if (newQ < 1) return item;
          return { ...item, quantity: newQ, totalPrice: newQ * item.unitPrice };
        }
        return item;
      });
    });
  };

  const removeFromCart = (foodId) => {
    setCart(prev => prev.filter(item => item.foodId !== foodId));
  };

  const updateItemDiscount = (foodId, value, type) => {
    setCart((prev) => {
      return prev.map(item => {
        if (item.foodId === foodId) {
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
  const discountFactor = (subTotal - itemDiscounts) > 0 ? ((subTotal - itemDiscounts) - orderDiscount) / (subTotal - itemDiscounts) : 1;

  let dynamicVat = 0;
  let dynamicSd = 0;
  let dynamicSc = 0;

  const isVatEnabled = chargeSettings?.vat?.enabled && vatValue > 0;
  const isSdEnabled = chargeSettings?.sd?.enabled && sdValue > 0;
  const isScEnabled = chargeSettings?.sc?.enabled && serviceChargeValue > 0;

  cart.forEach(item => {
    const itemDiscountAmt = item.discountType === "PERCENT" 
        ? (item.totalPrice * item.discountValue) / 100 
        : (item.discountValue * item.quantity);
    
    const netItemPrice = item.totalPrice - itemDiscountAmt;
    const finalItemPrice = netItemPrice * discountFactor;

    // Apply rates only if globally enabled and applicable
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
  
  // Extract the actual rates applied for UI display
  const appliedVatRate = isVatEnabled ? cart.find(i => i.vatRate > 0)?.vatRate || 0 : 0;
  const appliedSdRate = isSdEnabled ? cart.find(i => i.sdRate > 0)?.sdRate || 0 : 0;
  const appliedScRate = isScEnabled ? cart.find(i => i.scRate > 0)?.scRate || 0 : 0;
  const deliveryAmt = deliveryChargeType === "PERCENT" ? (subTotalAfterDiscount * deliveryChargeValue) / 100 : deliveryChargeValue;
  const grandTotal = subTotalAfterDiscount + vat + sdAmt + serviceChargeAmt + deliveryAmt;

  // Combined totals for display when editing
  const displaySubTotal = (existingInvoice?.subTotal || 0) + subTotal;
  const displayDiscount = (existingInvoice?.discount || 0) + discount;
  const displayVat = (existingInvoice?.vat || 0) + vat;
  const displaySdAmt = (existingInvoice?.sd || 0) + sdAmt;
  const displayServiceChargeAmt = (existingInvoice?.serviceCharge || 0) + serviceChargeAmt;
  const displayDeliveryAmt = (existingInvoice?.deliveryCharge || 0) + deliveryAmt;
  const displayGrandTotal = (existingInvoice?.grandTotal || 0) + grandTotal;

  const handleSubmitOrder = async (status = "Unpaid") => {
    if (cart.length === 0 && !existingInvoice) {
      Swal.fire("Error", "Cart is empty", "error");
      return;
    }
    
    setLoading(true);
    
    // Create payload based on new schema
    const payload = {
      orderType,
      customer: {
        name: customerName,
        phone: customerPhone
      },
      tableNo: orderType?.toLowerCase().includes("dine") ? tableNo : null,
      roomNo: orderType?.toLowerCase().includes("room") ? roomNo : null,
      waiterName,
      subTotal: displaySubTotal,
      discount: displayDiscount,
      vat: displayVat,
      sd: displaySdAmt,
      serviceCharge: displayServiceChargeAmt,
      deliveryCharge: displayDeliveryAmt,
      grandTotal: displayGrandTotal,
      paymentMethod: status === "Paid" ? (selectedPaymentMethod || "Cash") : "Due",
      paymentStatus: status,
      invoiceType: "Restaurant"
    };

    if (cart.length > 0) {
      const newBatch = {
         batchId: `BATCH-${Date.now()}`,
         orderedAt: new Date(),
         items: cart
      };
      if (existingInvoice) {
        payload.orderBatches = [...(existingInvoice.orderBatches || []), newBatch];
      } else {
        payload.orderBatches = [newBatch];
      }
    } else if (existingInvoice) {
      // Just updating guest info, no new items
      payload.orderBatches = existingInvoice.orderBatches;
    }

    try {
      let resData;
      if (existingInvoice) {
        const { data } = await axiosSecure.put(`/pos/invoice/${existingInvoice._id}`, payload);
        resData = data;
      } else {
        const { data } = await axiosSecure.post("/pos/invoice", payload);
        resData = data;
      }

      if (resData.success) {
        setCart([]);
        setLastInvoice(resData.data);
        Swal.fire({
          title: "Success",
          text: `Order ${existingInvoice ? "Updated" : (status === "Paid" ? "Paid" : "Placed")} successfully.`,
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "Print Receipt",
          cancelButtonText: "Close"
        }).then((result) => {
          if (result.isConfirmed) {
            setTimeout(() => handlePrint(), 100);
          }
          if (existingInvoice) {
             // If we were editing, maybe reload or go back
             window.location.href = "/dashboard/invoices";
          }
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to submit order", "error");
    } finally {
      setLoading(false);
    }
  };

  if (foodsLoading || categoriesLoading) {
    return <div className="flex h-full items-center justify-center"><span className="loading loading-spinner text-brand-primary loading-lg"></span></div>;
  }

  return (
    <div className="h-[calc(100vh-100px)] flex gap-4">
      {/* MIDDLE: Food Grid & Top Categories */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Horizontal Categories like ChillyPOS */}
        <div className="bg-white dark:bg-brand-charcoal rounded-xl shadow-sm p-3 flex flex-wrap gap-2 border border-gray-100 dark:border-gray-800 shrink-0">
           <button 
             onClick={() => setActiveCategory("All")}
             className={`shrink-0 px-6 py-2 rounded-lg font-bold border-2 transition-all ${activeCategory === "All" ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-gray-200 text-gray-600 hover:border-brand-primary/50 dark:border-gray-700 dark:text-gray-300"}`}
           >
             All Menu
           </button>
           {categories.map(cat => (
             <button 
               key={cat._id}
               onClick={() => setActiveCategory(cat.categoryName)}
               className={`shrink-0 px-6 py-2 rounded-lg font-bold border-2 transition-all ${activeCategory === cat.categoryName ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-gray-200 text-gray-600 hover:border-brand-primary/50 dark:border-gray-700 dark:text-gray-300"}`}
             >
               {cat.categoryName}
             </button>
           ))}
        </div>

        {/* Food Grid */}
        <div className="flex-1 bg-white dark:bg-brand-charcoal rounded-xl shadow-sm p-4 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFoods.map(food => (
              <div 
                key={food._id} 
                onClick={() => addToCart(food)}
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
              <div className="col-span-full py-10 text-center text-gray-400 font-medium">No items found in this category.</div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Advanced Order Panel */}
      <div className="w-[340px] lg:w-[380px] xl:w-[420px] bg-white dark:bg-brand-charcoal rounded-xl shadow-lg flex flex-col border border-gray-100 dark:border-gray-800 shrink-0">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
           <button 
             onClick={() => setActiveTab("Order Details")}
             className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === "Order Details" ? "bg-white text-brand-primary border-b-2 border-brand-primary dark:bg-brand-charcoal" : "bg-gray-50 text-gray-500 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}
           >
             Order Details
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
            {/* Top Dropdowns */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
               <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block dark:text-gray-400">Order Type</label>
                  <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 text-sm font-medium dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-brand-primary">
                     {chargeSettings?.vat?.applicability 
                       ? Object.keys(chargeSettings.vat.applicability).map(type => (
                           <option key={type} value={type}>{type}</option>
                         ))
                       : (
                         <>
                           <option value="Dine In">Dine In</option>
                           <option value="Takeaway">Takeaway</option>
                           <option value="Delivery">Delivery</option>
                           <option value="Room Service">Room Service</option>
                           <option value="Foodpanda">Foodpanda</option>
                           <option value="Foodi">Foodi</option>
                           <option value="Pathao">Pathao</option>
                         </>
                       )}
                  </select>
               </div>
               
               {orderType?.toLowerCase().includes("dine") && (
                 <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block dark:text-gray-400">Change Table</label>
                    <select value={tableNo} onChange={(e) => setTableNo(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 text-sm font-medium dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-brand-primary">
                       <option value="">Select Table</option>
                       {tables.map(t => <option key={t._id} value={t.tableName}>{t.tableName}</option>)}
                    </select>
                 </div>
               )}

               {orderType?.toLowerCase().includes("room") && (
                 <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block dark:text-gray-400">Change Room</label>
                    <select value={roomNo} onChange={(e) => setRoomNo(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 text-sm font-medium dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-brand-primary">
                       <option value="">Select Room</option>
                       {rooms.map(r => <option key={r._id} value={r.roomNumber}>{r.roomNumber}</option>)}
                    </select>
                 </div>
               )}

               {/* Removed Waiter Dropdown */}
            </div>

            {/* Cart Header */}
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
               <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Food Items</span>
               <button onClick={() => setCart([])} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">Clear All</button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
              {existingInvoice && existingInvoice.orderBatches?.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-800 pb-1">Previously Ordered</div>
                  <div className="flex flex-col gap-2">
                    {existingInvoice.orderBatches.map((batch, bIdx) => (
                      <div key={batch.batchId || bIdx} className="bg-gray-100 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-200 dark:border-gray-700 opacity-70">
                        {batch.items?.map((item, iIdx) => (
                          <div key={iIdx} className="flex justify-between items-center text-sm py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <span className="font-medium text-gray-600 dark:text-gray-300">{item.itemName} x{item.quantity}</span>
                            <span className="font-bold text-gray-500">{(item.totalPrice).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        <button onClick={() => removeFromCart(item.foodId)} className="text-gray-400 hover:text-red-500 transition-colors"><MdClose size={16} /></button>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                          <button onClick={() => updateQuantity(item.foodId, -1)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><MdRemove size={16} /></button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.foodId, 1)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><MdAdd size={16} /></button>
                        </div>
                        <span className="font-black text-brand-dark-grey dark:text-white">{(item.totalPrice).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] uppercase text-gray-500 font-bold">Disc:</span>
                          <select 
                            className="text-xs bg-transparent border-none outline-none cursor-pointer text-brand-primary font-bold p-0 dark:text-brand-sage"
                            value={item.discountType || "PERCENT"}
                            onChange={(e) => updateItemDiscount(item.foodId, item.discountValue, e.target.value)}
                          >
                            <option value="PERCENT">%</option>
                            <option value="FLAT">৳</option>
                          </select>
                          <input 
                            type="text" 
                            className="w-10 text-xs border-b border-gray-200 dark:border-gray-600 outline-none text-center bg-transparent dark:text-white" 
                            value={item.discountValue || 0}
                            onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); updateItemDiscount(item.foodId, raw === '' ? 0 : parseInt(raw, 10), item.discountType); }}
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

            {/* Advance & Totals */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shrink-0">
               <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Advance</div>
               <div className="mb-3">
                  <div className="flex items-center gap-4 mb-2">
                     <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Discount</label>
                     <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                           <input type="radio" name="discountScope" checked={true} readOnly className="cursor-pointer accent-brand-primary" /> Full Order
                        </label>
                     </div>
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
               


               <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                     <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">Delivery</label>
                     <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:border-brand-primary transition-colors">
                        <input type="text" value={deliveryChargeValue} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setDeliveryChargeValue(raw === '' ? 0 : parseInt(raw, 10)); }} className="w-full p-2 text-sm outline-none bg-transparent min-w-0" />
                        <select value={deliveryChargeType} onChange={e => setDeliveryChargeType(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 px-2 text-xs font-bold text-gray-600 dark:text-gray-300 outline-none cursor-pointer">
                           <option value="PERCENT">PERCENT</option>
                           <option value="FLAT">FLAT</option>
                        </select>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col gap-1 text-sm">
                  {existingInvoice && (
                     <>
                        <div className="flex justify-between text-gray-500 text-xs mb-1 border-b border-gray-100 dark:border-gray-700 pb-1">
                           <span>Previous Total</span>
                           <span className="font-bold">TK {existingInvoice.grandTotal?.toFixed(2)}</span>
                        </div>
                     </>
                  )}
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                     <span>{existingInvoice ? "New Subtotal" : "Subtotal"}</span>
                     <span className="font-bold">TK {subTotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                     <div className="flex justify-between text-red-500">
                        <span>New Discount</span>
                        <span className="font-bold">- TK {discount.toFixed(2)}</span>
                     </div>
                  )}
                  {vat > 0 && (
                     <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>{existingInvoice ? "New VAT" : "VAT"} {appliedVatRate > 0 ? `(${appliedVatRate}%)` : ''}</span>
                        <span className="font-bold">TK {vat.toFixed(2)}</span>
                     </div>
                  )}
                  {sdAmt > 0 && (
                     <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>{existingInvoice ? "New SD" : "SD"} {appliedSdRate > 0 ? `(${appliedSdRate}%)` : ''}</span>
                        <span className="font-bold">TK {sdAmt.toFixed(2)}</span>
                     </div>
                  )}
                  {serviceChargeAmt > 0 && (
                     <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>{existingInvoice ? "New S. Charge" : "S. Charge"} {appliedScRate > 0 ? `(${appliedScRate}%)` : ''}</span>
                        <span className="font-bold">TK {serviceChargeAmt.toFixed(2)}</span>
                     </div>
                  )}
                  {deliveryAmt > 0 && (
                     <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>New Delivery {deliveryChargeType === "PERCENT" ? `(${deliveryChargeValue}%)` : ''}</span>
                        <span className="font-bold">TK {deliveryAmt.toFixed(2)}</span>
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

        {/* Bottom Actions */}
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

           {/* Grand Total Bar */}
           <div className="bg-brand-primary p-3 px-4 flex justify-between items-center text-white">
              <span className="font-medium text-white/80">{existingInvoice ? "Updated Total" : "Total to Pay"}</span>
              <span className="font-black text-xl">TK {displayGrandTotal.toFixed(2)}</span>
           </div>
           
           {/* Action Buttons */}
           <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-charcoal rounded-b-xl overflow-hidden">
              <button 
                disabled={loading || (cart.length === 0 && !existingInvoice)}
                onClick={() => handleSubmitOrder("Paid")}
                className="py-3 px-2 font-bold text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:bg-gray-400"
              >
                 <span className="text-xs uppercase tracking-wider opacity-80">{existingInvoice ? "Pay All" : "Pay"}</span>
                 <span className="text-sm">{displayGrandTotal.toFixed(0)}</span>
              </button>
              
              <button 
                disabled={loading || (cart.length === 0 && !existingInvoice)}
                className="py-3 px-2 font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
              >
                 <MdPrint size={18} className="text-gray-400" />
                 <span className="text-xs uppercase tracking-wider">Guest Bill</span>
              </button>

              <button 
                disabled={loading || (cart.length === 0 && !existingInvoice)}
                onClick={() => handleSubmitOrder("Unpaid")}
                className="py-3 px-2 font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
              >
                 <span className="text-xs uppercase tracking-wider">{existingInvoice ? "Update Order" : "Update"}</span>
                 <span className="text-xs font-normal text-gray-500 dark:text-gray-400">Send to Kitchen</span>
              </button>
           </div>
        </div>

      </div>

      {/* Hidden printer component */}
      {lastInvoice && <ReceiptPrint ref={printRef} invoice={lastInvoice} />}

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
