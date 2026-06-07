"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import useFood from "@/hooks/useFood";
import useFoodCategories from "@/hooks/useFoodCategories";
import { MdAdd, MdRemove, MdPrint, MdRestaurantMenu, MdOutlineTableRestaurant, MdPersonOutline, MdClose } from "react-icons/md";
import ReceiptPrint from "@/components/pos/ReceiptPrint";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";

export default function POSPage() {
  const axiosSecure = useAxiosSecure();
  const { foods, isLoading: foodsLoading } = useFood(1, 1000);
  const { categories, isLoading: categoriesLoading } = useFoodCategories(1, 100);

  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  
  // Tax & Discount States
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("PERCENT");
  const [discountScope, setDiscountScope] = useState("Full"); // "Full" or "Item Wise"

  const [vatValue, setVatValue] = useState(5);
  const [vatType, setVatType] = useState("PERCENT");

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
  
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  
  const [activeTab, setActiveTab] = useState("Order Details"); // "Order Details" or "Guest Info"

  // Data fetching for tables and rooms
  const [tables, setTables] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);

  const [loading, setLoading] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

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
          axiosSecure.get("/rooms").catch(() => ({ data: { data: [] } })),
          axiosSecure.get("/userrole").catch(() => ({ data: { data: [] } })),
          axiosSecure.get("/settings/charges").catch(() => ({ data: null }))
        ]);
        if (tablesRes.data) setTables(tablesRes.data);
        if (roomsRes.data && roomsRes.data.data) setRooms(roomsRes.data.data);
        if (staffRes.data && staffRes.data.data) setStaff(staffRes.data.data);
        if (settingsRes.data) setChargeSettings(settingsRes.data);
      } catch (e) {
        console.error("Failed to fetch auxiliary data", e);
      }
    };
    fetchData();
  }, [axiosSecure]);

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
        orderStatus: "Pending"
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

  // Calculations
  const subTotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  
  let discount = 0;
  if (discountScope === "Full") {
     discount = discountType === "PERCENT" ? (subTotal * discountValue) / 100 : discountValue;
  } else {
     // Item Wise
     if (discountType === "PERCENT") {
        discount = (subTotal * discountValue) / 100;
     } else {
        const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
        discount = discountValue * totalItems;
     }
  }
  
  const subTotalAfterDiscount = subTotal - discount;
  const vat = vatType === "PERCENT" ? (subTotalAfterDiscount * vatValue) / 100 : vatValue;
  const serviceChargeAmt = serviceChargeType === "PERCENT" ? (subTotalAfterDiscount * serviceChargeValue) / 100 : serviceChargeValue;
  const deliveryAmt = deliveryChargeType === "PERCENT" ? (subTotalAfterDiscount * deliveryChargeValue) / 100 : deliveryChargeValue;
  const grandTotal = subTotalAfterDiscount + vat + serviceChargeAmt + deliveryAmt;

  const handleSubmitOrder = async (status = "Unpaid") => {
    if (cart.length === 0) {
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
      tableNo: orderType === "Dine In" ? tableNo : null,
      roomNo: orderType === "Room Service" ? roomNo : null,
      waiterName,
      orderBatches: [
        {
           batchId: `BATCH-${Date.now()}`,
           orderedAt: new Date(),
           items: cart
        }
      ],
      subTotal,
      discount,
      vat,
      sd: 0,
      serviceCharge: serviceChargeAmt,
      deliveryCharge: deliveryAmt,
      grandTotal,
      paymentMethod: status === "Paid" ? "Cash" : (orderType === "Room Service" ? "Room Charge" : "Cash"), // Defaulting
      paymentStatus: status,
      invoiceType: "Restaurant"
    };

    try {
      const { data } = await axiosSecure.post("/pos/invoice", payload);
      if (data.success) {
        setCart([]);
        setLastInvoice(data.data);
        Swal.fire({
          title: "Success",
          text: `Order ${status === "Paid" ? "Paid" : "Placed"} successfully.`,
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "Print Receipt",
          cancelButtonText: "Close"
        }).then((result) => {
          if (result.isConfirmed) {
            setTimeout(() => handlePrint(), 100);
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
      <div className="flex-1 flex flex-col gap-4">
        {/* Horizontal Categories like ChillyPOS */}
        <div className="bg-white dark:bg-brand-charcoal rounded-xl shadow-sm p-3 flex gap-2 overflow-x-auto custom-scrollbar border border-gray-100 dark:border-gray-800 shrink-0">
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
      <div className="w-[420px] bg-white dark:bg-brand-charcoal rounded-xl shadow-lg flex flex-col border border-gray-100 dark:border-gray-800 shrink-0">
        
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
                     <option value="Dine In">Dine In</option>
                     <option value="Takeaway">Takeaway</option>
                     <option value="Delivery">Delivery</option>
                     <option value="Room Service">Room Service</option>
                     <option value="Foodpanda">Foodpanda</option>
                     <option value="Foodi">Foodi</option>
                     <option value="Pathao">Pathao</option>
                  </select>
               </div>
               
               {orderType === "Dine In" && (
                 <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block dark:text-gray-400">Change Table</label>
                    <select value={tableNo} onChange={(e) => setTableNo(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 text-sm font-medium dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:border-brand-primary">
                       <option value="">Select Table</option>
                       {tables.map(t => <option key={t._id} value={t.tableName}>{t.tableName}</option>)}
                    </select>
                 </div>
               )}

               {orderType === "Room Service" && (
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
                     <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Discount</label>
                     <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                           <input type="radio" name="discountScope" checked={discountScope === "Full"} onChange={() => setDiscountScope("Full")} className="cursor-pointer accent-brand-primary" /> Full
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                           <input type="radio" name="discountScope" checked={discountScope === "Item Wise"} onChange={() => setDiscountScope("Item Wise")} className="cursor-pointer accent-brand-primary" /> Item Wise
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
                     <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">VAT</label>
                     <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:border-brand-primary transition-colors">
                        <input type="text" value={vatValue} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setVatValue(raw === '' ? 0 : parseInt(raw, 10)); }} className="w-full p-2 text-sm outline-none bg-transparent min-w-0" />
                        <select value={vatType} onChange={e => setVatType(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 px-2 text-xs font-bold text-gray-600 dark:text-gray-300 outline-none cursor-pointer">
                           <option value="PERCENT">PERCENT</option>
                           <option value="FLAT">FLAT</option>
                        </select>
                     </div>
                  </div>
                  <div className="flex-1">
                     <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">S. Charge</label>
                     <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:border-brand-primary transition-colors">
                        <input type="text" value={serviceChargeValue} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setServiceChargeValue(raw === '' ? 0 : parseInt(raw, 10)); }} className="w-full p-2 text-sm outline-none bg-transparent min-w-0" />
                        <select value={serviceChargeType} onChange={e => setServiceChargeType(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 px-2 text-xs font-bold text-gray-600 dark:text-gray-300 outline-none cursor-pointer">
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
                        <span>VAT {vatType === "PERCENT" ? `(${vatValue}%)` : ''}</span>
                        <span className="font-bold">TK {vat.toFixed(2)}</span>
                     </div>
                  )}
                  {serviceChargeAmt > 0 && (
                     <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>S. Charge {serviceChargeType === "PERCENT" ? `(${serviceChargeValue}%)` : ''}</span>
                        <span className="font-bold">TK {serviceChargeAmt.toFixed(2)}</span>
                     </div>
                  )}
                  {deliveryAmt > 0 && (
                     <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>Delivery {deliveryChargeType === "PERCENT" ? `(${deliveryChargeValue}%)` : ''}</span>
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
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Name (Optional)</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. John Doe" className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg p-2.5 outline-none focus:border-brand-primary transition-colors" />
             </div>
             
             <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Phone (Optional)</label>
                <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g. 01700000000" className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg p-2.5 outline-none focus:border-brand-primary transition-colors" />
             </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-auto shrink-0">
           {/* Grand Total Bar */}
           <div className="bg-brand-primary p-3 px-4 flex justify-between items-center text-white">
              <span className="font-medium text-white/80">Total to Pay</span>
              <span className="font-black text-xl">TK {grandTotal.toFixed(2)}</span>
           </div>
           
           {/* Action Buttons */}
           <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-charcoal rounded-b-xl overflow-hidden">
              <button 
                disabled={loading || cart.length === 0}
                onClick={() => handleSubmitOrder("Paid")}
                className="py-3 px-2 font-bold text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:bg-gray-400"
              >
                 <span className="text-xs uppercase tracking-wider opacity-80">Pay</span>
                 <span className="text-sm">{grandTotal.toFixed(0)}</span>
              </button>
              
              <button 
                disabled={loading || cart.length === 0}
                className="py-3 px-2 font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
              >
                 <MdPrint size={18} className="text-gray-400" />
                 <span className="text-xs uppercase tracking-wider">Guest Bill</span>
              </button>

              <button 
                disabled={loading || cart.length === 0}
                onClick={() => handleSubmitOrder("Unpaid")}
                className="py-3 px-2 font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
              >
                 <span className="text-xs uppercase tracking-wider">Update</span>
                 <span className="text-xs font-normal text-gray-500 dark:text-gray-400">Send to Kitchen</span>
              </button>
           </div>
        </div>

      </div>

      {/* Hidden printer component */}
      {lastInvoice && <ReceiptPrint ref={printRef} invoice={lastInvoice} />}
    </div>
  );
}
