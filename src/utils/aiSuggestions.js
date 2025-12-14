/**
 * AI Suggestions Cache and Rate Limiting
 * Caches suggestions for 1 hour after sign-in
 * Allows manual regeneration with rate limiting
 */

const CACHE_KEY_PREFIX = 'ai_suggestions_';
const RATE_LIMIT_KEY_PREFIX = 'ai_ratelimit_';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_DURATION = 5 * 60 * 1000; // 5 minutes between manual regenerations

/**
 * Get cached suggestions for a specific context
 * @param {string} contextKey - Unique key for the context (e.g., 'dashboard', 'class_6A')
 * @returns {object|null} - Cached data or null if expired/not found
 */
export function getCachedSuggestions(contextKey) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${contextKey}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const { data, timestamp, sessionId } = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (within 1 hour)
    if (now - timestamp < CACHE_DURATION) {
      return { data, timestamp, sessionId, isExpired: false };
    }
    
    // Cache expired
    return { data, timestamp, sessionId, isExpired: true };
  } catch (error) {
    console.error('Error reading cached suggestions:', error);
    return null;
  }
}

/**
 * Save suggestions to cache
 * @param {string} contextKey - Unique key for the context
 * @param {any} data - Suggestions data to cache
 * @param {string} sessionId - Optional session ID to track which login generated this
 */
export function cacheSuggestions(contextKey, data, sessionId = null) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${contextKey}`;
    const cacheData = {
      data,
      timestamp: Date.now(),
      sessionId: sessionId || getCurrentSessionId(),
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    return true;
  } catch (error) {
    console.error('Error caching suggestions:', error);
    return false;
  }
}

/**
 * Clear cached suggestions for a context
 */
export function clearCachedSuggestions(contextKey) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${contextKey}`;
    localStorage.removeItem(cacheKey);
    return true;
  } catch (error) {
    console.error('Error clearing cached suggestions:', error);
    return false;
  }
}

/**
 * Check if user can manually regenerate (rate limit check)
 * @param {string} contextKey - Context key
 * @returns {object} - { canRegenerate: boolean, timeUntilNextAllowed: number }
 */
export function checkRegenerationLimit(contextKey) {
  try {
    const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${contextKey}`;
    const lastRegeneration = localStorage.getItem(rateLimitKey);
    
    if (!lastRegeneration) {
      return { canRegenerate: true, timeUntilNextAllowed: 0 };
    }
    
    const lastTime = parseInt(lastRegeneration, 10);
    const now = Date.now();
    const timeSinceLastRegen = now - lastTime;
    
    if (timeSinceLastRegen >= RATE_LIMIT_DURATION) {
      return { canRegenerate: true, timeUntilNextAllowed: 0 };
    }
    
    return {
      canRegenerate: false,
      timeUntilNextAllowed: RATE_LIMIT_DURATION - timeSinceLastRegen,
    };
  } catch (error) {
    console.error('Error checking regeneration limit:', error);
    return { canRegenerate: true, timeUntilNextAllowed: 0 };
  }
}

/**
 * Mark that a regeneration happened (for rate limiting)
 */
export function markRegeneration(contextKey) {
  try {
    const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${contextKey}`;
    localStorage.setItem(rateLimitKey, Date.now().toString());
    return true;
  } catch (error) {
    console.error('Error marking regeneration:', error);
    return false;
  }
}

/**
 * Get or generate a session ID for tracking sign-ins
 */
function getCurrentSessionId() {
  try {
    let sessionId = sessionStorage.getItem('current_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('current_session_id', sessionId);
    }
    return sessionId;
  } catch (error) {
    return `session_${Date.now()}`;
  }
}

/**
 * Check if suggestions should be regenerated
 * Returns true if:
 * - No cache exists
 * - Cache is from a different session AND cache is expired
 * - User manually requested AND rate limit allows
 */
export function shouldRegenerateSuggestions(contextKey, isManualRequest = false) {
  const cached = getCachedSuggestions(contextKey);
  
  // No cache exists, generate
  if (!cached) {
    return { shouldRegenerate: true, reason: 'no_cache' };
  }
  
  // Manual request
  if (isManualRequest) {
    const rateLimit = checkRegenerationLimit(contextKey);
    if (!rateLimit.canRegenerate) {
      return {
        shouldRegenerate: false,
        reason: 'rate_limited',
        timeUntilNextAllowed: rateLimit.timeUntilNextAllowed,
      };
    }
    return { shouldRegenerate: true, reason: 'manual_request' };
  }
  
  // Auto-regeneration: only if cache expired AND different session
  const currentSessionId = getCurrentSessionId();
  if (cached.isExpired && cached.sessionId !== currentSessionId) {
    return { shouldRegenerate: true, reason: 'new_session_expired' };
  }
  
  // Use cached data
  return { shouldRegenerate: false, reason: 'cached_valid', cachedData: cached.data };
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Clear all AI suggestion caches (useful for logout/reset)
 */
export function clearAllSuggestionCaches() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX) || key.startsWith(RATE_LIMIT_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing all suggestion caches:', error);
    return false;
  }
}
