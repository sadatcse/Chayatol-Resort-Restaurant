"use client";

import { useState, useCallback, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useRestaurantTables = (currentPage = 1, itemsPerPage = 10, searchTerm = "") => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [restaurantTables, setRestaurantTables] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRestaurantTables = useCallback(async () => {
    if (!user) return; // Wait for user to be loaded
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/restauranttable/paginated?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`
      );
      setRestaurantTables(response.data.restaurantTables || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
    } catch (error) {
      console.error("Error fetching restaurant tables:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm, user]);

  useEffect(() => {
    fetchRestaurantTables();
  }, [fetchRestaurantTables]);

  return {
    restaurantTables,
    totalPages,
    totalItems,
    isLoading,
    refetch: fetchRestaurantTables,
  };
};

export default useRestaurantTables;
