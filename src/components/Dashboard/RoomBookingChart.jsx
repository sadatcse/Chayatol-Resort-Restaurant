"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import useAxiosSecure from "@/hooks/useAxiosSecure";

export default function RoomBookingChart() {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const axiosSecure = useAxiosSecure();

  const fetchRoomBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axiosSecure.get("/reservations/booking-timings");
      if (res.data) {
        setChartData(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch room checkin timings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure]);

  useEffect(() => {
    fetchRoomBookings();
  }, [fetchRoomBookings]);

  return (
    <div className="bg-white dark:bg-brand-charcoal p-6 rounded-3xl border border-brand-beige dark:border-brand-beige/20 shadow-sm flex flex-col justify-between h-96">
      <div>
        <h3 className="text-md font-black uppercase tracking-widest text-brand-black dark:text-brand-offwhite">Room Check-Ins (This Month)</h3>
        <p className="text-[10px] font-bold text-brand-sage uppercase tracking-wider mt-0.5">Guest check-ins logs per day</p>
      </div>

      <div className="flex-1 w-full mt-4 flex items-center justify-center">
        {isLoading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="dark:opacity-10" />
              <XAxis dataKey="day" tick={{ fill: "#888888", fontSize: 10 }} />
              <YAxis tick={{ fill: "#888888", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.95)", 
                  borderRadius: "1rem", 
                  border: "1px solid #ccc",
                  fontSize: 12
                }}
              />
              <Area type="monotone" dataKey="bookings" stroke="#10b981" fillOpacity={1} fill="url(#colorBookings)" name="Check-ins" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 dark:text-zinc-500 text-sm">No room stays logs recorded this month.</p>
        )}
      </div>
    </div>
  );
}
