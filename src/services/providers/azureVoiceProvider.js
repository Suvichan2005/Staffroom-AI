/**
 * Azure Speech Provider
 * 
 * Implements the Voice Provider interface for Azure AI Speech.
 * Supports real-time speech-to-text with continuous recognition.
 */

import { toAzureToolFormat, parseAzureToolCalls } from './types.js';

// Azure Speech Configuration from environment
const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastus';
const AZURE_SPEECH_LANGUAGE = import.meta.env.VITE_AZURE_SPEECH_LANGUAGE || 'en-IN';

// Use proxy in production
const USE_PROXY = import.meta.env.PROD || import.meta.env.VITE_USE_AI_PROXY === 'true';

// Azure OpenAI for tool calling during voice sessions
const AZURE_OPENAI_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

/**
 * Get speech token from proxy (production) or direct (development)
 */
async function getSpeechToken() {
  if (USE_PROXY) {
    const response = await fetch('/api/ai/azure/speech-token');
    if (!response.ok) {
      throw new Error('Failed to get speech token');
    }
    return response.json();
  }
  
  if (!AZURE_SPEECH_KEY) {
    throw new Error('Azure Speech key not configured');
  }
  
  // In development, return direct config
  return {
    token: AZURE_SPEECH_KEY,
    region: AZURE_SPEECH_REGION,
    isKey: true, // Flag to indicate this is a key, not a token
  };
}

/**
 * Call Azure OpenAI for tool detection
 */
