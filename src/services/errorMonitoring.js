/**
 * Error Monitoring Service
 * 
 * Lightweight error tracking that:
 * 1. Logs errors to Firestore for analysis
 * 2. Optionally integrates with Sentry when configured AND installed
 * 3. Provides console grouping for development debugging
 * 
 * To enable Sentry:
 * 1. npm install @sentry/react
 * 2. Set VITE_SENTRY_DSN in environment
 * 
 * If Sentry is not installed, the service works normally without it.
 */

import { logError as logToFirestore, LogCategory } from './activityLogger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const IS_DEV = import.meta.env.DEV;
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',           // Minor issues, user can continue
  MEDIUM: 'medium',     // Degraded experience, some features broken
  HIGH: 'high',         // Major feature broken
  CRITICAL: 'critical', // App unusable, data loss risk
};

// Error categories for grouping
export const ErrorCategory = {
  NETWORK: 'network',
  AI_SERVICE: 'ai_service',
  AUTH: 'auth',
  RENDER: 'render',
  DATA: 'data',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown',
};

// ============================================================================
// SENTRY INTEGRATION (Optional - only used if @sentry/react is installed)
// ============================================================================

let Sentry = null;

/**
 * Initialize error monitoring
 * Sentry integration is disabled by default. To enable:
 * 1. npm install @sentry/react
 * 2. Set VITE_SENTRY_DSN in environment
 * 3. Uncomment the Sentry initialization code below
 * 
 * Call this in main.jsx before rendering
 */
export async function initErrorMonitoring() {
  // Sentry is optional and disabled by default
  // Errors are logged to Firestore via trackError() below
  
  if (!SENTRY_DSN) {
    // No Sentry DSN configured - this is normal
    // Errors will still be logged to Firestore
    return;
  }
  
  // NOTE: To enable Sentry, install it and uncomment this block:
  /*
  try {
    const SentryModule = await import('@sentry/react');
    Sentry = SentryModule;
    
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: IS_DEV ? 'development' : 'production',
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: IS_DEV ? 1.0 : 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: IS_DEV ? 0 : 1.0,
    });
    
    console.log('✅ Sentry error monitoring initialized');
  } catch (error) {
    console.warn('⚠️ Sentry initialization failed:', error.message);
    Sentry = null;
  }
  */
  
  // For now, just log that Sentry is not configured
  if (IS_DEV) {
    console.info('ℹ️ Error monitoring: Using Firestore logging (Sentry not installed)');
  }
}

// ============================================================================
// ERROR TRACKING FUNCTIONS
// ============================================================================

/**
 * Track an error with full context
 * 
 * @param {Error|string} error - The error object or message
 * @param {Object} context - Additional context
 * @param {string} context.category - Error category from ErrorCategory
 * @param {string} context.severity - Severity from ErrorSeverity
 * @param {string} context.component - Component/function where error occurred
 * @param {Object} context.extra - Any additional data
 */
export function trackError(error, context = {}) {
  const {
    category = ErrorCategory.UNKNOWN,
    severity = ErrorSeverity.MEDIUM,
    component = 'unknown',
    extra = {},
    userId = null,
  } = context;
  
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorData = {
    message: errorObj.message,
    stack: errorObj.stack,
    category,
    severity,
    component,
    extra,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };
  
  // Console logging (grouped in dev)
  if (IS_DEV) {
    console.group(`🔴 Error [${severity.toUpperCase()}] - ${category}`);
    console.error(errorObj);
    console.table({ component, category, severity });
    if (Object.keys(extra).length > 0) {
      console.log('Extra:', extra);
    }
    console.groupEnd();
  } else {
    console.error(`[${category}] ${errorObj.message}`);
  }
  
  // Send to Sentry if available
  if (Sentry) {
    Sentry.withScope((scope) => {
      scope.setLevel(mapSeverityToSentry(severity));
      scope.setTag('category', category);
      scope.setTag('component', component);
      scope.setExtras(extra);
      if (userId) {
        scope.setUser({ id: userId });
      }
      Sentry.captureException(errorObj);
    });
  }
  
  // Log to Firestore (async, non-blocking)
  logToFirestore(LogCategory.ERROR, `[${category}] ${errorObj.message}`, {
    ...errorData,
    userId,
  }).catch(() => {
    // Silent fail for error logging
  });
  
  return errorData;
}

