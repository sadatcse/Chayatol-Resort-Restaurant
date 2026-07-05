"use client";

import React, { useState, useContext, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUserCircle } from "react-icons/fa";
import { RiMenuFold4Fill as RiFoldIcon } from "react-icons/ri";
import { MdMenu, MdSearch, MdDarkMode, MdLightMode, MdTableRestaurant, MdReceiptLong, MdDashboard } from "react-icons/md";
import { FiBell, FiCheck } from "react-icons/fi";
import { AuthContext } from "@/providers/AuthProvider";
import useThemeMode from "@/hooks/useThemeMode";
import useAxiosSecure from "@/hooks/useAxiosSecure";

const getMockNotifications = () => [
  {
    _id: "mock-1",
    title: "System Update Complete",
    message: "Resort PMS system successfully optimized to v16.2.7.",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false
  },
  {
    _id: "mock-2",
    title: "Daily Checkout Warning",
    message: "Room 101 expected checkout is overdue by 1 hour.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: false
  },
  {
    _id: "mock-3",
    title: "Kitchen Alert: Low Ingredients",
    message: "Sugar and milk stock counts are approaching safety minimums.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: true
  }
];

const Header = ({ isSidebarOpen, toggleSidebar }) => {
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const { user, logoutUser } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  const router = useRouter();
  const { mode, toggleMode, loading } = useThemeMode();

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await axiosSecure.get("/lost-found/notifications");
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications(getMockNotifications());
      }
    } catch (err) {
      console.log("Failed to fetch backend notifications, using fallback list:", err);
      setNotifications(getMockNotifications());
    }
  }, [axiosSecure]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    if (id.startsWith("mock-")) {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      return;
    }
    try {
      await axiosSecure.put("/lost-found/notifications", { id });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const hasRealNotifs = notifications.some(n => !n._id.startsWith("mock-"));
      if (hasRealNotifs) {
        await axiosSecure.put("/lost-found/notifications", { markAllRead: true });
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    router.push("/");
  };

  return (
    <header className="bg-brand-white dark:bg-brand-charcoal border-b border-brand-beige/50 dark:border-brand-dark-grey/50 shadow-sm w-full p-2 flex items-center justify-between z-10 transition-colors">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-primary/10 dark:hover:bg-brand-dark-grey p-2 rounded-full focus:outline-none transition-colors duration-200 cursor-pointer"
        >
          {isSidebarOpen ? (
            <RiFoldIcon className="text-2xl" />
          ) : (
            <MdMenu className="text-2xl" />
          )}
        </button>

        <div className="relative hidden md:block">
          <MdSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-brand-sage" />
          <input
            type="search"
            placeholder="Search..."
            className="w-full bg-brand-offwhite dark:bg-brand-dark-grey border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-md pl-10 pr-4 py-2 text-sm text-brand-charcoal dark:text-brand-offwhite focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="hidden lg:flex items-center gap-1">
        <Link
          href="/dashboard/front-desk"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-primary/10 dark:hover:bg-brand-dark-grey transition-colors duration-200"
        >
          <MdDashboard className="text-sm text-brand-primary" />
          Front Desk
        </Link>
        <Link
          href="/dashboard/tables/view"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-primary/10 dark:hover:bg-brand-dark-grey transition-colors duration-200"
        >
          <MdTableRestaurant className="text-sm text-brand-primary" />
          Table View
        </Link>
        <Link
          href="/dashboard/pos"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-primary/10 dark:hover:bg-brand-dark-grey transition-colors duration-200"
        >
          <MdReceiptLong className="text-sm text-brand-primary" />
          POS
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme switch button (icon changes by mode) */}
        <button
          onClick={toggleMode}
          disabled={loading}
          className={`px-3 py-1.5 rounded-full transition-all duration-300 font-semibold border flex items-center gap-2 cursor-pointer
            ${mode === "dark"
              ? "bg-brand-dark-grey text-brand-offwhite border-brand-dark-grey hover:bg-brand-charcoal"
              : "bg-brand-white text-brand-dark-grey border-brand-beige hover:bg-brand-offwhite"
            }`}
          aria-label="Toggle theme"
        >
          {loading ? (
            <span>Loading...</span>
          ) : mode === "dark" ? (
            <>
              <MdLightMode className="text-lg" />
              Light
            </>
          ) : (
            <>
              <MdDarkMode className="text-lg" />
              Dark
            </>
          )}
        </button>

        {/* Notification Bell and Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen(!isNotifOpen);
              setProfileOpen(false);
            }}
            className="relative p-2 rounded-full hover:bg-brand-primary/10 dark:hover:bg-brand-dark-grey text-brand-charcoal dark:text-brand-offwhite cursor-pointer focus:outline-none transition-colors"
            aria-label="Notifications"
          >
            <FiBell size={20} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-brand-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-xl shadow-lg border border-brand-beige/50 dark:border-brand-dark-grey/50 z-20 overflow-hidden">
              <div className="p-3 border-b border-brand-beige/50 dark:border-brand-dark-grey/50 flex justify-between items-center bg-brand-offwhite/50 dark:bg-brand-charcoal/50">
                <span className="font-bold text-xs uppercase tracking-wider">Notifications</span>
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-brand-primary dark:text-brand-sage hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <FiCheck /> Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-brand-beige/25 dark:divide-brand-dark-grey/30 max-h-64 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => handleMarkAsRead(notif._id)}
                      className={`p-3 text-left text-xs cursor-pointer transition-colors ${
                        notif.read
                          ? "hover:bg-brand-offwhite dark:hover:bg-brand-dark-grey opacity-75"
                          : "bg-brand-primary/5 dark:bg-brand-sage/5 hover:bg-brand-primary/10 border-l-2 border-brand-primary"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-brand-charcoal dark:text-brand-offwhite leading-snug">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-brand-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-brand-sage dark:text-brand-sage/95 mt-1 leading-relaxed text-[11px]">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-brand-sage/60 block mt-1.5 font-mono">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-brand-sage font-bold uppercase tracking-wider text-[10px]">
                    No new notifications
                  </div>
                )}
              </div>

              <div className="p-2 border-t border-brand-beige/50 dark:border-brand-dark-grey/50 text-center bg-brand-offwhite/50 dark:bg-brand-charcoal/50">
                <Link
                  href="/dashboard/lost-found/settings"
                  onClick={() => setNotifOpen(false)}
                  className="text-[10px] text-brand-primary dark:text-brand-sage font-bold hover:underline"
                >
                  View All Notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!isProfileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 focus:outline-none"
          >
            {user?.photo ? (
              <img
                src={user.photo}
                alt="User"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <FaUserCircle className="text-2xl text-brand-charcoal dark:text-brand-offwhite" />
            )}
            <span className="hidden md:block font-medium text-sm text-brand-charcoal dark:text-brand-offwhite">
              {user?.name || "Guest"}
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-brand-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-xl shadow-lg border border-brand-beige/50 dark:border-brand-dark-grey/50 z-20 overflow-hidden">
              <div className="p-4 border-b border-brand-beige/50 dark:border-brand-dark-grey/50">
                <h2 className="text-sm font-medium">
                  {user?.role || "User"}
                </h2>
                <p className="text-xs text-brand-dark-grey dark:text-brand-sage">
                  {user?.email || "No Email"}
                </p>
              </div>
              <div className="flex flex-col text-sm">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setProfileOpen(false)}
                  className="py-2.5 px-4 hover:bg-brand-offwhite dark:hover:bg-brand-dark-grey text-left font-semibold"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="py-2.5 px-4 border-t border-brand-beige/20 dark:border-brand-dark-grey/20 hover:bg-red-50 dark:hover:bg-red-950/25 text-left text-red-600 dark:text-red-400 font-semibold cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
