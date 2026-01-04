/**
 * AI API Client - Secure proxy to Firebase Cloud Functions
 * 
 * This service provides a secure interface to AI capabilities
 * by routing requests through Firebase Cloud Functions, which
 * keep API keys server-side and hidden from the client bundle.
 * 
 * SECURITY: API keys are NEVER exposed to the browser.
 * All AI calls go through /api/* endpoints which are handled
 * by Firebase Cloud Functions.
 */

// Base URL for API calls (uses same-origin in production)
const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:5001/staffroom-ai/us-central1' 
  : '';

/**
 * Call the Gemini AI generation endpoint
 * 
 * @param {Object} params - Generation parameters
 * @param {string} params.prompt - The user prompt
 * @param {string} [params.systemInstruction] - System instructions for the model
 * @param {Array} [params.tools] - Tool definitions for function calling
 * @param {Array} [params.history] - Conversation history
 * @returns {Promise<{text: string, functionCalls: Array, finishReason: string}>}
 */
export async function callAIGenerate({ prompt, systemInstruction, tools, history }) {
  const endpoint = import.meta.env.DEV 
    ? `${API_BASE}/aiGenerate`
    : '/api/ai/generate';
    
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      systemInstruction,
      tools,
      history,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `AI request failed: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Transcribe audio using the Whisper API
 * 
 * @param {Object} params - Transcription parameters
 * @param {string} params.audio - Base64 encoded audio data
 * @param {string} [params.mimeType] - MIME type of the audio (default: audio/webm)
 * @returns {Promise<{text: string, success: boolean}>}
 */
export async function transcribeAudio({ audio, mimeType = 'audio/webm' }) {
  const endpoint = import.meta.env.DEV 
    ? `${API_BASE}/transcribe`
    : '/api/ai/transcribe';
    
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio,
      mimeType,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `Transcription failed: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get a token/URL for Gemini Live WebSocket connection
 * 
 * @returns {Promise<{wsUrl: string, expiresIn: number}>}
 */
export async function getLiveSessionToken() {
  const endpoint = import.meta.env.DEV 
    ? `${API_BASE}/getLiveToken`
    : '/api/ai/live-token';
    
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `Failed to get live token: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Check if the AI API is healthy
 * 
 * @returns {Promise<{status: string, timestamp: string, version: string}>}
 */
export async function checkAPIHealth() {
  const endpoint = import.meta.env.DEV 
    ? `${API_BASE}/health`
    : '/api/health';
    
  const response = await fetch(endpoint);
  
  if (!response.ok) {
    throw new Error('API health check failed');
  }
  
  return response.json();
}

/**
 * Helper to convert a Blob to base64
 * 
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} Base64 encoded string (without data URL prefix)
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default {
  callAIGenerate,
  transcribeAudio,
  getLiveSessionToken,
  checkAPIHealth,
  blobToBase64,
};
