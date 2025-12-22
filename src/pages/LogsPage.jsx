import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ActivityLogsViewer from '../components/dev/ActivityLogsViewer';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// Only this email can access the logs page
const ADMIN_EMAIL = 'suvanshagar@gmail.com';

/**
 * LogsPage - Admin only page for viewing activity logs
 * Only accessible by suvanshagar@gmail.com
 */
export default function LogsPage() {
  const { user, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect non-admins to dashboard
  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/dashboard" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-bold text-gray-900">Activity Logs</h1>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                  Admin Only
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Logged in as:</span>
              <span className="font-medium text-gray-700">{user.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <ActivityLogsViewer />
      </main>
    </div>
  );
}
