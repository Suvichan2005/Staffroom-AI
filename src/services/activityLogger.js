/**
 * Activity Logger Service
 * 
 * Tracks user activity including:
 * - Login/logout events with IP
 * - Page navigation
 * - Feature usage
 * - Gemini API calls
 * - Errors
 * 
 * Logs are stored in Firestore for cross-device admin access.
 * Local storage logging moved to activityLoggerLocal.js for future use.
 */

import { getStorageUserId } from '../utils/userScopedStorage';
import { db } from '../firebase/client';
import { collection, addDoc, getDocs, query, orderBy, limit, where, Timestamp, doc, writeBatch } from 'firebase/firestore';

// Firestore collection name (your Firestore database collection)
const FIRESTORE_LOGS_COLLECTION = 'logs1';

// Current user email (set when auth events occur)
let currentUserEmail = null;

/**
 * Set the current user email for logging
 */
export function setLoggerUserEmail(email) {
  currentUserEmail = email;
}

/**
 * Get current user email
 */
export function getLoggerUserEmail() {
  return currentUserEmail;
}

// Log levels
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

// Log categories
export const LogCategory = {
  AUTH: 'auth',
  NAVIGATION: 'navigation',
  AI: 'ai',
  ACTION: 'action',
  API: 'api',
  ERROR: 'error',
  GEMINI: 'gemini',
};

/**
 * Get current user's IP address (via external service)
 */
let cachedIp = null;
export async function getUserIP() {
  if (cachedIp) return cachedIp;
  
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000)
    });
    const data = await response.json();
    cachedIp = data.ip;
    return cachedIp;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get device/browser info
 */
export function getDeviceInfo() {
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/?\s*(\d+)/);
  
  return {
    isMobile,
    browser: browser ? `${browser[1]} ${browser[2]}` : 'Unknown',
    platform: navigator.platform,
    language: navigator.language,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || 'direct',
    online: navigator.onLine,
  };
}

/**
 * Get stored logs
 * @deprecated Use getFirestoreLogs for cloud logs
 */
export function getLogs() {
  // Deprecated - returns empty array
  // Use getFirestoreLogs() for cloud-based logs
  return [];
}

/**
 * Create a log entry
 */
function createLogEntry(level, category, message, data = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    data: {
      ...data,
      device: getDeviceInfo(),
    },
    url: window.location.pathname,
    sessionId: sessionStorage.getItem('sessionId') || initSession(),
    userEmail: data.userEmail || currentUserEmail || 'unknown',
    userId: data.userId || getStorageUserId() || 'anonymous',
  };
}

/**
 * Initialize session ID
 */
function initSession() {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('sessionId', sessionId);
  return sessionId;
}

/**
 * Promise with timeout helper
 */
function withTimeout(promise, ms, message = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(message)), ms)
    )
  ]);
}

/**
 * Save to Firestore (for cross-device admin access)
 * Logs all events: auth, navigation, gemini calls, etc.
 */
async function saveToFirestore(entry) {
  // Check if db is available
  if (!db) {
    return;
  }
  
  try {
    const dataToSave = {
      ...entry,
      timestamp: Timestamp.fromDate(new Date(entry.timestamp)),
      createdAt: Timestamp.now(),
    };
    
    const collectionRef = collection(db, FIRESTORE_LOGS_COLLECTION);
    
    // Add timeout to detect hanging requests
    await withTimeout(
      addDoc(collectionRef, dataToSave),
      5000,
      'Firestore write timed out'
    );
  } catch (error) {
    // Silent fail in production - logs are non-critical
  }
}

/**
 * Get logs from Firestore (all users - admin only)
 * @param {number} maxResults - Maximum number of logs to fetch
 * @param {string} emailFilter - Optional email to filter by
 */
export async function getFirestoreLogs(maxResults = 500, emailFilter = null) {
  try {
    let q;
    if (emailFilter && emailFilter !== 'all') {
      q = query(
        collection(db, FIRESTORE_LOGS_COLLECTION),
        where('userEmail', '==', emailFilter),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );
    } else {
      q = query(
        collection(db, FIRESTORE_LOGS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );
    }
    
    const snapshot = await getDocs(q);
    const logs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
      });
    });
    return logs;
  } catch (error) {
    return [];
  }
}

/**
 * Get unique emails from Firestore logs
 */
