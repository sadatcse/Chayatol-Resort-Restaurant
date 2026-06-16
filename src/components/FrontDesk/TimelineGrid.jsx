import React, { useMemo } from 'react';
import { getDaysInMonth, startOfMonth, endOfMonth, isBefore, isAfter, differenceInCalendarDays, format, addDays, isToday } from 'date-fns';
import { motion } from 'framer-motion';
import BookingBlock from './BookingBlock';

const TimelineGrid = ({ currentDate, bookings, rooms, onBookingClick }) => {
  const daysInMonth = getDaysInMonth(currentDate);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));

  const groupedRooms = useMemo(() => {
    return rooms.reduce((acc, room) => {
      const type = room.roomType || 'Uncategorized';
      if (!acc[type]) acc[type] = [];
      acc[type].push(room);
      return acc;
    }, {});
  }, [rooms]);

  return (
    <div className="bg-white dark:bg-brand-charcoal rounded-b-2xl border border-t-0 border-brand-beige dark:border-brand-beige/20 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-250px)] min-h-[500px]">
      
      {/* Scrollable Container */}
      <div className="overflow-auto flex-grow flex relative">
        
        {/* Left Sidebar (Sticky) */}
        <div className="sticky left-0 z-20 bg-white dark:bg-brand-charcoal border-r border-brand-beige dark:border-brand-beige/20 w-48 shrink-0 flex flex-col shadow-[2px_0_5px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
          {/* Header */}
          <div className="h-14 border-b border-brand-beige dark:border-brand-beige/20 flex items-center px-4 font-bold text-xs uppercase tracking-widest text-brand-sage bg-brand-offwhite/50 dark:bg-brand-charcoal/80 shrink-0">
            Rooms
          </div>
          
          {/* Room List */}
          <div className="flex-grow">
            {Object.entries(groupedRooms).map(([type, typeRooms]) => (
              <div key={type}>
                <div className="bg-brand-offwhite dark:bg-brand-charcoal/50 text-brand-primary dark:text-brand-offwhite font-bold text-[11px] uppercase tracking-widest py-2 px-4 border-b border-brand-beige/50 dark:border-brand-beige/10 flex items-center gap-2 sticky top-0 z-10">
                  <span className="w-2 h-2 rounded-full bg-brand-secondary"></span>
                  {type}
                </div>
                {typeRooms.map(room => (
                  <div key={room._id} className="h-12 border-b border-brand-beige/50 dark:border-brand-beige/10 px-4 flex items-center text-sm font-semibold text-brand-charcoal dark:text-brand-offwhite/80 group">
                    <span className="group-hover:text-brand-primary transition-colors">{room.roomNumber}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex flex-col min-w-max relative pb-10">
          
          {/* Days Header */}
          <div className="h-14 flex border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/50 dark:bg-brand-charcoal/80 sticky top-0 z-10">
            {daysArray.map((day, i) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isCurrentDay = isToday(day);
              return (
                <div 
                  key={i} 
                  className={`w-[40px] shrink-0 flex flex-col justify-center items-center border-r border-brand-beige/30 dark:border-brand-beige/10 ${isCurrentDay ? 'bg-brand-primary/10' : ''}`}
                >
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isCurrentDay ? 'text-brand-primary' : isWeekend ? 'text-brand-sage/60' : 'text-brand-sage'}`}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={`text-sm font-bold ${isCurrentDay ? 'text-brand-primary bg-brand-primary/20 rounded-full w-6 h-6 flex items-center justify-center' : isWeekend ? 'text-brand-charcoal/50 dark:text-brand-offwhite/50' : 'text-brand-charcoal dark:text-brand-offwhite'}`}>
                    {format(day, 'dd')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid Rows */}
          <div className="relative">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {daysArray.map((day, i) => (
                <div key={i} className={`w-[40px] shrink-0 border-r border-brand-beige/20 dark:border-brand-beige/5 ${isToday(day) ? 'bg-brand-primary/5' : ''}`}></div>
              ))}
            </div>

            {/* Room Rows with Bookings */}
            {Object.entries(groupedRooms).map(([type, typeRooms]) => (
              <React.Fragment key={type}>
                {/* Type Header Row Spacer */}
                <div className="h-8 border-b border-brand-beige/50 dark:border-brand-beige/10 flex items-center bg-brand-offwhite/30 dark:bg-brand-charcoal/30">
                  {/* Empty spacer for the type header */}
                </div>
                
                {/* Actual Room Rows */}
                {typeRooms.map(room => {
                  const roomBookings = bookings.filter(b => b.room?._id === room._id && b.checkInDate && b.checkOutDate);
                  
                  const blocks = roomBookings.map(booking => {
                    const checkIn = new Date(booking.checkInDate);
                    const checkOut = new Date(booking.checkOutDate);
                    
                    if (isBefore(checkOut, monthStart) || isAfter(checkIn, monthEnd)) return null;

                    let colStart = 1;
                    if (isAfter(checkIn, monthStart)) {
                      colStart = differenceInCalendarDays(checkIn, monthStart) + 1;
                    }

                    let colEnd = daysInMonth + 1;
                    if (isBefore(checkOut, monthEnd)) {
                      colEnd = differenceInCalendarDays(checkOut, monthStart) + 1;
                    }

                    const colSpan = Math.max(1, colEnd - colStart);

                    return { booking, colStart, colSpan };
                  }).filter(Boolean);

                  return (
                    <div key={room._id} className="h-12 border-b border-brand-beige/50 dark:border-brand-beige/10 relative hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors">
                      {blocks.map((block, idx) => (
                        <BookingBlock 
                          key={block.booking._id || idx} 
                          booking={block.booking} 
                          colStart={block.colStart} 
                          colSpan={block.colSpan}
                          onClick={onBookingClick}
                        />
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineGrid;
