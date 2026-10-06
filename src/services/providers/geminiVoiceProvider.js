/**
 * Gemini Voice Provider
 * 
 * Implements the Voice Provider interface for Gemini Live API.
 * Extracted from geminiLiveService.js for clean provider separation.
 */

import { toGeminiToolFormat } from './types.js';
import { getLiveSessionToken } from '../aiApiClient.js';

// Use gemini-3.8-live for Live API
const LIVE_API_MODEL = 'gemini-3.8-live';

/**
 * Get the WebSocket URL for Gemini Live (always via backend proxy)
 */
async function getLiveApiUrl() {
  try {
    const { wsUrl } = await getLiveSessionToken();
    return wsUrl;
  } catch (error) {
    console.error('[GeminiVoice] Failed to get live session token:', error);
    throw new Error('Unable to start live session - please try again');
  }
}

/**
 * Audio Processor for PCM conversion
 */
class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.source = null;
  }

  async init() {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    await this.audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
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
      
      // AudioWorklet runs off the main thread — no UI jank
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture');
      this.workletNode.port.onmessage = (e) => {
        onAudioData(e.data); // Int16Array PCM
      };

      this.source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);

      return true;
    } catch (error) {
      console.error('[GeminiVoice] Microphone access error:', error);
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
    if (this.workletNode) {
      this.workletNode.port.close();
      this.workletNode.disconnect();
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
 * Gemini Live Streaming Session
 */
class GeminiStreamingSession {
  constructor(options = {}) {
    this.options = options;
    this.ws = null;
    this.audioProcessor = null;
    this.isConnected = false;
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
    this.tools = options.tools || null;
    
    // Transcript accumulator
    this.currentTranscript = '';
  }

  async connect() {
    const wsUrl = await getLiveApiUrl();

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);
        
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
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
          this.onError(new Error(error.message || 'WebSocket connection failed'));
          reject(error);
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.isStreaming = false;
          this.onStatusChange('disconnected');
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  sendSetupMessage() {
    const studentListText = this.studentList.map(s => 
      `Roll ${s.rollNo || '?'}: ${s.name}`
    ).join(', ');
    
    const defaultSystemPrompt = `You are an attendance assistant for a classroom. 
Listen to the teacher and mark students present or absent.
The class is ${this.classId}.
Student list: ${studentListText}

When the teacher says a student name or roll number with "present" or "here", call mark_student_present.
When the teacher says a student name or roll number with "absent" or "not here", call mark_student_absent.
When the teacher says "all present" or "everyone is here", call mark_all_present.

Always use the exact student name from the list, even if the teacher uses a nickname or partial name.`;

    const tools = this.tools || [{
      functionDeclarations: [
        {
          name: 'mark_student_present',
          description: 'Mark a student as present',
          parameters: {
            type: 'OBJECT',
            properties: {
              student_name: { type: 'STRING', description: 'Student name from the list' },
              roll_number: { type: 'NUMBER', description: 'Roll number if mentioned' }
            },
            required: ['student_name']
          }
        },
        {
          name: 'mark_student_absent',
          description: 'Mark a student as absent',
          parameters: {
            type: 'OBJECT',
            properties: {
              student_name: { type: 'STRING', description: 'Student name from the list' },
              roll_number: { type: 'NUMBER', description: 'Roll number if mentioned' }
            },
            required: ['student_name']
          }
        },
        {
          name: 'mark_all_present',
          description: 'Mark all students as present',
          parameters: {
            type: 'OBJECT',
            properties: {
              exceptions: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Students to exclude' }
            }
          }
        }
      ]
    }];

    const setupMessage = {
      setup: {
        model: `models/${LIVE_API_MODEL}`,
        generationConfig: {
          responseModalities: ['TEXT'],
        },
        systemInstruction: {
          parts: [{ text: this.systemPrompt || defaultSystemPrompt }]
        },
        tools,
        inputAudioTranscription: {}
      }
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      // Handle setup complete
      if (message.setupComplete) {
        this.onStatusChange('ready');
        return;
      }
      
      // Handle server content
      if (message.serverContent) {
        const content = message.serverContent;
        
        // Handle transcription
        if (content.inputTranscription?.text) {
          this.currentTranscript = content.inputTranscription.text;
          this.onTranscript(this.currentTranscript, true);
        }
        
        // Handle tool calls
        if (content.toolCall?.functionCalls) {
          for (const fc of content.toolCall.functionCalls) {
            this.onToolCall({
              id: fc.id || `call_${Date.now()}`,
              name: fc.name,
              arguments: fc.args || {},
            });
            
            // Send tool response
            this.sendToolResponse(fc.id, { success: true });
          }
        }
      }
      
    } catch (error) {
      console.error('[GeminiVoice] Message parse error:', error);
    }
  }

  sendToolResponse(callId, result) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    this.ws.send(JSON.stringify({
      toolResponse: {
        functionResponses: [{
          id: callId,
          response: result
        }]
      }
    }));
  }

  async start() {
    if (!this.isConnected) {
      await this.connect();
    }
    
    this.audioProcessor = new AudioProcessor();
    await this.audioProcessor.init();
    
    await this.audioProcessor.startMicrophone((pcmData) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const base64Audio = this.arrayBufferToBase64(pcmData.buffer);
        this.ws.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              data: base64Audio,
              mimeType: 'audio/pcm'
            }]
          }
        }));
      }
    });
    
    this.isStreaming = true;
    this.onStatusChange('streaming');
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async stop() {
    this.isStreaming = false;
    
    if (this.audioProcessor) {
      this.audioProcessor.stop();
      this.audioProcessor = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.onStatusChange('disconnected');
    
    return {
      text: this.currentTranscript,
      confidence: 0.9,
      method: 'gemini-live',
    };
  }
}

/**
 * Gemini Voice Provider Implementation
 */
class GeminiVoiceProvider {
  constructor() {
    this.name = 'gemini';
  }

  /**
   * Check if provider is available
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    // Provider is always "available" — backend manages the key.
    return true;
  }

  /**
   * Transcribe audio (not supported for Gemini - use streaming)
   * @param {Blob} audio
   * @returns {Promise<import('./types.js').TranscriptionResult>}
   */
  async transcribe(audio) {
    throw new Error('Gemini voice provider only supports streaming. Use createStreamingSession instead.');
  }

  /**
   * Create a real-time streaming session
   * @param {import('./types.js').StreamingSessionOptions} options
   * @returns {GeminiStreamingSession}
   */
  createStreamingSession(options) {
    return new GeminiStreamingSession(options);
  }
}

// Export singleton instance
export const geminiVoiceProvider = new GeminiVoiceProvider();

// Export classes for testing
export { GeminiVoiceProvider, GeminiStreamingSession };
