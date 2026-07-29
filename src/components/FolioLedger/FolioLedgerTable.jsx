"use client";

import React from "react";
import { FiFileText } from "react-icons/fi";
import MtableLoading from "@/components/Comon/MtableLoading";
import { getFolioSummary } from "@/lib/folioSummary";

const formatDate = (dateVal) => {
  if (!dateVal) return "N/A";
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-GB");
};

// The actual "Folio Ledger" transaction list + running balance, unified so
// Front Desk and Stays always show the same columns (incl. Staff) and totals.
const FolioLedgerTable = ({ entries, loading, onViewInvoice }) => {
  const list = Array.isArray(entries) ? entries : [];
  const { totalDebit, totalCredit, outstandingDue } = getFolioSummary(list);

  return (
    <div className="space-y-4">
      <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block">Account Entries</span>
      {loading ? (
        <MtableLoading />
      ) : (
        <div className="overflow-x-auto border border-brand-beige/40 dark:border-brand-beige/10 rounded-xl p-2 max-h-[30vh]">
          {list.length === 0 ? (
            <div className="p-6 text-center text-xs font-bold text-brand-sage uppercase tracking-widest">No ledger transactions posted.</div>
          ) : (
            <table className="table w-full text-xs">
              <thead className="text-[9px] uppercase tracking-wider text-brand-sage border-b border-brand-beige/10">
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Staff</th>
                  <th className="text-right">Debit (+)</th>
                  <th className="text-right">Credit (-)</th>
                </tr>
              </thead>
              <tbody>
                {list.map(entry => (
                  <tr key={entry._id} className="border-b border-brand-beige/10 last:border-none text-brand-charcoal dark:text-brand-offwhite">
                    <td className="text-brand-sage text-[10px]">{formatDate(entry.date)}</td>
                    <td className="font-bold">
                      {entry.referenceId && (entry.type === "Food Charge" || entry.description.includes("Invoice")) ? (
                        <button
                          onClick={() => onViewInvoice?.(entry.referenceId)}
                          className="text-brand-primary hover:text-brand-secondary dark:text-brand-sage dark:hover:text-brand-sage/80 underline text-left font-bold cursor-pointer flex items-center gap-1 bg-transparent border-none p-0"
                          title="Click to view detailed POS invoice and print"
                        >
                          <FiFileText className="flex-shrink-0" /> {entry.description}
                        </button>
                      ) : (
                        entry.description
                      )}
                    </td>
                    <td className="text-brand-sage text-[10px] font-semibold">{entry.staffName || "Front Desk Staff"}</td>
                    <td className="text-right font-bold text-red-600">{entry.debit > 0 ? `৳${entry.debit}` : "-"}</td>
                    <td className="text-right font-bold text-green-600">{entry.credit > 0 ? `৳${entry.credit}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="flex justify-between items-center p-4 bg-brand-secondary/5 border-l-4 border-brand-secondary rounded-r-xl">
        <div>
          <span className="text-[9px] font-bold text-brand-sage uppercase tracking-widest block">Ledger Balance</span>
          <span className="text-base font-extrabold text-brand-secondary">Due: ৳{outstandingDue.toFixed(2)}</span>
        </div>
        <div className="text-right text-xs text-brand-sage font-bold">
          <div>Charges (Debit): ৳{totalDebit.toFixed(2)}</div>
          <div>Credits: ৳{totalCredit.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default FolioLedgerTable;
