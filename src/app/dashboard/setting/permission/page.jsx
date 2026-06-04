"use client";

import React, { useState, useEffect, useCallback, useContext } from "react";
import { toast } from "react-toastify";
import menuItems from "@/components/MenuItems";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import { AuthContext } from "@/providers/AuthProvider";
import useGetRoles from "@/hooks/useGetRoles";
import MtableLoading from "@/components/Comon/MtableLoading"; 

const PermissionItem = ({ item, groupName, role, initialChecked, onPermissionChange }) => {
  const [isChecked, setIsChecked] = useState(initialChecked);
  const axiosSecure = useAxiosSecure();

  useEffect(() => {
    setIsChecked(initialChecked);
  }, [initialChecked]);

  const handleCheckboxChange = async (e) => {
    const checked = e.target.checked;
    setIsChecked(checked); 

    const permissionPayload = {
      title: item.title, 
      isAllowed: checked, 
      role,
      group_name: groupName, 
      path: item.path, 
    };
    
    try {
      await axiosSecure.put(`/permissions`, permissionPayload);
      toast.success(`Permission for '${item.title}' updated.`);
      if (onPermissionChange) onPermissionChange();
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Update failed. Please try again.");
      setIsChecked(!checked);
    }
  };

  return (
    <div className="form-control bg-brand-offwhite/50 dark:bg-brand-dark-grey/30 p-2.5 rounded-xl hover:bg-brand-offwhite dark:hover:bg-brand-dark-grey/60 transition-colors duration-200 border border-brand-beige/20 dark:border-brand-dark-grey/10">
      <label className="cursor-pointer label justify-between flex items-center">
        <span className="label-text text-sm font-medium text-brand-charcoal dark:text-brand-offwhite">{item.title}</span>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          className="checkbox border-brand-beige dark:border-brand-dark-grey [--chkbg:var(--color-brand-primary)] [--chkfg:var(--color-brand-white)]"
        />
      </label>
    </div>
  );
};

const UserPermission = () => {
  const [role, setRole] = useState("admin");
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  const availableRoles = useGetRoles();

  const fetchPermissions = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    try {
      const response = await axiosSecure.get(`/permissions/${role}`);
      setPermissions(response.data.routesData || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setPermissions([]);
      toast.error("Could not fetch permissions.");
    } finally {
      setLoading(false);
    }
  }, [role, axiosSecure]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const isRouteAllowed = (path) => {
    const permission = permissions.find(p => p.path === path);
    return permission ? permission.isAllowed : false;
  };

  const allMenuItems = menuItems();

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-brand-offwhite dark:bg-brand-charcoal/30 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="card bg-brand-white dark:bg-brand-charcoal shadow-xl border-t-4 border-brand-primary rounded-2xl overflow-hidden">
          <div className="card-body p-6">
            <h2 className="card-title text-2xl mb-4 text-brand-primary font-bold">Manage Role Permissions</h2>
            
            <div className="form-control w-full max-w-xs mb-6">
              <label className="label">
                <span className="label-text font-semibold text-brand-dark-grey dark:text-brand-sage">Select a Role to Configure</span>
              </label>
              <select
                className="select select-bordered bg-brand-offwhite/50 dark:bg-brand-dark-grey text-brand-charcoal dark:text-brand-offwhite border-brand-beige/50 dark:border-brand-dark-grey/50 focus:border-brand-primary focus:outline-none rounded-xl text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {availableRoles.map((r, i) => (
                  <option key={i} value={r} className="capitalize dark:bg-brand-charcoal">{r}</option>
                ))}
              </select>
            </div>
            
            {loading ? (
              <MtableLoading />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allMenuItems.map((menuGroup) => (
                  <div key={menuGroup.title} className="p-5 border border-brand-beige/30 dark:border-brand-dark-grey/30 rounded-2xl bg-brand-white dark:bg-brand-charcoal/50 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-3 border-b border-brand-beige/25 dark:border-brand-dark-grey/25 pb-2 text-brand-charcoal dark:text-brand-offwhite">
                      <span className="text-brand-primary text-xl">{menuGroup.icon}</span> 
                      <span>{menuGroup.title}</span>
                    </h3>
                    <div className="space-y-2.5 flex-1">
                      {menuGroup.children ? (
                        menuGroup.children.map(child => (
                          <PermissionItem
                            key={child.path} 
                            item={child} 
                            groupName={menuGroup.title}
                            role={role} 
                            initialChecked={isRouteAllowed(child.path)}
                            onPermissionChange={fetchPermissions}
                          />
                        ))
                      ) : (
                        <PermissionItem
                          key={menuGroup.path} 
                          item={menuGroup} 
                          groupName="General"
                          role={role} 
                          initialChecked={isRouteAllowed(menuGroup.path)}
                          onPermissionChange={fetchPermissions}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPermission;
