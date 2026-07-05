"use client";

import React, { useState, useContext, useMemo, useEffect } from "react";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus, FiCheckCircle, FiXCircle, FiList } from "react-icons/fi";
import { MdInfoOutline } from "react-icons/md";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import Select from "react-select";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useResortServices from "@/hooks/useResortServices";
import useResortServiceCategories from "@/hooks/useResortServiceCategories";
import { AuthContext } from "@/providers/AuthProvider";
import usePagePermission from "@/hooks/usePagePermission";

const INITIAL_FORM_DATA = {
  serviceName: "",
  category: "",
  price: "",
  image: "",
  status: "Available",
  vat: 0,
  sc: 0,
  sd: 0,
};

const customSelectStyles = {
  control: (provided) => ({
    ...provided,
    borderColor: 'var(--color-brand-primary)',
    padding: '2px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: 'var(--color-brand-primary)',
    }
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? 'var(--color-brand-primary)' : state.isFocused ? 'rgba(52, 110, 54, 0.1)' : null,
    color: state.isSelected ? 'white' : 'inherit',
  }),
};

const ResortServicesPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);
  const { canAdd, canEdit, canDelete } = usePagePermission();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { services, totalPages, totalItems, isLoading, refetch } = useResortServices(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm
  );

  const { categories } = useResortServiceCategories(1, 100);
  const categoryOptions = categories.map(cat => ({ value: cat.categoryName, label: cat.categoryName }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [chargeSettings, setChargeSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await axiosSecure.get("/settings/charges");
        if (data) setChargeSettings(data);
      } catch (err) {
        console.error("Failed to fetch charge settings:", err);
      }
    };
    fetchSettings();
  }, [axiosSecure]);

  const openModal = (serviceToEdit = null) => {
    if (serviceToEdit) {
      setEditId(serviceToEdit._id);
      setFormData({
        serviceName: serviceToEdit.serviceName || "",
        category: serviceToEdit.category || "",
        price: serviceToEdit.price || "",
        image: serviceToEdit.image || "",
        status: serviceToEdit.status || "Available",
        vat: serviceToEdit.vat || 0,
        sc: serviceToEdit.sc || 0,
        sd: serviceToEdit.sd || 0,
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsSubmitting(true);
    try {
      const formD = new FormData();
      formD.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formD,
      });
      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({ ...prev, image: data.url }));
      } else {
        Swal.fire("Error", "Image upload failed. Please try again.", "error");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      Swal.fire("Error", "Failed to upload image.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddOrEditService = async () => {
    if (editId ? !canEdit : !canAdd) {
      Swal.fire("Access Denied", `You do not have permission to ${editId ? "update" : "create"} services.`, "error");
      return;
    }

    if (!formData.serviceName || !formData.serviceName.trim()) {
      Swal.fire("Validation Error", "Please provide the service name.", "warning");
      return;
    }
    if (!formData.category) {
      Swal.fire("Validation Error", "Please select a category.", "warning");
      return;
    }
    if (!formData.price || isNaN(formData.price) || Number(formData.price) < 0) {
      Swal.fire("Validation Error", "Please provide a valid price.", "warning");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      serviceName: formData.serviceName.trim(),
      price: Number(formData.price),
      vat: chargeSettings?.vat?.enabled ? Number(formData.vat || 0) : 0,
      sc: chargeSettings?.sc?.enabled ? Number(formData.sc || 0) : 0,
      sd: chargeSettings?.sd?.enabled ? Number(formData.sd || 0) : 0,
    };

    try {
      if (editId) {
        await axiosSecure.put(`/resort-service/update/${editId}`, payload);
      } else {
        await axiosSecure.post("/resort-service/post", payload);
      }
      await refetch();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Service successfully ${editId ? "updated" : "created"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save service.",
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (!canDelete) {
      Swal.fire("Access Denied", "You do not have permission to delete services.", "error");
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
          await axiosSecure.delete(`/resort-service/delete/${id}`);
          await refetch();
          Swal.fire("Deleted!", "Service has been deleted.", "success");
        } catch (error) {
          Swal.fire("Error!", "Failed to delete service.", "error");
        }
      }
    });
  };

  const availableCount = useMemo(() => services.filter(s => s.status === "Available").length, [services]);
  const unavailableCount = useMemo(() => services.filter(s => s.status === "Unavailable").length, [services]);

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">
      <SectionHeader title="Resort Services" subtitle="Manage services like Spa, Laundry, etc." >
        <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige w-full md:w-80 h-12">
          <FiSearch className="text-brand-sage text-lg" />
          <input type="text" className="grow placeholder-brand-sage bg-transparent border-none outline-none focus:outline-none" placeholder="Search services..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
        </label>
      </SectionHeader>

      <div className="stats shadow-sm bg-white dark:bg-brand-charcoal w-full mb-8 border border-brand-beige dark:border-brand-beige/20 rounded-2xl overflow-hidden hidden md:flex animate-fade-in">
        <div className="stat place-items-center py-6">
          <div className="stat-figure text-brand-primary bg-brand-primary/10 p-4 rounded-full"><FiList className="w-8 h-8" /></div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Total Services</div>
          <div className="stat-value text-brand-black dark:text-brand-offwhite text-4xl mt-1">{totalItems}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-emerald-500 bg-emerald-500/10 p-4 rounded-full"><FiCheckCircle className="w-8 h-8" /></div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Available</div>
          <div className="stat-value text-emerald-600 dark:text-emerald-400 text-4xl mt-1">{availableCount}</div>
        </div>
        <div className="stat place-items-center py-6 border-l border-brand-beige dark:border-brand-beige/20">
          <div className="stat-figure text-red-500 bg-red-500/10 p-4 rounded-full"><FiXCircle className="w-8 h-8" /></div>
          <div className="stat-title text-brand-sage font-bold uppercase tracking-wider text-[10px] mt-2">Unavailable</div>
          <div className="stat-value text-red-500 dark:text-red-400 text-4xl mt-1">{unavailableCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
        <div className="flex items-center gap-3 text-xs font-bold text-brand-sage uppercase tracking-widest">
          <span>Display</span>
          <select value={itemsPerPage} className="select select-bordered select-xs bg-white text-brand-charcoal rounded-md h-8 px-2" onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="50">50</option>
          </select>
          <span className="ml-4">Total Records: {totalItems}</span>
        </div>

        {canAdd && (
          <div className="flex gap-2">
            <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10 cursor-pointer">
              <FiPlus className="text-lg" />
              <span className="uppercase tracking-widest text-xs font-bold">New Service</span>
            </button>
          </div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden">
        <div className="p-0">
          {isLoading ? (
            <div className="p-6"><MtableLoading /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] border-b border-brand-beige">
                  <tr>
                    <th className="pl-8 py-5">Service Name</th>
                    <th className="py-5">Category</th>
                    <th className="py-5">Price</th>
                    <th className="py-5">Status</th>
                    <th className="pr-8 text-center py-5 w-36">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase">No services configured.</td>
                      </tr>
                    ) : (
                      services.map((service) => (
                        <motion.tr key={service._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-brand-offwhite/50 transition-colors border-b border-brand-beige dark:border-brand-beige/10 text-sm">
                          <td className="pl-8 py-4 font-bold tracking-wide">
                            <div className="flex items-center gap-3">
                              {service.image && (
                                <div className="w-8 h-8 rounded border border-brand-beige/50 overflow-hidden shrink-0">
                                  <img src={service.image} alt={service.serviceName} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <span>{service.serviceName}</span>
                            </div>
                          </td>
                          <td className="py-4 font-bold text-brand-sage">{service.category || "N/A"}</td>
                          <td className="py-4 font-bold text-brand-primary">৳{service.price}</td>
                          <td className="py-4">
                            <span className={`badge badge-sm font-bold tracking-wider uppercase text-[10px] border-none ${service.status === "Available" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{service.status}</span>
                          </td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center gap-2">
                              {canEdit || canDelete ? (
                                <>
                                  {canEdit && (
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openModal(service)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary cursor-pointer" title="Edit"><FiEdit size={16} /></motion.button>
                                  )}
                                  {canDelete && (
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(service._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 cursor-pointer" title="Delete"><FiTrash2 size={16} /></motion.button>
                                  )}
                                </>
                              ) : (
                                <div className="badge badge-ghost badge-sm text-[10px] font-bold uppercase tracking-widest text-brand-sage bg-brand-offwhite border-none">Restricted</div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
              <div className="p-5 border-t border-brand-beige bg-brand-offwhite/30 flex justify-center">
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={(page) => setCurrentPage(page)} />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white p-0 overflow-visible max-w-lg rounded-2xl shadow-2xl border border-brand-beige/20 animate-scale-in text-brand-charcoal">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige bg-brand-offwhite">
              <h3 className="font-bold text-lg text-brand-black uppercase tracking-widest">{editId ? 'Update Service' : 'Create Service'}</h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal"><FiX size={20} /></button>
            </div>

            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Service Name *</span></label>
                <input type="text" value={formData.serviceName} onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })} className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary w-full bg-white text-brand-charcoal" placeholder="e.g. Spa Treatment" autoFocus />
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Category *</span></label>
                <Select
                  options={categoryOptions}
                  value={categoryOptions.find(option => option.value === formData.category) || null}
                  onChange={(selectedOption) => setFormData({ ...formData, category: selectedOption ? selectedOption.value : "" })}
                  isClearable
                  isSearchable
                  placeholder="Select a category..."
                  styles={customSelectStyles}
                  className="text-sm text-brand-charcoal"
                  menuPortalTarget={document.body}
                />
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Price (৳) *</span></label>
                <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary w-full bg-white text-brand-charcoal" placeholder="e.g. 500" />
              </div>

              {chargeSettings && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {chargeSettings.vat?.enabled && (
                    <div className="card bg-brand-white dark:bg-brand-charcoal shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">VAT</span>
                            <MdInfoOutline className="text-gray-400" title={`Apply ${chargeSettings.vat.value}% VAT`} />
                          </div>
                          <input 
                            type="checkbox" 
                            className="toggle toggle-sm bg-brand-primary" 
                            checked={formData.vat > 0} 
                            onChange={(e) => setFormData({ ...formData, vat: e.target.checked ? chargeSettings.vat.value : 0 })} 
                          />
                        </div>
                      </div>
                  )}

                  {chargeSettings.sc?.enabled && (
                    <div className="card bg-brand-white dark:bg-brand-charcoal shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">SC</span>
                            <MdInfoOutline className="text-gray-400" title={`Apply ${chargeSettings.sc.value}% SC`} />
                          </div>
                          <input 
                            type="checkbox" 
                            className="toggle toggle-sm bg-brand-primary" 
                            checked={formData.sc > 0} 
                            onChange={(e) => setFormData({ ...formData, sc: e.target.checked ? chargeSettings.sc.value : 0 })} 
                          />
                        </div>
                      </div>
                  )}

                  {chargeSettings.sd?.enabled && (
                    <div className="card bg-brand-white dark:bg-brand-charcoal shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm text-brand-charcoal dark:text-gray-200">SD</span>
                            <MdInfoOutline className="text-gray-400" title={`Apply ${chargeSettings.sd.value}% SD`} />
                          </div>
                          <input 
                            type="checkbox" 
                            className="toggle toggle-sm bg-brand-primary" 
                            checked={formData.sd > 0} 
                            onChange={(e) => setFormData({ ...formData, sd: e.target.checked ? chargeSettings.sd.value : 0 })} 
                          />
                        </div>
                      </div>
                  )}
                </div>
              )}

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Status</span></label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="select select-bordered border-brand-primary focus:outline-none focus:border-brand-primary w-full bg-white text-brand-charcoal">
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>

              <div className="form-control w-full mt-4">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Image Upload</span></label>
                <div className="flex items-center gap-4">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="file-input file-input-bordered file-input-sm border-brand-primary text-brand-charcoal w-full max-w-xs" disabled={isSubmitting} />
                  {formData.image && (
                    <div className="w-12 h-12 rounded border border-brand-primary/50 overflow-hidden shadow-sm shrink-0">
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige bg-brand-offwhite">
              <button onClick={closeModal} className="btn btn-ghost text-brand-charcoal font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleAddOrEditService} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : (editId ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={closeModal}>close</button></form>
        </dialog>
      )}
    </div>
  );
};

export default ResortServicesPage;
