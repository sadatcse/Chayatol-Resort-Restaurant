"use client";

import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { toast } from "react-toastify";
import { 
  FiUser, FiLock, FiPlus, FiEdit2, FiTrash2, FiEye, 
  FiSearch, FiShield, FiCheckCircle, FiChevronDown, 
  FiChevronUp, FiInfo, FiActivity, FiRefreshCw, FiUnlock, FiCheck
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import menuItems from "@/components/MenuItems";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import useGetRoles from "@/hooks/useGetRoles";
import MtableLoading from "@/components/Comon/MtableLoading";

const PermissionItem = ({ item, groupName, role, initialPermissions, onPermissionChange }) => {
  const [perms, setPerms] = useState(initialPermissions);
  const [savingAction, setSavingAction] = useState(null);
  const axiosSecure = useAxiosSecure();

  useEffect(() => {
    setPerms(initialPermissions);
  }, [initialPermissions]);

  const handleToggle = async (action) => {
    const updatedVal = !perms[action];
    const newPerms = { ...perms, [action]: updatedVal };
    setPerms(newPerms);
    setSavingAction(action);

    const permissionPayload = {
      title: item.title,
      role,
      group_name: groupName,
      path: item.path,
      canView: action === "canView" ? updatedVal : perms.canView,
      canAdd: action === "canAdd" ? updatedVal : perms.canAdd,
      canEdit: action === "canEdit" ? updatedVal : perms.canEdit,
      canDelete: action === "canDelete" ? updatedVal : perms.canDelete,
    };

    try {
      await axiosSecure.put(`/permissions`, permissionPayload);
      if (onPermissionChange) onPermissionChange();
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Update failed. Please try again.");
      setPerms(perms); // rollback
    } finally {
      setTimeout(() => setSavingAction(null), 800);
    }
  };

  const actions = [
    { key: "canView", label: "View Access", icon: <FiEye size={14} />, color: "text-blue-500", activeColor: "text-blue-600 dark:text-blue-400" },
    { key: "canAdd", label: "Create Action", icon: <FiPlus size={14} />, color: "text-emerald-500", activeColor: "text-emerald-600 dark:text-emerald-400" },
    { key: "canEdit", label: "Update Action", icon: <FiEdit2 size={14} />, color: "text-amber-500", activeColor: "text-amber-600 dark:text-amber-400" },
    { key: "canDelete", label: "Delete Action", icon: <FiTrash2 size={14} />, color: "text-rose-500", activeColor: "text-rose-600 dark:text-rose-400" }
  ];

  return (
    <motion.div 
      layout
      className="bg-brand-white dark:bg-brand-charcoal/80 p-5 rounded-2xl border border-brand-beige/30 dark:border-brand-dark-grey/40 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
    >
      <div className="flex justify-between items-start mb-4 border-b border-brand-beige/10 dark:border-brand-dark-grey/10 pb-3 gap-2">
        <span className="font-extrabold text-sm uppercase tracking-wider text-brand-charcoal dark:text-brand-offwhite">
          {item.title}
        </span>
        <span className="text-[10px] font-mono text-brand-dark-grey/50 dark:text-brand-sage/50 bg-brand-offwhite/50 dark:bg-brand-dark-grey/30 px-2 py-0.5 rounded-md truncate max-w-[150px]" title={item.path}>
          {item.path}
        </span>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {actions.map((act) => {
          const isAllowed = !!perms[act.key];
          const isSaving = savingAction === act.key;

          return (
            <div 
              key={act.key}
              className="flex items-center justify-between py-2 border-b border-brand-beige/10 dark:border-brand-dark-grey/10 last:border-none gap-4"
            >
              <div className="flex items-center gap-2.5">
                <span className={isAllowed ? act.activeColor : "text-brand-dark-grey/40 dark:text-brand-sage/40"}>
                  {act.icon}
                </span>
                <span className="text-xs font-bold text-brand-charcoal dark:text-brand-offwhite/90">
                  {act.label}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Status Badge */}
                <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                  isAllowed 
                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" 
                    : "bg-brand-dark-grey/10 text-brand-dark-grey/60 dark:bg-brand-dark-grey/25 dark:text-brand-sage/60"
                }`}>
                  {isAllowed ? "Allowed" : "Restricted"}
                </span>
                
                {/* Switch Toggle */}
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAllowed}
                    onChange={() => handleToggle(act.key)}
                    className="sr-only peer"
                    disabled={isSaving}
                  />
                  <div className="w-8 h-4 bg-brand-beige/60 dark:bg-brand-dark-grey/60 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#346E36]"></div>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const UserPermission = () => {
  const [role, setRole] = useState("admin");
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [autoSaveActive, setAutoSaveActive] = useState(false);

  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  const availableRoles = useGetRoles();

  const fetchPermissions = useCallback(async (isSilent = false) => {
    if (!role) return;
    if (!isSilent) setLoading(true);
    try {
      const response = await axiosSecure.get(`/permissions/${role}`);
      setPermissions(response.data.routesData || []);
      if (isSilent) {
        setAutoSaveActive(true);
        const timer = setTimeout(() => setAutoSaveActive(false), 2000);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setPermissions([]);
      toast.error("Could not fetch permissions.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [role, axiosSecure]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const getRoutePermissions = useCallback((path) => {
    const perm = permissions.find(p => p.path === path);
    return {
      canView: perm?.canView ?? perm?.isAllowed ?? false,
      canAdd: perm?.canAdd ?? false,
      canEdit: perm?.canEdit ?? false,
      canDelete: perm?.canDelete ?? false,
    };
  }, [permissions]);

  // Statistics summaries
  const stats = useMemo(() => {
    let allowedViewCount = 0;
    let allowedAddCount = 0;
    let allowedEditCount = 0;
    let allowedDeleteCount = 0;

    permissions.forEach((p) => {
      if (p.canView || p.isAllowed) allowedViewCount++;
      if (p.canAdd) allowedAddCount++;
      if (p.canEdit) allowedEditCount++;
      if (p.canDelete) allowedDeleteCount++;
    });

    return {
      totalConfigured: permissions.length,
      allowedViewCount,
      allowedAddCount,
      allowedEditCount,
      allowedDeleteCount,
    };
  }, [permissions]);

  const allMenuItems = useMemo(() => menuItems(), []);

  // Filter menu items by search query
  const filteredMenuItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allMenuItems;

    return allMenuItems.map(group => {
      const groupMatches = group.title.toLowerCase().includes(query);
      
      const filteredChildren = group.children 
        ? group.children.filter(child => child.title.toLowerCase().includes(query) || child.path.toLowerCase().includes(query))
        : [];

      const childrenMatch = filteredChildren.length > 0;

      if (groupMatches) {
        return group;
      } else if (childrenMatch) {
        return { ...group, children: filteredChildren };
      } else if (!group.children && group.path.toLowerCase().includes(query)) {
        return group;
      }
      return null;
    }).filter(Boolean);
  }, [searchQuery, allMenuItems]);

  // Toggle single category collapse
  const toggleGroup = (groupTitle) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  // Expand / collapse all groups
  const handleToggleAllGroups = (expand) => {
    const nextState = {};
    allMenuItems.forEach(group => {
      nextState[group.title] = expand;
    });
    setExpandedGroups(nextState);
  };

  // Group-level bulk/master permission toggling
  const handleBulkToggle = async (group, action, forceValue) => {
    const pathsToUpdate = [];
    if (group.children) {
      group.children.forEach(child => pathsToUpdate.push({ path: child.path, title: child.title }));
    } else {
      pathsToUpdate.push({ path: group.path, title: group.title });
    }

    try {
      setLoading(true);
      const updatePromises = pathsToUpdate.map(async (p) => {
        const currentPerms = getRoutePermissions(p.path);
        const permissionPayload = {
          title: p.title,
          role,
          group_name: group.title,
          path: p.path,
          canView: action === "canView" ? forceValue : currentPerms.canView,
          canAdd: action === "canAdd" ? forceValue : currentPerms.canAdd,
          canEdit: action === "canEdit" ? forceValue : currentPerms.canEdit,
          canDelete: action === "canDelete" ? forceValue : currentPerms.canDelete,
        };
        return axiosSecure.put(`/permissions`, permissionPayload);
      });

      await Promise.all(updatePromises);
      toast.success(`Bulk updated '${action.replace("can", "")}' for '${group.title}'.`);
      await fetchPermissions(false);
    } catch (error) {
      console.error("Bulk toggle error:", error);
      toast.error("Failed to apply bulk settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-brand-offwhite dark:bg-brand-charcoal/20 min-h-screen font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        
        {/* --- Header Area --- */}
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-brand-beige/50 dark:border-brand-dark-grey/50">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-brand-primary to-brand-secondary dark:from-brand-sage dark:to-brand-offwhite bg-clip-text text-transparent">
              Access Control & Permissions
            </h1>
            <p className="mt-1 text-sm text-brand-dark-grey dark:text-brand-sage">
              Configure route view, creation, update, and deletion permissions for each user role.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPermissions(false)}
              className="btn btn-sm bg-brand-white dark:bg-brand-charcoal border border-brand-beige dark:border-brand-dark-grey text-brand-primary dark:text-brand-sage rounded-xl flex items-center gap-2 hover:bg-brand-offwhite cursor-pointer px-4 h-10"
              title="Sync Permissions"
            >
              <FiRefreshCw className="text-base" /> Refresh
            </button>
          </div>
        </div>

        {/* --- Floating Save Alert --- */}
        <AnimatePresence>
          {autoSaveActive && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-[#346E36] text-white px-4 py-3 rounded-2xl shadow-xl border border-white/10"
            >
              <FiCheckCircle className="text-lg text-white" />
              <span className="text-xs font-semibold uppercase tracking-wider">Changes Autosaved</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Stats summaries --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-brand-white dark:bg-brand-charcoal border border-brand-beige/40 dark:border-brand-dark-grey/40 p-4 rounded-2xl shadow-sm text-center">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-sage mb-1">Configured Routes</span>
            <span className="text-2xl font-black text-brand-black dark:text-brand-offwhite">{stats.totalConfigured}</span>
          </div>
          <div className="bg-brand-white dark:bg-brand-charcoal border border-brand-beige/40 dark:border-brand-dark-grey/40 p-4 rounded-2xl shadow-sm text-center">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">View Allowed</span>
            <span className="text-2xl font-black text-blue-600">{stats.allowedViewCount}</span>
          </div>
          <div className="bg-brand-white dark:bg-brand-charcoal border border-brand-beige/40 dark:border-brand-dark-grey/40 p-4 rounded-2xl shadow-sm text-center">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Add Allowed</span>
            <span className="text-2xl font-black text-emerald-600">{stats.allowedAddCount}</span>
          </div>
          <div className="bg-brand-white dark:bg-brand-charcoal border border-brand-beige/40 dark:border-brand-dark-grey/40 p-4 rounded-2xl shadow-sm text-center">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">Edit Allowed</span>
            <span className="text-2xl font-black text-amber-600">{stats.allowedEditCount}</span>
          </div>
          <div className="bg-brand-white dark:bg-brand-charcoal border border-brand-beige/40 dark:border-brand-dark-grey/40 p-4 rounded-2xl shadow-sm text-center">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">Delete Allowed</span>
            <span className="text-2xl font-black text-rose-600">{stats.allowedDeleteCount}</span>
          </div>
        </div>

        {/* --- Controls Panel (Role Switcher & Search) --- */}
        <div className="bg-brand-white dark:bg-brand-charcoal p-6 rounded-3xl border border-brand-beige/50 dark:border-brand-dark-grey/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="form-control w-full max-w-xs">
            <label className="block mb-2 font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">
              Active User Role
            </label>
            <div className="relative">
              <select
                className="select select-bordered w-full bg-brand-offwhite/50 dark:bg-brand-dark-grey text-brand-charcoal dark:text-brand-offwhite border-brand-beige/50 dark:border-brand-dark-grey/50 focus:border-brand-primary focus:outline-none rounded-xl text-sm font-semibold capitalize cursor-pointer pl-10"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {availableRoles.map((r, i) => (
                  <option key={i} value={r} className="capitalize dark:bg-brand-charcoal">{r}</option>
                ))}
              </select>
              <FiShield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-primary text-base" />
            </div>
          </div>

          <div className="flex-1 max-w-md w-full relative">
            <label className="block mb-2 font-bold text-xs uppercase tracking-wider text-brand-dark-grey dark:text-brand-sage">
              Search Route Name or Path
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered w-full bg-brand-offwhite/50 dark:bg-brand-dark-grey text-brand-charcoal dark:text-brand-offwhite border-brand-beige/50 dark:border-brand-dark-grey/50 focus:border-brand-primary focus:outline-none rounded-xl text-sm pl-10"
              />
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-dark-grey/50 text-base" />
            </div>
          </div>
        </div>

        {/* --- Accordion Toggle Buttons --- */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-bold text-brand-sage uppercase tracking-widest">
            Category Panels ({filteredMenuItems.length})
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleToggleAllGroups(true)}
              className="text-xs font-bold text-brand-primary dark:text-brand-sage hover:underline cursor-pointer bg-transparent border-none"
            >
              Expand All
            </button>
            <span className="text-brand-beige">|</span>
            <button 
              onClick={() => handleToggleAllGroups(false)}
              className="text-xs font-bold text-brand-primary dark:text-brand-sage hover:underline cursor-pointer bg-transparent border-none"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* --- Permissions Accordions --- */}
        {loading ? (
          <MtableLoading />
        ) : (
          <div className="space-y-6">
            {filteredMenuItems.map((menuGroup) => {
              const isExpanded = !!expandedGroups[menuGroup.title];
              
              // Count view/write active inside this category
              const childrenList = menuGroup.children || [menuGroup];
              const activeCount = childrenList.filter(c => getRoutePermissions(c.path).canView).length;

              return (
                <div 
                  key={menuGroup.title} 
                  className="bg-brand-white dark:bg-brand-charcoal border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                >
                  
                  {/* Category Header */}
                  <div 
                    onClick={() => toggleGroup(menuGroup.title)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-brand-offwhite/50 dark:bg-brand-dark-grey/20 border-b border-brand-beige/20 dark:border-brand-dark-grey/20 cursor-pointer select-none gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-brand-primary/10 rounded-2xl text-brand-primary dark:text-brand-sage">
                        {menuGroup.icon}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-brand-black dark:text-brand-offwhite text-sm uppercase tracking-wider">
                          {menuGroup.title}
                        </h3>
                        <span className="text-[10px] font-bold text-brand-sage uppercase tracking-widest mt-0.5 block">
                          {activeCount} / {childrenList.length} Active Routes
                        </span>
                      </div>
                    </div>

                    {/* Master Toggles */}
                    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-bold text-brand-dark-grey dark:text-brand-sage uppercase tracking-wider mr-1">Bulk:</span>
                      
                      <button
                        onClick={() => handleBulkToggle(menuGroup, "canView", true)}
                        className="btn btn-xs bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-500 border-none rounded-lg text-[9px] uppercase font-bold tracking-wider cursor-pointer"
                      >
                        All View
                      </button>
                      <button
                        onClick={() => handleBulkToggle(menuGroup, "canAdd", true)}
                        className="btn btn-xs bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500 border-none rounded-lg text-[9px] uppercase font-bold tracking-wider cursor-pointer"
                      >
                        All Add
                      </button>
                      <button
                        onClick={() => handleBulkToggle(menuGroup, "canEdit", true)}
                        className="btn btn-xs bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-500 border-none rounded-lg text-[9px] uppercase font-bold tracking-wider cursor-pointer"
                      >
                        All Edit
                      </button>
                      <button
                        onClick={() => handleBulkToggle(menuGroup, "canDelete", true)}
                        className="btn btn-xs bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 border-none rounded-lg text-[9px] uppercase font-bold tracking-wider cursor-pointer"
                      >
                        All Delete
                      </button>
                      <button
                        onClick={() => {
                          // Clear all perms inside this category
                          setLoading(true);
                          const updatePromises = childrenList.map(async (c) => {
                            const permissionPayload = {
                              title: c.title,
                              role,
                              group_name: menuGroup.title,
                              path: c.path,
                              canView: false,
                              canAdd: false,
                              canEdit: false,
                              canDelete: false,
                            };
                            return axiosSecure.put(`/permissions`, permissionPayload);
                          });
                          Promise.all(updatePromises).then(() => {
                            toast.info(`Cleared all permissions inside ${menuGroup.title}.`);
                            fetchPermissions(false);
                          }).finally(() => setLoading(false));
                        }}
                        className="btn btn-xs bg-brand-dark-grey/10 hover:bg-brand-dark-grey hover:text-white text-brand-dark-grey dark:text-brand-sage border-none rounded-lg text-[9px] uppercase font-bold tracking-wider cursor-pointer"
                        title="Reset Category Permissions"
                      >
                        Reset All
                      </button>

                      <div className="w-px h-6 bg-brand-beige/50 dark:bg-brand-dark-grey/50 mx-2 hidden sm:block"></div>

                      <div className="text-brand-dark-grey/60 dark:text-brand-sage/60 hover:text-brand-primary">
                        {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* Category Children Container */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="p-6 bg-brand-offwhite/10 dark:bg-brand-charcoal/10 border-t border-brand-beige/10 dark:border-brand-dark-grey/10">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {childrenList.map((child) => (
                              <PermissionItem
                                key={child.path}
                                item={child}
                                groupName={menuGroup.title}
                                role={role}
                                initialPermissions={getRoutePermissions(child.path)}
                                onPermissionChange={() => fetchPermissions(true)}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default UserPermission;
