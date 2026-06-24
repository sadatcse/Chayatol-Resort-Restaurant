"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useStandardPrint from "@/hooks/useStandardPrint";
import { FiSearch, FiEye, FiPrinter, FiX, FiInfo } from "react-icons/fi";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";

export default function ReturnNotesPage() {
  const axiosSecure = useAxiosSecure();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedNote, setSelectedNote] = useState(null);

  const {
    printData: printRes,
    setPrintData: setPrintRes,
    printRef,
    handlePrint
  } = useStandardPrint({
    documentTitle: selectedNote ? `ReturnNote_${selectedNote.returnNumber}` : "Return_Note"
  });

  // Query: Fetch Return Notes
  const { data = { notes: [], total: 0, pages: 1 }, isLoading } = useQuery({
    queryKey: ["returnNotesList", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page,
        limit,
        search,
      });
      const { data } = await axiosSecure.get(`/lost-found/return-notes?${params.toString()}`);
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <SectionHeader title="Return Notes" subtitle="View and reprint official handover acknowledgement slips" />

      {/* Search Bar */}
      <div className="relative max-w-md bg-white dark:bg-brand-charcoal border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl shadow-sm p-2 flex items-center">
        <FiSearch className="absolute left-5 text-brand-sage" />
        <input
          type="text"
          placeholder="Search return note number..."
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
                  <th className="p-4 rounded-tl-2xl">Return Number</th>
                  <th className="p-4">Item Code</th>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Claimant Name</th>
                  <th className="p-4">Handed Over By</th>
                  <th className="p-4 text-center">Returned Date</th>
                  <th className="p-4 text-center rounded-tr-2xl w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.notes.length > 0 ? (
                  data.notes.map((note) => (
                    <tr key={note._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige/10 dark:border-brand-beige/5">
                      <td className="p-4 font-mono font-bold text-brand-primary dark:text-brand-sage">{note.returnNumber}</td>
                      <td className="p-4 font-mono text-xs">{note.itemId?.itemCode || "N/A"}</td>
                      <td className="p-4 font-semibold text-brand-charcoal dark:text-brand-offwhite">{note.itemId?.name || "N/A"}</td>
                      <td className="p-4 font-bold text-brand-charcoal dark:text-brand-offwhite">{note.claimId?.claimantName || "N/A"}</td>
                      <td className="p-4 text-brand-sage dark:text-brand-offwhite/70">{note.returnedBy?.name || "System"}</td>
                      <td className="p-4 text-center font-mono text-xs">
                        {new Date(note.returnedAt).toLocaleDateString()} {new Date(note.returnedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedNote(note)}
                            className="btn btn-xs btn-ghost btn-circle text-brand-primary hover:bg-brand-primary/10"
                            title="Preview & Print"
                          >
                            <FiEye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-brand-sage font-semibold uppercase tracking-wider text-xs">
                      No return notes found.
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

      {/* Return Note Print Slip Modal */}
      {selectedNote && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm z-50">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-2xl rounded-2xl shadow-2xl border border-brand-beige/25 dark:border-brand-beige/10 animate-scale-in">
            <div className="flex justify-between items-center p-5 border-b border-brand-beige/50 dark:border-brand-dark-grey/50 bg-brand-offwhite/50 dark:bg-brand-charcoal/30">
              <h3 className="font-bold text-base text-brand-charcoal dark:text-brand-offwhite uppercase tracking-wider">
                Return Note Slip
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setPrintRes(selectedNote)}
                  className="btn btn-sm btn-primary bg-brand-primary border-brand-primary text-white hover:bg-brand-primary/95 flex items-center gap-1.5 rounded-lg px-3 cursor-pointer"
                >
                  <FiPrinter size={14} /> Print
                </button>
                <button onClick={() => setSelectedNote(null)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige/30">
                  <FiX size={16} />
                </button>
              </div>
            </div>

            {/* Note Paper Container */}
            <div className="p-8 max-h-[70vh] overflow-y-auto bg-slate-50 dark:bg-slate-900/10">
              <div
                ref={printRef}
                className="bg-white text-slate-800 p-8 rounded-xl border border-slate-200 shadow-sm font-sans mx-auto max-w-xl space-y-6 print:p-0 print:border-none print:shadow-none print:text-black"
                style={{ color: "#1E293B" }} // Keep dark text for printer legibility
              >
                {/* Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                  <h2 className="text-xl font-black uppercase tracking-widest text-slate-950">
                    Chayatol Resort
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    Lost & Found Department • Official Handover Slip
                  </p>
                </div>

                {/* Note Details */}
                <div className="flex justify-between text-xs border-b border-slate-200 pb-4">
                  <div>
                    <span className="block font-bold text-slate-400 uppercase text-[9px] tracking-wider">Note Number</span>
                    <span className="font-mono font-bold text-slate-950 text-sm">{selectedNote.returnNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-slate-400 uppercase text-[9px] tracking-wider">Date & Time</span>
                    <span className="font-mono font-semibold">
                      {new Date(selectedNote.returnedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Grid Item Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">
                      Item Description
                    </h4>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block font-bold text-[9px] uppercase">Item Code</span>
                        <span className="font-mono font-semibold">{selectedNote.itemId?.itemCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold text-[9px] uppercase">Item Name</span>
                        <span className="font-semibold">{selectedNote.itemId?.name}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block font-bold text-[9px] uppercase">Description</span>
                        <span className="text-slate-600 italic leading-relaxed">
                          {selectedNote.itemId?.description || "No description logged."}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">
                      Claimant Identification
                    </h4>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block font-bold text-[9px] uppercase">Claimant Name</span>
                        <span className="font-bold">{selectedNote.claimId?.claimantName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold text-[9px] uppercase">Phone Number</span>
                        <span className="font-mono">{selectedNote.claimId?.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold text-[9px] uppercase">ID / Passport</span>
                        <span>{selectedNote.claimId?.nidPassport || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold text-[9px] uppercase">Room / Booking</span>
                        <span>{selectedNote.claimId?.roomNumber || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Handover Statement */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-150 text-xs leading-relaxed text-slate-700">
                  <p className="font-semibold text-slate-900 text-center">
                    "I confirm that I have received the item in good condition."
                  </p>
                  {selectedNote.remarks && (
                    <p className="text-[10px] mt-2 border-t border-slate-200/60 pt-2 font-mono">
                      <strong>Remarks:</strong> {selectedNote.remarks}
                    </p>
                  )}
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-slate-300">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-full h-16 border border-slate-150 rounded bg-slate-50 flex items-center justify-center overflow-hidden">
                      <img
                        src={selectedNote.customerSignature}
                        alt="Customer Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Customer Signature
                    </span>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-full h-16 border border-slate-150 rounded bg-slate-50 flex items-center justify-center overflow-hidden">
                      <img
                        src={selectedNote.staffSignature}
                        alt="Staff Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Staff Handed Over By
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {selectedNote.returnedBy?.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
