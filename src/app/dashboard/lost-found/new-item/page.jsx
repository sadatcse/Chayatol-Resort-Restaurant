"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import MediaUploader from "@/components/lost-found/MediaUploader";
import { FiCheck, FiAlertCircle } from "react-icons/fi";
import usePagePermission from "@/hooks/usePagePermission";

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required").trim(),
  categoryId: z.string().min(1, "Category is required"),
  brand: z.string().optional(),
  color: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  estimatedValue: z.number().min(0, "Value cannot be negative"),
  foundAt: z.string().min(1, "Date and time found is required"),
  foundLocationId: z.string().min(1, "Found location is required"),
  roomId: z.string().optional(),
  foundBy: z.string().min(1, "Found by staff is required").trim(),
  departmentId: z.string().optional(),
  storageLocationId: z.string().optional(),
  lockerNumber: z.string().optional(),
  shelfNumber: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  notes: z.string().optional(),
});

export default function NewItemEntryPage() {
  const axiosSecure = useAxiosSecure();
  const { canAdd } = usePagePermission();
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      brand: "",
      color: "",
      quantity: 1,
      estimatedValue: 0,
      foundAt: new Date().toISOString().slice(0, 16), // current datetime local
      foundLocationId: "",
      roomId: "",
      foundBy: "",
      departmentId: "",
      storageLocationId: "",
      lockerNumber: "",
      shelfNumber: "",
      priority: "LOW",
      notes: "",
    },
  });

  // Watch found location selection to determine if it is a "Room" type location
  const watchedLocationId = watch("foundLocationId");

  // Query: Fetch active categories
  const { data: categories = [] } = useQuery({
    queryKey: ["activeCategories"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/lost-found/categories");
      return data.filter((c) => c.isActive);
    },
  });

  // Query: Fetch active locations
  const { data: locations = [] } = useQuery({
    queryKey: ["activeLocations"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/lost-found/locations");
      return data.filter((l) => l.isActive);
    },
  });

  // Query: Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/department");
      return data;
    },
  });

  // Find if selected location is Room type
  const selectedLocation = locations.find((l) => l._id === watchedLocationId);
  const isRoomSelected = selectedLocation?.type === "Room";

  // Mutation: Create Item
  const createItemMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await axiosSecure.post("/lost-found/items", payload);
      return data;
    },
    onSuccess: (data) => {
      Swal.fire({
        title: "Entry Created!",
        text: `Item logged successfully with Code: ${data.itemCode}`,
        icon: "success",
        confirmButtonColor: "#0F172A",
      });
      reset();
      setImages([]);
      setVideo("");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to save found item entry");
    },
  });

  const onSubmit = (formData) => {
    if (!canAdd) {
      toast.error("You do not have permission to add new items.");
      return;
    }
    if (createItemMutation.isPending) return;
    const payload = {
      ...formData,
      images,
      video,
    };
    createItemMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionHeader title="New Found Item Entry" subtitle="Log a newly discovered lost item into the system" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left / Middle: Form Fields */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Basic Information Card */}
            <div className="card bg-white dark:bg-brand-charcoal p-6 border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-primary dark:text-brand-sage border-b border-brand-beige/20 pb-2">
                Item Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Item Name *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Leather Wallet"
                    className="input input-bordered w-full rounded-xl text-sm"
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
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Category *</span>
                  </label>
                  <select
                    className="select select-bordered w-full rounded-xl text-sm"
                    {...register("categoryId")}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                      <FiAlertCircle size={12} /> {errors.categoryId.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="form-control sm:col-span-2">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Brand / Make</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gucci"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("brand")}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Color</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brown"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("color")}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Quantity</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("quantity", { valueAsNumber: true })}
                  />
                  {errors.quantity && (
                    <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                      <FiAlertCircle size={12} /> {errors.quantity.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Estimated Value (BDT)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("estimatedValue", { valueAsNumber: true })}
                  />
                  {errors.estimatedValue && (
                    <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                      <FiAlertCircle size={12} /> {errors.estimatedValue.message}
                    </span>
                  )}
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Auto-Generated Code</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    placeholder="LF-YYYYMMDD-0001 (Auto)"
                    className="input input-bordered w-full rounded-xl text-sm font-mono bg-brand-offwhite/50"
                  />
                </div>
              </div>
            </div>

            {/* Recovery Details Card */}
            <div className="card bg-white dark:bg-brand-charcoal p-6 border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-primary dark:text-brand-sage border-b border-brand-beige/20 pb-2">
                Recovery Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Date & Time Found *</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("foundAt")}
                  />
                  {errors.foundAt && (
                    <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                      <FiAlertCircle size={12} /> {errors.foundAt.message}
                    </span>
                  )}
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Found Location *</span>
                  </label>
                  <select
                    className="select select-bordered w-full rounded-xl text-sm"
                    {...register("foundLocationId")}
                  >
                    <option value="">Select Location</option>
                    {locations.map((l) => (
                      <option key={l._id} value={l._id}>{l.name} ({l.type})</option>
                    ))}
                  </select>
                  {errors.foundLocationId && (
                    <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                      <FiAlertCircle size={12} /> {errors.foundLocationId.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Found By Staff *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("foundBy")}
                  />
                  {errors.foundBy && (
                    <span className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                      <FiAlertCircle size={12} /> {errors.foundBy.message}
                    </span>
                  )}
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Staff Department</span>
                  </label>
                  <select
                    className="select select-bordered w-full rounded-xl text-sm"
                    {...register("departmentId")}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.department}</option>
                    ))}
                  </select>
                </div>

                {isRoomSelected && (
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Room Number *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Room 304"
                      className="input input-bordered w-full rounded-xl text-sm"
                      {...register("roomId")}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Storage Details Card */}
            <div className="card bg-white dark:bg-brand-charcoal p-6 border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-primary dark:text-brand-sage border-b border-brand-beige/20 pb-2">
                Storage Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Storage Facility</span>
                  </label>
                  <select
                    className="select select-bordered w-full rounded-xl text-sm"
                    {...register("storageLocationId")}
                  >
                    <option value="">Select Storage Location</option>
                    {locations.map((l) => (
                      <option key={l._id} value={l._id}>{l.name} ({l.type})</option>
                    ))}
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Locker Number</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Locker #4"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("lockerNumber")}
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Shelf Number</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shelf #2"
                    className="input input-bordered w-full rounded-xl text-sm"
                    {...register("shelfNumber")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: Media Uploads & Metadata */}
          <div className="space-y-6">
            
            {/* Media Box */}
            <div className="card bg-white dark:bg-brand-charcoal p-6 border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-primary dark:text-brand-sage border-b border-brand-beige/20 pb-2 mb-4">
                Media Attachments
              </h3>
              <MediaUploader
                images={images}
                setImages={setImages}
                video={video}
                setVideo={setVideo}
              />
            </div>

            {/* Extra Info Box */}
            <div className="card bg-white dark:bg-brand-charcoal p-6 border border-brand-beige/20 dark:border-brand-beige/10 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-primary dark:text-brand-sage border-b border-brand-beige/20 pb-2">
                Additional Information
              </h3>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Priority Level</span>
                </label>
                <select
                  className="select select-bordered w-full rounded-xl text-sm"
                  {...register("priority")}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Internal Notes</span>
                </label>
                <textarea
                  placeholder="Record packaging details, unique identifiers, etc."
                  rows="4"
                  className="textarea textarea-bordered w-full rounded-xl text-sm"
                  {...register("notes")}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setImages([]);
                  setVideo("");
                }}
                className="btn btn-outline border-brand-beige text-brand-charcoal dark:text-brand-offwhite rounded-xl flex-1 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={createItemMutation.isPending || !canAdd}
                className="btn btn-primary bg-brand-primary border-brand-primary text-white hover:bg-brand-primary/95 rounded-xl flex-1 flex items-center gap-1.5 cursor-pointer shadow-md shadow-brand-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createItemMutation.isPending ? (
                  <>
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full mr-1"></span>
                    Saving Item...
                  </>
                ) : (
                  <>
                    <FiCheck size={16} /> Save Item
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
