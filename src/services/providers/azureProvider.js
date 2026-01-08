/**
 * Azure OpenAI Provider
 * 
 * Implements the AI Provider interface for Azure OpenAI Service.
 * 
 * OPTIMAL MODEL SELECTION (Azure OpenAI Pricing - Jan 2026):
 * ┌─────────────────────┬─────────────────┬─────────────────────────────┐
 * │ Use Case            │ Model           │ Cost (₹/1M tokens)          │
 * ├─────────────────────┼─────────────────┼─────────────────────────────┤
 * │ Chat/Quiz/Briefing  │ gpt-4.1-nano    │ ₹9 in / ₹36 out (CHEAPEST)  │
 * │ Analysis/Syllabus   │ gpt-4.1-mini    │ ₹36 in / ₹144 out           │
 * │ Tool Calling        │ gpt-4.1-mini    │ Reliable function calling   │
 * │ Complex Reasoning   │ o4-mini         │ ₹99 in / ₹396 out           │
 * │ Premium Tasks       │ gpt-4.1         │ ₹180 in / ₹720 out          │
 * │ Real-time Voice     │ gpt-realtime-mini│ Audio-optimized            │
 * └─────────────────────┴─────────────────┴─────────────────────────────┘
 */

import { 
  toAzureToolFormat, 
  parseAzureToolCalls,
  normalizeToolDeclarations 
} from './types.js';

// Azure OpenAI Configuration from environment
const AZURE_OPENAI_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_API_VERSION = import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-12-01-preview';

// Model deployments for different use cases (cost-optimized Jan 2026)
const AZURE_MODELS = {
  // FAST: Cheapest model for simple tasks - ₹9/₹36 per 1M tokens
  FAST: import.meta.env.VITE_AZURE_DEPLOYMENT_FAST || 'gpt-4.1-nano',
  
  // STANDARD: Balanced for analysis & tools - ₹36/₹144 per 1M tokens
  STANDARD: import.meta.env.VITE_AZURE_DEPLOYMENT_STANDARD || 'gpt-4.1-mini',
  
  // PRO: Full capability - ₹180/₹720 per 1M tokens
  PRO: import.meta.env.VITE_AZURE_DEPLOYMENT_PRO || 'gpt-4.1',
  
  // REASONING: Math, coding, complex analysis - ₹99/₹396 per 1M tokens
  REASONING: import.meta.env.VITE_AZURE_DEPLOYMENT_REASONING || 'o4-mini',
  
  // REALTIME: Audio-optimized for voice features
  REALTIME: import.meta.env.VITE_AZURE_DEPLOYMENT_REALTIME || 'gpt-realtime-mini',
};

// Legacy/default deployment (for backward compatibility)
const AZURE_OPENAI_DEPLOYMENT = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || AZURE_MODELS.STANDARD;

// Use proxy in production to hide API keys
const USE_PROXY = import.meta.env.PROD || import.meta.env.VITE_USE_AI_PROXY === 'true';

// Default configuration
const DEFAULT_CONFIG = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
};

// Rate limit handling
const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 60000,
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is rate limit
 */
function isRateLimitError(error) {
  return error?.status === 429 || 
         error?.message?.includes('429') ||
         error?.message?.includes('rate limit') ||
         error?.message?.includes('quota');
}

/**
 * Build Azure OpenAI API URL
 */
