"use client";

import React from "react";
import { FaFileExcel, FaFileCsv, FaPrint } from "react-icons/fa";

const ExportButtons = ({ onExportExcel, onExportCsv, onPrint, isLoading = false }) => {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={onExportExcel}
        disabled={isLoading}
        className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 text-white border-none rounded-full flex items-center gap-2 px-4 shadow-sm active:scale-95 transition-all text-xs font-semibold cursor-pointer h-9"
        title="Export all filtered data to Excel"
      >
        <FaFileExcel className="text-sm shrink-0" />
        <span>Excel</span>
      </button>

      <button
        onClick={onExportCsv}
        disabled={isLoading}
        className="btn btn-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 text-white border-none rounded-full flex items-center gap-2 px-4 shadow-sm active:scale-95 transition-all text-xs font-semibold cursor-pointer h-9"
        title="Export all filtered data to CSV"
      >
        <FaFileCsv className="text-sm shrink-0" />
        <span>CSV</span>
      </button>

      <button
        onClick={onPrint}
        disabled={isLoading}
        className="btn btn-sm bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50 text-white border-none rounded-full flex items-center gap-2 px-4 shadow-sm active:scale-95 transition-all text-xs font-semibold cursor-pointer h-9"
        title="Print or Save as PDF"
      >
        <FaPrint className="text-sm shrink-0" />
        {isLoading ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          <span>Print / PDF</span>
        )}
      </button>
    </div>
  );
};

export default ExportButtons;
