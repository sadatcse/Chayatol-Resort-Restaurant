"use client";

import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  FiEdit, FiTrash2, FiX, FiUsers, FiUserCheck, FiStar,
  FiPhone, FiMapPin, FiBriefcase, FiSearch, FiPlus, FiGlobe, FiHeart, FiFileText, FiChevronLeft, FiChevronRight
} from "react-icons/fi";
import Swal from "sweetalert2";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import CustomerModal from "@/components/CustomerModal";
import ImageUpload from "@/components/Comon/ImageUpload";
import Preloader from "@/components/Comon/Preloader";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import { AuthContext } from "@/providers/AuthProvider";
import countriesData from "@/assets/Countries.json";
import districtsData from "@/assets/District.json";

const INITIAL_FORM_DATA = {
  fullName: "",
  phoneNumber: "",
  emailAddress: "",
  nationality: "Bangladeshi",
  maritalStatus: "Single",
  gender: "Male",
  dateOfBirth: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    division: "",
    country: "Bangladesh"
  },
  occupation: "",
  companyName: "",
  anniversaryDate: "",
  identificationType: "NID",
  identificationNumber: "",
  uploadIdCopy: "",
  customerPhoto: "",
  emergencyContact: {
    name: "",
    relation: "",
    phoneNumber: ""
  }
};

