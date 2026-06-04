"use client";

import React, { useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUserCircle } from "react-icons/fa";
import { RiMenuFold4Fill } from "react-icons/ri";
import { MdMenu, MdSearch, MdDarkMode, MdLightMode } from "react-icons/md";
import { AuthContext } from "@/providers/AuthProvider";
import useThemeMode from "@/hooks/useThemeMode";

const Header = ({ isSidebarOpen, toggleSidebar }) => {
  const [isProfileOpen, setProfileOpen] = useState(false);
  const { user, logoutUser } = useContext(AuthContext);
  const router = useRouter();

  const { mode, toggleMode, loading } = useThemeMode();

  useEffect(() => {
    console.log(`Theme Updated to: ${mode}`);
  }, [mode]);

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
            <RiMenuFold4Fill className="text-2xl" />
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

        <div className="relative">
          <button
            onClick={() => setProfileOpen(!isProfileOpen)}
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
