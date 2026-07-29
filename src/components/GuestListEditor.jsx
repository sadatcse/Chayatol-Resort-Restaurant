"use client";

import React, { useState } from "react";
import { FiUsers, FiUserPlus, FiTrash2, FiEdit, FiX } from "react-icons/fi";

import useAxiosSecure from "@/hooks/useAxiosSecure";
import CustomerModal from "@/components/CustomerModal";
import ProfileCompletenessBadge from "@/components/Comon/ProfileCompletenessBadge";
import { resolveId } from "@/lib/guestCapacity";

// Per-room guest list editor: shows who is staying in one room-line of a
// Reservation/Stay, with search-existing-or-create-new "Add Guest" and
// per-guest edit/remove. Reused across check-in, reservations, and
// front-desk so the guest UI doesn't get built four separate times.
const GuestListEditor = ({ guests, onChange, capacity, roomLabel, disabled = false }) => {
  const axiosSecure = useAxiosSecure();
  const safeGuests = Array.isArray(guests) ? guests : [];
  const count = safeGuests.length;

  const [searchText, setSearchText] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [inlineError, setInlineError] = useState("");

  const isFull = capacity !== null && capacity !== undefined && count >= capacity;

  const badgeClass = !capacity
    ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
    : count > capacity
    ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50"
    : count === capacity
    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";

  const addGuest = (custObj) => {
    if (!custObj || !custObj._id) return;
    if (safeGuests.some((g) => resolveId(g.customer) === custObj._id)) {
      setInlineError("This guest is already in the list.");
      return;
    }
    if (capacity !== null && capacity !== undefined && count + 1 > capacity) {
      setInlineError(`Room ${roomLabel || ""} allows a maximum of ${capacity} guest(s). Remove a guest first or choose a larger room.`);
      return;
    }
    setInlineError("");
    onChange([...safeGuests, { customer: custObj, isPrimary: false, relationToPrimary: "" }]);
    setSearchResults([]);
    setSearchText("");
    setShowSearch(false);
  };

  const handleSearch = async () => {
    if (!searchText || searchText.trim().length < 3) {
      setInlineError("Enter at least 3 characters (name, phone, or NID/passport) to search.");
      return;
    }
    setInlineError("");
    setSearchLoading(true);
    try {
      const res = await axiosSecure.get(`/customer/paginated?search=${encodeURIComponent(searchText)}&limit=5`);
      setSearchResults(res.data.customers || []);
    } catch (e) {
      console.error("Guest search error:", e);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRemove = (guestEntry) => {
    if (guestEntry.isPrimary) return;
    onChange(safeGuests.filter((g) => resolveId(g.customer) !== resolveId(guestEntry.customer)));
  };

  const handleRelationChange = (guestEntry, value) => {
    onChange(
      safeGuests.map((g) =>
        resolveId(g.customer) === resolveId(guestEntry.customer) ? { ...g, relationToPrimary: value } : g
      )
    );
  };

  const handleEditSuccess = (updatedCust) => {
    onChange(
      safeGuests.map((g) => (resolveId(g.customer) === updatedCust._id ? { ...g, customer: updatedCust } : g))
    );
    setIsEditOpen(false);
    setEditingGuest(null);
  };

  const handleAddNewSuccess = (newCust) => {
    addGuest(newCust);
    setIsAddOpen(false);
  };

  return (
    <div className="w-full border-t border-brand-beige/40 dark:border-brand-beige/10 pt-3 mt-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
          <FiUsers size={11} /> Guests: {count}{capacity !== null && capacity !== undefined ? `/${capacity}` : ""}
        </span>

        {!disabled && (
          <button
            type="button"
            onClick={() => setShowSearch((s) => !s)}
            disabled={isFull}
            className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none rounded-full px-3 gap-1 disabled:opacity-40"
          >
            <FiUserPlus size={12} /> Add Guest
          </button>
        )}
      </div>

      {inlineError && <div className="text-[11px] text-red-600 dark:text-red-400 mt-1">{inlineError}</div>}

      <div className="flex flex-col gap-1.5 mt-2">
        {safeGuests.length === 0 && (
          <div className="text-[11px] text-brand-sage/70 italic">No guests added yet.</div>
        )}
        {safeGuests.map((g, gi) => (
          <div
            key={g._id || resolveId(g.customer) || gi}
            className="flex items-center justify-between gap-2 bg-white dark:bg-brand-charcoal p-2 rounded-lg border border-brand-beige/30 dark:border-brand-beige/10"
          >
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-800 dark:text-brand-offwhite truncate">
                  {g.customer?.fullName || "Unknown Guest"}
                </span>
                {g.isPrimary && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/30">
                    Primary
                  </span>
                )}
              </div>
              {g.customer?.phoneNumber && (
                <span className="text-[10px] text-brand-sage font-mono">{g.customer.phoneNumber}</span>
              )}
              <div className="mt-1">
                <ProfileCompletenessBadge customer={g.customer} />
              </div>
            </div>

            {!disabled && !g.isPrimary && (
              <input
                type="text"
                value={g.relationToPrimary || ""}
                onChange={(e) => handleRelationChange(g, e.target.value)}
                placeholder="Relation (e.g. Spouse)"
                className="input input-bordered input-xs border-brand-primary/40 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-28 shrink-0"
              />
            )}

            {!disabled && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingGuest(g);
                    setIsEditOpen(true);
                  }}
                  className="btn btn-ghost btn-xs text-brand-primary p-1 h-auto min-h-0"
                  title="View/Edit Guest"
                >
                  <FiEdit size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(g)}
                  disabled={g.isPrimary}
                  title={g.isPrimary ? "Change the primary guest via the Customer field instead" : "Remove guest"}
                  className="btn btn-ghost btn-xs text-red-500 p-1 h-auto min-h-0 disabled:opacity-30"
                >
                  <FiTrash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!disabled && showSearch && (
        <div className="flex flex-col gap-2 mt-2 p-3 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/50 dark:border-brand-beige/20 rounded-lg animate-fade-in">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name, phone, NID/passport..."
              className="input input-bordered input-sm border-brand-primary flex-1 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searchLoading}
              className="btn btn-sm bg-brand-primary hover:bg-brand-secondary text-white border-none px-4"
            >
              {searchLoading ? "..." : "Search"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchResults([]);
                setInlineError("");
              }}
              className="btn btn-ghost btn-sm p-1 min-h-0 h-8"
            >
              <FiX size={14} />
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {searchResults.map((cust) => (
                <div
                  key={cust._id}
                  className="flex justify-between items-center bg-white dark:bg-brand-charcoal p-2 rounded-lg border border-brand-beige/30 dark:border-brand-beige/10"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-gray-800 dark:text-brand-offwhite">{cust.fullName}</span>
                    <span className="text-[10px] text-brand-sage font-mono">{cust.phoneNumber || "No phone"}</span>
                    <ProfileCompletenessBadge customer={cust} />
                  </div>
                  <button
                    type="button"
                    onClick={() => addGuest(cust)}
                    className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none px-3 self-center"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="text-xs text-blue-500 font-bold hover:underline self-start"
          >
            + Add New Guest
          </button>
        </div>
      )}

      <CustomerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        customerToEdit={null}
        onSuccess={handleAddNewSuccess}
      />

      <CustomerModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingGuest(null);
        }}
        customerToEdit={editingGuest?.customer}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default GuestListEditor;
