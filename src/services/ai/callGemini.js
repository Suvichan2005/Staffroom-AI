/**
 * Core AI Call Infrastructure
 * 
 * Provides the callGemini wrapper with retry logic and rate-limit handling.
 * All AI calls route through the backend proxy (callAIGenerate).
 */

import { logGeminiCall } from '../activityLogger';
import { callAIGenerate } from '../aiApiClient';

// Rate limit handling
const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 60000,
};

/**
 * Sleep utility for retry delays
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error) {
  return error?.message?.includes('429') || 
         error?.message?.includes('quota') ||
         error?.message?.includes('rate limit') ||
         error?.status === 429;
}

/**
 * Core AI call function with retry logic.
 * Always routes through the backend proxy.
 */
export async function callGemini(prompt, usePro = false, retryCount = 0) {
  const startTime = Date.now();

  try {
    const result = await callAIGenerate({
      prompt,
      type: usePro ? 'complex' : 'default',
    });
    
    const text = result.text || '';
    logGeminiCall('callGemini', { 
      promptPreview: prompt.substring(0, 200), 
      model: usePro ? 'gemini-3.8-pro' : 'gemini-3.8-flash',
      retryCount 
    }, text, Date.now() - startTime);
    
    return text;
  } catch (error) {
    console.error('AI API Error:', error);
    
    // Handle rate limit with retry
    if (isRateLimitError(error) && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
      const delay = Math.min(
        RATE_LIMIT_CONFIG.baseDelayMs * Math.pow(2, retryCount),
        RATE_LIMIT_CONFIG.maxDelayMs
      );
      console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`);
      await sleep(delay);
      return callGemini(prompt, usePro, retryCount + 1);
    }
    
    logGeminiCall('callGemini', { 
      promptPreview: prompt.substring(0, 200),
      retryCount 
    }, null, Date.now() - startTime, error);
    
    // Final fallback to mock if all retries exhausted
    if (isRateLimitError(error)) {
      console.warn('All retries exhausted, using mock response');
      // Late import to avoid circular dependency
      const { getMockResponse } = await import('./generators');
      return getMockResponse(prompt);
    }
    
    throw error;
  }
}
