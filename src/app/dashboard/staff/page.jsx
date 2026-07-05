"use client";

import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  FiEdit, FiTrash2, FiX, FiUsers, FiUserCheck, FiStar,
  FiPhone, FiMapPin, FiBriefcase, FiSearch, FiPlus, FiKey
} from "react-icons/fi";
import Swal from "sweetalert2";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import ImageUpload from "@/components/Comon/ImageUpload";
import Preloader from "@/components/Comon/Preloader";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useGetRoles from "@/hooks/useGetRoles";
import useDepartments from "@/hooks/useDepartments";
import { AuthContext } from "@/providers/AuthProvider";
import usePagePermission from "@/hooks/usePagePermission";

const INITIAL_FORM_DATA = {
  email: "",
  name: "",
  role: "",
  status: "active",
  photo: "",
  password: "",
  mobileNumber: "",
  department: ""
};

const ResortStaff = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const userRoles = useGetRoles();
  const { departments } = useDepartments(1, 100);
  const { canAdd, canEdit, canDelete } = usePagePermission();

  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageLoading, setPageLoading] = useState(true);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      setPageLoading(true);
      try {
        const usersResponse = await axiosSecure.get("/user");
        setUsers(usersResponse.data);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        Swal.fire({
          title: "Connection Error",
          text: "Could not fetch resort data.",
          icon: "error",
          confirmButtonColor: "#346E36"
        });
      } finally {
        setPageLoading(false);
      }
    };
    loadData();
  }, [axiosSecure]);

  const availableRolesForFilter = useMemo(() => {
    const rolesFromDb = userRoles.filter(Boolean);
    if (rolesFromDb.length > 0) return rolesFromDb;
    return Array.from(new Set(users.map((u) => u.role).filter(Boolean)));
  }, [userRoles, users]);

  const availableDeptsForFilter = useMemo(() => {
    const deptsFromDb = departments.map((d) => d.department).filter(Boolean);
    if (deptsFromDb.length > 0) return deptsFromDb;
    return Array.from(new Set(users.map((u) => u.department).filter(Boolean)));
  }, [departments, users]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesRole = selectedRoleFilter === "all" || (user.role && user.role.toLowerCase() === selectedRoleFilter.toLowerCase());
      const userDept = user.department || "Operations";
      const matchesDept = selectedDeptFilter === "all" || userDept.toLowerCase() === selectedDeptFilter.toLowerCase();
      return matchesSearch && matchesRole && matchesDept;
    });
  }, [users, debouncedSearchTerm, selectedRoleFilter, selectedDeptFilter]);

  const assignableRoles = useMemo(() => {
    const allRoles = userRoles;
    if (currentUser?.role === "admin" || currentUser?.role === "superadmin") {
      return allRoles;
    }
    if (currentUser?.role === "manager") {
      return allRoles.filter(role => role !== "admin" && role !== "superadmin");
    }
    return [];
  }, [currentUser?.role, userRoles]);

  const openModal = (userToEdit = null) => {
    if (userToEdit) {
      setEditId(userToEdit._id);
      setFormData({ ...INITIAL_FORM_DATA, ...userToEdit });
    } else {
      setEditId(null);
      setFormData({
        ...INITIAL_FORM_DATA,
        role: assignableRoles.length > 0 ? assignableRoles[0] : "",
        department: departments.length > 0 ? departments[0].department : ""
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
  };

  const refetchUsers = async () => {
    try {
      const response = await axiosSecure.get("/user");
      setUsers(response.data);
    } catch (error) {
      console.error("Error re-fetching staff:", error);
    }
  };

  const handleAddOrEditUser = async () => {
    if (editId) {
      if (!canEdit) {
        Swal.fire("Restricted", "You do not have permission to edit staff profiles.", "warning");
        return;
      }
    } else {
      if (!canAdd) {
        Swal.fire("Restricted", "You do not have permission to register new staff.", "warning");
        return;
      }
    }
    setIsSubmitting(true);
    try {
      if (editId) {
        await axiosSecure.put(`/user/update/${editId}`, formData);
      } else {
        await axiosSecure.post("/user/post", formData);
      }
      await refetchUsers();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Staff profile has been successfully ${editId ? "updated" : "created"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.error || error.response?.data?.message || `Failed to ${editId ? "update" : "create"} staff record.`,
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = (id) => {
    if (!canDelete) {
      Swal.fire("Restricted", "You do not have permission to delete staff profiles.", "warning");
      return;
    }
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/user/delete/${id}`);
          await refetchUsers();
          Swal.fire({
            title: "Deleted!",
            text: "Staff profile deleted.",
            icon: "success",
            confirmButtonColor: "#346E36",
          });
        } catch (error) {
          Swal.fire("Error!", "Failed to delete user.", "error");
        }
      }
    });
  };

  const handleImageUpload = (url) => {
    setFormData((prev) => ({ ...prev, photo: url }));
  };

  const openPasswordModal = (user) => {
    setPasswordTargetUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordTargetUser(null);
  };

  const handleChangePassword = async () => {
    if (!canEdit) {
      Swal.fire("Restricted", "You do not have permission to modify passwords.", "warning");
      return;
    }
    if (!newPassword.trim()) {
      Swal.fire({
        title: "Validation Error",
        text: "Please enter a new password.",
        icon: "warning",
        confirmButtonColor: "#346E36",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Swal.fire({
        title: "Validation Error",
        text: "Passwords do not match.",
        icon: "warning",
        confirmButtonColor: "#346E36",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await axiosSecure.put(`/user/update/${passwordTargetUser._id}`, {
        password: newPassword,
      });
      closePasswordModal();
      Swal.fire({
        title: "Success",
        text: `Password for ${passwordTargetUser.name} has been successfully updated.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to update password.",
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedData = useMemo(() => {
    return filteredUsers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredUsers, currentPage, itemsPerPage]);

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      {/* Header & Inline Search */}
      <SectionHeader 
        title="Staff Manager" 
        subtitle="Manage staff, roles, and access across all departments."
      >
        <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-80 h-12">
          <FiSearch className="text-brand-sage text-lg" />
          <input
            type="text"
            className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite"
            placeholder="Search personnel..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </label>
      </SectionHeader>

      {/* Stats Block */}
      <div className="stats shadow-sm bg-white dark:bg-brand-charcoal w-full mb-8 border border-brand-beige dark:border-brand-beige/20 rounded-2xl overflow-hidden hidden md:flex">
        <div className="stat place-items-center py-6">
          <div className="stat-figure text-brand-primary bg-brand-primary/10 p-4 rounded-full">
            <FiUsers className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Total Personnel</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-4xl mt-1">{users.length}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-secondary bg-secondary/10 p-4 rounded-full">
            <FiUserCheck className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">On Duty / Active</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-4xl mt-1">{users.filter(u => u.status === 'active').length}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-brand-bronze bg-brand-bronze/10 p-4 rounded-full">
            <FiStar className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Management</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-4xl mt-1">{users.filter(u => u.role === 'admin' || u.role === 'superadmin').length}</div>
        </div>
      </div>

      {/* Filter Tabs & Add Button */}
      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
        <div className="flex flex-row items-center gap-3">
          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => {
              setSelectedRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select select-sm select-bordered rounded-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none h-10 px-4 w-auto min-w-[150px] capitalize font-semibold text-xs tracking-wide cursor-pointer"
          >
            <option value="all">All Roles</option>
            {availableRolesForFilter.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => {
              setSelectedDeptFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select select-sm select-bordered rounded-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none h-10 px-4 w-auto min-w-[170px] capitalize font-semibold text-xs tracking-wide cursor-pointer"
          >
            <option value="all">All Departments</option>
            {availableDeptsForFilter.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {canAdd && assignableRoles.length > 0 && (
          <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md text-white hover:bg-secondary border-none gap-2 px-6 h-10 cursor-pointer">
            <FiPlus className="text-lg" />
            <span className="uppercase tracking-widest text-xs font-bold">New Personnel</span>
          </button>
        )}
      </div>

      {/* Display / Total Bar */}
      <div className="flex justify-between items-center text-xs font-bold text-brand-sage uppercase tracking-widest mb-4 px-2">
        <div className="flex items-center gap-3">
          <span>Display</span>
          <select
            value={itemsPerPage}
            className="select select-bordered select-xs bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite rounded-md border-brand-beige dark:border-brand-beige/20 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-8 px-2"
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="50">50</option>
          </select>
        </div>
        <span>Total Records: {totalItems}</span>
      </div>

      {/* Table Section */}
      {isPageLoading ? (
        <Preloader />
      ) : (
        <div className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige dark:border-brand-beige/20">
                <tr>
                  <th className="pl-8 py-5">Staff Member</th>
                  <th className="py-5">System Role</th>
                  <th className="py-5">Department</th>
                  <th className="py-5">Contact</th>
                  <th className="py-5">Status</th>
                  <th className="pr-8 text-center py-5">Manage</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-brand-offwhite dark:bg-brand-offwhite/5 rounded-full">
                          <FiUsers className="w-12 h-12 text-brand-sage opacity-50" />
                        </div>
                        No personnel found in this criteria.
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((user) => {
                    let canPerformAction = false;
                    if (currentUser?._id !== user._id) {
                      if (currentUser?.role === "admin" || currentUser?.role === "superadmin") {
                        canPerformAction = true;
                      } else if (currentUser?.role === "manager" && user.role !== "admin" && user.role !== "superadmin") {
                        canPerformAction = true;
                      }
                    }

                    return (
                      <tr key={user._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm">
                        <td className="pl-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className="avatar">
                              <div className="w-12 h-12 rounded-full ring-2 ring-brand-primary ring-offset-2 ring-offset-white dark:ring-offset-brand-charcoal bg-brand-offwhite dark:bg-brand-offwhite/5 flex items-center justify-center text-brand-primary font-bold text-lg shadow-sm">
                                {user.photo ? (
                                  <img src={user.photo} alt={user.name} />
                                ) : (
                                  <span>{user.name.substring(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="font-bold text-brand-black dark:text-brand-offwhite text-sm uppercase tracking-wide">{user.name}</div>
                              <div className="text-xs text-brand-sage mt-1">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4">
                          <div className="flex items-center gap-2.5 text-xs font-semibold text-brand-dark-grey dark:text-brand-offwhite/70 capitalize">
                            <div className="p-2 bg-brand-offwhite dark:bg-brand-offwhite/5 rounded-lg text-brand-primary"><FiBriefcase size={14} /></div>
                            {user.role}
                          </div>
                        </td>

                        <td className="py-4">
                          <div className="flex items-center gap-2.5 text-xs font-semibold text-brand-dark-grey dark:text-brand-offwhite/70 capitalize">
                            <div className="p-2 bg-brand-offwhite dark:bg-brand-offwhite/5 rounded-lg text-brand-bronze"><FiMapPin size={14} /></div>
                            {user.department || "Operations"}
                          </div>
                        </td>

                        <td className="py-4 font-mono text-xs font-medium text-brand-dark-grey dark:text-brand-offwhite/70">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-brand-offwhite dark:bg-brand-offwhite/5 rounded-lg text-secondary"><FiPhone size={14} /></div>
                            {user.mobileNumber || "N/A"}
                          </div>
                        </td>

                        <td className="py-4">
                          <div className={`badge badge-sm font-bold uppercase tracking-widest border-none px-3 py-2 ${user.status === 'active' ? 'bg-[#E6F4EA] text-[#1E8E3E] dark:bg-[#1E8E3E]/20 dark:text-[#E6F4EA]' : 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#FCE8E6]'}`}>
                            {user.status}
                          </div>
                        </td>

                        <td className="pr-8 py-4">
                          <div className="flex justify-center items-center gap-2">
                            {canPerformAction && (canEdit || canDelete) ? (
                              <>
                                {canEdit && (
                                  <>
                                    <button onClick={() => openModal(user)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors cursor-pointer" title="Edit Personnel">
                                      <FiEdit size={16} />
                                    </button>
                                    <button onClick={() => openPasswordModal(user)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors cursor-pointer" title="Change Password">
                                      <FiKey size={16} />
                                    </button>
                                  </>
                                )}
                                {canDelete && (
                                  <button onClick={() => handleRemove(user._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Delete Personnel">
                                    <FiTrash2 size={16} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite dark:bg-brand-offwhite/5 border-none">Restricted</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-5 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/30 dark:bg-brand-charcoal/10 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>
      )}

      {/* Modal Section */}
      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">{editId ? 'Update Personnel Record' : 'Register New Personnel'}</h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Full Legal Name</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite focus:outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Corporate Email</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite focus:outline-none"
                  placeholder="staff@resort.com"
                />
              </div>

              {!editId && (
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Temporary Password</span></label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div className="p-6 bg-brand-offwhite dark:bg-brand-charcoal/50 rounded-2xl border border-brand-beige dark:border-brand-beige/20">
                {formData.photo && (
                  <div className="flex justify-center mb-6">
                    <div className="avatar">
                      <div className="w-24 rounded-full ring-4 ring-brand-primary ring-offset-4 ring-offset-white dark:ring-offset-brand-charcoal shadow-lg">
                        <img src={formData.photo} alt="ID Preview" />
                      </div>
                    </div>
                  </div>
                )}
                <ImageUpload setImageUrl={handleImageUpload} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">System Role</span></label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite capitalize focus:outline-none"
                  >
                    <option value="" disabled>Select Role</option>
                    {assignableRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Department</span></label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite capitalize focus:outline-none"
                  >
                    <option value="" disabled>Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept.department}>{dept.department}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Contact Number</span></label>
                  <input
                    type="text"
                    value={formData.mobileNumber || ""}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite focus:outline-none font-mono"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Duty Status</span></label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-bold focus:outline-none"
                  >
                    <option value="active">Active Duty</option>
                    <option value="inactive">Off Duty / Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleAddOrEditUser} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none text-white font-bold uppercase tracking-widest text-xs px-8 shadow-md border-none" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processing...
                  </>
                ) : (editId ? 'Save Changes' : 'Register')}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && passwordTargetUser && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-md rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">Change Password</h3>
              <button onClick={closePasswordModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="text-sm text-brand-charcoal dark:text-brand-offwhite/80">
                Change password for staff member: <strong className="text-brand-primary uppercase tracking-wide">{passwordTargetUser.name}</strong> ({passwordTargetUser.email})
              </div>

              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">New Password</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="••••••••"
                />
              </div>

              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Confirm New Password</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closePasswordModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleChangePassword} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none text-white font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processing...
                  </>
                ) : 'Update Password'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closePasswordModal}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default ResortStaff;