import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAuth } from "firebase/auth";

/**
 * Fallback email whitelist — used only until custom claims propagate.
 * Primary authorization uses Firebase custom claims set by the backend.
 */
const ADMIN_EMAILS = [
  'admin@staffroom.ai',
  'suvichan2005@gmail.com',
  'suvanshagar@gmail.com',
];

/**
 * AdminRoute - Restricts access to admin-only pages
 * 
 * Checks (any of these grants access):
 * 1. Firebase custom claim `role === 'admin'`
 * 2. User email is in ADMIN_EMAILS fallback whitelist
 * 
 * Use for: /admin-dashboard, /logs routes
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const [claimRole, setClaimRole] = useState(null);
  const [claimsLoaded, setClaimsLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      getAuth().currentUser?.getIdTokenResult()
        .then(result => {
          setClaimRole(result.claims.role || null);
          setClaimsLoaded(true);
        })
        .catch(() => setClaimsLoaded(true));
    } else {
      setClaimsLoaded(true);
    }
  }, [user]);

  if ((loading && !user) || !claimsLoaded) {
    return null;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check custom claim first, then fallback to email whitelist
  const isAdminClaim = claimRole === 'admin';
  const isAdminEmail = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  
  if (!isAdminClaim && !isAdminEmail) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

/**
 * HODRoute - Restricts access to HOD and admin users
 * 
 * Checks (any of these grants access):
 * 1. Firebase custom claim `role === 'hod'` or `role === 'admin'`
 * 2. User email is in ADMIN_EMAILS fallback whitelist
 */
export function HODRoute({ children }) {
  const { user, loading } = useAuth();
  const [claimRole, setClaimRole] = useState(null);
  const [claimsLoaded, setClaimsLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      getAuth().currentUser?.getIdTokenResult()
        .then(result => {
          setClaimRole(result.claims.role || null);
          setClaimsLoaded(true);
        })
        .catch(() => setClaimsLoaded(true));
    } else {
      setClaimsLoaded(true);
    }
  }, [user]);

  if ((loading && !user) || !claimsLoaded) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isHODOrAdmin = claimRole === 'hod' || claimRole === 'admin';
  const isAdminEmail = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  if (!isHODOrAdmin && !isAdminEmail) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
