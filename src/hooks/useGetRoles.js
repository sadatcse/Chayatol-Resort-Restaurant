import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../providers/AuthProvider";
import useAxiosSecure from "./useAxiosSecure";

const useGetRoles = () => {
  const [roles, setRoles] = useState([]);
  const axiosSecure = useAxiosSecure();

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axiosSecure.get("/userrole");
        const roleNames = response.data.map((r) => r.userrole);
        setRoles(roleNames);
      } catch (err) {
        console.error("Failed to fetch roles:", err);
      }
    };
    fetchRoles();
  }, [axiosSecure]);

  return roles;
};

export default useGetRoles;
