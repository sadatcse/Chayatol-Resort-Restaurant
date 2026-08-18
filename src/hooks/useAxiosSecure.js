"use client";

import axios from "axios";
import { AuthContext } from "../providers/AuthProvider";
import { useContext, useEffect } from "react";

const axiosSecure = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  // On a slow/flaky connection an unbounded request can hang indefinitely,
  // leaving staff unsure whether it worked and prone to clicking "post"
  // again — which is what creates duplicate charges/orders. Failing fast
  // gives a clear error so a retry is a deliberate, informed action instead.
  timeout: 30000,
});

// Read by the interceptor below; kept in sync with the latest logged-in user
// via a useEffect in the hook (never written during render — mutating
// module-level state from a component body is unsafe: React may skip
// re-invoking a "pure" render, silently leaving stale values behind).
const authState = { email: "Unknown User", name: "Unknown User", ip: "Unknown IP" };

// Registered once, at module load, on the shared axios instance — not
// inside the hook body, which previously re-registered a new pair of
// interceptors on every render of every component calling useAxiosSecure()
// (115 call sites app-wide), leaking memory and slowing every request over
// a long-running session (e.g. a POS terminal left open a full shift).
axiosSecure.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Attach user data in headers for every request
    config.headers["X-User-Email"] = authState.email;
    config.headers["X-User-Name"] = authState.name;
    config.headers["X-User-IP"] = authState.ip;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosSecure.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized or Token expired");
    }
    return Promise.reject(error);
  }
);

const useAxiosSecure = () => {
  const { user, clientIP } = useContext(AuthContext);

  useEffect(() => {
    authState.email = user?.email || "Unknown User";
    authState.name = user?.name || "Unknown User";
    authState.ip = clientIP || "Unknown IP";
  }, [user, clientIP]);

  return axiosSecure;
};

export default useAxiosSecure;
