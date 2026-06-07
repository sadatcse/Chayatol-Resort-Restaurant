"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import useFood from "@/hooks/useFood";
import useFoodCategories from "@/hooks/useFoodCategories";
import { MdAdd, MdRemove, MdDelete, MdPrint, MdCheckCircle, MdReceiptLong } from "react-icons/md";
import CheckoutModal from "@/components/pos/CheckoutModal";
import ReceiptPrint from "@/components/pos/ReceiptPrint";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";

export default function POSPage() {
  const { foods, isLoading: foodsLoading } = useFood(1, 1000);
  const { categories, isLoading: categoriesLoading } = useFoodCategories(1, 100);

  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  
  // Tax & Discount States
  const [discountPercent, setDiscountPercent] = useState(0);
  const [vatPercent, setVatPercent] = useState(0); // Optional default VAT
  const [sdPercent, setSdPercent] = useState(0); // Optional default SD
  const [serviceChargeAmt, setServiceChargeAmt] = useState(0);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  const printRef = useRef(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

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
        category: "Food",
        quantity: 1,
        unitPrice: food.price,
        totalPrice: food.price
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
  const discount = (subTotal * discountPercent) / 100;
  const subTotalAfterDiscount = subTotal - discount;
  const vat = (subTotalAfterDiscount * vatPercent) / 100;
  const sd = (subTotalAfterDiscount * sdPercent) / 100;
  const grandTotal = subTotalAfterDiscount + vat + sd + Number(serviceChargeAmt);

  const handleCheckoutSuccess = (invoiceData) => {
    setCart([]);
    setIsCheckoutOpen(false);
    setLastInvoice(invoiceData);
    Swal.fire({
      title: "Success",
      text: "Invoice Generated. Do you want to print the receipt?",
      icon: "success",
      showCancelButton: true,
      confirmButtonText: "Print Receipt",
      cancelButtonText: "Close"
    }).then((result) => {
      if (result.isConfirmed) {
        setTimeout(() => handlePrint(), 100);
      }
    });
  };

  if (foodsLoading || categoriesLoading) {
    return <div className="flex h-full items-center justify-center"><span className="loading loading-spinner text-brand-primary loading-lg"></span></div>;
  }

  return (
    <div className="h-[calc(100vh-100px)] flex gap-4">
      {/* LEFT: Categories Sidebar */}
      <div className="w-48 bg-white dark:bg-brand-charcoal rounded-xl shadow-md p-4 overflow-y-auto custom-scrollbar flex flex-col gap-2 border border-brand-beige/50 dark:border-brand-dark-grey/50">
        <h3 className="font-bold mb-2 text-brand-dark-grey dark:text-gray-300 uppercase text-sm tracking-wider">Categories</h3>
        <button 
          onClick={() => setActiveCategory("All")}
          className={`text-left px-4 py-2 rounded-lg font-medium transition-colors ${activeCategory === "All" ? "bg-brand-primary text-white" : "hover:bg-brand-beige/50 dark:hover:bg-brand-dark-grey dark:text-gray-200"}`}
        >
          All Items
        </button>
        {categories.map(cat => (
          <button 
            key={cat._id}
            onClick={() => setActiveCategory(cat.categoryName)}
            className={`text-left px-4 py-2 rounded-lg font-medium transition-colors ${activeCategory === cat.categoryName ? "bg-brand-primary text-white" : "hover:bg-brand-beige/50 dark:hover:bg-brand-dark-grey dark:text-gray-200"}`}
          >
            {cat.categoryName}
          </button>
        ))}
      </div>

      {/* MIDDLE: Food Grid */}
      <div className="flex-1 bg-white dark:bg-brand-charcoal rounded-xl shadow-md p-4 overflow-y-auto custom-scrollbar border border-brand-beige/50 dark:border-brand-dark-grey/50">
        <h2 className="text-xl font-bold mb-4 dark:text-white">{activeCategory} Menu</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFoods.map(food => (
            <div 
              key={food._id} 
              onClick={() => addToCart(food)}
              className="border border-brand-beige dark:border-brand-dark-grey rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-brand-primary transition-all group relative bg-white dark:bg-gray-800"
            >
              <div className="h-28 w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden relative">
                 {food.image ? (
                    <img src={food.image} alt={food.foodName} className="object-cover w-full h-full group-hover:scale-110 transition-transform" />
                 ) : (
                    <span className="text-gray-400 text-xs uppercase">No Image</span>
                 )}
                 <div className="absolute inset-0 bg-brand-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <MdAdd className="text-white text-3xl" />
                 </div>
              </div>
              <div className="p-3">
                <h4 className="font-semibold text-sm line-clamp-2 leading-tight mb-1 dark:text-gray-200">{food.foodName}</h4>
                <p className="text-brand-primary font-bold text-sm">৳ {food.price}</p>
              </div>
            </div>
          ))}
          {filteredFoods.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-400">No items found in this category.</div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart Panel */}
      <div className="w-80 bg-white dark:bg-brand-charcoal rounded-xl shadow-md flex flex-col border border-brand-beige/50 dark:border-brand-dark-grey/50">
        <div className="p-4 border-b border-brand-beige/50 dark:border-brand-dark-grey/50 bg-brand-primary text-white rounded-t-xl flex justify-between items-center">
          <h2 className="text-lg font-bold">Current Order</h2>
          <span className="bg-white/20 px-2 py-0.5 rounded text-sm">{cart.length} items</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <MdReceiptLong className="text-4xl opacity-50" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cart.map(item => (
                <div key={item.foodId} className="flex flex-col border-b border-gray-100 dark:border-gray-700 pb-2">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm dark:text-gray-200 leading-tight pr-2">{item.itemName}</span>
                    <button onClick={() => removeFromCart(item.foodId)} className="text-red-500 hover:text-red-700 p-1"><MdDelete /></button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
                      <button onClick={() => updateQuantity(item.foodId, -1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><MdRemove className="dark:text-gray-300" /></button>
                      <span className="w-6 text-center text-sm font-medium dark:text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.foodId, 1)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><MdAdd className="dark:text-gray-300" /></button>
                    </div>
                    <span className="font-bold text-brand-dark-grey dark:text-gray-200 text-sm">৳ {item.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-brand-beige/50 dark:border-brand-dark-grey/50 bg-gray-50 dark:bg-brand-dark-grey rounded-b-xl flex flex-col gap-2">
          <div className="flex justify-between text-sm dark:text-gray-300">
            <span>Subtotal</span>
            <span>৳ {subTotal.toFixed(2)}</span>
          </div>

          {/* Quick Controls */}
          <div className="grid grid-cols-2 gap-2 my-1">
             <div>
               <label className="text-xs text-gray-500 dark:text-gray-400">Discount (%)</label>
               <input type="number" min="0" max="100" value={discountPercent} onChange={(e)=>setDiscountPercent(Number(e.target.value))} className="w-full text-xs p-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
             </div>
             <div>
               <label className="text-xs text-gray-500 dark:text-gray-400">VAT (%)</label>
               <input type="number" min="0" max="100" value={vatPercent} onChange={(e)=>setVatPercent(Number(e.target.value))} className="w-full text-xs p-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
             </div>
             <div>
               <label className="text-xs text-gray-500 dark:text-gray-400">SD (%)</label>
               <input type="number" min="0" max="100" value={sdPercent} onChange={(e)=>setSdPercent(Number(e.target.value))} className="w-full text-xs p-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
             </div>
             <div>
               <label className="text-xs text-gray-500 dark:text-gray-400">S. Charge (৳)</label>
               <input type="number" min="0" value={serviceChargeAmt} onChange={(e)=>setServiceChargeAmt(Number(e.target.value))} className="w-full text-xs p-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
             </div>
          </div>

          <div className="flex justify-between font-bold text-lg text-brand-primary pt-2 border-t border-gray-200 dark:border-gray-700 mt-1">
            <span>Total</span>
            <span>৳ {grandTotal.toFixed(2)}</span>
          </div>

          <div className="flex gap-2 mt-2">
             <button 
                onClick={() => setCart([])} 
                disabled={cart.length === 0}
                className="w-1/3 py-2 rounded-lg bg-red-100 text-red-600 font-medium hover:bg-red-200 disabled:opacity-50"
             >
               Clear
             </button>
             <button 
                onClick={() => setIsCheckoutOpen(true)}
                disabled={cart.length === 0}
                className="w-2/3 py-2 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90 flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-primary/30"
             >
               <MdCheckCircle /> Checkout
             </button>
          </div>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        cart={cart}
        subTotal={subTotal}
        vat={vat}
        sd={sd}
        serviceCharge={serviceChargeAmt}
        discount={discount}
        grandTotal={grandTotal}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Hidden Print Receipt */}
      {lastInvoice && <ReceiptPrint ref={printRef} invoice={lastInvoice} />}

    </div>
  );
}
