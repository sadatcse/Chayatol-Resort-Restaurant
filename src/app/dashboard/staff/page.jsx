"use client";

import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  FiEdit, FiTrash2, FiX, FiUsers, FiUserCheck, FiStar,
  FiPhone, FiMapPin, FiBriefcase
} from "react-icons/fi";
import Swal from "sweetalert2";
import { TfiSearch } from "react-icons/tfi";
import { GoPlus } from "react-icons/go";

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
          confirmButtonColor: "#000000"
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
        confirmButtonColor: "#000000",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to update staff record.",
        icon: "error",
        confirmButtonColor: "#000000",
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
      confirmButtonColor: "#000000",
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
            confirmButtonColor: "#000000",
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
    <div className="p-4 sm:p-8 min-h-screen bg-white font-sans text-gray-800">

      {/* Header & Inline Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Resort Staff Directory</h1>
        <div className="flex items-center gap-2 text-gray-400 focus-within:text-gray-700 transition-colors">
          <TfiSearch className="text-lg" />
          <input
            type="text"
            className="outline-none bg-transparent placeholder-gray-400 text-sm font-medium w-full md:w-64"
            placeholder="Search personnel..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Stats Block (Stacked/Bordered style) */}
      <div className="border border-gray-100 shadow-sm rounded-none mb-10">
        <div className="p-6 border-b border-gray-100 flex items-start gap-4 hover:bg-gray-50 transition-colors">
          <div className="text-emerald-700 mt-1"><FiUsers size={22} /></div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Personnel</p>
            <h3 className="text-2xl font-normal">{users.length}</h3>
          </div>
        </div>
        <div className="p-6 border-b border-gray-100 flex items-start gap-4 hover:bg-gray-50 transition-colors">
          <div className="text-emerald-700 mt-1"><FiUserCheck size={22} /></div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">On Duty / Active</p>
            <h3 className="text-2xl font-normal">{users.filter(u => u.status === 'active').length}</h3>
          </div>
        </div>
        <div className="p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors">
          <div className="text-amber-700 mt-1"><FiStar size={22} /></div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Management</p>
            <h3 className="text-2xl font-normal">{users.filter(u => u.role === 'admin' || u.role === 'superadmin').length}</h3>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Add Button */}
      <div className="flex flex-wrap justify-between items-end border-b border-gray-200 pb-4 mb-4 gap-4">
        <div className="flex gap-2 flex-wrap">
          {uniqueRoles.map((role) => (
            <button
              key={role}
              onClick={() => {
                setSelectedRoleFilter(role);
                setCurrentPage(1);
              }}
              className={`px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest border transition-colors ${selectedRoleFilter === role
                ? "bg-black text-white border-black"
                : "bg-white text-gray-800 border-gray-300 hover:border-gray-800"
                }`}
            >
              {role === "all" ? "All Departments" : role}
            </button>
          ))}
        </div>

        {assignableRoles.length > 0 && (
          <button onClick={() => openModal()} className="flex gap-2 items-center bg-black text-white py-2 px-5 hover:bg-gray-800 transition duration-300">
            <span className="font-bold text-xs tracking-widest uppercase">New Personnel</span>
            <GoPlus className="text-lg" />
          </button>
        )}
      </div>

      {/* Display / Total Bar */}
      <div className="flex justify-between items-center text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
        <label className="flex items-center gap-2">
          Display
          <select
            value={itemsPerPage}
            className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-black text-gray-800 cursor-pointer"
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
          </select>
        </label>
        <span>Total Records: {totalItems}</span>
      </div>

      {/* Table Section */}
      {isPageLoading ? (
        <Preloader />
      ) : (
        <section className="overflow-x-auto bg-white border border-gray-100 shadow-sm mt-4">
          <table className="table w-full border-collapse">
            <thead>
              <tr className="bg-[#F8F7F5] text-[10px] text-gray-500 uppercase tracking-widest font-bold text-left border-b border-gray-200">
                <th className="p-4 pl-6">Staff Member</th>
                <th className="p-4">System Role</th>
                <th className="p-4">Division</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-center">Manage</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400 text-xs font-bold tracking-widest uppercase">
                    No personnel found.
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
                    <tr key={user._id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                            {user.photo ? (
                              <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-400 font-bold text-xs uppercase">{user.name.substring(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm uppercase">{user.name}</p>
                            <p className="text-[11px] text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 capitalize">
                          <FiBriefcase className="text-gray-400" /> {user.role}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 capitalize">
                          <FiMapPin className="text-gray-400" /> {user.department || "Operations"}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-xs font-medium text-gray-700">
                        <span className="inline-flex items-center gap-1.5">
                          <FiPhone className="text-gray-400" /> {user.mobileNumber || "N/A"}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${user.status === 'active' ? 'border-emerald-600 text-emerald-700' : 'border-red-600 text-red-700'}`}>
                          {user.status}
                        </span>
                      </td>

                      <td className="p-4 pr-6">
                        <div className="flex justify-center items-center gap-3">
                          {canPerformAction ? (
                            <>
                              <button onClick={() => openModal(user)} className="text-gray-400 hover:text-gray-800 transition"><FiEdit size={16} /></button>
                              <button onClick={() => handleRemove(user._id)} className="text-gray-400 hover:text-red-600 transition"><FiTrash2 size={16} /></button>
                            </>
                          ) : <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Restricted</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="p-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </section>
      )}

      {/* Modal - Updated for cleaner UI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 shadow-2xl w-full max-w-md rounded-none">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold uppercase tracking-wider">{editId ? 'Update Personnel' : 'Register Personnel'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-800 transition"><FiX size={22} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 p-2.5 outline-none focus:border-black text-sm"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Corporate Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 p-2.5 outline-none focus:border-black text-sm"
                  placeholder="staff@resort.com"
                />
              </div>

              {!editId && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Temporary Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-gray-300 p-2.5 outline-none focus:border-black text-sm"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div className="p-4 bg-gray-50 border border-gray-200">
                {formData.photo && (
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 border-2 border-black overflow-hidden bg-gray-100">
                      <img src={formData.photo} alt="ID Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
                <ImageUpload setImageUrl={handleImageUpload} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border border-gray-300 p-2.5 outline-none focus:border-black text-sm capitalize"
                  >
                    <option value="" disabled>Select Role</option>
                    {assignableRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Resort Division</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full border border-gray-300 p-2.5 outline-none focus:border-black text-sm capitalize"
                  >
                    <option value="" disabled>Select Division</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept.department}>{dept.department}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={formData.mobileNumber || ""}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    className="w-full border border-gray-300 p-2.5 outline-none focus:border-black text-sm"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Duty Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-gray-300 p-2.5 outline-none focus:border-black text-sm"
                  >
                    <option value="active">Active Duty</option>
                    <option value="inactive">Off Duty / Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button onClick={closeModal} className="px-5 py-2 border border-gray-300 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition">Cancel</button>
              <button onClick={handleAddOrEditUser} className="px-5 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : (editId ? 'Save' : 'Register')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResortStaff;