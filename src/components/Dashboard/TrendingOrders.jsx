"use client";

import React, { useState, useEffect, useCallback } from 'react';
import useAxiosSecure from "@/hooks/useAxiosSecure";

export default function TrendingOrders() {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const axiosSecure = useAxiosSecure();

  const fetchTrendingOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axiosSecure.get("/pos/invoice/trending-orders");
      if (res.data) {
        setTrendingProducts(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch trending orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure]);

  useEffect(() => {
    fetchTrendingOrders();
  }, [fetchTrendingOrders]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-brand-charcoal p-6 rounded-3xl border border-brand-beige dark:border-brand-beige/20 shadow-sm w-full h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-brand-charcoal p-6 rounded-3xl border border-brand-beige dark:border-brand-beige/20 shadow-sm w-full">
      <div className="mb-6">
        <h3 className="text-md font-black uppercase tracking-widest text-brand-black dark:text-brand-offwhite">Trending Orders</h3>
        <p className="text-[10px] font-bold text-brand-sage uppercase tracking-wider mt-0.5">Top performing restaurant items this month</p>
      </div>

      {trendingProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingProducts.map((product, index) => (
            <div key={index} className="bg-slate-50 dark:bg-zinc-950 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden transition-all duration-300 hover:shadow-lg">
              <img
                src={product.imgSrc || "https://placehold.co/300x200?text=Food"}
                alt={product.name}
                className="w-full h-32 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://placehold.co/300x200?text=No+Img";
                }}
              />
              <div className="p-4 font-semibold text-xs text-gray-700 dark:text-zinc-350">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-extrabold text-sm text-gray-900 dark:text-zinc-150 truncate max-w-[120px]">{product.name}</p>
                  <p className="font-bold text-blue-650 dark:text-blue-400">
                    ৳ {product.price.toFixed(0)}
                  </p>
                </div>
                <div className="flex justify-between items-center text-[10px] border-t border-gray-200 dark:border-zinc-800/80 pt-2 mt-2">
                  <p className="text-gray-400">
                    Qty: <span className="font-extrabold text-gray-800 dark:text-zinc-200">{product.orders} units</span>
                  </p>
                  <p className="text-gray-400">
                    Gross: <span className="font-extrabold text-gray-850 dark:text-zinc-100">৳ {product.income.toFixed(0)}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-zinc-500 py-12 text-sm">No food sales transactions tracked yet.</p>
      )}
    </div>
  );
}
