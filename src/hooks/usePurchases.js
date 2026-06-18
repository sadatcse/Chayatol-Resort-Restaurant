"use client";

import { useState, useCallback, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const usePurchases = (
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = "",
  fromDate = null,
  toDate = null,
  status = ""
) => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [purchases, setPurchases] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [partialCount, setPartialCount] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPurchases = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
      });
      if (searchTerm) params.append("search", searchTerm);
      if (fromDate) params.append("fromDate", fromDate.toISOString().split("T")[0]);
      if (toDate) params.append("toDate", toDate.toISOString().split("T")[0]);
      if (status) params.append("status", status);

      const response = await axiosSecure.get(`/purchase/paginated?${params.toString()}`);
      setPurchases(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalItems(response.data.pagination?.totalDocuments || 0);
      setTotalCount(response.data.totalCount || 0);
      setPaidCount(response.data.paidCount || 0);
      setPartialCount(response.data.partialCount || 0);
      setUnpaidCount(response.data.unpaidCount || 0);
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm, fromDate, toDate, status, user]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  return {
    purchases,
    totalPages,
    totalItems,
    totalCount,
    paidCount,
    partialCount,
    unpaidCount,
    isLoading,
    refetch: fetchPurchases,
  };
};

export default usePurchases;
