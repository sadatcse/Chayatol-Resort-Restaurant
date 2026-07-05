"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useStandardPrint from "@/hooks/useStandardPrint";
import { FiSearch, FiSliders, FiPrinter, FiInfo, FiFileText } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import ExportButtons from "@/components/Comon/ExportButtons";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";
import usePagePermission from "@/hooks/usePagePermission";

export default function ReportsPage() {
  const axiosSecure = useAxiosSecure();
  const { canEdit } = usePagePermission();

  const [reportType, setReportType] = useState("found"); // found, returned, expired, disposal, claim_verification, staff_activity
  const [categoryId, setCategoryId] = useState("");
  const [foundLocationId, setFoundLocationId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const {
    printData: printRes,
    setPrintData: setPrintRes,
    printRef,
    handlePrint
  } = useStandardPrint({
    documentTitle: `Lost_Found_${reportType}_Report`
  });

  // Query: Fetch categories for filters
  const { data: categories = [] } = useQuery({
    queryKey: ["lostFoundCategories"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/lost-found/categories");
      return data;
    },
  });

  // Query: Fetch locations for filters
  const { data: locations = [] } = useQuery({
    queryKey: ["lostFoundLocations"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/lost-found/locations");
      return data;
    },
  });

  // Query: Fetch staff users for activity filter
  const { data: staffList = [] } = useQuery({
    queryKey: ["staffList"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/user");
      return data;
    },
  });

  // Main Query: Fetch Report Data
  const { data: reportData = [], isLoading } = useQuery({
    queryKey: ["reportsData", reportType, categoryId, foundLocationId, staffId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({
        reportType,
        categoryId,
        foundLocationId,
        staffId,
        from,
        to,
      });
      const { data } = await axiosSecure.get(`/lost-found/reports?${params.toString()}`);
      return data;
    },
  });

  const handleExport = (type) => {
    if (type === "excel") {
      exportToExcel(reportData, `Lost_Found_${reportType}_Report`, "Report");
    } else {
      exportToCsv(reportData, `Lost_Found_${reportType}_Report`);
    }
  };

  const reportTypesList = [
    { label: "Found Items Report", value: "found" },
    { label: "Returned Items Report", value: "returned" },
    { label: "Expired Items Report", value: "expired" },
    { label: "Disposal Report", value: "disposal" },
    { label: "Claim Verification Report", value: "claim_verification" },
    { label: "Staff Activity Report", value: "staff_activity" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader title="Lost & Found Reports" subtitle="Generate, print, and export lost & found audits" />
        {canEdit ? (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setPrintRes(reportData)}
              disabled={reportData.length === 0}
              className="btn btn-sm btn-outline border-brand-beige text-brand-charcoal dark:text-brand-offwhite rounded-xl flex items-center gap-1.5 h-10 px-4 cursor-pointer"
            >
              <FiPrinter size={14} /> Print Report
            </button>
            <ExportButtons 
              onExportExcel={() => handleExport("excel")} 
              onExportCsv={() => handleExport("csv")} 
            />
          </div>
        ) : (
          <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-white dark:bg-brand-charcoal border-none py-3 px-4 shadow-sm">Export Restricted</div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-5 bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/10 rounded-2xl shadow-sm">
        
        {/* Report Type */}
        <div className="form-control w-full sm:col-span-2">
          <label className="label py-1">
            <span className="label-text font-bold text-[10px] text-brand-sage uppercase tracking-wider">Report Type</span>
          </label>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setCategoryId("");
              setFoundLocationId("");
              setStaffId("");
            }}
            className="select select-bordered select-sm w-full rounded-xl h-10 text-xs font-bold"
          >
            {reportTypesList.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="form-control w-full">
          <label className="label py-1">
            <span className="label-text font-bold text-[10px] text-brand-sage uppercase tracking-wider">Date From</span>
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input input-bordered input-sm w-full rounded-xl h-10 text-xs"
          />
        </div>

        {/* Date To */}
        <div className="form-control w-full">
          <label className="label py-1">
            <span className="label-text font-bold text-[10px] text-brand-sage uppercase tracking-wider">Date To</span>
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input input-bordered input-sm w-full rounded-xl h-10 text-xs"
          />
        </div>

        {/* Dynamic Filters depending on Report Type */}
        {reportType !== "staff_activity" && reportType !== "claim_verification" && (
          <>
            {/* Category */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-bold text-[10px] text-brand-sage uppercase tracking-wider">Category</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="select select-bordered select-sm w-full rounded-xl h-10 text-xs"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-bold text-[10px] text-brand-sage uppercase tracking-wider">Location</span>
              </label>
              <select
                value={foundLocationId}
                onChange={(e) => setFoundLocationId(e.target.value)}
                className="select select-bordered select-sm w-full rounded-xl h-10 text-xs"
              >
                <option value="">All Locations</option>
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {reportType === "staff_activity" && (
          <div className="form-control w-full sm:col-span-2">
            <label className="label py-1">
              <span className="label-text font-bold text-[10px] text-brand-sage uppercase tracking-wider">Select Staff Member</span>
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="select select-bordered select-sm w-full rounded-xl h-10 text-xs"
            >
              <option value="">All Staff</option>
              {staffList.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Report Results Table */}
      {isLoading ? (
        <MtableLoading />
      ) : (
        <div className="card bg-white dark:bg-brand-charcoal shadow-xl border border-brand-beige/25 dark:border-brand-beige/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-brand-primary text-white font-bold uppercase text-xs tracking-wider">
                {reportData.length > 0 ? (
                  <tr>
                    {Object.keys(reportData[0]).map((key) => (
                      <th key={key} className="p-4">{key}</th>
                    ))}
                  </tr>
                ) : (
                  <tr>
                    <th className="p-4">Report Data</th>
                  </tr>
                )}
              </thead>
              <tbody className="text-sm">
                {reportData.length > 0 ? (
                  reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige/10 dark:border-brand-beige/5">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="p-4 font-medium">
                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="text-center py-20 text-brand-sage font-bold uppercase tracking-wider text-xs">
                      No report entries match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hidden print container */}
      <div style={{ display: "none" }}>
        {printRes && (
          <PrintReportTemplate
            ref={printRef}
            title={reportTypesList.find((r) => r.value === reportType)?.label}
            subtitle="Lost & Found Report Ledger"
            dateRange={from && to ? `${new Date(from).toLocaleDateString("en-GB")} to ${new Date(to).toLocaleDateString("en-GB")}` : "All Time"}
          >
            <table className="print-table">
              <thead>
                <tr>
                  {printRes.length > 0 && Object.keys(printRes[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {printRes.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, i) => (
                      <td key={i}>
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintReportTemplate>
        )}
      </div>
    </div>
  );
}
