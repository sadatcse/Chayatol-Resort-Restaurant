import { useState, useCallback, useEffect } from "react";
import useAxiosSecure from "./useAxiosSecure";

const useDepartments = (currentPage = 1, itemsPerPage = 10, searchTerm = "") => {
  const axiosSecure = useAxiosSecure();
  const [departments, setDepartments] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/department/paginated?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`
      );
      setDepartments(response.data.departments || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return {
    departments,
    totalPages,
    totalItems,
    isLoading,
    refetch: fetchDepartments,
  };
};

export default useDepartments;
