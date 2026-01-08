/**
 * AI Provider Type Definitions
 * 
 * Provider-agnostic interfaces for AI capabilities.
 * All providers must implement these interfaces.
 */

/**
 * @typedef {'azure' | 'gemini' | 'mock'} ProviderName
 */

/**
 * @typedef {Object} Message
 * @property {'user' | 'assistant' | 'system'} role
 * @property {string} content
 */

/**
 * @typedef {Object} ToolParameter
 * @property {string} type - Parameter type (string, number, boolean, object, array)
 * @property {string} description - Parameter description
 * @property {string[]} [enum] - Allowed values
 * @property {Object} [items] - Array item schema
 */

/**
 * @typedef {Object} ToolDeclaration
 * @property {string} name - Tool/function name
 * @property {string} description - Tool description
 * @property {Object} parameters - JSON Schema for parameters
 * @property {Object} parameters.properties - Parameter definitions
 * @property {string[]} [parameters.required] - Required parameter names
 */

/**
 * @typedef {Object} ToolCall
 * @property {string} id - Unique call ID
 * @property {string} name - Function name
 * @property {Object} arguments - Parsed arguments
 */

/**
 * @typedef {Object} GenerateRequest
 * @property {string} prompt - User prompt
 * @property {string} [systemInstruction] - System instruction
 * @property {Message[]} [history] - Conversation history
 * @property {ToolDeclaration[]} [tools] - Available tools
 * @property {Object} [options] - Generation options
 * @property {number} [options.temperature] - Temperature (0-2)
 * @property {number} [options.maxTokens] - Max output tokens
 * @property {'text' | 'json'} [options.responseFormat] - Output format
 */

/**
 * @typedef {Object} GenerateResponse
 * @property {string} text - Generated text
 * @property {ToolCall[]} [toolCalls] - Tool calls to execute
 * @property {Object} [usage] - Token usage
 * @property {number} [usage.promptTokens] - Prompt tokens
 * @property {number} [usage.completionTokens] - Completion tokens
 * @property {'stop' | 'tool_calls' | 'length' | 'error'} finishReason
 */

/**
 * @typedef {Object} StreamChunk
 * @property {string} [text] - Text delta
 * @property {ToolCall[]} [toolCalls] - Tool calls (final chunk)
 * @property {boolean} done - Is this the final chunk
 */

/**
 * @typedef {Object} TranscriptionResult
 * @property {string} text - Transcribed text
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} [language] - Detected language
 * @property {'browser' | 'whisper' | 'azure' | 'gemini-live'} method - Transcription method
 */

/**
 * @typedef {Object} StreamingSessionOptions
 * @property {string[]} [studentList] - List of student names for attendance
 * @property {string} [classId] - Current class ID
 * @property {string} [systemPrompt] - Custom system prompt
 * @property {ToolDeclaration[]} [tools] - Tools for voice session
 * @property {Function} [onTranscript] - Transcript callback
 * @property {Function} [onToolCall] - Tool call callback
 * @property {Function} [onError] - Error callback
 * @property {Function} [onStatusChange] - Status change callback
 */

/**
 * @typedef {'connecting' | 'connected' | 'streaming' | 'disconnected' | 'error'} ConnectionStatus
 */

/**
 * AI Provider Interface
 * All AI providers must implement this interface
 */
export const AIProviderInterface = {
  /** @type {ProviderName} */
  name: '',
  
  /**
   * Generate text with optional function calling
   * @param {GenerateRequest} request
   * @returns {Promise<GenerateResponse>}
   */
  generate: async (request) => { throw new Error('Not implemented'); },
  
  /**
   * Generate text with streaming
   * @param {GenerateRequest} request
   * @returns {AsyncIterable<StreamChunk>}
   */
  generateStream: async function* (request) { throw new Error('Not implemented'); },
  
  /**
   * Check provider health/availability
   * @returns {Promise<boolean>}
   */
  healthCheck: async () => { throw new Error('Not implemented'); },
};

/**
 * Voice Provider Interface
 * All voice providers must implement this interface
 */
