"use client";

import React, { useState, useEffect, useContext, useCallback } from "react";
import { FiTrash2, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import SectionHeader from "@/components/Comon/SectionHeader";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import MtableLoading from "@/components/Comon/MtableLoading";
import useGetRoles from "@/hooks/useGetRoles";
import useDepartments from "@/hooks/useDepartments";
import usePagePermission from "@/hooks/usePagePermission";

const UserAccess = () => {
  const [userLogs, setUserLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const roles = useGetRoles();
  const { departments } = useDepartments(1, 100);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const { canDelete } = usePagePermission();
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserLogs = useCallback(async (page, role = selectedRoleFilter, department = selectedDeptFilter) => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(`/userlog/paginated?page=${page}&limit=10&role=${role}&department=${department}`);
      const { logs, totalPages } = response.data;
      setUserLogs(logs || []);
      setTotalPages(totalPages || 1);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching user logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, selectedRoleFilter, selectedDeptFilter]);

  useEffect(() => {
    fetchUserLogs(currentPage);
  }, [fetchUserLogs, currentPage]);

  const handleRoleFilterChange = (e) => {
    const nextRole = e.target.value;
    setSelectedRoleFilter(nextRole);
    setCurrentPage(1);
    fetchUserLogs(1, nextRole, selectedDeptFilter);
  };

  const handleDeptFilterChange = (e) => {
    const nextDept = e.target.value;
    setSelectedDeptFilter(nextDept);
    setCurrentPage(1);
    fetchUserLogs(1, selectedRoleFilter, nextDept);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id) => {
    if (!canDelete) {
      Swal.fire({
        title: "Access Denied!",
        text: "You do not have permission to delete user logs.",
        icon: "error",
        confirmButtonColor: "#8C5A35",
        confirmButtonText: "OK",
      });
      return;
    }
    if (isDeleting) return;

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
        setIsDeleting(true);
        try {
          await axiosSecure.delete(`/userlog/delete/${id}`);
          Swal.fire("Deleted!", "The user log has been deleted.", "success");
          fetchUserLogs(currentPage);
        } catch (error) {
          console.error("Error deleting user log:", error);
          Swal.fire("Error!", "Failed to delete the user log.", "error");
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="User Access Logs"
        subtitle="Monitor system logins, user activity, and maintain security trails."
      >
        <div className="flex flex-row items-center gap-3">
          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={handleRoleFilterChange}
            className="select select-sm select-bordered rounded-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none h-10 px-4 w-auto min-w-[150px] capitalize font-semibold text-xs tracking-wide cursor-pointer"
          >
            <option value="all">All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={handleDeptFilterChange}
            className="select select-sm select-bordered rounded-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none h-10 px-4 w-auto min-w-[170px] capitalize font-semibold text-xs tracking-wide cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept.department}>
                {dept.department}
              </option>
            ))}
          </select>
        </div>
      </SectionHeader>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden mt-6"
      >
        <div className="p-0">
          {isLoading ? (
            <div className="p-6">
              <MtableLoading />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige dark:border-brand-beige/20">
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
                        <td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
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
                          className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm"
                        >
                          <td className="pl-8 py-4 font-bold text-brand-sage">{(currentPage - 1) * 10 + index + 1}</td>
                          <td className="py-4 font-medium">{log.userEmail}</td>
                          <td className="py-4 uppercase tracking-wide text-xs font-bold">{log.username}</td>
                          <td className="py-4">
                            <span className="bg-brand-offwhite dark:bg-brand-offwhite/5 text-brand-primary px-3 py-1.5 rounded-lg text-xs font-bold capitalize">
                              {log.role}
                            </span>
                          </td>
                          <td className="py-4 font-mono text-xs text-brand-dark-grey dark:text-brand-offwhite/70">{log.loginTime ? new Date(log.loginTime).toLocaleString() : "N/A"}</td>
                          <td className="py-4 font-mono text-xs text-brand-dark-grey dark:text-brand-offwhite/70">{log.logoutTime ? new Date(log.logoutTime).toLocaleString() : "N/A"}</td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center">
                              {canDelete ? (
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
                                <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite dark:bg-brand-offwhite/5 border-none">Restricted</div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>

              <div className="p-5 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/30 dark:bg-brand-charcoal/10 flex justify-center mt-auto">
                <div className="join gap-2 flex items-center">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn btn-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-offwhite dark:hover:bg-brand-offwhite/10 border border-brand-beige dark:border-brand-beige/20 rounded-xl disabled:opacity-40 cursor-pointer px-4"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button className="btn btn-sm bg-brand-primary text-white hover:bg-brand-secondary border-none rounded-xl font-bold cursor-default px-6 tracking-wider text-xs uppercase">
                    Page {currentPage} of {totalPages}
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn btn-sm bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-offwhite dark:hover:bg-brand-offwhite/10 border border-brand-beige dark:border-brand-beige/20 rounded-xl disabled:opacity-40 cursor-pointer px-4"
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