export async function getFirestoreUniqueEmails() {
  try {
    // Fetch recent logs and extract unique emails
    const logs = await getFirestoreLogs(1000);
    const emails = new Set();
    logs.forEach(log => {
      if (log.userEmail && log.userEmail !== 'unknown') {
        emails.add(log.userEmail);
      }
    });
    return Array.from(emails).sort();
  } catch (error) {
    return [];
  }
}

/**
 * Clear Firestore logs (admin only - use with caution)
 */
export async function clearFirestoreLogs() {
  try {
    const q = query(collection(db, FIRESTORE_LOGS_COLLECTION), limit(500));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(doc(db, FIRESTORE_LOGS_COLLECTION, docSnap.id));
    });
    await batch.commit();
    return snapshot.size;
  } catch (error) {
    return 0;
  }
}

/**
 * @deprecated Use getFirestoreLogs - local logs removed
 */
export function getGlobalLogs() {
  return [];
}

/**
 * @deprecated Local logs removed - use clearFirestoreLogs
 */
export function clearGlobalLogs() {
  // No-op - local logs removed
}

/**
 * Log an activity
 */
export function log(level, category, message, data = {}) {
  const entry = createLogEntry(level, category, message, data);
  
  // Save to Firestore for cross-device admin access
  saveToFirestore(entry);
  
  return entry;
}

// Convenience methods
export const logDebug = (category, message, data) => log(LogLevel.DEBUG, category, message, data);
export const logInfo = (category, message, data) => log(LogLevel.INFO, category, message, data);
export const logWarn = (category, message, data) => log(LogLevel.WARN, category, message, data);
export const logError = (category, message, data) => log(LogLevel.ERROR, category, message, data);

/**
 * Log auth event (login/logout)
 */
export async function logAuthEvent(eventType, user, additionalData = {}) {
  const ip = await getUserIP();
  const device = getDeviceInfo();
  
  return log(LogLevel.INFO, LogCategory.AUTH, `User ${eventType}`, {
    eventType,
    userId: user?.uid || 'anonymous',
    email: user?.email || 'unknown',
    displayName: user?.displayName || 'unknown',
    provider: user?.providerData?.[0]?.providerId || 'unknown',
    ip,
    device,
    ...additionalData,
  });
}

/**
 * Log page navigation
 */
export function logNavigation(from, to, method = 'navigate') {
  return log(LogLevel.INFO, LogCategory.NAVIGATION, `Navigated to ${to}`, {
    from,
    to,
    method,
  });
}

/**
 * Log Gemini API call
 */
export function logGeminiCall(functionName, params, response, durationMs, error = null) {
  const level = error ? LogLevel.ERROR : LogLevel.INFO;
  const message = error 
    ? `Gemini call failed: ${functionName}` 
    : `Gemini call: ${functionName}`;
  
  return log(level, LogCategory.GEMINI, message, {
    functionName,
    params: sanitizeParams(params),
    responsePreview: response ? truncateResponse(response) : null,
    durationMs,
    error: error ? { message: error.message, stack: error.stack } : null,
    model: params?.model || 'unknown',
    tokenEstimate: estimateTokens(params, response),
  });
}

/**
 * Log user action (button clicks, form submissions, etc.)
 */
export function logAction(actionName, details = {}) {
  return log(LogLevel.INFO, LogCategory.ACTION, actionName, details);
}

/**
 * Log API call
 */
export function logApiCall(method, endpoint, statusCode, durationMs, error = null) {
  const level = error || statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
  
  return log(level, LogCategory.API, `${method} ${endpoint}`, {
    method,
    endpoint,
    statusCode,
    durationMs,
    error: error ? { message: error.message } : null,
  });
}

/**
 * Sanitize params to remove sensitive data
 */
function sanitizeParams(params) {
  if (!params) return null;
  
  const sanitized = { ...params };
  
  // Remove potentially sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  // Truncate large string fields
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
      sanitized[key] = sanitized[key].substring(0, 500) + '...[truncated]';
    }
  });
  
  return sanitized;
}

/**
 * Truncate response for logging
 */
function truncateResponse(response) {
  if (!response) return null;
  
  if (typeof response === 'string') {
    return response.length > 200 ? response.substring(0, 200) + '...' : response;
  }
  
  if (typeof response === 'object') {
    const str = JSON.stringify(response);
    return str.length > 200 ? str.substring(0, 200) + '...' : response;
  }
  
  return response;
}

