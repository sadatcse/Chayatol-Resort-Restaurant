"use client";

import * as XLSX from "xlsx";

/**
 * Export data to Excel (.xlsx)
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Desired file name without extension
 * @param {String} sheetName - Excel sheet name
 */
export const exportToExcel = (data, fileName = "report", sheetName = "Report") => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Clean file name
  const cleanName = fileName.replace(/[^a-zA-Z0-9_\-]/g, "_");
  XLSX.writeFile(wb, `${cleanName}.xlsx`);
};

/**
 * Export data to CSV (.csv)
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Desired file name without extension
 */
export const exportToCsv = (data, fileName = "report") => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  
  // Clean file name
  const cleanName = fileName.replace(/[^a-zA-Z0-9_\-]/g, "_");
  // Save with bookType: "csv"
  XLSX.writeFile(wb, `${cleanName}.csv`, { bookType: "csv" });
};
