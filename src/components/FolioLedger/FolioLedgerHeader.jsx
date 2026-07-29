"use client";

import React from "react";
import ProfileCompletenessBadge from "@/components/Comon/ProfileCompletenessBadge";
import GuestListEditor from "@/components/GuestListEditor";

const formatDateTime = (dateVal) => {
  if (!dateVal) return "N/A";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

// Guest/customer metadata block shown at the top of the Folio Ledger view,
// shared between Front Desk and Stays so the guest list, profile-completeness
// status, and stay dates read identically in both places.
const FolioLedgerHeader = ({ stay, onViewProfile, onGuestsChange, guestsDisabled = false }) => {
  if (!stay) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-brand-offwhite dark:bg-brand-charcoal/45 p-4 rounded-xl">
      <div>
        <span className="text-brand-sage">Customer:</span>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="font-bold text-sm text-brand-charcoal dark:text-brand-offwhite">{stay.customer?.fullName}</span>
          <button
            onClick={onViewProfile}
            className="btn btn-xs btn-outline border-brand-primary text-brand-primary rounded-full px-3 hover:bg-brand-primary hover:text-white transition-all duration-200 cursor-pointer font-bold text-[10px]"
          >
            View Profile
          </button>
        </div>
        <div className="mt-1.5">
          <ProfileCompletenessBadge customer={stay.customer} />
        </div>
      </div>
      <div>
        <span className="text-brand-sage">Assigned Room(s):</span>
        <div className="font-bold font-mono mt-1 text-brand-charcoal dark:text-brand-offwhite">
          {stay.rooms?.map(r => r.room?.roomNumber).join(", ") || "N/A"}
        </div>
      </div>

      <div className="sm:col-span-2 pt-2 border-t border-brand-beige/20 space-y-3">
        <span className="text-brand-sage text-[9px] uppercase tracking-wider block">Guests Staying</span>
        {stay.rooms?.map((r) => (
          <div key={r.room?._id || r._id} className="bg-white dark:bg-brand-charcoal p-3 rounded-lg border border-brand-beige/30 dark:border-brand-beige/10">
            <div className="text-[10px] font-bold text-brand-primary uppercase tracking-wider mb-1">
              Room {r.room?.roomNumber || "N/A"}
            </div>
            <GuestListEditor
              guests={r.guests || []}
              onChange={(g) => onGuestsChange?.(r.room?._id, g)}
              capacity={r.room?.capacity}
              roomLabel={r.room?.roomNumber}
              disabled={guestsDisabled}
            />
          </div>
        ))}
      </div>

      <div className="sm:col-span-2 pt-2 border-t border-brand-beige/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-bold">
        <div>
          <span className="text-brand-sage text-[9px] uppercase tracking-wider block">Checked In:</span>
          <span className="text-brand-charcoal dark:text-brand-offwhite">{formatDateTime(stay.checkInDate)}</span>
        </div>
        <div>
          <span className="text-brand-sage text-[9px] uppercase tracking-wider block">Expected/Actual Check-Out:</span>
          <span className="text-brand-charcoal dark:text-brand-offwhite">
            {stay.actualCheckOutDate ? formatDateTime(stay.actualCheckOutDate) : formatDateTime(stay.expectedCheckOutDate)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FolioLedgerHeader;
