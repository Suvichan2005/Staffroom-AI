/**
 * AI API Client — Secure Backend Proxy
 *
 * ALL AI calls go through the Express backend.  Zero API keys in the client.
 *
 * The client attaches the Firebase ID token to every request so the backend
 * can verify the user.  The backend holds all provider keys and does the
 * actual AI work.
 *
 * Backend base URL is configured via VITE_BACKEND_URL (defaults to '' which
 * means same-origin; in dev it points at the local Express server).
 */

import { getAuth } from 'firebase/auth';

// ── Configuration ───────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// ── Auth helper ─────────────────────────────────────────────

/**
 * Get a fresh Firebase ID token for the current user.
 * Returns empty string if not signed in (health-check calls).
 */
async function getIdToken() {
  try {
    const user = getAuth().currentUser;
    if (!user) return '';
    return await user.getIdToken(/* forceRefresh */ false);
  } catch {
    return '';
  }
}

/**
 * Build headers with auth.
 */
async function authHeaders(extra = {}) {
  const token = await getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// ── Low-level fetch wrapper ─────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${BACKEND_URL}${path}`;
  const headers = await authHeaders(options.headers);
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    const err = new Error(body.message || body.error || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const contentType = res.headers?.get?.('content-type') || '';
  if (contentType && !contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(`Expected JSON response from AI backend, received ${contentType}: ${text.slice(0, 100)}`);
  }

  return res.json();
}

// ── Public API ──────────────────────────────────────────────

/**
 * Call the AI generation endpoint.
 *
 * @param {Object}  params
 * @param {string}  [params.prompt]            – user message (text only)
 * @param {Array}   [params.parts]             – user message parts (for multimodal / attachments)
 * @param {string}  [params.systemInstruction] – system prompt
 * @param {Array}   [params.tools]             – tool / function declarations
 * @param {Array}   [params.history]           – conversation history (Gemini or OpenAI format)
 * @param {string}  [params.type]              – 'fast' | 'default' | 'complex'
 * @param {Object}  [params.toolConfig]        – e.g. { functionCallingConfig: { mode: 'ANY' } }
 * @param {Object}  [params.generationConfig]
 * @returns {Promise<{text: string, functionCalls: Array, finishReason: string}>}
 */
export async function callAIGenerate({
  prompt,
  parts: userParts,
  systemInstruction,
  tools,
  history,
  type,
  toolConfig,
  generationConfig,
}) {
  // Build messages array from history + current message.
  // Preserves `parts` arrays for function-call / function-response round-trips
  // and multimodal messages (inline images, file content).
  const messages = [];

  if (history?.length) {
    for (const msg of history) {
      if (msg.parts) {
        // Preserve parts directly (functionCall, functionResponse, inlineData, etc.)
        messages.push({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          parts: msg.parts,
        });
      } else {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          content: msg.content || '',
        });
      }
    }
  }

  // Add current user message — either as structured parts or plain text
  if (userParts) {
    messages.push({ role: 'user', parts: userParts });
  } else if (prompt) {
    messages.push({ role: 'user', content: prompt });
  }

  return apiFetch('/api/ai/generate', {
    method: 'POST',
    body: JSON.stringify({
      messages,
      systemInstruction,
      tools,
      type: type || 'default',
      toolConfig,
      generationConfig,
    }),
  });
}

/**
 * Call the vision endpoint (document parsing with images).
 */
export async function callAIVision({ prompt, imageBase64, mimeType, systemInstruction, generationConfig }) {
  return apiFetch('/api/ai/vision', {
    method: 'POST',
    body: JSON.stringify({ prompt, imageBase64, mimeType, systemInstruction, generationConfig }),
  });
}

/**
 * Call the agent endpoint (forced function calling for onboarding).
 */
export async function callAIAgent({ contents, systemInstruction, tools, toolConfig, generationConfig }) {
  return apiFetch('/api/ai/agent', {
    method: 'POST',
    body: JSON.stringify({ contents, systemInstruction, tools, toolConfig, generationConfig }),
  });
}

/**
 * Get a token / WebSocket URL for Gemini Live voice session.
 */
export async function getLiveSessionToken() {
  return apiFetch('/api/ai/live-token');
}

/**
 * Check backend health.
 */
export async function checkAPIHealth() {
  return apiFetch('/api/health');
}

/**
 * Get current provider name.
 */
export function getCurrentProvider() {
  return 'gemini';
}

/**
 * Convert a Blob to base64 (data portion only, no data-URL prefix).
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Legacy default export for compat
export default {
  callAIGenerate,
  callAIVision,
  callAIAgent,
  getLiveSessionToken,
  checkAPIHealth,
  blobToBase64,
  getCurrentProvider,
};
