"use client";

import { useState, useCallback, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useIngredientCategories = (currentPage = 1, itemsPerPage = 10, searchTerm = "", status = "all") => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/ingredient-category/paginated?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&status=${status}`
      );
      setCategories(response.data.categories || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
      setTotalCount(response.data.totalCount || 0);
      setActiveCount(response.data.activeCount || 0);
      setInactiveCount(response.data.inactiveCount || 0);
    } catch (error) {
      console.error("Error fetching ingredient categories:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm, status, user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    totalPages,
    totalItems,
    totalCount,
    activeCount,
    inactiveCount,
    isLoading,
    refetch: fetchCategories,
  };
};

export default useIngredientCategories;
