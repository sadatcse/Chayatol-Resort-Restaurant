"use client";

import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useGetRoles = () => {
  const [roles, setRoles] = useState([]);
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) return; // Wait for user to be authenticated/loaded
      try {
        const response = await axiosSecure.get("/userrole");
        const roleNames = Array.isArray(response.data)
          ? response.data.map((r) => r.userrole)
          : [];
        setRoles(roleNames);
      } catch (err) {
        console.error("Failed to fetch roles:", err);
      }
    };
    fetchRoles();
  }, [axiosSecure, user]);

  return roles;
};

export default useGetRoles;
