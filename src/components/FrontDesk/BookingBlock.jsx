import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const BookingBlock = ({ booking, colStart, colSpan, onClick, onContextMenu }) => {
  // Determine color based on status
  let bgColor = 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700/50';
  let indicatorColor = 'bg-blue-500';

  if (booking.bookingStatus === 'Checked-in') {
    bgColor = 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700/50';
    indicatorColor = 'bg-green-500';
  } else if (booking.bookingStatus === 'Checked-out') {
    bgColor = 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    indicatorColor = 'bg-gray-400';
  } else if (booking.bookingStatus === 'Cancelled') {
    bgColor = 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700/50';
    indicatorColor = 'bg-red-500';
  } else if (booking.paymentStatus === 'Pending' && booking.bookingStatus === 'Confirmed') {
    // Show striped background for pending payments on confirmed bookings
    bgColor = 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700/50 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(250,204,21,0.1)_10px,rgba(250,204,21,0.1)_20px)]';
    indicatorColor = 'bg-yellow-500';
  }

  const tooltipText = `${booking.customer?.fullName || 'Guest'}
Status: ${booking.bookingStatus}
Payment: ${booking.paymentStatus}
In: ${booking.checkInDate ? format(new Date(booking.checkInDate), 'MMM d, h:mm a') : 'N/A'}
Out: ${booking.checkOutDate ? format(new Date(booking.checkOutDate), 'MMM d, h:mm a') : 'N/A'}`;

  // Handle small spans (e.g. 1 day) by hiding text or using a tooltip
  const showText = colSpan > 1;

  return (
    <motion.div
      title={tooltipText}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('bookingId', booking._id);
      }}
      whileHover={{ y: -2, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(booking)}
      onContextMenu={(e) => onContextMenu && onContextMenu(e, booking)}
      className={`absolute top-1 bottom-1 rounded-md border shadow-sm flex items-center cursor-grab overflow-hidden backdrop-blur-sm transition-all ${bgColor}`}
      style={{
        left: `calc(${(colStart - 1)} * 40px + 2px)`,
        width: `calc(${colSpan} * 40px - 4px)`,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`w-1 h-full ${indicatorColor} shrink-0`}></div>
      <div className="px-2 truncate text-xs font-semibold tracking-wide">
        {showText ? booking.customer?.fullName || 'Guest' : ''}
      </div>
    </motion.div>
  );
};

export default BookingBlock;
