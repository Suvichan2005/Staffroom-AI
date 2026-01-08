/**
 * Azure OpenAI Realtime API Provider
 * 
 * Implements real-time bidirectional streaming with Azure OpenAI Realtime API.
 * Equivalent to Gemini Live API with:
 * - Real-time speech-to-text (via Whisper)
 * - Real-time AI responses
 * - Live tool/function calling
 * - Server-side Voice Activity Detection (VAD)
 * 
 * Requires deployment of gpt-4o-realtime-preview, gpt-4o-mini-realtime-preview, 
 * gpt-realtime, or gpt-realtime-mini model.
 */

import { handleChatToolCall } from '../chatToolsDefinition.js';

// Azure OpenAI Realtime Configuration
const AZURE_OPENAI_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
// Use dedicated realtime deployment, or fallback to regular deployment
// Realtime requires: gpt-4o-realtime-preview, gpt-4o-mini-realtime-preview, gpt-realtime, gpt-realtime-mini
const AZURE_REALTIME_DEPLOYMENT = import.meta.env.VITE_AZURE_REALTIME_DEPLOYMENT || 
  import.meta.env.VITE_AZURE_DEPLOYMENT_REALTIME || 
  'gpt-realtime-mini';

const USE_PROXY = import.meta.env.PROD || import.meta.env.VITE_USE_AI_PROXY === 'true';

/**
 * Check if Azure Realtime is available
 */
export function isAzureRealtimeAvailable() {
  return !!(AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY);
}

/**
 * Audio Processor for PCM conversion (shared with Gemini Live)
 */
class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.source = null;
  }

  async init() {
    this.audioContext = new AudioContext({ sampleRate: 24000 }); // Azure uses 24kHz
    return this;
  }

  async startMicrophone(onAudioData) {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create a ScriptProcessor for audio data extraction
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
 * Convert tools to Azure Realtime API format
 */
function convertToolsToAzureFormat(tools) {
  if (!tools || !Array.isArray(tools) || tools.length === 0) {
    return [];
  }
  
  // Handle Gemini Live format: [{ functionDeclarations: [...] }]
  if (tools[0]?.functionDeclarations) {
    return tools[0].functionDeclarations.map(fd => ({
      type: 'function',
      name: fd.name,
      description: fd.description,
      parameters: normalizeParameters(fd.parameters),
    }));
  }
  
  // Standard format
  return tools.map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: normalizeParameters(tool.parameters),
  }));
}

/**
 * Normalize parameters from Gemini format to JSON Schema
 */
