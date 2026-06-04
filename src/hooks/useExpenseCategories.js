"use client";

import { useState, useCallback, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useExpenseCategories = (currentPage = 1, itemsPerPage = 10, searchTerm = "") => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExpenseCategories = useCallback(async () => {
    if (!user) return; // Wait for user to be loaded
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/expensecategory/paginated?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`
      );
      setExpenseCategories(response.data.expenseCategories || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
    } catch (error) {
      console.error("Error fetching expense categories:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm, user]);

  useEffect(() => {
    fetchExpenseCategories();
  }, [fetchExpenseCategories]);

  return {
    expenseCategories,
    totalPages,
    totalItems,
    isLoading,
    refetch: fetchExpenseCategories,
  };
};

export default useExpenseCategories;
