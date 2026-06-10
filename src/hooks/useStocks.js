"use client";

import { useState, useCallback, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useStocks = (
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = "",
  selectedCategory = "",
  showLowStockOnly = false
) => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [stocks, setStocks] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStocks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
      });
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategory) params.append("category", selectedCategory);
      if (showLowStockOnly) params.append("lowStock", "true");

      const response = await axiosSecure.get(`/stock/paginated?${params.toString()}`);
      setStocks(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalItems(response.data.pagination?.totalDocuments || 0);
      setTotalCount(response.data.totalCount || 0);
      setLowStockCount(response.data.lowStockCount || 0);
      setOutOfStockCount(response.data.outOfStockCount || 0);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    axiosSecure,
    currentPage,
    itemsPerPage,
    searchTerm,
    selectedCategory,
    showLowStockOnly,
    user,
  ]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  return {
    stocks,
    totalPages,
    totalItems,
    totalCount,
    lowStockCount,
    outOfStockCount,
    isLoading,
    refetch: fetchStocks,
  };
};

export default useStocks;
