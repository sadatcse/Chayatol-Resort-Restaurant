"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FiSearch, FiPlus, FiX, FiCheck, FiXCircle, FiAlertCircle, FiInfo } from "react-icons/fi";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import usePagePermission from "@/hooks/usePagePermission";

const claimSchema = z.object({
  itemId: z.string().min(1, "Please select the lost item"),
  claimantName: z.string().min(1, "Claimant name is required").trim(),
  phone: z.string().min(1, "Phone number is required").trim(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  nidPassport: z.string().optional(),
  roomNumber: z.string().optional(),
  verificationNotes: z.string().optional(),
});

export default function ClaimsVerificationPage() {
  const axiosSecure = useAxiosSecure();
  const queryClient = useQueryClient();
  const { canAdd, canEdit } = usePagePermission();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isNewClaimModalOpen, setIsNewClaimModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      itemId: "",
      claimantName: "",
      phone: "",
      email: "",
      nidPassport: "",
      roomNumber: "",
      verificationNotes: "",
    },
  });

  // Query: Fetch all claims
  const { data = { claims: [], total: 0, pages: 1 }, isLoading } = useQuery({
    queryKey: ["claimsList", page, search, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page,
        limit,
        search,
        status,
      });
      const { data } = await axiosSecure.get(`/lost-found/claims?${params.toString()}`);
      return data;
    },
  });

  // Query: Fetch claimable items (status FOUND or STORED or CLAIM_REQUESTED)
  const { data: claimableItems = [] } = useQuery({
    queryKey: ["claimableItems"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/lost-found/items?limit=100");
      return data.items.filter((item) =>
        ["FOUND", "STORED", "CLAIM_REQUESTED", "UNDER_VERIFICATION"].includes(item.status)
      );
    },
  });

  // Mutation: Log a new Claim
  const createClaimMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosSecure.post("/lost-found/claims", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["claimsList"]);
      toast.success("Guest claim logged successfully!");
      setIsNewClaimModalOpen(false);
      reset();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to submit claim");
    },
  });

  // Mutation: Verify Claim
  const verifyClaimMutation = useMutation({
    mutationFn: async ({ id, verificationStatus, verificationNotes }) => {
      const { data } = await axiosSecure.put(`/lost-found/claims/${id}/verify`, {
        verificationStatus,
        verificationNotes,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["claimsList"]);
      Swal.fire({
        title: `Claim ${data.verificationStatus}!`,
        text: `The claim has been successfully marked as ${data.verificationStatus.toLowerCase()}.`,
        icon: "success",
        confirmButtonColor: "#0F172A",
      });
      setIsVerifyModalOpen(false);
      setSelectedClaim(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to verify claim");
    },
  });

  const onNewClaimSubmit = (formData) => {
    if (!canAdd) {
      toast.error("You do not have permission to log guest claims.");
      return;
    }
    if (createClaimMutation.isPending) return;
    createClaimMutation.mutate(formData);
  };

  const handleVerifyClaim = (statusOutcome, notes) => {
    if (!canEdit) {
      toast.error("You do not have permission to verify guest claims.");
      return;
    }
    if (verifyClaimMutation.isPending) return;
    verifyClaimMutation.mutate({
      id: selectedClaim._id,
      verificationStatus: statusOutcome,
      verificationNotes: notes,
    });
  };

  const statusTabs = [
    { label: "All Claims", value: "" },
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader title="Claims Verification" subtitle="Verify guest claims and ownership proof for lost items" />
        {canAdd && (
          <button
            onClick={() => setIsNewClaimModalOpen(true)}
            className="btn btn-primary bg-brand-primary border-brand-primary text-white hover:bg-brand-primary/90 flex items-center gap-2 rounded-xl text-sm font-bold uppercase tracking-wider px-5 shadow-md shadow-brand-primary/10 cursor-pointer self-start sm:self-auto"
          >
            <FiPlus size={16} /> Log Guest Claim
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-beige dark:border-brand-dark-grey/50 bg-white dark:bg-brand-charcoal p-1.5 rounded-2xl shadow-sm overflow-x-auto gap-2">
        {statusTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setStatus(t.value);
              setPage(1);
            }}
            className={`py-2 px-5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              status === t.value
                ? "bg-brand-primary text-white shadow-md shadow-brand-primary/10"
                : "text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md bg-white dark:bg-brand-charcoal border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl shadow-sm p-2 flex items-center">
        <FiSearch className="absolute left-5 text-brand-sage" />
        <input
          type="text"
          placeholder="Search claimant name, phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="input input-bordered w-full pl-10 rounded-xl text-sm border-none bg-transparent focus:ring-0 focus:outline-none"
        />
      </div>

      {/* Data Table */}
      {isLoading ? (
        <MtableLoading />
      ) : (
        <div className="card bg-white dark:bg-brand-charcoal shadow-xl border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-brand-primary text-white font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-4 rounded-tl-2xl">Item Code</th>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Claimant Name</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4 text-center">Room</th>
                  <th className="p-4 text-center">Claim Date</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center rounded-tr-2xl w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.claims.length > 0 ? (
                  data.claims.map((claim) => (
                    <tr key={claim._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige/10 dark:border-brand-beige/5">
                      <td className="p-4 font-mono font-bold text-brand-primary dark:text-brand-sage">
                        {claim.itemId?.itemCode || "DELETED"}
                      </td>
                      <td className="p-4 font-semibold text-brand-charcoal dark:text-brand-offwhite">
                        {claim.itemId?.name || "N/A"}
                      </td>
                      <td className="p-4 font-bold text-brand-charcoal dark:text-brand-offwhite">{claim.claimantName}</td>
                      <td className="p-4 font-mono text-xs">{claim.phone}</td>
                      <td className="p-4 text-center font-semibold">{claim.roomNumber || "—"}</td>
                      <td className="p-4 text-center font-mono text-xs">{new Date(claim.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-center">
                        <span className={`badge font-bold px-3 py-2 rounded-full text-[9px] uppercase tracking-wider ${
                          claim.verificationStatus === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : claim.verificationStatus === "REJECTED"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                        }`}>
                          {claim.verificationStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedClaim(claim);
                              setIsVerifyModalOpen(true);
                            }}
                            className="btn btn-xs btn-ghost btn-circle text-brand-primary hover:bg-brand-primary/10"
                            title="Verify Claim"
                          >
                            <FiInfo size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-brand-sage font-semibold uppercase tracking-wider text-xs">
                      No claims found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div className="p-4 flex justify-end border-t border-brand-beige/10">
              <Pagination currentPage={page} totalPages={data.pages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Log Guest Claim Modal */}
      {isNewClaimModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm z-50">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-lg rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/10 animate-scale-in">
            <div className="flex justify-between items-center p-5 border-b border-brand-beige/50 dark:border-brand-dark-grey/50 bg-brand-offwhite/50 dark:bg-brand-charcoal/30">
              <h3 className="font-bold text-base text-brand-charcoal dark:text-brand-offwhite uppercase tracking-wider">
                Log Guest Claim
              </h3>
              <button onClick={() => setIsNewClaimModalOpen(false)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige/30">
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onNewClaimSubmit)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Select Lost Item *</span>
                </label>
                <select
                  className="select select-bordered w-full rounded-xl text-sm"
                  {...register("itemId")}
                >
                  <option value="">Choose item...</option>
                  {claimableItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} ({item.itemCode}) — Found: {item.foundLocationId?.name}
                    </option>
                  ))}
                </select>
                {errors.itemId && (
                  <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                    <FiAlertCircle size={12} /> {errors.itemId.message}
                  </span>
                )}
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Claimant Name *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alice Smith"
                  className="input input-bordered w-full rounded-xl text-sm"
                  {...register("claimantName")}
                />
                {errors.claimantName && (
                  <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                    <FiAlertCircle size={12} /> {errors.claimantName.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Phone *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +8801712..."
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                      <FiAlertCircle size={12} /> {errors.phone.message}
                    </span>
                  )}
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Email Address</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. guest@domain.com"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("email")}
                  />
                  {errors.email && (
                    <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                      <FiAlertCircle size={12} /> {errors.email.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">ID / Passport Number</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NID/Passport"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("nidPassport")}
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Room Number</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 402"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("roomNumber")}
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Verification Notes</span>
                </label>
                <textarea
                  placeholder="Record claimant verification evidence (e.g. item color, brand, unique logos, etc.)"
                  rows="3"
                  className="textarea textarea-bordered w-full rounded-xl text-sm"
                  {...register("verificationNotes")}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-brand-beige/30">
                <button
                  type="button"
                  onClick={() => setIsNewClaimModalOpen(false)}
                  className="btn btn-sm btn-ghost border border-brand-beige/50 rounded-xl px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClaimMutation.isPending}
                  className="btn btn-sm btn-primary bg-brand-primary border-brand-primary text-white hover:bg-brand-primary/95 rounded-xl px-5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {createClaimMutation.isPending ? (
                    <>
                      <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full mr-1"></span>
                      Saving...
                    </>
                  ) : (
                    "Create Claim"
                  )}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Verify Claim Modal */}
      {isVerifyModalOpen && selectedClaim && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm z-50">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/10 animate-scale-in">
            <div className="flex justify-between items-center p-5 border-b border-brand-beige/50 dark:border-brand-dark-grey/50 bg-brand-offwhite/50 dark:bg-brand-charcoal/30">
              <h3 className="font-bold text-base text-brand-charcoal dark:text-brand-offwhite uppercase tracking-wider">
                Claim Verification: {selectedClaim.itemId?.itemCode}
              </h3>
              <button onClick={() => {
                setIsVerifyModalOpen(false);
                setSelectedClaim(null);
              }} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige/30">
                <FiX size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="space-y-2 text-xs bg-brand-offwhite/50 dark:bg-brand-charcoal/30 p-4 border border-brand-beige/30 rounded-2xl leading-relaxed text-brand-charcoal dark:text-brand-offwhite">
                <h4 className="font-bold uppercase tracking-wider text-brand-primary dark:text-brand-sage mb-2">Claimant Info</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-brand-sage uppercase font-bold text-[9px] block">Name</span>
                    <span className="font-bold text-sm">{selectedClaim.claimantName}</span>
                  </div>
                  <div>
                    <span className="text-brand-sage uppercase font-bold text-[9px] block">Phone</span>
                    <span className="font-semibold text-sm">{selectedClaim.phone}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-brand-sage uppercase font-bold text-[9px] block">Email</span>
                    <span>{selectedClaim.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-brand-sage uppercase font-bold text-[9px] block">National ID / Passport</span>
                    <span>{selectedClaim.nidPassport || "—"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-brand-sage uppercase font-bold text-[9px] block">Room #</span>
                    <span>{selectedClaim.roomNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-brand-sage uppercase font-bold text-[9px] block">Found Location</span>
                    <span>{selectedClaim.itemId?.foundLocationId?.name || "—"}</span>
                  </div>
                </div>
                {selectedClaim.itemId?.description && (
                  <div className="mt-2 border-t border-brand-beige/25 pt-2">
                    <span className="text-brand-sage uppercase font-bold text-[9px] block">Found Details Notes</span>
                    <p className="italic text-brand-sage font-medium mt-0.5">{selectedClaim.itemId.description}</p>
                  </div>
                )}
              </div>

              {selectedClaim.verificationStatus === "PENDING" ? (
                <div className="space-y-4">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Verification Notes *</span>
                    </label>
                    <textarea
                      id="vNotes"
                      placeholder={canEdit ? "Add details regarding how ownership was verified (e.g. proof of photos, serial match, security passcode, etc.)" : "Verification remarks are restricted."}
                      rows="3"
                      disabled={!canEdit}
                      className="textarea textarea-bordered w-full rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-brand-beige/30">
                    {canEdit ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleVerifyClaim("REJECTED", document.getElementById("vNotes").value)}
                          disabled={verifyClaimMutation.isPending}
                          className="btn btn-sm btn-error text-white hover:bg-error/85 rounded-xl px-5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {verifyClaimMutation.isPending ? (
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1"></span>
                          ) : (
                            <FiXCircle size={15} />
                          )}
                          Reject Claim
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyClaim("APPROVED", document.getElementById("vNotes").value)}
                          disabled={verifyClaimMutation.isPending}
                          className="btn btn-sm btn-success text-white hover:bg-emerald-600 rounded-xl px-5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {verifyClaimMutation.isPending ? (
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1"></span>
                          ) : (
                            <FiCheck size={15} />
                          )}
                          Approve Claim
                        </button>
                      </>
                    ) : (
                      <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite dark:bg-brand-offwhite/5 border-none py-3 px-4">Verification Restricted</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-brand-offwhite/20 dark:bg-brand-charcoal/20 p-4 rounded-xl border border-brand-beige/20 text-xs">
                  <div>
                    <span className="text-brand-sage font-bold uppercase tracking-wider block">Verification Outcome</span>
                    <span className="font-bold capitalize text-sm">{selectedClaim.verificationStatus.toLowerCase()}</span>
                  </div>
                  <div>
                    <span className="text-brand-sage font-bold uppercase tracking-wider block">Verified By / Time</span>
                    <span className="font-mono">{selectedClaim.verifiedBy?.name || "System"} at {new Date(selectedClaim.verifiedAt).toLocaleString()}</span>
                  </div>
                  {selectedClaim.verificationNotes && (
                    <div>
                      <span className="text-brand-sage font-bold uppercase tracking-wider block">Verification Remarks</span>
                      <p className="mt-1 font-semibold">{selectedClaim.verificationNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
