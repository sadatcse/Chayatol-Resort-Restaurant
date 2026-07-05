"use client";

import React, { useState, useEffect } from "react";
import AuthProvider from "@/providers/AuthProvider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Global timezone monkey-patch
if (typeof window !== "undefined") {
  if (!window.__DATE_PATCHED__) {
    window.__DATE_PATCHED__ = true;
    window.__SYSTEM_TIMEZONE__ = "Asia/Dhaka"; // Default initial timezone

    const originalToLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = function (locales, options) {
      const tz = window.__SYSTEM_TIMEZONE__;
      const opts = { timeZone: tz, ...options };
      return originalToLocaleString.call(this, locales, opts);
    };

    const originalToLocaleDateString = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = function (locales, options) {
      const tz = window.__SYSTEM_TIMEZONE__;
      const opts = { timeZone: tz, ...options };
      return originalToLocaleDateString.call(this, locales, opts);
    };

    const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleTimeString = function (locales, options) {
      const tz = window.__SYSTEM_TIMEZONE__;
      const opts = { timeZone: tz, ...options };
      return originalToLocaleTimeString.call(this, locales, opts);
    };

    // Patch Intl.DateTimeFormat
    const OriginalDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function (locales, options) {
      const tz = window.__SYSTEM_TIMEZONE__;
      const opts = { timeZone: tz, ...options };
      return new OriginalDateTimeFormat(locales, opts);
    };
    Object.setPrototypeOf(Intl.DateTimeFormat, OriginalDateTimeFormat);
    Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
  }
}

export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      })
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true);
    });
    // Fetch dynamic timezone settings
    const fetchTz = async () => {
      try {
        const res = await fetch("/api/settings/controls");
        if (res.ok) {
          const data = await res.json();
          if (data && data.timeZone) {
            window.__SYSTEM_TIMEZONE__ = data.timeZone;
          }
        }
      } catch (err) {
        console.error("Error fetching system timezone:", err);
      }
    };
    fetchTz();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {mounted ? children : <div className="min-h-screen bg-brand-offwhite dark:bg-brand-charcoal" />}
        <ToastContainer position="top-right" autoClose={3000} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