export const VoiceProviderInterface = {
  /** @type {ProviderName} */
  name: '',
  
  /**
   * Transcribe audio (batch)
   * @param {Blob} audio - Audio blob
   * @param {Object} [options] - Transcription options
   * @returns {Promise<TranscriptionResult>}
   */
  transcribe: async (audio, options) => { throw new Error('Not implemented'); },
  
  /**
   * Create a real-time streaming session
   * @param {StreamingSessionOptions} options
   * @returns {Object} Streaming session controller
   */
  createStreamingSession: (options) => { throw new Error('Not implemented'); },
  
  /**
   * Check provider health/availability
   * @returns {Promise<boolean>}
   */
  healthCheck: async () => { throw new Error('Not implemented'); },
};

/**
 * Normalize tool declarations to provider-agnostic format
 * @param {Object[]} tools - Tools in any format
 * @returns {ToolDeclaration[]}
 */
export function normalizeToolDeclarations(tools) {
  if (!Array.isArray(tools)) return [];
  
  return tools.map(tool => {
    // Handle Gemini format (functionDeclarations wrapper)
    if (tool.functionDeclarations) {
      return tool.functionDeclarations.map(fd => ({
        name: fd.name,
        description: fd.description,
        parameters: normalizeParameters(fd.parameters),
      }));
    }
    
    // Handle direct format
    return {
      name: tool.name,
      description: tool.description,
      parameters: normalizeParameters(tool.parameters),
    };
  }).flat();
}

/**
 * Normalize parameters to lowercase type names
 * @param {Object} params
 * @returns {Object}
 */
function normalizeParameters(params) {
  if (!params) return { type: 'object', properties: {}, required: [] };
  
  const normalized = {
    type: (params.type || 'object').toLowerCase(),
    required: params.required || [],
  };
  
  if (params.properties) {
    normalized.properties = {};
    for (const [key, value] of Object.entries(params.properties)) {
      normalized.properties[key] = {
        type: (value.type || 'string').toLowerCase(),
        description: value.description || '',
      };
      if (value.enum) {
        normalized.properties[key].enum = value.enum;
      }
      if (value.items) {
        normalized.properties[key].items = {
          type: (value.items.type || 'string').toLowerCase(),
        };
      }
    }
  }
  
  return normalized;
}

/**
 * Convert tool declarations to Gemini format
 * @param {ToolDeclaration[]} tools
 * @returns {Object[]} Gemini-format tools
 */
export function toGeminiToolFormat(tools) {
  return [{
    functionDeclarations: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: toGeminiParameterFormat(tool.parameters),
    })),
  }];
}

/**
 * Convert parameters to Gemini format (uppercase types)
 * @param {Object} params
 * @returns {Object}
 */
function toGeminiParameterFormat(params) {
  if (!params) return { type: 'OBJECT', properties: {}, required: [] };
  
  const converted = {
    type: (params.type || 'object').toUpperCase(),
    required: params.required || [],
  };
  
  if (params.properties) {
    converted.properties = {};
    for (const [key, value] of Object.entries(params.properties)) {
      converted.properties[key] = {
        type: (value.type || 'string').toUpperCase(),
        description: value.description || '',
      };
      if (value.enum) {
        converted.properties[key].enum = value.enum;
      }
      if (value.items) {
        converted.properties[key].items = {
          type: (value.items.type || 'string').toUpperCase(),
        };
      }
    }
  }
  
  return converted;
}

/**
 * Convert tool declarations to Azure OpenAI format
 * @param {ToolDeclaration[]} tools
 * @returns {Object[]} Azure OpenAI-format tools
 */
export function toAzureToolFormat(tools) {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters?.properties || {},
        required: tool.parameters?.required || [],
      },
    },
  }));
}

/**
 * Parse Azure OpenAI tool calls to standard format
 * @param {Object[]} azureToolCalls
 * @returns {ToolCall[]}
 */
export function parseAzureToolCalls(azureToolCalls) {
  if (!Array.isArray(azureToolCalls)) return [];
  
  return azureToolCalls.map(tc => ({
    id: tc.id,
    name: tc.function?.name || tc.name,
    arguments: typeof tc.function?.arguments === 'string'
      ? JSON.parse(tc.function.arguments)
      : (tc.function?.arguments || tc.arguments || {}),
  }));
}

/**
 * Parse Gemini function calls to standard format
 * @param {Object[]} geminiFunctionCalls
 * @returns {ToolCall[]}
 */
export function parseGeminiToolCalls(geminiFunctionCalls) {
  if (!Array.isArray(geminiFunctionCalls)) return [];
  
  return geminiFunctionCalls.map((fc, index) => ({
    id: fc.id || `call_${index}`,
    name: fc.name,
    arguments: fc.args || {},
  }));
}
