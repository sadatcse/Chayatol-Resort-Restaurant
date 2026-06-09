"use client";

import React, { useState, useEffect, useContext } from "react";
import { FiSave, FiMail, FiMapPin, FiBriefcase, FiCheckCircle, FiUploadCloud, FiPhone, FiGlobe, FiLink, FiFileText } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import { AuthContext } from "@/providers/AuthProvider";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import SectionHeader from "@/components/Comon/SectionHeader";
import ImageUpload from "@/components/Comon/ImageUpload";

const INITIAL_FORM_DATA = {
  name: "",
  phone: "",
  email: "",
  ownerEmail: "",
  address: "",
  logo: "",
  otherInformation: "",
  website: "",
  binNumber: "",
  tinNumber: ""
};

const CompanySettingsPage = () => {
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();

  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  const fetchCompanyData = async () => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get("/company");
      const data = response.data;
      if (data && data.length > 0) {
        const comp = data[0];
        setCompanyId(comp._id);
        setFormData({
          name: comp.name || "",
          phone: comp.phone || "",
          email: comp.email || "",
          ownerEmail: comp.ownerEmail || "",
          address: comp.address || "",
          logo: comp.logo || "",
          otherInformation: comp.otherInformation || "",
          website: comp.website || "",
          binNumber: comp.binNumber || "",
          tinNumber: comp.tinNumber || ""
        });
      } else {
        setCompanyId(null);
        setFormData({ ...INITIAL_FORM_DATA });
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCompanyData();
    }
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoUploadComplete = (url) => {
    if (url) {
      setFormData(prev => ({ ...prev, logo: url }));
      Swal.fire({
        icon: "success",
        title: "Logo Uploaded!",
        text: 'Click "Save Details" to apply this company logo.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // 1. Validation: Name
    if (!formData.name.trim()) {
      setActiveTab("general");
      Swal.fire({ icon: "warning", title: "Validation Alert", text: "Company Name is required!" });
      return;
    }

    // 2. Validation: Phone
    if (!formData.phone.trim()) {
      setActiveTab("general");
      Swal.fire({ icon: "warning", title: "Validation Alert", text: "Company Phone Number is required!" });
      return;
    }
    const phoneRegex = /^\+?[0-9\s\-]{8,16}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      setActiveTab("general");
      Swal.fire({ icon: "warning", title: "Validation Alert", text: "Please enter a valid phone number (8-16 digits)!" });
      return;
    }

    // 3. Validation: Email
    if (!formData.email.trim()) {
      setActiveTab("general");
      Swal.fire({ icon: "warning", title: "Validation Alert", text: "Company Email Address is required!" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setActiveTab("general");
      Swal.fire({ icon: "warning", title: "Validation Alert", text: "Please enter a valid company email address!" });
      return;
    }

    // 4. Validation: Owner Email
    if (!formData.ownerEmail.trim()) {
      setActiveTab("general");
      Swal.fire({ icon: "warning", title: "Validation Alert", text: "Owner Email Address is required!" });
      return;
    }
    if (!emailRegex.test(formData.ownerEmail.trim())) {
      setActiveTab("general");
      Swal.fire({ icon: "warning", title: "Validation Alert", text: "Please enter a valid owner email address!" });
      return;
    }

    // 5. Validation: Address
    if (!formData.address.trim()) {
      setActiveTab("general");
      Swal.fire({ icon: "warning", title: "Validation Alert", text: "Company Address is required!" });
      return;
    }

    // 6. Validation: Website (optional check)
    if (formData.website && formData.website.trim()) {
      if (!formData.website.includes(".") || formData.website.length < 4) {
        setActiveTab("general");
        Swal.fire({
          icon: "warning",
          title: "Validation Alert",
          text: "Please enter a valid website link (e.g. www.company.com)."
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      if (companyId) {
        await axiosSecure.put(`/company/update/${companyId}`, formData);
      } else {
        const response = await axiosSecure.post("/company/post", formData);
        setCompanyId(response.data._id);
      }
      Swal.fire({
        icon: "success",
        title: "Settings Saved!",
        text: "Company settings have been successfully updated.",
        confirmButtonColor: "#346E36"
      });
      fetchCompanyData();
    } catch (error) {
      console.error("Save company error:", error);
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: error.response?.data?.message || "Failed to save company settings."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canPerformAction = user?.role === "admin" || user?.role === "superadmin";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-brand-offwhite dark:bg-brand-charcoal/30">
        <span className="loading loading-spinner loading-lg text-brand-primary"></span>
        <p className="mt-4 text-brand-dark-grey dark:text-brand-sage font-medium animate-pulse">Loading company settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-offwhite dark:bg-brand-charcoal/30 min-h-screen p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-300">
      


      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 items-start mt-6">
        
        {/* Left Company Banner Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="w-full lg:w-1/3 bg-white dark:bg-brand-charcoal border border-brand-beige/50 dark:border-brand-beige/20 rounded-3xl p-6 shadow-xl flex flex-col items-center relative overflow-hidden"
        >
          {/* Top Banner Gradient */}
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-brand-primary to-brand-secondary opacity-95 z-0"></div>

          {/* Logo Brand Upload/Display */}
          <div className="relative z-10 mt-6 mb-4">
            <div className="w-28 h-28 rounded-2xl ring-4 ring-white dark:ring-brand-charcoal overflow-hidden shadow-lg bg-white dark:bg-brand-charcoal flex items-center justify-center">
              {formData.logo ? (
                <img 
                  src={formData.logo} 
                  alt="Company Logo" 
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <span className="text-3xl font-extrabold text-brand-primary dark:text-brand-sage uppercase">
                  {formData.name ? formData.name.substring(0, 2) : "CO"}
                </span>
              )}
            </div>
            {formData.name && (
              <div className="absolute bottom-0 right-1 bg-brand-primary text-white rounded-full p-1 border-2 border-white dark:border-brand-charcoal shadow-md">
                <FiCheckCircle className="text-xs" />
              </div>
            )}
          </div>

          <div className="text-center z-10 w-full">
            <h2 className="text-xl font-bold text-brand-charcoal dark:text-brand-offwhite tracking-tight truncate max-w-full" title={formData.name || "Configure Company"}>
              {formData.name || "Configure Company"}
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-sage mt-2">
              <FiBriefcase className="text-xs" /> General Settings
            </span>
            
            <div className="w-full border-t border-brand-beige/25 dark:border-brand-beige/10 my-5"></div>

            <div className="text-left space-y-4 text-sm w-full">
              <div className="flex items-center gap-3 text-brand-charcoal dark:text-brand-offwhite">
                <FiMail className="text-brand-primary dark:text-brand-sage flex-shrink-0 text-base" />
                <span className="truncate" title={formData.email || "No email"}>{formData.email || "No email"}</span>
              </div>

              <div className="flex items-center gap-3 text-brand-charcoal dark:text-brand-offwhite">
                <FiPhone className="text-brand-primary dark:text-brand-sage flex-shrink-0 text-base" />
                <span className="font-mono">{formData.phone || "No phone"}</span>
              </div>

              {formData.website && (
                <div className="flex items-center gap-3 text-brand-charcoal dark:text-brand-offwhite">
                  <FiGlobe className="text-brand-primary dark:text-brand-sage flex-shrink-0 text-base" />
                  <a 
                    href={formData.website.startsWith("http") ? formData.website : `https://${formData.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="truncate hover:underline text-brand-primary dark:text-brand-sage font-mono"
                  >
                    {formData.website}
                  </a>
                </div>
              )}

              <div className="flex items-center gap-3 text-brand-charcoal dark:text-brand-offwhite">
                <FiMapPin className="text-brand-primary dark:text-brand-sage flex-shrink-0 text-base" />
                <span className="truncate" title={formData.address || "No address"}>{formData.address || "No address"}</span>
              </div>

              <div className="w-full border-t border-brand-beige/20 dark:border-brand-beige/10 my-2"></div>
              
              <div className="space-y-1.5 text-xs text-brand-dark-grey dark:text-brand-sage/80 font-mono">
                <div><span className="font-bold text-brand-primary dark:text-brand-sage mr-1">BIN:</span> {formData.binNumber || "Not Configured"}</div>
                <div><span className="font-bold text-brand-primary dark:text-brand-sage mr-1">TIN:</span> {formData.tinNumber || "Not Configured"}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Form Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.1 }}
          className="w-full lg:w-2/3 bg-white dark:bg-brand-charcoal border border-brand-beige/50 dark:border-brand-beige/20 rounded-3xl p-6 lg:p-8 shadow-xl"
        >
          {/* Tabs Navigation */}
          <div className="flex bg-brand-offwhite dark:bg-brand-charcoal/50 border border-brand-beige/10 dark:border-brand-beige/10 p-1.5 rounded-2xl mb-8 w-full sm:max-w-md">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === "general" 
                  ? "bg-white dark:bg-brand-charcoal text-brand-primary dark:text-white shadow-sm border border-brand-beige/10 dark:border-brand-beige/10 font-bold" 
                  : "text-brand-dark-grey dark:text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite"
              }`}
            >
              <FiBriefcase className="text-base" /> General Profile
            </button>
            <button
              onClick={() => setActiveTab("taxAndMedia")}
              className={`flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === "taxAndMedia" 
                  ? "bg-white dark:bg-brand-charcoal text-brand-primary dark:text-white shadow-sm border border-brand-beige/10 dark:border-brand-beige/10 font-bold" 
                  : "text-brand-dark-grey dark:text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite"
              }`}
            >
              <FiFileText className="text-base" /> Tax & Branding
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === "general" && (
                <motion.div 
                  key="general-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control w-full col-span-2">
                      <label className="label font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Company Name *</label>
                      <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border-brand-beige/50 dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite" 
                        required
                        disabled={!canPerformAction}
                      />
                    </div>
                    <div className="form-control w-full">
                      <label className="label font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Company Phone *</label>
                      <input 
                        type="text" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                        className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border-brand-beige/50 dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite font-mono" 
                        required
                        disabled={!canPerformAction}
                      />
                    </div>
                    <div className="form-control w-full">
                      <label className="label font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Company Email *</label>
                      <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border-brand-beige/50 dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite" 
                        required
                        disabled={!canPerformAction}
                      />
                    </div>
                    <div className="form-control w-full">
                      <label className="label font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Owner's Email Address *</label>
                      <input 
                        type="email" 
                        name="ownerEmail" 
                        value={formData.ownerEmail} 
                        onChange={handleInputChange} 
                        className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border-brand-beige/50 dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite" 
                        required
                        disabled={!canPerformAction}
                      />
                    </div>
                    <div className="form-control w-full">
                      <label className="label font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Website URL</label>
                      <input 
                        type="text" 
                        name="website" 
                        value={formData.website} 
                        onChange={handleInputChange} 
                        className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border-brand-beige/50 dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite font-mono" 
                        disabled={!canPerformAction}
                      />
                    </div>
                    <div className="form-control w-full col-span-2">
                      <label className="label font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Physical Address *</label>
                      <textarea 
                        name="address" 
                        value={formData.address} 
                        onChange={handleInputChange} 
                        className="textarea textarea-bordered bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border-brand-beige/50 dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite h-20" 
                        required
                        disabled={!canPerformAction}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "taxAndMedia" && (
                <motion.div 
                  key="taxAndMedia-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control w-full">
                      <label className="label font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">BIN Number</label>
                      <input 
                        type="text" 
                        name="binNumber" 
                        value={formData.binNumber} 
                        onChange={handleInputChange} 
                        className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border-brand-beige/50 dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite font-mono" 
                        disabled={!canPerformAction}
                      />
                    </div>
                    <div className="form-control w-full">
                      <label className="label font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">TIN Number</label>
                      <input 
                        type="text" 
                        name="tinNumber" 
                        value={formData.tinNumber} 
                        onChange={handleInputChange} 
                        className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border-brand-beige/50 dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite font-mono" 
                        disabled={!canPerformAction}
                      />
                    </div>
                    <div className="form-control w-full col-span-2">
                      <label className="label font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Other Information</label>
                      <textarea 
                        name="otherInformation" 
                        value={formData.otherInformation} 
                        onChange={handleInputChange} 
                        className="textarea textarea-bordered bg-brand-offwhite/50 dark:bg-brand-charcoal/50 border-brand-beige/50 dark:border-brand-beige/20 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite h-20" 
                        disabled={!canPerformAction}
                      />
                    </div>
                  </div>

                  {canPerformAction && (
                    <div className="p-4 bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/10 dark:border-brand-primary/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <span className="font-semibold text-brand-charcoal dark:text-brand-offwhite text-sm flex items-center gap-1.5">
                          <FiUploadCloud className="text-brand-primary dark:text-brand-sage" /> Company Logo Upload
                        </span>
                        <p className="text-xs text-brand-dark-grey dark:text-brand-sage mt-1 leading-relaxed">
                          Recommended format: square PNG/SVG with transparent background.
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <ImageUpload setImageUrl={handleLogoUploadComplete} label="Select Logo File" />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {canPerformAction && (
              <div className="flex justify-end pt-4 border-t border-brand-beige/20 dark:border-brand-beige/10">
                <button 
                  type="submit" 
                  className="btn bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-secondary hover:to-brand-primary text-white border-none rounded-xl px-6 py-2.5 flex items-center gap-2 shadow-lg shadow-brand-primary/20 font-semibold text-sm transition-all duration-300 disabled:opacity-50 active:scale-95 cursor-pointer" 
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <><FiSave className="text-base" /> Save Details</>
                  )}
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CompanySettingsPage;
