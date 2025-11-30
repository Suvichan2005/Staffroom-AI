import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Toast Component - Notification messages
 * 
 * @param {'success' | 'error' | 'warning' | 'info'} type
 * @param {string} message
 * @param {string} description
 * @param {number} duration - Auto-dismiss duration in ms
 * @param {boolean} dismissible
 * @param {Function} onDismiss
 */
export function Toast({
  type = 'info',
  message,
  description,
  duration = 4000,
  dismissible = true,
  onDismiss,
  action,
}) {
  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconStyles = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg
        min-w-[300px] max-w-md
        ${styles[type]}
      `}
    >
      <span className={`flex-shrink-0 ${iconStyles[type]}`}>
        {icons[type]}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-medium">{message}</p>
        {description && (
          <p className="text-sm mt-0.5 opacity-80">{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium mt-2 hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>

      {dismissible && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 -mr-1 -mt-1 hover:bg-black/5 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

/**
 * Toast Container - Manages toast stack
 */
export function ToastContainer({ toasts = [], onDismiss, position = 'top-right' }) {
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className={`fixed z-[100] flex flex-col gap-2 ${positions[position]}`}>
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={() => onDismiss(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

/**
 * Simple toast hook for creating toasts
 */
let toastId = 0;
const toastListeners = new Set();
let currentToasts = [];

const updateToasts = (newToasts) => {
  currentToasts = newToasts;
  toastListeners.forEach((listener) => listener(newToasts));
};

export const toast = {
  success: (message, options = {}) => {
    const id = ++toastId;
    updateToasts([...currentToasts, { id, type: 'success', message, ...options }]);
    return id;
  },
  error: (message, options = {}) => {
    const id = ++toastId;
    updateToasts([...currentToasts, { id, type: 'error', message, ...options }]);
    return id;
  },
  warning: (message, options = {}) => {
    const id = ++toastId;
    updateToasts([...currentToasts, { id, type: 'warning', message, ...options }]);
    return id;
  },
  info: (message, options = {}) => {
    const id = ++toastId;
    updateToasts([...currentToasts, { id, type: 'info', message, ...options }]);
    return id;
  },
  dismiss: (id) => {
    updateToasts(currentToasts.filter((t) => t.id !== id));
  },
  dismissAll: () => {
    updateToasts([]);
  },
};

export function useToasts() {
  const [toasts, setToasts] = React.useState(currentToasts);

  useEffect(() => {
    toastListeners.add(setToasts);
    return () => {
      toastListeners.delete(setToasts);
    };
  }, []);

  return {
    toasts,
    dismiss: toast.dismiss,
  };
}

export default Toast;
