"use client";

import React, { useState, useEffect } from "react";
import { FiAlertCircle, FiCheckCircle, FiTool, FiSlash } from "react-icons/fi";
import Swal from "sweetalert2";
import SectionHeader from "@/components/Comon/SectionHeader";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";

const DailyCheckoutsPage = () => {
  const axiosSecure = useAxiosSecure();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get("/room/pending-update");
      setTasks(response.data || []);
    } catch (error) {
      console.error("Error fetching pending updates:", error);
      Swal.fire("Error", "Failed to load pending updates.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleUpdateStatus = async (roomId, newStatus, roomNumber) => {
    try {
      await axiosSecure.put(`/room/update/${roomId}`, { status: newStatus, roomNumber });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Room updated to ${newStatus}`,
        showConfirmButton: false,
        timer: 1500
      });
      fetchTasks();
    } catch (error) {
      Swal.fire('Error', 'Failed to update room status', 'error');
    }
  };

  const handleProcessCheckout = async (bookingId, roomId) => {
      // A quick shortcut to mark booking as Checked-out
      try {
          await axiosSecure.put(`/booking/update/${bookingId}`, { bookingStatus: "Checked-out" });
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Booking checked out. Room is now in Maintenance.',
            showConfirmButton: false,
            timer: 2000
          });
          fetchTasks();
      } catch (error) {
          Swal.fire('Error', 'Failed to checkout booking', 'error');
      }
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <SectionHeader
        title="Daily Check-outs & Status"
        subtitle="Manage rooms that require cleaning or have pending checkouts today."
      />

      <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 p-6 mt-6">
        {isLoading ? (
          <MtableLoading />
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <FiCheckCircle className="mx-auto text-5xl text-brand-primary mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-brand-charcoal dark:text-brand-offwhite uppercase tracking-widest">All Caught Up!</h3>
            <p className="text-brand-sage text-sm mt-2">There are no rooms pending checkout or maintenance updates.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {tasks.map((task, idx) => (
              <div key={idx} className="flex flex-col md:flex-row justify-between items-center bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border border-brand-beige/50 dark:border-brand-beige/20 p-5 rounded-xl">
                <div className="flex items-start gap-4 mb-4 md:mb-0">
                  <div className={`p-3 rounded-full ${task.reason === 'Maintenance' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {task.reason === 'Maintenance' ? <FiTool size={24} /> : <FiAlertCircle size={24} />}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-brand-primary">Room {task.room.roomNumber} <span className="text-sm font-normal text-brand-sage">({task.room.roomType})</span></h4>
                    <p className="text-sm font-semibold text-brand-charcoal dark:text-brand-offwhite mt-1 uppercase tracking-wider">{task.reason}</p>
                    <p className="text-xs text-brand-sage mt-1">{task.message}</p>
                    
                    {task.booking && (
                      <div className="mt-3 p-3 bg-white dark:bg-brand-charcoal rounded-lg border border-brand-beige/30 text-xs text-brand-sage">
                        <span className="font-bold">Booking Details:</span><br/>
                        Check-in: {new Date(task.booking.checkInDate).toLocaleString()}<br/>
                        Check-out: <span className="text-red-500 font-bold">{new Date(task.booking.checkOutDate).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                  {task.reason === 'Pending Checkout' ? (
                    <button 
                      onClick={() => handleProcessCheckout(task.booking._id, task.room._id)}
                      className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none uppercase tracking-widest text-xs h-10 px-6 shadow-sm"
                    >
                      Process Check-out
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleUpdateStatus(task.room._id, "Available", task.room.roomNumber)}
                        className="btn bg-green-600 text-white hover:bg-green-700 border-none uppercase tracking-widest text-xs h-10 px-6 shadow-sm"
                      >
                        <FiCheckCircle className="mr-1" /> Mark Available
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(task.room._id, "Maintenance", task.room.roomNumber)}
                        className="btn btn-outline border-orange-500 text-orange-500 hover:bg-orange-500 hover:border-orange-500 hover:text-white uppercase tracking-widest text-xs h-10 px-4"
                        disabled={task.room.status === 'Maintenance'}
                      >
                        <FiTool className="mr-1" /> Maintenance
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(task.room._id, "Blocked", task.room.roomNumber)}
                        className="btn btn-outline border-red-500 text-red-500 hover:bg-red-500 hover:border-red-500 hover:text-white uppercase tracking-widest text-xs h-10 px-4"
                      >
                        <FiSlash className="mr-1" /> Blocked
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyCheckoutsPage;
