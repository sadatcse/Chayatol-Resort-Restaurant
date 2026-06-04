import { useState, useCallback, useEffect } from "react";
import useAxiosSecure from "./useAxiosSecure";

const useRoles = (currentPage = 1, itemsPerPage = 10, searchTerm = "") => {
  const axiosSecure = useAxiosSecure();
  const [roles, setRoles] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosSecure.get(
        `/userrole/paginated?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`
      );
      setRoles(response.data.roles || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
    } catch (error) {
      console.error("Error fetching user roles:", error);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    totalPages,
    totalItems,
    isLoading,
    refetch: fetchRoles,
  };
};

export default useRoles;
