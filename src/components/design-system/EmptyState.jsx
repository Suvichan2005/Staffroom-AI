import React from 'react';
import { motion } from 'framer-motion';

/**
 * Empty State Component
 * Shows a friendly message when no content is available
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4">
          <span className="text-slate-400">{icon}</span>
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          {actionLabel || 'Get Started'}
        </button>
      )}
    </motion.div>
  );
}

/**
 * Error State Component
 * Shows error with retry option
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error. Please try again.',
  onRetry,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
        >
          Try Again
        </button>
      )}
    </motion.div>
  );
}

/**
 * Offline State Component
 */
export function OfflineState({ className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-center gap-2 py-2 px-4 bg-amber-50 border-b border-amber-100 ${className}`}
    >
      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span className="text-sm text-amber-700 font-medium">
        You're offline. Some features may be unavailable.
      </span>
    </motion.div>
  );
}

/**
 * Loading State Component
 */
export function LoadingState({
  message = 'Loading...',
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default EmptyState;
