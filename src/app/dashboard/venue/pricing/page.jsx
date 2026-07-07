"use client";

import React, { useState, useEffect, useContext } from "react";
import { FiEdit, FiTrash2, FiX, FiCheck, FiPlus } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import usePagePermission from "@/hooks/usePagePermission";
import { AuthContext } from "@/providers/AuthProvider";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";

const SYSTEM_DEFAULT_PLANS = [
  "Hourly - Full Venue", "Hourly - Half Venue",
  "Half Day - Full Venue", "Half Day - Half Venue",
  "Full Day - Full Venue", "Full Day - Half Venue",
  "Weekend - Full Venue", "Weekend - Half Venue",
  "Holiday - Full Venue", "Holiday - Half Venue",
  "Seasonal - Full Venue", "Seasonal - Half Venue",
  "Corporate - Full Venue", "Corporate - Half Venue"
];

const VenuePricingPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const { canAdd, canEdit, canDelete } = usePagePermission();

  const [pricingData, setPricingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal editor states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState(null); // null means new pricing plan
  const [formData, setFormData] = useState({
    pricingType: "",
    price: "",
    description: ""
  });

  const fetchPricing = async () => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get("/venue/pricing");
      setPricingData(response.data || []);
    } catch (error) {
      console.error("Failed to load pricing data:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load pricing settings. Please try again.",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const openAddModal = () => {
    setEditId(null);
    setFormData({
      pricingType: "",
      price: "",
      description: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan) => {
    setEditId(plan._id);
    setFormData({
      pricingType: plan.pricingType,
      price: plan.price,
      description: plan.description || ""
    });
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setIsModalOpen(false);
    setEditId(null);
  };

  const handleUpdatePricing = async (e) => {
    e.preventDefault();
    
    if (!formData.pricingType || !formData.pricingType.trim()) {
      Swal.fire("Validation Error", "Please provide the pricing plan name.", "warning");
      return;
    }
    if (formData.price === "" || isNaN(formData.price) || Number(formData.price) < 0) {
      Swal.fire("Validation Error", "Please provide a valid price.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        pricingType: formData.pricingType.trim(),
        price: Number(formData.price),
        description: formData.description
      };

      await axiosSecure.post("/venue/pricing", payload);
      
      Swal.fire({
        icon: "success",
        title: "Success",
        text: `Pricing plan saved successfully.`,
        timer: 1500,
        showConfirmButton: false,
      });

      closeEditModal();
      fetchPricing();
    } catch (error) {
      console.error("Update pricing error:", error);
      Swal.fire({
        icon: "error",
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to update pricing.",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePricing = (plan) => {
    Swal.fire({
      title: "Delete Rate Package?",
      text: `Are you sure you want to delete "${plan.pricingType}" plan configuration?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete It"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/venue/pricing?id=${plan._id}`);
          Swal.fire("Deleted", "Rate plan deleted successfully.", "success");
          fetchPricing();
        } catch (error) {
          console.error("Delete rate error:", error);
          Swal.fire("Error", error.response?.data?.message || "Failed to delete pricing plan.", "error");
        }
      }
    });
  };

  const isSystemPlan = (planName) => {
    return SYSTEM_DEFAULT_PLANS.includes(planName);
  };

  if (isLoading && pricingData.length === 0) {
    return (
      <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite">
        <SectionHeader title="Venue Pricing Settings" subtitle="Configure rates for ground floor venue sizes" />
        <div className="flex justify-center items-center min-h-[300px]">
          <MtableLoading />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      
      <SectionHeader 
        title="Venue Pricing Settings" 
        subtitle="Manage and configure dynamic pricing rate packages for Ground Floor venue reservations."
      >
        {canAdd && (
          <button 
            onClick={openAddModal} 
            className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow gap-2 px-6 h-10 shrink-0 cursor-pointer"
          >
            <FiPlus className="text-lg" />
            <span className="uppercase tracking-widest text-xs font-bold">New Plan</span>
          </button>
        )}
      </SectionHeader>

      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6">
        <span className="text-xs font-bold text-brand-primary uppercase tracking-widest">
          Active Packages Count: {pricingData.length} Plans
        </span>
      </div>

      {/* Pricing table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige/20">
              <tr>
                <th className="pl-8 py-5 w-24">#</th>
                <th className="py-5">Pricing Rate Plan</th>
                <th className="py-5">Price (৳)</th>
                <th className="py-5">Description</th>
                <th className="pr-8 text-center py-5 w-36">Manage</th>
              </tr>
            </thead>
            <tbody>
              {pricingData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                    No Pricing Plans Configured.
                  </td>
                </tr>
              ) : (
                pricingData.map((pricing, index) => (
                  <tr key={pricing._id || pricing.pricingType} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 border-b border-brand-beige dark:border-brand-beige/10 text-sm font-semibold">
                    <td className="pl-8 py-4 font-bold text-brand-sage font-mono">
                      {index + 1}
                    </td>
                    <td className="py-4 font-bold uppercase tracking-wide">
                      {pricing.pricingType}
                    </td>
                    <td className="py-4 font-extrabold text-brand-primary">
                      ৳ {(pricing.price || 0).toLocaleString()}
                    </td>
                    <td className="py-4 font-medium text-brand-sage max-w-xs truncate font-medium" title={pricing.description}>
                      {pricing.description || "N/A"}
                    </td>
                    <td className="pr-8 py-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        {canEdit && (
                          <button 
                            onClick={() => openEditModal(pricing)} 
                            className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary cursor-pointer" 
                            title="Edit Plan"
                          >
                            <FiEdit size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => handleDeletePricing(pricing)} 
                            className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 cursor-pointer" 
                            title="Delete Plan"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Editor Dialog Modal */}
      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? "Update Pricing Rate" : "Create Pricing Plan"}
              </h3>
              <button 
                onClick={closeEditModal} 
                className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdatePricing}>
              <div className="p-8 space-y-4 text-brand-charcoal dark:text-brand-offwhite">
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Pricing Plan Name *</span>
                  </label>
                  <input
                    type="text"
                    disabled={!!editId}
                    required
                    value={formData.pricingType}
                    onChange={(e) => setFormData({ ...formData, pricingType: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 font-bold"
                    placeholder="e.g. Full Day - Full Venue, Half Day with 2 Rooms"
                    autoFocus={!editId}
                  />
                  {editId && (
                    <span className="text-[10px] text-brand-sage italic mt-1 font-semibold">
                      Pricing plan names cannot be modified after creation. To rename, please delete and create a new plan.
                    </span>
                  )}
                </div>

                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Price (৳) *</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 font-extrabold"
                    placeholder="e.g. 45000"
                    autoFocus={!!editId}
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Rate Description</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="textarea textarea-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 text-sm min-h-[80px]"
                    placeholder="Enter rate details/inclusions..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-6 border-t border-brand-beige bg-brand-offwhite dark:bg-brand-charcoal/50">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="btn btn-outline border-brand-beige text-brand-charcoal dark:text-brand-offwhite btn-sm rounded-full px-6"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow gap-2 px-6 cursor-pointer"
                >
                  {isSaving ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <FiCheck />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

    </div>
  );
};

export default VenuePricingPage;
