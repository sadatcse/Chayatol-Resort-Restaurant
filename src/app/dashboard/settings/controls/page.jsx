"use client";

import React, { useState } from "react";
import CompanySettingsTab from "@/components/settings/CompanySettingsTab";
import ChargeSettingsTab from "@/components/settings/ChargeSettingsTab";
import SystemControlsTab from "@/components/settings/SystemControlsTab";
import SectionHeader from "@/components/Comon/SectionHeader";
import { MdBusiness, MdPayments, MdSettings } from "react-icons/md";

export default function UnifiedSettingsPage() {
  const [activeTab, setActiveTab] = useState("System Controls");

  const tabs = [
    { name: "System Controls", icon: <MdSettings className="text-lg" /> },
    { name: "Company Settings", icon: <MdBusiness className="text-lg" /> },
    { name: "Charge Settings", icon: <MdPayments className="text-lg" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation Area */}
      <div className="bg-brand-offwhite dark:bg-brand-charcoal/30 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8">
        <SectionHeader 
          title="System Configurations" 
          subtitle="Manage your system settings, company profile, and charge configurations."
        />
        <div className="flex overflow-x-auto custom-scrollbar gap-2 mt-2">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2 px-5 py-3 font-bold text-sm transition-colors whitespace-nowrap border-b-2 rounded-t-lg ${
                activeTab === tab.name
                  ? "text-brand-primary border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50"
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === "System Controls" && <SystemControlsTab />}
        {activeTab === "Company Settings" && <CompanySettingsTab />}
        {activeTab === "Charge Settings" && <ChargeSettingsTab />}
      </div>
    </div>
  );
}