/**
 * Rough token estimation
 */
function estimateTokens(params, response) {
  let inputChars = 0;
  let outputChars = 0;
  
  if (params?.prompt) inputChars += params.prompt.length;
  if (params?.message) inputChars += params.message.length;
  if (params?.context) inputChars += JSON.stringify(params.context).length;
  
  if (response) {
    outputChars = typeof response === 'string' 
      ? response.length 
      : JSON.stringify(response).length;
  }
  
  // Rough estimate: 4 chars per token
  return {
    input: Math.ceil(inputChars / 4),
    output: Math.ceil(outputChars / 4),
  };
}

/**
 * Get logs filtered by criteria
 */
export function filterLogs(options = {}) {
  const logs = getLogs();
  
  return logs.filter(log => {
    if (options.level && log.level !== options.level) return false;
    if (options.category && log.category !== options.category) return false;
    if (options.startDate && new Date(log.timestamp) < new Date(options.startDate)) return false;
    if (options.endDate && new Date(log.timestamp) > new Date(options.endDate)) return false;
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      const matchesMessage = log.message.toLowerCase().includes(searchLower);
      const matchesData = JSON.stringify(log.data).toLowerCase().includes(searchLower);
      if (!matchesMessage && !matchesData) return false;
    }
    return true;
  });
}

/**
 * Get log statistics
 */
export function getLogStats() {
  const logs = getLogs();
  
  const stats = {
    total: logs.length,
    byLevel: {},
    byCategory: {},
    sessions: new Set(),
    dateRange: {
      oldest: null,
      newest: null,
    },
    geminiCalls: {
      total: 0,
      errors: 0,
      totalDurationMs: 0,
    },
  };
  
  logs.forEach(log => {
    // By level
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    
    // By category
    stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    
    // Sessions
    if (log.sessionId) stats.sessions.add(log.sessionId);
    
    // Date range
    const date = new Date(log.timestamp);
    if (!stats.dateRange.oldest || date < stats.dateRange.oldest) {
      stats.dateRange.oldest = date;
    }
    if (!stats.dateRange.newest || date > stats.dateRange.newest) {
      stats.dateRange.newest = date;
    }
    
    // Gemini stats
    if (log.category === LogCategory.GEMINI) {
      stats.geminiCalls.total++;
      if (log.level === LogLevel.ERROR) stats.geminiCalls.errors++;
      if (log.data?.durationMs) {
        stats.geminiCalls.totalDurationMs += log.data.durationMs;
      }
    }
  });
  
  stats.sessions = stats.sessions.size;
  stats.geminiCalls.avgDurationMs = stats.geminiCalls.total > 0
    ? Math.round(stats.geminiCalls.totalDurationMs / stats.geminiCalls.total)
    : 0;
  
  return stats;
}

/**
 * Export logs as JSON
 */
export function exportLogsAsJSON() {
  const logs = getLogs();
  const stats = getLogStats();
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    stats,
    logs,
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Export logs as CSV
 */
export function exportLogsAsCSV() {
  const logs = getLogs();
  
  const headers = ['timestamp', 'level', 'category', 'message', 'url', 'sessionId', 'data'];
  const rows = logs.map(log => [
    log.timestamp,
    log.level,
    log.category,
    `"${log.message.replace(/"/g, '""')}"`,
    log.url,
    log.sessionId,
    `"${JSON.stringify(log.data).replace(/"/g, '""')}"`,
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Clear all logs
 */
export function clearLogs() {
  saveUserState(STORAGE_KEY, []);
}

/**
 * Download logs file
 */
export function downloadLogs(format = 'json') {
  const content = format === 'csv' ? exportLogsAsCSV() : exportLogsAsJSON();
  const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
  const filename = `staffroom-logs-${new Date().toISOString().split('T')[0]}.${format}`;
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Initialize session on load
if (typeof window !== 'undefined') {
  initSession();
}

export default {
  log,
  logDebug,
  logInfo,
  logWarn,
  logError,
  logAuthEvent,
  logNavigation,
  logGeminiCall,
  logAction,
  logApiCall,
  getLogs,
  filterLogs,
  getLogStats,
  exportLogsAsJSON,
  exportLogsAsCSV,
  downloadLogs,
  clearLogs,
  getUserIP,
  getDeviceInfo,
  LogLevel,
  LogCategory,
};