function normalizeParameters(params) {
  if (!params) {
    return { type: 'object', properties: {}, required: [] };
  }
  
  const normalized = {
    type: (params.type || 'object').toLowerCase(),
    required: params.required || [],
    properties: {},
  };
  
  if (params.properties) {
    for (const [key, value] of Object.entries(params.properties)) {
      normalized.properties[key] = {
        type: (value.type || 'string').toLowerCase(),
        description: value.description,
      };
      
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
 * AzureRealtimeSession - Manages a real-time session with Azure OpenAI Realtime API
 * 
 * Compatible interface with GeminiLiveSession for drop-in replacement
 */
export class AzureRealtimeSession {
  constructor(options = {}) {
    this.options = options;
    this.ws = null;
    this.audioProcessor = null;
    this.isConnected = false;
    this.isStreaming = false;
    this.sessionId = null;
    
    // Callbacks (same as GeminiLiveSession)
    this.onTranscript = options.onTranscript || (() => {});
    this.onToolCall = options.onToolCall || (() => {});
    this.onError = options.onError || console.error;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onAudioResponse = options.onAudioResponse || (() => {});
    
    // Student list for fuzzy matching
    this.studentList = options.studentList || [];
    this.classId = options.classId || '';
    
    // Custom system prompt and tools
    this.systemPrompt = options.systemPrompt || null;
    this.tools = options.tools || null;
    
    // Transcript accumulator
    this.currentTranscript = '';
    this.interimTranscript = '';
    
    // Response tracking
    this.currentResponseId = null;
    this.pendingToolCalls = new Map();
  }

  /**
   * Get WebSocket URL for Azure OpenAI Realtime API
   */
  getWebSocketUrl() {
    // Extract the resource name from endpoint
    // e.g., https://myresource.openai.azure.com → myresource
    const endpointUrl = new URL(AZURE_OPENAI_ENDPOINT);
    const resourceName = endpointUrl.hostname.split('.')[0];
    
    // Azure Realtime uses this WebSocket endpoint format for GA models
    // wss://{resource}.openai.azure.com/openai/realtime?deployment={deployment}&api-version=2025-04-01-preview
    return `wss://${resourceName}.openai.azure.com/openai/realtime?deployment=${AZURE_REALTIME_DEPLOYMENT}&api-version=2025-04-01-preview`;
  }

  /**
   * Connect to Azure OpenAI Realtime API
   */
  async connect() {
    const wsUrl = this.getWebSocketUrl();
    
    console.log('🔌 Connecting to Azure OpenAI Realtime API...');
    console.log('📍 URL:', wsUrl);
    console.log('🤖 Deployment:', AZURE_REALTIME_DEPLOYMENT);

    return new Promise((resolve, reject) => {
      try {
        // Azure uses API key in header - need to pass as protocol or use fetch for ephemeral token
        // For WebSocket, we'll use the api-key query param for dev (not ideal for prod)
        const wsUrlWithKey = USE_PROXY 
          ? wsUrl // Proxy will handle auth
          : `${wsUrl}&api-key=${AZURE_OPENAI_API_KEY}`;
        
        this.ws = new WebSocket(wsUrlWithKey);
        
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.close();
            reject(new Error('Connection timeout - Azure Realtime API did not respond'));
          }
        }, 15000);
        
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('🔌 WebSocket connected to Azure Realtime API');
          this.isConnected = true;
          this.onStatusChange('connected');
          this.sendSessionUpdate();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('❌ WebSocket error:', error);
          this.onError(new Error('WebSocket connection failed'));
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('🔒 WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.isStreaming = false;
          
          let reason = event.reason || '';
          if (event.code === 1006) {
            reason = 'Connection closed abnormally. Check API key or Realtime deployment.';
          } else if (event.code === 1008) {
            reason = 'Policy violation - check your API key permissions.';
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
   * Send session.update to configure the session
   */
  sendSessionUpdate() {
    // Build student list for the prompt
    const studentListWithRolls = this.studentList.map(s => 
      `Roll ${s.rollNo || '?'}: ${s.name}`
    ).join(', ');
    
    // Build default attendance tools
    const defaultTools = [
      {
        type: 'function',
        name: 'mark_student_present',
        description: 'Mark a student as present. Call when teacher says a name or roll number is present/here/attending.',
        parameters: {
          type: 'object',
          properties: {
            student_name: {
              type: 'string',
              description: 'The name of the student to mark present'
            },
            roll_number: {
              type: 'number',
              description: 'Optional: The roll number if teacher said roll number instead of name'
            }
          },
          required: ['student_name']
        }
      },
      {
        type: 'function',
        name: 'mark_student_absent',
        description: 'Mark a student as absent. Call when teacher says a name or roll number is absent/not here/missing.',
        parameters: {
          type: 'object',
          properties: {
            student_name: {
              type: 'string',
              description: 'The name of the student to mark absent'
            },
            roll_number: {
              type: 'number',
              description: 'Optional: The roll number if teacher said roll number instead of name'
            }
          },
          required: ['student_name']
        }
      },
      {
        type: 'function',
        name: 'mark_all_present',
        description: 'Mark all students as present. Call when teacher says everyone is present or all present.',
        parameters: {
          type: 'object',
          properties: {
            exceptions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional list of student names to exclude'
            }
          }
        }
      }
    ];
    
    // Use provided tools or default attendance tools
    const tools = this.tools ? convertToolsToAzureFormat(this.tools) : defaultTools;
    
    const sessionUpdate = {
      type: 'session.update',
      session: {
        voice: 'alloy',
        instructions: this.systemPrompt || `You are an attendance assistant for Class ${this.classId}. 

CRITICAL: Transcribe and respond in ENGLISH ONLY. Translate Hindi/Hinglish to English.

Students in this class (Roll No: Name): ${studentListWithRolls}

Instructions:
- When you hear a student's name followed by "present", "here", "attending", call mark_student_present
- When you hear "roll number X" followed by "present"/"here", look up the name and call mark_student_present
- When you hear a student's name followed by "absent", "not here", call mark_student_absent
- When you hear "everyone present" or "all present", call mark_all_present
- Call tools IMMEDIATELY as you recognize names - don't wait
- Fuzzy match student names - handle nicknames and partial names
- Match number words: "one"=1, "two"=2, "three"=3, etc.`,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true
        },
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.7,
      }
    };

    console.log('📤 Sending session.update:', JSON.stringify(sessionUpdate, null, 2));
    this.ws.send(JSON.stringify(sessionUpdate));
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      const eventType = message.type;
      
      // Log important events
      if (!eventType?.includes('delta')) {
        console.log('📥 Azure Realtime:', eventType, message);
      }
      
      switch (eventType) {
        case 'session.created':
          console.log('✅ Session created:', message.session?.id);
          this.sessionId = message.session?.id;
          break;
          
        case 'session.updated':
          console.log('✅ Session configured');
          break;
          
        case 'input_audio_buffer.speech_started':
          console.log('🎤 Speech started');
          this.onStatusChange('listening');
          break;
          
        case 'input_audio_buffer.speech_stopped':
          console.log('🎤 Speech stopped');
          this.onStatusChange('processing');
          break;
          
        case 'input_audio_buffer.committed':
          console.log('📝 Audio committed for processing');
          break;
          
        case 'conversation.item.input_audio_transcription.completed':
          // User's speech transcription
          const transcript = message.transcript;
          if (transcript) {
            console.log('📝 User said:', transcript);
            this.currentTranscript = transcript;
            this.onTranscript({
              type: 'input',
              transcript: transcript,
              combined: transcript,
              isFinal: true
            });
          }
          break;
          
        case 'response.created':
          this.currentResponseId = message.response?.id;
          break;
          
        case 'response.output_item.added':
          // New item being generated
          break;
          
        case 'response.function_call_arguments.delta':
          // Function call arguments streaming
          break;
          
        case 'response.function_call_arguments.done':
          // Function call complete - extract and execute
          this.handleFunctionCall(message);
          break;
          
        case 'response.audio_transcript.delta':
          // AI response transcript streaming
          if (message.delta) {
            this.interimTranscript += message.delta;
          }
          break;
          
        case 'response.audio_transcript.done':
          // AI response complete
          const aiTranscript = message.transcript || this.interimTranscript;
          if (aiTranscript) {
            console.log('🤖 AI said:', aiTranscript);
            this.onTranscript({
              type: 'model',
              transcript: aiTranscript,
              combined: this.currentTranscript + ' → ' + aiTranscript,
              isFinal: true
            });
          }
          this.interimTranscript = '';
          break;
          
        case 'response.audio.delta':
          // Audio response data - could play back if needed
          if (message.delta && this.onAudioResponse) {
            // Decode base64 audio
            const audioData = atob(message.delta);
            this.onAudioResponse(audioData);
          }
          break;
          
        case 'response.done':
          console.log('✅ Response complete');
          this.onStatusChange('connected');
          break;
          
        case 'error':
          console.error('❌ Azure Realtime error:', message.error);
          this.onError(new Error(message.error?.message || 'Unknown error'));
          break;
          
        default:
          // Log unhandled events for debugging
          if (eventType && !eventType.includes('delta')) {
            console.log('📥 Unhandled event:', eventType);
          }
      }
      
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  /**
   * Handle function call from Realtime API
   */
  async handleFunctionCall(message) {
    const callId = message.call_id;
    const name = message.name;
    
    // Get accumulated arguments from the item
    let args = {};
    try {
      if (message.arguments) {
        args = JSON.parse(message.arguments);
      }
    } catch (e) {
      console.error('Failed to parse function arguments:', e);
    }
    
    console.log(`🔧 Tool call: ${name}`, args);
    
    // Notify about tool call
    this.onToolCall({
      name,
      args,
      callId
    });
    
    // Execute the tool if it's an attendance function
    let result = null;
    if (name === 'mark_student_present' || name === 'mark_student_absent') {
      const studentName = args.student_name;
      const rollNumber = args.roll_number;
      const status = name === 'mark_student_present' ? 'present' : 'absent';
      
      // Find student by name or roll number
      let student = this.studentList.find(s => 
        s.name.toLowerCase().includes(studentName?.toLowerCase()) ||
        s.rollNo === rollNumber
      );
      
      if (student) {
        result = { success: true, student: student.name, status };
      } else {
        result = { success: false, error: `Student not found: ${studentName || rollNumber}` };
      }
    } else if (name === 'mark_all_present') {
      result = { success: true, count: this.studentList.length };
    } else {
      // Try using handleChatToolCall for other tools
      try {
        result = await handleChatToolCall(name, args);
      } catch (e) {
        result = { error: e.message };
      }
    }
    
    // Send tool result back to the API
    this.sendFunctionResult(callId, result);
  }

  /**
   * Send function result back to the API
   */
  sendFunctionResult(callId, result) {
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result)
      }
    };
    
    console.log('📤 Sending function result:', event);
    this.ws.send(JSON.stringify(event));
    
    // Request a new response after the function result
    this.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  /**
   * Start streaming audio from microphone
   */
  async startStreaming() {
    if (!this.isConnected) {
      throw new Error('Not connected to Azure Realtime API');
    }
    
    if (this.isStreaming) {
      console.warn('Already streaming');
      return;
    }

    try {
      this.audioProcessor = new AudioProcessor();
      await this.audioProcessor.init();
      
      await this.audioProcessor.startMicrophone((pcmData) => {
        if (this.isStreaming && this.ws?.readyState === WebSocket.OPEN) {
          // Convert Int16Array to base64 for Azure Realtime API
          const base64Audio = this.int16ToBase64(pcmData);
          
          // Send audio data
          const event = {
            type: 'input_audio_buffer.append',
            audio: base64Audio
          };
          this.ws.send(JSON.stringify(event));
        }
      });
      
      this.isStreaming = true;
      this.onStatusChange('streaming');
      console.log('🎙️ Started audio streaming');
      
    } catch (error) {
      console.error('Failed to start streaming:', error);
      this.onError(error);
      throw error;
    }
  }

  /**
   * Convert Int16Array to base64
   */
  int16ToBase64(int16Array) {
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Commit audio buffer to trigger response
   */
  commitAudio() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    }
  }

  /**
   * Stop streaming
   */
  stopStreaming() {
    this.isStreaming = false;
    
    if (this.audioProcessor) {
      this.audioProcessor.stop();
      this.audioProcessor = null;
    }
    
    // Commit any remaining audio
    this.commitAudio();
    
    console.log('🎙️ Stopped audio streaming');
    this.onStatusChange('connected');
  }

  /**
   * Disconnect from the API
   */
  disconnect() {
    this.stopStreaming();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.onStatusChange('disconnected');
    console.log('🔌 Disconnected from Azure Realtime API');
  }

  /**
   * Stop and disconnect (alias for compatibility)
   */
  async stop() {
    this.disconnect();
  }

  /**
   * Start method for compatibility with GeminiLiveSession
   */
  async start() {
    await this.startStreaming();
  }
}

/**
 * Create an Azure Realtime session (factory function for compatibility)
 */
export function createAzureRealtimeSession(options) {
  return new AzureRealtimeSession(options);
}

export default AzureRealtimeSession;
