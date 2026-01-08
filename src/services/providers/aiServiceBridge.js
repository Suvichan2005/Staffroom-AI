/**
 * AI Service Bridge
 * 
 * Bridges the existing aiService.js with the new unified provider system.
 * This allows gradual migration while maintaining backward compatibility.
 * 
 * The bridge intercepts AI calls and routes them through the provider-agnostic
 * unified client, which handles provider selection, fallback, and abstraction.
 */

import { 
  generateAI, 
  generateStreamAI,
  getActiveProvider, 
  switchProvider,
  checkProviderHealth 
} from './index.js';

// Configuration
const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'gemini';
const FALLBACK_ENABLED = import.meta.env.VITE_AI_FALLBACK_ENABLED !== 'false';

// Provider initialization state
let initialized = false;
let initializationPromise = null;

/**
 * Initialize the provider system
 * Ensures we're using the correct provider based on environment config
 */
async function ensureInitialized() {
  if (initialized) return;
  
  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        // Switch to configured provider
        const currentProvider = getActiveProvider('text');
        if (currentProvider !== AI_PROVIDER) {
          console.log(`[AIBridge] Switching from ${currentProvider} to ${AI_PROVIDER}`);
          switchProvider('text', AI_PROVIDER);
        }
        
        // Check health
        const health = await checkProviderHealth('text');
        if (!health.available && FALLBACK_ENABLED) {
          console.warn(`[AIBridge] ${AI_PROVIDER} not available, fallback will be used`);
        }
        
        initialized = true;
        console.log(`[AIBridge] Initialized with provider: ${AI_PROVIDER}`);
      } catch (error) {
        console.error('[AIBridge] Initialization error:', error);
        initialized = true; // Mark as initialized to prevent retry loops
      }
    })();
  }
  
  await initializationPromise;
}

/**
 * Generate AI response using the unified provider system
 * Drop-in replacement for direct Gemini calls
 * 
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - Generated text
 */
export async function generateWithProvider(prompt, options = {}) {
  await ensureInitialized();
  
  const startTime = Date.now();
  const {
    systemPrompt = null,
    temperature = 0.7,
    maxTokens = 2048,
    tools = null,
    useFallback = FALLBACK_ENABLED
  } = options;

  try {
    const result = await generateAI({
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      tools,
      useFallback
    });

    const duration = Date.now() - startTime;
    console.log(`[AIBridge] Generated response in ${duration}ms using ${result.provider || AI_PROVIDER}`);
    
    return result.text;
  } catch (error) {
    console.error('[AIBridge] Generation failed:', error);
    throw error;
  }
}

/**
 * Generate AI response with streaming
 * 
 * @param {string} prompt - The prompt to send
 * @param {Function} onChunk - Callback for each text chunk
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - Complete generated text
 */
export async function generateStreamWithProvider(prompt, onChunk, options = {}) {
  await ensureInitialized();
  
  const {
    systemPrompt = null,
    temperature = 0.7,
    maxTokens = 2048
  } = options;

  try {
    const result = await generateStreamAI({
      prompt,
      systemPrompt,
      temperature,
      maxTokens
    }, onChunk);

    return result.text;
  } catch (error) {
    console.error('[AIBridge] Stream generation failed:', error);
    throw error;
  }
}

/**
 * Generate AI response with tool/function calling
 * Handles the tool loop automatically
 * 
 * @param {string} prompt - The prompt to send
 * @param {Array} tools - Tool definitions
 * @param {Function} executeToolFn - Function to execute tools
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} - Result with text and tool calls
 */
export async function generateWithTools(prompt, tools, executeToolFn, options = {}) {
  await ensureInitialized();
  
  const {
    systemPrompt = null,
    temperature = 0.7,
    maxTokens = 4096,
    maxToolCalls = 10,
    useFallback = FALLBACK_ENABLED
  } = options;

  let messages = [{ role: 'user', content: prompt }];
  let toolCallCount = 0;
  let allToolCalls = [];
  
  while (toolCallCount < maxToolCalls) {
    const result = await generateAI({
      prompt: messages.length === 1 ? prompt : null,
      messages: messages.length > 1 ? messages : null,
      systemPrompt,
      temperature,
      maxTokens,
      tools,
      useFallback
    });

    // Check for tool calls
    if (result.toolCalls && result.toolCalls.length > 0) {
      toolCallCount += result.toolCalls.length;
      allToolCalls.push(...result.toolCalls);
      
      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: result.text || null,
        toolCalls: result.toolCalls
      });
      
      // Execute tools and add results
      for (const toolCall of result.toolCalls) {
        try {
          const toolResult = await executeToolFn(toolCall.name, toolCall.arguments);
          messages.push({
            role: 'tool',
            name: toolCall.name,
            id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        } catch (error) {
          messages.push({
            role: 'tool',
            name: toolCall.name,
            id: toolCall.id,
            content: JSON.stringify({ error: error.message })
          });
        }
      }
    } else {
      // No more tool calls, return final result
      return {
        text: result.text,
        toolCalls: allToolCalls,
        provider: result.provider || AI_PROVIDER
      };
    }
  }
  
  // Max tool calls reached
  console.warn(`[AIBridge] Max tool calls (${maxToolCalls}) reached`);
  return {
    text: messages[messages.length - 1]?.content || '',
    toolCalls: allToolCalls,
    maxReached: true,
    provider: AI_PROVIDER
  };
}

/**
 * Get information about the current provider configuration
 */
export function getProviderInfo() {
  return {
    configured: AI_PROVIDER,
    active: getActiveProvider('text'),
    fallbackEnabled: FALLBACK_ENABLED,
    initialized
  };
}

/**
 * Switch the active provider at runtime
 * @param {string} provider - 'azure' | 'gemini' | 'mock'
 */
export function setActiveProvider(provider) {
  switchProvider('text', provider);
  console.log(`[AIBridge] Switched to provider: ${provider}`);
}

/**
 * Check if a specific provider is available
 * @param {string} provider - Provider to check
 * @returns {Promise<boolean>}
 */
export async function isProviderAvailable(provider) {
  const originalProvider = getActiveProvider('text');
  
  try {
    switchProvider('text', provider);
    const health = await checkProviderHealth('text');
    return health.available;
  } finally {
    switchProvider('text', originalProvider);
  }
}

export default {
  generateWithProvider,
  generateStreamWithProvider,
  generateWithTools,
  getProviderInfo,
  setActiveProvider,
  isProviderAvailable
};
