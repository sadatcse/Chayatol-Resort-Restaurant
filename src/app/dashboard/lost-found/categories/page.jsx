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

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").trim(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function CategoriesPage() {
  const axiosSecure = useAxiosSecure();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "", isActive: true }
  });

  // Query: Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["lostFoundCategories"],
    queryFn: async () => {
      const { data } = await axiosSecure.get("/lost-found/categories");
      return data;
    },
  });

  // Mutation: Create Category
  const createMutation = useMutation({
    mutationFn: async (newCat) => {
      const { data } = await axiosSecure.post("/lost-found/categories", newCat);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["lostFoundCategories"]);
      toast.success("Category created successfully!");
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create category");
    },
  });

  // Mutation: Update Category
  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedCat }) => {
      const { data } = await axiosSecure.put(`/lost-found/categories/${id}`, updatedCat);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["lostFoundCategories"]);
      toast.success("Category updated successfully!");
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update category");
    },
  });

  // Mutation: Delete Category
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await axiosSecure.delete(`/lost-found/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["lostFoundCategories"]);
      toast.success("Category deleted successfully!");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete category");
    },
  });

  const onSubmit = (formData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory._id, updatedCat: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    reset({ name: "", description: "", isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    reset({
      name: cat.name,
      description: cat.description || "",
      isActive: cat.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will delete the category permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0F172A", // brand-primary
      cancelButtonColor: "#EF4444", // red-500
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
        <SectionHeader title="Lost & Found Categories" subtitle="Manage category tags for lost items" />
        <button
          onClick={openAddModal}
          className="btn btn-primary bg-brand-primary border-brand-primary text-white hover:bg-brand-primary/90 flex items-center gap-2 rounded-xl text-sm font-bold uppercase tracking-wider px-5 shadow-md shadow-brand-primary/10 cursor-pointer self-start sm:self-auto"
        >
          <FiPlus size={16} /> Add Category
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
                  <th className="p-4">Description</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center rounded-tr-2xl w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <tr key={cat._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige/10 dark:border-brand-beige/5">
                      <td className="p-4 font-bold text-brand-charcoal dark:text-brand-offwhite">{cat.name}</td>
                      <td className="p-4 text-brand-sage dark:text-brand-offwhite/60">{cat.description || "—"}</td>
                      <td className="p-4 text-center">
                        <span className={`badge font-bold px-3 py-2 rounded-full text-[10px] uppercase tracking-wider ${
                          cat.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                        }`}>
                          {cat.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="btn btn-xs btn-ghost btn-circle text-brand-primary hover:bg-brand-primary/10"
                            title="Edit"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat._id)}
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
                    <td colSpan="4" className="text-center py-12 text-brand-sage font-semibold uppercase tracking-wider text-xs">
                      No categories found. Click Add Category to create one.
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
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige/30">
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Category Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Electronics"
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
                  <span className="label-text font-bold text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider">Description</span>
                </label>
                <textarea
                  placeholder="Provide category details..."
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
