"use client";

import React, { useState, useEffect, useCallback, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthContext } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import useThemeMode from "@/hooks/useThemeMode";
import useUserPermissions from "@/hooks/useUserPermissions";
import { FiLock } from "react-icons/fi";

export default function DashboardLayout({ children }) {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();
  const { mode } = useThemeMode();

  // Initialize based on screen width
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSidebarOpen(window.innerWidth > 768);
    }
  }, []);

  // Handle auto-collapse on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { hasPermission, loading: permLoading } = useUserPermissions();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const isSuperadmin = user?.role === "superadmin";
  const hasViewPermission = isSuperadmin ||
    pathname === "/dashboard/home" ||
    pathname === "/dashboard/profile" ||
    pathname === "/dashboard" ||
    hasPermission(pathname, "view");

  const showLoading = loading || (!isSuperadmin && permLoading);

  if (showLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-brand-offwhite dark:bg-brand-charcoal">
        <span className="loading loading-spinner loading-lg text-brand-primary"></span>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-offwhite dark:bg-brand-charcoal transition-colors duration-300 text-brand-charcoal dark:text-brand-offwhite">
      {/* Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        mode={mode}
      />

      {/* Content Wrapper */}
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? "md:ml-64" : "md:ml-20"
          }`}
      >
        <Header
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          {hasViewPermission ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-brand-white dark:bg-brand-charcoal rounded-3xl shadow-xl border border-brand-beige/50 dark:border-brand-dark-grey/50 max-w-xl mx-auto mt-12">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-5">
                <FiLock className="text-3xl" />
              </div>
              <h1 className="text-2xl font-bold mb-3 text-brand-black dark:text-brand-offwhite">Access Restricted</h1>
              <p className="text-brand-dark-grey dark:text-brand-sage text-sm leading-relaxed max-w-sm mb-6">
                You do not have permission to view this section. Please contact your administrator if you believe this is an error.
              </p>
              <button 
                onClick={() => router.push("/dashboard/home")}
                className="btn bg-brand-primary text-white border-none rounded-xl hover:bg-brand-secondary font-semibold text-xs px-6 py-2.5 transition-all duration-300 cursor-pointer"
              >
                Go Back Home
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
