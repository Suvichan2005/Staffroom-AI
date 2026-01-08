/**
 * AI Provider Registry
 * 
 * Central registry for AI providers with runtime switching and fallback support.
 * Manages both text (AI) and voice providers.
 */

/**
 * @typedef {'azure' | 'gemini' | 'mock'} ProviderName
 */

// Provider configuration from environment
const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'gemini';
const AI_FALLBACK_ENABLED = import.meta.env.VITE_AI_FALLBACK_ENABLED !== 'false';
const AI_FALLBACK_ORDER = (import.meta.env.VITE_AI_FALLBACK_ORDER || 'azure,gemini,mock').split(',');

// Circuit breaker state
const circuitBreaker = {
  failures: new Map(), // provider -> failure count
  lastFailure: new Map(), // provider -> timestamp
  threshold: 3, // failures before circuit opens
  resetTime: 60000, // 1 minute before retrying
};

/**
 * AI Provider Registry
 */
class AIProviderRegistry {
  constructor() {
    /** @type {Map<string, Object>} */
    this.providers = new Map();
    
    /** @type {string} */
    this.activeProvider = AI_PROVIDER;
    
    /** @type {boolean} */
    this.fallbackEnabled = AI_FALLBACK_ENABLED;
    
    /** @type {string[]} */
    this.fallbackOrder = AI_FALLBACK_ORDER;
  }

  /**
   * Register a provider
   * @param {Object} provider - Provider instance with name property
   */
  register(provider) {
    if (!provider?.name) {
      throw new Error('Provider must have a name property');
    }
    this.providers.set(provider.name, provider);
    console.log(`[Registry] Registered AI provider: ${provider.name}`);
  }

  /**
   * Set the active provider
   * @param {ProviderName} name
   */
  setActive(name) {
    if (!this.providers.has(name)) {
      console.warn(`[Registry] Provider ${name} not registered, keeping ${this.activeProvider}`);
      return;
    }
    this.activeProvider = name;
    console.log(`[Registry] Active AI provider set to: ${name}`);
  }

  /**
   * Get the active provider
   * @returns {Object}
   */
  getActive() {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Active provider ${this.activeProvider} not found`);
    }
    return provider;
  }

  /**
   * Get a specific provider by name
   * @param {ProviderName} name
   * @returns {Object|undefined}
   */
  get(name) {
    return this.providers.get(name);
  }

  /**
   * Get all registered provider names
   * @returns {string[]}
   */
  getRegisteredProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if circuit breaker is open for a provider
   * @param {string} providerName
   * @returns {boolean}
   */
  isCircuitOpen(providerName) {
    const failures = circuitBreaker.failures.get(providerName) || 0;
    const lastFailure = circuitBreaker.lastFailure.get(providerName) || 0;
    
    if (failures >= circuitBreaker.threshold) {
      // Check if reset time has passed
      if (Date.now() - lastFailure > circuitBreaker.resetTime) {
        // Reset circuit
        circuitBreaker.failures.set(providerName, 0);
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record a provider failure
   * @param {string} providerName
   */
  recordFailure(providerName) {
    const failures = (circuitBreaker.failures.get(providerName) || 0) + 1;
    circuitBreaker.failures.set(providerName, failures);
    circuitBreaker.lastFailure.set(providerName, Date.now());
    console.warn(`[Registry] Provider ${providerName} failure recorded (${failures}/${circuitBreaker.threshold})`);
  }

  /**
   * Record a provider success (reset failures)
   * @param {string} providerName
   */
  recordSuccess(providerName) {
    circuitBreaker.failures.set(providerName, 0);
  }

  /**
   * Generate with automatic fallback
   * @param {import('./types.js').GenerateRequest} request
   * @returns {Promise<import('./types.js').GenerateResponse>}
   */
  async generateWithFallback(request) {
    const providers = this.fallbackEnabled 
      ? [this.activeProvider, ...this.fallbackOrder.filter(p => p !== this.activeProvider)]
      : [this.activeProvider];

    let lastError = null;

    for (const providerName of providers) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      // Check circuit breaker
      if (this.isCircuitOpen(providerName)) {
        console.warn(`[Registry] Circuit open for ${providerName}, skipping`);
        continue;
      }

      try {
        // Health check first
        const isHealthy = await provider.healthCheck();
        if (!isHealthy) {
          console.warn(`[Registry] Provider ${providerName} health check failed`);
          this.recordFailure(providerName);
          continue;
        }

        // Attempt generation
        const response = await provider.generate(request);
        this.recordSuccess(providerName);
        
        // Tag response with provider name for debugging
        response._provider = providerName;
        return response;

      } catch (error) {
        console.error(`[Registry] Provider ${providerName} error:`, error.message);
        this.recordFailure(providerName);
        lastError = error;
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  /**
   * Generate with specific provider (no fallback)
   * @param {ProviderName} providerName
   * @param {import('./types.js').GenerateRequest} request
   * @returns {Promise<import('./types.js').GenerateResponse>}
   */
  async generateWith(providerName, request) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not registered`);
    }
    return provider.generate(request);
  }
}

