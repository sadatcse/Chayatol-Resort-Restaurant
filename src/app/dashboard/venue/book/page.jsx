"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiCalendar, FiClock, FiUsers, FiDollarSign, FiFileText, FiCheckCircle } from "react-icons/fi";
import Swal from "sweetalert2";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import CustomerModal from "@/components/CustomerModal";
import useStandardPrint from "@/hooks/useStandardPrint";
import PrintReportTemplate from "@/components/Comon/PrintReportTemplate";

const calculateCompleteness = (customer) => {
  if (!customer) return 0;
  let score = 0;
  if (customer.fullName) score += 1;
  if (customer.phoneNumber) score += 1;
  if (customer.emailAddress) score += 1;
  if (customer.maritalStatus) score += 1;
  if (customer.gender) score += 1;
  if (customer.dateOfBirth) score += 1;
  if (customer.address?.line1) score += 1;
  if (customer.address?.city) score += 1;
  if (customer.identificationNumber) score += 1;
  if (customer.customerPhoto) score += 1;
  return score;
};

const VenueBookPage = () => {
  const axiosSecure = useAxiosSecure();
  const router = useRouter();

  // Load lists
  const [pricingPlans, setPricingPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [phoneSearch, setPhoneSearch] = useState("");
  const [custSearchResults, setCustSearchResults] = useState([]);
  const [custSearchLoading, setCustSearchLoading] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);
  
  const [companyName, setCompanyName] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("22:00");
  const [venueSize, setVenueSize] = useState("Half Venue");
  const [dayType, setDayType] = useState("Full Day");
  const [spaceOption, setSpaceOption] = useState("Only Venue");
  const [roomsCount, setRoomsCount] = useState(6);
  const [foodOption, setFoodOption] = useState("Without Food");
  const [pricingType, setPricingType] = useState("Full Day - Only Venue");
  const [numberOfGuests, setNumberOfGuests] = useState(0);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  
  // Calculated states
  const [rateApplied, setRateApplied] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [duration, setDuration] = useState(1);
  const [durationUnit, setDurationUnit] = useState("Days");
  const [totalAmount, setTotalAmount] = useState(0);
  const [dueAmount, setDueAmount] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState(["Cash", "Card", "bKash", "Bank Transfer"]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Cash");

  // Print Setup
  const {
    printData,
    setPrintData,
    printRef,
  } = useStandardPrint({
    documentTitle: "Venue_Booking_Invoice",
    onAfterPrint: () => setPrintData(null)
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Availability state
  const [availability, setAvailability] = useState({ isAvailable: true, conflictReason: "" });
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // Customer Modal toggle
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateDynamicRate = (day, space, rooms, food, plans) => {
    const onlyVenueName = `${day} - Only Venue${food === "With Food" ? " + Food" : ""}`;
    const sixRoomsName = `${day} - 6 Rooms with Venue${food === "With Food" ? " + Food" : ""}`;

    const onlyVenuePlan = plans.find(p => p.pricingType === onlyVenueName);
    const sixRoomsPlan = plans.find(p => p.pricingType === sixRoomsName);

    if (space === "Only Venue") {
      setPricingType(onlyVenueName);
      return onlyVenuePlan ? onlyVenuePlan.price : (day === "Full Day" ? 30000 : 18000);
    } else {
      if (rooms === 6) {
        setPricingType(sixRoomsName);
        return sixRoomsPlan ? sixRoomsPlan.price : (day === "Full Day" ? 45000 : 25000);
      } else {
        setPricingType(`${day} - Venue + ${rooms} Rooms${food === "With Food" ? " + Food" : ""}`);
        
        const price0 = onlyVenuePlan ? onlyVenuePlan.price : (day === "Full Day" ? 30000 : 18000);
        const price6 = sixRoomsPlan ? sixRoomsPlan.price : (day === "Full Day" ? 45000 : 25000);
        
        const perRoomCost = (price6 - price0) / 6;
        return Math.round(price0 + (rooms * perRoomCost));
      }
    }
  };

  const handleDayTypeChange = (val) => {
    setDayType(val);
    const rate = calculateDynamicRate(val, spaceOption, roomsCount, foodOption, pricingPlans);
    setRateApplied(rate);
  };

  const handleSpaceOptionChange = (val) => {
    setSpaceOption(val);
    if (val === "Venue + Rooms" && roomsCount === 6) {
      setVenueSize("Full Venue");
    } else {
      setVenueSize("Half Venue");
    }
    const rate = calculateDynamicRate(dayType, val, roomsCount, foodOption, pricingPlans);
    setRateApplied(rate);
  };

  const handleRoomsCountChange = (val) => {
    const count = Number(val);
    setRoomsCount(count);
    if (spaceOption === "Venue + Rooms" && count === 6) {
      setVenueSize("Full Venue");
    } else {
      setVenueSize("Half Venue");
    }
    const rate = calculateDynamicRate(dayType, spaceOption, count, foodOption, pricingPlans);
    setRateApplied(rate);
  };

  const handleFoodOptionChange = (val) => {
    setFoodOption(val);
    const rate = calculateDynamicRate(dayType, spaceOption, roomsCount, val, pricingPlans);
    setRateApplied(rate);
  };

  const fetchDropdownData = async () => {
    setIsLoading(true);
    try {
      const priceRes = await axiosSecure.get("/venue/pricing");
      const data = priceRes.data || [];
      setPricingPlans(data);
      
      const rate = calculateDynamicRate(dayType, spaceOption, roomsCount, foodOption, data);
      setRateApplied(rate);

      // Fetch dynamic payment types
      try {
        const payRes = await axiosSecure.get("/paymenttype");
        const payTypes = payRes.data || [];
        if (payTypes.length > 0) {
          const names = payTypes.map(p => p.paymentTypeName).filter(Boolean);
          if (names.length > 0) {
            setPaymentMethods(names);
            setSelectedPaymentMethod(names[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load payment types:", err);
      }
    } catch (error) {
      console.error("Failed to fetch pricing plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Customer Search Logic
  const handleSearchCustomer = async () => {
    if (!phoneSearch || phoneSearch.trim().length < 3) {
      Swal.fire("Warning", "Please enter at least 3 digits to search.", "warning");
      return;
    }
    setCustSearchLoading(true);
    setCustSearchResults([]);
    try {
      const res = await axiosSecure.get(`/customer/paginated?search=${encodeURIComponent(phoneSearch)}&limit=5`);
      if (res.data.customers && res.data.customers.length > 0) {
        setCustSearchResults(res.data.customers);
      } else {
        setCustSearchResults([]);
        setCustomerToEdit(null);
        setIsCustomerModalOpen(true);
      }
    } catch (e) {
      console.error("Search customer error:", e);
    } finally {
      setCustSearchLoading(false);
    }
  };

  const selectCust = (cust) => {
    setSelectedCust(cust);
    setPhoneSearch(cust.phoneNumber);
    setCustSearchResults([]);
  };

  // Calculate pricing & duration automatically
  useEffect(() => {
    const rate = calculateDynamicRate(dayType, spaceOption, roomsCount, foodOption, pricingPlans);
    
    const planName = `${dayType} - ${spaceOption}${foodOption === "With Food" ? " + Food" : ""}`;
    const unit = planName.toLowerCase().includes("hour") ? "Hours" : "Days";
    setDurationUnit(unit);

    let dur = 1;
    if (unit === "Hours") {
      const startDt = new Date(`${startDate}T${startTime}`);
      const endDt = new Date(`${endDate}T${endTime}`);
      if (!isNaN(startDt.getTime()) && !isNaN(endDt.getTime()) && endDt > startDt) {
        dur = Math.ceil((endDt - startDt) / (1000 * 60 * 60));
      }
    } else {
      const startDt = new Date(startDate);
      const endDt = new Date(endDate);
      if (!isNaN(startDt.getTime()) && !isNaN(endDt.getTime()) && endDt >= startDt) {
        const utc1 = Date.UTC(startDt.getFullYear(), startDt.getMonth(), startDt.getDate());
        const utc2 = Date.UTC(endDt.getFullYear(), endDt.getMonth(), endDt.getDate());
        dur = Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24)) + 1;
      }
    }
    setDuration(dur);

    const calculatedTotal = Math.max(0, (Number(rateApplied) * dur) - Number(discountAmount));
    setTotalAmount(calculatedTotal);
    setDueAmount(Math.max(0, calculatedTotal - Number(paidAmount)));

  }, [pricingPlans, rateApplied, discountAmount, dayType, spaceOption, roomsCount, foodOption, startDate, endDate, startTime, endTime, paidAmount]);

  // Automated Real-Time Availability Checker
  const checkAvailability = useCallback(async () => {
    if (!startDate || !endDate) return;
    setIsCheckingAvailability(true);
    try {
      const response = await axiosSecure.get(
        `/venue/availability?startDate=${startDate}&endDate=${endDate}&venueSize=${venueSize}`
      );
      setAvailability(response.data);
    } catch (err) {
      console.error("Availability validation error:", err);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [startDate, endDate, venueSize, axiosSecure]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability();
    }, 400); // debounce API hits
    return () => clearTimeout(timer);
  }, [startDate, endDate, venueSize, checkAvailability]);

  // Success handler for CustomerModal
  const handleCustomerCreatedOrEdited = (newCustomer) => {
    selectCust(newCustomer);
    setIsCustomerModalOpen(false);
    Swal.fire({
      icon: "success",
      title: "Success",
      text: "Customer profile saved successfully!",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  // Submit Booking creation
  const handleBookVenue = async (e) => {
    e.preventDefault();

    if (!selectedCust) {
      Swal.fire("Required", "Please select a Customer.", "warning");
      return;
    }
    if (!eventTitle.trim()) {
      Swal.fire("Required", "Please enter an Event Title.", "warning");
      return;
    }
    if (!availability.isAvailable) {
      Swal.fire("Schedule Conflict", availability.conflictReason, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer: selectedCust._id,
        companyName,
        eventTitle,
        startDate,
        endDate,
        startTime,
        endTime,
        venueSize,
        pricingType,
        rateApplied: Number(rateApplied),
        duration,
        durationUnit,
        numberOfGuests: Number(numberOfGuests),
        numberOfRooms: spaceOption === "Venue + Rooms" ? roomsCount : 0,
        totalAmount,
        paidAmount: Number(paidAmount),
        discount: Number(discountAmount),
        paymentMethod: selectedPaymentMethod,
        specialInstructions
      };

      const response = await axiosSecure.post("/venue/booking", payload);
      const createdBooking = response.data;
      
      // Inject full customer object to printData for invoice formatting
      const fullPrintBooking = {
        ...createdBooking,
        customer: selectedCust
      };
      setPrintData(fullPrintBooking);

      Swal.fire({
        icon: "success",
        title: "Booking Confirmed",
        text: `Venue booking ${createdBooking.bookingNumber} created successfully!`,
        showCancelButton: true,
        confirmButtonText: "Print Invoice 🖨️",
        cancelButtonText: "Go to History",
        confirmButtonColor: "#346E36",
        cancelButtonColor: "#6b7280"
      }).then(() => {
        router.push("/dashboard/venue/history");
      });
    } catch (error) {
      console.error("Booking error:", error);
      Swal.fire({
        icon: "error",
        title: "Booking Failed",
        text: error.response?.data?.message || "Something went wrong while booking.",
        confirmButtonColor: "#10b981",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <SectionHeader title="Book Venue" subtitle="Schedule ground floor resort venue space" />
        <div className="flex justify-center items-center min-h-[300px]">
          <span className="loading loading-spinner loading-lg text-brand-primary"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <SectionHeader title="Book Venue" subtitle="Book Resort Ground Floor (6 Rooms + Restaurant Area) for events" />

      <form onSubmit={handleBookVenue} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-white dark:bg-brand-charcoal border border-brand-beige/40 dark:border-brand-dark-grey/40 shadow-sm rounded-3xl p-6 space-y-5">
            <h3 className="text-md font-bold text-brand-black dark:text-brand-offwhite border-b border-brand-beige/20 dark:border-zinc-800 pb-2">
              Event Details
            </h3>

            {/* Event Name */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                  Event / Booking Title *
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-sage">
                  <FiFileText />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. John's Wedding Reception / Annual Corporate Meet"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="input input-bordered w-full pl-10 rounded-2xl bg-brand-offwhite/50 border-brand-beige/50 dark:bg-zinc-900/50 dark:border-zinc-800 text-sm focus:outline-none focus:border-brand-primary text-brand-black dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Customer Search Section */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                  Customer / Guest *
                </span>
              </label>
              
              {!selectedCust ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={phoneSearch} 
                      onChange={(e) => { 
                        setPhoneSearch(e.target.value); 
                        setCustSearchResults([]); 
                      }} 
                      placeholder="Search by phone number (e.g. 01700000000)" 
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary flex-1 bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite rounded-2xl text-sm" 
                    />
                    <button 
                      type="button" 
                      onClick={handleSearchCustomer} 
                      disabled={custSearchLoading} 
                      className="btn bg-brand-primary hover:bg-brand-secondary border-none text-white px-6 rounded-2xl cursor-pointer"
                    >
                      {custSearchLoading ? "..." : "Search"}
                    </button>
                  </div>

                  {custSearchResults.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 dark:bg-zinc-900/50 border border-brand-beige/50 dark:border-zinc-800 rounded-2xl animate-fade-in text-brand-charcoal dark:text-brand-offwhite">
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
                          <div key={cust._id} className="flex justify-between items-center bg-white dark:bg-brand-charcoal p-2 rounded-xl border border-brand-beige/30 dark:border-zinc-850">
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
                              className="btn btn-xs bg-brand-primary hover:bg-brand-secondary border-none text-white px-3 rounded-lg cursor-pointer font-bold"
                            >
                              Select
                            </button>
                          </div>
                        );
                      })}
                      <button 
                        type="button" 
                        onClick={() => { setCustSearchResults([]); setCustomerToEdit(null); setIsCustomerModalOpen(true); }} 
                        className="text-xs text-blue-500 font-bold hover:underline self-start mt-1 cursor-pointer"
                      >
                        + Add New Customer
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                (() => {
                  const score = calculateCompleteness(selectedCust);
                  const badgeClass = score <= 3 
                    ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50" 
                    : score <= 7 
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50" 
                    : score <= 9 
                    ? "bg-lime-50 text-lime-600 dark:bg-lime-950/30 dark:text-lime-400 border border-lime-200 dark:border-lime-900/50" 
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";
                  
                  return (
                    <div className="bg-brand-offwhite dark:bg-zinc-900 p-4 rounded-2xl border border-brand-beige dark:border-zinc-800 flex justify-between items-center text-brand-charcoal dark:text-brand-offwhite">
                      <div>
                        <div className="text-[10px] text-brand-sage font-bold uppercase tracking-widest mb-1">Selected Guest</div>
                        <div className="font-bold text-brand-black dark:text-brand-offwhite flex items-center gap-2">
                          {selectedCust.fullName}
                          <button 
                            type="button"
                            onClick={() => {
                              setCustomerToEdit(selectedCust);
                              setIsCustomerModalOpen(true);
                            }}
                            className="btn btn-ghost btn-xs text-brand-primary p-0 h-auto hover:bg-transparent cursor-pointer font-bold"
                            title="Edit Profile"
                          >
                            ✏️
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
                          setPhoneSearch(""); 
                        }} 
                        className="text-xs text-red-500 hover:underline font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Company Name (Simple string input) */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                  Company Name (Optional)
                </span>
              </label>
              <input
                type="text"
                placeholder="Enter company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="input input-bordered w-full rounded-2xl bg-brand-offwhite/50 border-brand-beige/50 dark:bg-zinc-900/50 dark:border-zinc-800 text-sm focus:outline-none focus:border-brand-primary text-brand-black dark:text-zinc-100"
              />
            </div>

            {/* Date range pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    Start Date
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-sage">
                    <FiCalendar />
                  </span>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input input-bordered w-full pl-10 rounded-2xl bg-brand-offwhite/50 border-brand-beige/50 dark:bg-zinc-900/50 dark:border-zinc-800 text-sm focus:outline-none focus:border-brand-primary text-brand-black dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    End Date
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-sage">
                    <FiCalendar />
                  </span>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input input-bordered w-full pl-10 rounded-2xl bg-brand-offwhite/50 border-brand-beige/50 dark:bg-zinc-900/50 dark:border-zinc-800 text-sm focus:outline-none focus:border-brand-primary text-brand-black dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Time Pickers (Visible when Hourly, optional else) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    Start Time
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-sage">
                    <FiClock />
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="input input-bordered w-full pl-10 rounded-2xl bg-brand-offwhite/50 border-brand-beige/50 dark:bg-zinc-900/50 dark:border-zinc-800 text-sm focus:outline-none focus:border-brand-primary text-brand-black dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    End Time
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-sage">
                    <FiClock />
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input input-bordered w-full pl-10 rounded-2xl bg-brand-offwhite/50 border-brand-beige/50 dark:bg-zinc-900/50 dark:border-zinc-800 text-sm focus:outline-none focus:border-brand-primary text-brand-black dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Size & Pricing Type Configurations */}
            <div className={`grid grid-cols-1 gap-4 ${spaceOption === "Venue + Rooms" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              {/* Day Package Select */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    Day Plan
                  </span>
                </label>
                <select
                  value={dayType}
                  onChange={(e) => handleDayTypeChange(e.target.value)}
                  className="select select-bordered w-full rounded-2xl bg-white dark:bg-zinc-900 border-brand-beige/50 dark:border-zinc-800 text-sm text-brand-black dark:text-zinc-100 focus:outline-none focus:border-brand-primary"
                >
                  <option value="Full Day" className="bg-white dark:bg-zinc-900">Full Day Rate</option>
                  <option value="Half Day" className="bg-white dark:bg-zinc-900">Half Day Rate</option>
                </select>
              </div>

              {/* Space Rent Option Select */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    Resort Space Option
                  </span>
                </label>
                <select
                  value={spaceOption}
                  onChange={(e) => handleSpaceOptionChange(e.target.value)}
                  className="select select-bordered w-full rounded-2xl bg-white dark:bg-zinc-900 border-brand-beige/50 dark:border-zinc-800 text-sm text-brand-black dark:text-zinc-100 focus:outline-none focus:border-brand-primary"
                >
                  <option value="Only Venue" className="bg-white dark:bg-zinc-900">Only Venue</option>
                  <option value="Venue + Rooms" className="bg-white dark:bg-zinc-900">Venue + Rooms</option>
                </select>
              </div>

              {/* Conditional Rooms Count Select */}
              {spaceOption === "Venue + Rooms" && (
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                      Rooms Count
                    </span>
                  </label>
                  <select
                    value={roomsCount}
                    onChange={(e) => handleRoomsCountChange(e.target.value)}
                    className="select select-bordered w-full rounded-2xl bg-white dark:bg-zinc-900 border-brand-beige/50 dark:border-zinc-800 text-sm text-brand-black dark:text-zinc-100 focus:outline-none focus:border-brand-primary"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num} className="bg-white dark:bg-zinc-900">
                        {num} {num === 1 ? "Room" : "Rooms"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Food Catering Option Select */}
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    Food Option
                  </span>
                </label>
                <select
                  value={foodOption}
                  onChange={(e) => handleFoodOptionChange(e.target.value)}
                  className="select select-bordered w-full rounded-2xl bg-white dark:bg-zinc-900 border-brand-beige/50 dark:border-zinc-800 text-sm text-brand-black dark:text-zinc-100 focus:outline-none focus:border-brand-primary"
                >
                  <option value="Without Food" className="bg-white dark:bg-zinc-900">Without Food</option>
                  <option value="With Food" className="bg-white dark:bg-zinc-900">With Food</option>
                </select>
              </div>
            </div>

            {/* Overlap Checking Control & Selected Package Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    Booking Scope (Overlap Rules)
                  </span>
                </label>
                <select
                  value={venueSize}
                  onChange={(e) => setVenueSize(e.target.value)}
                  className="select select-bordered w-full rounded-2xl bg-white dark:bg-zinc-900 border-brand-beige/50 dark:border-zinc-800 text-sm text-brand-black dark:text-zinc-100 focus:outline-none focus:border-brand-primary"
                >
                  <option value="Full Venue" className="bg-white dark:bg-zinc-900">Full Venue (Blocks All Other Bookings)</option>
                  <option value="Half Venue" className="bg-white dark:bg-zinc-900">Half Venue (Allows Co-Bookings)</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    Selected Pricing Plan Package
                  </span>
                </label>
                <div className="flex items-center justify-between px-4 py-3 bg-brand-offwhite dark:bg-zinc-900 rounded-2xl border border-brand-beige dark:border-zinc-800 text-sm font-bold text-brand-primary">
                  <span>{pricingType}</span>
                  <span>৳{(rateApplied || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Number of guests & special notes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    Estimated Guests
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-sage">
                    <FiUsers />
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={numberOfGuests}
                    onChange={(e) => setNumberOfGuests(e.target.value)}
                    className="input input-bordered w-full pl-10 rounded-2xl bg-brand-offwhite/50 border-brand-beige/50 dark:bg-zinc-900/50 dark:border-zinc-800 text-sm focus:outline-none focus:border-brand-primary text-brand-black dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="form-control w-full md:col-span-2">
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                    Special Instructions / Notes
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Catering setup, extra sound systems, decorators, etc."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="input input-bordered w-full rounded-2xl bg-brand-offwhite/50 border-brand-beige/50 dark:bg-zinc-900/50 dark:border-zinc-800 text-sm focus:outline-none focus:border-brand-primary text-brand-black dark:text-zinc-100"
                />
              </div>
            </div>

          </div>

          {/* Real-time Overlap Checker Banner */}
          <div className={`p-4 rounded-3xl border flex items-center gap-3 transition-colors duration-300 ${
            isCheckingAvailability
              ? "bg-brand-offwhite border-brand-beige text-brand-sage dark:bg-zinc-900 dark:border-zinc-800"
              : availability.isAvailable
              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/10 dark:border-green-900/50 dark:text-green-400"
              : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/10 dark:border-red-900/50 dark:text-red-400"
          }`}>
            {isCheckingAvailability ? (
              <span className="loading loading-ring loading-md text-brand-primary"></span>
            ) : availability.isAvailable ? (
              <FiCheckCircle className="text-xl shrink-0" />
            ) : (
              <span className="font-bold text-xl shrink-0">⚠️</span>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                {isCheckingAvailability ? "Checking Schedule..." : availability.isAvailable ? "Availability Confirmed" : "Schedule Overlap Blocked"}
              </p>
              <p className="text-xs mt-0.5 leading-relaxed font-medium">
                {isCheckingAvailability 
                  ? "Verifying database for bookings on the selected dates." 
                  : availability.isAvailable 
                  ? `The Ground Floor Resort is available for a ${venueSize} booking on these dates.` 
                  : availability.conflictReason}
              </p>
            </div>
          </div>
        </div>

        {/* Right Billing Summary Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-brand-charcoal border border-brand-beige/40 dark:border-brand-beige/25 shadow-sm rounded-3xl p-6 space-y-5">
            <h3 className="text-md font-bold text-brand-black dark:text-brand-offwhite border-b border-brand-beige/20 dark:border-zinc-800 pb-2">
              Billing Summary
            </h3>

            {/* Calculations Breakdown */}
            <div className="space-y-3.5 text-xs font-bold text-brand-sage">
              <div className="flex justify-between items-center">
                <span>Applied Pricing Plan:</span>
                <span className="text-brand-charcoal dark:text-zinc-200 font-extrabold">{pricingType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Duration:</span>
                <span className="text-brand-charcoal dark:text-zinc-200 font-extrabold">
                  {duration} {durationUnit}
                </span>
              </div>

              {/* Rate Applied Input */}
              <div className="form-control w-full">
                <label className="label py-0.5">
                  <span className="label-text font-bold text-[11px] text-brand-sage uppercase tracking-wider">
                    Rate Applied (৳)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-brand-sage font-bold">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={rateApplied}
                    onChange={(e) => setRateApplied(Number(e.target.value))}
                    className="input input-bordered w-full pl-8 rounded-2xl bg-white dark:bg-zinc-900 border-brand-beige/50 dark:border-zinc-800 text-sm font-bold text-brand-black dark:text-zinc-100 focus:outline-none focus:border-brand-primary h-10"
                  />
                </div>
              </div>

              {/* Discount Input */}
              <div className="form-control w-full">
                <label className="label py-0.5">
                  <span className="label-text font-bold text-[11px] text-brand-sage uppercase tracking-wider">
                    Discount (৳)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-brand-sage font-bold">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="input input-bordered w-full pl-8 rounded-2xl bg-white dark:bg-zinc-900 border-brand-beige/50 dark:border-zinc-800 text-sm font-bold text-brand-black dark:text-zinc-100 focus:outline-none focus:border-brand-primary h-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-brand-beige/10 pt-3">
              <span className="text-xs font-black uppercase text-brand-black dark:text-brand-offwhite">Total Price:</span>
              <span className="text-lg font-black text-green-600">৳ {totalAmount.toLocaleString()}</span>
            </div>

            {/* Paid Amount Input */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                  Paid Amount (Advance)
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-brand-sage font-bold">
                  ৳
                </span>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                  className="input input-bordered w-full pl-9 rounded-2xl bg-white dark:bg-zinc-900 border-brand-beige/50 dark:border-zinc-800 text-sm font-semibold focus:outline-none focus:border-brand-primary text-brand-black dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Payment Method Input */}
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-bold text-xs text-brand-charcoal dark:text-zinc-300">
                  Payment Method
                </span>
              </label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="select select-bordered w-full rounded-2xl bg-white dark:bg-zinc-900 border-brand-beige/50 dark:border-zinc-800 text-sm text-brand-black dark:text-zinc-100 focus:outline-none focus:border-brand-primary"
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method} className="bg-white dark:bg-zinc-900">
                    {method}
                  </option>
                ))}
              </select>
            </div>

            {/* Dues Output */}
            <div className="bg-brand-offwhite dark:bg-zinc-900 p-4 rounded-2xl flex justify-between items-center border border-brand-beige/20 dark:border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-sage">
                  Outstanding Due
                </span>
                <p className="text-xs text-brand-charcoal dark:text-zinc-300 font-medium">To be paid later</p>
              </div>
              <span className={`text-md font-bold ${dueAmount > 0 ? "text-red-500" : "text-green-500"}`}>
                ৳ {dueAmount.toLocaleString()}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !availability.isAvailable}
              className="btn bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-beige dark:disabled:bg-zinc-800 border-none text-white rounded-2xl w-full flex items-center justify-center gap-2 shadow-md shadow-brand-primary/10 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <FiDollarSign />
              )}
              Confirm & Book Venue
            </button>

          </div>
        </div>

      </form>

      {/* Embedded Inline Customer Creation Modal */}
      {isCustomerModalOpen && (
        <CustomerModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSuccess={handleCustomerCreatedOrEdited}
          customerToEdit={customerToEdit}
          initialPhoneNumber={phoneSearch}
        />
      )}

      {/* Hidden printable template */}
      <div className="hidden">
        {printData && (
          <PrintReportTemplate
            ref={printRef}
            title="Venue Booking Invoice"
            subtitle={`Booking Reference: ${printData.bookingNumber}`}
            dateRange={`${formatDate(printData.startDate)} - ${formatDate(printData.endDate)}`}
          >
            <div className="space-y-6 text-black text-sm" style={{ color: "#000" }}>
              {/* Event / Customer Metadata Grid */}
              <div className="grid grid-cols-2 gap-8 bg-gray-50 p-4 rounded border border-gray-200">
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 mb-2">Customer Details</h3>
                  <p className="font-bold text-md text-gray-900">{printData.customer?.fullName}</p>
                  <p className="text-xs text-gray-700">Phone: {printData.customer?.phoneNumber}</p>
                  <p className="text-xs text-gray-700">Email: {printData.customer?.emailAddress || "N/A"}</p>
                  {printData.companyName && (
                    <div className="mt-2 text-xs text-gray-800">
                      <span className="font-bold">Company Name:</span> {printData.companyName}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 mb-2">Booking Summary</h3>
                  <p className="font-bold text-md text-gray-900">{printData.eventTitle}</p>
                  <p className="text-xs text-gray-700"><span className="font-bold">Booking Scope:</span> {printData.venueSize}</p>
                  <p className="text-xs text-gray-700"><span className="font-bold">Duration:</span> {printData.duration} {printData.durationUnit}</p>
                  <p className="text-xs text-gray-700"><span className="font-bold">Time Window:</span> {printData.startTime} - {printData.endTime}</p>
                  <p className="text-xs text-gray-700"><span className="font-bold">Guests:</span> {printData.numberOfGuests} Persons</p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <table className="print-table w-full border-collapse" style={{ width: "100%" }}>
                <thead>
                  <tr className="bg-gray-100 text-left font-bold text-xs">
                    <th className="border p-2" style={{ border: "1px solid #d1d5db", padding: "8px" }}>Item / Description</th>
                    <th className="border p-2 text-center" style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "center" }}>Unit Rate</th>
                    <th className="border p-2 text-center" style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "center" }}>Qty / Duration</th>
                    <th className="border p-2 text-right" style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr>
                    <td className="border p-2" style={{ border: "1px solid #e5e7eb", padding: "8px" }}>
                      Rent for Ground Floor Venue - {printData.pricingType} Package
                    </td>
                    <td className="border p-2 text-center" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>
                      ৳ {(printData.rateApplied || 0).toLocaleString()}
                    </td>
                    <td className="border p-2 text-center" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>
                      {printData.duration} {printData.durationUnit}
                    </td>
                    <td className="border p-2 text-right font-bold" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
                      ৳ {((printData.rateApplied || 0) * printData.duration).toLocaleString()}
                    </td>
                  </tr>
                  
                  {/* Totals Section */}
                  {printData.discount > 0 && (
                    <tr className="font-bold text-red-650">
                      <td colSpan="3" className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>Applied Discount:</td>
                      <td className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
                        - ৳ {(printData.discount || 0).toLocaleString()}
                      </td>
                    </tr>
                  )}
                  <tr className="font-bold">
                    <td colSpan="3" className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>Total Net Bill:</td>
                    <td className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
                      ৳ {(printData.totalAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="font-bold text-green-700">
                    <td colSpan="3" className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>Paid / Advance Amount ({printData.paymentMethod || "Cash"}):</td>
                    <td className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
                      ৳ {(printData.paidAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="font-bold text-red-600">
                    <td colSpan="3" className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>Remaining Due Amount:</td>
                    <td className="border p-2 text-right" style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
                      ৳ {(printData.dueAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Instructions and Terms */}
              {printData.specialInstructions && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs">
                  <span className="font-bold uppercase tracking-wider text-gray-500 block mb-1">Special Instructions:</span>
                  <p className="text-gray-800 leading-relaxed font-medium">{printData.specialInstructions}</p>
                </div>
              )}

              <div className="pt-4 text-[11px] text-gray-500 leading-relaxed border-t border-gray-200">
                <p className="font-bold">Billing Terms & Policies:</p>
                <ol className="list-decimal pl-4 space-y-0.5 mt-1">
                  <li>Payments for venue reservation are subject to resort cancellation policies.</li>
                  <li>Dues must be cleared before or during the start of the booked event date.</li>
                  <li>This receipt is dynamically generated by Chayatol Resort & Restaurant Booking System.</li>
                </ol>
              </div>

            </div>
          </PrintReportTemplate>
        )}
      </div>
    </div>
  );
};

export default VenueBookPage;