async function callAzureOpenAIForTools(text, tools, systemPrompt) {
  const url = USE_PROXY 
    ? '/api/ai/azure/generate'
    : `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;
  
  const headers = USE_PROXY
    ? { 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json', 'api-key': AZURE_OPENAI_API_KEY };
  
  const body = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    tools: toAzureToolFormat(tools),
    tool_choice: 'auto',
    temperature: 0.1,
    max_tokens: 256,
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    throw new Error(`Azure OpenAI error: ${response.status}`);
  }
  
  const result = await response.json();
  const message = result.choices?.[0]?.message;
  
  return parseAzureToolCalls(message?.tool_calls || []);
}

/**
 * Azure Speech Streaming Session
 * Uses Web Speech API with Azure backend for broader browser support,
 * with Azure Cognitive Services SDK as primary when available.
 */
class AzureSpeechStreamingSession {
  constructor(options = {}) {
    this.options = options;
    this.recognizer = null;
    this.isStreaming = false;
    
    // Callbacks
    this.onTranscript = options.onTranscript || (() => {});
    this.onToolCall = options.onToolCall || (() => {});
    this.onError = options.onError || console.error;
    this.onStatusChange = options.onStatusChange || (() => {});
    
    // Context
    this.studentList = options.studentList || [];
    this.classId = options.classId || '';
    this.systemPrompt = options.systemPrompt || null;
    this.tools = options.tools || [];
    
    // Transcript accumulator
    this.currentTranscript = '';
    this.finalTranscript = '';
    
    // Tool detection debounce
    this.toolDetectionTimeout = null;
    this.lastProcessedText = '';
  }

  /**
   * Build default system prompt for attendance
   */
  buildDefaultSystemPrompt() {
    const studentListText = this.studentList.map(s => 
      `Roll ${s.rollNo || '?'}: ${s.name}`
    ).join(', ');
    
    return `You are an attendance assistant for class ${this.classId}.
Listen to the teacher and identify attendance commands.

Student list: ${studentListText}

When the teacher says a student name with "present" or "here", call mark_student_present with the exact name from the list.
When the teacher says a student name with "absent" or "not here", call mark_student_absent with the exact name.
When the teacher says "all present" or "everyone is here", call mark_all_present.

Match spoken names to the closest name in the student list.
Only call tools when you're confident about the attendance action.`;
  }

  /**
   * Build default tools for attendance
   */
  buildDefaultTools() {
    return [
      {
        name: 'mark_student_present',
        description: 'Mark a student as present',
        parameters: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'Student name from the list' },
            roll_number: { type: 'number', description: 'Roll number if mentioned' },
          },
          required: ['student_name'],
        },
      },
      {
        name: 'mark_student_absent',
        description: 'Mark a student as absent',
        parameters: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'Student name from the list' },
            roll_number: { type: 'number', description: 'Roll number if mentioned' },
          },
          required: ['student_name'],
        },
      },
      {
        name: 'mark_all_present',
        description: 'Mark all students as present',
        parameters: {
          type: 'object',
          properties: {
            exceptions: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'Students to exclude' 
            },
          },
        },
      },
    ];
  }

  /**
   * Initialize speech recognition
   */
  async initRecognizer() {
    // Try to load Azure Speech SDK
    try {
      const sdk = await this.loadSpeechSDK();
      if (sdk) {
        return this.initAzureSDKRecognizer(sdk);
      }
    } catch (error) {
      console.warn('[AzureSpeech] SDK not available, using Web Speech API fallback');
    }
    
    // Fallback to Web Speech API
    return this.initWebSpeechRecognizer();
  }

  /**
   * Dynamically load Azure Speech SDK
   */
  async loadSpeechSDK() {
    // Check if already loaded
    if (window.SpeechSDK) {
      return window.SpeechSDK;
    }
    
    // Try to import from node_modules (if available)
    try {
      const sdk = await import('microsoft-cognitiveservices-speech-sdk');
      return sdk;
    } catch {
      // SDK not installed
      return null;
    }
  }

  /**
   * Initialize using Azure Speech SDK (preferred)
   */
  async initAzureSDKRecognizer(sdk) {
    const tokenInfo = await getSpeechToken();
    
    let speechConfig;
    if (tokenInfo.isKey) {
      speechConfig = sdk.SpeechConfig.fromSubscription(tokenInfo.token, tokenInfo.region);
    } else {
      speechConfig = sdk.SpeechConfig.fromAuthorizationToken(tokenInfo.token, tokenInfo.region);
    }
    
    speechConfig.speechRecognitionLanguage = AZURE_SPEECH_LANGUAGE;
    
    // Enable detailed output with confidence
    speechConfig.outputFormat = sdk.OutputFormat.Detailed;
    
    // Enable continuous recognition
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    this.recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    
    // Set up event handlers
    this.recognizer.recognizing = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
        this.currentTranscript = e.result.text;
        this.onTranscript(this.currentTranscript, false);
      }
    };
    
    this.recognizer.recognized = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        const text = e.result.text;
        if (text) {
          this.finalTranscript += (this.finalTranscript ? ' ' : '') + text;
          this.onTranscript(text, true);
          this.processForToolCalls(text);
        }
      }
    };
    
    this.recognizer.canceled = (s, e) => {
      if (e.reason === sdk.CancellationReason.Error) {
        this.onError(new Error(e.errorDetails));
      }
      this.onStatusChange('disconnected');
    };
    
    this.recognizer.sessionStopped = () => {
      this.onStatusChange('disconnected');
    };
    
    return 'azure-sdk';
  }

  /**
   * Initialize using Web Speech API (fallback)
   */
  initWebSpeechRecognizer() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Speech recognition not supported in this browser');
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognizer = new SpeechRecognition();
    
    this.recognizer.continuous = true;
    this.recognizer.interimResults = true;
    this.recognizer.lang = AZURE_SPEECH_LANGUAGE;
    this.recognizer.maxAlternatives = 1;
    
    this.recognizer.onresult = (event) => {
      let interimTranscript = '';
      let finalText = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
          this.finalTranscript += (this.finalTranscript ? ' ' : '') + result[0].transcript;
          this.onTranscript(result[0].transcript, true);
          this.processForToolCalls(result[0].transcript);
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      if (interimTranscript) {
        this.currentTranscript = interimTranscript;
        this.onTranscript(interimTranscript, false);
      }
    };
    
    this.recognizer.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.onError(new Error(event.error));
      }
    };
    
    this.recognizer.onend = () => {
      // Restart if still streaming (Web Speech API stops automatically)
      if (this.isStreaming) {
        try {
          this.recognizer.start();
        } catch (e) {
          // Ignore restart errors
        }
      } else {
        this.onStatusChange('disconnected');
      }
    };
    
    return 'web-speech';
  }

  /**
   * Process transcript for tool calls
   */
  async processForToolCalls(text) {
    // Avoid reprocessing same text
    if (text === this.lastProcessedText) return;
    this.lastProcessedText = text;
    
    // Debounce tool detection
    if (this.toolDetectionTimeout) {
      clearTimeout(this.toolDetectionTimeout);
    }
    
    this.toolDetectionTimeout = setTimeout(async () => {
      try {
        const tools = this.tools.length > 0 ? this.tools : this.buildDefaultTools();
        const systemPrompt = this.systemPrompt || this.buildDefaultSystemPrompt();
        
        const toolCalls = await callAzureOpenAIForTools(text, tools, systemPrompt);
        
        for (const tc of toolCalls) {
          this.onToolCall(tc);
        }
      } catch (error) {
        console.error('[AzureSpeech] Tool detection error:', error);
        // Don't propagate tool detection errors to avoid disrupting transcription
      }
    }, 300); // 300ms debounce
  }

  /**
   * Connect and start recognition
   */
  async connect() {
    this.onStatusChange('connecting');
    
    const method = await this.initRecognizer();
    console.log(`[AzureSpeech] Initialized with method: ${method}`);
    
    this.onStatusChange('connected');
  }

  /**
   * Start streaming
   */
  async start() {
    if (!this.recognizer) {
      await this.connect();
    }
    
    this.isStreaming = true;
    this.onStatusChange('streaming');
    
    if (this.recognizer.startContinuousRecognitionAsync) {
      // Azure SDK
      await new Promise((resolve, reject) => {
        this.recognizer.startContinuousRecognitionAsync(resolve, reject);
      });
    } else {
      // Web Speech API
      this.recognizer.start();
    }
  }

  /**
   * Stop streaming
   */
  async stop() {
    this.isStreaming = false;
    
    if (this.toolDetectionTimeout) {
      clearTimeout(this.toolDetectionTimeout);
    }
    
    if (this.recognizer) {
      if (this.recognizer.stopContinuousRecognitionAsync) {
        // Azure SDK
        await new Promise((resolve) => {
          this.recognizer.stopContinuousRecognitionAsync(resolve, () => resolve());
        });
        this.recognizer.close();
      } else {
        // Web Speech API
        this.recognizer.stop();
      }
      this.recognizer = null;
    }
    
    this.onStatusChange('disconnected');
    
    return {
      text: this.finalTranscript,
      confidence: 0.9,
      method: 'azure-speech',
    };
  }
}

