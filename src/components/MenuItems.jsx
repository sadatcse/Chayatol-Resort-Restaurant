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
          title: "User Access Logs",
          path: "/dashboard/user-access",
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
          title: "My Profile",
          path: "/dashboard/profile",
          icon: <MdPerson className="text-base" />,
        },

      ],
    },
  ];
};

export default menuItems;
