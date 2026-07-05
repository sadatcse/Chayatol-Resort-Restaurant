"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdChevronRight } from "react-icons/md";
import menuItems from "./MenuItems";
import useUserPermissions from "@/hooks/useUserPermissions";
import { AuthContext } from "@/providers/AuthProvider";

import Logo from "@/assets/Logo/logo.png";
import Logo_Dark from "@/assets/Logo/logo_dark.png";

/* ---------------- ACCORDION ITEM ---------------- */
const AccordionItem = ({ item, isSidebarOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Auto-open submenu if any child route is active
  useEffect(() => {
    if (item.children) {
      const active = item.children.some(
        (child) => child.path === pathname
      );
      setIsOpen(active);
    }
  }, [pathname, item.children]);

  const linkClass = (path) =>
    pathname === path
      ? "bg-brand-primary text-brand-white shadow-md shadow-brand-primary/20"
      : "text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-primary/10 dark:hover:bg-brand-primary/20 hover:text-brand-primary dark:hover:text-brand-sage";

  /* ---------- PARENT WITH CHILDREN ---------- */
  if (item.children) {
    return (
      <li className="my-1">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex justify-between items-center p-3 rounded-md
          text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-primary/10
          dark:hover:bg-brand-primary/20 hover:text-brand-primary dark:hover:text-brand-sage transition-colors"
        >
          <div className="flex items-center gap-3">
            {item.icon}
            {isSidebarOpen && (
              <span className="font-medium text-sm">{item.title}</span>
            )}
          </div>

          {isSidebarOpen && (
            <MdChevronRight
              className={`transition-transform ${isOpen ? "rotate-90" : ""
                }`}
            />
          )}
        </button>

        {isOpen && isSidebarOpen && (
          <ul className="pl-6">
            {item.children.map((child) => (
              <li key={child.title}>
                <Link
                  href={child.path}
                  className={`flex items-center gap-3 p-2 my-1 text-sm rounded-md transition-colors ${linkClass(
                    child.path
                  )}`}
                >
                  {child.icon}
                  <span>{child.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  /* ---------- SINGLE ITEM ---------- */
  return (
    <li>
      <Link
        href={item.path}
        className={`flex items-center gap-3 p-3 my-1 rounded-md transition-colors ${linkClass(
          item.path
        )}`}
      >
        {item.icon}
        {isSidebarOpen && (
          <span className="font-medium text-sm">{item.title}</span>
        )}
      </Link>
    </li>
  );
};

/* ---------------- SIDEBAR ---------------- */
const Sidebar = ({ isSidebarOpen, toggleSidebar, mode }) => {
  const logo = mode === "dark" ? Logo_Dark : Logo;
  const { user } = useContext(AuthContext);
  const { allowedRoutes, loading } = useUserPermissions();

  /* ---------------- PERMISSION + FORCE LOGIC ---------------- */
  const filteredMenuItems = useMemo(() => {
    if (loading) return [];

    const items = menuItems();

    if (user?.role === "superadmin") {
      return items;
    }

    return items
      .map((item) => {
        if (!item.children) {
          // If it's a standalone parent link, check its route permission
          return allowedRoutes.includes(item.path) ? item : null;
        }

        // Parent item with submenus: filter valid children by permission
        const validChildren = item.children.filter((child) =>
          allowedRoutes.includes(child.path)
        );

        if (validChildren.length === 0) return null;

        // Keep parent and its matching child routes grouped
        return { ...item, children: validChildren };
      })
      .filter(Boolean);
  }, [allowedRoutes, loading, user]);

  return (
    <>
      {/* Mobile Overlay */}
      <div
        onClick={toggleSidebar}
        className={`fixed inset-0 bg-brand-black/50 z-20 md:hidden ${isSidebarOpen ? "block" : "hidden"
          }`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 shadow-lg transition-all duration-300
        bg-brand-white dark:bg-brand-charcoal border-r border-brand-beige/50 dark:border-brand-dark-grey/50
        ${isSidebarOpen
            ? "w-64 translate-x-0"
            : "-translate-x-full md:w-20 md:translate-x-0"
          }`}
      >
        {/* Logo */}
        <div className="h-[65px] flex items-center justify-center border-b border-brand-beige/50 dark:border-brand-dark-grey/50">
          <img
            src={logo.src}
            alt="Logo"
            className={`transition-all ${isSidebarOpen ? "w-24" : "w-10"}`}
          />
        </div>

        {/* Menu */}
        <nav className="p-2 overflow-y-auto h-[calc(100vh-65px)] custom-scrollbar">
          {loading ? (
            <div className="flex flex-col gap-4 p-4 mt-4 animate-pulse">
              <div className="h-8 bg-brand-beige dark:bg-brand-dark-grey rounded w-full"></div>
              <div className="h-8 bg-brand-beige dark:bg-brand-dark-grey rounded w-full"></div>
              <div className="h-8 bg-brand-beige dark:bg-brand-dark-grey rounded w-full"></div>
            </div>
          ) : (
            <ul>
              {filteredMenuItems.map((item) => (
                <AccordionItem
                  key={`${item.title}-${item.path || "group"}`}
                  item={item}
                  isSidebarOpen={isSidebarOpen}
                />
              ))}
            </ul>
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
