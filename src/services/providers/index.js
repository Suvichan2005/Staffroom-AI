/**
 * AI Providers Module
 * 
 * Central export for all provider functionality.
 */

// Type definitions and utilities
export {
  normalizeToolDeclarations,
  toGeminiToolFormat,
  parseGeminiToolCalls,
} from './types.js';

// Registry and configuration
export {
  aiRegistry,
  voiceRegistry,
  initializeProviders,
  getProviderConfig,
} from './registry.js';

// Unified AI Client (recommended for new code)
export {
  generateAI,
  generateStreamAI,
  transcribeAudio,
  createVoiceSession,
  checkProviderHealth,
  getActiveProvider,
  switchProvider,
} from './unifiedAIClient.js';

// Service bridge (for integrating with existing aiService.js)
export {
  generateWithProvider,
  generateStreamWithProvider,
  generateWithTools,
  getProviderInfo,
  setActiveProvider,
  isProviderAvailable,
} from './aiServiceBridge.js';

// Individual providers (for direct access when needed)
export { geminiProvider, GeminiProvider } from './geminiProvider.js';
export { geminiVoiceProvider, GeminiVoiceProvider } from './geminiVoiceProvider.js';
export { mockProvider, mockVoiceProvider, MockProvider, MockVoiceProvider } from './mockProvider.js';
