/**
 * Voice Service Unified Interface
 * 
 * Provides a unified voice/speech interface that delegates to the configured
 * provider (Azure Speech or Gemini Live). This is the recommended entry point
 * for all voice features in the application.
 * 
 * Usage:
 *   import { createVoiceSession, transcribeAudioFile } from './voiceServiceUnified';
 *   
 *   // Real-time streaming
 *   const session = await createVoiceSession({ onTranscript: (text) => console.log(text) });
 *   await session.start();
 *   
 *   // File transcription
 *   const result = await transcribeAudioFile(audioBlob);
 */

import { voiceRegistry } from './providers/registry.js';
import { createVoiceSession as createProviderSession, transcribeAudio } from './providers/unifiedAIClient.js';

// Configuration
const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'gemini';
const FALLBACK_ENABLED = import.meta.env.VITE_AI_FALLBACK_ENABLED !== 'false';

/**
 * Check if voice features are available
 * @returns {Promise<boolean>}
 */
export async function isVoiceAvailable() {
  try {
    const provider = voiceRegistry.getActiveInstance();
    if (!provider) return false;
    
    const health = await provider.healthCheck?.();
    return health?.available ?? true;
  } catch (error) {
    console.warn('[VoiceService] Health check failed:', error);
    return false;
  }
}

/**
 * Get information about the current voice provider
 */
export function getVoiceProviderInfo() {
  return {
    active: voiceRegistry.getActive(),
    configured: AI_PROVIDER,
    fallbackEnabled: FALLBACK_ENABLED
  };
}

/**
 * Create a real-time voice streaming session
 * 
 * @param {Object} options - Session options
 * @param {Function} options.onTranscript - Called with (text, isFinal) for each transcript
 * @param {Function} options.onToolCall - Called when a tool call is detected (for attendance)
 * @param {Function} options.onConnected - Called when session connects
 * @param {Function} options.onDisconnected - Called when session disconnects
 * @param {Function} options.onError - Called on errors
 * @param {string} options.language - Language code (default: 'en-IN')
 * @param {boolean} options.enableToolDetection - Enable tool call detection (default: true)
 * @param {Array} options.tools - Tool definitions for function calling
 * @returns {Promise<Object>} Session object with start(), stop(), sendAudio() methods
 */
export async function createVoiceSession(options = {}) {
  const {
    onTranscript,
    onToolCall,
    onConnected,
    onDisconnected,
    onError,
    language = 'en-IN',
    enableToolDetection = true,
    tools = []
  } = options;

  console.log(`[VoiceService] Creating session with provider: ${voiceRegistry.getActive()}`);

  try {
    const session = await createProviderSession({
      onTranscript,
      onToolCall,
      onConnected,
      onDisconnected,
      onError,
      language,
      tools: enableToolDetection ? tools : []
    });

    return {
      // Core methods
      start: () => session.start(),
      stop: () => session.stop(),
      
      // Audio input (for manual audio feeding)
      sendAudio: (audioData) => session.sendAudio?.(audioData),
      
      // Status
      isConnected: () => session.isConnected?.() ?? false,
      
      // Provider info
      provider: voiceRegistry.getActive(),
      
      // Raw session for advanced usage
      _session: session
    };
  } catch (error) {
    console.error('[VoiceService] Failed to create session:', error);
    
    // Try fallback if enabled
    if (FALLBACK_ENABLED) {
      console.log('[VoiceService] Attempting fallback...');
      const fallbackProvider = voiceRegistry.getActive() === 'azure' ? 'gemini' : 'mock';
      voiceRegistry.setActive(fallbackProvider);
      
      return createVoiceSession(options);
    }
    
    throw error;
  }
}

/**
 * Transcribe an audio file (batch processing)
 * 
 * @param {Blob|ArrayBuffer|string} audio - Audio data (blob, buffer, or base64)
 * @param {Object} options - Transcription options
 * @param {string} options.language - Language code
 * @param {string} options.format - Audio format (wav, mp3, etc.)
 * @returns {Promise<Object>} Transcription result with text and confidence
 */
export async function transcribeAudioFile(audio, options = {}) {
  const { language = 'en-IN', format = 'wav' } = options;

  console.log(`[VoiceService] Transcribing audio with provider: ${voiceRegistry.getActive()}`);

  try {
    const result = await transcribeAudio({
      audio,
      language,
      format
    });

    return {
      text: result.text,
      confidence: result.confidence,
      provider: result.provider,
      duration: result.duration
    };
  } catch (error) {
    console.error('[VoiceService] Transcription failed:', error);
    throw error;
  }
}

