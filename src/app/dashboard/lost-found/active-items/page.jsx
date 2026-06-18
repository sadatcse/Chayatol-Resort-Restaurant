"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiSearch, FiSliders, FiEye, FiTrash2, FiX, FiCheck, FiInfo } from "react-icons/fi";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import ClaimTimeline from "@/components/lost-found/ClaimTimeline";
import ExportButtons from "@/components/Comon/ExportButtons";
import { exportToExcel, exportToCsv } from "@/lib/exportHelper";

export default function ActiveItemsPage() {
  const axiosSecure = useAxiosSecure();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [foundLocationId, setFoundLocationId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedItem, setSelectedItem] = useState(null);

  // Queries: Categories and Locations for filters
  const { data: categories = [] } = useQuery({
    queryKey: ["lostFoundCategories"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/lost-found/categories");
      return data;
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["lostFoundLocations"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/lost-found/locations");
      return data;
    },
  });

  // Main Query: Fetch Paginated Items
  const { data = { items: [], total: 0, pages: 1 }, isLoading } = useQuery({
    queryKey: ["activeItemsList", page, search, categoryId, foundLocationId, status, priority],
    queryFn: async () => {
      const params = new URLSearchParams({
        page,
        limit,
        search,
        categoryId,
        foundLocationId,
        status,
        priority,
      });
      const { data } = await axiosSecure.get(`/lost-found/items?${params.toString()}`);
      return data;
    },
  });

  // Mutation: Delete Item
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await axiosSecure.delete(`/lost-found/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["activeItemsList"]);
      toast.success("Found item deleted successfully!");
      setSelectedItem(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete item");
    },
  });

  // Mutation: Quick Storage Assign (Stored)
  const assignStorageMutation = useMutation({
    mutationFn: async ({ id, storageLocationId, lockerNumber, shelfNumber }) => {
      const { data } = await axiosSecure.put(`/lost-found/items/${id}`, {
        storageLocationId,
        lockerNumber,
        shelfNumber,
        status: "STORED",
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["activeItemsList"]);
      toast.success("Storage assigned successfully!");
      setSelectedItem(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to assign storage");
    },
  });

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will delete the item record permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0F172A",
      cancelButtonColor: "#EF4444",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(id);
      }
    });
  };

  const handleExport = (type) => {
    const flatData = data.items.map((item) => ({
      Code: item.itemCode,
      Name: item.name,
      Category: item.categoryId?.name || "N/A",
      FoundDate: new Date(item.foundAt).toLocaleDateString(),
      LocationFound: item.foundLocationId?.name || "N/A",
      FoundBy: item.foundBy,
      Status: item.status,
      Priority: item.priority,
    }));
    
    if (type === "excel") {
      exportToExcel(flatData, "Active_Lost_Found_Items", "Active Items");
    } else {
      exportToCsv(flatData, "Active_Lost_Found_Items");
    }
  };

  const activeTabs = [
    { label: "All", value: "" },
    { label: "Found", value: "FOUND" },
    { label: "Stored", value: "STORED" },
    { label: "Claim Requested", value: "CLAIM_REQUESTED" },
    { label: "Approved", value: "APPROVED" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader title="Active Found Items" subtitle="View and catalog currently active lost & found items" />
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <ExportButtons onExcel={() => handleExport("excel")} onCsv={() => handleExport("csv")} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-beige dark:border-brand-dark-grey/50 bg-white dark:bg-brand-charcoal p-1.5 rounded-2xl shadow-sm overflow-x-auto gap-2">
        {activeTabs.map((t) => (
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

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 bg-white dark:bg-brand-charcoal border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative w-full">
          <FiSearch className="absolute top-1/2 left-3.5 -translate-y-1/2 text-brand-sage" />
          <input
            type="text"
            placeholder="Search code, name, staff..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input input-bordered w-full pl-10 rounded-xl text-sm"
          />
        </div>

        {/* Category */}
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="select select-bordered w-full rounded-xl text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        {/* Location */}
        <select
          value={foundLocationId}
          onChange={(e) => {
            setFoundLocationId(e.target.value);
            setPage(1);
          }}
          className="select select-bordered w-full rounded-xl text-sm"
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l._id} value={l._id}>{l.name}</option>
          ))}
        </select>

        {/* Priority */}
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          className="select select-bordered w-full rounded-xl text-sm"
        >
          <option value="">All Priorities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </select>
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
                  <th className="p-4">Category</th>
                  <th className="p-4">Found At</th>
                  <th className="p-4">Location Found</th>
                  <th className="p-4 text-center">Priority</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center rounded-tr-2xl w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.items.length > 0 ? (
                  data.items.map((item) => (
                    <tr key={item._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige/10 dark:border-brand-beige/5">
                      <td className="p-4 font-mono font-bold text-brand-primary dark:text-brand-sage">{item.itemCode}</td>
                      <td className="p-4 font-semibold text-brand-charcoal dark:text-brand-offwhite">{item.name}</td>
                      <td className="p-4 text-brand-sage dark:text-brand-offwhite/60">{item.categoryId?.name || "N/A"}</td>
                      <td className="p-4 font-mono text-xs">{new Date(item.foundAt).toLocaleDateString()} {new Date(item.foundAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="p-4 text-brand-sage dark:text-brand-offwhite/60">{item.foundLocationId?.name || "N/A"}</td>
                      <td className="p-4 text-center">
                        <span className={`badge font-bold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider ${
                          item.priority === "HIGH"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                            : item.priority === "MEDIUM"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="badge font-bold px-3 py-2 rounded-full text-[9px] uppercase tracking-widest bg-brand-offwhite dark:bg-brand-dark-grey text-brand-charcoal border-brand-beige/50">
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="btn btn-xs btn-ghost btn-circle text-brand-primary hover:bg-brand-primary/10"
                            title="View Details"
                          >
                            <FiEye size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="btn btn-xs btn-ghost btn-circle text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Delete"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-brand-sage font-semibold uppercase tracking-wider text-xs">
                      No active found items logged.
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

      {/* Details Modal */}
      {selectedItem && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm z-50">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-4xl rounded-2xl shadow-2xl border border-brand-beige/25 dark:border-brand-beige/10 animate-scale-in">
            <div className="flex justify-between items-center p-5 border-b border-brand-beige/50 dark:border-brand-dark-grey/50 bg-brand-offwhite/50 dark:bg-brand-charcoal/30">
              <h3 className="font-bold text-base text-brand-charcoal dark:text-brand-offwhite uppercase tracking-wider">
                Item Details: {selectedItem.itemCode}
              </h3>
              <button onClick={() => setSelectedItem(null)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige/30">
                <FiX size={16} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[80vh] overflow-y-auto">
              {/* Left Column: Lifecycle, description, properties */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-brand-charcoal dark:text-brand-offwhite">{selectedItem.name}</h4>
                  <p className="text-xs text-brand-sage dark:text-brand-offwhite/50 font-semibold uppercase tracking-wide mt-1">
                    {selectedItem.categoryId?.name} • Priority: {selectedItem.priority}
                  </p>
                </div>

                <div className="space-y-2 text-sm text-brand-charcoal dark:text-brand-offwhite/80">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] font-bold text-brand-sage uppercase tracking-wider">Brand / Make</span>
                      <span className="font-semibold">{selectedItem.brand || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-brand-sage uppercase tracking-wider">Color</span>
                      <span className="font-semibold">{selectedItem.color || "—"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] font-bold text-brand-sage uppercase tracking-wider">Quantity</span>
                      <span className="font-semibold">{selectedItem.quantity} units</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-brand-sage uppercase tracking-wider">Estimated Value</span>
                      <span className="font-semibold font-mono">{selectedItem.estimatedValue} BDT</span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-brand-sage uppercase tracking-wider">Recovery Notes</span>
                    <p className="bg-brand-offwhite/50 dark:bg-brand-dark-grey/20 p-3 rounded-xl border border-brand-beige/30 text-xs text-brand-sage dark:text-brand-offwhite/70 italic mt-1 leading-relaxed">
                      {selectedItem.description || "No description provided."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] font-bold text-brand-sage uppercase tracking-wider">Found Location</span>
                      <span className="font-semibold">{selectedItem.foundLocationId?.name}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-brand-sage uppercase tracking-wider">Found By Staff</span>
                      <span className="font-semibold">{selectedItem.foundBy}</span>
                    </div>
                  </div>
                </div>

                {/* Claim Lifecycle Timeline */}
                <div className="border-t border-brand-beige/30 pt-6">
                  <ClaimTimeline currentStatus={selectedItem.status} />
                </div>
              </div>

              {/* Right Column: Storage config and Photo carousel */}
              <div className="space-y-6">
                
                {/* Storage Locker Widget */}
                <div className="bg-brand-offwhite/30 dark:bg-brand-charcoal/50 border border-brand-beige/30 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-primary dark:text-brand-sage">
                    Storage Information
                  </h4>
                  {selectedItem.storageLocationId ? (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="block text-[9px] text-brand-sage uppercase tracking-wider font-bold">Facility</span>
                        <span className="font-bold">{selectedItem.storageLocationId?.name}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-brand-sage uppercase tracking-wider font-bold">Locker #</span>
                        <span className="font-bold">{selectedItem.lockerNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-brand-sage uppercase tracking-wider font-bold">Shelf #</span>
                        <span className="font-bold">{selectedItem.shelfNumber || "—"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-brand-sage dark:text-brand-offwhite/60">
                        This item has not been assigned a storage location. Set storage values below:
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target);
                          assignStorageMutation.mutate({
                            id: selectedItem._id,
                            storageLocationId: formData.get("storageLocationId"),
                            lockerNumber: formData.get("lockerNumber"),
                            shelfNumber: formData.get("shelfNumber"),
                          });
                        }}
                        className="space-y-3"
                      >
                        <select
                          name="storageLocationId"
                          required
                          className="select select-bordered select-sm w-full rounded-lg"
                        >
                          <option value="">Select Location</option>
                          {locations.map((l) => (
                            <option key={l._id} value={l._id}>{l.name}</option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            name="lockerNumber"
                            placeholder="Locker #"
                            className="input input-bordered input-sm rounded-lg"
                          />
                          <input
                            type="text"
                            name="shelfNumber"
                            placeholder="Shelf #"
                            className="input input-bordered input-sm rounded-lg"
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-sm btn-primary bg-brand-primary w-full rounded-lg text-white font-semibold cursor-pointer"
                        >
                          Assign & Mark Stored
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Media Attachment Previews */}
                {selectedItem.images?.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-brand-sage uppercase tracking-wider">Photo Evidence</span>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedItem.images.map((img, idx) => (
                        <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-brand-beige/30 bg-black">
                          <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedItem.video && (
                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-brand-sage uppercase tracking-wider">Video Evidence</span>
                    <video src={selectedItem.video} controls className="w-full rounded-xl border border-brand-beige/30" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
