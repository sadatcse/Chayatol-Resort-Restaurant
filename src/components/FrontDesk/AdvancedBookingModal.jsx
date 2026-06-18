import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSearch, FiCheck, FiUser, FiCalendar, FiCreditCard } from 'react-icons/fi';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Swal from 'sweetalert2';

const AdvancedBookingModal = ({ isOpen, onClose, onSave, customers, rooms, isSubmitting, onCreateNewCustomer, newlyCreatedCustomer, onClearNewCustomer }) => {
  const [step, setStep] = useState(1);
  const [searchPhoneInput, setSearchPhoneInput] = useState("");
  const [formData, setFormData] = useState({
    customer: "",
    customerName: "",
    customerPhone: "",
    room: "",
    checkInDate: null,
    checkOutDate: null,
    totalAmount: "",
    paymentStatus: "Pending",
    bookingStatus: "Confirmed",
    adults: 1,
    children: 0,
  });

  useEffect(() => {
    if (newlyCreatedCustomer) {
      setFormData(prev => ({
        ...prev,
        customer: newlyCreatedCustomer._id,
        customerName: newlyCreatedCustomer.fullName,
        customerPhone: newlyCreatedCustomer.phoneNumber
      }));
      if (onClearNewCustomer) onClearNewCustomer();
    }
  }, [newlyCreatedCustomer, onClearNewCustomer]);

  const customerOptions = customers.map(c => ({
    value: c._id,
    label: `${c.fullName} - ${c.phoneNumber}`
  }));

  const availableRooms = rooms.filter(r => !formData.room || r._id === formData.room || r.status === 'Available');

  const customSelectStyles = {
    control: (baseStyles) => ({
      ...baseStyles,
      borderColor: '#346E36',
      minHeight: '3rem',
      height: '3rem',
      borderRadius: '0.5rem',
      boxShadow: 'none',
      backgroundColor: 'transparent',
    }),
    option: (baseStyles, state) => ({
      ...baseStyles,
      backgroundColor: state.isSelected ? '#346E36' : state.isFocused ? 'rgba(52, 110, 54, 0.1)' : 'transparent',
      color: state.isSelected ? 'white' : 'inherit',
      cursor: 'pointer'
    })
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.checkInDate || !formData.checkOutDate) {
         Swal.fire('Required', 'Please select Check-in and Check-out dates.', 'warning');
         return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.room) {
         Swal.fire('Required', 'Please select a room.', 'warning');
         return;
      }
      setStep(3);
    }
  };

  const handleSubmit = () => {
    if (!formData.customer || !formData.totalAmount) {
      Swal.fire('Required', 'Please select a customer and ensure total amount is set.', 'warning');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-white dark:bg-brand-charcoal w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/50 dark:bg-brand-charcoal/80">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-brand-charcoal dark:text-brand-offwhite uppercase tracking-widest">
              Book a Room
            </h2>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-sage">
              <span className={step >= 1 ? 'text-brand-primary' : ''}>1. Dates</span>
              <span className="text-brand-beige/50">/</span>
              <span className={step >= 2 ? 'text-brand-primary' : ''}>2. Room</span>
              <span className="text-brand-beige/50">/</span>
              <span className={step >= 3 ? 'text-brand-primary' : ''}>3. Guest</span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow bg-white dark:bg-brand-charcoal">
          
          {/* Step 1: Dates & Guests */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold text-brand-sage uppercase tracking-widest text-xs">Dates of stay</span></label>
                  <div className="flex gap-2">
                    <DatePicker
                      selected={formData.checkInDate}
                      onChange={(date) => setFormData({ ...formData, checkInDate: date })}
                      showTimeSelect
                      dateFormat="MMM d, yyyy h:mm aa"
                      className="input input-bordered border-brand-beige dark:border-brand-beige/50 w-full focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholderText="Check-in"
                    />
                    <span className="flex items-center text-brand-sage">-</span>
                    <DatePicker
                      selected={formData.checkOutDate}
                      onChange={(date) => setFormData({ ...formData, checkOutDate: date })}
                      showTimeSelect
                      dateFormat="MMM d, yyyy h:mm aa"
                      className="input input-bordered border-brand-beige dark:border-brand-beige/50 w-full focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholderText="Check-out"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="form-control w-1/2">
                    <label className="label"><span className="label-text font-bold text-brand-sage uppercase tracking-widest text-xs">Adults</span></label>
                    <select 
                      className="select select-bordered border-brand-beige dark:border-brand-beige/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      value={formData.adults}
                      onChange={(e) => setFormData({...formData, adults: Number(e.target.value)})}
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="form-control w-1/2">
                    <label className="label"><span className="label-text font-bold text-brand-sage uppercase tracking-widest text-xs">Children</span></label>
                    <select 
                      className="select select-bordered border-brand-beige dark:border-brand-beige/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      value={formData.children}
                      onChange={(e) => setFormData({...formData, children: Number(e.target.value)})}
                    >
                      {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Room Selection */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="text-sm font-bold text-brand-sage mb-4">{availableRooms.length} room(s) available</div>
              
              <div className="grid gap-4">
                {availableRooms.map(room => (
                  <div key={room._id} className={`border rounded-xl p-4 flex justify-between items-center transition-all ${formData.room === room._id ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20' : 'border-brand-beige/50 hover:border-brand-primary/50'}`}>
                    <div>
                      <h4 className="font-bold text-brand-primary text-lg">{room.roomType}</h4>
                      <div className="text-sm text-brand-sage font-semibold">Room {room.roomNumber}</div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <div className="text-xl font-bold text-brand-charcoal dark:text-brand-offwhite">৳{room.price}</div>
                        <div className="text-[10px] uppercase tracking-widest text-brand-sage">per night</div>
                      </div>
                      <button 
                        onClick={() => setFormData({...formData, room: room._id, totalAmount: room.price})}
                        className={`btn btn-sm uppercase tracking-widest font-bold text-[10px] px-6 ${formData.room === room._id ? 'bg-brand-primary text-white border-none' : 'btn-outline border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white hover:border-none'}`}
                      >
                        {formData.room === room._id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Guest & Payment */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold text-brand-sage uppercase tracking-widest text-xs">Search Guest by Phone</span></label>
                <Select
                  options={customerOptions}
                  value={customerOptions.find(o => o.value === formData.customer) || null}
                  onChange={(selected) => {
                    const existing = customers.find(c => c._id === (selected ? selected.value : ""));
                    setFormData({ 
                      ...formData, 
                      customer: selected ? selected.value : "", 
                      customerPhone: existing ? existing.phoneNumber : "", 
                      customerName: existing ? existing.fullName : ""
                    });
                  }}
                  isClearable
                  isSearchable
                  placeholder="Select a customer..."
                  styles={customSelectStyles}
                  onInputChange={(val) => setSearchPhoneInput(val)}
                  noOptionsMessage={({ inputValue }) => (
                    <div className="p-1">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchPhoneInput(inputValue);
                          if (onCreateNewCustomer) onCreateNewCustomer(inputValue);
                        }}
                        className="btn btn-sm w-full bg-brand-primary text-white hover:bg-brand-secondary border-none uppercase tracking-widest text-[10px]"
                      >
                        + Create New
                      </button>
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold text-brand-sage uppercase tracking-widest text-xs">Total Amount (৳)</span></label>
                  <input
                    type="number"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    className="input input-bordered border-brand-beige dark:border-brand-beige/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold text-brand-sage uppercase tracking-widest text-xs">Payment Status</span></label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="select select-bordered border-brand-beige dark:border-brand-beige/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
              
              {/* Summary Card */}
              <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 p-4 rounded-xl border border-brand-beige/50 dark:border-brand-beige/20 mt-6">
                <h4 className="font-bold uppercase tracking-widest text-brand-primary text-xs mb-3 border-b border-brand-beige/50 pb-2">Booking Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-brand-sage">Check-in:</span>
                    <div className="font-bold">{formData.checkInDate?.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-brand-sage">Check-out:</span>
                    <div className="font-bold">{formData.checkOutDate?.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-brand-sage">Room:</span>
                    <div className="font-bold">{rooms.find(r => r._id === formData.room)?.roomNumber || 'Not selected'}</div>
                  </div>
                  <div>
                    <span className="text-brand-sage">Guest:</span>
                    <div className="font-bold">{formData.customerName || 'Not selected'}</div>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/50 dark:bg-brand-charcoal/80 flex justify-between items-center">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onClose()} 
            className="btn btn-ghost font-bold uppercase tracking-widest text-xs text-brand-sage"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>
          
          {step < 3 ? (
            <button 
              onClick={handleNext} 
              className="btn bg-brand-primary text-white border-none hover:bg-brand-secondary font-bold uppercase tracking-widest text-xs px-8 shadow-md"
            >
              Continue
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="btn bg-brand-primary text-white border-none hover:bg-brand-secondary font-bold uppercase tracking-widest text-xs px-8 shadow-md"
            >
              {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : 'Confirm Booking'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdvancedBookingModal;
