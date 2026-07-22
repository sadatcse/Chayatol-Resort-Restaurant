import { useState, useEffect, useCallback } from "react";
import useAxiosSecure from "./useAxiosSecure";

const useFood = (page = 1, limit = 10, search = "", category = "") => {
  const [foods, setFoods] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const axiosSecure = useAxiosSecure();

  const fetchFoods = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosSecure.get(
        `/food/get?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`
      );
      if (data.success) {
        setFoods(data.data);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      } else {
        setFoods([]);
      }
    } catch (error) {
      console.error("Failed to fetch foods:", error);
      setFoods([]);
    } finally {
      setIsLoading(false);
    }
  }, [axiosSecure, page, limit, search, category]);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  return { foods, totalPages, totalItems, isLoading, refetch: fetchFoods };
};

export default useFood;
