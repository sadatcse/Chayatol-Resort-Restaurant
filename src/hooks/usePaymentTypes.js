"use client";

import { useState, useCallback, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const usePaymentTypes = (currentPage = 1, itemsPerPage = 10, searchTerm = "") => {
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPaymentTypes = useCallback(async () => {
    if (!user) return; // Wait for user to be loaded
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/paymenttype/paginated?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`
      );
      setPaymentTypes(response.data.paymentTypes || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
    } catch (error) {
      console.error("Error fetching payment types:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm, user]);

  useEffect(() => {
    fetchPaymentTypes();
  }, [fetchPaymentTypes]);

  return {
    paymentTypes,
    totalPages,
    totalItems,
    isLoading,
    refetch: fetchPaymentTypes,
  };
};

export default usePaymentTypes;
