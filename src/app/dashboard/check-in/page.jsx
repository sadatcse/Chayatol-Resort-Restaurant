"use client";

import React, { useState, useEffect, useContext } from "react";
import { FiCheck, FiPlus, FiTrash2, FiEdit } from "react-icons/fi";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

import SectionHeader from "@/components/Comon/SectionHeader";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import CustomerModal from "@/components/CustomerModal";
import GuestListEditor from "@/components/GuestListEditor";
import GuestNotFoundNotice from "@/components/Comon/GuestNotFoundNotice";
import { calculateCompleteness } from "@/lib/customerHelper";
import { reconcilePrimaryGuest, validateRoomsGuestCapacity, serializeRoomsForSubmit } from "@/lib/guestCapacity";

const generateIdempotencyKey = () => "checkin-" + Date.now() + "-" + Math.random().toString(36).substring(2, 15);

const WalkInCheckInPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const router = useRouter();

  // Dropdowns lists
  const [customers, setCustomers] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);

  // Form states
  const [customer, setCustomer] = useState("");
  const [expectedCheckOutDate, setExpectedCheckOutDate] = useState("");
  const [rooms, setRooms] = useState([
    { room: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, nights: 1, guests: [] }
  ]);
  const [initialPayment, setInitialPayment] = useState({
    paymentType: "",
    amount: "",
    transactionRef: ""
  });

  // Customer Search & Registration states
  const [phoneSearch, setPhoneSearch] = useState("");
  const [custSearchLoading, setCustSearchLoading] = useState(false);
  const [custSearchResults, setCustSearchResults] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [custSearchMissed, setCustSearchMissed] = useState(false);

  const handleSearchCustomer = async () => {
    if (!phoneSearch || phoneSearch.trim().length < 3) {
      Swal.fire("Warning", "Please enter at least 3 digits to search.", "warning");
      return;
    }
    setCustSearchLoading(true);
    setCustSearchResults([]);
    setCustSearchMissed(false);
    try {
      const res = await axiosSecure.get(`/customer/paginated?search=${encodeURIComponent(phoneSearch)}&limit=5`);
      if (res.data.customers && res.data.customers.length > 0) {
        setCustSearchResults(res.data.customers);
      } else {
        setCustSearchResults([]);
        setCustSearchMissed(true);
        setIsCustModalOpen(true);
      }
    } catch (e) {
      console.error("Search customer error:", e);
    } finally {
      setCustSearchLoading(false);
    }
  };

  const selectCust = (cust) => {
    setSelectedCust(cust);
    setCustomer(cust._id);
    setPhoneSearch(cust.phoneNumber);
    setCustSearchResults([]);
    setCustSearchMissed(false);
    const reconciled = reconcilePrimaryGuest(rooms, cust);
    setRooms(reconciled.rooms);
  };

  const handleCustomerCreateSuccess = async (newCust) => {
    setCustomers(prev => [newCust, ...prev]);
    selectCust(newCust);
  };

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [custRes, roomsRes, payTypesRes] = await Promise.all([
          axiosSecure.get("/customer?all=true"),
          axiosSecure.get("/room?all=true"),
          axiosSecure.get("/paymenttype")
        ]);
        setCustomers(custRes.data || []);
        setAvailableRooms((roomsRes.data || []).filter(r => r.status === "Available"));
        setPaymentTypes(payTypesRes.data || []);
      } catch (err) {
        console.error("Error loading dropdown data:", err);
      }
    };
    if (currentUser) {
      fetchDropdowns();
    }
  }, [axiosSecure, currentUser]);

  const handleAddRoomRow = () => {
    setRooms([...rooms, { room: "", mealPlan: "Room Only", nightlyRate: 0, adults: 1, children: 0, nights: 1, guests: [] }]);
  };

  const handleRemoveRoomRow = (index) => {
    const updated = [...rooms];
    updated.splice(index, 1);
    setRooms(updated);
  };

  const handleRoomRowChange = (index, field, value) => {
    const updated = [...rooms];
    updated[index][field] = value;

    if (field === "room" || field === "mealPlan") {
      const roomId = updated[index].room;
      const selectedMeal = updated[index].mealPlan || "Room Only";

      if (roomId) {
        const roomObj = availableRooms.find(rm => rm._id === roomId);
        if (roomObj) {
          if (selectedMeal === "Breakfast Included") {
            updated[index].nightlyRate = roomObj.priceWithBreakfast || 0;
          } else if (selectedMeal === "All-Day Food Included") {
            updated[index].nightlyRate = roomObj.priceWithAllDayFood || 0;
          } else if (selectedMeal === "Day-Long Included") {
            updated[index].nightlyRate = roomObj.priceWithDayLong || 0;
          } else {
            updated[index].nightlyRate = roomObj.price || 0;
          }
        }
      }
    }

    // Auto-calculate expected checkout date if all nights match
    if (field === "nights") {
      const maxNights = Math.max(...updated.map(r => r.nights || 1));
      const checkout = new Date();
      checkout.setDate(checkout.getDate() + maxNights);
      setExpectedCheckOutDate(checkout.toISOString().split("T")[0]);
    }
    setRooms(updated);
  };

  const handleWalkInCheckin = async () => {
    if (isSubmitting) return;
    if (!customer) {
      Swal.fire("Validation Error", "Please select a customer.", "warning");
      return;
    }
    if (!expectedCheckOutDate) {
      Swal.fire("Validation Error", "Please provide expected check-out date.", "warning");
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkout = new Date(expectedCheckOutDate);
    checkout.setHours(0, 0, 0, 0);
    if (checkout <= today) {
      Swal.fire("Validation Error", "Expected check-out date must be in the future.", "warning");
      return;
    }

    for (let idx = 0; idx < rooms.length; idx++) {
      const r = rooms[idx];
      if (!r.room) {
        Swal.fire("Validation Error", `Please select a room for entry #${idx + 1}.`, "warning");
        return;
      }
      if (!r.mealPlan) {
        Swal.fire("Validation Error", `Please select a meal plan for entry #${idx + 1}.`, "warning");
        return;
      }
      if (r.nightlyRate === undefined || r.nightlyRate === null || isNaN(r.nightlyRate) || r.nightlyRate < 0) {
        Swal.fire("Validation Error", `Please enter a valid positive nightly rate for entry #${idx + 1}.`, "warning");
        return;
      }
      if (!r.adults || isNaN(r.adults) || r.adults < 1) {
        Swal.fire("Validation Error", `Please enter at least 1 adult for entry #${idx + 1}.`, "warning");
        return;
      }
      if (r.children === undefined || r.children === null || isNaN(r.children) || r.children < 0) {
        Swal.fire("Validation Error", `Please enter a valid number of children (minimum 0) for entry #${idx + 1}.`, "warning");
        return;
      }
    }

    if (initialPayment.amount !== "") {
      const amt = Number(initialPayment.amount);
      if (isNaN(amt) || amt <= 0) {
        Swal.fire("Validation Error", "Initial payment amount must be a positive number.", "warning");
        return;
      }
      if (!initialPayment.paymentType) {
        Swal.fire("Validation Error", "Please select a payment method for the initial payment.", "warning");
        return;
      }
    }

    const roomLookup = new Map(availableRooms.map(rm => [rm._id, rm]));
    const capacityCheck = validateRoomsGuestCapacity(rooms, roomLookup);
    if (!capacityCheck.ok) {
      Swal.fire("Validation Error", capacityCheck.message, "warning");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      customer,
      rooms: serializeRoomsForSubmit(rooms),
      expectedCheckOutDate,
      initialPayment: initialPayment.amount > 0 ? initialPayment : null,
      idempotencyKey
    };

    try {
      await axiosSecure.post("/stays", payload);
      setIdempotencyKey(generateIdempotencyKey());
      Swal.fire({
        title: "Checked In!",
        text: "Walk-in guest checked in successfully.",
        icon: "success",
        confirmButtonColor: "#346E36"
      });
      router.push("/dashboard/stays");
    } catch (error) {
      Swal.fire("Failed", error.response?.data?.message || "Failed to check-in walk-in guest.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="Walk-In Guest Check-In"
        subtitle="Quickly check-in a guest directly from the desk without a pre-booking reservation."
      />

      <div className="bg-white dark:bg-brand-charcoal p-8 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 max-w-3xl mx-auto space-y-6">

        <div className="form-control w-full">
          <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Select Customer *</span></label>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              value={phoneSearch} 
              onChange={(e) => {
                setPhoneSearch(e.target.value);
                setSelectedCust(null);
                setCustomer("");
                setCustSearchResults([]);
                setCustSearchMissed(false);
              }}
              placeholder="Search by phone number (e.g. 01700000000)" 
              className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary flex-1 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite" 
            />
            <button 
              type="button" 
              onClick={handleSearchCustomer} 
              disabled={custSearchLoading} 
              className="btn bg-brand-primary hover:bg-brand-secondary text-white border-none px-6"
            >
              {custSearchLoading ? "..." : "Search"}
            </button>
          </div>

          {custSearchResults.length > 0 && (
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 dark:bg-brand-charcoal/30 border border-brand-beige/50 dark:border-brand-beige/20 rounded-lg animate-fade-in">
              <div className="text-[10px] font-bold text-brand-sage uppercase tracking-wider">Search Results</div>
              {custSearchResults.map((cust) => {
                const score = calculateCompleteness(cust);
                const badgeClass = score <= 3 
                  ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50" 
                  : score <= 7 
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50" 
                  : score <= 9 
                  ? "bg-lime-50 text-lime-600 dark:bg-lime-950/30 dark:text-lime-400 border border-lime-200 dark:border-lime-900/50" 
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";
                
                return (
                  <div key={cust._id} className="flex justify-between items-center bg-white dark:bg-brand-charcoal p-2 rounded-lg border border-brand-beige/30 dark:border-brand-beige/10">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800 dark:text-brand-offwhite">{cust.fullName}</span>
                      <span className="text-xs text-brand-sage font-mono">{cust.phoneNumber}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                          Profile: {score}/10
                        </span>
                        <div className="w-12 bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              score <= 3 ? "bg-red-500" : score <= 7 ? "bg-amber-500" : score <= 9 ? "bg-lime-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${score * 10}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => selectCust(cust)} 
                      className="btn btn-xs bg-brand-primary hover:bg-brand-secondary text-white border-none px-3"
                    >
                      Select
                    </button>
                  </div>
                );
              })}
              <button 
                type="button" 
                onClick={() => { setCustSearchResults([]); setIsCustModalOpen(true); }} 
                className="text-xs text-blue-500 font-bold hover:underline self-start mt-1"
              >
                + Add New Customer
              </button>
            </div>
          )}

          {custSearchMissed && !selectedCust && custSearchResults.length === 0 && (
            <GuestNotFoundNotice query={phoneSearch} />
          )}

          {selectedCust && custSearchResults.length === 0 && (() => {
            const score = calculateCompleteness(selectedCust);
            const badgeClass = score <= 3 
              ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50" 
              : score <= 7 
              ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50" 
              : score <= 9 
              ? "bg-lime-50 text-lime-600 dark:bg-lime-950/30 dark:text-lime-400 border border-lime-200 dark:border-lime-900/50" 
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";
            
            return (
              <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 p-3 rounded-lg border border-brand-beige dark:border-brand-beige/20 mt-2 flex justify-between items-center text-brand-charcoal dark:text-brand-offwhite">
                <div>
                  <div className="text-[10px] text-brand-sage font-bold uppercase tracking-widest mb-1">Selected Guest</div>
                  <div className="font-bold text-brand-black dark:text-brand-offwhite flex items-center gap-2">
                    {selectedCust.fullName}
                    <button 
                      type="button"
                      onClick={() => {
                        setCustomerToEdit(selectedCust);
                        setIsCustModalOpen(true);
                      }}
                      className="btn btn-ghost btn-xs text-brand-primary p-0 h-auto hover:bg-transparent"
                      title="Edit Profile"
                    >
                      <FiEdit size={14} />
                    </button>
                  </div>
                  <div className="text-xs text-brand-sage font-mono">{selectedCust.phoneNumber}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                      Profile: {score}/10
                    </span>
                    <div className="w-12 bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          score <= 3 ? "bg-red-500" : score <= 7 ? "bg-amber-500" : score <= 9 ? "bg-lime-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${score * 10}%` }}
                      />
                    </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => { 
                    setSelectedCust(null); 
                    setCustomer(""); 
                    setPhoneSearch(""); 
                  }} 
                  className="text-xs text-red-500 hover:underline font-bold"
                >
                  Remove
                </button>
              </div>
            );
          })()}
        </div>

        {/* Rooms Selection */}
        <div className="space-y-4 pt-4 border-t border-brand-beige/50">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-brand-sage uppercase tracking-widest">Assign Rooms & Pricing Plan</span>
            <button type="button" onClick={handleAddRoomRow} className="btn btn-xs bg-brand-primary text-white border-none rounded-full px-3 gap-1">
              <FiPlus /> Add Room
            </button>
          </div>

          {rooms.map((r, index) => {
            const selectedRoomDoc = availableRooms.find(rm => rm._id === r.room);
            return (
            <div key={index} className="flex flex-col gap-3 p-4 bg-brand-offwhite dark:bg-brand-charcoal/30 border border-brand-beige dark:border-brand-beige/15 rounded-xl">
            <div className="flex flex-wrap items-end gap-3">
              <div className="form-control w-[140px]">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Room Number</span></label>
                <select
                  value={r.room}
                  onChange={(e) => handleRoomRowChange(index, "room", e.target.value)}
                  className="select select-bordered select-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs"
                >
                  <option value="">Select Room</option>
                  {availableRooms.map(rm => (
                    <option key={rm._id} value={rm._id}>{rm.roomNumber} ({rm.roomType})</option>
                  ))}
                </select>
              </div>

              <div className="form-control w-[160px]">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Meal Plan</span></label>
                <select
                  value={r.mealPlan}
                  onChange={(e) => handleRoomRowChange(index, "mealPlan", e.target.value)}
                  className="select select-bordered select-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs"
                >
                  <option value="Room Only">Room Only</option>
                  <option value="Breakfast Included">Breakfast Included</option>
                  <option value="All-Day Food Included">All-Day Food Included</option>
                  <option value="Day-Long Included">Day-Long Included</option>
                </select>
              </div>

              <div className="form-control w-[100px]">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Nightly Rate</span></label>
                <input
                  type="number"
                  value={r.nightlyRate}
                  onChange={(e) => handleRoomRowChange(index, "nightlyRate", Number(e.target.value))}
                  className="input input-bordered input-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                  min="0"
                />
              </div>

              <div className="form-control w-[60px]">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Nights</span></label>
                <input
                  type="number"
                  value={r.nights}
                  onChange={(e) => handleRoomRowChange(index, "nights", Number(e.target.value))}
                  className="input input-bordered input-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                  min="1"
                />
              </div>

              <div className="form-control w-[60px]">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Adults</span></label>
                <input
                  type="number"
                  value={r.adults}
                  onChange={(e) => handleRoomRowChange(index, "adults", Number(e.target.value))}
                  className="input input-bordered input-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                  min="1"
                />
              </div>

              <div className="form-control w-[60px]">
                <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Children</span></label>
                <input
                  type="number"
                  value={r.children}
                  onChange={(e) => handleRoomRowChange(index, "children", Number(e.target.value))}
                  className="input input-bordered input-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
                  min="0"
                />
              </div>

              <button type="button" onClick={() => handleRemoveRoomRow(index)} className="btn btn-square btn-outline btn-xs btn-error flex items-center justify-center h-8 w-8 cursor-pointer" disabled={rooms.length === 1}>
                <FiTrash2 size={14} />
              </button>
            </div>

            <GuestListEditor
              guests={r.guests || []}
              onChange={(g) => handleRoomRowChange(index, "guests", g)}
              capacity={selectedRoomDoc?.capacity}
              roomLabel={selectedRoomDoc?.roomNumber}
            />
            </div>
          );})}
        </div>

        <div className="form-control w-full">
          <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Expected Check-Out Date *</span></label>
          <input
            type="date"
            value={expectedCheckOutDate}
            onChange={(e) => setExpectedCheckOutDate(e.target.value)}
            className="input input-bordered border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full"
          />
        </div>

        {/* Initial Payment Settlement */}
        <div className="p-6 bg-brand-offwhite/50 dark:bg-brand-charcoal/30 border border-brand-beige/40 rounded-2xl space-y-4">
          <span className="text-xs font-bold text-brand-sage uppercase tracking-widest block border-b border-brand-beige/35 pb-2">Initial Check-In Payment (Optional)</span>
          <div className="flex gap-4">
            <div className="form-control w-1/2">
              <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Payment Method</span></label>
              <select
                value={initialPayment.paymentType}
                onChange={(e) => setInitialPayment({ ...initialPayment, paymentType: e.target.value })}
                className="select select-bordered select-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full select-xs h-9"
              >
                <option value="">Select Method</option>
                {paymentTypes.map(pt => (
                  <option key={pt._id} value={pt.name}>{pt.name}</option>
                ))}
              </select>
            </div>
            <div className="form-control w-1/2">
              <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Amount</span></label>
              <input
                type="number"
                value={initialPayment.amount}
                onChange={(e) => setInitialPayment({ ...initialPayment, amount: Number(e.target.value) })}
                className="input input-bordered input-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-9"
                placeholder="e.g. 5000"
              />
            </div>
          </div>
          <div className="form-control w-full">
            <label className="label py-0"><span className="label-text text-[10px] font-bold text-brand-sage uppercase tracking-widest">Transaction Reference</span></label>
            <input
              type="text"
              value={initialPayment.transactionRef}
              onChange={(e) => setInitialPayment({ ...initialPayment, transactionRef: e.target.value })}
              className="input input-bordered input-sm border-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite w-full h-9"
              placeholder="e.g. Card Ref, Cash Receipt No"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={() => router.push("/dashboard/stays")} className="btn btn-ghost hover:bg-brand-beige text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
          <button type="button" onClick={handleWalkInCheckin} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
            {isSubmitting ? "Processing Check-in..." : "Check In Guest"}
          </button>
        </div>
      </div>

      <CustomerModal 
        isOpen={isCustModalOpen} 
        onClose={() => {
          setIsCustModalOpen(false);
          setCustomerToEdit(null);
        }} 
        initialPhoneNumber={phoneSearch}
        customerToEdit={customerToEdit}
        onSuccess={(updatedCust) => {
          if (customerToEdit) {
            setSelectedCust(updatedCust);
            setCustomers(prev => prev.map(c => c._id === updatedCust._id ? updatedCust : c));
          } else {
            handleCustomerCreateSuccess(updatedCust);
          }
          setCustomerToEdit(null);
        }}
      />
    </div>
  );
};

export default WalkInCheckInPage;
