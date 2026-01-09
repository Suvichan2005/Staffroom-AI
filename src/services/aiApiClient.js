/**
 * AI API Client - Secure proxy to Firebase Cloud Functions
 * 
 * This service provides a secure interface to AI capabilities.
 * 
 * In PRODUCTION: Routes through Firebase Cloud Functions (API keys server-side)
 * In DEVELOPMENT: 
 *   - With emulator: Uses Firebase emulator endpoints
 *   - Without emulator: Uses Vite proxy for direct Azure calls (dev only)
 * 
 * Supports multiple providers:
 * - Azure OpenAI (default for Imagine Cup)
 * - Google Gemini (fallback)
 */

// Configuration
const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'gemini';
// Disable proxy - use direct browser API calls
const USE_PROXY = false;
const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const AZURE_API_KEY = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const AZURE_DEPLOYMENT = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1-mini';
const AZURE_API_VERSION = import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-12-01-preview';

// Check if we can make direct Azure calls (dev mode with credentials)
const CAN_USE_DIRECT_AZURE = import.meta.env.DEV && AZURE_ENDPOINT && AZURE_API_KEY && AI_PROVIDER === 'azure';

// Base URL for Firebase emulator
const EMULATOR_BASE = 'http://localhost:5001/staffroom-ai/us-central1';

/**
 * Get the appropriate endpoint based on provider and mode
 */
function getEndpoint(type, provider = AI_PROVIDER) {
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;
  
  // In production, always use Cloud Functions proxy
  if (isProd || USE_PROXY) {
    const prodEndpoints = {
      azure: {
        generate: '/api/ai/azure/generate',
        transcribe: '/api/ai/azure/transcribe',
        liveToken: '/api/ai/azure/speech-token',
        health: '/api/health/azure',
      },
      gemini: {
        generate: '/api/ai/generate',
        transcribe: '/api/ai/transcribe',
        liveToken: '/api/ai/live-token',
        health: '/api/health',
      }
    };
    return prodEndpoints[provider]?.[type] || prodEndpoints.gemini[type];
  }
  
  // In dev with direct Azure access, use Vite proxy
  if (CAN_USE_DIRECT_AZURE && type === 'generate') {
    return 'DIRECT_AZURE'; // Special marker for direct calls
  }
  
  // Fall back to emulator endpoints
  const devEndpoints = {
    azure: {
      generate: `${EMULATOR_BASE}/azureGenerate`,
      transcribe: `${EMULATOR_BASE}/azureTranscribe`,
      liveToken: `${EMULATOR_BASE}/azureSpeechToken`,
      health: `${EMULATOR_BASE}/azureHealth`,
    },
    gemini: {
      generate: `${EMULATOR_BASE}/aiGenerate`,
      transcribe: `${EMULATOR_BASE}/transcribe`,
      liveToken: `${EMULATOR_BASE}/getLiveToken`,
      health: `${EMULATOR_BASE}/health`,
    }
  };
  
  return devEndpoints[provider]?.[type] || devEndpoints.gemini[type];
}

/**
 * Make a direct Azure OpenAI call (dev mode only, uses Vite proxy)
 */
