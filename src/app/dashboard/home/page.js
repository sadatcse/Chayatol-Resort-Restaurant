"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiClock, FiActivity, FiArrowRight } from "react-icons/fi";
import Link from "next/link";
import { motion } from "framer-motion";

import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import OrderTimingChart from "@/components/Dashboard/OrderTimingChart";
import RoomBookingChart from "@/components/Dashboard/RoomBookingChart";
import FavouriteCharts from "@/components/Dashboard/FavouriteCharts";
import TrendingOrders from "@/components/Dashboard/TrendingOrders";

const HomePage = () => {
  const axiosSecure = useAxiosSecure();
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayExpense: 0,
    monthlyRevenue: 0,
    monthlyExpense: 0,
    netProfit: 0,
    pendingSupplierDue: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosSecure.get("/finance/dashboard");
      setStats(data || {
        todayRevenue: 0,
        todayExpense: 0,
        monthlyRevenue: 0,
        monthlyExpense: 0,
        netProfit: 0,
        pendingSupplierDue: 0
      });
    } catch (error) {
      console.error("Error fetching dashboard statistics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center bg-brand-offwhite dark:bg-brand-charcoal">
        <MtableLoading />
      </div>
    );
  }

  // Calculate percentage of expenses vs revenue for visual meters
  const monthlyExpenseRatio = stats.monthlyRevenue > 0
    ? (stats.monthlyExpense / stats.monthlyRevenue) * 100
    : 0;

  const cardsData = [
    {
      title: "Today's Revenue",
      value: stats.todayRevenue,
      icon: <FiDollarSign className="w-5 h-5" />,
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
      description: "Bookings + POS sales today"
    },
    {
      title: "Today's Expense",
      value: stats.todayExpense,
      icon: <FiTrendingDown className="w-5 h-5" />,
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      description: "General overhead paid today"
    },
    {
      title: "Monthly Revenue",
      value: stats.monthlyRevenue,
      icon: <FiTrendingUp className="w-5 h-5" />,
      color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
      description: "Receipts for current month"
    },
    {
      title: "Monthly Expense",
      value: stats.monthlyExpense,
      icon: <FiActivity className="w-5 h-5" />,
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      description: "Expenses + Purchases"
    },
    {
      title: "Net Profit",
      value: stats.netProfit,
      icon: <FiDollarSign className="w-5 h-5" />,
      color: stats.netProfit >= 0
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : "bg-red-500/10 text-red-600 dark:text-red-400",
      description: "Monthly Revenue - Expense"
    },
    {
      title: "Pending Supplier Due",
      value: stats.pendingSupplierDue,
      icon: <FiClock className="w-5 h-5" />,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      description: "Unpaid vendor purchases"
    }
  ];

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite font-sans animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-brand-black dark:text-brand-offwhite">Resort Executive Dashboard</h1>
          <p className="text-xs font-bold text-brand-sage uppercase tracking-widest mt-1">Live resort operational summaries & metrics</p>
        </div>
        <div className="text-xs font-mono font-bold text-brand-sage bg-white dark:bg-brand-charcoal/50 p-2.5 rounded-xl border border-brand-beige/50 dark:border-brand-dark-grey/50">
          Last Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {cardsData.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-brand-charcoal p-5 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 flex flex-col justify-between h-40"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-brand-sage uppercase tracking-widest leading-none">{card.title}</span>
              <div className={`p-2 rounded-full ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-black font-mono tracking-tight leading-none text-brand-black dark:text-brand-offwhite">
                ৳{card.value.toLocaleString()}
              </span>
            </div>
            <div className="text-[10px] font-semibold text-brand-sage/80 truncate">
              {card.description}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Monthly Performance Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left chart card */}
        <div className="lg:col-span-2 bg-white dark:bg-brand-charcoal p-6 rounded-3xl border border-brand-beige dark:border-brand-beige/20 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-md font-black uppercase tracking-widest text-brand-black dark:text-brand-offwhite">Monthly Revenue vs Expenses</h3>
              <p className="text-[10px] font-bold text-brand-sage uppercase tracking-wider mt-0.5">Budget Balance analysis</p>
            </div>
            <span className="badge border-none font-bold text-[10px] uppercase bg-brand-primary/10 text-brand-primary px-3 py-2 rounded-full">Current Cycle</span>
          </div>

          <div className="space-y-6 pt-4">
            {/* Revenue bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span>Monthly Revenues</span>
                <span className="font-mono text-brand-primary font-black">৳{stats.monthlyRevenue.toLocaleString()}</span>
              </div>
              <div className="w-full bg-brand-offwhite dark:bg-brand-dark-grey/50 rounded-full h-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: stats.monthlyRevenue > 0 ? "100%" : "0%" }}
                  transition={{ duration: 0.8 }}
                  className="bg-brand-primary h-full rounded-full"
                />
              </div>
            </div>

            {/* Expense bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span>Monthly Expenses</span>
                <span className="font-mono text-rose-500 font-black">৳{stats.monthlyExpense.toLocaleString()} ({monthlyExpenseRatio.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-brand-offwhite dark:bg-brand-dark-grey/50 rounded-full h-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(monthlyExpenseRatio, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  className="bg-rose-500 h-full rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Budget comment */}
          <div className="text-xs text-brand-sage leading-relaxed pt-2 border-t border-brand-beige/50 dark:border-brand-beige/10">
            {stats.netProfit >= 0 ? (
              <span>Your resort is currently operating with a healthy budget surplus of <strong className="text-green-600">৳{stats.netProfit.toLocaleString()}</strong> for this month.</span>
            ) : (
              <span>Caution: Monthly expenses exceed revenue by <strong className="text-red-500">৳{Math.abs(stats.netProfit).toLocaleString()}</strong>. Review operating costs.</span>
            )}
          </div>
        </div>

        {/* Right navigation cards */}
        <div className="bg-white dark:bg-brand-charcoal p-6 rounded-3xl border border-brand-beige dark:border-brand-beige/20 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-md font-black uppercase tracking-widest text-brand-black dark:text-brand-offwhite">Financial Modules</h3>
            <p className="text-xs text-brand-sage leading-relaxed">
              Navigate directly to full-fledged corporate accounting reports, billing registers, and categories.
            </p>
          </div>

          <div className="space-y-3 pt-6">
            <Link href="/dashboard/finance/expenses" className="btn btn-outline border-brand-primary hover:bg-brand-primary text-brand-primary hover:text-white rounded-2xl w-full justify-between px-5 font-bold uppercase tracking-widest text-xs h-12 flex items-center">
              <span>Expense Entry Ledger</span>
              <FiArrowRight />
            </Link>

            <Link href="/dashboard/finance/profit-loss" className="btn btn-outline border-brand-primary hover:bg-brand-primary text-brand-primary hover:text-white rounded-2xl w-full justify-between px-5 font-bold uppercase tracking-widest text-xs h-12 flex items-center">
              <span>Profit & Loss statement</span>
              <FiArrowRight />
            </Link>

            <Link href="/dashboard/finance/cash-flow" className="btn btn-outline border-brand-primary hover:bg-brand-primary text-brand-primary hover:text-white rounded-2xl w-full justify-between px-5 font-bold uppercase tracking-widest text-xs h-12 flex items-center">
              <span>Cash Flow Statement</span>
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>

      {/* Operational & Booking Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8">
        <OrderTimingChart />
        <RoomBookingChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 my-8">
        <div className="lg:col-span-1">
          <FavouriteCharts />
        </div>
        <div className="lg:col-span-2">
          <TrendingOrders />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
