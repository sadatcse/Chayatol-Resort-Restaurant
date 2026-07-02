"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { MdInfoOutline } from "react-icons/md";
import MtableLoading from "@/components/Comon/MtableLoading";

export default function ControlsSettingsPage() {
  const axiosSecure = useAxiosSecure();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    dailyReport: false,
    printKOT: false,
    sendOnlineOrderSMS: false,
    sendInvoiceSMS: false,
    timeZone: "Asia/Dhaka",
    checkInTime: "14:00",
    checkOutTime: "12:00"
  });

  const timeZones = [
    "Asia/Dhaka",
    "Asia/Kolkata",
    "Asia/Karachi",
    "Asia/Colombo",
    "Asia/Katmandu",
    "Asia/Dubai",
    "Asia/Riyadh",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "Australia/Sydney"
  ];

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosSecure.get("/settings/controls");
      if (res.data) {
        setSettings({
           dailyReport: Boolean(res.data.dailyReport),
           printKOT: Boolean(res.data.printKOT),
           sendOnlineOrderSMS: Boolean(res.data.sendOnlineOrderSMS),
           sendInvoiceSMS: Boolean(res.data.sendInvoiceSMS),
           timeZone: res.data.timeZone || "Asia/Dhaka",
           checkInTime: res.data.checkInTime || "14:00",
           checkOutTime: res.data.checkOutTime || "12:00"
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [axiosSecure]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await axiosSecure.put("/settings/controls", settings);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <MtableLoading />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-brand-offwhite dark:bg-brand-charcoal/30 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end items-center mb-6">
          <button onClick={handleSave} disabled={saving} className="btn bg-brand-primary text-white border-none hover:bg-brand-primary-dark">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Daily Report */}
          <div className="card bg-white dark:bg-brand-charcoal shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden p-4 flex flex-row justify-between items-center transition-all hover:shadow-md">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">Daily Report</span>
              <div className="tooltip tooltip-right text-left" data-tip="Enable or disable automated daily reporting.">
                 <MdInfoOutline className="text-gray-400 cursor-pointer" />
              </div>
            </div>
            <input 
              type="checkbox" 
              className="toggle bg-brand-primary" 
              checked={settings.dailyReport} 
              onChange={e => updateSetting("dailyReport", e.target.checked)} 
            />
          </div>

          {/* Print KOT */}
          <div className="card bg-white dark:bg-brand-charcoal shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden p-4 flex flex-row justify-between items-center transition-all hover:shadow-md">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">Print KOT</span>
              <div className="tooltip tooltip-right text-left" data-tip="Automatically print Kitchen Order Tickets when orders are placed.">
                 <MdInfoOutline className="text-gray-400 cursor-pointer" />
              </div>
            </div>
            <input 
              type="checkbox" 
              className="toggle bg-brand-primary" 
              checked={settings.printKOT} 
              onChange={e => updateSetting("printKOT", e.target.checked)} 
            />
          </div>

          {/* Send Online Order SMS */}
          <div className="card bg-white dark:bg-brand-charcoal shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden p-4 flex flex-row justify-between items-center transition-all hover:shadow-md">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">Send Online Order SMS</span>
              <div className="tooltip tooltip-right text-left" data-tip="Send SMS notifications to customers for online orders.">
                 <MdInfoOutline className="text-gray-400 cursor-pointer" />
              </div>
            </div>
            <input 
              type="checkbox" 
              className="toggle bg-brand-primary" 
              checked={settings.sendOnlineOrderSMS} 
              onChange={e => updateSetting("sendOnlineOrderSMS", e.target.checked)} 
            />
          </div>

          {/* Send Invoice SMS */}
          <div className="card bg-white dark:bg-brand-charcoal shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden p-4 flex flex-row justify-between items-center transition-all hover:shadow-md">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">Send Invoice SMS</span>
              <div className="tooltip tooltip-right text-left" data-tip="Send final invoice via SMS when an order is completed.">
                 <MdInfoOutline className="text-gray-400 cursor-pointer" />
              </div>
            </div>
            <input 
              type="checkbox" 
              className="toggle bg-brand-primary" 
              checked={settings.sendInvoiceSMS} 
              onChange={e => updateSetting("sendInvoiceSMS", e.target.checked)} 
            />
          </div>

          {/* Time Zone */}
          <div className="card bg-white dark:bg-brand-charcoal shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden p-4 flex flex-row justify-between items-center transition-all hover:shadow-md col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 w-1/3">
              <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">Time Zone</span>
              <div className="tooltip tooltip-right text-left" data-tip="Select the system time zone.">
                 <MdInfoOutline className="text-gray-400 cursor-pointer" />
              </div>
            </div>
            <div className="w-2/3 max-w-sm">
              <select 
                className="select select-bordered w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:border-brand-primary"
                value={settings.timeZone}
                onChange={(e) => updateSetting("timeZone", e.target.value)}
              >
                {timeZones.map((tz) => (
                   <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Resort Check-In Time */}
          <div className="card bg-white dark:bg-brand-charcoal shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden p-4 flex flex-row justify-between items-center transition-all hover:shadow-md col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 w-1/3">
              <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">Resort Check-In Time</span>
              <div className="tooltip tooltip-right text-left" data-tip="Configure standard resort check-in time.">
                 <MdInfoOutline className="text-gray-400 cursor-pointer" />
              </div>
            </div>
            <div className="w-2/3 max-w-sm">
              <input 
                type="time" 
                className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:border-brand-primary"
                value={settings.checkInTime}
                onChange={(e) => updateSetting("checkInTime", e.target.value)}
              />
            </div>
          </div>

          {/* Resort Check-Out Time */}
          <div className="card bg-white dark:bg-brand-charcoal shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden p-4 flex flex-row justify-between items-center transition-all hover:shadow-md col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 w-1/3">
              <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">Resort Check-Out Time</span>
              <div className="tooltip tooltip-right text-left" data-tip="Configure standard resort check-out time.">
                 <MdInfoOutline className="text-gray-400 cursor-pointer" />
              </div>
            </div>
            <div className="w-2/3 max-w-sm">
              <input 
                type="time" 
                className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:border-brand-primary"
                value={settings.checkOutTime}
                onChange={(e) => updateSetting("checkOutTime", e.target.value)}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