const formatDateToInput = (dateVal) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const CustomersPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const [customers, setCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenderFilter, setSelectedGenderFilter] = useState("all");
  const [selectedIdTypeFilter, setSelectedIdTypeFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageLoading, setPageLoading] = useState(true);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadCustomers = async () => {
    setPageLoading(true);
    try {
      const response = await axiosSecure.get("/customer");
      setCustomers(response.data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      Swal.fire({
        title: "Connection Error",
        text: "Could not fetch customer data.",
        icon: "error",
        confirmButtonColor: "#346E36"
      });
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [axiosSecure]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const nameMatch = customer.fullName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const phoneMatch = customer.phoneNumber?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const emailMatch = customer.emailAddress?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesSearch = nameMatch || phoneMatch || emailMatch;

      const matchesGender = selectedGenderFilter === "all" || customer.gender === selectedGenderFilter;
      const matchesIdType = selectedIdTypeFilter === "all" || customer.identificationType === selectedIdTypeFilter;

      return matchesSearch && matchesGender && matchesIdType;
    });
  }, [customers, debouncedSearchTerm, selectedGenderFilter, selectedIdTypeFilter]);

  const openModal = (customerToEdit = null) => {
    setActiveTab("basic");
    if (customerToEdit) {
      setEditId(customerToEdit._id);
      setFormData({
        ...INITIAL_FORM_DATA,
        ...customerToEdit,
        dateOfBirth: formatDateToInput(customerToEdit.dateOfBirth),
        anniversaryDate: formatDateToInput(customerToEdit.anniversaryDate),
        address: {
          ...INITIAL_FORM_DATA.address,
          ...(customerToEdit.address || {})
        },
        emergencyContact: {
          ...INITIAL_FORM_DATA.emergencyContact,
          ...(customerToEdit.emergencyContact || {})
        }
      });
    } else {
      setEditId(null);
      setFormData({ ...INITIAL_FORM_DATA });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
  };

  const handleAddOrEditCustomer = async () => {
    // 1. Full Legal Name validation
    if (!formData.fullName || !formData.fullName.trim()) {
      setActiveTab("basic");
      Swal.fire({
        title: "Validation Error",
        text: "Please provide the customer's full legal name.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }
    if (formData.fullName.trim().length < 2) {
      setActiveTab("basic");
      Swal.fire({
        title: "Validation Error",
        text: "Customer name must be at least 2 characters long.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    // 2. Phone Number validation
    if (!formData.phoneNumber || !formData.phoneNumber.trim()) {
      setActiveTab("basic");
      Swal.fire({
        title: "Validation Error",
        text: "Please provide the customer's phone number.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }
    const phoneRegex = /^\+?[0-9\s\-]{8,16}$/;
    if (!phoneRegex.test(formData.phoneNumber.trim())) {
      setActiveTab("basic");
      Swal.fire({
        title: "Validation Error",
        text: "Please enter a valid phone number (8-16 digits, spaces, hyphens, and optional leading +).",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    // 3. Email validation (if provided)
    if (formData.emailAddress && formData.emailAddress.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.emailAddress.trim())) {
        setActiveTab("basic");
        Swal.fire({
          title: "Validation Error",
          text: "Please enter a valid email address.",
          icon: "warning",
          confirmButtonColor: "#346E36"
        });
        return;
      }
    }

    // 4. Gender validation
    if (!formData.gender) {
      setActiveTab("basic");
      Swal.fire({
        title: "Validation Error",
        text: "Please select the customer's gender.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    // 5. Marital Status validation
    if (!formData.maritalStatus) {
      setActiveTab("basic");
      Swal.fire({
        title: "Validation Error",
        text: "Please select the customer's marital status.",
        icon: "warning",
        confirmButtonColor: "#346E36"
      });
      return;
    }

    // 6. Date of Birth validation
    if (formData.dateOfBirth) {
      const dobDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (dobDate > today) {
        setActiveTab("basic");
        Swal.fire({
          title: "Validation Error",
          text: "Date of Birth cannot be in the future.",
          icon: "warning",
          confirmButtonColor: "#346E36"
        });
        return;
      }
    }

    // 7. Anniversary Date validation
    if (formData.anniversaryDate) {
      const annDate = new Date(formData.anniversaryDate);
      if (isNaN(annDate.getTime())) {
        setActiveTab("basic");
        Swal.fire({
          title: "Validation Error",
          text: "Please enter a valid anniversary date.",
          icon: "warning",
          confirmButtonColor: "#346E36"
        });
        return;
      }
    }

    // 8. Address validations
    const hasAddress = formData.address?.line1?.trim() || formData.address?.line2?.trim() || formData.address?.city?.trim();
    if (hasAddress) {
      if (formData.address?.country === "Bangladesh" && !formData.address?.city) {
        setActiveTab("address");
        Swal.fire({
          title: "Validation Error",
          text: "Please select a City / District for the Bangladesh address.",
          icon: "warning",
          confirmButtonColor: "#346E36"
        });
        return;
      }
      if (formData.address?.country !== "Bangladesh" && (!formData.address?.city?.trim() || !formData.address?.division?.trim())) {
        setActiveTab("address");
        Swal.fire({
          title: "Validation Error",
          text: "Please fill both City and State/Division for the international address.",
          icon: "warning",
          confirmButtonColor: "#346E36"
        });
        return;
      }
    }

    // 9. Identification Number validation (if provided)
    if (formData.identificationNumber && formData.identificationNumber.trim()) {
      if (formData.identificationNumber.trim().length < 4) {
        setActiveTab("identification");
        Swal.fire({
          title: "Validation Error",
          text: "Identification Number must be at least 4 characters long.",
          icon: "warning",
          confirmButtonColor: "#346E36"
        });
        return;
      }
    }

    // 10. Emergency Contact validations
    const emergencyName = formData.emergencyContact?.name?.trim() || "";
    const emergencyRelation = formData.emergencyContact?.relation?.trim() || "";
    const emergencyPhone = formData.emergencyContact?.phoneNumber?.trim() || "";

    const hasSomeEmergencyInfo = emergencyName || emergencyRelation || emergencyPhone;
    if (hasSomeEmergencyInfo) {
      if (!emergencyName || !emergencyRelation || !emergencyPhone) {
        setActiveTab("emergency");
        Swal.fire({
          title: "Validation Error",
          text: "If providing emergency contact details, Name, Relation, and Phone Number are all required.",
          icon: "warning",
          confirmButtonColor: "#346E36"
        });
        return;
      }

      if (!phoneRegex.test(emergencyPhone)) {
        setActiveTab("emergency");
        Swal.fire({
          title: "Validation Error",
          text: "Please enter a valid emergency contact phone number.",
          icon: "warning",
          confirmButtonColor: "#346E36"
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editId) {
        await axiosSecure.put(`/customer/update/${editId}`, formData);
      } else {
        await axiosSecure.post("/customer/post", formData);
      }
      await loadCustomers();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Customer profile has been successfully ${editId ? "updated" : "created"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save customer record.",
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
      text: "You won't be able to revert this customer record!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#346E36",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosSecure.delete(`/customer/delete/${id}`);
          await loadCustomers();
          Swal.fire({
            title: "Deleted!",
            text: "Customer profile deleted.",
            icon: "success",
            confirmButtonColor: "#346E36",
          });
        } catch (error) {
          Swal.fire("Error!", "Failed to delete customer.", "error");
        }
      }
    });
  };

  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedData = useMemo(() => {
    return filteredCustomers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredCustomers, currentPage, itemsPerPage]);

  const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      {/* Header & Inline Search */}
      <SectionHeader
        title="Customer Manager"
        subtitle="Register resort guests, manage files, identification, and profile data."
      >
        <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-80 h-12">
          <FiSearch className="text-brand-sage text-lg" />
          <input
            type="text"
            className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
            placeholder="Search name, phone, email..."
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
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Total Guests</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-4xl mt-1">{customers.length}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-secondary bg-secondary/10 p-4 rounded-full">
            <FiGlobe className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Bangladeshi</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-4xl mt-1">
            {customers.filter(c => c.nationality?.toLowerCase() === 'bangladeshi').length}
          </div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-brand-bronze bg-brand-bronze/10 p-4 rounded-full">
            <FiHeart className="w-8 h-8" />
          </div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Male / Female</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-3xl mt-1">
            {customers.filter(c => c.gender === 'Male').length} / {customers.filter(c => c.gender === 'Female').length}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Add Button */}
      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
        <div className="flex flex-row items-center gap-3">
          {/* Gender Filter */}
          <select
            value={selectedGenderFilter}
            onChange={(e) => {
              setSelectedGenderFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select select-sm select-bordered rounded-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none h-10 px-4 w-auto min-w-[150px] capitalize font-semibold text-xs tracking-wide cursor-pointer"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          {/* ID Type Filter */}
          <select
            value={selectedIdTypeFilter}
            onChange={(e) => {
              setSelectedIdTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select select-sm select-bordered rounded-full bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite border-brand-beige dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none h-10 px-4 w-auto min-w-[170px] capitalize font-semibold text-xs tracking-wide cursor-pointer"
          >
            <option value="all">All ID Types</option>
            <option value="NID">NID</option>
            <option value="Passport">Passport</option>
            <option value="Driving License">Driving License</option>
            <option value="Birth Certificate">Birth Certificate</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {canPerformAction && (
          <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10">
            <FiPlus className="text-lg" />
            <span className="uppercase tracking-widest text-xs font-bold">New Guest</span>
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
                  <th className="pl-8 py-5">Guest Profile</th>
                  <th className="py-5">Gender</th>
                  <th className="py-5">Nationality</th>
                  <th className="py-5">Identification</th>
                  <th className="py-5">Emergency Contact</th>
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
                        No customer profiles found.
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((customer) => (
                    <tr key={customer._id} className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm">
                      <td className="pl-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="avatar">
                            <div className="w-12 h-12 rounded-full ring-2 ring-brand-primary ring-offset-2 ring-offset-white dark:ring-offset-brand-charcoal bg-brand-offwhite dark:bg-brand-offwhite/5 flex items-center justify-center text-brand-primary font-bold text-lg shadow-sm">
                              {customer.customerPhoto ? (
                                <img src={customer.customerPhoto} alt={customer.fullName} />
                              ) : (
                                <span>{customer.fullName?.substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-brand-black dark:text-brand-offwhite text-sm uppercase tracking-wide">{customer.fullName}</div>
                            <div className="text-xs text-brand-sage mt-1">{customer.emailAddress || "No email"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4">
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-brand-dark-grey dark:text-brand-offwhite/70 capitalize">
                          <div className="p-2 bg-brand-offwhite dark:bg-brand-offwhite/5 rounded-lg text-brand-primary"><FiHeart size={14} /></div>
                          {customer.gender}
                        </div>
                      </td>

                      <td className="py-4">
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-brand-dark-grey dark:text-brand-offwhite/70 capitalize">
                          <div className="p-2 bg-brand-offwhite dark:bg-brand-offwhite/5 rounded-lg text-brand-bronze"><FiGlobe size={14} /></div>
                          {customer.nationality || "Bangladeshi"}
                        </div>
                      </td>

                      <td className="py-4 font-mono text-xs font-medium text-brand-dark-grey dark:text-brand-offwhite/70">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-brand-primary capitalize">{customer.identificationType}</span>
                          <span>{customer.identificationNumber || "N/A"}</span>
                        </div>
                      </td>

                      <td className="py-4 text-xs font-medium text-brand-dark-grey dark:text-brand-offwhite/70">
                        {customer.emergencyContact?.name ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">{customer.emergencyContact.name} ({customer.emergencyContact.relation})</span>
                            <span className="font-mono text-brand-sage">{customer.emergencyContact.phoneNumber}</span>
                          </div>
                        ) : (
                          <span className="text-brand-sage">N/A</span>
                        )}
                      </td>

                      <td className="pr-8 py-4">
                        <div className="flex justify-center items-center gap-2">
                          {canPerformAction ? (
                            <>
                              <button onClick={() => openModal(customer)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors" title="Edit Customer">
                                <FiEdit size={16} />
                              </button>
                              <button onClick={() => handleRemove(customer._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete Customer">
                                <FiTrash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite dark:bg-brand-offwhite/5 border-none">Restricted</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-2xl rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20">

            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Customer Profile' : 'Register New Customer'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite/50 dark:bg-brand-charcoal/30">
              {["basic", "address", "identification", "emergency"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${activeTab === tab
                      ? "border-brand-primary text-brand-primary dark:text-brand-offwhite bg-white dark:bg-brand-charcoal/10"
                      : "border-transparent text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite"
                    }`}
                >
                  {tab === "basic" && "Basic Info"}
                  {tab === "address" && "Address"}
                  {tab === "identification" && "ID & Photos"}
                  {tab === "emergency" && "Emergency"}
                </button>
              ))}
            </div>

            {/* Modal Form Scrollable Area */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">

              {/* Tab 1: Basic Information */}
              {activeTab === "basic" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Full Legal Name *</span></label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Phone Number *</span></label>
                    <input
                      type="text"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                      placeholder="e.g. +8801700000000"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Email Address</span></label>
                    <input
                      type="email"
                      value={formData.emailAddress}
                      onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholder="guest@domain.com"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Nationality</span></label>
                    <select
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-bold"
                    >
                      {countriesData.map((c, idx) => (
                        <option key={idx} value={c.nationality}>
                          {c.nationality}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Marital Status *</span></label>
                    <select
                      value={formData.maritalStatus}
                      onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                      className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-bold"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Gender *</span></label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-bold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Date of Birth</span></label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Occupation</span></label>
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholder="e.g. Engineer"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Company Name (Optional)</span></label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholder="e.g. Mondol Ltd"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Anniversary Date</span></label>
                    <input
                      type="date"
                      value={formData.anniversaryDate}
                      onChange={(e) => setFormData({ ...formData, anniversaryDate: e.target.value })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Address details */}
              {activeTab === "address" && (
                <div className="grid grid-cols-1 gap-6 animate-fade-in">
                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Address Line 1</span></label>
                    <input
                      type="text"
                      value={formData.address?.line1 || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, line1: e.target.value }
                      })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholder="House No, Street, Landmark"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Address Line 2</span></label>
                    <input
                      type="text"
                      value={formData.address?.line2 || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, line2: e.target.value }
                      })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholder="Village, Sector, P.O."
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Country</span></label>
                    <select
                      value={formData.address?.country || "Bangladesh"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          address: {
                            ...prev.address,
                            country: val,
                            city: val === "Bangladesh" ? "" : prev.address.city,
                            division: val === "Bangladesh" ? "" : prev.address.division
                          }
                        }));
                      }}
                      className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-bold"
                    >
                      {countriesData.map((c, idx) => (
                        <option key={idx} value={c.country}>
                          {c.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formData.address?.country === "Bangladesh" ? (
                      <>
                        <div className="form-control w-full">
                          <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">City / District</span></label>
                          <select
                            value={formData.address?.city || ""}
                            onChange={(e) => {
                              const selectedDistrict = e.target.value;
                              const matched = districtsData.find(d => d.district === selectedDistrict);
                              setFormData(prev => ({
                                ...prev,
                                address: {
                                  ...prev.address,
                                  city: selectedDistrict,
                                  division: matched ? matched.division : ""
                                }
                              }));
                            }}
                            className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-bold"
                          >
                            <option value="">Select District</option>
                            {districtsData.map((d) => (
                              <option key={d.id} value={d.district}>
                                {d.district}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-control w-full">
                          <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Division</span></label>
                          <input
                            type="text"
                            value={formData.address?.division || ""}
                            readOnly
                            disabled
                            className="input input-bordered border-brand-primary dark:border-brand-primary/50 w-full bg-brand-offwhite/50 dark:bg-brand-charcoal/80 text-brand-sage dark:text-brand-sage/80 cursor-not-allowed font-bold"
                            placeholder="Auto-populated division"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="form-control w-full">
                          <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">City</span></label>
                          <input
                            type="text"
                            value={formData.address?.city || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              address: { ...formData.address, city: e.target.value }
                            })}
                            className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                            placeholder="e.g. New York"
                          />
                        </div>

                        <div className="form-control w-full">
                          <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">State / Division</span></label>
                          <input
                            type="text"
                            value={formData.address?.division || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              address: { ...formData.address, division: e.target.value }
                            })}
                            className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                            placeholder="e.g. NY"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: ID & Uploads */}
              {activeTab === "identification" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control w-full">
                      <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Identification Type</span></label>
                      <select
                        value={formData.identificationType}
                        onChange={(e) => setFormData({ ...formData, identificationType: e.target.value })}
                        className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-bold"
                      >
                        <option value="NID">NID</option>
                        <option value="Passport">Passport</option>
                        <option value="Driving License">Driving License</option>
                        <option value="Birth Certificate">Birth Certificate</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-control w-full">
                      <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Identification Number</span></label>
                      <input
                        type="text"
                        value={formData.identificationNumber}
                        onChange={(e) => setFormData({ ...formData, identificationNumber: e.target.value })}
                        className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                        placeholder="ID details..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Photo Upload */}
                    <div className="p-6 bg-brand-offwhite dark:bg-brand-charcoal/50 rounded-2xl border border-brand-beige dark:border-brand-beige/20">
                      <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest mb-4">Customer Photo</span>
                      {formData.customerPhoto && (
                        <div className="flex justify-center mb-6">
                          <div className="avatar">
                            <div className="w-24 rounded-full ring-4 ring-brand-primary ring-offset-4 ring-offset-white dark:ring-offset-brand-charcoal shadow-lg">
                              <img src={formData.customerPhoto} alt="Customer Preview" />
                            </div>
                          </div>
                        </div>
                      )}
                      <ImageUpload setImageUrl={(url) => setFormData(prev => ({ ...prev, customerPhoto: url }))} label="Upload Photo" />
                    </div>

                    {/* ID Copy Upload */}
                    <div className="p-6 bg-brand-offwhite dark:bg-brand-charcoal/50 rounded-2xl border border-brand-beige dark:border-brand-beige/20">
                      <span className="block text-xs font-bold text-brand-sage uppercase tracking-widest mb-4">ID Copy Document</span>
                      {formData.uploadIdCopy && (
                        <div className="flex justify-center mb-6">
                          <div className="avatar">
                            <div className="w-24 rounded-xl ring-4 ring-brand-primary ring-offset-4 ring-offset-white dark:ring-offset-brand-charcoal shadow-lg">
                              <img src={formData.uploadIdCopy} alt="ID Document Preview" />
                            </div>
                          </div>
                        </div>
                      )}
                      <ImageUpload setImageUrl={(url) => setFormData(prev => ({ ...prev, uploadIdCopy: url }))} label="Upload ID Copy Document" />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Emergency Contact */}
              {activeTab === "emergency" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                  <div className="form-control w-full col-span-1 md:col-span-3">
                    <span className="text-xs font-bold text-brand-sage uppercase tracking-widest block border-b border-brand-beige dark:border-brand-beige/20 pb-2">Emergency Contact Information</span>
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Emergency Person Name</span></label>
                    <input
                      type="text"
                      value={formData.emergencyContact?.name || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                      })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholder="Emergency contact name"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Relation</span></label>
                    <input
                      type="text"
                      value={formData.emergencyContact?.relation || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, relation: e.target.value }
                      })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                      placeholder="e.g. Spouse, Father, Friend"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Contact Number</span></label>
                    <input
                      type="text"
                      value={formData.emergencyContact?.phoneNumber || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, phoneNumber: e.target.value }
                      })}
                      className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite font-mono"
                      placeholder="Emergency contact phone"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleAddOrEditCustomer} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none text-white font-bold uppercase tracking-widest text-xs px-8 shadow-md border-none" disabled={isSubmitting}>
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

export default CustomersPage;
