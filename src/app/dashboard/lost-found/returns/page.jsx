"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiSearch, FiCheck, FiX, FiInfo, FiFileText } from "react-icons/fi";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import SignaturePad from "@/components/lost-found/SignaturePad";

export default function ReturnManagementPage() {
  const axiosSecure = useAxiosSecure();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [customerSignature, setCustomerSignature] = useState("");
  const [staffSignature, setStaffSignature] = useState("");
  const [remarks, setRemarks] = useState("");

  // Query: Fetch all APPROVED claims that have not yet been returned (claimedAt is null/undefined)
  const { data = { claims: [] }, isLoading } = useQuery({
    queryKey: ["approvedClaimsList", search],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: "APPROVED",
        search,
      });
      const { data } = await axiosSecure.get(`/lost-found/claims?${params.toString()}`);
      
      // Filter out claims that are already claimed/returned (item status is RETURNED)
      const pendingReturns = data.claims.filter(
        (c) => c.itemId?.status !== "RETURNED"
      );
      
      return { claims: pendingReturns };
    },
  });

  // Mutation: Process Return
  const processReturnMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosSecure.post("/lost-found/returns", payload);
      return data;
    },
    onSuccess: (data) => {
      Swal.fire({
        title: "Item Returned!",
        text: `Hand-over complete. Return Note generated: ${data.returnNumber}`,
        icon: "success",
        confirmButtonColor: "#0F172A",
      });
      queryClient.invalidateQueries(["approvedClaimsList"]);
      handleCloseModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to process item return");
    },
  });

  const handleOpenReturnModal = (claim) => {
    setSelectedClaim(claim);
    setCustomerSignature("");
    setStaffSignature("");
    setRemarks("");
  };

  const handleCloseModal = () => {
    setSelectedClaim(null);
    setCustomerSignature("");
    setStaffSignature("");
    setRemarks("");
  };

  const handleCompleteReturn = () => {
    if (!customerSignature) {
      return toast.warning("Customer signature is required!");
    }
    if (!staffSignature) {
      return toast.warning("Staff signature is required!");
    }

    const payload = {
      claimId: selectedClaim._id,
      customerSignature,
      staffSignature,
      remarks,
    };

    processReturnMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Return Management" subtitle="Process handover of approved items to their rightful owners" />

      {/* Filter / Search bar */}
      <div className="relative max-w-md bg-white dark:bg-brand-charcoal border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl shadow-sm p-2 flex items-center">
        <FiSearch className="absolute left-5 text-brand-sage" />
        <input
          type="text"
          placeholder="Search approved claimant name, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input-bordered w-full pl-10 rounded-xl text-sm border-none bg-transparent focus:ring-0 focus:outline-none"
        />
      </div>

      {/* Grid of Pending Returns */}
      {isLoading ? (
        <MtableLoading />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.claims.length > 0 ? (
            data.claims.map((claim) => (
              <div
                key={claim._id}
                className="card bg-white dark:bg-brand-charcoal border border-brand-beige/25 dark:border-brand-beige/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="badge badge-outline text-[9px] uppercase tracking-wider font-bold border-brand-primary/30 text-brand-primary dark:text-brand-sage py-2 px-2.5 bg-brand-offwhite/50 dark:bg-brand-dark-grey/20">
                      {claim.itemId?.itemCode || "DELETED"}
                    </span>
                    <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold border-none text-[9px] uppercase tracking-widest px-2.5 py-2">
                      Ready to Return
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-brand-charcoal dark:text-brand-offwhite">
                      {claim.itemId?.name || "N/A"}
                    </h4>
                    <p className="text-xs text-brand-sage dark:text-brand-offwhite/50 font-medium">
                      Claimant: <span className="font-bold text-brand-charcoal dark:text-brand-offwhite">{claim.claimantName}</span>
                    </p>
                  </div>
                  <div className="text-xs space-y-1 bg-brand-offwhite/30 dark:bg-brand-dark-grey/25 p-3 rounded-xl border border-brand-beige/20 text-brand-charcoal dark:text-brand-offwhite/90">
                    <div className="flex justify-between">
                      <span className="text-brand-sage">Phone:</span>
                      <span className="font-mono">{claim.phone}</span>
                    </div>
                    {claim.email && (
                      <div className="flex justify-between">
                        <span className="text-brand-sage">Email:</span>
                        <span className="truncate max-w-[70%]">{claim.email}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-brand-sage">Room:</span>
                      <span>{claim.roomNumber || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenReturnModal(claim)}
                  className="btn btn-sm btn-primary bg-brand-primary border-brand-primary text-white hover:bg-brand-primary/95 rounded-xl w-full flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-brand-primary/10 uppercase text-[10px] tracking-widest font-black py-2.5"
                >
                  <FiCheck size={14} /> Process Handover
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16 bg-white dark:bg-brand-charcoal rounded-2xl border border-brand-beige/25 border-dashed">
              <FiInfo size={32} className="mx-auto text-brand-sage mb-2" />
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-sage">
                No approved claims pending return.
              </p>
              <p className="text-xs text-brand-sage/60 mt-1">
                Go to Claims Verification to review guest claims.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Return Handover Modal */}
      {selectedClaim && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm z-50">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-2xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/10 animate-scale-in">
            <div className="flex justify-between items-center p-5 border-b border-brand-beige/50 dark:border-brand-dark-grey/50 bg-brand-offwhite/50 dark:bg-brand-charcoal/30">
              <h3 className="font-bold text-base text-brand-charcoal dark:text-brand-offwhite uppercase tracking-wider">
                Complete Return Handover: {selectedClaim.itemId?.itemCode}
              </h3>
              <button onClick={handleCloseModal} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige/30">
                <FiX size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Handover Details */}
              <div className="bg-brand-offwhite/50 dark:bg-brand-charcoal/30 border border-brand-beige/30 p-4 rounded-xl text-xs space-y-2 text-brand-charcoal dark:text-brand-offwhite">
                <h4 className="font-bold uppercase tracking-wider text-brand-primary dark:text-brand-sage mb-1 flex items-center gap-1">
                  <FiFileText size={14} /> Item & Claimant Summary
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div>
                    <span className="text-brand-sage font-bold block uppercase text-[9px]">Item Name</span>
                    <span className="font-bold">{selectedClaim.itemId?.name}</span>
                  </div>
                  <div>
                    <span className="text-brand-sage font-bold block uppercase text-[9px]">Claimant Name</span>
                    <span className="font-bold">{selectedClaim.claimantName}</span>
                  </div>
                  <div>
                    <span className="text-brand-sage font-bold block uppercase text-[9px]">Phone</span>
                    <span>{selectedClaim.phone}</span>
                  </div>
                  <div>
                    <span className="text-brand-sage font-bold block uppercase text-[9px]">ID / Passport</span>
                    <span>{selectedClaim.nidPassport || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Signature Pads Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <SignaturePad
                    label="Customer Acknowledgement Signature *"
                    onSave={(dataUrl) => setCustomerSignature(dataUrl)}
                  />
                  {customerSignature && (
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold mt-1 block">
                      ✓ Signature Saved!
                    </span>
                  )}
                </div>
                <div>
                  <SignaturePad
                    label="Staff Handover Signature *"
                    onSave={(dataUrl) => setStaffSignature(dataUrl)}
                  />
                  {staffSignature && (
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold mt-1 block">
                      ✓ Signature Saved!
                    </span>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Remarks / Special Notes</span>
                </label>
                <textarea
                  placeholder="Record any remarks regarding the condition of the item upon handover..."
                  rows="2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="textarea textarea-bordered w-full rounded-xl text-sm"
                />
              </div>

              {/* Acknowledgement clause */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 p-4 rounded-xl text-[10px] text-amber-800 dark:text-amber-400 leading-relaxed font-medium">
                🚨 **Acknowledgement Statement**: By signing above, the recipient confirms that they have received the mentioned item in good condition, and the resort is cleared of any further liability regarding this item.
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-brand-beige/30">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-sm btn-ghost border border-brand-beige/50 rounded-xl px-4"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteReturn}
                  disabled={processReturnMutation.isPending || !customerSignature || !staffSignature}
                  className="btn btn-sm btn-primary bg-brand-primary border-brand-primary text-white hover:bg-brand-primary/95 rounded-xl px-5"
                >
                  Complete Handover
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
