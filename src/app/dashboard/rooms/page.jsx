"use client";

import React, { useState, useContext } from "react";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useRooms from "@/hooks/useRooms";
import { AuthContext } from "@/providers/AuthProvider";

const INITIAL_FORM_DATA = {
  roomNumber: "",
  roomType: "",
  price: "",
  capacity: "",
  status: "Available"
};

const RoomsPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { rooms, totalPages, totalItems, isLoading, refetch } = useRooms(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  const openModal = (roomToEdit = null) => {
    if (roomToEdit) {
      setEditId(roomToEdit._id);
      setFormData({
        roomNumber: roomToEdit.roomNumber || "",
        roomType: roomToEdit.roomType || "",
        price: roomToEdit.price || "",
        capacity: roomToEdit.capacity || "",
        status: roomToEdit.status || "Available"
      });
    } else {
      setEditId(null);
      setFormData({ ...INITIAL_FORM_DATA });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
  };

  const handleAddOrEditRoom = async () => {
    if (!formData.roomNumber || !formData.roomNumber.trim()) {
      Swal.fire({
        title: "Validation Error",
        text: "Please provide the room number.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }
    if (!formData.roomType || !formData.roomType.trim()) {
      Swal.fire({
        title: "Validation Error",
        text: "Please provide the room type.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }
    if (!formData.price || isNaN(formData.price)) {
      Swal.fire({
        title: "Validation Error",
        text: "Please provide a valid price.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }
    if (!formData.capacity || isNaN(formData.capacity)) {
      Swal.fire({
        title: "Validation Error",
        text: "Please provide a valid capacity.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      roomNumber: formData.roomNumber.trim(),
      roomType: formData.roomType.trim(),
      price: Number(formData.price),
      capacity: Number(formData.capacity),
      status: formData.status
    };

    try {
      if (editId) {
        await axiosSecure.put(`/room/update/${editId}`, payload);
      } else {
        await axiosSecure.post("/room/post", payload);
      }
      await refetch();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Room successfully ${editId ? "updated" : "created"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save room.",
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
      Swal.fire({
        title: "Access Denied",
        text: "You do not have permission to delete rooms.",
        icon: "error",
        confirmButtonColor: "#8C5A35",
      });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this room record!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/room/delete/${id}`);
          await refetch();
          Swal.fire({
            title: "Deleted!",
            text: "Room has been deleted.",
            icon: "success",
            confirmButtonColor: "#346E36",
          });
        } catch (error) {
          Swal.fire("Error!", "Failed to delete room.", "error");
        }
      }
    });
  };

  const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="Room Management"
        subtitle="Manage resort rooms, their types, pricing, and availability status."
      >
        <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-80 h-12">
          <FiSearch className="text-brand-sage text-lg" />
          <input
            type="text"
            className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
            placeholder="Search room..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </label>
      </SectionHeader>

      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
        <div className="flex items-center gap-3 text-xs font-bold text-brand-sage uppercase tracking-widest">
          <span>Display</span>
          <select
            value={itemsPerPage}
            className="select select-bordered select-xs bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige dark:border-brand-beige/20 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-8 px-2"
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="50">50</option>
          </select>
          <span className="ml-4">Total Records: {totalItems}</span>
        </div>

        {canPerformAction && (
          <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10">
            <FiPlus className="text-lg" />
            <span className="uppercase tracking-widest text-xs font-bold">New Room</span>
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden"
      >
        <div className="p-0">
          {isLoading ? (
            <div className="p-6">
              <MtableLoading />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige dark:border-brand-beige/20">
                  <tr>
                    <th className="pl-8 py-5 w-24">#</th>
                    <th className="py-5">Room No</th>
                    <th className="py-5">Type</th>
                    <th className="py-5">Price</th>
                    <th className="py-5">Capacity</th>
                    <th className="py-5">Status</th>
                    <th className="pr-8 text-center py-5 w-36">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {rooms.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No rooms configured.
                        </td>
                      </tr>
                    ) : (
                      rooms.map((room, index) => (
                        <motion.tr
                          key={room._id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm"
                        >
                          <td className="pl-8 py-4 font-bold text-brand-sage font-mono">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="py-4 font-bold uppercase tracking-wide">
                            {room.roomNumber}
                          </td>
                          <td className="py-4 font-bold">
                            {room.roomType}
                          </td>
                          <td className="py-4 font-bold text-brand-secondary">
                            ৳{room.price}
                          </td>
                          <td className="py-4 font-bold">
                            {room.capacity} Person(s)
                          </td>
                          <td className="py-4">
                            <span className={`badge badge-sm font-bold tracking-wider uppercase text-[10px] border-none ${
                              room.status === "Available" ? "bg-green-100 text-green-700" :
                              room.status === "Occupied" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {room.status}
                            </span>
                          </td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center gap-2">
                              {canPerformAction ? (
                                <>
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openModal(room)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Edit Room">
                                    <FiEdit size={16} />
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(room._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Delete Room">
                                    <FiTrash2 size={16} />
                                  </motion.button>
                                </>
                              ) : (
                                <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite dark:bg-brand-offwhite/5 border-none">Restricted</div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>

              <div className="p-5 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/30 dark:bg-brand-charcoal/10 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">

            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Room' : 'Create Room'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Room Number *</span></label>
                <input
                  type="text"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="e.g. 101, VIP-1"
                  autoFocus
                />
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Room Type *</span></label>
                <input
                  type="text"
                  value={formData.roomType}
                  onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="e.g. Single, Double, Suite"
                />
              </div>

              <div className="flex gap-4">
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Price *</span></label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholder="e.g. 150"
                  />
                </div>

                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Capacity *</span></label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholder="e.g. 2"
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Status *</span></label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                >
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleAddOrEditRoom} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processing...
                  </>
                ) : (editId ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default RoomsPage;
