/**
 * Gemini Live API Service
 * 
 * Enables real-time bidirectional streaming with Gemini for:
 * - Live audio transcription
 * - Real-time tool/function calling
 * - Voice-based attendance marking
 * 
 * Uses WebSocket connection to Gemini Live API
 */

import { handleChatToolCall } from './chatToolsDefinition';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Use gemini-2.0-flash-exp for Live API - cheapest model that supports audio→tool calling
// Audio input: $2.10/1M, Text output: $1.50/1M (~$0.41/hour for attendance)
const LIVE_API_MODEL = 'gemini-2.0-flash-exp';
const LIVE_API_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

/**
 * Audio processing utilities for PCM conversion
 */
class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.audioWorklet = null;
    this.source = null;
  }

  async init() {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    return this;
  }

  async startMicrophone(onAudioData) {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create a ScriptProcessor for audio data extraction
      // Note: ScriptProcessor is deprecated but widely supported; 
      // AudioWorklet would be better for production
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcmData = this.float32ToInt16(inputData);
        onAudioData(pcmData);
      };

      this.source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      this.processor = processor;
      return true;
    } catch (error) {
      console.error('Microphone access error:', error);
      throw error;
    }
  }

  float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
    }
    if (this.source) {
      this.source.disconnect();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

/**
 * GeminiLiveSession - Manages a real-time session with Gemini Live API
 */
export class GeminiLiveSession {
  constructor(options = {}) {
    this.options = options;
    this.ws = null;
    this.audioProcessor = null;
    this.isConnected = false;
    this.isStreaming = false;
    this.sessionId = null;
    
    // Callbacks
    this.onTranscript = options.onTranscript || (() => {});
    this.onToolCall = options.onToolCall || (() => {});
    this.onError = options.onError || console.error;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onAudioResponse = options.onAudioResponse || (() => {});
    
    // Student list for fuzzy matching
    this.studentList = options.studentList || [];
    this.classId = options.classId || '';
    
    // Custom system prompt and tools (for flexible use cases)
    this.systemPrompt = options.systemPrompt || null;
    this.tools = options.tools || null;
    
    // Transcript accumulator
    this.currentTranscript = '';
    this.interimTranscript = '';
  }

  /**
   * Connect to Gemini Live API
   */
  async connect() {
    if (!GEMINI_API_KEY) {
      throw new Error('VITE_GEMINI_API_KEY is required for Gemini Live API');
    }

    console.log('🔌 Connecting to Gemini Live API...');
    console.log('📍 URL:', LIVE_API_URL.replace(GEMINI_API_KEY, 'API_KEY_HIDDEN'));
    console.log('🤖 Model:', LIVE_API_MODEL);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(LIVE_API_URL);
        
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.close();
            reject(new Error('Connection timeout - Gemini Live API did not respond'));
          }
        }, 10000);
        
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('🔌 WebSocket connected to Gemini Live API');
          this.isConnected = true;
          this.onStatusChange('connected');
          this.sendSetupMessage();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('❌ WebSocket error:', error);
          const errorMsg = error.message || 'WebSocket connection failed. Check if your API key supports Live API.';
          this.onError(new Error(errorMsg));
          reject(new Error(errorMsg));
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('🔒 WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.isStreaming = false;
          
          // Provide meaningful error messages based on close code
          let reason = event.reason || '';
          if (event.code === 1006) {
            reason = 'Connection closed abnormally. This may be due to invalid API key or Live API not enabled.';
          } else if (event.code === 1008) {
            reason = 'Policy violation - check your API key permissions.';
          } else if (event.code === 1011) {
            reason = 'Server error - please try again later.';
          }
          
          if (reason) {
            this.onError(new Error(reason));
          }
          
          this.onStatusChange('disconnected');
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send initial setup message with system prompt and tools
   */
  sendSetupMessage() {
    const studentNames = this.studentList.map(s => s.name).join(', ');
    
    // Build tools array with proper format
    const tools = [{
      functionDeclarations: [
        {
          name: 'mark_student_present',
          description: 'Mark a student as present in the attendance. Call this when the teacher says a student is present, here, or attending.',
          parameters: {
            type: 'OBJECT',
            properties: {
              student_name: {
                type: 'STRING',
                description: 'The name of the student to mark present'
              }
            },
            required: ['student_name']
          }
        },
        {
          name: 'mark_student_absent',
          description: 'Mark a student as absent in the attendance. Call this when the teacher says a student is absent, not here, or missing.',
          parameters: {
            type: 'OBJECT',
            properties: {
              student_name: {
                type: 'STRING',
                description: 'The name of the student to mark absent'
              }
            },
            required: ['student_name']
          }
        },
        {
          name: 'mark_all_present',
          description: 'Mark all students as present. Call when teacher says everyone is present or all present.',
          parameters: {
            type: 'OBJECT',
            properties: {
              exceptions: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description: 'Optional list of student names to exclude'
              }
            }
          }
        }
      ]
    }];
    
    const useTools = this.tools?.length ? this.tools : tools;
    const hasTools = useTools && useTools.length > 0 && useTools[0]?.functionDeclarations?.length > 0;
    
    const setupMessage = {
      setup: {
        model: `models/${LIVE_API_MODEL}`,
        generationConfig: {
          responseModalities: ['TEXT'],
          temperature: 0.3,
        },
        systemInstruction: {
          parts: [{
            text: this.systemPrompt || `You are an attendance assistant for Class ${this.classId}. 

CRITICAL: You MUST transcribe and respond in ENGLISH ONLY. If you receive audio in Hindi, Hinglish, or any other language, immediately translate it to English.

Listen to the teacher's voice and mark attendance in real-time using the provided tools.

Students in this class: ${studentNames}

Instructions:
- When you hear a student's name followed by "present", "here", "attending", call mark_student_present
- When you hear a student's name followed by "absent", "not here", "missing", call mark_student_absent  
- When you hear "everyone present" or "all present", call mark_all_present
- Call tools immediately as you recognize names - don't wait
- Fuzzy match student names - the teacher might use nicknames or partial names.`
          }]
        },
        // Enable input audio transcription with explicit English language
        inputAudioTranscription: {
        }
      }
    };
    
    // Only add tools if we have valid tool definitions
    if (hasTools) {
      setupMessage.setup.tools = useTools;
    }

    console.log('📤 Sending setup message:', JSON.stringify(setupMessage, null, 2));
    this.ws.send(JSON.stringify(setupMessage));
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(data) {
    try {
      // Handle binary Blob messages (audio responses)
      if (data instanceof Blob) {
        // Convert Blob to text to check if it's JSON or binary audio
        const text = await data.text();
        try {
          const message = JSON.parse(text);
          this.processMessage(message);
          return;
        } catch {
          // Silently ignore binary audio data to save tokens
          return;
        }
      }
      
      // Handle text messages
      const message = JSON.parse(data);
      this.processMessage(message);
    } catch (error) {
      console.error('Error parsing message:', error, data);
    }
  }

  /**
   * Process parsed message object
   */
  processMessage(message) {
    try {
      console.log('📥 Received:', JSON.stringify(message, null, 2).slice(0, 500));
      
      // Handle setup completion
      if (message.setupComplete) {
        console.log('✅ Gemini Live session setup complete');
        this.sessionId = message.setupComplete?.sessionId;
        this.onStatusChange('ready');
        return;
      }

      // Handle server content (transcripts, tool calls, etc.)
      if (message.serverContent) {
        const content = message.serverContent;
        
        // Handle input transcription (what the user said)
        if (content.inputTranscription) {
          const text = content.inputTranscription.text || '';
          if (text) {
            console.log('🎤 Input transcript:', text);
            this.currentTranscript += ' ' + text;
            this.currentTranscript = this.currentTranscript.trim();
            this.onTranscript({
              type: 'input',
              text: text,
              combined: this.currentTranscript
            });
          }
        }
        
        // Handle model turn (text responses from the model)
        if (content.modelTurn) {
          for (const part of content.modelTurn.parts || []) {
            if (part.text) {
              console.log('🤖 Model response:', part.text);
              this.interimTranscript = part.text;
              this.onTranscript({
                type: 'model',
                text: part.text,
                combined: this.currentTranscript
              });
            }
            // Silently skip audio inlineData
          }
        }

        // Handle turn complete
        if (content.turnComplete) {
          console.log('✅ Turn complete');
          this.interimTranscript = '';
          
          // Notify callback that turn is complete
          if (this.onTurnComplete) {
            this.onTurnComplete();
          }
        }
        
        // Handle interruption
        if (content.interrupted) {
          console.log('⚠️ Generation interrupted');
        }

        // Handle grounding metadata (if using search)
        if (content.groundingMetadata) {
          console.log('Grounding:', content.groundingMetadata);
        }
      }

      // Handle tool calls
      if (message.toolCall) {
        console.log('🔧 Tool call received:', message.toolCall);
        this.handleToolCall(message.toolCall);
      }

      // Handle tool call cancellation
      if (message.toolCallCancellation) {
        console.log('Tool call cancelled:', message.toolCallCancellation);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  /**
   * Handle tool calls from Gemini - uses shared tools from chatToolsDefinition
   * This enables multi-step tool calling where Gemini can call searchTopic,
   * get results, then call updateProgress with the correct indices.
   */
  handleToolCall(toolCall) {
    const functionCalls = toolCall.functionCalls || [];
    
    for (const fc of functionCalls) {
      console.log('🔧 Tool call:', fc.name, fc.args);
      
      // Parse arguments
      const args = typeof fc.args === 'string' ? JSON.parse(fc.args) : fc.args;
      
      // Use the shared handleChatToolCall which uses the same tool functions as text chat
      const { action, result } = handleChatToolCall({
        id: fc.id,
        name: fc.name,
        args: args
      }, null);

      // Emit tool call event to UI
      this.onToolCall({
        id: fc.id,
        name: fc.name,
        args: args,
        display: action.display,
        result: result
      });

      // Send tool response back to Gemini so it can continue with multi-step calls
      // This is critical for the searchTopic -> updateProgress flow
      this.sendToolResponse(fc.id, fc.name, result);
    }
  }

  /**
   * Fuzzy match student name from the list
   */
  fuzzyMatchStudent(spokenName) {
    const lower = spokenName.toLowerCase().trim();
    
    // Exact match
    let match = this.studentList.find(s => 
      s.name.toLowerCase() === lower
    );
    if (match) return match;

    // Partial match (first name or last name)
    match = this.studentList.find(s => {
      const nameParts = s.name.toLowerCase().split(' ');
      return nameParts.some(part => part === lower || lower.includes(part) || part.includes(lower));
    });
    if (match) return match;

    // Fuzzy match using simple Levenshtein-like similarity
    let bestMatch = null;
    let bestScore = 0;
    
    for (const student of this.studentList) {
      const score = this.similarityScore(lower, student.name.toLowerCase());
      if (score > bestScore && score > 0.5) { // At least 50% similar
        bestScore = score;
        bestMatch = student;
      }
    }

    return bestMatch;
  }

  /**
   * Simple string similarity score (0-1)
   */
  similarityScore(a, b) {
    if (a === b) return 1;
    if (!a || !b) return 0;
    
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }
    
    // Count matching characters
    let matches = 0;
    for (const char of shorter) {
      if (longer.includes(char)) matches++;
    }
    return matches / longer.length;
  }

  /**
   * Send tool response back to Gemini Live API
   * Format: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live
   */
  sendToolResponse(callId, functionName, result) {
    // Gemini Live API expects tool_response with function_responses array
    // Each function_response has id and response object containing output or name+response
    const response = {
      tool_response: {
        function_responses: [{
          id: callId,
          name: functionName,
          response: { output: result }
        }]
      }
    };
    
    console.log('📤 Sending tool response:', JSON.stringify(response, null, 2));
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(response));
    }
  }

  /**
   * Start audio streaming from microphone
   */
  async startStreaming() {
    if (!this.isConnected) {
      throw new Error('Not connected to Gemini Live API');
    }

    try {
      this.audioProcessor = new AudioProcessor();
      await this.audioProcessor.init();
      
      await this.audioProcessor.startMicrophone((pcmData) => {
        this.sendAudioChunk(pcmData);
      });

      this.isStreaming = true;
      this.onStatusChange('streaming');
      console.log('🎤 Audio streaming started');
      
    } catch (error) {
      this.onError(error);
      throw error;
    }
  }

  /**
   * Send audio chunk to Gemini
   */
  sendAudioChunk(int16Array) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Convert Int16Array to base64
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Use the newer 'audio' field format
    const message = {
      realtimeInput: {
        audio: {
          mimeType: 'audio/pcm;rate=16000',
          data: base64
        }
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send text input (for testing or hybrid mode)
   */
  sendText(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turnComplete: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Stop audio streaming
   */
  stopStreaming() {
    if (this.audioProcessor) {
      this.audioProcessor.stop();
      this.audioProcessor = null;
    }
    this.isStreaming = false;
    this.onStatusChange('stopped');
    console.log('🛑 Audio streaming stopped');
  }

  /**
   * Get current transcript
   */
  getTranscript() {
    return this.currentTranscript;
  }

  /**
   * Clear transcript
   */
  clearTranscript() {
    this.currentTranscript = '';
    this.interimTranscript = '';
  }

  /**
   * Disconnect from Gemini Live API
   */
  disconnect() {
    this.stopStreaming();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.sessionId = null;
    console.log('👋 Disconnected from Gemini Live API');
  }
}

/**
 * Create a new Gemini Live session for attendance
 */
export function createAttendanceSession(options) {
  return new GeminiLiveSession(options);
}

/**
 * Check if Gemini Live API is available
 */
export function isGeminiLiveAvailable() {
  return !!GEMINI_API_KEY && typeof WebSocket !== 'undefined';
}

export default {
  GeminiLiveSession,
  createAttendanceSession,
  isGeminiLiveAvailable
};
