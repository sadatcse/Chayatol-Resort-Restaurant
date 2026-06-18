"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiAlertCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";

const locationSchema = z.object({
  name: z.string().min(1, "Location name is required").trim(),
  type: z.enum(["Room", "Lobby", "Reception", "Pool", "Restaurant", "Parking", "Others"]),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function LocationsPage() {
  const axiosSecure = useAxiosSecure();
  const queryClient = useQueryClient();
  const [editingLocation, setEditingLocation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: "", type: "Others", description: "", isActive: true }
  });

  // Query: Fetch locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["lostFoundLocations"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/lost-found/locations");
      return data;
    },
  });

  // Mutation: Create Location
  const createMutation = useMutation({
    mutationFn: async (newLoc) => {
      const { data } = await axiosSecure.post("/lost-found/locations", newLoc);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["lostFoundLocations"]);
      toast.success("Location created successfully!");
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create location");
    },
  });

  // Mutation: Update Location
  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedLoc }) => {
      const { data } = await axiosSecure.put(`/lost-found/locations/${id}`, updatedLoc);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["lostFoundLocations"]);
      toast.success("Location updated successfully!");
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update location");
    },
  });

  // Mutation: Delete Location
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await axiosSecure.delete(`/lost-found/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["lostFoundLocations"]);
      toast.success("Location deleted successfully!");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete location");
    },
  });

  const onSubmit = (formData) => {
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation._id, updatedLoc: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openAddModal = () => {
    setEditingLocation(null);
    reset({ name: "", type: "Others", description: "", isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (loc) => {
    setEditingLocation(loc);
    reset({
      name: loc.name,
      type: loc.type,
      description: loc.description || "",
      isActive: loc.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will delete the location permanently.",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader title="Lost & Found Locations" subtitle="Manage locations for recovery and storage" />
        <button
          onClick={openAddModal}
          className="btn btn-primary bg-brand-primary border-brand-primary text-white hover:bg-brand-primary/90 flex items-center gap-2 rounded-xl text-sm font-bold uppercase tracking-wider px-5 shadow-md shadow-brand-primary/10 cursor-pointer self-start sm:self-auto"
        >
          <FiPlus size={16} /> Add Location
        </button>
      </div>

      {isLoading ? (
        <MtableLoading />
      ) : (
        <div className="card bg-white dark:bg-brand-charcoal shadow-xl border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-brand-primary text-white font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-4 rounded-tl-2xl">Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center rounded-tr-2xl w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {locations.length > 0 ? (
                  locations.map((loc) => (
                    <tr key={loc._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige/10 dark:border-brand-beige/5">
                      <td className="p-4 font-bold text-brand-charcoal dark:text-brand-offwhite">{loc.name}</td>
                      <td className="p-4">
                        <span className="badge badge-outline text-brand-primary dark:text-brand-sage font-semibold border-brand-primary/30 py-2.5 px-3 capitalize">
                          {loc.type}
                        </span>
                      </td>
                      <td className="p-4 text-brand-sage dark:text-brand-offwhite/60">{loc.description || "—"}</td>
                      <td className="p-4 text-center">
                        <span className={`badge font-bold px-3 py-2 rounded-full text-[10px] uppercase tracking-wider ${
                          loc.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                        }`}>
                          {loc.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(loc)}
                            className="btn btn-xs btn-ghost btn-circle text-brand-primary hover:bg-brand-primary/10"
                            title="Edit"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(loc._id)}
                            className="btn btn-xs btn-ghost btn-circle text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Delete"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-brand-sage font-semibold uppercase tracking-wider text-xs">
                      No locations found. Click Add Location to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm z-50">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/10 animate-scale-in">
            <div className="flex justify-between items-center p-5 border-b border-brand-beige/50 dark:border-brand-dark-grey/50 bg-brand-offwhite/50 dark:bg-brand-charcoal/30">
              <h3 className="font-bold text-base text-brand-charcoal dark:text-brand-offwhite uppercase tracking-wider">
                {editingLocation ? "Edit Location" : "Add New Location"}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige/30">
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Location Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lobby Locker A"
                  className={`input input-bordered w-full rounded-xl text-sm ${
                    errors.name ? "border-red-500 focus:ring-red-500" : "border-brand-beige dark:border-brand-dark-grey/50"
                  }`}
                  {...register("name")}
                />
                {errors.name && (
                  <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                    <FiAlertCircle size={12} /> {errors.name.message}
                  </span>
                )}
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Location Type</span>
                </label>
                <select
                  className="select select-bordered w-full rounded-xl text-sm border-brand-beige dark:border-brand-dark-grey/50"
                  {...register("type")}
                >
                  {["Room", "Lobby", "Reception", "Pool", "Restaurant", "Parking", "Others"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Description</span>
                </label>
                <textarea
                  placeholder="Provide location details..."
                  rows="3"
                  className="textarea textarea-bordered w-full rounded-xl text-sm border-brand-beige dark:border-brand-dark-grey/50"
                  {...register("description")}
                />
              </div>

              <div className="form-control p-2 bg-brand-offwhite/50 dark:bg-brand-dark-grey/20 rounded-xl border border-brand-beige/30">
                <label className="label cursor-pointer justify-between items-center flex">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Active Status</span>
                  <input
                    type="checkbox"
                    className="checkbox [--chkbg:var(--color-brand-primary)] [--chkfg:var(--color-brand-white)]"
                    {...register("isActive")}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-brand-beige/30">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-sm btn-ghost border border-brand-beige/50 text-brand-charcoal dark:text-brand-offwhite rounded-xl px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn btn-sm btn-primary bg-brand-primary border-brand-primary text-white hover:bg-brand-primary/90 rounded-xl px-5 flex items-center gap-1.5"
                >
                  <FiCheck size={14} /> Save
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
