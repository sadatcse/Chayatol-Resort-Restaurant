"use client";

import React from "react";
import { FiAlertCircle } from "react-icons/fi";

// Shown when a guest search returns zero matches, so staff know why the
// "Register New Guest" form popped open instead of it happening silently.
const GuestNotFoundNotice = ({ query }) => (
  <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg animate-fade-in">
    <FiAlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={14} />
    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
      No guest found matching &quot;{query}&quot;. Please fill in the form below to register them as a new guest.
    </span>
  </div>
);

export default GuestNotFoundNotice;
