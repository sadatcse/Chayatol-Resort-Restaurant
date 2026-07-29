"use client";

import React from "react";
import { calculateCompleteness } from "@/lib/customerHelper";

// Reused everywhere a guest's profile completeness needs to show as a
// "Profile: X/10" pill + mini progress bar (search results, Folio Ledger, etc.)
const ProfileCompletenessBadge = ({ customer }) => {
  const score = calculateCompleteness(customer);
  const badgeClass = score <= 3
    ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50"
    : score <= 7
      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
      : score <= 9
        ? "bg-lime-50 text-lime-600 dark:bg-lime-950/30 dark:text-lime-400 border border-lime-200 dark:border-lime-900/50"
        : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";
  const barClass = score <= 3 ? "bg-red-500" : score <= 7 ? "bg-amber-500" : score <= 9 ? "bg-lime-500" : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
        Profile: {score}/10
      </span>
      <div className="w-12 bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  );
};

export default ProfileCompletenessBadge;