/**
 * Create an attendance-specific voice session
 * Optimized for classroom attendance marking with tool detection
 * 
 * @param {Object} options - Session options
 * @param {Array} options.studentList - List of students for name matching
 * @param {Function} options.onAttendanceMarked - Called when attendance action detected
 * @param {Function} options.onTranscript - Called with live transcript
 * @returns {Promise<Object>} Attendance session
 */
export async function createAttendanceVoiceSession(options = {}) {
  const {
    studentList = [],
    onAttendanceMarked,
    onTranscript,
    onError,
    language = 'en-IN'
  } = options;

  // Define attendance tools
  const attendanceTools = [
    {
      name: 'markAttendance',
      description: 'Mark one or more students as present or absent',
      parameters: {
        type: 'object',
        properties: {
          students: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Student name (full or partial match)' },
                status: { type: 'string', enum: ['present', 'absent'] },
                rollNumber: { type: 'string', description: 'Roll number if mentioned' }
              },
              required: ['name', 'status']
            }
          }
        },
        required: ['students']
      }
    },
    {
      name: 'markAllPresent',
      description: 'Mark all students in the class as present',
      parameters: {
        type: 'object',
        properties: {
          confirm: { type: 'boolean', description: 'Confirmation flag' }
        }
      }
    },
    {
      name: 'markAllAbsent',
      description: 'Mark all students in the class as absent',
      parameters: {
        type: 'object',
        properties: {
          confirm: { type: 'boolean', description: 'Confirmation flag' }
        }
      }
    }
  ];

  // Create session with attendance-specific handling
  return createVoiceSession({
    language,
    tools: attendanceTools,
    enableToolDetection: true,
    
    onTranscript: (text, isFinal) => {
      onTranscript?.(text, isFinal);
    },
    
    onToolCall: (toolCall) => {
      if (!onAttendanceMarked) return;

      const { name, arguments: args } = toolCall;
      
      if (name === 'markAttendance') {
        // Match student names from the list
        const matchedStudents = (args.students || []).map(s => {
          const match = findStudentMatch(s.name, studentList);
          return {
            ...s,
            matched: match,
            confidence: match ? 0.9 : 0.5
          };
        });
        
        onAttendanceMarked({
          action: 'mark',
          students: matchedStudents
        });
      } else if (name === 'markAllPresent') {
        onAttendanceMarked({
          action: 'markAllPresent',
          students: studentList.map(s => ({ ...s, status: 'present' }))
        });
      } else if (name === 'markAllAbsent') {
        onAttendanceMarked({
          action: 'markAllAbsent',
          students: studentList.map(s => ({ ...s, status: 'absent' }))
        });
      }
    },
    
    onError: (error) => {
      console.error('[AttendanceVoice] Error:', error);
      onError?.(error);
    }
  });
}

/**
 * Find best matching student from list
 */
function findStudentMatch(name, studentList) {
  if (!name || !studentList.length) return null;
  
  const normalizedName = name.toLowerCase().trim();
  
  // Exact match
  let match = studentList.find(s => 
    s.name?.toLowerCase() === normalizedName ||
    s.fullName?.toLowerCase() === normalizedName
  );
  if (match) return match;
  
  // Partial match (first name or last name)
  match = studentList.find(s => {
    const studentName = (s.name || s.fullName || '').toLowerCase();
    const parts = studentName.split(' ');
    return parts.some(part => part === normalizedName || normalizedName.includes(part));
  });
  if (match) return match;
  
  // Fuzzy match (contains)
  match = studentList.find(s => {
    const studentName = (s.name || s.fullName || '').toLowerCase();
    return studentName.includes(normalizedName) || normalizedName.includes(studentName);
  });
  
  return match;
}

/**
 * Switch voice provider at runtime
 * @param {string} provider - 'azure' | 'gemini' | 'mock'
 */
export function switchVoiceProvider(provider) {
  voiceRegistry.setActive(provider);
  console.log(`[VoiceService] Switched to ${provider}`);
}

/**
 * Get current voice provider
 */
export function getCurrentVoiceProvider() {
  return voiceRegistry.getActive();
}

export default {
  isVoiceAvailable,
  getVoiceProviderInfo,
  createVoiceSession,
  transcribeAudioFile,
  createAttendanceVoiceSession,
  switchVoiceProvider,
  getCurrentVoiceProvider
};
