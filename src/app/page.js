"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { AuthContext } from "@/providers/AuthProvider";

// Import assets
import loginPanelImage from "@/assets/Background/Login.jpg";
import Logo from "@/assets/Logo/logo.png";
import Logo_Dark from "@/assets/Logo/logo_dark.png";

const Login = () => {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("light");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const router = useRouter();
  const { loginUser } = useContext(AuthContext);

  useEffect(() => {
    setMounted(true);
    const savedEmail = localStorage.getItem("email");
    const savedPassword = localStorage.getItem("password");
    const savedTheme = localStorage.getItem("theme");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    let valid = true;
    if (!validateEmail(email)) {
      setEmailError("Enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }
    if (!valid) return;

    setLoading(true);
    try {
      await loginUser(email, password);
      if (rememberMe) {
        localStorage.setItem("email", email);
        localStorage.setItem("password", password);
      } else {
        localStorage.removeItem("email");
        localStorage.removeItem("password");
      }
      setLoading(false);
      toast.success("Login Successful! Welcome back!");
      router.push("/dashboard/home");
    } catch (error) {
      setLoading(false);
      Swal.fire("Login Failed!", "Invalid email or password. Please try again.", "error");
    }
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    setShowForgotModal(false);
    Swal.fire("Request Sent", "If an account exists, a reset link will be sent.", "success");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-offwhite via-brand-white to-brand-beige dark:from-brand-charcoal dark:via-brand-dark-grey dark:to-brand-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-brand-primary font-medium tracking-widest text-xs uppercase animate-pulse">Loading Chayatol...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Premium Theme Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-6 right-8 z-40"
      >
        <button
          onClick={handleThemeToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm font-medium transition-all duration-300 cursor-pointer ${theme === "dark"
            ? "bg-brand-charcoal border-brand-dark-grey text-brand-offwhite hover:bg-brand-dark-grey"
            : "bg-brand-white border-brand-beige text-brand-dark-grey hover:bg-brand-offwhite"
            }`}
        >
          {theme === "dark" ? (
            <>
              <span className="text-yellow-400">☀️</span>
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <span className="text-indigo-400">🌙</span>
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </motion.div>

      {/* Main Container */}
      <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-500 ${theme === "dark"
        ? "bg-gradient-to-br from-brand-charcoal via-brand-dark-grey to-brand-black"
        : "bg-gradient-to-br from-brand-offwhite via-brand-white to-brand-beige"
        }`}>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`flex rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full border transition-all duration-300 ${theme === "dark"
          ? "bg-brand-charcoal/90 border-brand-dark-grey/50"
          : "bg-brand-white/95 border-brand-beige/50"
          }`}>

          {/* Left Panel (Image with elegant Brand Overlay) */}
          <div
            className="hidden md:block md:w-1/2 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${loginPanelImage.src})` }}
          >
            {/* Elegant overlay using brand forest green and bronze gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-secondary/95 via-brand-primary/50 to-transparent flex flex-col justify-end p-10 text-brand-white">
              <span className="text-brand-sage font-bold tracking-widest text-xs uppercase mb-2">Welcome to Chayatol</span>
              <h1 className="text-3xl font-extrabold leading-tight mb-3 tracking-wide">
                Chayatol Resort <br /> & Restaurant
              </h1>
              <p className="text-sm text-brand-offwhite/90 leading-relaxed max-w-xs font-light">
                Manage your resort portal, guest reservations, and user records in one place.
              </p>
              <div className="mt-8 flex gap-1.5">
                <span className="w-8 h-1 rounded-full bg-brand-sage"></span>
                <span className="w-2 h-1 rounded-full bg-brand-offwhite/50"></span>
                <span className="w-2 h-1 rounded-full bg-brand-offwhite/50"></span>
              </div>
            </div>
          </div>

          {/* Right Panel (Form) */}
          <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
            {/* Brand Logo */}
            <div className="flex justify-center mb-6">
              <img
                src={theme === "dark" ? Logo_Dark.src : Logo.src}
                alt="Chayatol Logo"
                className="w-40 h-auto object-contain transition-all hover:scale-105 duration-300"
              />
            </div>

            <h2 className={`text-2xl font-bold text-center tracking-tight ${theme === "dark" ? "text-brand-offwhite" : "text-brand-charcoal"}`}>
              Login to Portal
            </h2>
            <p className="text-center mb-8 text-xs text-brand-dark-grey dark:text-brand-sage">
              Please enter your credentials to continue
            </p>

            <form onSubmit={handleLogin} noValidate className="space-y-5">
              {/* Email Input */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === "dark" ? "text-brand-sage" : "text-brand-primary"}`} htmlFor="loginEmail">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="loginEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 ${theme === "dark"
                      ? "bg-brand-dark-grey border-brand-dark-grey text-brand-offwhite placeholder-brand-sage/60"
                      : "bg-brand-offwhite/50 border-brand-beige text-brand-charcoal placeholder-brand-dark-grey/60"
                      }`}
                    required
                  />
                </div>
                {emailError && <div className="text-brand-bronze text-xs mt-1 font-medium">{emailError}</div>}
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${theme === "dark" ? "text-brand-sage" : "text-brand-primary"}`} htmlFor="loginPassword">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="loginPassword"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 ${theme === "dark"
                      ? "bg-brand-dark-grey border-brand-dark-grey text-brand-offwhite placeholder-brand-sage/60"
                      : "bg-brand-offwhite/50 border-brand-beige text-brand-charcoal placeholder-brand-dark-grey/60"
                      }`}
                    required
                  />
                </div>
                {passwordError && <div className="text-brand-bronze text-xs mt-1 font-medium">{passwordError}</div>}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs py-1">
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={`h-4 w-4 rounded border transition-all duration-300 accent-brand-primary focus:ring-0 ${theme === "dark"
                      ? "border-brand-dark-grey bg-brand-dark-grey"
                      : "border-brand-beige bg-brand-white"
                      }`}
                  />
                  <span className={`ml-2 font-medium ${theme === "dark" ? "text-brand-offwhite" : "text-brand-dark-grey"}`}>
                    Remember Me
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-semibold text-brand-bronze hover:text-brand-primary transition-colors duration-300 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full font-bold py-3.5 px-4 rounded-xl text-brand-white shadow-lg transition-all duration-300 transform active:scale-95 cursor-pointer ${loading
                  ? "bg-brand-primary/50 cursor-not-allowed shadow-none"
                  : "bg-brand-primary hover:bg-brand-secondary hover:shadow-brand-primary/30 shadow-brand-primary/20 hover:-translate-y-0.5"
                  }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Signing in...</span>
                  </span>
                ) : (
                  "Sign In to Account"
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-brand-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full relative border transition-all duration-300 ${theme === "dark"
              ? "bg-brand-charcoal border-brand-dark-grey text-brand-offwhite"
              : "bg-brand-white border-brand-beige text-brand-charcoal"
              }`}>
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-5 text-2xl font-semibold text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-white transition-colors cursor-pointer"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-2 tracking-tight">Forgot Password?</h3>
            <p className="mb-6 text-xs text-brand-dark-grey dark:text-brand-sage leading-relaxed">
              Enter your registered email address and we'll send a password reset link.
            </p>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email Address"
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 ${theme === "dark"
                    ? "bg-brand-dark-grey border-brand-dark-grey text-brand-offwhite placeholder-brand-sage/60"
                    : "bg-brand-offwhite/50 border-brand-beige text-brand-charcoal placeholder-brand-dark-grey/60"
                    }`}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-brand-primary hover:bg-brand-secondary text-brand-white font-bold py-3 px-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-brand-primary/30 cursor-pointer"
              >
                Send Reset Link
              </button>
            </form>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Login;
