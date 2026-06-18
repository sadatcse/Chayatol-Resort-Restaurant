import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUser, FiCalendar, FiCreditCard, FiMessageSquare, FiActivity } from 'react-icons/fi';
import { format } from 'date-fns';
import Swal from 'sweetalert2';

const BookingDetailDrawer = ({ isOpen, onClose, booking, onStatusChange }) => {
  if (!isOpen || !booking) return null;



  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'bg-blue-100 text-blue-700';
      case 'Checked-in': return 'bg-green-100 text-green-700';
      case 'Checked-out': return 'bg-gray-100 text-gray-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-brand-beige text-brand-charcoal';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-brand-charcoal/20 backdrop-blur-[2px]"
        />

        {/* Drawer */}
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md bg-white dark:bg-brand-charcoal h-full shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-brand-beige dark:border-brand-beige/20 flex justify-between items-start bg-brand-offwhite/50 dark:bg-brand-charcoal/80">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-brand-charcoal dark:text-brand-offwhite">
                  Booking <span className="text-brand-primary">#{booking._id.substring(0, 6).toUpperCase()}</span>
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${getStatusColor(booking.bookingStatus)}`}>
                  {booking.bookingStatus}
                </span>
              </div>
              <div className="text-sm font-semibold text-brand-sage flex items-center gap-2">
                <FiUser /> {booking.customer?.fullName}
              </div>
            </div>
            <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary">
              <FiX size={20} />
            </button>
          </div>

          {/* Quick Actions / Tabs Header */}
          <div className="px-6 pt-4 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/30 dark:bg-brand-charcoal/50">
            <div className="dropdown w-full mb-4">
              <label tabIndex={0} className="btn btn-sm w-full bg-brand-primary text-white border-none hover:bg-brand-secondary uppercase tracking-widest text-xs font-bold shadow-sm">
                Change Status
              </label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-white dark:bg-brand-charcoal rounded-box w-full mt-1 border border-brand-beige/20">
                {['Confirmed', 'Checked-in', 'Checked-out', 'Cancelled'].map(status => (
                  <li key={status}>
                    <a 
                      onClick={() => {
                        onStatusChange(booking._id, status);
                        onClose();
                      }}
                      className={booking.bookingStatus === status ? 'active bg-brand-primary/10 text-brand-primary font-bold' : 'text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-offwhite dark:hover:bg-white/10'}
                    >
                      Change to: {status}
                    </a>
                  </li>
                ))}
              </ul>
            </div>


          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-grow bg-white dark:bg-brand-charcoal">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {/* Guest Info */}
                <div className="bg-brand-offwhite/50 dark:bg-brand-charcoal/30 p-4 rounded-xl border border-brand-beige/50 dark:border-brand-beige/10">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-sage mb-3">Main Guest</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-lg">
                      {booking.customer?.fullName?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <div className="font-bold text-brand-charcoal dark:text-brand-offwhite">{booking.customer?.fullName}</div>
                      <div className="text-xs text-brand-sage">{booking.customer?.phoneNumber}</div>
                    </div>
                  </div>
                </div>

                {/* Stay Info */}
                <div className="bg-brand-offwhite/50 dark:bg-brand-charcoal/30 p-4 rounded-xl border border-brand-beige/50 dark:border-brand-beige/10">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-sage mb-3">Dates of Stay</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-brand-sage mb-1">Check In</div>
                      <div className="font-bold text-brand-charcoal dark:text-brand-offwhite">
                        {booking.checkInDate ? format(new Date(booking.checkInDate), 'dd MMM yyyy') : 'N/A'}
                      </div>
                      <div className="text-xs font-semibold text-brand-primary">
                        {booking.checkInDate ? format(new Date(booking.checkInDate), 'hh:mm a') : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-sage mb-1">Check Out</div>
                      <div className="font-bold text-brand-charcoal dark:text-brand-offwhite">
                        {booking.checkOutDate ? format(new Date(booking.checkOutDate), 'dd MMM yyyy') : 'N/A'}
                      </div>
                      <div className="text-xs font-semibold text-brand-secondary">
                        {booking.checkOutDate ? format(new Date(booking.checkOutDate), 'hh:mm a') : ''}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-brand-beige/50 dark:border-brand-beige/10 flex justify-between items-center">
                    <span className="text-xs font-bold text-brand-sage uppercase tracking-widest">Room</span>
                    <span className="font-bold text-brand-primary">{booking.room?.roomNumber} <span className="text-brand-sage text-xs font-normal">({booking.room?.roomType})</span></span>
                  </div>
                </div>

                {/* Finance Info */}
                <div className="bg-brand-offwhite/50 dark:bg-brand-charcoal/30 p-4 rounded-xl border border-brand-beige/50 dark:border-brand-beige/10 flex gap-4">
                   <div className="flex-1 bg-white dark:bg-brand-charcoal rounded-lg p-3 shadow-sm border border-brand-beige/30 text-center">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-brand-sage mb-1">Total Amount</div>
                      <div className="font-bold text-brand-charcoal text-lg">৳{booking.totalAmount}</div>
                   </div>
                   <div className="flex-1 bg-brand-primary text-white rounded-lg p-3 shadow-sm text-center">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-white/80 mb-1">Payment</div>
                      <div className="font-bold text-lg">{booking.paymentStatus}</div>
                   </div>
                </div>


              </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BookingDetailDrawer;
