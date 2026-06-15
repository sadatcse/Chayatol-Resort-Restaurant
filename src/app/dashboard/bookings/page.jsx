"use client";

import React, { useState, useContext, useEffect } from "react";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import CustomerModal from "@/components/CustomerModal";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useBookings from "@/hooks/useBookings";
import { AuthContext } from "@/providers/AuthProvider";

const formatDateTimeLocal = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const INITIAL_FORM_DATA = {
  customer: "",
  customerName: "",
  customerPhone: "",
  room: "",
  checkInDate: null,
  checkOutDate: null,
  totalAmount: "",
  paymentStatus: "Pending",
  bookingStatus: "Confirmed"
};

const BookingsPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { bookings, totalPages, totalItems, isLoading, refetch } = useBookings(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm
  );

  const [customers, setCustomers] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [searchPhoneInput, setSearchPhoneInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  const fetchOptions = async () => {
    try {
      const [custRes, roomRes] = await Promise.all([
        axiosSecure.get("/customer"),
        axiosSecure.get("/room") // Get available rooms
      ]);
      setCustomers(custRes.data || []);
      setRooms(roomRes.data || []);
    } catch (error) {
      console.error("Failed to fetch options:", error);
    }
  };

  const openModal = async (bookingToEdit = null) => {
    await fetchOptions();
    if (bookingToEdit) {
      setEditId(bookingToEdit._id);

      // We might need to add the currently booked room to the list if it's not "Available" anymore
      if (bookingToEdit.room && !rooms.find(r => r._id === bookingToEdit.room._id)) {
        setRooms(prev => [...prev, bookingToEdit.room]);
      }

      setFormData({
        customer: bookingToEdit.customer?._id || "",
        customerName: "",
        isNewCustomer: false,
        customerPhone: bookingToEdit.customer?.phoneNumber || "",
        room: bookingToEdit.room?._id || "",
        checkInDate: bookingToEdit.checkInDate ? new Date(bookingToEdit.checkInDate) : null,
        checkOutDate: bookingToEdit.checkOutDate ? new Date(bookingToEdit.checkOutDate) : null,
        totalAmount: bookingToEdit.totalAmount || "",
        paymentStatus: bookingToEdit.paymentStatus || "Pending",
        bookingStatus: bookingToEdit.bookingStatus || "Confirmed"
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

  const handleAddOrEditBooking = async () => {
    if ((!formData.isNewCustomer && !formData.customer) || (formData.isNewCustomer && !formData.customerName) || !formData.room || !formData.totalAmount) {
      Swal.fire({
        title: "Validation Error",
        text: "Please fill all required fields.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    if (formData.checkOutDate && formData.checkInDate && new Date(formData.checkOutDate) <= new Date(formData.checkInDate)) {
      Swal.fire({
        title: "Validation Error",
        text: "Check-out date must be after check-in date.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      checkInDate: formData.checkInDate ? formData.checkInDate.toISOString() : null,
      checkOutDate: formData.checkOutDate ? formData.checkOutDate.toISOString() : null,
      totalAmount: Number(formData.totalAmount)
    };

    try {
      if (editId) {
        await axiosSecure.put(`/booking/update/${editId}`, payload);
      } else {
        await axiosSecure.post("/booking/post", payload);
      }
      await refetch();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Booking successfully ${editId ? "updated" : "created"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save booking.",
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
        text: "You do not have permission to delete bookings.",
        icon: "error",
        confirmButtonColor: "#8C5A35",
      });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this booking record!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/booking/delete/${id}`);
          await refetch();
          Swal.fire({
            title: "Deleted!",
            text: "Booking has been deleted.",
            icon: "success",
            confirmButtonColor: "#346E36",
          });
        } catch (error) {
          Swal.fire("Error!", "Failed to delete booking.", "error");
        }
      }
    });
  };

  const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin" || currentUser?.role === "receptionist";

  const customerOptions = customers.map(c => ({
    value: c._id,
    label: `${c.fullName} - ${c.phoneNumber}`
  }));

  const roomOptions = rooms.map(r => ({
    value: r._id,
    label: `${r.roomNumber} (${r.roomType}) - ৳${r.price}/night`,
    price: r.price
  }));

  const customSelectStyles = {
    control: (baseStyles) => ({
      ...baseStyles,
      borderColor: '#346E36',
      minHeight: '3rem',
      height: '3rem',
      borderRadius: '0.5rem',
      boxShadow: 'none',
      backgroundColor: 'transparent',
      '&:hover': {
        borderColor: '#346E36'
      }
    }),
    option: (baseStyles, state) => ({
      ...baseStyles,
      backgroundColor: state.isSelected ? '#346E36' : state.isFocused ? 'rgba(52, 110, 54, 0.1)' : 'transparent',
      color: state.isSelected ? 'white' : 'inherit',
      cursor: 'pointer'
    })
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="Room Bookings"
        subtitle="Manage room reservations, check-ins, check-outs, and payments."
      >
        <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-80 h-12">
          <FiSearch className="text-brand-sage text-lg" />
          <input
            type="text"
            className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
            placeholder="Search status..."
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
            <span className="uppercase tracking-widest text-xs font-bold">New Booking</span>
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
                    <th className="py-5">Customer</th>
                    <th className="py-5">Room</th>
                    <th className="py-5">Dates</th>
                    <th className="py-5">Amount</th>
                    <th className="py-5">Payment</th>
                    <th className="py-5">Status</th>
                    <th className="pr-8 text-center py-5 w-36">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No bookings found.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((booking, index) => (
                        <motion.tr
                          key={booking._id}
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
                            {booking.customer?.fullName}
                          </td>
                          <td className="py-4 font-bold text-brand-secondary">
                            {booking.room?.roomNumber} ({booking.room?.roomType})
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col gap-1.5 text-[11px]">
                              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-sage opacity-80 w-[65px]">Check-In:</span>
                                <span className="font-semibold text-brand-charcoal dark:text-brand-offwhite">
                                  {booking.checkInDate ? new Date(booking.checkInDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : "Not Set"}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-sage opacity-80 w-[65px]">Check-Out:</span>
                                <span className="font-semibold text-brand-secondary">
                                  {booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : "Not Set"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 font-bold text-brand-primary">
                            ৳{booking.totalAmount}
                          </td>
                          <td className="py-4">
                            <span className={`badge badge-sm font-bold tracking-wider uppercase text-[10px] border-none ${booking.paymentStatus === "Paid" ? "bg-green-100 text-green-700" :
                                booking.paymentStatus === "Partial" ? "bg-yellow-100 text-yellow-700" :
                                  "bg-red-100 text-red-700"
                              }`}>
                              {booking.paymentStatus}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`badge badge-sm font-bold tracking-wider uppercase text-[10px] border-none ${booking.bookingStatus === "Confirmed" ? "bg-blue-100 text-blue-700" :
                                booking.bookingStatus === "Checked-in" ? "bg-green-100 text-green-700" :
                                  booking.bookingStatus === "Checked-out" ? "bg-gray-100 text-gray-700" :
                                    "bg-red-100 text-red-700"
                              }`}>
                              {booking.bookingStatus}
                            </span>
                          </td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center gap-2">
                              {canPerformAction ? (
                                <>
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openModal(booking)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Edit Booking">
                                    <FiEdit size={16} />
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(booking._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Delete Booking">
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
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-visible max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">

            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Booking' : 'Create Booking'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">

              <div className="flex flex-col gap-2 p-4 bg-brand-offwhite/50 dark:bg-brand-charcoal/30 border border-brand-beige/50 dark:border-brand-beige/20 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-sm text-brand-primary uppercase tracking-widest">Existing Customer</h4>
                  <button type="button" onClick={() => setIsCustomerModalOpen(true)} className="btn btn-xs bg-brand-primary text-white hover:bg-brand-secondary border-none uppercase tracking-widest text-[10px] px-3">
                    + Create New
                  </button>
                </div>
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Search by Phone Number *</span></label>
                  <Select
                    options={customerOptions}
                    value={customerOptions.find(option => option.value === formData.customer) || null}
                    onInputChange={(val) => setSearchPhoneInput(val)}
                    onChange={(selectedOption) => {
                      const existingCust = customers.find(c => c._id === (selectedOption ? selectedOption.value : ""));
                      setFormData({ 
                        ...formData, 
                        customer: selectedOption ? selectedOption.value : "", 
                        customerPhone: existingCust ? existingCust.phoneNumber : "", 
                        customerName: existingCust ? existingCust.fullName : ""
                      });
                    }}
                    noOptionsMessage={({ inputValue }) => (
                      <div className="p-1">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchPhoneInput(inputValue);
                            setIsCustomerModalOpen(true);
                          }}
                          className="btn btn-sm w-full bg-brand-primary text-white hover:bg-brand-secondary border-none uppercase tracking-widest text-[10px]"
                        >
                          + Create New
                        </button>
                      </div>
                    )}
                    isClearable
                    isSearchable
                    placeholder="Select a customer by phone..."
                    styles={customSelectStyles}
                    className="text-sm text-brand-charcoal"
                  />
                </div>
                {formData.customer && formData.customerName && (
                  <div className="mt-1 text-[11px] text-brand-sage font-bold flex gap-1 items-center">
                     <span>Selected Name:</span>
                     <span className="text-brand-primary">{formData.customerName}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Check-In</span></label>
                  <DatePicker
                    selected={formData.checkInDate}
                    onChange={(date) => setFormData({ ...formData, checkInDate: date })}
                    showTimeSelect
                    timeFormat="h:mm aa"
                    timeIntervals={15}
                    dateFormat="MMMM d, yyyy h:mm aa"
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholderText="Select Check-in Date & Time"
                  />
                </div>

                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Check-Out</span></label>
                  <DatePicker
                    selected={formData.checkOutDate}
                    onChange={(date) => setFormData({ ...formData, checkOutDate: date })}
                    showTimeSelect
                    timeFormat="h:mm aa"
                    timeIntervals={15}
                    dateFormat="MMMM d, yyyy h:mm aa"
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    placeholderText="Select Check-out Date & Time"
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Room *</span></label>
                <Select
                  options={roomOptions}
                  value={roomOptions.find(option => option.value === formData.room) || null}
                  onChange={(selectedOption) => {
                    setFormData({
                      ...formData,
                      room: selectedOption ? selectedOption.value : "",
                      totalAmount: selectedOption ? selectedOption.price : formData.totalAmount
                    });
                  }}
                  isClearable
                  isSearchable
                  placeholder="Select an available room..."
                  styles={customSelectStyles}
                  className="text-sm text-brand-charcoal"
                />
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Total Amount (৳) *</span></label>
                <input
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="Total Price"
                />
              </div>

              <div className="flex gap-4">
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Status</span></label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Booking Status</span></label>
                  <select
                    value={formData.bookingStatus}
                    onChange={(e) => setFormData({ ...formData, bookingStatus: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Checked-in">Checked-in</option>
                    <option value="Checked-out">Checked-out</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleAddOrEditBooking} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processing...
                  </>
                ) : (editId ? 'Save Changes' : 'Create Booking')}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}
      
      {isCustomerModalOpen && (
        <CustomerModal 
          isOpen={isCustomerModalOpen}
          initialPhoneNumber={searchPhoneInput}
          onClose={() => setIsCustomerModalOpen(false)}
          onSuccess={async () => {
             await fetchOptions(); // refresh customers list!
             setIsCustomerModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default BookingsPage;
