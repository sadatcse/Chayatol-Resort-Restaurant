import React from 'react';
import { FiChevronLeft, FiChevronRight, FiFilter, FiPlus } from 'react-icons/fi';
import { format, addMonths, subMonths } from 'date-fns';
import { motion } from 'framer-motion';

const TimelineHeader = ({ currentDate, setCurrentDate, onAddBooking, onToday }) => {
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-t-2xl border-b border-brand-beige dark:border-brand-beige/20 shadow-sm gap-4">
      {/* Month Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={prevMonth}
          className="btn btn-sm btn-ghost btn-circle text-brand-sage hover:bg-brand-primary/10 hover:text-brand-primary"
        >
          <FiChevronLeft size={20} />
        </button>

        <h2 className="text-lg font-bold text-brand-charcoal dark:text-brand-offwhite min-w-[150px] text-center">
          {format(currentDate, 'MMMM yyyy')}
        </h2>

        <button
          onClick={nextMonth}
          className="btn btn-sm btn-ghost btn-circle text-brand-sage hover:bg-brand-primary/10 hover:text-brand-primary"
        >
          <FiChevronRight size={20} />
        </button>
      </div>

      {/* Actions & Filters */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToday}
          className="btn btn-sm btn-outline border-brand-beige text-brand-sage hover:bg-brand-primary hover:text-white hover:border-brand-primary font-bold uppercase tracking-widest text-[10px]"
        >
          Today
        </button>

        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-sm btn-outline border-brand-beige text-brand-sage hover:bg-brand-primary hover:text-white hover:border-brand-primary font-bold uppercase tracking-widest text-[10px] gap-2">
            <FiFilter /> Filters
          </label>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 text-sm mt-1">
            <li><a>All Reservations</a></li>
            <li><a>Confirmed Only</a></li>
            <li><a>Checked-In Only</a></li>
          </ul>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddBooking}
          className="btn btn-sm bg-brand-primary text-white border-none hover:bg-brand-secondary font-bold uppercase tracking-widest text-[10px] gap-2 shadow-md px-6"
        >
          <FiPlus /> Add Booking
        </motion.button>
      </div>
    </div>
  );
};

export default TimelineHeader;
