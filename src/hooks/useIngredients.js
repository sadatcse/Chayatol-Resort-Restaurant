"use client";

import { useState, useCallback, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useIngredients = (currentPage = 1, itemsPerPage = 10, searchTerm = "") => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [ingredients, setIngredients] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIngredients = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/ingredient/paginated?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`
      );
      setIngredients(response.data.ingredients || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
      setTotalCount(response.data.totalCount || 0);
      setActiveCount(response.data.activeCount || 0);
      setInactiveCount(response.data.inactiveCount || 0);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm, user]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  return {
    ingredients,
    totalPages,
    totalItems,
    totalCount,
    activeCount,
    inactiveCount,
    isLoading,
    refetch: fetchIngredients,
  };
};

export default useIngredients;
