"use client";

import React from "react";
import { getFolioSummary } from "@/lib/folioSummary";

// "Folio Ledger Account Summary" category breakdown, shown in the checkout
// settlement modal on both Front Desk and Stays.
const FolioLedgerSummary = ({ entries }) => {
  const { roomTotal, foodTotal, serviceTotal, paymentsTotal, discountTotal, outstandingDue } = getFolioSummary(entries);

  return (
    <div className="p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/25 rounded-2xl space-y-2 text-xs">
      <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block border-b border-brand-beige/20 pb-2">Folio Ledger Account Summary</span>
      <div className="flex justify-between">
        <span>Room Charges (Debit):</span>
        <span className="font-bold text-brand-charcoal dark:text-brand-offwhite">৳{roomTotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Food Charges (Debit):</span>
        <span className="font-bold text-brand-charcoal dark:text-brand-offwhite">৳{foodTotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Service Charges (Debit):</span>
        <span className="font-bold text-brand-charcoal dark:text-brand-offwhite">৳{serviceTotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-brand-sage">
        <span>Payments &amp; Prepayments (Credit):</span>
        <span className="font-bold">৳{paymentsTotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-brand-secondary">
        <span>Discounts Applied (Credit):</span>
        <span className="font-bold">৳{discountTotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between border-t border-brand-beige/40 pt-2 text-sm font-extrabold text-brand-secondary">
        <span>Final Outstanding Balance:</span>
        <span>৳{outstandingDue.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default FolioLedgerSummary;
