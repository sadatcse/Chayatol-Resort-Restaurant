"use client";

import { useState, useEffect } from "react";

export default function useThemeMode() {
  const THEME_KEY = "theme";
  const MANUAL_KEY = "manualThemeSet";

  const [isManual, setIsManual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("light");

  // Fetch initial preferences on client-side mount
  useEffect(() => {
    const savedMode = localStorage.getItem(THEME_KEY);
    const savedManual = localStorage.getItem(MANUAL_KEY) === "true";

    setIsManual(savedManual);

    if (savedMode) {
      setMode(savedMode);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? "dark" : "light");
    }
    setLoading(false);
  }, []);

  // Effect: Handles state -> side effects (Save to storage and apply CSS class)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, mode);
      localStorage.setItem(MANUAL_KEY, isManual ? "true" : "false");
      document.documentElement.classList.toggle("dark", mode === "dark");
    }
  }, [mode, isManual]);

  // Effect: Handles external events -> state change (Real-time sync)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (event) => {
      if (event.key === THEME_KEY && event.newValue && event.newValue !== mode) {
        setMode(event.newValue);
      }
      if (event.key === MANUAL_KEY) {
        setIsManual(event.newValue === "true");
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemModeChange = (e) => {
      if (!isManual) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemModeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      mediaQuery.removeEventListener('change', handleSystemModeChange);
    };
  }, [isManual, mode]);

  const toggleMode = () => {
    setIsManual(true);
    setMode(prev => (prev === "light" ? "dark" : "light"));
  };

  return { mode, toggleMode, loading };
}
