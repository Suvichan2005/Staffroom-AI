/**
 * Centralized Error Handling Utilities
 * Provides consistent error handling, user notifications, and recovery options
 */

import toast from 'react-hot-toast';

// Error types for categorization
export const ErrorType = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  UNKNOWN: 'unknown'
};

// User-friendly error messages
const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: {
    title: 'Connection Error',
    message: 'Unable to connect. Please check your internet connection.',
    recoverable: true
  },
  [ErrorType.AUTH]: {
    title: 'Authentication Error',
    message: 'Your session has expired. Please log in again.',
    recoverable: true,
    action: 'login'
  },
  [ErrorType.VALIDATION]: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    recoverable: true
  },
  [ErrorType.PERMISSION]: {
    title: 'Access Denied',
    message: 'You don\'t have permission to perform this action.',
    recoverable: false
  },
  [ErrorType.NOT_FOUND]: {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    recoverable: false
  },
  [ErrorType.SERVER]: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    recoverable: true
  },
  [ErrorType.UNKNOWN]: {
    title: 'Error',
    message: 'An unexpected error occurred.',
    recoverable: true
  }
};

/**
 * Classify an error into a type
 */
export function classifyError(error) {
  // Network errors
  if (!navigator.onLine || error.message?.includes('network') || error.message?.includes('fetch')) {
    return ErrorType.NETWORK;
  }

  // HTTP status codes
  if (error.status || error.code) {
    const code = error.status || error.code;
    if (code === 401 || code === 403 || code === 'auth/') {
      return error.code?.startsWith('auth/') ? ErrorType.AUTH : ErrorType.PERMISSION;
    }
    if (code === 404) return ErrorType.NOT_FOUND;
    if (code === 400 || code === 422) return ErrorType.VALIDATION;
    if (code >= 500) return ErrorType.SERVER;
  }

  // Firebase auth errors
  if (error.code?.startsWith('auth/')) {
    return ErrorType.AUTH;
  }

  // Validation errors
  if (error.name === 'ValidationError' || error.message?.includes('valid')) {
    return ErrorType.VALIDATION;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error info
 */
export function getErrorInfo(error) {
  const type = classifyError(error);
  const info = ERROR_MESSAGES[type];
  
  // Try to extract a more specific message if available
  let message = info.message;
  if (error.message && !error.message.includes('fetch') && error.message.length < 100) {
    message = error.message;
  }
  
  return {
    type,
    title: info.title,
    message,
    recoverable: info.recoverable,
    action: info.action,
    originalError: error
  };
}

/**
 * Show error toast notification
 */
export function showErrorToast(error, options = {}) {
  const errorInfo = typeof error === 'string' 
    ? { title: 'Error', message: error, recoverable: true }
    : getErrorInfo(error);

  const { 
    showRetry = errorInfo.recoverable, 
    onRetry,
    duration = 5000 
  } = options;

  toast.custom((t) => (
    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {errorInfo.title}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {errorInfo.message}
            </p>
            {showRetry && onRetry && (
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  onRetry();
                }}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Try again
              </button>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  ), { duration });

  return errorInfo;
}

/**
 * Show success toast
 */
export function showSuccessToast(message, options = {}) {
  toast.success(message, {
    duration: options.duration || 3000,
    icon: '✅',
    style: {
      background: '#10b981',
      color: '#fff',
      borderRadius: '12px'
    }
  });
}

/**
 * Show warning toast
 */
export function showWarningToast(message, options = {}) {
  toast(message, {
    duration: options.duration || 4000,
    icon: '⚠️',
    style: {
      background: '#f59e0b',
      color: '#fff',
      borderRadius: '12px'
    }
  });
}

/**
 * Show info toast
 */
export function showInfoToast(message, options = {}) {
  toast(message, {
    duration: options.duration || 3000,
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
      borderRadius: '12px'
    }
  });
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling(fn, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Error in wrapped function:', error);
      
      if (options.silent !== true) {
        showErrorToast(error, {
          onRetry: options.retryable ? () => withErrorHandling(fn, options)(...args) : undefined
        });
      }

      if (options.fallback !== undefined) {
        return options.fallback;
      }

      throw error;
    }
  };
}

/**
 * React hook for async operations with error handling
 */
export function useAsyncHandler() {
  const handleAsync = async (fn, options = {}) => {
    const {
      onSuccess,
      onError,
      successMessage,
      errorMessage,
      showLoading = false,
      loadingMessage = 'Loading...'
    } = options;

    let loadingToast;
    if (showLoading) {
      loadingToast = toast.loading(loadingMessage);
    }

    try {
      const result = await fn();
      
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      
      if (successMessage) {
        showSuccessToast(successMessage);
      }
      
      onSuccess?.(result);
      return result;
    } catch (error) {
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      
      showErrorToast(errorMessage || error);
      onError?.(error);
      throw error;
    }
  };

  return { handleAsync };
}

/**
 * Network status utilities
 */
export function setupNetworkListeners() {
  let wasOffline = false;

  window.addEventListener('offline', () => {
    wasOffline = true;
    showWarningToast('You are offline. Some features may not work.');
  });

  window.addEventListener('online', () => {
    if (wasOffline) {
      showSuccessToast('Connection restored!');
      wasOffline = false;
    }
  });
}

/**
 * Global unhandled error listener
 */
export function setupGlobalErrorHandlers() {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Don't show toast for every unhandled rejection (too noisy)
    // But log it for debugging
    if (process.env.NODE_ENV === 'development') {
      showErrorToast({
        message: 'An unhandled error occurred. Check console for details.'
      });
    }
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Prevent default browser error handling
    event.preventDefault();
  });

  // Setup network listeners
  setupNetworkListeners();
}
