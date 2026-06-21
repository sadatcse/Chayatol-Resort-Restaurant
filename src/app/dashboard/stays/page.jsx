"use client";

import React, { useState, useEffect, useContext } from "react";
import { FiEye, FiX, FiSearch, FiPlus, FiArrowRight, FiBriefcase, FiDollarSign, FiClock, FiFileText } from "react-icons/fi";
import { MdRestaurant } from "react-icons/md";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useStays from "@/hooks/useStays";
import { AuthContext } from "@/providers/AuthProvider";

const StaysPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState("In House"); // Default to showing currently in house guests

  const { stays, totalPages, totalItems, isLoading, refetch } = useStays(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    statusFilter
  );

  // Loaded metadata for postings
  const [foodMenu, setFoodMenu] = useState([]);
  const [services, setServices] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);

  // Selected guest stay detail
  const [selectedStay, setSelectedStay] = useState(null);
  const [folioEntries, setFolioEntries] = useState([]);
  const [isFolioLoading, setIsFolioLoading] = useState(false);

  // Posting modals state
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [foodFormData, setFoodFormData] = useState({ foodItem: "", quantity: 1, isChargeable: true });

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({ serviceId: "", isChargeable: true });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({ paymentType: "", amount: "", transactionRef: "", notes: "" });

  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendFormData, setExtendFormData] = useState({ newCheckOutDate: "" });

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutPayment, setCheckoutPayment] = useState({ paymentType: "", amount: "", transactionRef: "" });

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountFormData, setDiscountFormData] = useState({ discountType: "percentage", value: "", applyTo: "all", reason: "" });

  useEffect(() => {
    const fetchPostingData = async () => {
      try {
        const [foodRes, serviceRes, payRes] = await Promise.all([
          axiosSecure.get("/food?all=true"),
          axiosSecure.get("/resort-service/get"),
          axiosSecure.get("/paymenttype")
        ]);
        setFoodMenu(foodRes.data || []);
        setServices(serviceRes.data?.data || serviceRes.data || []);
        setPaymentTypes(payRes.data || []);
      } catch (err) {
        console.error("Error loading posting dropdown details:", err);
      }
    };
    if (currentUser) {
      fetchPostingData();
    }
  }, [axiosSecure, currentUser]);

  const fetchFolio = async (stayId) => {
    setIsFolioLoading(true);
    try {
      const { data } = await axiosSecure.get(`/stays/${stayId}/folio`);
      setFolioEntries(data || []);
    } catch (err) {
      console.error("Failed to load folio ledger:", err);
    } finally {
      setIsFolioLoading(false);
    }
  };

  const handleSelectStay = async (stay) => {
    setSelectedStay(stay);
    await fetchFolio(stay._id);
  };

  // Folio calculations
  const totalDebit = folioEntries.reduce((acc, entry) => acc + (entry.debit || 0), 0);
  const totalCredit = folioEntries.reduce((acc, entry) => acc + (entry.credit || 0), 0);
  const outstandingDue = totalDebit - totalCredit;

  // Add Direct Ledger Postings
  const handlePostFoodOrder = async () => {
    if (!foodFormData.foodItem || !foodFormData.quantity) {
      Swal.fire("Error", "Please select food item and quantity.", "warning");
      return;
    }
    try {
      await axiosSecure.post(`/stays/${selectedStay._id}/food-order`, {
        items: [{ foodItem: foodFormData.foodItem, quantity: Number(foodFormData.quantity) }],
        isChargeable: foodFormData.isChargeable
      });
      await fetchFolio(selectedStay._id);
      setIsFoodModalOpen(false);
      setFoodFormData({ foodItem: "", quantity: 1, isChargeable: true });
      Swal.fire("Food Posted", "Food charge added to guest folio ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post food charge", "error");
    }
  };

  const handlePostService = async () => {
    if (!serviceFormData.serviceId) {
      Swal.fire("Error", "Please select a service.", "warning");
      return;
    }
    try {
      await axiosSecure.post(`/stays/${selectedStay._id}/service-order`, {
        serviceId: serviceFormData.serviceId,
        isChargeable: serviceFormData.isChargeable
      });
      await fetchFolio(selectedStay._id);
      setIsServiceModalOpen(false);
      setServiceFormData({ serviceId: "", isChargeable: true });
      Swal.fire("Service Posted", "Service charge added to guest folio ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post service charge", "error");
    }
  };

  const handlePostPayment = async () => {
    if (!paymentFormData.paymentType || !paymentFormData.amount || isNaN(paymentFormData.amount) || Number(paymentFormData.amount) <= 0) {
      Swal.fire("Error", "Please fill in payment type and positive amount.", "warning");
      return;
    }
    try {
      await axiosSecure.post(`/stays/${selectedStay._id}/folio`, {
        type: "Payment",
        description: `Direct Payment (${paymentFormData.paymentType}) - Ref: ${paymentFormData.transactionRef || "N/A"}`,
        debit: 0,
        credit: Number(paymentFormData.amount)
      });
      await fetchFolio(selectedStay._id);
      setIsPaymentModalOpen(false);
      setPaymentFormData({ paymentType: "", amount: "", transactionRef: "", notes: "" });
      Swal.fire("Payment Recorded", "Payment credited to guest ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post payment", "error");
    }
  };

  const handleExtendStay = async () => {
    if (!extendFormData.newCheckOutDate) {
      Swal.fire("Error", "Please select a check-out date.", "warning");
      return;
    }
    try {
      const { data } = await axiosSecure.post(`/stays/${selectedStay._id}/extend`, {
        newCheckOutDate: extendFormData.newCheckOutDate
      });
      // Refresh current stay state
      setSelectedStay(data);
      await fetchFolio(selectedStay._id);
      setIsExtendModalOpen(false);
      setExtendFormData({ newCheckOutDate: "" });
      refetch();
      Swal.fire("Stay Extended", "Stay extended and additional night charges posted.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to extend stay", "error");
    }
  };

  const handleCheckoutGuest = async () => {
    // Checkout payload: final payment list
    const checkPaymentList = [];
    if (checkoutPayment.amount > 0) {
      if (!checkoutPayment.paymentType) {
        Swal.fire("Error", "Please select payment method for the settlement payment.", "warning");
        return;
      }
      checkPaymentList.push(checkoutPayment);
    }

    try {
      await axiosSecure.post(`/stays/${selectedStay._id}/checkout`, {
        payments: checkPaymentList
      });
      setIsCheckoutModalOpen(false);
      setSelectedStay(null);
      setCheckoutPayment({ paymentType: "", amount: "", transactionRef: "" });
      refetch();
      Swal.fire("Checked Out", "Guest stay checkout finalized. Room status changed to cleaning.", "success");
    } catch (err) {
      Swal.fire("Failed Checkout", err.response?.data?.message || "Failed to checkout guest.", "error");
    }
  };

  const handlePostDiscount = async () => {
    if (!discountFormData.discountType || !discountFormData.value || isNaN(discountFormData.value) || Number(discountFormData.value) <= 0 || !discountFormData.applyTo) {
      Swal.fire("Error", "Please fill in discount type, positive value, and discount target.", "warning");
      return;
    }
    try {
      await axiosSecure.post(`/stays/${selectedStay._id}/discount`, {
        discountType: discountFormData.discountType,
        value: Number(discountFormData.value),
        applyTo: discountFormData.applyTo,
        reason: discountFormData.reason
      });
      await fetchFolio(selectedStay._id);
      setIsDiscountModalOpen(false);
      setDiscountFormData({ discountType: "percentage", value: "", applyTo: "all", reason: "" });
      Swal.fire("Discount Posted", "Discount adjustment credited to guest ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Failed to post discount", "error");
    }
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="Stay & Folio Management"
        subtitle="Track active in-house guests, update folios with food & service charges, extend stays, and settle checkout balances."
      >
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
              setSelectedStay(null);
            }}
            className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite rounded-full px-5 h-12 outline-none focus:outline-none"
          >
            <option value="In House">In House</option>
            <option value="Checked Out">Checked Out</option>
            <option value="Extended">Extended</option>
            <option value="Cancelled">Cancelled</option>
            <option value="">All Statuses</option>
          </select>

          <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-80 h-12">
            <FiSearch className="text-brand-sage text-lg" />
            <input
              type="text"
              className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
              placeholder="Search Stay No/Room/Customer..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
                setSelectedStay(null);
              }}
            />
          </label>
        </div>
      </SectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Stays List Table */}
        <div className={`${selectedStay ? "lg:col-span-6" : "lg:col-span-12"} transition-all duration-300`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden"
          >
            {isLoading ? (
              <div className="p-6">
                <MtableLoading />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige dark:border-brand-beige/20">
                    <tr>
                      <th className="pl-6 py-5">Stay No</th>
                      <th className="py-5">Customer</th>
                      <th className="py-5">Rooms</th>
                      <th className="py-5">Check-In / Out Dates</th>
                      <th className="py-5">Status</th>
                      <th className="pr-6 text-center py-5">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stays.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No stay records found.
                        </td>
                      </tr>
                    ) : (
                      stays.map((stay) => {
                        const statusColors = {
                          "In House": "bg-green-100 text-green-700",
                          "Checked Out": "bg-gray-100 text-gray-500",
                          Extended: "bg-blue-100 text-blue-700",
                          Cancelled: "bg-red-100 text-red-700"
                        };

                        return (
                          <tr
                            key={stay._id}
                            className={`hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none text-sm cursor-pointer ${selectedStay?._id === stay._id ? "bg-brand-offwhite/70 dark:bg-brand-offwhite/5" : "bg-white dark:bg-brand-charcoal"}`}
                            onClick={() => handleSelectStay(stay)}
                          >
                            <td className="pl-6 py-4 font-mono font-bold">{stay.stayNo}</td>
                            <td className="py-4">
                              <div className="font-bold">{stay.customer?.fullName}</div>
                            </td>
                            <td className="py-4 text-xs font-bold font-mono">
                              {stay.rooms?.map(r => r.room?.roomNumber).join(", ")}
                            </td>
                            <td className="py-4 text-xs font-bold text-brand-sage">
                              {new Date(stay.checkInDate).toLocaleDateString()} → {new Date(stay.expectedCheckOutDate).toLocaleDateString()}
                            </td>
                            <td className="py-4">
                              <span className={`badge badge-sm font-bold tracking-wider uppercase text-[10px] border-none ${statusColors[stay.status]}`}>
                                {stay.status}
                              </span>
                            </td>
                            <td className="pr-6 py-4 text-center">
                              <button className="btn btn-ghost btn-circle btn-xs text-brand-sage hover:text-brand-primary">
                                <FiEye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                <div className="p-5 border-t border-brand-beige bg-brand-offwhite/30 flex justify-center">
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
          </motion.div>
        </div>

        {/* Selected Stay Folio / Ledger View */}
        {selectedStay && (
          <div className="lg:col-span-6 transition-all duration-300">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 p-6 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-brand-beige pb-4">
                <div>
                  <h3 className="font-bold text-base uppercase tracking-wider text-brand-black dark:text-brand-offwhite">Folio Ledger</h3>
                  <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest font-mono">Guest Stay: {selectedStay.stayNo}</span>
                </div>
                <button onClick={() => setSelectedStay(null)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:bg-brand-beige">
                  <FiX size={20} />
                </button>
              </div>

              {/* Guest metadata short-block */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-brand-offwhite dark:bg-brand-charcoal/45 p-4 rounded-xl">
                <div>
                  <span className="text-brand-sage">Customer:</span>
                  <div className="font-bold">{selectedStay.customer?.fullName}</div>
                </div>
                <div>
                  <span className="text-brand-sage">Assigned Room(s):</span>
                  <div className="font-bold font-mono">{selectedStay.rooms?.map(r => r.room?.roomNumber).join(", ")}</div>
                </div>
              </div>

              {/* Folio Ledger Entries List */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block">Account Entries</span>
                {isFolioLoading ? (
                  <MtableLoading />
                ) : (
                  <div className="max-h-[30vh] overflow-y-auto space-y-2 border border-brand-beige/40 dark:border-brand-beige/10 rounded-xl p-2">
                    {folioEntries.length === 0 ? (
                      <div className="p-6 text-center text-xs font-bold text-brand-sage uppercase tracking-widest">No ledger transactions posted.</div>
                    ) : (
                      <table className="table w-full text-xs">
                        <thead className="text-[9px] uppercase tracking-wider text-brand-sage">
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th className="text-right">Debit (+)</th>
                            <th className="text-right">Credit (-)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {folioEntries.map(entry => (
                            <tr key={entry._id} className="border-b border-brand-beige/10 last:border-none">
                              <td className="text-brand-sage text-[10px]">{new Date(entry.date).toLocaleDateString()}</td>
                              <td className="font-bold">{entry.description}</td>
                              <td className="text-right font-bold text-red-600">{entry.debit > 0 ? `৳${entry.debit}` : "-"}</td>
                              <td className="text-right font-bold text-green-600">{entry.credit > 0 ? `৳${entry.credit}` : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>

              {/* running balance block */}
              <div className="flex justify-between items-center p-4 bg-brand-secondary/5 border-l-4 border-brand-secondary rounded-r-xl">
                <div>
                  <span className="text-[9px] font-bold text-brand-sage uppercase tracking-widest block">Ledger Balance</span>
                  <span className="text-base font-extrabold text-brand-secondary">Due: ৳{outstandingDue.toFixed(2)}</span>
                </div>
                <div className="text-right text-xs text-brand-sage font-bold">
                  <div>Charges (Debit): ৳{totalDebit.toFixed(2)}</div>
                  <div>Credits: ৳{totalCredit.toFixed(2)}</div>
                </div>
              </div>

              {/* Folio postings & Action buttons */}
              {selectedStay.status !== "Checked Out" && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={() => setIsFoodModalOpen(true)} className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2">
                    <MdRestaurant /> Post Food
                  </button>
                  <button onClick={() => setIsServiceModalOpen(true)} className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2">
                    <FiBriefcase /> Post Service
                  </button>
                  <button onClick={() => setIsPaymentModalOpen(true)} className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2">
                    <FiDollarSign /> Post Payment
                  </button>
                  <button onClick={() => setIsDiscountModalOpen(true)} className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2">
                    <span>৳</span> Post Discount
                  </button>
                  <button onClick={() => setIsExtendModalOpen(true)} className="btn btn-sm btn-outline border-brand-primary text-brand-primary rounded-full cursor-pointer flex items-center justify-center gap-2 col-span-2">
                    <FiClock /> Extend Stay
                  </button>
                  <button onClick={() => {
                    setCheckoutPayment({ paymentType: "", amount: outstandingDue > 0 ? outstandingDue : "", transactionRef: "" });
                    setIsCheckoutModalOpen(true);
                  }} className="btn btn-sm bg-brand-primary text-white border-none w-full col-span-2 rounded-full cursor-pointer mt-2 font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow">
                    Checkout Guest <FiArrowRight />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Post Food Order Modal */}
      {isFoodModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest">Post Food Order to Folio</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Select Food Item</span></label>
                <select
                  value={foodFormData.foodItem}
                  onChange={(e) => setFoodFormData({ ...foodFormData, foodItem: e.target.value })}
                  className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs h-9"
                >
                  <option value="">Select Item</option>
                  {foodMenu.map(item => (
                    <option key={item._id} value={item._id}>{item.foodName} (৳{item.price})</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Quantity</span></label>
                <input
                  type="number"
                  value={foodFormData.quantity}
                  onChange={(e) => setFoodFormData({ ...foodFormData, quantity: Number(e.target.value) })}
                  className="input input-bordered border-brand-primary w-full h-9"
                  min="1"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setIsFoodModalOpen(false)} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Cancel</button>
                <button onClick={handlePostFoodOrder} className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6">Post Charge</button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Post Resort Service Modal */}
      {isServiceModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest">Post Service Charge to Folio</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Select Resort Service</span></label>
                <select
                  value={serviceFormData.serviceId}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, serviceId: e.target.value })}
                  className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs h-9"
                >
                  <option value="">Select Service</option>
                  {services.map(s => (
                    <option key={s._id} value={s._id}>{s.serviceName} (৳{s.price})</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setIsServiceModalOpen(false)} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Cancel</button>
                <button onClick={handlePostService} className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6">Post Charge</button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Post Payment Modal */}
      {isPaymentModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest">Post Direct Payment Credit</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Method</span></label>
                <select
                  value={paymentFormData.paymentType}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentType: e.target.value })}
                  className="select select-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs h-9"
                >
                  <option value="">Select Method</option>
                  {paymentTypes.map(pt => (
                    <option key={pt._id} value={pt.name}>{pt.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Payment Amount</span></label>
                <input
                  type="number"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  className="input input-bordered border-brand-primary w-full h-9"
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Transaction Reference</span></label>
                <input
                  type="text"
                  value={paymentFormData.transactionRef}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, transactionRef: e.target.value })}
                  className="input input-bordered border-brand-primary w-full h-9"
                  placeholder="e.g. BKash trxID, Card Ref"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setIsPaymentModalOpen(false)} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Cancel</button>
                <button onClick={handlePostPayment} className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6">Post Credit</button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Extend Stay Modal */}
      {isExtendModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest">Extend Expected Check-Out</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">New Expected Check-Out Date</span></label>
                <input
                  type="date"
                  value={extendFormData.newCheckOutDate}
                  onChange={(e) => setExtendFormData({ newCheckOutDate: e.target.value })}
                  className="input input-bordered border-brand-primary w-full"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setIsExtendModalOpen(false)} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Cancel</button>
                <button onClick={handleExtendStay} className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6">Extend Date</button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Settle Checkout Modal */}
      {isCheckoutModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl border animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                Guest Checkout Settle
              </h3>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              {/* Checkout Bill Break-down info */}
              <div className="p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige/25 rounded-2xl space-y-2 text-xs">
                <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block border-b border-brand-beige/20 pb-2">Folio Ledger Account Summary</span>
                <div className="flex justify-between">
                  <span>Room Charges (Debit):</span>
                  <span className="font-bold">৳{folioEntries.filter(e => e.type === "Room Charge").reduce((acc, e) => acc + e.debit, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Food Charges (Debit):</span>
                  <span className="font-bold">৳{folioEntries.filter(e => e.type === "Food Charge").reduce((acc, e) => acc + e.debit, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charges (Debit):</span>
                  <span className="font-bold">৳{folioEntries.filter(e => e.type === "Service Charge").reduce((acc, e) => acc + e.debit, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-brand-sage">
                  <span>Payments & Prepayments (Credit):</span>
                  <span className="font-bold">৳{folioEntries.filter(e => e.type === "Payment" || e.type === "Advance Payment").reduce((acc, e) => acc + (e.credit || 0), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-brand-secondary">
                  <span>Discounts Applied (Credit):</span>
                  <span className="font-bold">৳{folioEntries.filter(e => e.type === "Discount").reduce((acc, e) => acc + (e.credit || 0), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-brand-beige/40 pt-2 text-sm font-extrabold text-brand-secondary">
                  <span>Final Outstanding Balance:</span>
                  <span>৳{outstandingDue.toFixed(2)}</span>
                </div>
              </div>

              {/* Settlement payment fields (only if outstanding balance is positive) */}
              {outstandingDue > 0 ? (
                <div className="p-4 bg-brand-offwhite/50 border border-brand-beige/20 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest block mb-1">Record Settlement Payment</span>
                  <div className="flex gap-4">
                    <div className="form-control w-1/2">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Payment Method *</span></label>
                      <select
                        value={checkoutPayment.paymentType}
                        onChange={(e) => setCheckoutPayment({ ...checkoutPayment, paymentType: e.target.value })}
                        className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                      >
                        <option value="">Select Method</option>
                        {paymentTypes.map(pt => (
                          <option key={pt._id} value={pt.name}>{pt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-control w-1/2">
                      <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Settlement Amount *</span></label>
                      <input
                        type="number"
                        value={checkoutPayment.amount}
                        onChange={(e) => setCheckoutPayment({ ...checkoutPayment, amount: Number(e.target.value) })}
                        className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                      />
                    </div>
                  </div>
                  <div className="form-control w-full">
                    <label className="label py-0"><span className="label-text text-[9px] font-bold text-brand-sage uppercase tracking-widest">Transaction Ref</span></label>
                    <input
                      type="text"
                      value={checkoutPayment.transactionRef}
                      onChange={(e) => setCheckoutPayment({ ...checkoutPayment, transactionRef: e.target.value })}
                      className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal text-xs dark:text-brand-offwhite w-full"
                      placeholder="e.g. Card Ref, Cash Receipt No"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 text-green-700 text-xs font-bold rounded-xl text-center">Ledger Account is fully settled. Guest can check-out.</div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setIsCheckoutModalOpen(false)} className="btn btn-ghost hover:bg-brand-beige text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
                <button onClick={handleCheckoutGuest} className="btn bg-green-600 hover:bg-green-700 text-white border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md">
                  Confirm Checkout
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Post Discount Modal */}
      {isDiscountModalOpen && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite dark:bg-brand-charcoal/50">
              <span className="font-bold text-sm uppercase tracking-widest text-brand-black dark:text-brand-offwhite">Post Discount to Folio</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="form-control w-full">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Discount Type *</span></label>
                <select
                  value={discountFormData.discountType}
                  onChange={(e) => setDiscountFormData({ ...discountFormData, discountType: e.target.value })}
                  className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="amount">Fixed Amount (৳)</option>
                </select>
              </div>
              <div className="form-control w-full">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Discount Value *</span></label>
                <input
                  type="number"
                  value={discountFormData.value}
                  onChange={(e) => setDiscountFormData({ ...discountFormData, value: e.target.value })}
                  className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                  placeholder={discountFormData.discountType === "percentage" ? "e.g. 10" : "e.g. 500"}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Apply Discount To *</span></label>
                <select
                  value={discountFormData.applyTo}
                  onChange={(e) => setDiscountFormData({ ...discountFormData, applyTo: e.target.value })}
                  className="select select-bordered select-xs border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-8"
                >
                  <option value="all">Total Bill (All Charges)</option>
                  <option value="room">Room Charges Only</option>
                  <option value="food">Food Charges Only</option>
                </select>
              </div>
              <div className="form-control w-full">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Reason / Description</span></label>
                <input
                  type="text"
                  value={discountFormData.reason}
                  onChange={(e) => setDiscountFormData({ ...discountFormData, reason: e.target.value })}
                  className="input input-bordered input-xs h-8 border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full text-xs"
                  placeholder="e.g. Corporate Discount"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsDiscountModalOpen(false)} className="btn btn-xs btn-ghost uppercase font-bold text-[10px]">Cancel</button>
                <button onClick={handlePostDiscount} className="btn btn-xs bg-brand-primary text-white border-none rounded uppercase tracking-wider font-bold text-[10px] px-4">Apply Discount</button>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default StaysPage;
