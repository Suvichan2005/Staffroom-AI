/**
 * Gemini AI Provider
 * 
 * Implements the AI Provider interface for Google Gemini.
 * Extracted from aiService.js for clean provider separation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  toGeminiToolFormat, 
  parseGeminiToolCalls,
  normalizeToolDeclarations 
} from './types.js';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Models
const MODELS = {
  FLASH: 'gemini-2.5-flash',
  PRO: 'gemini-3-pro',
};

// Generation config
const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
};

// Rate limit handling
const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 60000,
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error) {
  return error?.message?.includes('429') || 
         error?.message?.includes('quota') ||
         error?.message?.includes('rate limit') ||
         error?.status === 429;
}

/**
 * Extract retry delay from error message if available
 */
function extractRetryDelay(error) {
  const match = error?.message?.match(/retry in (\d+(?:\.\d+)?)/i);
  if (match) {
    return Math.ceil(parseFloat(match[1]) * 1000);
  }
  return null;
}

/**
 * Gemini AI Provider Implementation
 */
class GeminiProvider {
  constructor() {
    this.name = 'gemini';
    this.genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
  }

  /**
   * Check if provider is available
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    if (!this.genAI) {
      return false;
    }
    
    try {
      // Simple test generation
      const model = this.genAI.getGenerativeModel({ model: MODELS.FLASH });
      const result = await model.generateContent('Hi');
      return !!result?.response?.text();
    } catch (error) {
      console.warn('[GeminiProvider] Health check failed:', error.message);
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
    
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    const modelName = options?.usePro ? MODELS.PRO : MODELS.FLASH;
    
    try {
      const modelConfig = {
        model: modelName,
        generationConfig: {
          ...DEFAULT_GENERATION_CONFIG,
          temperature: options?.temperature ?? DEFAULT_GENERATION_CONFIG.temperature,
          maxOutputTokens: options?.maxTokens ?? DEFAULT_GENERATION_CONFIG.maxOutputTokens,
        },
      };
      
      // Add system instruction if provided
      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
      }
      
      // Add tools if provided
      if (tools && tools.length > 0) {
        const normalizedTools = normalizeToolDeclarations(tools);
        modelConfig.tools = toGeminiToolFormat(normalizedTools);
      }
      
      const model = this.genAI.getGenerativeModel(modelConfig);
      
      // Build content array
      const contents = [];
      
      // Add history if provided
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }],
          });
        }
      }
      
      // Add current prompt
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
      
      const result = await model.generateContent({ contents });
      const response = result.response;
      
      // Extract text and function calls
      const text = response.text?.() || '';
      const functionCalls = response.functionCalls?.() || [];
      const candidate = response.candidates?.[0];
      
      // Determine finish reason
      let finishReason = 'stop';
      if (functionCalls.length > 0) {
        finishReason = 'tool_calls';
      } else if (candidate?.finishReason === 'MAX_TOKENS') {
        finishReason = 'length';
      }
      
      return {
        text,
        toolCalls: parseGeminiToolCalls(functionCalls),
        finishReason,
        usage: {
          promptTokens: candidate?.tokenCount?.promptTokenCount || 0,
          completionTokens: candidate?.tokenCount?.candidatesTokenCount || 0,
        },
      };
      
    } catch (error) {
      console.error('[GeminiProvider] Generate error:', error);
      
      // Handle rate limit with retry
      if (isRateLimitError(error) && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
        const suggestedDelay = extractRetryDelay(error);
        const backoffDelay = Math.min(
          RATE_LIMIT_CONFIG.baseDelayMs * Math.pow(2, retryCount),
          RATE_LIMIT_CONFIG.maxDelayMs
        );
        const delay = suggestedDelay || backoffDelay;
        
        console.warn(`[GeminiProvider] Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`);
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
    
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    const modelName = options?.usePro ? MODELS.PRO : MODELS.FLASH;
    
    const modelConfig = {
      model: modelName,
      generationConfig: {
        ...DEFAULT_GENERATION_CONFIG,
        temperature: options?.temperature ?? DEFAULT_GENERATION_CONFIG.temperature,
        maxOutputTokens: options?.maxTokens ?? DEFAULT_GENERATION_CONFIG.maxOutputTokens,
      },
    };
    
    if (systemInstruction) {
      modelConfig.systemInstruction = systemInstruction;
    }
    
    if (tools && tools.length > 0) {
      const normalizedTools = normalizeToolDeclarations(tools);
      modelConfig.tools = toGeminiToolFormat(normalizedTools);
    }
    
    const model = this.genAI.getGenerativeModel(modelConfig);
    
    // Build content array
    const contents = [];
    
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : msg.role,
          parts: [{ text: msg.content }],
        });
      }
    }
    
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });
    
    try {
      const result = await model.generateContentStream({ contents });
      
      for await (const chunk of result.stream) {
        const text = chunk.text?.() || '';
        yield {
          text,
          done: false,
        };
      }
      
      // Get final response for tool calls
      const finalResponse = await result.response;
      const functionCalls = finalResponse.functionCalls?.() || [];
      
      yield {
        text: '',
        toolCalls: parseGeminiToolCalls(functionCalls),
        done: true,
      };
      
    } catch (error) {
      console.error('[GeminiProvider] Stream error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const geminiProvider = new GeminiProvider();

// Export class for testing
export { GeminiProvider };
