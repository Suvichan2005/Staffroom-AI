/**
 * User-Scoped Storage - Per-user isolated localStorage
 * 
 * This module provides localStorage functions that automatically namespace
 * all keys by the current user's ID. This ensures complete isolation of
 * demo data between different users.
 * 
 * Storage key format: `staffroom:user:{userId}:{key}`
 * Global key format: `staffroom:global:{key}` (for non-user-specific data)
 */

const isBrowser = typeof window !== "undefined";

// Current user ID - set when user logs in
let currentUserId = null;

/**
 * Set the current user ID for storage namespacing
 * Call this when user logs in
 */
export function setStorageUserId(userId) {
  currentUserId = userId;
  if (isBrowser && userId) {
    // Store the last active user ID for recovery
    window.localStorage.setItem('staffroom:lastUserId', userId);
  }
}

/**
 * Get the current storage user ID
 */
export function getStorageUserId() {
  return currentUserId;
}

/**
 * Clear the current user ID (on logout)
 */
export function clearStorageUserId() {
  currentUserId = null;
}

/**
 * Get the namespaced key for user-specific data
 */
function getUserScopedKey(key) {
  if (!currentUserId) {
    console.warn('userScopedStorage: No user ID set, using anonymous namespace');
    return `staffroom:anon:${key}`;
  }
  return `staffroom:user:${currentUserId}:${key}`;
}

/**
 * Get the namespaced key for global data (shared across all users)
 */
function getGlobalKey(key) {
  return `staffroom:global:${key}`;
}

/**
 * Load user-scoped state from localStorage
 */
export function loadUserState(key, fallback) {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(getUserScopedKey(key));
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Save user-scoped state to localStorage
 */
export function saveUserState(key, value) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(getUserScopedKey(key), JSON.stringify(value));
  } catch {
    /* swallow */
  }
}

/**
 * Remove user-scoped state from localStorage
 */
export function removeUserState(key) {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(getUserScopedKey(key));
  } catch {
    /* swallow */
  }
}

/**
 * Load global state (not user-specific)
 */
export function loadGlobalState(key, fallback) {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(getGlobalKey(key));
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Save global state (not user-specific)
 */
export function saveGlobalState(key, value) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(getGlobalKey(key), JSON.stringify(value));
  } catch {
    /* swallow */
  }
}

/**
 * Check if the current user has been initialized (seeded with demo data)
 */
export function isUserInitialized() {
  if (!currentUserId) return false;
  return loadUserState('demo:initialized', false) === true;
}

/**
 * Mark the current user as initialized
 */
export function markUserInitialized() {
  saveUserState('demo:initialized', true);
  saveUserState('demo:initializedAt', new Date().toISOString());
}

/**
 * Reset all data for the current user
 */
export function resetUserNamespace() {
  if (!isBrowser || !currentUserId) return;
  try {
    const prefix = `staffroom:user:${currentUserId}:`;
    const keys = Object.keys(window.localStorage);
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    /* swallow */
  }
}

/**
 * Get all keys for the current user
 */
export function getUserKeys() {
  if (!isBrowser || !currentUserId) return [];
  try {
    const prefix = `staffroom:user:${currentUserId}:`;
    return Object.keys(window.localStorage)
      .filter(key => key.startsWith(prefix))
      .map(key => key.replace(prefix, ''));
  } catch {
    return [];
  }
}

/**
 * Migrate old shared storage to user-scoped storage
 * This helps transition existing demo users to the new per-user system
 */
export function migrateSharedToUserStorage(sharedKeys = []) {
  if (!isBrowser || !currentUserId) return;
  
  const oldPrefix = 'staffroom:';
  const userPrefix = `staffroom:user:${currentUserId}:`;
  
  sharedKeys.forEach(key => {
    const oldKey = `${oldPrefix}${key}`;
    const newKey = `${userPrefix}${key}`;
    
    try {
      // Only migrate if user doesn't already have this data
      if (!window.localStorage.getItem(newKey)) {
        const oldValue = window.localStorage.getItem(oldKey);
        if (oldValue) {
          window.localStorage.setItem(newKey, oldValue);
        }
      }
    } catch {
      /* swallow */
    }
  });
}
