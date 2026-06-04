"use client";

import React, { useState, useEffect, useContext, useCallback } from "react";
import { FiTrash2, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import Mtitle from "@/components/Comon/Mtitle";
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
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal/30">
      <Mtitle title="User Access Logs" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="card bg-brand-white dark:bg-brand-charcoal border border-brand-beige/50 dark:border-brand-dark-grey/50 shadow-xl mt-6 rounded-2xl overflow-hidden"
      >
        <div className="card-body p-4 sm:p-6">
          {isLoading ? <MtableLoading /> : (
            <div className="overflow-x-auto">
              <table className="table w-full border-collapse">
                <thead>
                  <tr className="bg-brand-primary text-brand-white uppercase text-xs text-left">
                    {["#", "User Email", "Username", "Role", "Login Time", "Logout Time", "Actions"].map((h, i) => (
                      <th key={h} className={`p-3 ${i === 0 && "rounded-tl-xl"} ${i === 6 && "rounded-tr-xl text-center"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {userLogs.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12 text-brand-dark-grey dark:text-brand-sage font-medium">
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
                          className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-dark-grey/20 border-b border-brand-beige/20 dark:border-brand-dark-grey/25 last:border-0 text-sm text-brand-charcoal dark:text-brand-offwhite"
                        >
                          <td className="p-3">{(currentPage - 1) * 10 + index + 1}</td>
                          <td className="p-3">{log.userEmail}</td>
                          <td className="p-3">{log.username}</td>
                          <td className="p-3 capitalize">{log.role}</td>
                          <td className="p-3">{log.loginTime ? new Date(log.loginTime).toLocaleString() : "N/A"}</td>
                          <td className="p-3">{log.logoutTime ? new Date(log.logoutTime).toLocaleString() : "N/A"}</td>
                          <td className="p-3 text-center">
                            {(user?.role === "admin" || user?.role === "superadmin") ? (
                              <motion.button 
                                whileHover={{ scale: 1.1 }} 
                                whileTap={{ scale: 0.9 }} 
                                onClick={() => handleDelete(log._id)} 
                                className="btn btn-circle btn-sm bg-brand-bronze hover:bg-brand-secondary text-brand-white border-none shadow-sm cursor-pointer" 
                                title="Delete Log"
                              >
                                <FiTrash2 />
                              </motion.button>
                            ) : (
                              <span className="text-brand-sage/60">-</span>
                            )}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>

              <div className="flex justify-center mt-6">
                <div className="join gap-1.5 flex items-center">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1} 
                    className="join-item btn btn-sm bg-brand-white dark:bg-brand-dark-grey text-brand-charcoal dark:text-brand-offwhite border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-xl hover:bg-brand-offwhite disabled:opacity-50 cursor-pointer"
                  >
                    <FiChevronLeft />
                  </button>
                  <button className="join-item btn btn-sm bg-brand-primary text-brand-white hover:bg-brand-secondary border-none rounded-xl font-bold cursor-default">
                    Page {currentPage} of {totalPages}
                  </button>
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages} 
                    className="join-item btn btn-sm bg-brand-white dark:bg-brand-dark-grey text-brand-charcoal dark:text-brand-offwhite border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-xl hover:bg-brand-offwhite disabled:opacity-50 cursor-pointer"
                  >
                    <FiChevronRight />
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
