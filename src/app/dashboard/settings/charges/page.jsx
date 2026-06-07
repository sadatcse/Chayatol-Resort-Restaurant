"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { MdInfoOutline } from "react-icons/md";
import MtableLoading from "@/components/Comon/MtableLoading";

export default function ChargeSettingsPage() {
  const axiosSecure = useAxiosSecure();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    vat: {
      enabled: true,
      value: 5,
      customApplicability: false,
      applicability: {
        "Dine In": true,
        "Takeaway": true,
        "Delivery": true,
        "Foodpanda": false,
        "Foodi": false,
        "Pathao": false,
      }
    },
    sc: {
      enabled: true,
      value: 0,
      customApplicability: false,
      applicability: {
        "Dine In": true,
        "Takeaway": true,
        "Delivery": true,
        "Foodpanda": false,
        "Foodi": false,
        "Pathao": false,
      }
    },
    deliveryCharge: {
      enabled: false,
      type: "FLAT",
      value: 0
    }
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosSecure.get("/settings/charges");
      if (res.data) {
        setSettings(res.data);
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
      await axiosSecure.put("/settings/charges", settings);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const updateVat = (field, value) => {
    setSettings(prev => ({ ...prev, vat: { ...prev.vat, [field]: value } }));
  };

  const updateVatApp = (appField, value) => {
    setSettings(prev => ({
      ...prev,
      vat: { ...prev.vat, applicability: { ...prev.vat.applicability, [appField]: value } }
    }));
  };

  const updateSc = (field, value) => {
    setSettings(prev => ({ ...prev, sc: { ...prev.sc, [field]: value } }));
  };

  const updateScApp = (appField, value) => {
    setSettings(prev => ({
      ...prev,
      sc: { ...prev.sc, applicability: { ...prev.sc.applicability, [appField]: value } }
    }));
  };

  const updateDelivery = (field, value) => {
    setSettings(prev => ({ ...prev, deliveryCharge: { ...prev.deliveryCharge, [field]: value } }));
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-brand-charcoal dark:text-brand-offwhite">Charge Settings</h2>
          <button onClick={handleSave} disabled={saving} className="btn bg-brand-primary text-white border-none hover:bg-brand-primary-dark">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* VAT Section */}
          <div className="card bg-brand-white dark:bg-brand-charcoal shadow-xl border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">VAT</span>
                <MdInfoOutline className="text-gray-400" />
              </div>
              <input type="checkbox" className="toggle toggle-sm bg-brand-primary" checked={settings.vat?.enabled} onChange={e => updateVat("enabled", e.target.checked)} />
            </div>
            
            <div className="flex bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
              <input type="number" min="0" value={settings.vat?.value === 0 ? "" : settings.vat?.value} onChange={e => updateVat("value", Number(e.target.value))} className="w-full p-2.5 text-sm outline-none bg-transparent" placeholder="0" />
              <div className="bg-gray-100 dark:bg-gray-700 border-l border-gray-200 dark:border-gray-700 px-3 flex items-center justify-center text-xs font-bold text-gray-500">
                %
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">Custom Applicability</span>
              <input type="checkbox" className="toggle toggle-sm bg-brand-primary" checked={settings.vat?.customApplicability} onChange={e => updateVat("customApplicability", e.target.checked)} />
            </div>

            <div className={`grid grid-cols-2 gap-3 transition-opacity ${!settings.vat?.customApplicability && 'opacity-50 pointer-events-none'}`}>
               {["Dine In", "Takeaway", "Delivery", "Foodpanda", "Foodi", "Pathao"].map(type => (
                 <div key={type} className="flex justify-between items-center border border-gray-100 dark:border-gray-700 p-2 rounded-lg">
                   <span className="text-[10px] font-bold text-gray-500 uppercase">{type}</span>
                   <input type="checkbox" className="toggle toggle-xs bg-brand-primary" checked={settings.vat?.applicability?.[type]} onChange={e => updateVatApp(type, e.target.checked)} />
                 </div>
               ))}
            </div>
          </div>

          {/* SC Section */}
          <div className="card bg-brand-white dark:bg-brand-charcoal shadow-xl border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">SC</span>
                <MdInfoOutline className="text-gray-400" />
              </div>
              <input type="checkbox" className="toggle toggle-sm bg-brand-primary" checked={settings.sc?.enabled} onChange={e => updateSc("enabled", e.target.checked)} />
            </div>
            
            <div className="flex bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
              <input type="number" min="0" value={settings.sc?.value === 0 ? "" : settings.sc?.value} onChange={e => updateSc("value", Number(e.target.value))} className="w-full p-2.5 text-sm outline-none bg-transparent" placeholder="0" />
              <div className="bg-gray-100 dark:bg-gray-700 border-l border-gray-200 dark:border-gray-700 px-3 flex items-center justify-center text-xs font-bold text-gray-500">
                %
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">Custom Applicability</span>
              <input type="checkbox" className="toggle toggle-sm bg-brand-primary" checked={settings.sc?.customApplicability} onChange={e => updateSc("customApplicability", e.target.checked)} />
            </div>

            <div className={`grid grid-cols-2 gap-3 transition-opacity ${!settings.sc?.customApplicability && 'opacity-50 pointer-events-none'}`}>
               {["Dine In", "Takeaway", "Delivery", "Foodpanda", "Foodi", "Pathao"].map(type => (
                 <div key={type} className="flex justify-between items-center border border-gray-100 dark:border-gray-700 p-2 rounded-lg">
                   <span className="text-[10px] font-bold text-gray-500 uppercase">{type}</span>
                   <input type="checkbox" className="toggle toggle-xs bg-brand-primary" checked={settings.sc?.applicability?.[type]} onChange={e => updateScApp(type, e.target.checked)} />
                 </div>
               ))}
            </div>
          </div>

          {/* Delivery Charge Section */}
          <div className="card bg-brand-white dark:bg-brand-charcoal shadow-xl border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden p-6 h-fit">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">Delivery Charge</span>
              <input type="checkbox" className="toggle toggle-sm bg-brand-primary" checked={settings.deliveryCharge?.enabled} onChange={e => updateDelivery("enabled", e.target.checked)} />
            </div>
            
            <div className="flex gap-3 mb-6">
              <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                 <select value={settings.deliveryCharge?.type} onChange={e => updateDelivery("type", e.target.value)} className="w-full p-2.5 text-sm outline-none bg-transparent cursor-pointer">
                    <option value="FLAT">Flat</option>
                    <option value="PERCENT">Percent</option>
                 </select>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <input type="number" min="0" value={settings.deliveryCharge?.value === 0 ? "" : settings.deliveryCharge?.value} onChange={e => updateDelivery("value", Number(e.target.value))} className="w-full p-2.5 text-sm outline-none bg-transparent" placeholder="0" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
