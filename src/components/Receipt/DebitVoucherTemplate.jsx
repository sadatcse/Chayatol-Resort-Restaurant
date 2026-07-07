"use client";

import React, { forwardRef, useContext } from "react";
import { AuthContext } from "@/providers/AuthProvider";

const numberToWords = (amount) => {
  const num = Math.floor(amount);
  const paisa = Math.round((amount - num) * 100);

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertHelper(n) {
    if (n < 20) return ones[n];
    const digit = n % 10;
    return tens[Math.floor(n / 10)] + (digit ? " " + ones[digit] : "");
  }

  function convertHundred(n) {
    if (n >= 100) {
      const remainder = n % 100;
      return ones[Math.floor(n / 100)] + " Hundred" + (remainder ? " and " + convertHelper(remainder) : "");
    }
    return convertHelper(n);
  }

  function convertAmount(n) {
    if (n === 0) return "Zero";
    let word = "";
    
    // Crore (1,00,00,000)
    if (n >= 10000000) {
      word += convertAmount(Math.floor(n / 10000000)) + " Crore ";
      n %= 10000000;
    }
    // Lakh (1,00,000)
    if (n >= 100000) {
      word += convertHundred(Math.floor(n / 100000)) + " Lakh ";
      n %= 100000;
    }
    // Thousand (1,000)
    if (n >= 1000) {
      word += convertHundred(Math.floor(n / 1000)) + " Thousand ";
      n %= 1000;
    }
    // Hundred & Below
    if (n > 0) {
      word += convertHundred(n);
    }
    return word.trim();
  }

  let result = convertAmount(num) + " Taka";
  if (paisa > 0) {
    result += " and " + convertHelper(paisa) + " Paisa";
  }
  return result + " Only";
};

