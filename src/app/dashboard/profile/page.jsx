"use client";

import React, { useState, useContext, useEffect } from "react";
import { FiUser, FiLock, FiSave, FiMail, FiMapPin, FiBriefcase, FiCheckCircle, FiUploadCloud, FiPhone, FiFolder } from "react-icons/fi";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import { AuthContext } from "@/providers/AuthProvider";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import Mtitle from "@/components/Comon/Mtitle";
import ImageUpload from "@/components/Comon/ImageUpload";
import usePagePermission from "@/hooks/usePagePermission";

const UserProfile = () => {
  const { user, setUser } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  const { canEdit } = usePagePermission();

  const [activeTab, setActiveTab] = useState("profile");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    department: ""
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        mobileNumber: user.mobileNumber || "",
        department: user.department || ""
      });
      setPhotoUrl(user.photo || "");
    }
  }, [user]);

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleImageUploadComplete = (url) => {
    if (url) {
      setPhotoUrl(url);
      Swal.fire({
        icon: "success",
        title: "Photo Uploaded!",
        text: 'Click "Save Changes" to apply this profile photo.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    } else {
      console.error("Image URL from upload component is undefined!");
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "You do not have permission to modify profile settings."
      });
      return;
    }
    if (!profileData.name.trim() || !profileData.email.trim() || !profileData.mobileNumber.trim()) {
      Swal.fire({ icon: "warning", title: "Validation Alert", text: "Name, Email, and Mobile Number fields are required!" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email.trim())) {
      Swal.fire({ icon: "error", title: "Invalid Email", text: "Please enter a valid email address!" });
      return;
    }
    setIsProfileSaving(true);

    const { email, ...payload } = profileData;
    if (photoUrl !== user.photo) {
      payload.photo = photoUrl;
    }

    try {
      const response = await axiosSecure.put(`/user/update/${user._id}`, payload);
      const data = response.data;

      // Update local storage/context with new user details
      setUser(prevUser => {
        const updatedUser = { ...prevUser, ...data };
        if (typeof window !== "undefined") {
          localStorage.setItem("authUser", JSON.stringify(updatedUser));
        }
        return updatedUser;
      });

      Swal.fire({
        icon: "success",
        title: "Profile Updated!",
        text: "Your details have been successfully updated.",
      });
    } catch (error) {
      console.error("Profile update error:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.response?.data?.error || error.response?.data?.message || "Failed to update profile. Please try again."
      });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "You do not have permission to modify password credentials."
      });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Swal.fire({ icon: "error", title: "Passwords Mismatch", text: "New password and confirmation password do not match!" });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      Swal.fire({ icon: "warning", title: "Weak Password", text: "New password must be at least 6 characters long!" });
      return;
    }
    setIsPasswordSaving(true);
    try {
      const { data } = await axiosSecure.put("/user/change-password", passwordData);
      Swal.fire({
        icon: "success",
        title: "Password Changed!",
        text: data.message || "Your password was changed successfully.",
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Change Failed",
        text: error.response?.data?.error || error.response?.data?.message || "Failed to change password. Make sure current password is correct."
      });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-brand-offwhite dark:bg-brand-charcoal/30">
        <span className="loading loading-spinner loading-lg text-brand-primary"></span>
        <p className="mt-4 text-brand-dark-grey dark:text-brand-sage font-medium animate-pulse">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-offwhite dark:bg-brand-charcoal/30 min-h-screen p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-300">

      {/* --- Title Area --- */}
      <div className="w-full mx-auto mb-8 pb-4 border-b border-brand-beige/50 dark:border-brand-dark-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-brand-primary to-brand-secondary dark:from-brand-sage dark:to-brand-offwhite bg-clip-text text-transparent">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-brand-dark-grey dark:text-brand-sage">
          Manage your public profile settings and update credentials.
        </p>
      </div>

      <div className="w-full mx-auto flex flex-col xl:flex-row gap-8 items-start">

        {/* --- Left Profile Card --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="w-full xl:w-1/3 bg-brand-white dark:bg-brand-charcoal border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-3xl p-6 shadow-xl flex flex-col items-center relative overflow-hidden"
        >
          {/* Background banner */}
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-brand-primary to-brand-secondary opacity-95 z-0"></div>

          {/* Avatar Container */}
          <div className="relative z-10 mt-6 mb-4">
            <div className="w-28 h-28 rounded-full ring-4 ring-brand-white dark:ring-brand-charcoal overflow-hidden shadow-lg bg-brand-white flex items-center justify-center">
              <img
                src={photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=346E36&color=fff&size=128`}
                alt="User Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-1 bg-brand-primary text-brand-white rounded-full p-1 border-2 border-brand-white dark:border-brand-charcoal shadow-md">
              <FiCheckCircle className="text-xs" />
            </div>
          </div>

          <div className="text-center z-10 w-full">
            <h2 className="text-xl font-bold text-brand-charcoal dark:text-brand-offwhite tracking-tight">{user.name}</h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-sage mt-2">
              <FiBriefcase className="text-xs" /> {user.role || "Member"}
            </span>

            <div className="w-full border-t border-brand-beige/20 dark:border-brand-dark-grey/25 my-5"></div>

            <div className="text-left space-y-4 text-sm w-full">
              <div className="flex items-center gap-3 text-brand-charcoal dark:text-brand-offwhite">
                <FiMail className="text-brand-primary dark:text-brand-sage flex-shrink-0 text-base" />
                <span className="truncate">{user.email}</span>
              </div>

              <div className="flex items-center gap-3 text-brand-charcoal dark:text-brand-offwhite">
                <FiPhone className="text-brand-primary dark:text-brand-sage flex-shrink-0 text-base" />
                <span>{user.mobileNumber || "N/A"}</span>
              </div>

              <div className="flex items-center gap-3 text-brand-charcoal dark:text-brand-offwhite">
                <FiFolder className="text-brand-primary dark:text-brand-sage flex-shrink-0 text-base" />
                <span className="capitalize">{user.department || "General"}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider font-semibold">Account Status: </span>
                <span className="capitalize badge bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-emerald-250/20 badge-sm font-bold shadow-sm">{user.status || "Active"}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- Right Settings Card --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.1 }}
          className="w-full xl:w-2/3 bg-brand-white dark:bg-brand-charcoal border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-3xl p-6 lg:p-8 shadow-xl"
        >
          {/* Tabs Navigation */}
          <div className="flex bg-brand-offwhite dark:bg-brand-charcoal/50 border border-brand-beige/10 dark:border-brand-dark-grey/10 p-1.5 rounded-2xl mb-8 w-full sm:max-w-md">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${activeTab === "profile"
                ? "bg-brand-white dark:bg-brand-dark-grey text-brand-primary dark:text-brand-white shadow-sm border border-brand-beige/10 dark:border-brand-dark-grey/10"
                : "text-brand-dark-grey dark:text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite"
                }`}
            >
              <FiUser className="text-base" /> Profile Details
            </button>
            <button
              onClick={() => setActiveTab("password")}
              className={`flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${activeTab === "password"
                ? "bg-brand-white dark:bg-brand-dark-grey text-brand-primary dark:text-brand-white shadow-sm border border-brand-beige/10 dark:border-brand-dark-grey/10"
                : "text-brand-dark-grey dark:text-brand-sage hover:text-brand-charcoal dark:hover:text-brand-offwhite"
                }`}
            >
              <FiLock className="text-base" /> Security & Password
            </button>
          </div>

          {/* Tab Panels */}
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.form
                key="profile-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleProfileSubmit}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control w-full">
                    <label className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-dark-grey border-brand-beige/50 dark:border-brand-dark-grey/50 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite"
                      required
                    />
                  </div>
                  <div className="form-control w-full">
                    <label className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage flex items-center gap-1.5">
                      Email Address
                      <span className="text-[10px] bg-brand-beige/50 dark:bg-brand-dark-grey px-2 py-0.5 rounded-full text-brand-dark-grey dark:text-brand-sage font-medium">Locked</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={profileData.email}
                        className="input input-bordered w-full bg-brand-offwhite/50 dark:bg-brand-dark-grey border-brand-beige/50 dark:border-brand-dark-grey/50 focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite opacity-70 cursor-not-allowed pr-10"
                        readOnly
                      />
                      <FiLock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-dark-grey/50 text-base" />
                    </div>
                    <p className="text-xs text-brand-dark-grey/70 dark:text-brand-sage/70 mt-1.5">
                      Email address is linked to your account credentials and cannot be changed.
                    </p>
                  </div>
                  <div className="form-control w-full">
                    <label className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Mobile Number</label>
                    <input
                      type="text"
                      name="mobileNumber"
                      value={profileData.mobileNumber}
                      onChange={handleProfileChange}
                      className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-dark-grey border-brand-beige/50 dark:border-brand-dark-grey/50 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite"
                      required
                    />
                  </div>
                  <div className="form-control w-full">
                    <label className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Department</label>
                    <input
                      type="text"
                      name="department"
                      value={profileData.department}
                      className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-dark-grey border-brand-beige/50 dark:border-brand-dark-grey/50 focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite opacity-70 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                </div>

                <div className="p-4 bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/10 dark:border-brand-primary/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <span className="font-semibold text-brand-charcoal dark:text-brand-offwhite text-sm flex items-center gap-1.5">
                      <FiUploadCloud className="text-brand-primary dark:text-brand-sage" /> Profile Picture Upload
                    </span>
                    <p className="text-xs text-brand-dark-grey dark:text-brand-sage mt-1 leading-relaxed">
                      Recommended size: 1:1 square. Supports JPG, JPEG, and PNG formats.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <ImageUpload setImageUrl={handleImageUploadComplete} label="Select Avatar File" />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-brand-beige/20 dark:border-brand-dark-grey/25">
                  <button
                    type="submit"
                    className="btn bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-secondary hover:to-brand-primary text-brand-white border-none rounded-xl px-6 py-2.5 flex items-center gap-2 shadow-lg shadow-brand-primary/20 font-semibold text-sm transition-all duration-300 disabled:opacity-50 active:scale-95 cursor-pointer"
                    disabled={isProfileSaving || !canEdit}
                  >
                    {isProfileSaving ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <><FiSave className="text-base" /> Save Details</>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {activeTab === "password" && (
              <motion.form
                key="password-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handlePasswordSubmit}
                className="space-y-6"
              >
                <div className="form-control w-full">
                  <label className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-dark-grey border-brand-beige/50 dark:border-brand-dark-grey/50 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite"
                    required
                  />
                </div>

                <div className="form-control w-full">
                  <label className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-dark-grey border-brand-beige/50 dark:border-brand-dark-grey/50 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite"
                    required
                  />
                </div>

                <div className="form-control w-full">
                  <label className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="input input-bordered bg-brand-offwhite/50 dark:bg-brand-dark-grey border-brand-beige/50 dark:border-brand-dark-grey/50 focus:border-brand-primary focus:outline-none rounded-xl text-sm text-brand-charcoal dark:text-brand-offwhite"
                    required
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-brand-beige/20 dark:border-brand-dark-grey/25">
                  <button
                    type="submit"
                    className="btn bg-gradient-to-r from-brand-bronze to-brand-secondary hover:from-brand-secondary hover:to-brand-bronze text-brand-white border-none rounded-xl px-6 py-2.5 flex items-center gap-2 shadow-lg shadow-brand-bronze/20 font-semibold text-sm transition-all duration-300 disabled:opacity-50 active:scale-95 cursor-pointer"
                    disabled={isPasswordSaving || !canEdit}
                  >
                    {isPasswordSaving ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <><FiLock className="text-base" /> Change Password</>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
};

export default UserProfile;
