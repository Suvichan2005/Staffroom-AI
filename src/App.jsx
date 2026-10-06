import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import React, { Suspense, useEffect, useRef, lazy } from "react";

// Context Providers
import { LayoutProvider } from "./context/LayoutContext";
import { AIProvider } from "./context/AIContext";
import { useAuth } from "./context/AuthContext";

// Error Boundary
import ErrorBoundary from "./components/shared/ErrorBoundary";

// Activity Logging
import { logInfo, LogCategory } from "./services/activityLogger";

// Core pages (loaded immediately for fast initial load)
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Dashboard from "./pages/DashboardNew";

// Lazy-loaded pages (code split for smaller initial bundle)
const ClassPage = lazy(() => import("./pages/ClassPageNew"));
const CoursePage = lazy(() => import("./pages/CoursePageNew"));
const ClassesPage = lazy(() => import("./pages/ClassesPage"));
const ClassManagementPage = lazy(() => import("./pages/ClassManagementPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));

// Hidden/Role-gated pages (accessible but not in main nav)
const Assessments = lazy(() => import("./pages/AssessmentsNew"));
const SharedResources = lazy(() => import("./pages/SharedResources"));
const HODDashboard = lazy(() => import("./pages/HODDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LogsPage = lazy(() => import("./pages/LogsPage"));

// Shared components
import { ProtectedRoute, AdminRoute, HODRoute } from "./components/shared";

// New Layout Components
import { ResponsiveLayout } from './components/layout';

// Feature Tooltips
import { TooltipProvider } from './components/shared/FeatureTooltips';

// Keyboard Shortcuts
import { KeyboardShortcutsProvider } from './hooks/useKeyboardShortcuts';

// Styles
import './styles/tokens.css';

/**
 * Scroll to top on route change and log navigation
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const previousPath = useRef(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    // Skip logging on initial page load (prevents "anonymous" logs)
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      previousPath.current = pathname;
    } else if (previousPath.current !== pathname && !loading) {
      // Only log navigation for actual page changes, not initial load
      logInfo(LogCategory.NAVIGATION, `Visited page: ${pathname}`, {
        path: pathname,
        previousPath: previousPath.current,
        userEmail: user?.email || 'anonymous',
        userId: user?.uid || 'anonymous',
        displayName: user?.displayName || 'anonymous',
      });
      previousPath.current = pathname;
    }

    // Scroll window to top
    window.scrollTo(0, 0);
    // Also scroll main content areas if they exist
    document.querySelector('main')?.scrollTo(0, 0);
    // Force scroll to top of document
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, user, loading]);

  return null;
}

/**
 * Loading fallback component
 */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Wrapper for pages that use the new responsive layout system
 */
function AppLayout({ children }) {
  return (
    <ResponsiveLayout>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ResponsiveLayout>
  );
}

/**
 * Wrapper for landing/auth pages (no navigation)
 */
function AuthLayout({ children }) {
  return (
    <ResponsiveLayout hideNav>
      {children}
    </ResponsiveLayout>
  );
}

/**
 * PublicRoute - redirects authenticated users away from auth pages
 */
function PublicRoute({ children }) {
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    auth = null;
  }
  const user = auth?.user ?? auth?.currentUser ?? null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <LayoutProvider>
        <AIProvider>
          <TooltipProvider>
            <KeyboardShortcutsProvider>
              <div className="min-h-screen bg-neutral-50 text-neutral-900">
                <ScrollToTop />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 2400,
                    style: {
                      background: '#fff',
                      color: '#1e293b',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    },
                  }}
                />

                <Routes>
                  {/* Landing & Auth - No nav */}
                  <Route path="/" element={
                    <AuthLayout>
                      <Landing />
                    </AuthLayout>
                  } />
                  <Route path="/login" element={
                    <PublicRoute>
                      <AuthLayout>
                        <Login />
                      </AuthLayout>
                    </PublicRoute>
                  } />

                  {/* Dashboard - Main entry point */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Course Page */}
                  <Route path="/course/:courseId" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <CoursePage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Class Page */}
                  <Route path="/course/:courseId/class/:classId" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ClassPage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Classes Page */}
                  <Route path="/classes" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ClassesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Manage Classes Page */}
                  <Route path="/manage-classes" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ClassManagementPage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Schedule Page */}
                  <Route path="/schedule" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <SchedulePage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Profile Page */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProfilePage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Settings Page */}
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <SettingsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Hidden pages - accessible but not in main nav */}
                  <Route path="/assessments" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Assessments />
                      </AppLayout>
                    </ProtectedRoute>
                  } />

                  <Route path="/resources" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <SharedResources />
                      </AppLayout>
                    </ProtectedRoute>
                  } />

                  {/* Role-gated pages */}
                  <Route path="/hod-dashboard" element={
                    <HODRoute>
                      <AppLayout>
                        <HODDashboard />
                      </AppLayout>
                    </HODRoute>
                  } />

                  <Route path="/admin-dashboard" element={
                    <AdminRoute>
                      <AppLayout>
                        <AdminDashboard />
                      </AppLayout>
                    </AdminRoute>
                  } />

                  <Route path="/logs" element={
                    <AdminRoute>
                      <AppLayout>
                        <LogsPage />
                      </AppLayout>
                    </AdminRoute>
                  } />

                  {/* 404 */}
                  <Route path="*" element={
                    <AppLayout>
                      <div className="p-6 text-center">
                        <h1 className="text-2xl font-bold text-neutral-800 mb-2">Page Not Found</h1>
                        <p className="text-neutral-600">The page you're looking for doesn't exist.</p>
                      </div>
                    </AppLayout>
                  } />
                </Routes>
              </div>
            </KeyboardShortcutsProvider>
          </TooltipProvider>
        </AIProvider>
      </LayoutProvider>
    </ErrorBoundary>
  );
}
