"use client";

import React, { useState, useEffect, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import useThemeMode from "@/hooks/useThemeMode";

export default function DashboardLayout({ children }) {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();
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

  if (loading || !user) {
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
          {children}
        </main>
      </div>
    </div>
  );
}
