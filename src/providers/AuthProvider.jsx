"use client";

import { createContext, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import useAxiosPublic from "../hooks/useAxiosPublic";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const axiosSecure = useAxiosPublic();

  // Load user from localStorage after mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("authUser");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = useCallback(
    async (email) => {
      if (!email) return;
      try {
        const { data } = await axiosSecure.get(
          `/user/my-profile?email=${email}`
        );
        setUserProfile(data);
      } catch (error) {
        console.error("User profile not found or error fetching:", error);
        setUserProfile(null);
      }
    },
    [axiosSecure]
  );

  // Fetch user profile when user is loaded
  useEffect(() => {
    if (user?.email) {
      fetchUserProfile(user.email);
    }
  }, [user, fetchUserProfile]);

  const registerUser = async (email, password, name) => {
    setLoading(true);
    try {
      const { data } = await axiosSecure.post("/user/post", {
        email,
        password,
        name,
      });
      return data;
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await axiosSecure.post("/user/login", {
        email,
        password,
      });

      setUser(data.user);
      if (typeof window !== "undefined") {
        localStorage.setItem("authUser", JSON.stringify(data.user));
        localStorage.setItem("authToken", data.token);
      }

      await fetchUserProfile(data.user.email);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    try {
      setUser(null);
      setUserProfile(null);

      if (typeof window !== "undefined") {
        localStorage.removeItem("authUser");
        localStorage.removeItem("authToken");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        registerUser,
        loginUser,
        logoutUser,
        fetchUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
