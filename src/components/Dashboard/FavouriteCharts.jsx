"use client";

import React, { useState, useEffect, useCallback } from "react";
import useAxiosSecure from "@/hooks/useAxiosSecure";

export default function FavouriteCharts() {
  const [activeTab, setActiveTab] = useState("monday");
  const [performanceData, setPerformanceData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const axiosSecure = useAxiosSecure();

  const dayShortMap = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };

  const dayOrder = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const fetchPerformanceData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosSecure.get("/pos/invoice/monthly-item-sales");
      const fetchedData = response.data?.data || [];

      const transformed = {};
      fetchedData.forEach((day) => {
        const key = day.dayName.toLowerCase();
        transformed[key] = day.topProducts.map((product) => ({
          name: product.productName,
          qty: product.currentMonth.totalQty,
          orders: parseFloat(product.percentageChange.qtyChange),
        }));
      });

      setPerformanceData(transformed);
      
      const firstDay = fetchedData[0]?.dayName?.toLowerCase();
      if (firstDay) setActiveTab(firstDay);
    } catch (e) {
      console.error("Failed to fetch performance data:", e);
      setError("Could not load performance data.");
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  const renderTable = (data) => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left text-gray-600 dark:text-zinc-400">
        <thead className="text-[10px] text-gray-700 dark:text-zinc-300 uppercase bg-gray-50 dark:bg-zinc-800">
          <tr>
            <th className="px-4 py-2 rounded-l-lg font-bold">Food Item</th>
            <th className="px-4 py-2 font-bold">Qty Sold</th>
            <th className="px-4 py-2 rounded-r-lg font-bold">MoM Growth</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/60 font-semibold">
          {data?.map((item) => (
            <tr key={item.name} className="bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/40">
              <td className="px-4 py-3 text-gray-800 dark:text-zinc-200">{item.name}</td>
              <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-bold">{item.qty} units</td>
              <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
                +{item.orders.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white dark:bg-brand-charcoal rounded-3xl border border-brand-beige dark:border-brand-beige/20 shadow-sm flex flex-col justify-between h-96">
      <div className="p-5 border-b border-brand-beige/50 dark:border-brand-beige/10">
        <h3 className="text-md font-black uppercase tracking-widest text-brand-black dark:text-brand-offwhite">Favourite Food</h3>
        <p className="text-[10px] font-bold text-brand-sage uppercase tracking-wider mt-0.5">Top performing items by weekday</p>
      </div>
      
      <div className="flex-grow flex flex-col justify-between overflow-hidden">
        <div className="border-b border-brand-beige/30 dark:border-brand-beige/5">
          <nav className="flex space-x-2 px-4" aria-label="Tabs">
            {dayOrder
              .filter((day) => performanceData[day])
              .map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveTab(day)}
                  className={`${
                    activeTab === day
                      ? "border-blue-500 text-blue-600 dark:text-blue-400 font-bold"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-350"
                  } whitespace-nowrap py-3 px-2.5 border-b-2 text-xs font-semibold cursor-pointer`}
                >
                  {dayShortMap[day]}
                </button>
              ))}
          </nav>
        </div>
        
        <div className="p-4 flex-grow overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <p className="text-red-500 text-xs text-center">{error}</p>
          ) : performanceData[activeTab] && performanceData[activeTab].length > 0 ? (
            renderTable(performanceData[activeTab])
          ) : (
            <p className="text-gray-500 dark:text-zinc-500 text-xs text-center py-12">No sales data logged for this weekday.</p>
          )}
        </div>
      </div>
    </div>
  );
}
