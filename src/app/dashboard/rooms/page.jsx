"use client";

import React, { useState, useEffect, useContext } from "react";
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
import usePagePermission from "@/hooks/usePagePermission";

const INITIAL_ROOM_FORM = {
  roomNumber: "",
  roomType: "",
  price: "",
  priceWithBreakfast: "",
  priceWithAllDayFood: "",
  priceWithDayLong: "",
  capacity: "",
  status: "Available"
};

const RoomAndPlansPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const { canAdd, canEdit, canDelete } = usePagePermission();

  // ------------------ ROOMS STATE & LOGIC ------------------
  const [roomsPage, setRoomsPage] = useState(1);
  const [roomsLimit, setRoomsLimit] = useState(10);
  const [roomsSearch, setRoomsSearch] = useState("");
  const [debouncedRoomsSearch] = useDebounce(roomsSearch, 300);
  const [roomStatusFilter, setRoomStatusFilter] = useState("");
  const [roomInclusionFilter, setRoomInclusionFilter] = useState("");

  const { rooms, totalPages: totalRoomPages, totalItems: totalRoomsCount, isLoading: roomsLoading, refetch: refetchRooms } = useRooms(
    roomsPage,
    roomsLimit,
    debouncedRoomsSearch,
    roomStatusFilter,
    roomInclusionFilter
  );

  const [roomTypesList, setRoomTypesList] = useState([]);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isRoomSubmitting, setIsRoomSubmitting] = useState(false);
  const [editRoomId, setEditRoomId] = useState(null);
  const [roomFormData, setRoomFormData] = useState({ ...INITIAL_ROOM_FORM });

  // Status Modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatusRoom, setSelectedStatusRoom] = useState(null);

  // Load Room Types for Room Form Dropdown
  useEffect(() => {
    const fetchRoomTypesList = async () => {
      try {
        const { data } = await axiosSecure.get("/room-type?all=true");
        setRoomTypesList(data || []);
      } catch (err) {
        console.error("Error fetching room types list:", err);
      }
    };
    if (currentUser) {
      fetchRoomTypesList();
    }
  }, [axiosSecure, currentUser]);

  // Modal Openers
  const openRoomModal = (roomToEdit = null) => {
    if (roomToEdit) {
      setEditRoomId(roomToEdit._id);
      setRoomFormData({
        roomNumber: roomToEdit.roomNumber || "",
        roomType: roomToEdit.roomType || "",
        price: roomToEdit.price || "",
        priceWithBreakfast: roomToEdit.priceWithBreakfast || "",
        priceWithAllDayFood: roomToEdit.priceWithAllDayFood || "",
        priceWithDayLong: roomToEdit.priceWithDayLong || "",
        capacity: roomToEdit.capacity || "",
        status: roomToEdit.status || "Available"
      });
    } else {
      setEditRoomId(null);
      setRoomFormData({ ...INITIAL_ROOM_FORM });
    }
    setIsRoomModalOpen(true);
  };

  const closeRoomModal = () => {
    setIsRoomModalOpen(false);
    setEditRoomId(null);
  };

  // Rooms CRUD
  const handleAddOrEditRoom = async () => {
    if (editRoomId ? !canEdit : !canAdd) {
      Swal.fire("Access Denied", `You do not have permission to ${editRoomId ? "update" : "create"} rooms.`, "error");
      return;
    }

    if (!roomFormData.roomNumber || !roomFormData.roomNumber.trim()) {
      Swal.fire("Validation Error", "Please provide the room number.", "warning");
      return;
    }
    if (!roomFormData.roomType || !roomFormData.roomType.trim()) {
      Swal.fire("Validation Error", "Please select the room type.", "warning");
      return;
    }
    if (roomFormData.price === "" || isNaN(roomFormData.price)) {
      Swal.fire("Validation Error", "Please provide a valid price.", "warning");
      return;
    }

    setIsRoomSubmitting(true);
    const payload = {
      roomNumber: roomFormData.roomNumber.trim(),
      roomType: roomFormData.roomType,
      price: Number(roomFormData.price),
      priceWithBreakfast: Number(roomFormData.priceWithBreakfast || 0),
      priceWithAllDayFood: Number(roomFormData.priceWithAllDayFood || 0),
      priceWithDayLong: Number(roomFormData.priceWithDayLong || 0),
      capacity: Number(roomFormData.capacity || 2),
      status: roomFormData.status
    };

    try {
      if (editRoomId) {
        await axiosSecure.put(`/room/update/${editRoomId}`, payload);
      } else {
        await axiosSecure.post("/room/post", payload);
      }
      await refetchRooms();
      closeRoomModal();
      Swal.fire("Success", `Room successfully ${editRoomId ? "updated" : "created"}.`, "success");
    } catch (error) {
      Swal.fire("Action Failed", error.response?.data?.message || "Failed to save room.", "error");
    } finally {
      setIsRoomSubmitting(false);
    }
  };

  const handleDeleteRoom = (id) => {
    if (!canDelete) {
      Swal.fire("Access Denied", "You do not have permission to delete rooms.", "error");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "Delete this room configuration?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/room/delete/${id}`);
          await refetchRooms();
          Swal.fire("Deleted!", "Room deleted successfully.", "success");
        } catch (error) {
          Swal.fire("Error!", "Failed to delete room.", "error");
        }
      }
    });
  };

  const handleToggleRoomStatus = (room) => {
    if (!canEdit) {
      Swal.fire("Access Denied", "You do not have permission to change room status.", "error");
      return;
    }
    setSelectedStatusRoom(room);
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedStatusRoom) return;
    const isDark = document.documentElement.classList.contains("dark");
    try {
      await axiosSecure.patch(`/room/status/${selectedStatusRoom._id}`, { status: newStatus });
      Swal.fire({
        title: "Updated!",
        text: `Room ${selectedStatusRoom.roomNumber} status is now ${newStatus}.`,
        icon: "success",
        background: isDark ? '#1e1e24' : '#ffffff',
        color: isDark ? '#f5f7f5' : '#1a1a24',
      });
      setIsStatusModalOpen(false);
      setSelectedStatusRoom(null);
      refetchRooms();
    } catch (err) {
      console.error("Error updating room status:", err);
      Swal.fire({
        title: "Error",
        text: err.response?.data?.message || "Failed to update status.",
        icon: "error",
        background: isDark ? '#1e1e24' : '#ffffff',
        color: isDark ? '#f5f7f5' : '#1a1a24',
      });
    }
  };

  const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="Rooms & Rate Plans"
        subtitle="Manage resort room listings, statuses, and dynamic pricing packages in one unified dashboard."
      />

      <div>
        <div>
          <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
            <div className="flex items-center gap-6 text-xs font-bold text-brand-sage uppercase tracking-widest flex-wrap gap-y-2">
              <div className="flex items-center gap-2">
                <span>Display</span>
                <select
                  value={roomsLimit}
                  className="select select-bordered select-xs bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige focus:outline-none h-8 px-2"
                  onChange={(e) => {
                    setRoomsLimit(Number(e.target.value));
                    setRoomsPage(1);
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span>Status</span>
                <select
                  value={roomStatusFilter}
                  className="select select-bordered select-xs bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige focus:outline-none h-8 px-2"
                  onChange={(e) => {
                    setRoomStatusFilter(e.target.value);
                    setRoomsPage(1);
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Out Of Service">Out Of Service</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span>Inclusion</span>
                <select
                  value={roomInclusionFilter}
                  className="select select-bordered select-xs bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige focus:outline-none h-8 px-2"
                  onChange={(e) => {
                    setRoomInclusionFilter(e.target.value);
                    setRoomsPage(1);
                  }}
                >
                  <option value="">All Inclusions</option>
                  <option value="roomonly">Room Only</option>
                  <option value="breakfast">With Breakfast</option>
                  <option value="allday">With All-Day Food</option>
                  <option value="daylong">With Day-Long Food</option>
                </select>
              </div>

              <span className="text-brand-primary">Total Rooms: {totalRoomsCount}</span>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <label className="input input-bordered border-brand-primary focus:outline-none flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige w-full md:w-64 h-10">
                <FiSearch className="text-brand-sage text-md" />
                <input
                  type="text"
                  className="grow placeholder-brand-sage text-xs bg-transparent border-none outline-none"
                  placeholder="Search room..."
                  value={roomsSearch}
                  onChange={e => {
                    setRoomsSearch(e.target.value);
                    setRoomsPage(1);
                  }}
                />
              </label>

              {canAdd && (
                <button onClick={() => openRoomModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow gap-2 px-6 h-10 shrink-0 cursor-pointer">
                  <FiPlus className="text-lg" />
                  <span className="uppercase tracking-widest text-xs font-bold">New Room</span>
                </button>
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden"
          >
            {roomsLoading ? (
              <div className="p-6"><MtableLoading /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige/20">
                    <tr>
                      <th className="pl-8 py-5 w-24">#</th>
                      <th className="py-5">Room No</th>
                      <th className="py-5">Type</th>
                      <th className="py-5">Pricing (Room Only / Breakfast / All-Day)</th>
                      <th className="py-5">Capacity</th>
                      <th className="py-5">Status</th>
                      <th className="pr-8 text-center py-5 w-36">Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No rooms configured.
                        </td>
                      </tr>
                    ) : (
                      rooms.map((room, index) => (
                        <tr key={room._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 border-b border-brand-beige dark:border-brand-beige/10 text-sm">
                          <td className="pl-8 py-4 font-bold text-brand-sage font-mono">
                            {(roomsPage - 1) * roomsLimit + index + 1}
                          </td>
                          <td className="py-4 font-bold uppercase tracking-wide">{room.roomNumber}</td>
                          <td className="py-4 font-bold">{room.roomType}</td>
                          <td className="py-4">
                            <div className="font-bold text-brand-secondary">Room Only: ৳{room.price}</div>
                            <div className="text-xs text-brand-sage">w/ Breakfast: ৳{room.priceWithBreakfast || 0}</div>
                            <div className="text-xs text-brand-sage">All-Day Food: ৳{room.priceWithAllDayFood || 0}</div>
                            <div className="text-xs text-brand-sage">Day-Long Food: ৳{room.priceWithDayLong || 0}</div>
                          </td>
                          <td className="py-4 font-bold">{room.capacity} Person(s)</td>
                          <td className="py-4">
                            <span 
                              onClick={() => handleToggleRoomStatus(room)}
                              className={`badge badge-sm font-bold tracking-wider uppercase text-[10px] border-none cursor-pointer hover:scale-105 transition-transform ${
                                room.status === "Available" ? "bg-green-100 text-green-700 hover:bg-green-200" :
                                room.status === "Occupied" ? "bg-red-100 text-red-700 hover:bg-red-200" :
                                "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              }`}
                              title={canEdit ? "Click to change status" : ""}
                            >
                              {room.status}
                            </span>
                          </td>
                          <td className="pr-8 py-4 text-center">
                            <div className="flex justify-center items-center gap-2">
                              {canEdit || canDelete ? (
                                <>
                                  {canEdit && (
                                    <button onClick={() => openRoomModal(room)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary cursor-pointer" title="Edit Room">
                                      <FiEdit size={16} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button onClick={() => handleDeleteRoom(room._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 cursor-pointer" title="Delete Room">
                                      <FiTrash2 size={16} />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <div className="badge badge-ghost badge-sm text-[10px] uppercase font-bold text-brand-sage">Restricted</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="p-5 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/30 flex justify-center">
                  <Pagination
                    currentPage={roomsPage}
                    totalPages={totalRoomPages}
                    totalItems={totalRoomsCount}
                    itemsPerPage={roomsLimit}
                    onPageChange={(page) => setRoomsPage(page)}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Room Modal */}
      {isRoomModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editRoomId ? 'Update Room' : 'Create Room'}
              </h3>
              <button onClick={closeRoomModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Room Number *</span></label>
                <input
                  type="text"
                  value={roomFormData.roomNumber}
                  onChange={(e) => setRoomFormData({ ...roomFormData, roomNumber: e.target.value })}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="e.g. 101, VIP-1"
                  autoFocus
                />
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Room Type *</span></label>
                <select
                  value={roomFormData.roomType}
                  onChange={(e) => setRoomFormData({ ...roomFormData, roomType: e.target.value })}
                  className="select select-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                >
                  <option value="">Select Room Type</option>
                  {roomTypesList.map((type) => (
                    <option key={type._id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Price (Room Only) *</span></label>
                  <input
                    type="number"
                    value={roomFormData.price}
                    onChange={(e) => setRoomFormData({ ...roomFormData, price: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholder="e.g. 1500"
                  />
                </div>

                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Capacity *</span></label>
                  <input
                    type="number"
                    value={roomFormData.capacity}
                    onChange={(e) => setRoomFormData({ ...roomFormData, capacity: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholder="e.g. 2"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Price w/ Breakfast</span></label>
                  <input
                    type="number"
                    value={roomFormData.priceWithBreakfast}
                    onChange={(e) => setRoomFormData({ ...roomFormData, priceWithBreakfast: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholder="e.g. 1800"
                  />
                </div>

                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Price w/ All-Day Food</span></label>
                  <input
                    type="number"
                    value={roomFormData.priceWithAllDayFood}
                    onChange={(e) => setRoomFormData({ ...roomFormData, priceWithAllDayFood: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholder="e.g. 2500"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Price w/ Day-Long Food</span></label>
                  <input
                    type="number"
                    value={roomFormData.priceWithDayLong}
                    onChange={(e) => setRoomFormData({ ...roomFormData, priceWithDayLong: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholder="e.g. 3000"
                  />
                </div>

                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Status *</span></label>
                  <select
                    value={roomFormData.status}
                    onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeRoomModal} className="btn btn-ghost hover:bg-brand-beige text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleAddOrEditRoom} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isRoomSubmitting}>
                {isRoomSubmitting ? "Processing..." : (editRoomId ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </div>
        </dialog>
      )}
      {/* Room Status Modal Selection */}
      {isStatusModalOpen && selectedStatusRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-brand-beige/25 dark:border-zinc-850 animate-scale-in mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-gray-800 dark:text-zinc-100 uppercase tracking-wider">
                Room {selectedStatusRoom.roomNumber} Status
              </h3>
              <button
                onClick={() => {
                  setIsStatusModalOpen(false);
                  setSelectedStatusRoom(null);
                }}
                className="text-gray-450 hover:text-gray-600 dark:hover:text-zinc-350 font-bold text-sm cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {["Available", "Occupied", "Reserved", "Cleaning", "Maintenance"].map((status) => {
                const isSelected = selectedStatusRoom.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => handleUpdateStatus(status)}
                    className={`p-3.5 rounded-xl border font-bold text-sm text-center cursor-pointer transition-all hover:scale-[1.02]
                      ${isSelected 
                        ? "bg-brand-primary border-brand-primary text-white" 
                        : "border-gray-200 dark:border-zinc-800 bg-gray-50 hover:bg-brand-primary/10 hover:border-brand-primary dark:bg-zinc-800 dark:hover:bg-brand-primary/20 dark:hover:border-brand-primary text-gray-700 dark:text-zinc-300"}`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomAndPlansPage;