/**
 * Azure Voice Provider Implementation
 */
class AzureVoiceProvider {
  constructor() {
    this.name = 'azure';
  }

  /**
   * Check if provider is available
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    if (USE_PROXY) {
      try {
        const response = await fetch('/api/health/azure-speech');
        return response.ok;
      } catch {
        return false;
      }
    }
    
    // Check direct configuration
    if (!AZURE_SPEECH_KEY && !AZURE_OPENAI_ENDPOINT) {
      return false;
    }
    
    return true;
  }

  /**
   * Transcribe audio (batch)
   * @param {Blob} audio
   * @param {Object} options
   * @returns {Promise<import('./types.js').TranscriptionResult>}
   */
  async transcribe(audio, options = {}) {
    // Convert blob to base64
    const base64Audio = await this.blobToBase64(audio);
    
    const endpoint = USE_PROXY
      ? '/api/ai/azure/transcribe'
      : `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${AZURE_SPEECH_LANGUAGE}`;
    
    const headers = USE_PROXY
      ? { 'Content-Type': 'application/json' }
      : {
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'Content-Type': audio.type || 'audio/wav',
        };
    
    const body = USE_PROXY
      ? JSON.stringify({ audio: base64Audio, mimeType: audio.type })
      : audio;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    });
    
    if (!response.ok) {
      throw new Error(`Azure Speech transcription failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      text: result.DisplayText || result.text || '',
      confidence: result.NBest?.[0]?.Confidence || 0.9,
      method: 'azure-speech',
    };
  }

  /**
   * Convert blob to base64
   */
  blobToBase64(blob) {
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

  /**
   * Create a real-time streaming session
   * @param {import('./types.js').StreamingSessionOptions} options
   * @returns {AzureSpeechStreamingSession}
   */
  createStreamingSession(options) {
    return new AzureSpeechStreamingSession(options);
  }
}

// Export singleton instance
export const azureVoiceProvider = new AzureVoiceProvider();

// Export classes for testing
export { AzureVoiceProvider, AzureSpeechStreamingSession };
