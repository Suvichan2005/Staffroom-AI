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
  'gpt-4o-realtime-preview';

const USE_PROXY = import.meta.env.PROD || import.meta.env.VITE_USE_AI_PROXY === 'true';

/**
 * Check if Azure Realtime is available
 */
export function isAzureRealtimeAvailable() {
  return !!(AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY);
}

/**
 * Audio Processor for PCM conversion (matches Gemini Live exactly)
 */
class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.source = null;
  }

  async init() {
    // Azure Realtime uses 24kHz sample rate
    this.audioContext = new AudioContext({ sampleRate: 24000 });
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
    this.onTurnComplete = options.onTurnComplete || (() => {});
    
    // Student list for fuzzy matching (same as Gemini)
    this.studentList = options.studentList || [];
    this.classId = options.classId || '';
    
    // Custom system prompt and tools
    this.systemPrompt = options.systemPrompt || null;
    this.tools = options.tools || null;
    
    // Transcript accumulator (matches Gemini exactly)
    this.currentTranscript = '';
    this.interimTranscript = '';
    
    // Response tracking
    this.currentResponseId = null;
    this.pendingFunctionArgs = {};
  }

  /**
   * Get WebSocket URL for Azure OpenAI Realtime API
   */
  getWebSocketUrl() {
    // Extract the resource name from endpoint
    const endpointUrl = new URL(AZURE_OPENAI_ENDPOINT);
    const resourceName = endpointUrl.hostname.split('.')[0];
    
    // Azure Realtime WebSocket endpoint format
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
        // Azure uses API key in query param for WebSocket
        const wsUrlWithKey = USE_PROXY 
          ? wsUrl 
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
          // Note: session.update will be sent after receiving session.created
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('❌ WebSocket error:', error);
          this.onError(new Error('WebSocket connection failed. Check API key and deployment.'));
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
    // Build student list for the prompt (same format as Gemini)
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
              description: 'The name of the student to mark present (use the actual name, not the roll number)'
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
              description: 'The name of the student to mark absent (use the actual name, not the roll number)'
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
    
    // System prompt matching Gemini's format exactly
    const systemPrompt = this.systemPrompt || `You are an attendance assistant for Class ${this.classId}. 

CRITICAL LANGUAGE RULE - MANDATORY:
- You MUST ALWAYS respond in ENGLISH ONLY, regardless of the input language
- If the teacher speaks in Hindi, Hinglish, Spanish, or ANY other language, you MUST:
  1. Understand what they said
  2. Respond ONLY in English
  3. NEVER respond in the same language as the input
- Do NOT repeat the user's words in their original language
- Do NOT respond in Hindi, Spanish, French, or any non-English language
- Your ONLY output language is English

Listen to the teacher's voice and mark attendance in real-time using the provided tools.

Students in this class (Roll No: Name): ${studentListWithRolls}

Instructions:
- When you hear a student's name followed by "present", "here", "attending", call mark_student_present with the student's full name
- When you hear "roll number X" or "roll X" followed by "present"/"here", look up the name for that roll number and call mark_student_present with both name and roll_number
- When you hear a student's name followed by "absent", "not here", "missing", call mark_student_absent
- When you hear "roll number X" followed by "absent", look up the name and call mark_student_absent
- When you hear "everyone present" or "all present", call mark_all_present
- IMPORTANT: Match spoken variations like "role", "roll", "number" to roll numbers
- Match number words: "one"=1, "two"=2, "three"=3, "four"=4, "five"=5, "six"=6, etc.
- Call tools immediately as you recognize names or roll numbers - don't wait
- Fuzzy match student names - teacher might use nicknames or partial names
- If unsure between two students, pick the closest match`;

    const sessionUpdate = {
      type: 'session.update',
      session: {
        voice: 'alloy',
        instructions: systemPrompt,
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
        temperature: 0.6, // Azure Realtime minimum is 0.6 (unlike Gemini's 0.3)
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
      
      // Log important events (not deltas)
      if (!eventType?.includes('delta')) {
        console.log('📥 Azure Realtime:', eventType, message);
      }
      
      switch (eventType) {
        case 'session.created':
          console.log('✅ Session created:', message.session?.id);
          this.sessionId = message.session?.id;
          // Send session.update AFTER receiving session.created
          // Small delay to ensure server is fully ready
          setTimeout(() => {
            this.sendSessionUpdate();
          }, 100);
          break;
          
        case 'session.updated':
          console.log('✅ Session configured');
          this.onStatusChange('ready');
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
          // User's speech transcription - accumulate like Gemini
          const transcript = message.transcript;
          if (transcript) {
            console.log('🎤 Input transcript:', transcript);
            this.currentTranscript += ' ' + transcript;
            this.currentTranscript = this.currentTranscript.trim();
            this.onTranscript({
              type: 'input',
              text: transcript,
              combined: this.currentTranscript
            });
          }
          break;
          
        case 'response.created':
          this.currentResponseId = message.response?.id;
          break;
          
        case 'response.output_item.added':
          // Track the item for function call accumulation
          if (message.item?.type === 'function_call') {
            this.pendingFunctionArgs[message.item.id] = {
              callId: message.item.call_id,
              name: message.item.name,
              args: ''
            };
          }
          break;
          
        case 'response.function_call_arguments.delta':
          // Accumulate function call arguments
          if (message.item_id && this.pendingFunctionArgs[message.item_id]) {
            this.pendingFunctionArgs[message.item_id].args += message.delta || '';
          }
          break;
          
        case 'response.function_call_arguments.done':
          // Function call complete - execute it
          this.handleFunctionCallComplete(message);
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
            console.log('🤖 Model response:', aiTranscript);
            this.onTranscript({
              type: 'model',
              text: aiTranscript,
              combined: this.currentTranscript
            });
          }
          this.interimTranscript = '';
          break;
          
        case 'response.audio.delta':
          // Audio response data
          if (message.delta && this.onAudioResponse) {
            try {
              const audioData = atob(message.delta);
              this.onAudioResponse(audioData);
            } catch (e) {
              // Ignore decode errors
            }
          }
          break;
          
        case 'response.done':
          console.log('✅ Response complete');
          this.onStatusChange('streaming');
          
          // Clear any pending function args
          this.pendingFunctionArgs = {};
          
          // Notify turn complete
          if (this.onTurnComplete) {
            this.onTurnComplete();
          }
          break;
          
        case 'error':
          console.error('❌ Azure Realtime error:', JSON.stringify(message.error, null, 2));
          console.error('Error type:', message.error?.type);
          console.error('Error code:', message.error?.code);
          console.error('Error message:', message.error?.message);
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
   * Handle completed function call - matches Gemini's handleToolCall logic
   */
  handleFunctionCallComplete(message) {
    const itemId = message.item_id;
    const pending = this.pendingFunctionArgs[itemId];
    
    // Get call info from pending or directly from message
    const callId = pending?.callId || message.call_id;
    const name = pending?.name || message.name;
    let argsStr = pending?.args || message.arguments || '{}';
    
    let args = {};
    try {
      args = JSON.parse(argsStr);
    } catch (e) {
      console.error('Failed to parse function arguments:', e);
    }
    
    console.log('🔧 Tool call:', name, args);
    
    // Handle attendance-specific tools with fuzzy matching (like Gemini)
    if (name === 'mark_student_present' || name === 'mark_student_absent' || name === 'mark_all_present') {
      this.handleAttendanceToolCall(callId, name, args);
      return;
    }
    
    // Use the shared handleChatToolCall for other tools (syllabus, progress, etc.)
    const { action, result } = handleChatToolCall({
      id: callId,
      name: name,
      args: args
    }, null);

    // Emit tool call event to UI
    this.onToolCall({
      id: callId,
      name: name,
      args: args,
      display: action.display,
      result: result
    });

    // Send tool response back to Azure
    this.sendFunctionResult(callId, result);
  }

  /**
   * Handle attendance-specific tool calls with fuzzy matching (matches Gemini exactly)
   */
  handleAttendanceToolCall(callId, name, args) {
    let result = {};
    let matchedStudent = null;
    let confidence = 'low';
    
    if (name === 'mark_student_present' || name === 'mark_student_absent') {
      // Try to match student by roll number first, then by name
      matchedStudent = this.fuzzyMatchStudent(args.student_name, args.roll_number);
      
      if (matchedStudent) {
        const status = name === 'mark_student_present' ? 'present' : 'absent';
        result = { 
          success: true, 
          studentId: matchedStudent.studentId,
          studentName: matchedStudent.name,
          rollNo: matchedStudent.rollNo,
          status: status,
          message: `Marked ${matchedStudent.name} (Roll ${matchedStudent.rollNo}) as ${status}`
        };
        confidence = 'high';
        console.log(`✅ Matched "${args.student_name}" → ${matchedStudent.name} (Roll ${matchedStudent.rollNo})`);
      } else {
        result = { 
          success: false, 
          error: `Could not find student matching "${args.student_name}"`,
          searchedName: args.student_name,
          searchedRoll: args.roll_number
        };
        console.log(`❌ No match for "${args.student_name}"`);
      }
    } else if (name === 'mark_all_present') {
      const exceptions = (args.exceptions || []).map(n => n.toLowerCase());
      const markedStudents = this.studentList.filter(s => 
        !exceptions.some(ex => s.name.toLowerCase().includes(ex))
      );
      result = {
        success: true,
        count: markedStudents.length,
        exceptions: exceptions,
        message: `Marked ${markedStudents.length} students as present`
      };
      confidence = 'high';
    }
    
    // Emit tool call event to UI with matched student info (same as Gemini)
    this.onToolCall({
      id: callId,
      name: name,
      args: args,
      matchedStudent: matchedStudent,
      confidence: confidence,
      display: result.message || result.error,
      result: result
    });
    
    // Send tool response back to Azure
    this.sendFunctionResult(callId, result);
  }

  /**
   * Match student by roll number (same as Gemini)
   */
  matchByRollNumber(rollNumber) {
    if (rollNumber === undefined || rollNumber === null) return null;
    const num = parseInt(rollNumber, 10);
    if (isNaN(num)) return null;
    return this.studentList.find(s => s.rollNo === num);
  }

  /**
   * Fuzzy match student name from the list, with roll number support (same as Gemini)
   */
  fuzzyMatchStudent(spokenName, rollNumber = null) {
    // First try roll number if provided
    if (rollNumber !== undefined && rollNumber !== null) {
      const byRoll = this.matchByRollNumber(rollNumber);
      if (byRoll) return byRoll;
    }
    
    const lower = (spokenName || '').toLowerCase().trim();
    if (!lower) return null;
    
    // Check if the spoken name contains a roll number pattern
    const rollPatterns = [
      /roll\s*(?:number|no|num|#)?\s*(\d+)/i,
      /(\d+)\s*(?:number|no)?/i
    ];
    for (const pattern of rollPatterns) {
      const rollMatch = lower.match(pattern);
      if (rollMatch) {
        const num = parseInt(rollMatch[1], 10);
        const byRoll = this.matchByRollNumber(num);
        if (byRoll) return byRoll;
      }
    }
    
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
   * Simple string similarity score (0-1) - same as Gemini
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
   * Send function result back to Azure Realtime API
   */
  sendFunctionResult(callId, result) {
    // Create the function output item
    const createEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result)
      }
    };
    
    console.log('📤 Sending function result:', createEvent);
    this.ws.send(JSON.stringify(createEvent));
    
    // Request a new response after the function result
    this.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  /**
   * Start audio streaming from microphone
   */
  async startStreaming() {
    if (!this.isConnected) {
      throw new Error('Not connected to Azure Realtime API');
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
   * Send audio chunk to Azure Realtime API
   */
  sendAudioChunk(int16Array) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.isStreaming) return;

    // Convert Int16Array to base64
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Azure Realtime API format
    const event = {
      type: 'input_audio_buffer.append',
      audio: base64
    };

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Send text input (for testing or hybrid mode)
   */
  sendText(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: text
        }]
      }
    };

    this.ws.send(JSON.stringify(event));
    this.ws.send(JSON.stringify({ type: 'response.create' }));
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
    this.currentTranscript = '';
    this.interimTranscript = '';
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
