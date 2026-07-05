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
  MdWarehouse,
  MdDeleteForever,
  MdKitchen,
  MdHotel,
  MdUndo,
  MdDashboard,
  MdAddCircle,
  MdCheckCircle,
  MdAssignmentReturn,
  MdHistory,
  MdCategory,
  MdPlace,
  MdSearch,
  MdTableRestaurant,
  MdFeedback,
  MdLogout,
  MdRestaurant,
  MdAdminPanelSettings,
  MdLockClock,
} from "react-icons/md";

const menuItems = () => {
  return [
    // Dashboard
    {
      title: "Dashboard",
      path: "/dashboard/home",
      icon: <MdHome className="text-lg" />,
    },

    // Front Office
    {
      title: "Front Office",
      icon: <MdBeachAccess className="text-lg" />,
      children: [
        {
          title: "Front Desk",
          path: "/dashboard/front-desk",
          icon: <MdDashboard className="text-base" />,
        },
        {
          title: "Reservations",
          path: "/dashboard/reservations",
          icon: <MdAssignment className="text-base" />,
        },
        // {
        //   title: "Walk-in Check-in",
        //   path: "/dashboard/check-in",
        //   icon: <MdAddCircle className="text-base" />,
        // },
        {
          title: "Guest Stay & Folio",
          path: "/dashboard/stays",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Resort Payment",
          path: "/dashboard/payments",
          icon: <MdPayments className="text-base" />,
        },
        {
          title: "Check-out",
          path: "/dashboard/checkout",
          icon: <MdLogout className="text-base" />,
        },
        {
          title: "Room Transfer",
          path: "/dashboard/room-transfer",
          icon: <MdSwapHoriz className="text-base" />,
        },
        {
          title: "Guest History",
          path: "/dashboard/guest-history",
          icon: <MdHistory className="text-base" />,
        },
      ],
    },

    // Restaurant
    {
      title: "Restaurant",
      icon: <MdRestaurant className="text-lg" />,
      children: [
        {
          title: "POS System",
          path: "/dashboard/pos",
          icon: <MdReceiptLong className="text-base" />,
        },

        {
          title: "Pending Orders",
          path: "/dashboard/pending-orders",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Finished Orders",
          path: "/dashboard/finished-orders",
          icon: <MdCheckCircle className="text-base" />,
        },
        {
          title: "Kitchen Display",
          path: "/dashboard/kitchen-display",
          icon: <MdKitchen className="text-base" />,
        },
        {
          title: "Table Transfer",
          path: "/dashboard/tables/transfer",
          icon: <MdSwapHoriz className="text-base" />,
        },
        {
          title: "Invoices History",
          path: "/dashboard/invoices",
          icon: <MdReceiptLong className="text-base" />,
        },
        {
          title: "Customer Reviews",
          path: "/dashboard/reviews",
          icon: <MdFeedback className="text-base" />,
        },
        {
          title: "Daily Closing",
          path: "/dashboard/daily-closing",
          icon: <MdLockClock className="text-base" />,
        },
      ],
    },

    // Inventory
    {
      title: "Inventory",
      icon: <MdInventory className="text-lg" />,
      children: [
        {
          title: "Vendor Management",
          path: "/dashboard/maintain-stocks/vendors",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Supplier Ledger",
          path: "/dashboard/maintain-stocks/vendors/ledger",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Purchase Management",
          path: "/dashboard/maintain-stocks/purchases",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Current Stock",
          path: "/dashboard/maintain-stocks/stock",
          icon: <MdWarehouse className="text-base" />,
        },
        {
          title: "Kitchen Issue",
          path: "/dashboard/maintain-stocks/kitchen-issue",
          icon: <MdKitchen className="text-base" />,
        },
        {
          title: "Room Consumable Issue",
          path: "/dashboard/maintain-stocks/room-issue",
          icon: <MdHotel className="text-base" />,
        },
        {
          title: "Return Management",
          path: "/dashboard/maintain-stocks/returns",
          icon: <MdUndo className="text-base" />,
        },
        {
          title: "Wastage Management",
          path: "/dashboard/maintain-stocks/wastage",
          icon: <MdDeleteForever className="text-base" />,
        },
        {
          title: "Stock Ledger",
          path: "/dashboard/maintain-stocks/stock-ledger",
          icon: <MdShowChart className="text-base" />,
        },
      ],
    },

    // Finance
    {
      title: "Finance",
      icon: <MdAccountBalanceWallet className="text-lg" />,
      children: [
        {
          title: "Expense Entry",
          path: "/dashboard/finance/expenses",
          icon: <MdAttachMoney className="text-base" />,
        },
        {
          title: "Recurring Expenses",
          path: "/dashboard/finance/recurring-expenses",
          icon: <MdHistory className="text-base" />,
        },
        {
          title: "Profit & Loss",
          path: "/dashboard/finance/profit-loss",
          icon: <MdShowChart className="text-base" />,
        },
        {
          title: "Cash Flow Report",
          path: "/dashboard/finance/cash-flow",
          icon: <MdTrendingUp className="text-base" />,
        },
        {
          title: "Monthly Expense Report",
          path: "/dashboard/finance/monthly-expense-report",
          icon: <MdAssessment className="text-base" />,
        },
      ],
    },

    // People
    {
      title: "People",
      icon: <MdPeople className="text-lg" />,
      children: [
        {
          title: "Customers",
          path: "/dashboard/customers",
          icon: <MdGroup className="text-base" />,
        },
        {
          title: "Staff Management",
          path: "/dashboard/staff",
          icon: <MdPerson className="text-base" />,
        },
      ],
    },

    // Tables
    {
      title: "Tables",
      icon: <MdTableRestaurant className="text-lg" />,
      children: [
        {
          title: "Table View",
          path: "/dashboard/tables/view",
          icon: <MdTableRestaurant className="text-base" />,
        },

        {
          title: "Table Reservation",
          path: "/dashboard/tables/reservation",
          icon: <MdEventAvailable className="text-base" />,
        },
        {
          title: "Table Management",
          path: "/dashboard/tables/manage",
          icon: <MdListAlt className="text-base" />,
        },
      ],
    },

    // Lost & Found
    {
      title: "Lost & Found",
      icon: <MdSearch className="text-lg" />,
      children: [
        {
          title: "Dashboard",
          path: "/dashboard/lost-found/dashboard",
          icon: <MdDashboard className="text-base" />,
        },
        {
          title: "New Item Entry",
          path: "/dashboard/lost-found/new-item",
          icon: <MdAddCircle className="text-base" />,
        },
        {
          title: "Active Items",
          path: "/dashboard/lost-found/active-items",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Claims Verification",
          path: "/dashboard/lost-found/claims",
          icon: <MdCheckCircle className="text-base" />,
        },
        {
          title: "Return Management",
          path: "/dashboard/lost-found/returns",
          icon: <MdAssignmentReturn className="text-base" />,
        },
        {
          title: "Return Notes",
          path: "/dashboard/lost-found/return-notes",
          icon: <MdHistory className="text-base" />,
        },
        {
          title: "Reports",
          path: "/dashboard/lost-found/reports",
          icon: <MdAssessment className="text-base" />,
        },
        {
          title: "Settings",
          path: "/dashboard/lost-found/settings",
          icon: <MdSettings className="text-base" />,
        },
      ],
    },

    // Reports
    {
      title: "Reports",
      icon: <MdAssessment className="text-lg" />,
      children: [
        {
          title: "Daily Sales Report Resturant",
          path: "/dashboard/reports/daily-sales",
          icon: <MdTrendingUp className="text-base" />,
        },
        {
          title: "Product Sales Report Resturant",
          path: "/dashboard/reports/product-sales",
          icon: <MdShowChart className="text-base" />,
        },
        {
          title: "Custom Order Report",
          path: "/dashboard/reports/custom-orders",
          icon: <MdHistory className="text-base" />,
        },
      ],
    },

    // Administration
    {
      title: "Administration",
      icon: <MdAdminPanelSettings className="text-lg" />,
      children: [
        {
          title: "User Access Logs",
          path: "/dashboard/user-access",
          icon: <MdListAlt className="text-base" />,
        },
      ],
    },

    // Settings
    {
      title: "Setting",
      icon: <MdSettings className="text-lg" />,
      children: [
        {
          title: "Room Type",
          path: "/dashboard/room-types",
          icon: <MdCategory className="text-base" />,
        },
        {
          title: "Rooms & Rate Plans",
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
        {
          title: "Food Categories",
          path: "/dashboard/settings/categories",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Food Menu",
          path: "/dashboard/food",
          icon: <MdListAlt className="text-base" />,
        },
        {
          title: "Restaurant Table",
          path: "/dashboard/setting/restauranttable",
          icon: <MdListAlt className="text-base" />,
        },
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
          title: "Payment Type",
          path: "/dashboard/setting/paymenttype",
          icon: <MdPayments className="text-base" />,
        },
        {
          title: "Expense Categories",
          path: "/dashboard/finance/expense-categories",
          icon: <MdCategory className="text-base" />,
        },
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
          title: "Kitchen Settings",
          path: "/dashboard/setting/kitchen",
          icon: <MdKitchen className="text-base" />,
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
        {
          title: "Lost & Found Categories",
          path: "/dashboard/lost-found/categories",
          icon: <MdCategory className="text-base" />,
        },
        {
          title: "Lost & Found Locations",
          path: "/dashboard/lost-found/locations",
          icon: <MdPlace className="text-base" />,
        },
      ],
    },
  ];
};

export default menuItems;
