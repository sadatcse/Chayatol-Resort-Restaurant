"use client";

import { useState, useCallback, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useResortServices = (currentPage = 1, itemsPerPage = 10, searchTerm = "", category = "") => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [services, setServices] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/resort-service/paginated?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&category=${category}`
      );
      setServices(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.total || 0);
    } catch (error) {
      console.error("Error fetching resort services:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm, category, user]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    totalPages,
    totalItems,
    isLoading,
    refetch: fetchServices,
  };
};

export default useResortServices;
