/**
 * Gemini AI Provider — Backend Proxy
 *
 * Routes all generation through the secure Express backend.
 * Zero API keys in the client bundle.
 */

import { callAIGenerate } from '../aiApiClient.js';
import {
  toGeminiToolFormat,
  parseGeminiToolCalls,
  normalizeToolDeclarations,
} from './types.js';

// Rate limit handling (client-side retry for 429s from the backend)
const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 60000,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRateLimitError(error) {
  return (
    error?.status === 429 ||
    error?.message?.includes('429') ||
    error?.message?.includes('rate limit') ||
    error?.message?.includes('Rate limit')
  );
}

/**
 * Gemini AI Provider Implementation (via backend proxy)
 */
class GeminiProvider {
  constructor() {
    this.name = 'gemini';
  }

  /** Provider is always "available" — backend manages the key. */
  async healthCheck() {
    return true;
  }

  /**
   * Generate text with optional function calling.
   *
   * @param {import('./types.js').GenerateRequest} request
   * @returns {Promise<import('./types.js').GenerateResponse>}
   */
  async generate(request, retryCount = 0) {
    const { prompt, systemInstruction, history, tools, options } = request;

    try {
      // Normalise tools into Gemini format for the backend
      let formattedTools;
      if (tools?.length) {
        const normalised = normalizeToolDeclarations(tools);
        formattedTools = toGeminiToolFormat(normalised);
      }

      const result = await callAIGenerate({
        prompt,
        systemInstruction,
        tools: formattedTools,
        history,
        type: options?.usePro ? 'complex' : 'default',
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
      });

      // Normalise the backend response into the shape the registry expects
      const functionCalls = result.functionCalls || [];
      let finishReason = 'stop';
      if (functionCalls.length > 0) finishReason = 'tool_calls';

      return {
        text: result.text || '',
        toolCalls: parseGeminiToolCalls(functionCalls),
        finishReason,
        usage: result.usage || {},
      };
    } catch (error) {
      console.error('[GeminiProvider] Generate error:', error);

      if (isRateLimitError(error) && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
        const delay = Math.min(
          RATE_LIMIT_CONFIG.baseDelayMs * Math.pow(2, retryCount),
          RATE_LIMIT_CONFIG.maxDelayMs,
        );
        console.warn(
          `[GeminiProvider] Rate limited. Retrying in ${delay}ms (${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`,
        );
        await sleep(delay);
        return this.generate(request, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Streaming generation (falls back to non-streaming via backend).
   * True server-sent-event streaming can be added later when the backend
   * supports it — for now the full response is yielded in one chunk.
   */
  async *generateStream(request) {
    const response = await this.generate(request);

    yield {
      text: response.text,
      toolCalls: response.toolCalls,
      done: true,
    };
  }
}

export const geminiProvider = new GeminiProvider();
export { GeminiProvider };