/**
 * Voice Provider Registry
 */
class VoiceProviderRegistry {
  constructor() {
    /** @type {Map<string, Object>} */
    this.providers = new Map();
    
    /** @type {string} */
    this.activeProvider = AI_PROVIDER;
  }

  /**
   * Register a voice provider
   * @param {Object} provider
   */
  register(provider) {
    if (!provider?.name) {
      throw new Error('Provider must have a name property');
    }
    this.providers.set(provider.name, provider);
    console.log(`[Registry] Registered voice provider: ${provider.name}`);
  }

  /**
   * Set the active provider
   * @param {ProviderName} name
   */
  setActive(name) {
    if (!this.providers.has(name)) {
      console.warn(`[Registry] Voice provider ${name} not registered`);
      return;
    }
    this.activeProvider = name;
    console.log(`[Registry] Active voice provider set to: ${name}`);
  }

  /**
   * Get the active provider
   * @returns {Object}
   */
  getActive() {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Active voice provider ${this.activeProvider} not found`);
    }
    return provider;
  }

  /**
   * Get a specific provider by name
   * @param {ProviderName} name
   * @returns {Object|undefined}
   */
  get(name) {
    return this.providers.get(name);
  }

  /**
   * Transcribe with fallback
   * @param {Blob} audio
   * @param {Object} options
   * @returns {Promise<import('./types.js').TranscriptionResult>}
   */
  async transcribeWithFallback(audio, options) {
    const providers = AI_FALLBACK_ENABLED
      ? [this.activeProvider, ...AI_FALLBACK_ORDER.filter(p => p !== this.activeProvider)]
      : [this.activeProvider];

    let lastError = null;

    for (const providerName of providers) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        const isHealthy = await provider.healthCheck();
        if (!isHealthy) continue;

        const result = await provider.transcribe(audio, options);
        result._provider = providerName;
        return result;

      } catch (error) {
        console.warn(`[Registry] Voice provider ${providerName} error:`, error.message);
        lastError = error;
      }
    }

    throw lastError || new Error('All voice providers failed');
  }

  /**
   * Create a streaming session with the active provider
   * @param {import('./types.js').StreamingSessionOptions} options
   * @returns {Object}
   */
  createStreamingSession(options) {
    const provider = this.getActive();
    return provider.createStreamingSession(options);
  }
}

// Create singleton instances
export const aiRegistry = new AIProviderRegistry();
export const voiceRegistry = new VoiceProviderRegistry();

/**
 * Initialize registries with available providers
 * Called once at app startup
 */
export async function initializeProviders() {
  console.log('[Registry] Initializing AI providers...');
  console.log(`[Registry] Active provider: ${AI_PROVIDER}`);
  console.log(`[Registry] Fallback enabled: ${AI_FALLBACK_ENABLED}`);
  console.log(`[Registry] Fallback order: ${AI_FALLBACK_ORDER.join(' -> ')}`);
  
  // Import and register providers dynamically
  try {
    // Gemini providers
    const { geminiProvider } = await import('./geminiProvider.js');
    const { geminiVoiceProvider } = await import('./geminiVoiceProvider.js');
    aiRegistry.register(geminiProvider);
    voiceRegistry.register(geminiVoiceProvider);
  } catch (error) {
    console.warn('[Registry] Failed to load Gemini provider:', error.message);
  }
  
  try {
    // Azure providers (will be added in Phase 1)
    const { azureProvider } = await import('./azureProvider.js');
    const { azureVoiceProvider } = await import('./azureVoiceProvider.js');
    aiRegistry.register(azureProvider);
    voiceRegistry.register(azureVoiceProvider);
  } catch (error) {
    // Expected to fail until Azure providers are implemented
    console.log('[Registry] Azure providers not yet available');
  }
  
  try {
    // Mock provider (fallback)
    const { mockProvider } = await import('./mockProvider.js');
    const { mockVoiceProvider } = await import('./mockProvider.js');
    aiRegistry.register(mockProvider);
    voiceRegistry.register(mockVoiceProvider);
  } catch (error) {
    console.warn('[Registry] Mock provider not available');
  }
  
  // Set active provider
  aiRegistry.setActive(AI_PROVIDER);
  voiceRegistry.setActive(AI_PROVIDER);
  
  console.log(`[Registry] Registered AI providers: ${aiRegistry.getRegisteredProviders().join(', ')}`);
}

/**
 * Get current provider configuration
 * @returns {Object}
 */
export function getProviderConfig() {
  return {
    active: AI_PROVIDER,
    fallbackEnabled: AI_FALLBACK_ENABLED,
    fallbackOrder: AI_FALLBACK_ORDER,
    registeredAI: aiRegistry.getRegisteredProviders(),
    registeredVoice: Array.from(voiceRegistry.providers.keys()),
  };
}
