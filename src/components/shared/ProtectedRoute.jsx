import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  // Only show loading if we truly don't know the auth state
  if (loading && !user) {
    return null; // Don't flash "Loading..." - just show blank briefly
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}
