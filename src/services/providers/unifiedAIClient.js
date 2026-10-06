/**
 * Unified AI Client
 * 
 * Provider-agnostic client that routes AI calls through the registry.
 * Replaces direct provider usage in services.
 */

import { aiRegistry, voiceRegistry, initializeProviders } from './registry.js';
import { normalizeToolDeclarations } from './types.js';

// Initialization state
let initialized = false;
let initPromise = null;

/**
 * Ensure providers are initialized
 */
async function ensureInitialized() {
  if (initialized) return;
  
  if (!initPromise) {
    initPromise = initializeProviders().then(() => {
      initialized = true;
    });
  }
  
  await initPromise;
}

/**
 * Generate text with optional function calling
 * Uses active provider with fallback
 * 
 * @param {Object} options
 * @param {string} options.prompt - User prompt
 * @param {string} [options.systemInstruction] - System instruction
 * @param {Array} [options.history] - Conversation history
 * @param {Array} [options.tools] - Tool declarations
 * @param {Object} [options.generationConfig] - Generation options
 * @returns {Promise<{text: string, toolCalls: Array, finishReason: string}>}
 */
export async function generateAI(options) {
  await ensureInitialized();
  
  const request = {
    prompt: options.prompt,
    systemInstruction: options.systemInstruction,
    history: options.history,
    tools: options.tools ? normalizeToolDeclarations(options.tools) : undefined,
    options: {
      temperature: options.generationConfig?.temperature,
      maxTokens: options.generationConfig?.maxOutputTokens,
      responseFormat: options.responseFormat,
    },
  };
  
  return aiRegistry.generateWithFallback(request);
}

/**
 * Generate with streaming
 * 
 * @param {Object} options
 * @returns {AsyncIterable<{text: string, done: boolean, toolCalls?: Array}>}
 */
export function generateStreamAI(options, onChunk) {
  if (typeof onChunk === 'function') {
    return (async () => {
      await ensureInitialized();
      const provider = aiRegistry.getActive();
      const request = {
        prompt: options.prompt,
        systemInstruction: options.systemInstruction,
        history: options.history,
        tools: options.tools ? normalizeToolDeclarations(options.tools) : undefined,
        options: {
          temperature: options.generationConfig?.temperature,
          maxTokens: options.generationConfig?.maxOutputTokens,
        },
      };
      return provider.generateStream(request, onChunk);
    })();
  }

  return (async function* () {
    await ensureInitialized();
    const provider = aiRegistry.getActive();
    const request = {
      prompt: options.prompt,
      systemInstruction: options.systemInstruction,
      history: options.history,
      tools: options.tools ? normalizeToolDeclarations(options.tools) : undefined,
      options: {
        temperature: options.generationConfig?.temperature,
        maxTokens: options.generationConfig?.maxOutputTokens,
      },
    };
    yield* provider.generateStream(request);
  })();
}

/**
 * Transcribe audio using active voice provider
 * 
 * @param {Blob} audio - Audio blob
 * @param {Object} [options] - Transcription options
 * @returns {Promise<{text: string, confidence: number, method: string}>}
 */
export async function transcribeAudio(audio, options = {}) {
  await ensureInitialized();
  
  return voiceRegistry.transcribeWithFallback(audio, options);
}

/**
 * Create a voice streaming session
 * 
 * @param {Object} options
 * @param {Array} [options.studentList] - Student list for attendance
 * @param {string} [options.classId] - Class ID
 * @param {string} [options.systemPrompt] - Custom system prompt
 * @param {Array} [options.tools] - Tool declarations
 * @param {Function} [options.onTranscript] - Transcript callback
 * @param {Function} [options.onToolCall] - Tool call callback
 * @param {Function} [options.onError] - Error callback
 * @param {Function} [options.onStatusChange] - Status change callback
 * @returns {Object} Streaming session controller
 */
export function createVoiceSession(options) {
  // Note: This is synchronous, but start() is async
  const provider = voiceRegistry.getActive();
  return provider.createStreamingSession(options);
}

/**
 * Get current provider info
 * 
 * @returns {Object}
 */
export function getActiveProviders() {
  return {
    ai: aiRegistry.getActive()?.name || 'unknown',
    voice: voiceRegistry.getActive()?.name || 'unknown',
  };
}

/**
 * Check AI provider health
 * 
 * @returns {Promise<Object>}
 */
export async function checkProviderHealth() {
  await ensureInitialized();
  
  const results = {
    timestamp: new Date().toISOString(),
    providers: {},
  };
  
  // Check all registered AI providers
  for (const name of aiRegistry.getRegisteredProviders()) {
    const provider = aiRegistry.get(name);
    try {
      const isHealthy = await provider.healthCheck();
      results.providers[name] = {
        healthy: isHealthy,
        available: isHealthy,
        active: name === aiRegistry.activeProvider,
      };
    } catch (error) {
      results.providers[name] = {
        healthy: false,
        available: false,
        error: error.message,
        active: name === aiRegistry.activeProvider,
      };
    }
  }
  
  const activeName = aiRegistry.activeProvider;
  results.available = results.providers[activeName]?.available ?? true;
  
  return results;
}

/**
 * Switch active provider at runtime
 * 
 * @param {string} type - 'text' | 'voice'
 * @param {string} providerName - 'azure' | 'gemini' | 'mock'
 */
export function switchProvider(type, providerName) {
  if (type === 'text' || type === 'ai') {
    aiRegistry.setActive(providerName);
  } else if (type === 'voice') {
    voiceRegistry.setActive(providerName);
  } else {
    // Switch both
    aiRegistry.setActive(providerName);
    voiceRegistry.setActive(providerName);
  }
}

/**
 * Get active provider name
 * 
 * @param {string} type - 'text' | 'voice'
 * @returns {string} Provider name
 */
export function getActiveProvider(type) {
  if (type === 'voice') {
    return voiceRegistry.activeProvider || 'gemini';
  }
  return aiRegistry.activeProvider || 'gemini';
}

// Initialize on module load (lazy)
ensureInitialized().catch(err => {
  console.error('[UnifiedAI] Failed to initialize providers:', err);
});
