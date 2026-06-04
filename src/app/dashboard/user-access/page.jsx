"use client";

import React, { useState, useEffect, useContext, useCallback } from "react";
import { FiTrash2, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import SectionHeader from "@/components/Comon/SectionHeader";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import MtableLoading from "@/components/Comon/MtableLoading"; 

const UserAccess = () => {
  const [userLogs, setUserLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserLogs = useCallback(async (page) => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(`/userlog/paginated?page=${page}&limit=10`);
      const { logs, totalPages } = response.data;
      setUserLogs(logs || []);
      setTotalPages(totalPages || 1);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching user logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure]);

  useEffect(() => {
    fetchUserLogs(currentPage);
  }, [fetchUserLogs, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDelete = async (id) => {
    if (user?.role !== "admin" && user?.role !== "superadmin") {
      Swal.fire({
        title: "Access Denied!",
        text: "You do not have permission to delete user logs.",
        icon: "error",
        confirmButtonColor: "#8C5A35",
        confirmButtonText: "OK",
      });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#8C5A35",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/userlog/delete/${id}`);
          Swal.fire("Deleted!", "The user log has been deleted.", "success");
          fetchUserLogs(currentPage);
        } catch (error) {
          console.error("Error deleting user log:", error);
          Swal.fire("Error!", "Failed to delete the user log.", "error");
        }
      }
    });
  };
    
  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite font-sans text-brand-charcoal animate-scale-in">
      
      <SectionHeader 
        title="User Access Logs" 
        subtitle="Monitor system logins, user activity, and maintain security trails."
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden mt-6"
      >
        <div className="p-0">
          {isLoading ? (
            <div className="p-6">
              <MtableLoading />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-brand-offwhite text-brand-charcoal font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige">
                  <tr>
                    <th className="pl-8 py-5">#</th>
                    <th className="py-5">User Email</th>
                    <th className="py-5">Username</th>
                    <th className="py-5">Role</th>
                    <th className="py-5">Login Time</th>
                    <th className="py-5">Logout Time</th>
                    <th className="pr-8 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {userLogs.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white">
                          No logs found.
                        </td>
                      </tr>
                    ) : (
                      userLogs.map((log, index) => (
                        <motion.tr 
                          key={log._id} 
                          layout 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          exit={{ opacity: 0 }} 
                          className="hover:bg-brand-offwhite/50 transition-colors border-b border-brand-beige last:border-none bg-white text-brand-charcoal text-sm"
                        >
                          <td className="pl-8 py-4 font-bold text-brand-sage">{(currentPage - 1) * 10 + index + 1}</td>
                          <td className="py-4 font-medium">{log.userEmail}</td>
                          <td className="py-4 uppercase tracking-wide text-xs font-bold">{log.username}</td>
                          <td className="py-4">
                            <span className="bg-brand-offwhite text-brand-primary px-3 py-1.5 rounded-lg text-xs font-bold capitalize">
                              {log.role}
                            </span>
                          </td>
                          <td className="py-4 font-mono text-xs">{log.loginTime ? new Date(log.loginTime).toLocaleString() : "N/A"}</td>
                          <td className="py-4 font-mono text-xs">{log.logoutTime ? new Date(log.logoutTime).toLocaleString() : "N/A"}</td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center">
                              {(user?.role === "admin" || user?.role === "superadmin") ? (
                                <motion.button 
                                  whileHover={{ scale: 1.1 }} 
                                  whileTap={{ scale: 0.9 }} 
                                  onClick={() => handleDelete(log._id)} 
                                  className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" 
                                  title="Delete Log"
                                >
                                  <FiTrash2 size={16} />
                                </motion.button>
                              ) : (
                                <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite">Restricted</div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>

              <div className="p-5 border-t border-brand-beige bg-brand-offwhite/30 flex justify-center mt-auto">
                <div className="join gap-2 flex items-center">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1} 
                    className="btn btn-sm bg-white text-brand-charcoal hover:bg-brand-offwhite border border-brand-beige rounded-xl disabled:opacity-40 cursor-pointer px-4"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button className="btn btn-sm bg-brand-primary text-white hover:bg-brand-secondary border-none rounded-xl font-bold cursor-default px-6 tracking-wider text-xs uppercase">
                    Page {currentPage} of {totalPages}
                  </button>
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages} 
                    className="btn btn-sm bg-white text-brand-charcoal hover:bg-brand-offwhite border border-brand-beige rounded-xl disabled:opacity-40 cursor-pointer px-4"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UserAccess;
