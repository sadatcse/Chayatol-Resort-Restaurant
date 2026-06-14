"use client";

import React from "react";
import {
  MdHome,
  MdGroup,
  MdAttachMoney,
  MdBusiness,
  MdWork,
  MdAssignment,
  MdLocalShipping,
  MdPeople,
  MdAssessment,
  MdSettings,
  MdBadge,
  MdEventAvailable,
  MdEventBusy,
  MdPayments,
  MdListAlt,
  MdApartment,
  MdWorkOutline,
  MdBeachAccess,
  MdAccountBalanceWallet,
  MdPerson,
  MdFolderShared,
  MdAccessTime,
  MdContactPage,
  MdReceiptLong,
  MdShowChart,
  MdTrendingUp,
  MdAccountBalance,
  MdInventory,
  MdSwapHoriz,
  MdWarehouse
} from "react-icons/md";

const menuItems = () => {
  return [
    // ================= DASHBOARD =================
    {
      title: "Dashboard",
      path: "/dashboard/home",
      icon: <MdHome className="text-lg" />,
    },

    // ================= OFFICE MANAGEMENT =================
    {
      title: "Office Management",
      icon: <MdBusiness className="text-lg" />,
      children: [
        {
          title: "Staff Management",
          path: "/dashboard/staff",
          icon: <MdPeople className="text-base" />,
        },
        {
          title: "Customers",
          path: "/dashboard/customers",
          icon: <MdGroup className="text-base" />,
        },
        {
          title: "User Access Logs",
          path: "/dashboard/user-access",
          icon: <MdListAlt className="text-base" />,
        },
      ],
    },

    // ================= RESORT MANAGEMENT =================
    {
      title: "Resort Management",
      icon: <MdBeachAccess className="text-lg" />,
      children: [
        {
          title: "POS System",
          path: "/dashboard/resort-pos",
          icon: <MdReceiptLong className="text-base" />,
        },
        {
          title: "Resort Invoices",
          path: "/dashboard/resort-invoices",
          icon: <MdReceiptLong className="text-base" />,
        },
        {
          title: "Room Bookings",
          path: "/dashboard/bookings",
          icon: <MdEventAvailable className="text-base" />,
        },
        {
          title: "Room Management",
          path: "/dashboard/rooms",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Resort Services",
          path: "/dashboard/resort-services",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Service Categories",
          path: "/dashboard/resort-services/categories",
          icon: <MdListAlt className="text-base" />,
        },
      ],
    },

    // ================= RESTAURANT MANAGEMENT =================
    {
      title: "Restaurant Management",
      icon: <MdLocalShipping className="text-lg" />,
      children: [
        {
          title: "POS System",
          path: "/dashboard/pos",
          icon: <MdReceiptLong className="text-base" />,
        },
        {
          title: "Invoices",
          path: "/dashboard/invoices",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Food Menu",
          path: "/dashboard/food",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Food Categories",
          path: "/dashboard/settings/categories",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Restaurant Table",
          path: "/dashboard/setting/restauranttable",
          icon: <MdListAlt className="text-base" />,
        },
      ],
    },

    // ================= MAINTAIN STOCKS =================
    {
      title: "Maintain Stocks",
      icon: <MdInventory className="text-lg" />,
      children: [
        {
          title: "Ingredients Categories",
          path: "/dashboard/maintain-stocks/categories",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Ingredients Name",
          path: "/dashboard/maintain-stocks/ingredients",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Vendor Management",
          path: "/dashboard/maintain-stocks/vendors",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Current Stock",
          path: "/dashboard/maintain-stocks/stock",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Purchase Management",
          path: "/dashboard/maintain-stocks/purchases",
          icon: <MdListAlt className="text-base" />,
        },
      ],
    },

    // ================= SETTINGS =================
    {
      title: "Setting",
      icon: <MdSettings className="text-lg" />,
      children: [

        {
          title: "Departments",
          path: "/dashboard/settings/departments",
          icon: <MdApartment className="text-base" />,
        },
        {
          title: "User Roles",
          path: "/dashboard/settings/roles",
          icon: <MdBadge className="text-base" />,
        },

        {
          title: "Access Control",
          path: "/dashboard/setting/permission",
          icon: <MdPayments className="text-base" />,
        },
        {
          title: "Payment Type",
          path: "/dashboard/setting/paymenttype",
          icon: <MdPayments className="text-base" />,
        },
        {
          title: "Expense Category",
          path: "/dashboard/setting/expensecategory",
          icon: <MdPayments className="text-base" />,
        },

        {
          title: "System Controls",
          path: "/dashboard/settings/controls",
          icon: <MdSettings className="text-base" />,
        },
        {
          title: "My Profile",
          path: "/dashboard/profile",
          icon: <MdPerson className="text-base" />,
        },

      ],
    },
  ];
};

export default menuItems;
