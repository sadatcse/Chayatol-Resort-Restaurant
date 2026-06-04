"use client";

import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  FiEdit, FiTrash2, FiX, FiUsers, FiUserCheck, FiStar,
  FiPhone, FiMapPin, FiBriefcase, FiSearch, FiPlus
} from "react-icons/fi";
import Swal from "sweetalert2";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import ImageUpload from "@/components/Comon/ImageUpload";
import Preloader from "@/components/Comon/Preloader";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import { AuthContext } from "@/providers/AuthProvider";

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

  const [users, setUsers] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageLoading, setPageLoading] = useState(true);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      setPageLoading(true);
      try {
        const [usersResponse, rolesResponse, deptsResponse] = await Promise.all([
          axiosSecure.get("/user"),
          axiosSecure.get("/userrole"),
          axiosSecure.get("/department")
        ]);
        setUsers(usersResponse.data);
        setUserRoles(rolesResponse.data);
        setDepartments(deptsResponse.data);
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

  const uniqueRoles = useMemo(() => {
    const roles = Array.from(new Set(users.map(u => u.role).filter(Boolean)));
    return ["all", ...roles];
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesRole = selectedRoleFilter === "all" || user.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, debouncedSearchTerm, selectedRoleFilter]);

  const assignableRoles = useMemo(() => {
    const allRoles = userRoles.map(role => role.userrole);
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
        text: error.response?.data?.message || "Failed to update staff record.",
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = (id) => {
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

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedData = useMemo(() => {
    return filteredUsers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredUsers, currentPage, itemsPerPage]);

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite font-sans text-brand-charcoal animate-scale-in">

      {/* Header & Inline Search */}
      <SectionHeader 
        title="Resort Staff Directory" 
        subtitle="Manage resort personnel, roles, and access across all departments."
      >
        <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white rounded-full px-5 shadow-sm border-brand-beige w-full md:w-80 h-12">
          <FiSearch className="text-brand-sage text-lg" />
          <input
            type="text"
            className="grow placeholder-brand-sage text-brand-charcoal"
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
      <div className="stats shadow-sm bg-white w-full mb-8 border border-brand-beige rounded-2xl overflow-hidden hidden md:flex">
        <div className="stat place-items-center py-6">
          <div className="stat-figure text-brand-primary bg-brand-primary/10 p-4 rounded-full">
            <FiUsers className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Total Personnel</div>
          <div className="stat-value text-brand-black text-4xl mt-1">{users.length}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige">
          <div className="stat-figure text-secondary bg-secondary/10 p-4 rounded-full">
            <FiUserCheck className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">On Duty / Active</div>
          <div className="stat-value text-brand-black text-4xl mt-1">{users.filter(u => u.status === 'active').length}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige">
          <div className="stat-figure text-brand-bronze bg-brand-bronze/10 p-4 rounded-full">
            <FiStar className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Management</div>
          <div className="stat-value text-brand-black text-4xl mt-1">{users.filter(u => u.role === 'admin' || u.role === 'superadmin').length}</div>
        </div>
      </div>

      {/* Filter Tabs & Add Button */}
      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-brand-beige mb-6 gap-4">
        <div className="flex flex-wrap gap-2">
          {uniqueRoles.map((role) => (
            <button
              key={role}
              onClick={() => {
                setSelectedRoleFilter(role);
                setCurrentPage(1);
              }}
              className={`btn btn-sm rounded-full border-none transition-colors px-6 ${selectedRoleFilter === role
                ? "bg-brand-primary text-white hover:bg-secondary shadow-md"
                : "bg-brand-offwhite text-brand-charcoal hover:bg-brand-beige"
                }`}
            >
              {role === "all" ? "All Departments" : role}
            </button>
          ))}
        </div>

        {assignableRoles.length > 0 && (
          <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md text-white hover:bg-secondary border-none gap-2 px-6 h-10">
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
            className="select select-bordered select-xs bg-white text-brand-charcoal rounded-md border-brand-beige focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-8 px-2"
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
        <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-brand-offwhite text-brand-charcoal font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige">
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
                    <td colSpan="6" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-brand-offwhite rounded-full">
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
                      <tr key={user._id} className="hover:bg-brand-offwhite/50 transition-colors border-b border-brand-beige last:border-none bg-white">
                        <td className="pl-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className="avatar">
                              <div className="w-12 h-12 rounded-full ring-2 ring-brand-primary ring-offset-2 ring-offset-white bg-brand-offwhite flex items-center justify-center text-brand-primary font-bold text-lg shadow-sm">
                                {user.photo ? (
                                  <img src={user.photo} alt={user.name} />
                                ) : (
                                  <span>{user.name.substring(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="font-bold text-brand-black text-sm uppercase tracking-wide">{user.name}</div>
                              <div className="text-xs text-brand-sage mt-1">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4">
                          <div className="flex items-center gap-2.5 text-xs font-semibold text-brand-dark-grey capitalize">
                            <div className="p-2 bg-brand-offwhite rounded-lg text-brand-primary"><FiBriefcase size={14} /></div>
                            {user.role}
                          </div>
                        </td>

                        <td className="py-4">
                          <div className="flex items-center gap-2.5 text-xs font-semibold text-brand-dark-grey capitalize">
                            <div className="p-2 bg-brand-offwhite rounded-lg text-brand-bronze"><FiMapPin size={14} /></div>
                            {user.department || "Operations"}
                          </div>
                        </td>

                        <td className="py-4 font-mono text-xs font-medium text-brand-dark-grey">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-brand-offwhite rounded-lg text-secondary"><FiPhone size={14} /></div>
                            {user.mobileNumber || "N/A"}
                          </div>
                        </td>

                        <td className="py-4">
                          <div className={`badge badge-sm font-bold uppercase tracking-widest border-none px-3 py-2 ${user.status === 'active' ? 'bg-[#E6F4EA] text-[#1E8E3E]' : 'bg-[#FCE8E6] text-[#D93025]'}`}>
                            {user.status}
                          </div>
                        </td>

                        <td className="pr-8 py-4">
                          <div className="flex justify-center items-center gap-2">
                            {canPerformAction ? (
                              <>
                                <button onClick={() => openModal(user)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors" title="Edit Personnel">
                                  <FiEdit size={16} />
                                </button>
                                <button onClick={() => handleRemove(user._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete Personnel">
                                  <FiTrash2 size={16} />
                                </button>
                              </>
                            ) : (
                              <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite">Restricted</div>
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
          <div className="p-5 border-t border-brand-beige bg-brand-offwhite/30 flex justify-center">
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
          <div className="modal-box bg-white p-0 overflow-hidden max-w-xl rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige bg-brand-offwhite">
              <h3 className="font-bold text-lg text-brand-black uppercase tracking-widest">{editId ? 'Update Personnel Record' : 'Register New Personnel'}</h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal hover:bg-brand-beige">
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
                  className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white text-brand-charcoal focus:outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Corporate Email</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white text-brand-charcoal focus:outline-none"
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
                    className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white text-brand-charcoal focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div className="p-6 bg-brand-offwhite rounded-2xl border border-brand-beige">
                {formData.photo && (
                  <div className="flex justify-center mb-6">
                    <div className="avatar">
                      <div className="w-24 rounded-full ring-4 ring-brand-primary ring-offset-4 ring-offset-white shadow-lg">
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
                    className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white text-brand-charcoal capitalize focus:outline-none"
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
                    className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white text-brand-charcoal capitalize focus:outline-none"
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
                    className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white text-brand-charcoal focus:outline-none font-mono"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Duty Status</span></label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white text-brand-charcoal font-bold focus:outline-none"
                  >
                    <option value="active">Active Duty</option>
                    <option value="inactive">Off Duty / Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige bg-brand-offwhite">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige text-brand-charcoal font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
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
    </div>
  );
};

export default ResortStaff;