/**
 * Track a network/API error
 */
export function trackNetworkError(error, endpoint, extra = {}) {
  return trackError(error, {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    component: 'API',
    extra: { endpoint, ...extra },
  });
}

/**
 * Track an AI service error
 */
export function trackAIError(error, service, extra = {}) {
  return trackError(error, {
    category: ErrorCategory.AI_SERVICE,
    severity: error.message?.includes('quota') ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
    component: service,
    extra,
  });
}

/**
 * Track an authentication error
 */
export function trackAuthError(error, action, extra = {}) {
  return trackError(error, {
    category: ErrorCategory.AUTH,
    severity: ErrorSeverity.HIGH,
    component: 'Auth',
    extra: { action, ...extra },
  });
}

/**
 * Track a render/React error (from Error Boundaries)
 */
export function trackRenderError(error, errorInfo, component = 'unknown') {
  return trackError(error, {
    category: ErrorCategory.RENDER,
    severity: ErrorSeverity.HIGH,
    component,
    extra: {
      componentStack: errorInfo?.componentStack,
    },
  });
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Track a slow operation
 */
export function trackSlowOperation(operationName, durationMs, threshold = 3000) {
  if (durationMs < threshold) return;
  
  const data = {
    operation: operationName,
    duration: durationMs,
    threshold,
    url: window.location.href,
  };
  
  if (IS_DEV) {
    console.warn(`⏱️ Slow operation: ${operationName} took ${durationMs}ms (threshold: ${threshold}ms)`);
  }
  
  if (Sentry) {
    Sentry.captureMessage(`Slow operation: ${operationName}`, {
      level: 'warning',
      extra: data,
    });
  }
}

/**
 * Create a performance timer
 */
export function createTimer(operationName) {
  const start = performance.now();
  
  return {
    end: (threshold = 3000) => {
      const duration = performance.now() - start;
      trackSlowOperation(operationName, duration, threshold);
      return duration;
    },
  };
}

// ============================================================================
// USER FEEDBACK
// ============================================================================

/**
 * Capture user feedback about an error
 */
export function captureUserFeedback(errorId, feedback, email = null) {
  if (Sentry) {
    Sentry.captureUserFeedback({
      event_id: errorId,
      name: email || 'anonymous',
      email: email || 'unknown@staffroom.ai',
      comments: feedback,
    });
  }
  
  // Also log to Firestore
  logToFirestore(LogCategory.ACTION, 'User feedback submitted', {
    errorId,
    feedback,
    email,
  }).catch(() => {});
}

// ============================================================================
// HELPERS
// ============================================================================

function mapSeverityToSentry(severity) {
  switch (severity) {
    case ErrorSeverity.LOW: return 'info';
    case ErrorSeverity.MEDIUM: return 'warning';
    case ErrorSeverity.HIGH: return 'error';
    case ErrorSeverity.CRITICAL: return 'fatal';
    default: return 'error';
  }
}

/**
 * Global error handler for uncaught errors
 * Attach in main.jsx: window.onerror = handleGlobalError
 */
export function handleGlobalError(message, source, lineno, colno, error) {
  trackError(error || message, {
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.CRITICAL,
    component: 'global',
    extra: { source, lineno, colno },
  });
  
  // Don't prevent default handling in dev
  return !IS_DEV;
}

/**
 * Handler for unhandled promise rejections
 * Attach in main.jsx: window.onunhandledrejection = handleUnhandledRejection
 */
export function handleUnhandledRejection(event) {
  trackError(event.reason, {
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.HIGH,
    component: 'promise',
    extra: { type: 'unhandledRejection' },
  });
}

export default {
  initErrorMonitoring,
  trackError,
  trackNetworkError,
  trackAIError,
  trackAuthError,
  trackRenderError,
  trackSlowOperation,
  createTimer,
  captureUserFeedback,
  handleGlobalError,
  handleUnhandledRejection,
  ErrorSeverity,
  ErrorCategory,
};
