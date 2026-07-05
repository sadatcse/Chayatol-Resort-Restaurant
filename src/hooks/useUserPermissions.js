"use client";

import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useUserPermissions = () => {
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();

  const [allowedRoutes, setAllowedRoutes] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user || !user.role) { 
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const response = await axiosSecure.get(`/permissions/${user.role}`);
        const routesData = response.data.routesData || [];

        const allowedPaths = routesData
          .filter(p => p.isAllowed || p.canView)
          .map(p => p.path);

        const permMap = {};
        routesData.forEach(p => {
          permMap[p.path] = {
            canView: p.canView ?? p.isAllowed ?? false,
            canAdd: p.canAdd ?? false,
            canEdit: p.canEdit ?? false,
            canDelete: p.canDelete ?? false,
          };
        });

        setAllowedRoutes(allowedPaths);
        setPermissions(permMap);
      } catch (err) {
        console.error("Failed to fetch user permissions:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, axiosSecure]);

  const hasPermission = (path, action) => {
    if (!user) return false;
    // Superadmin bypasses all permission checks
    if (user.role === "superadmin") return true;

    // Normalize path to ignore queries/hashes
    const cleanPath = path?.split("?")[0]?.split("#")[0];

    // Check if path matches exactly
    let routePerm = permissions[cleanPath];

    if (!routePerm) {
      // Default bypass for general home/profile routes
      if (cleanPath === "/dashboard/home" || cleanPath === "/dashboard/profile" || cleanPath === "/dashboard") {
        return true;
      }
      return false;
    }

    if (action === "view") return routePerm.canView;
    if (action === "add") return routePerm.canAdd;
    if (action === "edit") return routePerm.canEdit;
    if (action === "delete") return routePerm.canDelete;
    return false;
  };

  return { allowedRoutes, permissions, hasPermission, loading, error };
};

export default useUserPermissions;
