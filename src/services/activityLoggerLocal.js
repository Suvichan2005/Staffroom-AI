/**
 * Activity Logger - Local Storage Version (ARCHIVED)
 * 
 * This file contains the local storage logging functionality.
 * Kept for future reference if needed.
 * 
 * Currently, all logging is done via Firestore in activityLogger.js
 */

/*
import { loadUserState, saveUserState, getStorageUserId } from '../utils/userScopedStorage';

const MAX_LOG_ENTRIES = 1000;
const STORAGE_KEY = 'activityLogs';

// Global logs storage key (for admin view of all users in same browser)
const GLOBAL_LOGS_KEY = 'staffroom:globalActivityLogs';

// Current user email (set when auth events occur)
let currentUserEmail = null;

export function setLoggerUserEmail(email) {
  currentUserEmail = email;
}

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

// Get stored logs (user-scoped)
export function getLogs() {
  try {
    const logs = loadUserState(STORAGE_KEY) || [];
    return Array.isArray(logs) ? logs : [];
  } catch (error) {
    console.warn('Failed to load logs:', error);
    return [];
  }
}

// Save logs to storage (user-scoped)
function saveLogs(logs) {
  try {
    const trimmedLogs = logs.slice(-MAX_LOG_ENTRIES);
    saveUserState(STORAGE_KEY, trimmedLogs);
  } catch (error) {
    console.warn('Failed to save logs:', error);
  }
}

// Create a log entry
function createLogEntry(level, category, message, data = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    data,
    url: window.location.pathname,
    sessionId: sessionStorage.getItem('sessionId') || initSession(),
    userEmail: currentUserEmail || data.email || 'unknown',
    userId: getStorageUserId() || 'anonymous',
  };
}

// Initialize session ID
function initSession() {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('sessionId', sessionId);
  return sessionId;
}

// Save to global logs (accessible by admin regardless of user context - SAME BROWSER ONLY)
function saveToGlobalLogs(entry) {
  try {
    const globalLogs = JSON.parse(localStorage.getItem(GLOBAL_LOGS_KEY) || '[]');
    globalLogs.push(entry);
    const trimmed = globalLogs.slice(-5000);
    localStorage.setItem(GLOBAL_LOGS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Failed to save to global logs:', error);
  }
}

// Get global logs (all users in same browser - admin only)
export function getGlobalLogs() {
  try {
    return JSON.parse(localStorage.getItem(GLOBAL_LOGS_KEY) || '[]');
  } catch (error) {
    console.warn('Failed to load global logs:', error);
    return [];
  }
}

// Clear global logs
export function clearGlobalLogs() {
  localStorage.removeItem(GLOBAL_LOGS_KEY);
}

// Clear user logs
export function clearLogs() {
  saveUserState(STORAGE_KEY, []);
}

// Log an activity
export function log(level, category, message, data = {}) {
  const entry = createLogEntry(level, category, message, data);
  
  const logs = getLogs();
  logs.push(entry);
  saveLogs(logs);
  
  // Also save to global logs for admin access
  saveToGlobalLogs(entry);
  
  // Also log to console in development
  if (import.meta.env.DEV) {
    const color = {
      [LogLevel.DEBUG]: '#888',
      [LogLevel.INFO]: '#2196F3',
      [LogLevel.WARN]: '#FF9800',
      [LogLevel.ERROR]: '#F44336',
    }[level] || '#888';
    
    console.log(
      `%c[${category.toUpperCase()}]%c ${message}`,
      `color: ${color}; font-weight: bold`,
      'color: inherit',
      data
    );
  }
  
  return entry;
}

// Convenience methods
export const logDebug = (category, message, data) => log(LogLevel.DEBUG, category, message, data);
export const logInfo = (category, message, data) => log(LogLevel.INFO, category, message, data);
export const logWarn = (category, message, data) => log(LogLevel.WARN, category, message, data);
export const logError = (category, message, data) => log(LogLevel.ERROR, category, message, data);

// Get log statistics
export function getLogStats() {
  const logs = getLogs();
  const stats = {
    total: logs.length,
    byLevel: {},
    byCategory: {},
    geminiCalls: {
      total: 0,
      totalDuration: 0,
      averageDuration: 0,
    },
  };
  
  logs.forEach(log => {
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    
    if (log.category === LogCategory.GEMINI) {
      stats.geminiCalls.total++;
      if (log.data?.durationMs) {
        stats.geminiCalls.totalDuration += log.data.durationMs;
      }
    }
  });
  
  if (stats.geminiCalls.total > 0) {
    stats.geminiCalls.averageDuration = Math.round(
      stats.geminiCalls.totalDuration / stats.geminiCalls.total
    );
  }
  
  return stats;
}

// Filter logs
export function filterLogs(options = {}) {
  let logs = getLogs();
  
  if (options.level) {
    logs = logs.filter(l => l.level === options.level);
  }
  if (options.category) {
    logs = logs.filter(l => l.category === options.category);
  }
  if (options.search) {
    const search = options.search.toLowerCase();
    logs = logs.filter(l => 
      l.message.toLowerCase().includes(search) ||
      JSON.stringify(l.data).toLowerCase().includes(search)
    );
  }
  if (options.startDate) {
    logs = logs.filter(l => new Date(l.timestamp) >= new Date(options.startDate));
  }
  if (options.endDate) {
    logs = logs.filter(l => new Date(l.timestamp) <= new Date(options.endDate));
  }
  
  return logs;
}

// Download logs as file
export function downloadLogs(format = 'json') {
  const logs = getLogs();
  let content, filename, type;
  
  if (format === 'csv') {
    const headers = ['timestamp', 'level', 'category', 'message', 'url', 'userEmail'];
    const rows = logs.map(l => 
      headers.map(h => JSON.stringify(l[h] || '')).join(',')
    );
    content = [headers.join(','), ...rows].join('\n');
    filename = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    type = 'text/csv';
  } else {
    content = JSON.stringify(logs, null, 2);
    filename = `activity_logs_${new Date().toISOString().split('T')[0]}.json`;
    type = 'application/json';
  }
  
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
*/

// This file is archived. Use activityLogger.js for Firestore-based logging.
export default null;
