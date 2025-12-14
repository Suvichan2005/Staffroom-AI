import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, Check, X, UserCheck, UserX, Square, Zap, Wifi, WifiOff } from 'lucide-react';
import { startBrowserTranscription, isSpeechRecognitionSupported } from '../../services/voiceService';
import { parseAttendanceVoice } from '../../services/aiService';
import { GeminiLiveSession, isGeminiLiveAvailable } from '../../services/geminiLiveService';

/**
 * Voice Attendance Logger Component
 *
 * Allows teachers to mark attendance via voice input
 * Features:
 * - Standard mode: Record → Process → Update (manual stop)
 * - Live AI mode: Real-time Gemini streaming with instant tool calls
 * 
 * Usage: <VoiceAttendanceLogger classId="6A" students={studentList} onUpdate={callback} />
 */
export default function VoiceAttendanceLogger({ classId, students, onUpdate }) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | listening | processing | success | error
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  // Live session state - always use Live API if available, otherwise fallback to standard
  const [liveSession, setLiveSession] = useState(null);
  const [liveStatus, setLiveStatus] = useState('disconnected'); // disconnected | connecting | connected | ready | streaming
  const [liveUpdates, setLiveUpdates] = useState([]); // Real-time attendance updates
  const [attendanceState, setAttendanceState] = useState({}); // Current attendance: { studentId: boolean }
  const [useStandardMode, setUseStandardMode] = useState(false); // Only use standard if Live API unavailable
  
  // Refs for managing recording state
  const recognitionRef = useRef(null);
  const liveSessionRef = useRef(null);

  // Check if Live API is available - determines which mode to use
  const canUseLiveAPI = isGeminiLiveAvailable();
  
  // Automatically choose mode: Live API first, fallback to standard
  const shouldUseLiveAPI = canUseLiveAPI && !useStandardMode;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.manualStop?.();
      }
      if (liveSessionRef.current) {
        liveSessionRef.current.disconnect();
      }
    };
  }, []);

  // Handle live tool calls - update attendance in real-time
  const handleLiveToolCall = useCallback((toolCall) => {
    const { name, args, matchedStudent, confidence } = toolCall;
    
    const update = {
      id: Date.now(),
      action: name,
      studentName: args.student_name,
      matchedStudent: matchedStudent,
      confidence: confidence,
      timestamp: new Date().toLocaleTimeString()
    };

    setLiveUpdates(prev => [...prev, update]);

    // Apply the update to attendance state
    if (name === 'mark_student_present' && matchedStudent) {
      setAttendanceState(prev => ({
        ...prev,
        [matchedStudent.studentId]: true
      }));
      
      // Notify parent immediately
      if (onUpdate) {
        onUpdate({ [matchedStudent.studentId]: true });
      }
    } 
    else if (name === 'mark_student_absent' && matchedStudent) {
      setAttendanceState(prev => ({
        ...prev,
        [matchedStudent.studentId]: false
      }));
      
      if (onUpdate) {
        onUpdate({ [matchedStudent.studentId]: false });
      }
    }
    else if (name === 'mark_all_present') {
      const exceptions = (args.exceptions || []).map(n => n.toLowerCase());
      const updates = {};
      
      students.forEach(s => {
        if (!exceptions.some(ex => s.name.toLowerCase().includes(ex))) {
          updates[s.studentId] = true;
        }
      });
      
      setAttendanceState(prev => ({ ...prev, ...updates }));
      if (onUpdate) onUpdate(updates);
    }
    else if (name === 'mark_all_absent') {
      const exceptions = (args.exceptions || []).map(n => n.toLowerCase());
      const updates = {};
      
      students.forEach(s => {
        if (!exceptions.some(ex => s.name.toLowerCase().includes(ex))) {
          updates[s.studentId] = false;
        }
      });
      
      setAttendanceState(prev => ({ ...prev, ...updates }));
      if (onUpdate) onUpdate(updates);
    }
    else if (name === 'undo_last_action') {
      // Remove last update
      setLiveUpdates(prev => prev.slice(0, -1));
      // Could implement more sophisticated undo logic here
    }
  }, [students, onUpdate]);

  // Start Live AI session
  const startLiveSession = async () => {
    try {
      setStatus('listening');
      setLiveStatus('connecting');
      setError('');
      setLiveUpdates([]);
      setTranscript('');
      setInterimTranscript('');

      const session = new GeminiLiveSession({
        classId,
        studentList: students,
        onTranscript: (data) => {
          console.log('📝 Transcript update:', data);
          // Handle input transcription (what the user said)
          if (data.type === 'input') {
            setTranscript(data.combined);
            setInterimTranscript('');
          } 
          // Handle model responses
          else if (data.type === 'model') {
            setInterimTranscript(data.text);
          }
          // Legacy types
          else if (data.type === 'interim') {
            setInterimTranscript(data.text);
          } else {
            setTranscript(data.combined);
            setInterimTranscript('');
          }
        },
        onToolCall: handleLiveToolCall,
        onError: (err) => {
          console.error('Live session error:', err);
          setError(err.message || 'Live session error');
          setStatus('error');
        },
        onStatusChange: (newStatus) => {
          console.log('🔄 Status change:', newStatus);
          setLiveStatus(newStatus);
          if (newStatus === 'streaming') {
            setIsRecording(true);
          }
        }
      });

      await session.connect();
      await session.startStreaming();
      
      liveSessionRef.current = session;
      setLiveSession(session);
      setIsRecording(true);

    } catch (err) {
      console.error('Failed to start live session:', err);
      setError(err.message || 'Failed to start live AI session');
      setStatus('error');
      setLiveStatus('disconnected');
    }
  };

  // Stop Live AI session
  const stopLiveSession = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.disconnect();
      liveSessionRef.current = null;
    }
    setLiveSession(null);
    setIsRecording(false);
    setLiveStatus('disconnected');
    
    // Show summary
    const presentCount = Object.values(attendanceState).filter(v => v === true).length;
    const absentCount = Object.values(attendanceState).filter(v => v === false).length;
    
    if (presentCount > 0 || absentCount > 0) {
      setResult({
        present: presentCount,
        absent: absentCount,
        total: Object.keys(attendanceState).length,
        updates: attendanceState
      });
      setStatus('success');
    } else {
      setStatus('idle');
    }
  };

  // Standard mode - start recording with manual stop
  const handleStartRecording = async () => {
    setIsRecording(true);
    setStatus('listening');
    setTranscript('');
    setInterimTranscript('');
    setError('');
    setResult(null);

    if (!isSpeechRecognitionSupported()) {
      setError('Speech recognition not supported in this browser');
      setStatus('error');
      setIsRecording(false);
      return;
    }

    const recognition = startBrowserTranscription({
      onResult: async (data) => {
        setTranscript(data.transcript);
        await processTranscript(data.transcript);
      },
      onError: (err) => {
        if (!recognitionRef.current) return; // Already stopped
        console.error('Voice logging error:', err);
        setStatus('error');
        setError(err.message || 'Failed to process voice input.');
        setIsRecording(false);
      },
      onInterim: (data) => {
        setInterimTranscript(data.interim);
        setTranscript(data.final);
      },
      manualStop: true // Don't auto-stop!
    });

    if (recognition) {
      recognitionRef.current = recognition;
      recognition.start();
    } else {
      setError('Failed to initialize speech recognition');
      setStatus('error');
      setIsRecording(false);
    }
  };

  // Standard mode - stop recording
  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.manualStop();
      recognitionRef.current = null;
    }
  };

  // Process transcript using AI
  const processTranscript = async (text) => {
    setStatus('processing');
    setIsRecording(false);

    try {
      const parsed = await parseAttendanceVoice(text, classId, students);

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      const updates = parsed.updates || {};
      const presentCount = Object.values(updates).filter(v => v === true).length;
      const absentCount = Object.values(updates).filter(v => v === false).length;

      const summary = {
        present: presentCount,
        absent: absentCount,
        total: Object.keys(updates).length,
        updates
      };

      setResult(summary);
      setStatus('success');
      setAttendanceState(updates);

      if (onUpdate) {
        onUpdate(updates);
      }

    } catch (err) {
      console.error('Attendance processing error:', err);
      setStatus('error');
      setError(err.message || 'Failed to process attendance. Please try again.');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setTranscript('');
    setInterimTranscript('');
    setResult(null);
    setError('');
    setLiveUpdates([]);
    setAttendanceState({});
  };

  // Start recording - automatically choose best available method
  const startRecording = async () => {
    if (shouldUseLiveAPI) {
      // Try Live API first
      try {
        await startLiveSession();
      } catch (err) {
        console.error('Live API failed, falling back to standard mode:', err);
        setUseStandardMode(true);
        // Retry with standard mode
        await handleStartRecording();
      }
    } else {
      // Use standard browser speech recognition
      await handleStartRecording();
    }
  };

  // Stop recording - determine which method to stop
  const stopRecording = async () => {
    if (shouldUseLiveAPI && liveSessionRef.current) {
      await stopLiveSession();
    } else if (recognitionRef.current) {
      await handleStopRecording();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Mic className="w-4 h-4 text-indigo-600" />
          Voice Attendance
          {shouldUseLiveAPI && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-medium rounded-full">
              <Zap className="w-2.5 h-2.5" />
              LIVE AI
            </span>
          )}
        </h3>

        <div className="flex items-center gap-2">
          {/* Action Buttons */}
          {status === 'idle' && (
            <button
              onClick={startRecording}
              disabled={isRecording}
              className={`flex items-center gap-2 px-3 py-1.5 text-white rounded-lg transition-colors text-xs font-medium ${
                shouldUseLiveAPI
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              Start Recording
            </button>
          )}

          {status === 'listening' && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop Recording
            </button>
          )}

          {status === 'processing' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing...
            </div>
          )}

          {status === 'success' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-xs"
            >
              Reset
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-xs"
            >
              Try Again
            </button>
          )}
        </div>
      </div>

      {/* Live Status Indicator */}
      {shouldUseLiveAPI && liveStatus !== 'disconnected' && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${
            liveStatus === 'streaming' ? 'bg-green-500 animate-pulse' :
            liveStatus === 'ready' ? 'bg-green-500' :
            liveStatus === 'connected' ? 'bg-yellow-500' :
            'bg-gray-400'
          }`} />
          <span className="text-gray-600">
            {liveStatus === 'connecting' && 'Connecting to Gemini Live...'}
            {liveStatus === 'connected' && 'Connected, initializing...'}
            {liveStatus === 'ready' && 'Ready, starting mic...'}
            {liveStatus === 'streaming' && 'Live AI listening...'}
          </span>
        </div>
      )}

      {/* Recording Indicator */}
      {status === 'listening' && !shouldUseLiveAPI && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-700 font-medium">Listening...</span>
          <span className="text-xs text-red-500">Press Stop when done</span>
        </div>
      )}

      {/* Live Transcript Display */}
      {(transcript || interimTranscript) && (
        <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-100">
          <p className="text-xs text-gray-500 italic">
            "{transcript}
            {interimTranscript && (
              <span className="text-gray-400">{interimTranscript}</span>
            )}"
          </p>
        </div>
      )}

      {/* Live Updates Feed */}
      {shouldUseLiveAPI && liveUpdates.length > 0 && (
        <div className="mb-3 max-h-32 overflow-y-auto">
          <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Live Updates</p>
          <div className="space-y-1">
            {liveUpdates.map(update => (
              <div 
                key={update.id}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                  update.action.includes('present') 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {update.action.includes('present') 
                  ? <UserCheck className="w-3 h-3" /> 
                  : <UserX className="w-3 h-3" />
                }
                <span className="font-medium">
                  {update.matchedStudent?.name || update.studentName}
                </span>
                <span className="text-gray-400">•</span>
                <span className={`text-[10px] px-1 rounded ${
                  update.confidence === 'high' ? 'bg-green-100' :
                  update.confidence === 'medium' ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}>
                  {update.confidence}
                </span>
                <span className="text-gray-400 ml-auto text-[10px]">{update.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Result */}
      {status === 'success' && result && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900 mb-1">Attendance Marked</p>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-700">
                  <UserCheck className="w-3 h-3" /> {result.present} Present
                </span>
                <span className="flex items-center gap-1 text-red-700">
                  <UserX className="w-3 h-3" /> {result.absent} Absent
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {status === 'error' && error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <X className="w-4 h-4 text-red-600 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-900">Error</p>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {status === 'idle' && (
        <p className="text-[10px] text-gray-400 mt-2">
          {shouldUseLiveAPI 
            ? 'Live AI mode: Say names naturally and watch attendance update in real-time!'
            : 'Try saying: "Mark Rahul and Priya absent, everyone else present"'
          }
        </p>
      )}
    </div>
  );
}
