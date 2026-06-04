"use client";

import React from "react";
import AuthProvider from "@/providers/AuthProvider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
      <ToastContainer position="top-right" autoClose={3000} />
    </AuthProvider>
  );
}