function buildApiUrl(deployment = AZURE_OPENAI_DEPLOYMENT) {
  if (!AZURE_OPENAI_ENDPOINT) {
    throw new Error('Azure OpenAI endpoint not configured');
  }
  
  return `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${deployment}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
}

/**
 * Call Azure OpenAI via proxy (production)
 */
async function callViaProxy(request) {
  const endpoint = '/api/ai/azure/generate';
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `Azure API request failed: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Call Azure OpenAI directly (development)
 */
async function callDirect(messages, tools, options) {
  if (!AZURE_OPENAI_API_KEY) {
    throw new Error('Azure OpenAI API key not configured');
  }
  
  const url = buildApiUrl();
  
  const body = {
    messages,
    temperature: options?.temperature ?? DEFAULT_CONFIG.temperature,
    max_tokens: options?.maxTokens ?? DEFAULT_CONFIG.maxTokens,
    top_p: options?.topP ?? DEFAULT_CONFIG.topP,
  };
  
  // Add tools if provided
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }
  
  // Add response format for JSON output
  if (options?.responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error?.message || `Azure OpenAI error: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  
  return response.json();
}

/**
 * Azure OpenAI Provider Implementation
 */
class AzureProvider {
  constructor() {
    this.name = 'azure';
    this.models = AZURE_MODELS;
  }

  /**
   * Get optimal model for a use case
   * @param {string} useCase - Type of task
   * @returns {string} Deployment name
   */
  getModelForUseCase(useCase) {
    switch (useCase) {
      // Cheapest tier: gpt-4.1-nano (₹9/₹36 per 1M tokens)
      case 'chat':
      case 'briefing':
      case 'quiz':
      case 'simple':
        return this.models.FAST;
      
      // Standard tier: gpt-4.1-mini (₹36/₹144 per 1M tokens)
      case 'analysis':
      case 'syllabus':
      case 'tools':
      case 'function-calling':
      case 'attendance':
      case 'student-performance':
        return this.models.STANDARD;
      
      // Reasoning tier: o4-mini (₹99/₹396 per 1M tokens)
      case 'reasoning':
      case 'complex':
      case 'math':
      case 'coding':
        return this.models.REASONING;
      
      // Premium tier: gpt-4.1 (₹180/₹720 per 1M tokens)
      case 'premium':
      case 'pro':
        return this.models.PRO;
      
      // Real-time audio
      case 'realtime':
      case 'voice':
        return this.models.REALTIME;
      
      default:
        return this.models.STANDARD;
    }
  }

  /**
   * Check if provider is available
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    // In production, check proxy health
    if (USE_PROXY) {
      try {
        const response = await fetch('/api/health/azure');
        return response.ok;
      } catch {
        return false;
      }
    }
    
    // In development, check direct configuration
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      return false;
    }
    
    try {
      // Simple test request
      const result = await this.generate({
        prompt: 'Hi',
        options: { maxTokens: 5 },
      });
      return !!result.text || result.toolCalls?.length > 0;
    } catch (error) {
      console.warn('[AzureProvider] Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Generate text with optional function calling
   * @param {import('./types.js').GenerateRequest} request
   * @returns {Promise<import('./types.js').GenerateResponse>}
   */
  async generate(request, retryCount = 0) {
    const { prompt, systemInstruction, history, tools, options } = request;
    
    // Select optimal model based on use case
    const useCase = request.useCase || (tools?.length > 0 ? 'tools' : 'chat');
    const deployment = request.model || this.getModelForUseCase(useCase);
    
    console.log(`[AzureProvider] Using model: ${deployment} for use case: ${useCase}`);
    
    try {
      // Build messages array
      const messages = [];
      
      // Add system instruction
      if (systemInstruction) {
        messages.push({
          role: 'system',
          content: systemInstruction,
        });
      }
      
      // Add conversation history
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
      
      // Add current user prompt
      messages.push({
        role: 'user',
        content: prompt,
      });
      
      // Convert tools to Azure format
      let azureTools = null;
      if (tools && tools.length > 0) {
        const normalizedTools = normalizeToolDeclarations(tools);
        azureTools = toAzureToolFormat(normalizedTools);
      }
      
      // Make API call
      let result;
      if (USE_PROXY) {
        result = await callViaProxy({
          messages,
          tools: azureTools,
          options,
        });
      } else {
        result = await callDirect(messages, azureTools, options);
      }
      
      // Parse response
      const choice = result.choices?.[0];
      const message = choice?.message;
      
      if (!message) {
        throw new Error('No response from Azure OpenAI');
      }
      
      // Determine finish reason
      let finishReason = 'stop';
      if (choice.finish_reason === 'tool_calls') {
        finishReason = 'tool_calls';
      } else if (choice.finish_reason === 'length') {
        finishReason = 'length';
      }
      
      return {
        text: message.content || '',
        toolCalls: parseAzureToolCalls(message.tool_calls || []),
        finishReason,
        usage: result.usage ? {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
        } : undefined,
      };
      
    } catch (error) {
      console.error('[AzureProvider] Generate error:', error);
      
      // Handle rate limit with retry
      if (isRateLimitError(error) && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
        const delay = Math.min(
          RATE_LIMIT_CONFIG.baseDelayMs * Math.pow(2, retryCount),
          RATE_LIMIT_CONFIG.maxDelayMs
        );
        
        console.warn(`[AzureProvider] Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`);
        await sleep(delay);
        return this.generate(request, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Generate text with streaming
   * @param {import('./types.js').GenerateRequest} request
   * @returns {AsyncIterable<import('./types.js').StreamChunk>}
   */
  async *generateStream(request) {
    const { prompt, systemInstruction, history, tools, options } = request;
    
    // Build messages array
    const messages = [];
    
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    
    messages.push({ role: 'user', content: prompt });
    
    // Convert tools
    let azureTools = null;
    if (tools && tools.length > 0) {
      const normalizedTools = normalizeToolDeclarations(tools);
      azureTools = toAzureToolFormat(normalizedTools);
    }
    
    // Build request body
    const body = {
      messages,
      stream: true,
      temperature: options?.temperature ?? DEFAULT_CONFIG.temperature,
      max_tokens: options?.maxTokens ?? DEFAULT_CONFIG.maxTokens,
    };
    
    if (azureTools) {
      body.tools = azureTools;
      body.tool_choice = 'auto';
    }
    
    // Make streaming request
    let url, headers;
    
    if (USE_PROXY) {
      url = '/api/ai/azure/generate/stream';
      headers = { 'Content-Type': 'application/json' };
    } else {
      url = buildApiUrl();
      headers = {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY,
      };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Azure OpenAI streaming error: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    let accumulatedToolCalls = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          yield {
            text: '',
            toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
            done: true,
          };
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              yield {
                text: '',
                toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
                done: true,
              };
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.content) {
                yield {
                  text: delta.content,
                  done: false,
                };
              }
              
              // Accumulate tool calls
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const index = tc.index;
                  if (!accumulatedToolCalls[index]) {
                    accumulatedToolCalls[index] = {
                      id: tc.id || '',
                      name: tc.function?.name || '',
                      arguments: '',
                    };
                  }
                  if (tc.function?.arguments) {
                    accumulatedToolCalls[index].arguments += tc.function.arguments;
                  }
                }
              }
              
            } catch (e) {
              // Ignore JSON parse errors for incomplete data
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // Parse accumulated tool call arguments
    if (accumulatedToolCalls.length > 0) {
      accumulatedToolCalls = accumulatedToolCalls.map(tc => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments ? JSON.parse(tc.arguments) : {},
      }));
    }
  }

  /**
   * Generate with tool execution loop (multi-turn)
   * @param {import('./types.js').GenerateRequest} request
   * @param {Object} toolFunctions - Map of function names to implementations
   * @param {number} maxIterations - Maximum tool call iterations
   * @returns {Promise<import('./types.js').GenerateResponse>}
   */
  async generateWithToolLoop(request, toolFunctions, maxIterations = 5) {
    let messages = [];
    
    // Initialize messages
    if (request.systemInstruction) {
      messages.push({ role: 'system', content: request.systemInstruction });
    }
    
    if (request.history) {
      messages.push(...request.history.map(m => ({ role: m.role, content: m.content })));
    }
    
    messages.push({ role: 'user', content: request.prompt });
    
    let iteration = 0;
    let finalResponse = null;
    
    while (iteration < maxIterations) {
      const response = await this.generate({
        ...request,
        prompt: messages[messages.length - 1].content,
        history: messages.slice(0, -1),
      });
      
      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        finalResponse = response;
        break;
      }
      
      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: response.text || null,
        tool_calls: response.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      });
      
      // Execute tool calls and add results
      for (const toolCall of response.toolCalls) {
        const fn = toolFunctions[toolCall.name];
        let result;
        
        if (fn) {
          try {
            result = await fn(toolCall.arguments);
          } catch (error) {
            result = { error: error.message };
          }
        } else {
          result = { error: `Unknown function: ${toolCall.name}` };
        }
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
      
      iteration++;
    }
    
    return finalResponse || { text: '', toolCalls: [], finishReason: 'stop' };
  }
}

// Export singleton instance
export const azureProvider = new AzureProvider();

// Export class for testing
export { AzureProvider };
