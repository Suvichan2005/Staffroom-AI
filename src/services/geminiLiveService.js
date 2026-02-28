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
import { getLiveSessionToken } from './aiApiClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// In production, we fetch the WebSocket URL from the secure proxy
// to avoid exposing API keys in the client bundle
// Disable proxy - use direct browser API calls
const USE_PROXY = false;

// Use gemini-2.5-flash-native-audio-preview-12-2025 for Live API - supports audio input with TEXT responses + tool calling
// The native-audio model requires responseModalities: ['AUDIO'] and cannot return TEXT
const LIVE_API_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

// Direct URL (only used in development mode with local API key)
const LIVE_API_URL_DIRECT = GEMINI_API_KEY 
  ? `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`
  : null;

/**
 * Get the WebSocket URL for Gemini Live
 * In production, fetches from Cloud Function. In dev, uses direct URL.
 */
async function getLiveApiUrl() {
  if (USE_PROXY) {
    try {
      const { wsUrl } = await getLiveSessionToken();
      return wsUrl;
    } catch (error) {
      console.error('Failed to get live session token:', error);
      throw new Error('Unable to start live session - please try again');
    }
  }
  
  if (!LIVE_API_URL_DIRECT) {
    throw new Error('Gemini API key not configured for live sessions');
  }
  
  return LIVE_API_URL_DIRECT;
}

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
    
    // Transcript tracking
    // turnTranscript: Transcript for current turn (reset after model responds)
    // currentTranscript: Full accumulated transcript for reference only
    this.turnTranscript = '';
    this.currentTranscript = '';
    this.interimTranscript = '';
    this.lastTranscriptText = ''; // For deduplication
    this.currentThinking = ''; // Model's inner reasoning text
    this.currentResponse = ''; // Model's spoken response transcript
  }

  /**
   * Connect to Gemini Live API
   */
  async connect() {
    // Get the WebSocket URL (from proxy in prod, direct in dev)
    let wsUrl;
    try {
      wsUrl = await getLiveApiUrl();
    } catch (error) {
      throw new Error(error.message || 'Failed to get live session URL');
    }

    console.log('🔌 Connecting to Gemini Live API...');
    console.log('📍 URL:', wsUrl.replace(/key=[^&]+/, 'key=HIDDEN'));
    console.log('🤖 Model:', LIVE_API_MODEL);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        
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
    // Build student list with roll numbers for the prompt
    const studentListWithRolls = this.studentList.map(s => 
      `Roll ${s.rollNo || '?'}: ${s.name}`
    ).join(', ');
    
    // Build tools array with proper format - now supports roll numbers
    const tools = [{
      functionDeclarations: [
        {
          name: 'mark_student_present',
          description: 'Mark a student as present. Call when teacher says a name or roll number is present/here/attending.',
          parameters: {
            type: 'OBJECT',
            properties: {
              student_name: {
                type: 'STRING',
                description: 'The name of the student to mark present (use the actual name, not the roll number)'
              },
              roll_number: {
                type: 'NUMBER',
                description: 'Optional: The roll number if teacher said roll number instead of name'
              }
            },
            required: ['student_name']
          }
        },
        {
          name: 'mark_student_absent',
          description: 'Mark a student as absent. Call when teacher says a name or roll number is absent/not here/missing.',
          parameters: {
            type: 'OBJECT',
            properties: {
              student_name: {
                type: 'STRING',
                description: 'The name of the student to mark absent (use the actual name, not the roll number)'
              },
              roll_number: {
                type: 'NUMBER',
                description: 'Optional: The roll number if teacher said roll number instead of name'
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
          responseModalities: ['AUDIO'],
          temperature: 0.3,
        },
        systemInstruction: {
          parts: [{
            text: this.systemPrompt || `You are an attendance assistant for Class ${this.classId}. 

CRITICAL: You MUST transcribe and respond in ENGLISH ONLY. If you receive audio in Hindi, Hinglish, or any other language, immediately translate it to English.

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
- If unsure between two students, pick the closest match`
          }]
        },
        // Enable input audio transcription with explicit English language
        inputAudioTranscription: {},
        // Enable output audio transcription so we can show what the model says as text
        outputAudioTranscription: {}
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
            // Filter out noise markers and empty transcripts
            if (text === '<noise>' || text.trim() === '' || text === this.lastTranscriptText) {
              return; // Skip noise, empty, or duplicate
            }
            
            console.log('🎤 Input transcript:', text);
            this.lastTranscriptText = text;
            
            // Smart concatenation for partial transcripts from Gemini:
            // - If text STARTS with a space, it's a NEW word → just append (space included)
            // - If text does NOT start with a space, it's a CONTINUATION → append directly (no space)
            // This handles cases like: " which" (new word) vs "cumenta" (continuation of "do")
            if (text.startsWith(' ')) {
              // New word - append as-is (includes the leading space)
              this.turnTranscript += text;
            } else {
              // Continuation of previous word - append directly without space
              this.turnTranscript += text;
            }
            this.turnTranscript = this.turnTranscript.trim();
            
            // Also update full transcript for reference
            this.currentTranscript = this.turnTranscript;
            
            this.onTranscript({
              type: 'input',
              text: text,
              combined: this.turnTranscript // Use turn transcript, not full session
            });
          }
        }
        
        // Handle model turn - text parts are THINKING (inner monologue)
        // With native-audio model, text = reasoning, audio = actual spoken response
        if (content.modelTurn) {
          for (const part of content.modelTurn.parts || []) {
            if (part.text) {
              console.log('💭 Model thinking:', part.text);
              this.currentThinking += part.text;
              this.onTranscript({
                type: 'thinking',
                text: part.text,
                combined: this.turnTranscript
              });
            }
            // Audio inlineData = actual spoken response (played by browser)
          }
        }

        // Handle output transcription - this is what the model ACTUALLY SAID (spoken response)
        if (content.outputTranscription) {
          const spokenText = content.outputTranscription.text || '';
          if (spokenText && spokenText.trim()) {
            console.log('🤖 Model spoken response:', spokenText);
            this.currentResponse += spokenText;
            this.onTranscript({
              type: 'model',
              text: spokenText,
              combined: this.turnTranscript
            });
          }
        }

        // Handle turn complete
        if (content.turnComplete) {
          console.log('✅ Turn complete');
          this.interimTranscript = '';
          
          // Reset turn transcript for next turn
          // This prevents accumulation across turns
          this.turnTranscript = '';
          this.lastTranscriptText = '';
          this.currentThinking = '';
          this.currentResponse = '';
          
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
   * Handle tool calls from Gemini - attendance tools handled locally, others use shared chatToolsDefinition
   */
  handleToolCall(toolCall) {
    const functionCalls = toolCall.functionCalls || [];
    
    for (const fc of functionCalls) {
      console.log('🔧 Tool call:', fc.name, fc.args);
      
      // Parse arguments
      const args = typeof fc.args === 'string' ? JSON.parse(fc.args) : fc.args;
      
      // Handle attendance-specific tools locally (with fuzzy matching)
      if (fc.name === 'mark_student_present' || fc.name === 'mark_student_absent' || fc.name === 'mark_all_present') {
        this.handleAttendanceToolCall(fc.id, fc.name, args);
        continue;
      }
      
      // Use the shared handleChatToolCall for other tools (syllabus, progress, etc.)
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

      // Send tool response back to Gemini
      this.sendToolResponse(fc.id, fc.name, result);
    }
  }

  /**
   * Handle attendance-specific tool calls with fuzzy matching
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
    
    // Emit tool call event to UI with matched student info
    this.onToolCall({
      id: callId,
      name: name,
      args: args,
      matchedStudent: matchedStudent,
      confidence: confidence,
      display: result.message || result.error,
      result: result
    });
    
    // Send tool response back to Gemini
    this.sendToolResponse(callId, name, result);
  }

  /**
   * Match student by roll number
   */
  matchByRollNumber(rollNumber) {
    if (rollNumber === undefined || rollNumber === null) return null;
    const num = parseInt(rollNumber, 10);
    if (isNaN(num)) return null;
    return this.studentList.find(s => s.rollNo === num);
  }

  /**
   * Fuzzy match student name from the list, with roll number support
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