async function callAzureDirect({ messages, tools, options, useCase }) {
  const deployment = getDeploymentForUseCase(useCase);
  
  // Use Vite proxy to bypass CORS (configured in vite.config.js)
  const url = `/azure-proxy/openai/deployments/${deployment}/chat/completions?api-version=${AZURE_API_VERSION}`;
  
  // Check if this is a reasoning model (o-series or gpt-5) - they don't support temperature
  const isReasoningModel = deployment.startsWith('o') || deployment.includes('gpt-5');
  
  const body = {
    messages,
    max_completion_tokens: options?.maxTokens ?? 2048, // GPT-4.1+ uses max_completion_tokens
  };
  
  // Only add temperature for non-reasoning models
  if (!isReasoningModel) {
    body.temperature = options?.temperature ?? 0.7;
  }
  
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }
  
  console.log(`[aiApiClient] Direct Azure call to ${deployment} via Vite proxy`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_API_KEY,
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[aiApiClient] Azure error:', errorData);
    throw new Error(errorData.error?.message || `Azure API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get deployment name based on use case
 */
function getDeploymentForUseCase(useCase) {
  const MODEL_MAP = {
    'chat': import.meta.env.VITE_AZURE_DEPLOYMENT_FAST || 'gpt-5-mini',
    'quiz': import.meta.env.VITE_AZURE_DEPLOYMENT_FAST || 'gpt-5-mini',
    'briefing': import.meta.env.VITE_AZURE_DEPLOYMENT_FAST || 'gpt-5-mini',
    'analysis': import.meta.env.VITE_AZURE_DEPLOYMENT_STANDARD || 'gpt-5-mini',
    'tools': import.meta.env.VITE_AZURE_DEPLOYMENT_STANDARD || 'gpt-5-mini',
    'reasoning': import.meta.env.VITE_AZURE_DEPLOYMENT_REASONING || 'gpt-5-mini',
  };
  return MODEL_MAP[useCase] || AZURE_DEPLOYMENT;
}

/**
 * Call the AI generation endpoint (Azure or Gemini based on config)
 * 
 * @param {Object} params - Generation parameters
 * @param {string} params.prompt - The user prompt
 * @param {string} [params.systemInstruction] - System instructions for the model
 * @param {Array} [params.tools] - Tool definitions for function calling
 * @param {Array} [params.history] - Conversation history
 * @param {string} [params.useCase] - Use case for model selection (chat, analysis, reasoning)
 * @returns {Promise<{text: string, functionCalls: Array, finishReason: string}>}
 */
export async function callAIGenerate({ prompt, systemInstruction, tools, history, useCase }) {
  const endpoint = getEndpoint('generate');
  
  // Build request components
  const { messages, formattedTools } = buildAzureRequest({ prompt, systemInstruction, tools, history, useCase });
  
  // Use direct Azure call in dev mode when emulator isn't needed
  if (endpoint === 'DIRECT_AZURE') {
    console.log(`[aiApiClient] Using direct Azure call (dev mode)`);
    try {
      const result = await callAzureDirect({ 
        messages, 
        tools: formattedTools, 
        options: { temperature: 1, maxTokens: 2048 },
        useCase 
      });
      return normalizeResponse(result, 'azure');
    } catch (error) {
      console.error('[aiApiClient] Direct Azure call failed:', error);
      throw error;
    } 
  }
  
  // Build request body based on provider
  const body = AI_PROVIDER === 'azure' 
    ? { messages, tools: formattedTools, useCase, options: { temperature: 0.7, maxTokens: 2048 } }
    : buildGeminiRequest({ prompt, systemInstruction, tools, history });
    
  console.log(`[aiApiClient] Calling ${AI_PROVIDER} at ${endpoint}`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `AI request failed: ${response.status}`);
  }
  
  const result = await response.json();
  
  // Normalize response format
  return normalizeResponse(result, AI_PROVIDER);
}

/**
 * Build Azure OpenAI request format
 */
function buildAzureRequest({ prompt, systemInstruction, tools, history, useCase }) {
  const messages = [];
  
  // System message
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  
  // History
  if (history && history.length > 0) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content || msg.parts?.[0]?.text });
    }
  }
  
  // Current prompt
  if (prompt) {
    messages.push({ role: 'user', content: prompt });
  }
  
  return {
    messages,
    formattedTools: tools ? formatToolsForAzure(tools) : undefined,
    useCase: useCase || 'chat',
    options: {
      temperature: 0.7,
      maxTokens: 2048,
    }
  };
}

/**
 * Build Gemini request format
 */
function buildGeminiRequest({ prompt, systemInstruction, tools, history }) {
  return {
    prompt,
    systemInstruction,
    tools,
    history,
  };
}

/**
 * Format tools for Azure OpenAI
 */
function formatToolsForAzure(tools) {
  if (!tools || !Array.isArray(tools)) return undefined;
  
  return tools.map(tool => {
    // Handle Gemini format
    if (tool.functionDeclarations) {
      return tool.functionDeclarations.map(fn => ({
        type: 'function',
        function: {
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters,
        }
      }));
    }
    
    // Handle normalized format
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }
    };
  }).flat();
}

/**
 * Normalize response from different providers
 */
function normalizeResponse(result, provider) {
  if (provider === 'azure') {
    const choice = result.choices?.[0];
    const message = choice?.message;
    
    return {
      text: message?.content || '',
      functionCalls: message?.tool_calls?.map(tc => ({
        name: tc.function?.name,
        args: JSON.parse(tc.function?.arguments || '{}'),
      })) || [],
      finishReason: choice?.finish_reason || 'stop',
      usage: result.usage,
    };
  }
  
  // Gemini format (already normalized by proxy)
  return result;
}

/**
 * Transcribe audio using the appropriate provider (Azure Speech or Whisper)
 * 
 * @param {Object} params - Transcription parameters
 * @param {string} params.audio - Base64 encoded audio data
 * @param {string} [params.mimeType] - MIME type of the audio (default: audio/webm)
 * @param {string} [params.language] - Language code (default: en-IN)
 * @returns {Promise<{text: string, success: boolean}>}
 */
export async function transcribeAudio({ audio, mimeType = 'audio/webm', language = 'en-IN' }) {
  const endpoint = getEndpoint('transcribe');
  
  console.log(`[aiApiClient] Transcribing with ${AI_PROVIDER} at ${endpoint}`);
    
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio,
      mimeType,
      language,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `Transcription failed: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get a token/URL for live voice session (Gemini Live or Azure Speech)
 * 
 * @returns {Promise<{wsUrl?: string, token?: string, region?: string, expiresIn: number}>}
 */
export async function getLiveSessionToken() {
  const endpoint = getEndpoint('liveToken');
  
  console.log(`[aiApiClient] Getting live token from ${AI_PROVIDER} at ${endpoint}`);
    
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
 * @returns {Promise<{status: string, timestamp: string, version: string, provider: string}>}
 */
export async function checkAPIHealth() {
  const endpoint = getEndpoint('health');
    
  const response = await fetch(endpoint);
  
  if (!response.ok) {
    throw new Error('API health check failed');
  }
  
  const result = await response.json();
  return { ...result, provider: AI_PROVIDER };
}

/**
 * Get the currently configured AI provider
 * @returns {string} 'azure' | 'gemini'
 */
export function getCurrentProvider() {
  return AI_PROVIDER;
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
  getCurrentProvider,
};
