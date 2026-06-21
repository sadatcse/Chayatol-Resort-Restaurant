"use client";

import { useState, useCallback, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useStays = (currentPage = 1, itemsPerPage = 10, searchTerm = "", status = "") => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [stays, setStays] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStays = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/stays?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&status=${status}`
      );
      setStays(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.total || 0);
    } catch (error) {
      console.error("Error fetching stays:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm, status, user]);

  useEffect(() => {
    fetchStays();
  }, [fetchStays]);

  return {
    stays,
    totalPages,
    totalItems,
    isLoading,
    refetch: fetchStays,
  };
};

export default useStays;