const DebitVoucherTemplate = forwardRef(({ expense }, ref) => {
  const { company } = useContext(AuthContext);

  if (!expense) return null;

  const formattedDate = expense.expenseDate
    ? new Date(expense.expenseDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

  return (
    <div
      ref={ref}
      className="p-8 bg-white text-black font-sans w-full max-w-[210mm] mx-auto border border-gray-300"
      style={{ color: "#000", minHeight: "148mm" }} // Half A4 height approximately
    >
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .voucher-border {
            border: 2px solid #000 !important;
            padding: 20px !important;
            margin: 0 !important;
            background: white !important;
          }
          .dotted-line {
            border-bottom: 1px dotted #000 !important;
          }
          .print-bold {
            font-weight: bold !important;
          }
        }
        .voucher-border {
          border: 2px solid #000;
          padding: 24px;
          background: #fff;
        }
        .dotted-line {
          border-bottom: 1px dotted #888;
          display: inline-block;
        }
      `}</style>

      <div className="voucher-border">
        {/* Header Block */}
        <div className="grid grid-cols-12 gap-4 border-b border-gray-400 pb-4 mb-6 items-center">
          {/* Logo & Company Info (Left) */}
          <div className="col-span-8 flex items-center gap-4">
            {company?.logo ? (
              <img src={company.logo} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-14 h-14 bg-gray-100 flex items-center justify-center font-black text-lg border border-gray-300 rounded">
                CR
              </div>
            )}
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900 leading-none">
                {company?.name || "Chayatol Resort & Restaurant"}
              </h1>
              <p className="text-[10px] text-gray-600 mt-1 font-semibold leading-tight max-w-[300px]">
                {company?.address || "Resort Address, Bangladesh"}
              </p>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                Phone: {company?.phone || "N/A"} | Email: {company?.email || "N/A"}
              </p>
            </div>
          </div>

          {/* Title & Voucher Info (Right) */}
          <div className="col-span-4 text-right flex flex-col items-end gap-1.5">
            <div className="bg-gray-900 text-white font-black text-xs uppercase tracking-widest px-4 py-1.5 rounded text-center min-w-[140px] print:bg-black print:text-white">
              Debit Voucher
            </div>
            <div className="text-xs font-semibold text-gray-700 space-y-1">
              <div>
                <span className="text-gray-500">Voucher No:</span>{" "}
                <span className="font-bold font-mono text-gray-900 border-b border-gray-400 px-1">
                  {expense.referenceNo || `EXP-${expense._id?.toString().slice(-6).toUpperCase()}`}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>{" "}
                <span className="font-bold text-gray-900 border-b border-gray-400 px-1">
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account & Payee Information Row */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">A/C Head:</span>
            <span className="dotted-line flex-1 pb-0.5 text-gray-900 font-black uppercase text-xs">
              {expense.category?.name || "General Expense"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Name:</span>
            <span className="dotted-line flex-1 pb-0.5 text-gray-900 font-black uppercase text-xs">
              {expense.vendor || "Self / Petty Cash"}
            </span>
          </div>
        </div>

        {/* Particulars & Amount Table */}
        <div className="border border-gray-400 mb-6">
          <div className="grid grid-cols-12 bg-gray-150 border-b border-gray-400 text-xs font-black uppercase text-gray-700 print:bg-gray-200">
            <div className="col-span-9 p-3 border-r border-gray-400">Particulars</div>
            <div className="col-span-3 p-3 text-right">Amount (in BDT.)</div>
          </div>
          
          {/* Main particulars entry */}
          <div className="grid grid-cols-12 text-xs font-semibold" style={{ minHeight: "150px" }}>
            <div className="col-span-9 p-3 border-r border-gray-400 flex flex-col justify-between">
              <div>
                <p className="text-gray-900 font-bold leading-relaxed">
                  Being the amount paid for {expense.subcategory || "operational details"}
                </p>
                {expense.description && (
                  <p className="text-gray-600 mt-2 italic font-medium pl-2 border-l border-gray-300">
                    "{expense.description}"
                  </p>
                )}
              </div>
              
              {/* Optional padding lines to match paper voucher design */}
              <div className="mt-8 space-y-3.5 opacity-40 print:opacity-100">
                <div className="dotted-line w-full"></div>
                <div className="dotted-line w-full"></div>
              </div>
            </div>
            
            <div className="col-span-3 p-3 text-right flex flex-col justify-between font-mono font-bold text-gray-900">
              <span className="text-sm">৳{expense.amount.toLocaleString()}</span>
              <span></span>
            </div>
          </div>

          {/* Total Row */}
          <div className="grid grid-cols-12 border-t border-gray-400 bg-gray-50 text-xs font-black print:bg-white">
            <div className="col-span-9 p-3 text-right border-r border-gray-400 uppercase tracking-widest">
              Total
            </div>
            <div className="col-span-3 p-3 text-right font-mono text-sm border-b-2 border-double border-gray-600">
              ৳{expense.amount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Amount in words */}
        <div className="text-xs mb-10 flex items-start gap-2">
          <span className="font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap mt-0.5">Amount in words Tk:</span>
          <span className="dotted-line flex-1 pb-0.5 text-gray-900 font-black italic">
            {numberToWords(expense.amount)}
          </span>
        </div>

        {/* Footer Signature Blocks */}
        <div className="grid grid-cols-5 gap-4 text-center mt-12 text-[10px] font-bold text-gray-600">
          <div className="flex flex-col justify-end h-16">
            <div className="border-t border-gray-400 pt-1.5 uppercase tracking-wide">Prepared By</div>
          </div>
          <div className="flex flex-col justify-end h-16">
            <div className="border-t border-gray-400 pt-1.5 uppercase tracking-wide">Received By</div>
          </div>
          <div className="flex flex-col justify-end h-16">
            <div className="border-t border-gray-400 pt-1.5 uppercase tracking-wide">Checked By</div>
          </div>
          <div className="flex flex-col justify-end h-16">
            <div className="border-t border-gray-400 pt-1.5 uppercase tracking-wide">Accounts Manager</div>
          </div>
          <div className="flex flex-col justify-end h-16">
            <div className="border-t border-gray-400 pt-1.5 uppercase tracking-wide">Chairman/MD</div>
          </div>
        </div>
      </div>
    </div>
  );
});

DebitVoucherTemplate.displayName = "DebitVoucherTemplate";

export default DebitVoucherTemplate;
