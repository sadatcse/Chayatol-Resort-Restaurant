"use client";

import { useState, useCallback, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useWastage = (currentPage = 1, itemsPerPage = 10, searchTerm = "", from = null, to = null) => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: itemsPerPage });
      if (searchTerm) params.append("search", searchTerm);
      if (from) params.append("from", from.toISOString());
      if (to) params.append("to", to.toISOString());

      const { data } = await axiosSecure.get(`/stock-ops/wastage?${params.toString()}`);
      setRecords(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.totalDocuments || 0);
    } catch (err) {
      console.error("Error fetching wastage records:", err);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm, from, to, user]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  return { records, totalPages, totalItems, isLoading, refetch: fetchRecords };
};

export default useWastage;
