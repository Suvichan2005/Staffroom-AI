import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTeacher } from "../../context/TeacherContext";

/**
 * List of email addresses that have admin access regardless of persona
 * These users can access /ai-test, /logs, /_debug routes
 */
const ADMIN_EMAILS = [
  'suvanshagar@gmail.com',
  // Add more admin emails here
];

/**
 * AdminRoute - Restricts access to admin-only pages
 * 
 * Checks (any of these grants access):
 * 1. User email is in ADMIN_EMAILS whitelist
 * 2. User has admin persona selected
 * 
 * Use for: /ai-test, /logs, /_debug routes
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const teacherCtx = useTeacher();
  const persona = teacherCtx?.persona || 'teacher';
  
  // Only show loading if we truly don't know the auth state
  if (loading && !user) {
    return null;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user email is in admin whitelist
  const isAdminEmail = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  
  // Check if user has admin persona
  const isAdminPersona = persona === 'admin';
  
  // Allow access if either condition is met
  if (!isAdminEmail && !isAdminPersona) {
    // Redirect non-admins to dashboard
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}
