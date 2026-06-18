import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiLogOut, FiEdit, FiTrash2 } from 'react-icons/fi';

const BookingContextMenu = ({ x, y, booking, onClose, onAction }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    // Slight delay to prevent immediate close on the right-click event itself
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  if (!booking) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[100] w-48 bg-white dark:bg-brand-charcoal rounded-lg shadow-xl border border-brand-beige/50 dark:border-brand-beige/20 py-1"
        style={{ top: y, left: x }}
        onContextMenu={(e) => e.preventDefault()} // Prevent default menu over this menu
      >
        <div className="px-4 py-2 border-b border-brand-beige/30 dark:border-brand-beige/10 mb-1">
          <p className="text-xs font-bold text-brand-primary truncate">{booking.customer?.fullName}</p>
          <p className="text-[10px] text-brand-sage uppercase tracking-wider">{booking.bookingStatus}</p>
        </div>
        
        {booking.bookingStatus !== 'Checked-in' && booking.bookingStatus !== 'Checked-out' && (
          <button 
            className="w-full text-left px-4 py-2 text-sm text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-offwhite dark:hover:bg-brand-offwhite/5 flex items-center gap-2"
            onClick={() => onAction('check-in', booking)}
          >
            <FiCheckCircle className="text-green-500" /> Check In
          </button>
        )}
        
        {booking.bookingStatus === 'Checked-in' && (
          <button 
            className="w-full text-left px-4 py-2 text-sm text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-offwhite dark:hover:bg-brand-offwhite/5 flex items-center gap-2"
            onClick={() => onAction('check-out', booking)}
          >
            <FiLogOut className="text-gray-500" /> Check Out
          </button>
        )}
        
        <button 
          className="w-full text-left px-4 py-2 text-sm text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-offwhite dark:hover:bg-brand-offwhite/5 flex items-center gap-2"
          onClick={() => onAction('edit', booking)}
        >
          <FiEdit className="text-blue-500" /> View/Edit Details
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default BookingContextMenu;
