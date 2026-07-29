"use client";

import React from "react";
import { FiX, FiFileText } from "react-icons/fi";
import { buildStayGuestRows } from "@/lib/guestCapacity";

// Shared "Customer Profile Details" on-screen modal, used from Front Desk,
// Stays, and Guest Stay History so the primary guest's profile and the
// full "Guests Staying" list (spouse/kids/companions, not just the primary)
// read identically everywhere it's opened.
const CustomerProfileDetailsModal = ({ isOpen, stay, onClose, onPrint }) => {
  if (!isOpen || !stay || !stay.customer) return null;
  const customer = stay.customer;
  const guestRows = buildStayGuestRows(stay);

  return (
    <div className="fixed inset-0 z-50 bg-brand-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-beige/25 w-full max-w-2xl rounded-2xl shadow-2xl p-0 overflow-hidden animate-scale-in">
        <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
          <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
            Customer Profile Details
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Photo / Avatar */}
            <div className="flex flex-col items-center gap-3 w-full md:w-1/4">
              {customer.customerPhoto ? (
                <img
                  src={customer.customerPhoto}
                  alt={customer.fullName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-brand-primary/20 shadow-md"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-brand-primary/10 flex items-center justify-center font-black text-4xl text-brand-primary border-4 border-brand-primary/10 shadow-inner">
                  {customer.fullName?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-bold text-brand-sage uppercase tracking-wider">Guest Photo</span>
            </div>

            {/* Primary Info Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-3/4 text-sm">
              <div>
                <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Full Name</span>
                <span className="font-extrabold text-brand-charcoal dark:text-brand-offwhite">{customer.fullName}</span>
              </div>
              <div>
                <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Phone Number</span>
                <span className="font-bold">{customer.phoneNumber}</span>
              </div>
              <div>
                <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Email Address</span>
                <span className="font-bold">{customer.emailAddress || "N/A"}</span>
              </div>
              <div>
                <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Nationality</span>
                <span className="font-bold">{customer.nationality || "Bangladeshi"}</span>
              </div>
              <div>
                <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Gender / Marital Status</span>
                <span className="font-bold">{customer.gender} / {customer.maritalStatus}</span>
              </div>
              <div>
                <span className="text-xs text-brand-sage font-bold uppercase tracking-wider block">Date of Birth</span>
                <span className="font-bold">
                  {customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString("en-GB") : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* ID & Job Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-brand-beige/30">
            <div>
              <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-3">Identification</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-brand-sage block">ID Type & Number</span>
                  <span className="font-bold">{customer.identificationType || "N/A"} - {customer.identificationNumber || "N/A"}</span>
                </div>
                {customer.uploadIdCopy && (
                  <div className="mt-2">
                    <span className="text-xs text-brand-sage block mb-1">ID Copy Document</span>
                    <a
                      href={customer.uploadIdCopy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      <FiFileText /> View ID Copy Attachment
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-3">Occupation & Company</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-brand-sage block">Occupation</span>
                  <span className="font-bold">{customer.occupation || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-brand-sage block">Company Name</span>
                  <span className="font-bold">{customer.companyName || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Address details */}
          <div className="pt-4 border-t border-brand-beige/30 text-sm">
            <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-3">Residential Address</h4>
            <div className="p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/25 rounded-xl">
              {customer.address ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-brand-sage block">Street Address</span>
                    <span className="font-bold">
                      {customer.address.line1}
                      {customer.address.line2 ? `, ${customer.address.line2}` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-brand-sage block">City, Division & Country</span>
                    <span className="font-bold">
                      {customer.address.city || "—"}, {customer.address.division || "—"}, {customer.address.country || "Bangladesh"}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-brand-sage italic">No address provided.</span>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="pt-4 border-t border-brand-beige/30 text-sm">
            <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-3">Emergency Contact Details</h4>
            {customer.emergencyContact ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/25 rounded-xl">
                <div>
                  <span className="text-xs text-brand-sage block">Contact Name</span>
                  <span className="font-bold">{customer.emergencyContact.name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-brand-sage block">Relation</span>
                  <span className="font-bold">{customer.emergencyContact.relation || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-brand-sage block">Phone Number</span>
                  <span className="font-bold">{customer.emergencyContact.phoneNumber || "N/A"}</span>
                </div>
              </div>
            ) : (
              <span className="text-brand-sage italic">No emergency contact provided.</span>
            )}
          </div>

          {/* Guests Staying - primary guest plus every companion (spouse/kids/etc.) on this stay */}
          {guestRows.length > 0 && (
            <div className="pt-4 border-t border-brand-beige/30 text-sm">
              <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-3">Guests Staying</h4>
              <div className="space-y-1.5">
                {guestRows.map((row, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 text-xs bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/25 rounded-lg p-2">
                    <span className="font-bold text-brand-primary">Room {row.roomLabel}:</span>
                    <span className="font-bold text-brand-charcoal dark:text-brand-offwhite">{row.fullName}</span>
                    {row.isPrimary ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/30">Primary</span>
                    ) : row.relationToPrimary ? (
                      <span className="text-brand-sage">({row.relationToPrimary})</span>
                    ) : null}
                    {row.phoneNumber && <span className="text-brand-sage font-mono ml-auto">{row.phoneNumber}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
          <button onClick={onClose} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">
            Close
          </button>
          <button
            onClick={onPrint}
            className="btn bg-brand-primary hover:bg-brand-secondary text-white border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md"
          >
            Print Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfileDetailsModal;
