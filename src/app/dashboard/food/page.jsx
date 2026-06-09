"use client";

import React, { useState, useContext, useEffect } from "react";
import { FiEdit, FiTrash2, FiX, FiSearch, FiPlus, FiUpload, FiDownload } from "react-icons/fi";
import { MdInfoOutline } from "react-icons/md";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import * as XLSX from "xlsx";

import SectionHeader from "@/components/Comon/SectionHeader";
import Pagination from "@/components/Comon/Pagination";
import MtableLoading from "@/components/Comon/MtableLoading";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import useDebounce from "@/hooks/useDebounce";
import useFood from "@/hooks/useFood";
import { AuthContext } from "@/providers/AuthProvider";
import useFoodCategories from "@/hooks/useFoodCategories";
import foodTypes from "@/data/foodCategories.json";

const INITIAL_FORM_DATA = {
  foodName: "",
  category: "",
  foodType: "Fast Food",
  details: "",
  image: "",
  price: "",
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

const FoodPage = () => {
  const axiosSecure = useAxiosSecure();
  const { user: currentUser } = useContext(AuthContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { foods, totalPages, totalItems, isLoading, refetch } = useFood(
    currentPage,
    itemsPerPage,
    debouncedSearchTerm
  );

  const { categories, isLoading: isCategoriesLoading } = useFoodCategories(1, 100);
  const categoryOptions = categories.map(cat => ({ value: cat.categoryName, label: cat.categoryName }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [chargeSettings, setChargeSettings] = useState(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkPreview, setBulkPreview] = useState([]);
  
  // New Bulk Add Form UI State
  const [isBulkUiModalOpen, setIsBulkUiModalOpen] = useState(false);
  const [bulkUiFormData, setBulkUiFormData] = useState([]);

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
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  const openModal = (foodToEdit = null) => {
    if (foodToEdit) {
      setEditId(foodToEdit._id);
      setFormData({
        foodName: foodToEdit.foodName || "",
        category: foodToEdit.category || "",
        foodType: foodToEdit.foodType || "Fast Food",
        details: foodToEdit.details || "",
        image: foodToEdit.image || "",
        price: foodToEdit.price || "",
        status: foodToEdit.status || "Available",
        vat: foodToEdit.vat || 0,
        sc: foodToEdit.sc || 0,
        sd: foodToEdit.sd || 0,
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

  const openBulkModal = () => {
    setBulkFile(null);
    setBulkPreview([]);
    setIsBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    setIsBulkModalOpen(false);
    setBulkFile(null);
    setBulkPreview([]);
  };

  const openBulkUiModal = () => {
    // Initialize with one blank row
    setBulkUiFormData([{ ...INITIAL_FORM_DATA, id: Date.now() }]);
    setIsBulkUiModalOpen(true);
  };

  const closeBulkUiModal = () => {
    setIsBulkUiModalOpen(false);
    setBulkUiFormData([]);
  };

  const handleBulkFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBulkFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        setBulkPreview(json);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        foodName: "Example Food",
        category: "Main Course",
        foodType: "Fast Food",
        details: "Delicious details",
        price: "150",
        vat: "5",
        sc: "0",
        sd: "0",
        status: "Available"
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "food_bulk_template.xlsx");
  };

  const handleBulkSubmit = async () => {
    if (!bulkPreview || bulkPreview.length === 0) {
      Swal.fire("Error", "No data to import. Please upload a valid Excel or CSV file.", "error");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const payload = bulkPreview.map(item => ({
        foodName: item.foodName?.trim() || "Unknown Food",
        category: item.category?.trim() || "Uncategorized",
        foodType: item.foodType?.trim() || "Fast Food",
        details: item.details?.trim() || "",
        price: Number(item.price) || 0,
        vat: Number(item.vat) || 0,
        sc: Number(item.sc) || 0,
        sd: Number(item.sd) || 0,
        status: item.status?.trim() || "Available"
      }));

      const res = await axiosSecure.post("/food/bulk-post", payload);
      await refetch();
      closeBulkModal();
      Swal.fire("Success", res.data.message || "Bulk import successful.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Bulk import failed.", "error");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkUiSubmit = async () => {
    // Basic validation: ensure all rows have names and prices (Category is optional)
    const invalidRows = bulkUiFormData.filter(f => !f.foodName?.trim() || !f.price || isNaN(f.price) || Number(f.price) < 0);
    if (invalidRows.length > 0) {
      Swal.fire("Validation Error", "Please ensure all rows have a Name and a valid Price.", "warning");
      return;
    }

    if (bulkUiFormData.length === 0) {
      Swal.fire("Warning", "Please add at least one item.", "warning");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const payload = bulkUiFormData.map(item => ({
        foodName: item.foodName?.trim(),
        category: item.category?.trim() || "Uncategorized",
        foodType: item.foodType || "Fast Food",
        details: item.details?.trim() || "",
        price: Number(item.price) || 0,
        vat: Number(item.vat) || 0,
        sc: Number(item.sc) || 0,
        sd: Number(item.sd) || 0,
        status: item.status || "Available",
        image: item.image || ""
      }));

      const res = await axiosSecure.post("/food/bulk-post", payload);
      await refetch();
      closeBulkUiModal();
      Swal.fire("Success", res.data.message || "Bulk items added successfully.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to add bulk items.", "error");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleAddBulkUiRow = () => {
    setBulkUiFormData([...bulkUiFormData, { ...INITIAL_FORM_DATA, id: Date.now() }]);
  };

  const handleRemoveBulkUiRow = (id) => {
    setBulkUiFormData(bulkUiFormData.filter(row => row.id !== id));
  };

  const handleBulkUiChange = (id, field, value) => {
    setBulkUiFormData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleBulkImageUpload = async (id, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Use a temporary field "isUploadingImage" for UI feedback if needed
    handleBulkUiChange(id, 'isUploadingImage', true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        handleBulkUiChange(id, 'image', data.url);
      } else {
        Swal.fire("Error", "Image upload failed. Please try again.", "error");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      Swal.fire("Error", "Failed to upload image.", "error");
    } finally {
      handleBulkUiChange(id, 'isUploadingImage', false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: show a loading state specifically for the image upload
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
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

  const handleAddOrEditFood = async () => {
    if (!formData.foodName || !formData.foodName.trim()) {
      Swal.fire("Validation Error", "Please provide the food name.", "warning");
      return;
    }
    if (!formData.category) {
      Swal.fire("Validation Error", "Please select a food category.", "warning");
      return;
    }
    if (!formData.price || isNaN(formData.price) || Number(formData.price) < 0) {
      Swal.fire("Validation Error", "Please provide a valid price.", "warning");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...formData,
      foodName: formData.foodName.trim(),
      details: formData.details.trim(),
      price: Number(formData.price),
      vat: Number(formData.vat || 0),
      sc: Number(formData.sc || 0),
      sd: Number(formData.sd || 0),
    };

    try {
      if (editId) {
        await axiosSecure.put(`/food/update/${editId}`, payload);
      } else {
        await axiosSecure.post("/food/post", payload);
      }
      await refetch();
      closeModal();
      Swal.fire({
        title: "Success",
        text: `Food item successfully ${editId ? "updated" : "created"}.`,
        icon: "success",
        confirmButtonColor: "#346E36",
      });
    } catch (error) {
      Swal.fire({
        title: "Action Failed",
        text: error.response?.data?.message || "Failed to save food item.",
        icon: "error",
        confirmButtonColor: "#346E36",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
      Swal.fire("Access Denied", "You do not have permission to delete food items.", "error");
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
          await axiosSecure.delete(`/food/delete/${id}`);
          await refetch();
          Swal.fire("Deleted!", "Food item has been deleted.", "success");
        } catch (error) {
          Swal.fire("Error!", "Failed to delete food item.", "error");
        }
      }
    });
  };

  const canPerformAction = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-brand-offwhite dark:bg-brand-charcoal font-sans text-brand-charcoal dark:text-brand-offwhite animate-scale-in">

      <SectionHeader
        title="Food Menu Management"
        subtitle="Manage restaurant food items, pricing, and categories."
      >
        <label className="input input-bordered border-brand-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary flex items-center gap-3 bg-white dark:bg-brand-charcoal/50 rounded-full px-5 shadow-sm border-brand-beige dark:border-brand-beige/20 w-full md:w-80 h-12">
          <FiSearch className="text-brand-sage text-lg" />
          <input
            type="text"
            className="grow placeholder-brand-sage text-brand-charcoal dark:text-brand-offwhite bg-transparent border-none outline-none focus:outline-none"
            placeholder="Search food items..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </label>
      </SectionHeader>

      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-brand-charcoal p-4 rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 mb-6 gap-4">
        <div className="flex items-center gap-3 text-xs font-bold text-brand-sage uppercase tracking-widest">
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
          <span className="ml-4">Total Records: {totalItems}</span>
        </div>

        {canPerformAction && (
          <div className="flex gap-2">
            <button onClick={() => openBulkModal()} className="btn bg-white text-brand-charcoal hover:bg-gray-100 border border-gray-200 btn-sm rounded-full shadow-sm gap-2 px-6 h-10">
              <FiUpload className="text-lg" />
              <span className="uppercase tracking-widest text-xs font-bold">Bulk Add XL File</span>
            </button>
            <button onClick={() => openBulkUiModal()} className="btn bg-white text-brand-charcoal hover:bg-gray-100 border border-gray-200 btn-sm rounded-full shadow-sm gap-2 px-6 h-10">
              <FiPlus className="text-lg" />
              <span className="uppercase tracking-widest text-xs font-bold">Bulk Add Form</span>
            </button>
            <button onClick={() => openModal()} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none btn-sm rounded-full shadow-md gap-2 px-6 h-10">
              <FiPlus className="text-lg" />
              <span className="uppercase tracking-widest text-xs font-bold">New Food</span>
            </button>
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-brand-charcoal rounded-2xl shadow-sm border border-brand-beige dark:border-brand-beige/20 overflow-hidden"
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
                    <th className="pl-8 py-5 w-24">#</th>
                    <th className="py-5">Food Name</th>
                    <th className="py-5">Category</th>
                    <th className="py-5">Type</th>
                    <th className="py-5">Price</th>
                    <th className="py-5">Status</th>
                    <th className="pr-8 text-center py-5 w-36">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {foods.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-20 text-brand-sage text-sm font-bold tracking-widest uppercase bg-white dark:bg-brand-charcoal">
                          No food items configured.
                        </td>
                      </tr>
                    ) : (
                      foods.map((food, index) => (
                        <motion.tr
                          key={food._id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-brand-offwhite/50 dark:hover:bg-brand-offwhite/5 transition-colors border-b border-brand-beige dark:border-brand-beige/10 last:border-none bg-white dark:bg-brand-charcoal text-brand-charcoal dark:text-brand-offwhite text-sm"
                        >
                          <td className="pl-8 py-4 font-bold text-brand-sage font-mono">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="py-4 font-bold tracking-wide">
                            <div className="flex items-center gap-3">
                              {food.image && (
                                <div className="w-8 h-8 rounded border border-brand-beige/50 overflow-hidden shrink-0">
                                  <img src={food.image} alt={food.foodName} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <span>{food.foodName}</span>
                            </div>
                          </td>
                          <td className="py-4 font-bold text-brand-sage">
                            {food.category || "N/A"}
                          </td>
                          <td className="py-4 font-bold text-brand-secondary text-xs uppercase tracking-widest">
                            {food.foodType}
                          </td>
                          <td className="py-4 font-bold text-brand-primary">
                            ৳{food.price}
                          </td>
                          <td className="py-4">
                            <span className={`badge badge-sm font-bold tracking-wider uppercase text-[10px] border-none ${food.status === "Available" ? "bg-green-100 text-green-700" :
                              "bg-red-100 text-red-700"
                              }`}>
                              {food.status}
                            </span>
                          </td>
                          <td className="pr-8 py-4">
                            <div className="flex justify-center items-center gap-2">
                              {canPerformAction ? (
                                <>
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openModal(food)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-none cursor-pointer" title="Edit">
                                    <FiEdit size={16} />
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(food._id)} className="btn btn-sm btn-circle btn-ghost text-brand-sage hover:text-red-500 hover:bg-red-50 transition-colors shadow-none cursor-pointer" title="Delete">
                                    <FiTrash2 size={16} />
                                  </motion.button>
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
        </div>
      </motion.div>

      {isModalOpen && (
        <dialog className="modal modal-open modal-bottom sm:modal-middle bg-brand-charcoal/40 backdrop-blur-sm">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-visible max-w-lg rounded-2xl shadow-2xl border border-brand-beige/20 dark:border-brand-beige/20 animate-scale-in">

            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-black dark:text-brand-offwhite uppercase tracking-widest">
                {editId ? 'Update Food Menu' : 'Create Food Item'}
              </h3>
              <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost text-brand-charcoal dark:text-brand-offwhite hover:bg-brand-beige dark:hover:bg-brand-offwhite/10">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Food Name *</span></label>
                <input
                  type="text"
                  value={formData.foodName}
                  onChange={(e) => setFormData({ ...formData, foodName: e.target.value })}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="e.g. Chicken Biryani"
                  autoFocus
                />
              </div>

              <div className="flex gap-4">
                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Food Category *</span></label>
                  <Select
                    options={categoryOptions}
                    value={categoryOptions.find(option => option.value === formData.category) || null}
                    onChange={(selectedOption) => {
                      setFormData({
                        ...formData,
                        category: selectedOption ? selectedOption.value : ""
                      });
                    }}
                    isClearable
                    isSearchable
                    placeholder="Select a category..."
                    styles={customSelectStyles}
                    className="text-sm text-brand-charcoal"
                    menuPortalTarget={document.body}
                  />
                </div>

                <div className="form-control w-1/2">
                  <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Food Type</span></label>
                  <select
                    value={formData.foodType}
                    onChange={(e) => setFormData({ ...formData, foodType: e.target.value })}
                    className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  >
                    {foodTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Price (৳) *</span></label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="input input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                  placeholder="e.g. 250"
                />
              </div>

              {chargeSettings && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                </div>
              )}

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Food Details</span></label>
                <textarea
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  className="textarea textarea-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite min-h-[80px]"
                  placeholder="Ingredients, description..."
                ></textarea>
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Status</span></label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="select select-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                >
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>

              <div className="form-control w-full mt-4">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Food Image Upload</span></label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="file-input file-input-bordered file-input-sm border-brand-primary text-brand-charcoal dark:text-brand-offwhite w-full max-w-xs"
                    disabled={isSubmitting}
                  />
                  {formData.image && (
                    <div className="w-12 h-12 rounded border border-brand-primary/50 overflow-hidden shadow-sm shrink-0">
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleAddOrEditFood} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Processing...
                  </>
                ) : (editId ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}

      {isBulkModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl bg-white dark:bg-brand-charcoal p-0 overflow-hidden rounded-2xl shadow-2xl border border-brand-beige dark:border-brand-beige/20">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-charcoal dark:text-brand-offwhite uppercase tracking-widest">Bulk Add Food</h3>
              <button onClick={closeBulkModal} className="btn btn-sm btn-circle btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite"><FiX size={18} /></button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <div>
                  <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Need a template?</h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Download the Excel template to see the required format.</p>
                </div>
                <button onClick={handleDownloadTemplate} className="btn btn-sm bg-white text-blue-600 hover:bg-blue-50 border-blue-200 shadow-sm gap-2">
                  <FiDownload /> Template
                </button>
              </div>

              <div className="form-control w-full">
                <label className="label py-1"><span className="label-text text-xs font-bold text-brand-sage uppercase tracking-widest">Upload Excel/CSV File</span></label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleBulkFileUpload}
                  className="file-input file-input-bordered border-brand-primary dark:border-brand-primary/50 focus:outline-none w-full bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite"
                />
              </div>

              {bulkPreview.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <h4 className="font-bold text-sm text-brand-charcoal dark:text-brand-offwhite mb-2">Preview ({bulkPreview.length} items found)</h4>
                  <div className="overflow-x-auto">
                    <table className="table table-xs w-full">
                      <thead>
                        <tr>
                          <th>Food Name</th>
                          <th>Category</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.slice(0, 5).map((item, index) => (
                          <tr key={index}>
                            <td>{item.foodName}</td>
                            <td>{item.category}</td>
                            <td>{item.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bulkPreview.length > 5 && (
                    <p className="text-xs text-center text-gray-500 mt-2">Showing 5 of {bulkPreview.length} items</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeBulkModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleBulkSubmit} disabled={!bulkPreview.length || isBulkSubmitting} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md">
                {isBulkSubmitting ? 'Uploading...' : 'Upload Data'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeBulkModal}>close</button>
          </form>
        </dialog>
      )}
      {isBulkUiModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-6xl bg-white dark:bg-brand-charcoal p-0 overflow-hidden rounded-2xl shadow-2xl border border-brand-beige dark:border-brand-beige/20">
            <div className="flex justify-between items-center p-6 border-b border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <h3 className="font-bold text-lg text-brand-charcoal dark:text-brand-offwhite uppercase tracking-widest">Bulk Add Food (Form)</h3>
              <button onClick={closeBulkUiModal} className="btn btn-sm btn-circle btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite"><FiX size={18} /></button>
            </div>

            <div className="p-6 max-h-[65vh] overflow-y-auto overflow-x-auto bg-gray-50 dark:bg-brand-charcoal/30">
              <table className="table table-xs w-full bg-white dark:bg-brand-charcoal shadow-sm rounded-xl">
                <thead className="bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="py-3 px-2 w-48">Food Name *</th>
                    <th className="py-3 px-2 w-48">Category</th>
                    <th className="py-3 px-2 w-24">Image</th>
                    <th className="py-3 px-2 w-32">Type</th>
                    <th className="py-3 px-2 w-24">Price *</th>
                    <th className="py-3 px-2 w-16 text-center">VAT</th>
                    <th className="py-3 px-2 w-16 text-center">SC</th>
                    <th className="py-3 px-2 w-16 text-center">SD</th>
                    <th className="py-3 px-2 w-16 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkUiFormData.map((row, index) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.foodName}
                          onChange={(e) => handleBulkUiChange(row.id, 'foodName', e.target.value)}
                          className="input input-bordered input-sm w-full text-xs bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite border-brand-primary/20 focus:border-brand-primary"
                          placeholder="Name"
                        />
                      </td>
                      <td className="p-2 min-w-[200px]">
                        <CreatableSelect
                          options={categoryOptions}
                          value={categoryOptions.find(option => option.value === row.category) || (row.category ? { label: row.category, value: row.category } : null)}
                          onChange={(selectedOption) => handleBulkUiChange(row.id, 'category', selectedOption ? selectedOption.value : "")}
                          isClearable
                          isSearchable
                          placeholder="Select Category"
                          styles={customSelectStyles}
                          className="text-xs text-brand-charcoal"
                          menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                          menuPosition="fixed"
                        />
                      </td>
                      <td className="p-2 text-center align-middle">
                        {row.isUploadingImage ? (
                          <span className="loading loading-spinner loading-xs text-brand-primary"></span>
                        ) : row.image ? (
                          <div className="relative w-8 h-8 group mx-auto">
                            <img src={row.image} alt="preview" className="w-full h-full object-cover rounded shadow-sm border border-brand-beige/50" />
                            <button onClick={() => handleBulkUiChange(row.id, 'image', '')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <FiX size={10} />
                            </button>
                          </div>
                        ) : (
                          <label className="btn btn-xs btn-circle btn-ghost text-brand-primary hover:bg-brand-primary/10 cursor-pointer">
                            <FiUpload size={14} />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBulkImageUpload(row.id, e)} />
                          </label>
                        )}
                      </td>
                      <td className="p-2">
                        <select
                          value={row.foodType}
                          onChange={(e) => handleBulkUiChange(row.id, 'foodType', e.target.value)}
                          className="select select-bordered select-sm w-full text-xs bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite border-brand-primary/20 focus:border-brand-primary"
                        >
                          {foodTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={row.price}
                          onChange={(e) => handleBulkUiChange(row.id, 'price', e.target.value)}
                          className="input input-bordered input-sm w-full text-xs bg-white dark:bg-brand-charcoal/50 text-brand-charcoal dark:text-brand-offwhite border-brand-primary/20 focus:border-brand-primary"
                          placeholder="Price"
                          min="0"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.vat > 0}
                          onChange={(e) => handleBulkUiChange(row.id, 'vat', e.target.checked ? chargeSettings?.vat?.value || 0 : 0)}
                          className="toggle toggle-sm bg-brand-primary"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.sc > 0}
                          onChange={(e) => handleBulkUiChange(row.id, 'sc', e.target.checked ? chargeSettings?.sc?.value || 0 : 0)}
                          className="toggle toggle-sm bg-brand-primary"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.sd > 0}
                          onChange={(e) => handleBulkUiChange(row.id, 'sd', e.target.checked ? chargeSettings?.sd?.value || 0 : 0)}
                          className="toggle toggle-sm bg-brand-primary"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button onClick={() => handleRemoveBulkUiRow(row.id)} className="btn btn-xs btn-circle btn-ghost text-red-500 hover:bg-red-50">
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex justify-center">
                <button onClick={handleAddBulkUiRow} className="btn btn-sm bg-white text-brand-primary border-brand-primary hover:bg-brand-primary hover:text-white hover:border-brand-primary rounded-full gap-2 shadow-sm">
                  <FiPlus /> Add Another Item
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-brand-beige dark:border-brand-beige/20 bg-brand-offwhite dark:bg-brand-charcoal/50">
              <button onClick={closeBulkUiModal} className="btn btn-ghost hover:bg-brand-beige dark:hover:bg-brand-offwhite/10 text-brand-charcoal dark:text-brand-offwhite font-bold uppercase tracking-widest text-xs px-6">Cancel</button>
              <button onClick={handleBulkUiSubmit} disabled={isBulkSubmitting} className="btn bg-brand-primary text-white hover:bg-brand-secondary border-none font-bold uppercase tracking-widest text-xs px-8 shadow-md">
                {isBulkSubmitting ? 'Saving...' : 'Save All Items'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeBulkUiModal}>close</button>
          </form>
        </dialog>
      )}

    </div>
  );
};

export default FoodPage;
