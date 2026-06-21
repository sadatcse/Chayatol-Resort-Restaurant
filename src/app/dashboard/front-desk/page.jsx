"use client";

import React, { useState, useEffect, useContext } from "react";
import { FiChevronLeft, FiChevronRight, FiPlus, FiCalendar, FiUser, FiHome, FiCheckCircle, FiInfo } from "react-icons/fi";
import { MdRestaurant, MdBeachAccess } from "react-icons/md";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";

const FrontDeskTimelinePage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date()); // Holds active month/year
  const [isLoading, setIsLoading] = useState(true);

  // Timeline Data
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [stays, setStays] = useState([]);

  // Detail Modal state
  const [selectedBlock, setSelectedBlock] = useState(null); // { type: 'res'|'stay', data: object }
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Month navigation helper
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Format month to YYYY-MM
  const monthString = `${year}-${String(month + 1).padStart(2, "0")}`;

  const fetchTimelineData = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosSecure.get(`/front-desk/timeline?month=${monthString}`);
      setRooms(data.rooms || []);
      setReservations(data.reservations || []);
      setStays(data.stays || []);
    } catch (err) {
      console.error("Error loading timeline data:", err);
      Swal.fire("Error", "Failed to load timeline records", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTimelineData();
    }
  }, [currentUser, monthString]);

  // Calendar setup
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayName = (dayNum) => {
    const d = new Date(year, month, dayNum);
    return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  };

  // Check if today falls in the grid
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = today.getDate();

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Group rooms by room type
  const roomsByType = rooms.reduce((acc, r) => {
    if (!acc[r.roomType]) acc[r.roomType] = [];
    acc[r.roomType].push(r);
    return acc;
  }, {});

  // Timeline Block Finder for grid cell
  const getBookingAtCell = (roomId, dayNum) => {
    const targetDate = new Date(year, month, dayNum);
    // Ensure hours are zeroed for safe date comparison
    targetDate.setHours(0, 0, 0, 0);

    // 1. Check Stays (Occupied rooms take visual precedence)
    const activeStay = stays.find(s => {
      return s.rooms.some(sr => {
        if (sr.room?._id === roomId || sr.room === roomId) {
          const checkin = new Date(s.checkInDate);
          checkin.setHours(0, 0, 0, 0);
          const checkout = s.actualCheckOutDate ? new Date(s.actualCheckOutDate) : new Date(s.expectedCheckOutDate);
          checkout.setHours(0, 0, 0, 0);

          return targetDate >= checkin && targetDate < checkout;
        }
        return false;
      });
    });

    if (activeStay) {
      return { type: "stay", data: activeStay };
    }

    // 2. Check Reservations
    const activeRes = reservations.find(r => {
      return r.rooms.some(rr => {
        if (rr.room?._id === roomId || rr.room === roomId) {
          const checkin = new Date(r.checkInDate);
          checkin.setHours(0, 0, 0, 0);
          const checkout = new Date(r.checkOutDate);
          checkout.setHours(0, 0, 0, 0);

          return targetDate >= checkin && targetDate < checkout;
        }
        return false;
      });
    });

    if (activeRes) {
      return { type: "res", data: activeRes };
    }

    return null;
  };

  // Open detail popup
  const handleBlockClick = (e, block) => {
    e.stopPropagation();
    setSelectedBlock(block);
    setIsDetailModalOpen(true);
  };

  // Grid Empty cell click (create check-in or reservation)
  const handleEmptyCellClick = (room, dayNum) => {
    const selectedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    Swal.fire({
      title: `Empty Slot - Room ${room.roomNumber}`,
      text: `Would you like to record an entry starting on ${selectedDate}?`,
      icon: "info",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Walk-In Check-In",
      denyButtonText: "Pre-Booking Reservation",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
      denyButtonColor: "#3b82f6"
    }).then((result) => {
      if (result.isConfirmed) {
        // Redirect to check-in with pre-filled room details query
        router.push(`/dashboard/check-in?roomId=${room._id}&date=${selectedDate}`);
      } else if (result.isDenied) {
        // Redirect to reservations
        router.push(`/dashboard/reservations?roomId=${room._id}&date=${selectedDate}`);
      }
    });
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="Front Desk Timeline"
        subtitle="Visual room allocation ledger calendar. Check reservations and active stayed guests."
      />

      {/* Month Navigation & Action Controls */}
      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="btn btn-sm btn-circle btn-ghost text-brand-primary">
            <FiChevronLeft size={20} />
          </button>
          <span className="font-extrabold text-base uppercase tracking-wider text-brand-primary min-w-[150px] text-center">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button onClick={handleNextMonth} className="btn btn-sm btn-circle btn-ghost text-brand-primary">
            <FiChevronRight size={20} />
          </button>
          <button onClick={handleToday} className="btn btn-xs btn-outline border-brand-primary text-brand-primary rounded-full px-4 ml-4">
            Today
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 mr-4">
            <span className="w-3.5 h-3.5 rounded bg-blue-100 dark:bg-blue-900 border border-blue-300 block"></span>
            <span className="font-bold text-brand-sage">Reservation</span>
            <span className="w-3.5 h-3.5 rounded bg-green-100 dark:bg-green-900 border border-green-300 block ml-3"></span>
            <span className="font-bold text-brand-sage">In House</span>
          </div>

          <button onClick={() => router.push("/dashboard/reservations?create=true")} className="btn bg-blue-600 hover:bg-blue-700 text-white border-none btn-sm rounded-full shadow gap-2 px-5 mr-2">
            <FiPlus />
            <span className="uppercase tracking-widest text-[10px] font-bold">New Reservation</span>
          </button>

          <button onClick={() => router.push("/dashboard/check-in")} className="btn bg-brand-primary hover:bg-brand-secondary text-white border-none btn-sm rounded-full shadow gap-2 px-5">
            <FiPlus />
            <span className="uppercase tracking-widest text-[10px] font-bold">Add Booking</span>
          </button>
        </div>
      </div>

      {/* Timeline Grid Table Container */}
      <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <MtableLoading />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-fixed border-collapse w-full min-w-[1000px]">
              <thead className="bg-brand-primary text-white text-[9px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="w-[180px] p-3 text-left sticky left-0 bg-brand-primary border-r border-white/10 z-10">Rooms</th>
                  {daysArray.map(day => {
                    const isToday = isCurrentMonth && day === todayDay;
                    return (
                      <th
                        key={day}
                        className={`p-2 text-center border-r border-white/10 w-[45px] ${isToday ? "bg-brand-secondary/90" : ""}`}
                      >
                        <div>{getDayName(day)}</div>
                        <div className="text-xs font-black">{String(day).padStart(2, "0")}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.keys(roomsByType).length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="text-center py-20 text-brand-sage text-xs uppercase tracking-widest font-bold">
                      No rooms configured.
                    </td>
                  </tr>
                ) : (
                  Object.keys(roomsByType).map(roomTypeName => (
                    <React.Fragment key={roomTypeName}>
                      {/* Room Type Divider Header Row */}
                      <tr className="bg-brand-offwhite/40 dark:bg-brand-charcoal/45">
                        <td colSpan={daysInMonth + 1} className="p-3 text-[10px] font-black uppercase tracking-widest text-brand-primary border-b border-brand-beige/25 sticky left-0">
                          ✦ {roomTypeName}
                        </td>
                      </tr>
                      {/* Rooms in Type */}
                      {roomsByType[roomTypeName].map(room => (
                        <tr key={room._id} className="border-b border-brand-beige/10 hover:bg-brand-offwhite/10 transition-colors">
                          {/* Room identifier sticky column */}
                          <td className="p-3 font-bold text-sm bg-white dark:bg-brand-charcoal sticky left-0 border-r border-brand-beige/15 shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10">
                            <div>{room.roomNumber}</div>
                            <div className="text-[9px] font-normal text-brand-sage uppercase">{room.status}</div>
                          </td>

                          {/* Dynamic calendar cells layout */}
                          {(() => {
                            const cells = [];
                            let d = 1;
                            while (d <= daysInMonth) {
                              const block = getBookingAtCell(room._id, d);

                              if (block) {
                                // Calculate date span boundaries within current month
                                const checkin = new Date(block.data.checkInDate);
                                const checkout = block.type === "stay"
                                  ? (block.data.actualCheckOutDate ? new Date(block.data.actualCheckOutDate) : new Date(block.data.expectedCheckOutDate))
                                  : new Date(block.data.checkOutDate);

                                const startDay = checkin.getMonth() === month && checkin.getFullYear() === year
                                  ? checkin.getDate()
                                  : 1;

                                const endDay = checkout.getMonth() === month && checkout.getFullYear() === year
                                  ? checkout.getDate()
                                  : daysInMonth + 1;

                                // Colspan is length in columns
                                const span = Math.max(1, endDay - startDay);
                                const remainingSpan = Math.min(span - (d - startDay), daysInMonth - d + 1);

                                // Style definitions
                                const isStay = block.type === "stay";
                                const bgStyle = isStay
                                  ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800"
                                  : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800";

                                cells.push(
                                  <td
                                    key={`block-${room._id}-${d}`}
                                    colSpan={remainingSpan}
                                    className="p-1 border-r border-brand-beige/10 align-middle"
                                    onClick={(e) => handleBlockClick(e, block)}
                                  >
                                    <div className={`p-1.5 rounded-lg border text-[10px] font-bold truncate cursor-pointer shadow-sm hover:brightness-95 transition-all text-center uppercase tracking-wider ${bgStyle}`}>
                                      {isStay ? "Stay" : "Res"}: {block.data.customer?.fullName || "Guest"}
                                    </div>
                                  </td>
                                );

                                d += remainingSpan; // skip days filled by this span
                              } else {
                                const dayVal = d;
                                const isToday = isCurrentMonth && dayVal === todayDay;
                                cells.push(
                                  <td
                                    key={`cell-${room._id}-${dayVal}`}
                                    className={`p-2 border-r border-brand-beige/10 text-center align-middle hover:bg-brand-primary/10 cursor-pointer ${isToday ? "bg-brand-secondary/15" : ""}`}
                                    onClick={() => handleEmptyCellClick(room, dayVal)}
                                  >
                                    <div className="w-2.5 h-2.5 rounded bg-gray-200 dark:bg-brand-charcoal/30 mx-auto hover:scale-125 transition-transform"></div>
                                  </td>
                                );
                                d++;
                              }
                            }
                            return cells;
                          })()}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Block details popup modal */}
      {isDetailModalOpen && selectedBlock && (
        <dialog className="modal modal-open bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-sm rounded-2xl border border-brand-beige/20 animate-scale-in">
            <div className="p-6 border-b border-brand-beige bg-brand-offwhite">
              <span className="font-bold text-sm uppercase tracking-widest block">
                {selectedBlock.type === "stay" ? "Active Stay Record" : "Pre-Booking Reservation"}
              </span>
              <span className="text-[10px] font-mono text-brand-sage uppercase font-bold">
                {selectedBlock.type === "stay" ? selectedBlock.data.stayNo : selectedBlock.data.reservationNo}
              </span>
            </div>

            <div className="p-6 space-y-4 text-xs font-bold text-brand-sage">
              <div className="flex items-center gap-3">
                <FiUser className="text-brand-primary text-base" />
                <div>
                  <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Guest Name</span>
                  <span className="text-brand-charcoal dark:text-brand-offwhite text-sm">{selectedBlock.data.customer?.fullName}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FiHome className="text-brand-primary text-base" />
                <div>
                  <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Assigned Room(s)</span>
                  <span className="text-brand-charcoal dark:text-brand-offwhite uppercase">
                    {selectedBlock.type === "stay"
                      ? selectedBlock.data.rooms?.map(r => r.room?.roomNumber).join(", ")
                      : selectedBlock.data.rooms?.map(r => r.roomType).join(", ")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FiCalendar className="text-brand-primary text-base" />
                <div>
                  <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Timeline Dates</span>
                  <span className="text-brand-charcoal dark:text-brand-offwhite">
                    {new Date(selectedBlock.data.checkInDate).toLocaleDateString()} →{" "}
                    {new Date(
                      selectedBlock.type === "stay"
                        ? selectedBlock.data.expectedCheckOutDate
                        : selectedBlock.data.checkOutDate
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FiCheckCircle className="text-brand-primary text-base" />
                <div>
                  <span className="text-[10px] block text-brand-sage/65 uppercase tracking-wider">Billing Status</span>
                  <span className="text-brand-charcoal dark:text-brand-offwhite">{selectedBlock.data.status}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-brand-beige/35">
                <button onClick={() => setIsDetailModalOpen(false)} className="btn btn-ghost btn-xs h-9 uppercase font-bold tracking-widest rounded-lg">Close</button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    if (selectedBlock.type === "stay") {
                      router.push("/dashboard/stays");
                    } else {
                      router.push("/dashboard/reservations");
                    }
                  }}
                  className="btn bg-brand-primary text-white border-none btn-xs h-9 uppercase font-bold tracking-widest rounded-lg px-6"
                >
                  Manage
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default FrontDeskTimelinePage;
