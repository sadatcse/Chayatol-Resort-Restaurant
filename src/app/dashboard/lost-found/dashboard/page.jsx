"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FiArchive, FiCheckCircle, FiFileText, FiClock, FiAlertTriangle, FiTrendingUp } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import { MonthlyStatsChart, CategoryPieChart, LocationBarChart } from "@/components/lost-found/DashboardCharts";

export default function LostFoundDashboardPage() {
  const axiosSecure = useAxiosSecure();

  // Query: Fetch Dashboard Statistics
  const { data, isLoading } = useQuery({
    queryKey: ["lostFoundDashboardData"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/lost-found/dashboard");
      return data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  if (isLoading) {
    return <MtableLoading />;
  }

  const { cards = {}, charts = {}, recentActivities = [] } = data || {};

  const statsCardsList = [
    {
      label: "Total Found Items",
      value: cards.totalFound || 0,
      icon: <FiFileText size={22} />,
      colorClass: "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400",
    },
    {
      label: "Active Stored Items",
      value: cards.activeItems || 0,
      icon: <FiArchive size={22} />,
      colorClass: "bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400",
    },
    {
      label: "Pending Claims",
      value: cards.pendingClaims || 0,
      icon: <FiClock size={22} />,
      colorClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400",
    },
    {
      label: "Returned to Owner",
      value: cards.returnedItems || 0,
      icon: <FiCheckCircle size={22} />,
      colorClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400",
    },
    {
      label: "Expired Items",
      value: cards.expiredItems || 0,
      icon: <FiAlertTriangle size={22} />,
      colorClass: "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400",
    },
    {
      label: "High Value Priority",
      value: cards.highValueItems || 0,
      icon: <FiTrendingUp size={22} />,
      colorClass: "bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400",
    },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader title="Lost & Found Dashboard" subtitle="Overview of lost property lifecycle, claims, and returns" />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statsCardsList.map((card, idx) => (
          <div
            key={idx}
            className="card bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/10 p-5 rounded-2xl shadow-sm flex flex-row items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`p-4 rounded-2xl ${card.colorClass}`}>
              {card.icon}
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-brand-sage">
                {card.label}
              </span>
              <span className="text-2xl font-black text-brand-charcoal dark:text-brand-offwhite">
                {card.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Found & Returned */}
        <div className="card lg:col-span-2 bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/10 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal dark:text-brand-offwhite mb-4">
            Monthly Recovery & Handover Volume
          </h3>
          <MonthlyStatsChart data={charts.monthlyData} />
        </div>

        {/* Category Distribution */}
        <div className="card bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/10 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal dark:text-brand-offwhite mb-4">
            Category Breakdown
          </h3>
          <CategoryPieChart data={charts.categoryDistribution} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Location distribution */}
        <div className="card bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/10 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal dark:text-brand-offwhite mb-4">
            Location Breakdown
          </h3>
          <LocationBarChart data={charts.locationDistribution} />
        </div>

        {/* Recent Activity Timeline Widget */}
        <div className="card lg:col-span-2 bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/10 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal dark:text-brand-offwhite mb-4">
            Recent Activity Log
          </h3>
          <div className="divide-y divide-brand-beige/10 dark:divide-brand-beige/5 space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {recentActivities.length > 0 ? (
              recentActivities.map((act) => (
                <div key={act._id} className="pt-4 first:pt-0 flex justify-between items-start text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-brand-charcoal dark:text-brand-offwhite uppercase tracking-wider">
                      {act.action}
                    </p>
                    <p className="text-[10px] text-brand-sage">
                      Item: <span className="font-bold">{act.itemId?.name || "N/A"} ({act.itemId?.itemCode || "—"})</span>
                    </p>
                    <p className="text-[9px] text-brand-sage/60 font-mono">
                      Performed by: {act.performedBy?.name || "System"} • IP: {act.ipAddress}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-brand-sage/75 shrink-0">
                    {new Date(act.createdAt).toLocaleDateString()} {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-brand-sage font-bold uppercase tracking-wider text-[10px]">
                No recent activities.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
