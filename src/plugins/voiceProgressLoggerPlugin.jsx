/**
 * Voice Progress Logger Plugin
 * 
 * Wired-in by plugin integration pass — user asked to keep files intact.
 * 
 * Integrates VoiceProgressLogger functionality into the chat interface.
 * Allows teachers to update syllabus progress via voice input directly
 * from the AI chatbox (both desktop and mobile).
 * 
 * Features:
 * - Voice recording button in chat input area
 * - Text-based fallback for progress updates
 * - Real-time transcription and progress parsing
 * - Integration with syllabus data for smart matching
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, Check, X, Volume2 } from 'lucide-react';
import { registerChatPlugin, emitEvent } from './chat-plugins';
import { recordAndTranscribe, isSpeechRecognitionSupported } from '../services/voiceService';
import { parseVoiceTranscript } from '../services/aiService';
import { 
  persistProgress, 
  teacherData, 
  getSyllabusByRef, 
  getCourseById,
  normalizeSectionProgress 
} from '../data/dummyData';

// Debug flag
const DEBUG = import.meta.env.VITE_DEBUG_PLUGINS === 'true';
const debugLog = (...args) => DEBUG && console.log('[VoiceProgressPlugin]', ...args);

/**
 * Voice Recording Button Component
 * Rendered in the chat input area
 */
function VoiceRecordButton({ 
  isRecording, 
  isProcessing, 
  onStartRecording, 
  onStopRecording,
  disabled 
}) {
  const getButtonState = () => {
    if (isProcessing) return 'processing';
    if (isRecording) return 'recording';
    return 'idle';
  };

  const state = getButtonState();

  return (
    <motion.button
      type="button"
      onClick={isRecording ? onStopRecording : onStartRecording}
      disabled={disabled || isProcessing}
      whileTap={{ scale: 0.9 }}
      className={`
        relative p-2.5 rounded-xl transition-all flex items-center justify-center
        ${state === 'recording' 
          ? 'bg-red-500 text-white shadow-lg shadow-red-200' 
          : state === 'processing'
            ? 'bg-yellow-100 text-yellow-700'
            : 'text-black-400 hover:text-indigo-600 hover:bg-indigo-50'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      aria-label={
        state === 'recording' 
          ? 'Stop recording' 
          : state === 'processing'
            ? 'Processing voice...'
            : 'Start voice recording'
      }
      title="Voice Progress Logger"
    >
      <AnimatePresence mode="wait">
        {state === 'processing' ? (
          <motion.div
            key="processing"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <Loader2 className="w-5 h-5 animate-spin" />
          </motion.div>
        ) : state === 'recording' ? (
          <motion.div
            key="recording"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <MicOff className="w-5 h-5" />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <Mic className="w-5 h-5" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording pulse animation */}
      {state === 'recording' && (
        <motion.span
          className="absolute inset-0 rounded-xl bg-red-400"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}

/**
 * Voice Progress Status Display
 * Shows transcription result and progress update status
 */
function VoiceProgressStatus({ status, transcript, result, error, onReset }) {
  if (status === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-3"
    >
      {/* Transcript */}
      {transcript && (
        <div className="p-3 bg-black-50 rounded-lg mb-2">
          <p className="text-xs text-black-500 mb-1">You said:</p>
          <p className="text-sm text-black-800 italic">"{transcript}"</p>
        </div>
      )}

      {/* Processing */}
      {status === 'processing' && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
          <span className="text-sm text-yellow-700">Processing your voice input...</span>
        </div>
      )}

      {/* Success */}
      {status === 'success' && result && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Progress Updated!</p>
              <p className="text-sm text-green-700 mt-1">
                <strong>{result.chapter}</strong> → <strong>{result.topic}</strong>
                <span className="ml-2 px-2 py-0.5 bg-green-200 rounded text-xs font-medium">
                  {result.status}
                </span>
              </p>
            </div>
            <button
              onClick={onReset}
              className="text-green-600 hover:text-green-800 p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={onReset}
              className="text-red-600 hover:text-red-800 p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Voice Progress Panel Component
 * Full panel shown in the "Tools" tab
 */
function VoiceProgressPanel({ context, onProgressUpdate }) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [typedText, setTypedText] = useState('');

  // Use context or fall back to first available course/section from teacherData
  const defaultCourse = teacherData.courses[0];
  const defaultSection = defaultCourse?.sections[0];
  const courseId = context?.currentCourseId || defaultCourse?.id;
  const sectionId = context?.currentSectionId || defaultSection?.id;

  const processTextInput = async (text) => {
    setTranscript(text);
    setStatus('processing');
    setError('');
    setResult(null);

    try {
      const course = getCourseById(teacherData, courseId);
      const aiContext = {
        courses: teacherData.courses,
        currentCourseId: courseId,
        currentSectionId: sectionId
      };

      const parsed = await parseVoiceTranscript(text, aiContext);
      debugLog('Parsed result:', parsed);

      // Handle batch updates (multiple operations)
      if (parsed.action === 'batch_update' && parsed.updates && Array.isArray(parsed.updates)) {
        debugLog('Processing batch update with', parsed.updates.length, 'operations');
        
        const section = course?.sections.find(s => s.id === sectionId);
        const syllabus = getSyllabusByRef(course?.syllabusRef);

        if (!section || !syllabus) {
          setStatus('error');
          setError('Could not find section or syllabus data.');
          return;
        }

        const statusMap = {
          'mark_complete': 'done',
          'mark_ongoing': 'ongoing',
          'mark_pending': 'not-started'
        };

        const results = [];
        
        // Process each operation
        for (const operation of parsed.updates) {
          if (operation.action === 'unclear' || 
              typeof operation.chapterIndex !== 'number' || 
              typeof operation.topicIndex !== 'number') {
            continue; // Skip unclear operations
          }

          // Update progress - ensure chapter exists
          if (!section.progress[operation.chapterIndex]) {
            section.progress[operation.chapterIndex] = { topics: {} };
          }

          // Get existing topic progress or create new one
          const existingTopic = section.progress[operation.chapterIndex].topics[operation.topicIndex] || {};
          const newStatus = statusMap[operation.action];

          // Create updated topic progress object
          const updatedTopic = {
            status: newStatus,
            currentPage: operation.currentPage !== undefined ? operation.currentPage : existingTopic.currentPage,
            notes: operation.notes !== undefined ? operation.notes : existingTopic.notes,
            startedAt: existingTopic.startedAt || (newStatus !== 'not-started' ? new Date().toISOString() : null),
            completedAt: newStatus === 'done' ? new Date().toISOString() : existingTopic.completedAt,
            lastCoveredAt: new Date().toISOString()
          };

          // Store the complete object
          section.progress[operation.chapterIndex].topics[operation.topicIndex] = updatedTopic;

          // Get chapter and topic names for result
          const chapter = syllabus.chapters.find(ch => ch.index === operation.chapterIndex);
          const topic = chapter?.subTopics?.find(t => t.index === operation.topicIndex);

          results.push({
            action: operation.action,
            chapter: chapter?.title || `Chapter ${operation.chapterIndex}`,
            topic: topic?.title || `Topic ${operation.topicIndex}`,
            status: newStatus,
            currentPage: updatedTopic.currentPage,
            notes: updatedTopic.notes
          });
        }

        persistProgress(sectionId, section.progress);

        // Set result as batch
        const batchResult = {
          action: 'batch_update',
          count: results.length,
          updates: results
        };
        
        setResult(batchResult);
        setStatus('success');

        // Notify parent with batch result
        if (onProgressUpdate) {
          onProgressUpdate(batchResult);
        }
        emitEvent('progress:updated', batchResult);
        
        // Emit window event for page listeners
        window.dispatchEvent(new CustomEvent('syllabus-progress-updated', { 
          detail: { classId: sectionId } 
        }));
        
        return;
      }

      // Handle single operation (original code)
      // Validate parsing result
      if (
        parsed.action === 'unclear' ||
        typeof parsed.chapterIndex !== 'number' ||
        typeof parsed.topicIndex !== 'number'
      ) {
        setStatus('error');
        setError('Could not understand the command. Try: "Mark Chapter 2 Topic 1 complete"');
        return;
      }

      // Get section and syllabus
      const section = course?.sections.find(s => s.id === sectionId);
      const syllabus = getSyllabusByRef(course?.syllabusRef);

      if (!section || !syllabus) {
        setStatus('error');
        setError('Could not find section or syllabus data.');
        return;
      }

      // Update progress
      if (!section.progress[parsed.chapterIndex]) {
        section.progress[parsed.chapterIndex] = { topics: {} };
      }

      const statusMap = {
        'mark_complete': 'done',
        'mark_ongoing': 'ongoing',
        'mark_pending': 'not-started'
      };

      // Get existing topic progress or create new one
      const existingTopic = section.progress[parsed.chapterIndex].topics[parsed.topicIndex] || {};
      const newStatus = statusMap[parsed.action];

      // Create updated topic progress object with all fields
      const updatedTopic = {
        status: newStatus,
        currentPage: parsed.currentPage !== undefined ? parsed.currentPage : existingTopic.currentPage,
        notes: parsed.notes !== undefined ? parsed.notes : existingTopic.notes,
        startedAt: existingTopic.startedAt || (newStatus !== 'not-started' ? new Date().toISOString() : null),
        completedAt: newStatus === 'done' ? new Date().toISOString() : existingTopic.completedAt,
        lastCoveredAt: new Date().toISOString()
      };

      // Store the complete object
      section.progress[parsed.chapterIndex].topics[parsed.topicIndex] = updatedTopic;
      persistProgress(sectionId, section.progress);

      // Get chapter and topic names
      const chapter = syllabus.chapters.find(ch => ch.index === parsed.chapterIndex);
      const topic = chapter?.subTopics?.find(t => t.index === parsed.topicIndex);

      const updateResult = {
        action: parsed.action,
        chapter: chapter?.title || `Chapter ${parsed.chapterIndex}`,
        topic: topic?.title || `Topic ${parsed.topicIndex}`,
        status: newStatus,
        currentPage: updatedTopic.currentPage,
        notes: updatedTopic.notes
      };

      setResult(updateResult);
      setStatus('success');

      // Notify parent and emit event
      if (onProgressUpdate) {
        onProgressUpdate(updateResult);
      }
      emitEvent('progress:updated', updateResult);
      
      // Emit window event for page listeners
      window.dispatchEvent(new CustomEvent('syllabus-progress-updated', { 
        detail: { classId: sectionId } 
      }));

    } catch (err) {
      console.error('Voice processing error:', err);
      setStatus('error');
      setError(err.message || 'Failed to process input. Please try again.');
    }
  };

  const handleStartRecording = async () => {
    if (!isSpeechRecognitionSupported()) {
      setStatus('error');
      setError('Voice recognition is not supported in your browser. Please use text input.');
      return;
    }

    setIsRecording(true);
    setStatus('listening');
    setTranscript('');
    setError('');
    setResult(null);

    try {
      const { transcript: text } = await recordAndTranscribe({
        onProgress: (progress) => {
          if (progress.status === 'transcribing') {
            setStatus('processing');
          }
        }
      });

      setTranscript(text);
      await processTextInput(text);
    } catch (err) {
      console.error('Voice recording error:', err);
      setStatus('error');
      setError(err.message || 'Failed to record voice. Please try again.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setTranscript('');
    setResult(null);
    setError('');
    setTypedText('');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
          <Volume2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-black-800">Voice Progress Logger</h3>
          <p className="text-sm text-black-500">Update syllabus progress with voice</p>
        </div>
      </div>

      {/* Current Context */}
      <div className="p-3 bg-black-50 rounded-lg">
        <p className="text-xs text-black-500 mb-1">Current Class:</p>
        <p className="text-sm font-medium text-black-800">
          Section {sectionId} • {(() => {
            const course = getCourseById(teacherData, courseId);
            const syllabus = course ? getSyllabusByRef(course.syllabusRef) : null;
            return syllabus?.subject || course?.title || 'Unknown';
          })()}
        </p>
      </div>

      {/* Voice Button */}
      <div className="flex flex-col items-center py-6">
        <motion.button
          onClick={isRecording ? handleReset : handleStartRecording}
          disabled={status === 'processing'}
          whileTap={{ scale: 0.95 }}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center transition-all
            ${isRecording 
              ? 'bg-red-500 shadow-lg shadow-red-200' 
              : status === 'processing'
                ? 'bg-yellow-500 shadow-lg shadow-yellow-200'
                : 'bg-indigo-600 shadow-lg shadow-indigo-200 hover:bg-indigo-700'
            }
            disabled:opacity-50
          `}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {status === 'processing' ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </motion.button>
        <p className="text-sm text-black-600 mt-3">
          {status === 'listening' ? 'Listening...' : status === 'processing' ? 'Processing...' : 'Tap to speak'}
        </p>
      </div>

      {/* Status Display */}
      <AnimatePresence>
        <VoiceProgressStatus
          status={status}
          transcript={transcript}
          result={result}
          error={error}
          onReset={handleReset}
        />
      </AnimatePresence>

      {/* Text Input Fallback */}
      <div className="p-3 bg-black-50 rounded-lg">
        <label className="block text-xs text-black-600 mb-2">Or type your update:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="e.g., Finished Chapter 2, Topic 1"
            className="flex-1 px-3 py-2 text-sm border border-black-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && typedText.trim()) {
                processTextInput(typedText.trim());
              }
            }}
          />
          <button
            onClick={() => typedText.trim() && processTextInput(typedText.trim())}
            disabled={!typedText.trim() || status === 'processing'}
            className="px-4 py-2 bg-black-800 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-black-700"
          >
            Update
          </button>
        </div>
      </div>

      {/* Instructions */}
      {status === 'idle' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-medium text-blue-800 mb-2">💡 Example commands:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• "I finished Chapter 2, Topic 1"</li>
            <li>• "Mark Chapter 3 Topic 2 ongoing"</li>
            <li>• "Started working on Landforms"</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Voice Progress Controls Component
 * Compact controls rendered in chat input area
 */
function VoiceProgressControls({ context, onMessage, onStart, onStop }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartRecording = async () => {
    if (!isSpeechRecognitionSupported()) {
      onMessage?.({
        type: 'error',
        content: 'Voice recognition is not supported in your browser.'
      });
      return;
    }

    // Notify parent (PersistentChatBar) that recording started so UI can expand
    try { onStart?.(); } catch (e) { /* ignore */ }

    setIsRecording(true);

    try {
      const { transcript } = await recordAndTranscribe({
        onProgress: (progress) => {
          if (progress.status === 'transcribing') {
            setIsProcessing(true);
          }
        }
      });

      setIsRecording(false);
      setIsProcessing(true);

      // Process through AI context - use first available course/section as fallback
      const defaultCourse = teacherData.courses[0];
      const defaultSection = defaultCourse?.sections[0];
      const aiContext = {
        courses: teacherData.courses,
        currentCourseId: context?.currentCourseId || defaultCourse?.id,
        currentSectionId: context?.currentSectionId || defaultSection?.id
      };

      const parsed = await parseVoiceTranscript(transcript, aiContext);
      
      if (parsed.action !== 'unclear' && parsed.chapterIndex && parsed.topicIndex) {
        // Update progress
        const courseId = parsed.courseId || aiContext.currentCourseId;
        const sectionId = parsed.sectionId || aiContext.currentSectionId;
        const course = getCourseById(teacherData, courseId);
        const section = course?.sections.find(s => s.id === sectionId);
        const syllabus = getSyllabusByRef(course?.syllabusRef);

        if (section && syllabus) {
          if (!section.progress[parsed.chapterIndex]) {
            section.progress[parsed.chapterIndex] = { topics: {} };
          }

          const statusMap = {
            'mark_complete': 'done',
            'mark_ongoing': 'ongoing',
            'mark_pending': 'not-started'
          };

          section.progress[parsed.chapterIndex].topics[parsed.topicIndex] = statusMap[parsed.action];
          persistProgress(sectionId, section.progress);

          const chapter = syllabus.chapters.find(ch => ch.index === parsed.chapterIndex);
          const topic = chapter?.subTopics?.find(t => t.index === parsed.topicIndex);

          onMessage?.({
            type: 'success',
            content: `✅ Updated: ${chapter?.title || 'Chapter ' + parsed.chapterIndex} → ${topic?.title || 'Topic ' + parsed.topicIndex} marked as ${statusMap[parsed.action]}`
          });
        }
      } else {
        onMessage?.({
          type: 'clarify',
          content: `I heard: "${transcript}"\n\nI couldn't determine the chapter/topic. Try: "Mark Chapter 2 Topic 1 complete"`
        });
      }
    } catch (err) {
      console.error('Voice recording error:', err);
      onMessage?.({
        type: 'error',
        content: 'Failed to process voice input: ' + (err.message || 'Unknown error')
      });
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
      try { onStop?.(); } catch (e) { /* ignore */ }
    }
  };

  return (
    <VoiceRecordButton
      isRecording={isRecording}
      isProcessing={isProcessing}
      onStartRecording={handleStartRecording}
      onStopRecording={() => setIsRecording(false)}
      disabled={false}
    />
  );
}

// ============================================
// Plugin Definition and Registration
// ============================================

/**
 * Voice Progress Logger Plugin
 */
const VoiceProgressLoggerPlugin = {
  id: 'voice-progress-logger',
  name: 'Voice Progress',
  description: 'Update syllabus progress using voice commands',
  priority: 10,
  enabled: true,

  /**
   * Initialize plugin with chat API
   * @param {Object} api - Chat API instance
   */
  init(api) {
    debugLog('Initializing Voice Progress Logger plugin');
    
    // Subscribe to message events if needed
    if (api?.subscribe) {
      api.subscribe('message:sent', (message) => {
        // Check if message is a progress update command
        const lower = (message.content || '').toLowerCase();
        if (
          lower.includes('finished') ||
          lower.includes('completed') ||
          lower.includes('chapter') ||
          lower.includes('topic') ||
          lower.includes('mark')
        ) {
          debugLog('Detected potential progress update:', message.content);
        }
      });
    }
  },

  /**
   * Process incoming messages for progress update intents
   * @param {Object} message - Message object
   * @param {Object} context - Current context
   * @returns {Promise<Object|null>} - Response or null
   */
  async onMessage(message, context) {
    const content = (message.content || '').toLowerCase();
    
    // Check for progress update keywords - now also matches natural language
    const hasActionWord = 
      content.includes('finished') || 
      content.includes('completed') || 
      content.includes('done') ||
      content.includes('not done') ||
      content.includes('hasn\'t') ||
      content.includes('has not') ||
      content.includes('undo') ||
      content.includes('started') ||
      content.includes('working') ||
      content.includes('mark');

    // Build dynamic section pattern from teacherData
    const allSectionIds = teacherData.courses.flatMap(c => c.sections.map(s => s.id));
    const sectionPattern = new RegExp(`\\b(${allSectionIds.join('|')}|section)\\b`, 'i');
    const hasClassMention = sectionPattern.test(content);
    
    // Build dynamic topic keywords from all syllabi (include shorter words too)
    const allTopicWords = new Set(['chapter', 'topic']);
    teacherData.courses.forEach(course => {
      const syllabus = getSyllabusByRef(course.syllabusRef);
      if (syllabus?.chapters) {
        syllabus.chapters.forEach(ch => {
          // Add chapter title words (3+ chars)
          ch.title.toLowerCase().split(/\s+/).forEach(w => w.length >= 3 && allTopicWords.add(w));
          // Add topic title words (3+ chars)
          (ch.subTopics || []).forEach(t => {
            t.title.toLowerCase().split(/\s+/).forEach(w => w.length >= 3 && allTopicWords.add(w));
          });
        });
      }
    });
    
    // Also add common speech-to-text variants that might match syllabus topics
    const speechVariants = {
      'deformers': 'reformers', 'deformer': 'reformer',
      'planes': 'plains', 'colonilism': 'colonialism'
    };
    Object.keys(speechVariants).forEach(variant => allTopicWords.add(variant));
    
    const hasTopicReference = Array.from(allTopicWords).some(word => content.includes(word));
    
    // Also trigger if user mentions a subject name (history, geography, etc.)
    const hasSubjectMention = /\b(history|geography|science|math|english)\b/i.test(content);

    // Trigger on action + (topic reference OR class mention OR subject mention)
    if (hasActionWord && (hasTopicReference || hasClassMention || hasSubjectMention)) {
      try {
        // Extract context from URL if available
        const urlContext = getContextFromURL();
        
        // Build AI context - use URL context, then passed context, then null (ask for clarification)
        const aiContext = {
          courses: teacherData.courses,
          currentCourseId: urlContext.courseId || context?.currentCourseId || null,
          currentSectionId: urlContext.sectionId || context?.currentSectionId || null,
          urlContext // Pass for reference
        };

        const parsed = await parseVoiceTranscript(message.content, aiContext);
        debugLog('Parsed voice command:', parsed);

        // Check confidence and section availability
        const hasSectionInMessage = allSectionIds.some(s => content.toUpperCase().includes(s));
        const hasValidSection = parsed.sectionId && allSectionIds.includes(parsed.sectionId.toUpperCase());
        const hasURLSection = urlContext.sectionId != null;
        const isLowConfidence = parsed.confidence === 'low' || parsed.confidence === 'medium';

        // Handle batch updates (multiple topics in one command)
        if (parsed.action === 'batch_update' && parsed.updates && parsed.updates.length > 0) {
          debugLog('Processing batch update:', parsed.updates.length, 'topics');
          
          const statusMap = {
            'mark_complete': 'done',
            'mark_ongoing': 'ongoing',
            'mark_pending': 'not-started'
          };
          
          const results = [];
          
          for (const update of parsed.updates) {
            const courseId = update.courseId || aiContext.currentCourseId;
            const sectionId = update.sectionId || urlContext.sectionId || aiContext.currentSectionId;
            const course = getCourseById(teacherData, courseId);
            const section = course?.sections.find(s => s.id.toUpperCase() === sectionId?.toUpperCase());
            const syllabus = getSyllabusByRef(course?.syllabusRef);
            
            if (section && syllabus) {
              if (!section.progress[update.chapterIndex]) {
                section.progress[update.chapterIndex] = { topics: {} };
              }
              
              // Get existing topic progress
              const existingTopic = section.progress[update.chapterIndex].topics[update.topicIndex] || {};
              const existingData = typeof existingTopic === 'object' ? existingTopic : { status: existingTopic };
              const newStatus = statusMap[update.action];
              
              // Create updated topic progress object with notes and currentPage
              const updatedTopic = {
                status: newStatus,
                currentPage: update.currentPage !== undefined ? update.currentPage : existingData.currentPage,
                notes: update.notes !== undefined ? update.notes : existingData.notes,
                startedAt: existingData.startedAt || (newStatus !== 'not-started' ? new Date().toISOString() : null),
                completedAt: newStatus === 'done' ? new Date().toISOString() : existingData.completedAt,
                lastCoveredAt: new Date().toISOString()
              };
              
              section.progress[update.chapterIndex].topics[update.topicIndex] = updatedTopic;
              persistProgress(section.id, section.progress);
              
              const chapter = syllabus.chapters.find(ch => ch.index === update.chapterIndex);
              const topic = chapter?.subTopics?.find(t => t.index === update.topicIndex);
              
              results.push({
                topic: topic?.title || update.matchedTopic || `Topic ${update.topicIndex}`,
                status: statusMap[update.action].toUpperCase(),
                chapter: chapter?.title || update.matchedChapter,
                currentPage: updatedTopic.currentPage,
                notes: updatedTopic.notes
              });
            }
          }
          
          if (results.length > 0) {
            // Build detailed update lines
            const updateLines = results.map(r => {
              let line = `• **${r.topic}** → ${r.status}`;
              if (r.currentPage) line += ` (page ${r.currentPage})`;
              if (r.notes) line += `\n  _"${r.notes}"_`;
              return line;
            }).join('\n');
            
            // Emit window event for page listeners to refresh UI
            const lastUpdate = parsed.updates[parsed.updates.length - 1];
            const sectionId = lastUpdate.sectionId || urlContext.sectionId || aiContext.currentSectionId;
            window.dispatchEvent(new CustomEvent('syllabus-progress-updated', { 
              detail: { classId: sectionId } 
            }));
            
            // Find next topic to suggest
            const courseId = lastUpdate.courseId || aiContext.currentCourseId;
            const course = getCourseById(teacherData, courseId);
            const syllabus = getSyllabusByRef(course?.syllabusRef);
            
            let nextTopicSuggestion = '';
            if (syllabus) {
              // Find the next topic after the last updated one
              const lastChapter = syllabus.chapters.find(ch => ch.index === lastUpdate.chapterIndex);
              if (lastChapter && lastChapter.subTopics) {
                const nextTopicInChapter = lastChapter.subTopics.find(t => t.index > lastUpdate.topicIndex);
                if (nextTopicInChapter) {
                  nextTopicSuggestion = `\n\n📚 **Next up:** ${nextTopicInChapter.title} (pages ${nextTopicInChapter.pageFrom}-${nextTopicInChapter.pageTo})`;
                } else {
                  // Check next chapter
                  const nextChapter = syllabus.chapters.find(ch => ch.index > lastUpdate.chapterIndex);
                  if (nextChapter && nextChapter.subTopics?.[0]) {
                    nextTopicSuggestion = `\n\n📚 **Next chapter:** ${nextChapter.title}\n   Start with: ${nextChapter.subTopics[0].title}`;
                  }
                }
              }
            }
            
            return {
              handled: true,
              response: `✅ **Batch Progress Updated!**\n\n${updateLines}\n\n*${results.length} topic(s) updated*${nextTopicSuggestion}`
            };
          }
        }

        if (parsed.action !== 'unclear' && parsed.chapterIndex && parsed.topicIndex) {
          // If no section specified and not from URL, ask for clarification
          if (!hasValidSection && !hasSectionInMessage && !hasURLSection) {
            // Find which courses have this topic
            const course = getCourseById(teacherData, parsed.courseId);
            const availableSections = course?.sections?.map(s => s.id) || allSectionIds;
            
            return {
              handled: true,
              response: `🤔 I found "**${parsed.matchedTopic || 'the topic'}**" in **${course?.title || 'the syllabus'}**.\n\n` +
                        `Which section should I update?\n` +
                        `Available: ${availableSections.join(', ')}\n\n` +
                        `*Just reply with the section name (e.g., "8B")*`,
              // Store pending action for clarification flow
              pendingAction: {
                type: 'progress_update',
                parsed,
                matchedTopic: parsed.matchedTopic,
                matchedChapter: parsed.matchedChapter,
                matchedCourse: course?.title
              }
            };
          }
          
          // If low confidence but we have a section, warn but proceed
          if (isLowConfidence && hasValidSection) {
            debugLog('Low confidence but proceeding with section:', parsed.sectionId);
          }

          // Process the update
          const courseId = parsed.courseId || aiContext.currentCourseId;
          const sectionId = parsed.sectionId || urlContext.sectionId || aiContext.currentSectionId;
          const course = getCourseById(teacherData, courseId);
          const section = course?.sections.find(s => s.id.toUpperCase() === sectionId?.toUpperCase());
          const syllabus = getSyllabusByRef(course?.syllabusRef);

          if (section && syllabus) {
            if (!section.progress[parsed.chapterIndex]) {
              section.progress[parsed.chapterIndex] = { topics: {} };
            }

            const statusMap = {
              'mark_complete': 'done',
              'mark_ongoing': 'ongoing',
              'mark_pending': 'not-started'
            };

            section.progress[parsed.chapterIndex].topics[parsed.topicIndex] = statusMap[parsed.action];
            persistProgress(section.id, section.progress);

            const chapter = syllabus.chapters.find(ch => ch.index === parsed.chapterIndex);
            const topic = chapter?.subTopics?.find(t => t.index === parsed.topicIndex);

            return {
              handled: true,
              response: `✅ **Progress Updated!**\n\n**${chapter?.title || 'Chapter ' + parsed.chapterIndex}** → **${topic?.title || 'Topic ' + parsed.topicIndex}**\n\nStatus: ${statusMap[parsed.action].toUpperCase()}\nSection: ${section.id}`
            };
          } else {
            // Course/section mismatch - the topic might be from a different course than the section
            const topicCourse = getCourseById(teacherData, parsed.courseId);
            const availableSections = topicCourse?.sections?.map(s => s.id).join(', ') || 'none';
            
            return {
              handled: true,
              response: `⚠️ "${parsed.matchedTopic || 'That topic'}" is from **${topicCourse?.title || 'a different course'}**.\n\n` +
                        `Available sections for this subject: ${availableSections}\n\n` +
                        `*Which section do you want to update?*`,
              pendingAction: {
                type: 'progress_update',
                parsed: { ...parsed, courseId: topicCourse?.id },
                matchedTopic: parsed.matchedTopic,
                matchedChapter: parsed.matchedChapter,
                matchedCourse: topicCourse?.title
              }
            };
          }
        } else {
          // Couldn't parse - provide helpful feedback with dynamic examples
          const exampleSection = urlContext.sectionId || teacherData.courses[0]?.sections[0]?.id || 'your section';
          const exampleSyllabus = getSyllabusByRef(teacherData.courses[0]?.syllabusRef);
          const exampleTopic = exampleSyllabus?.chapters?.[0]?.subTopics?.[0]?.title || 'a topic';
          
          return {
            handled: true,
            response: `🤔 I understood you want to update progress, but I couldn't match the topic.\n\n**Try saying:**\n• "Finished Chapter 2, Topic 1 in ${exampleSection}"\n• "Mark ${exampleTopic} complete in 8B"\n• "Done with Industrial Revolution in 8A History"`
          };
        }
      } catch (err) {
        debugLog('Error processing progress update:', err);
      }
    }

    return null;
  },

  /**
   * Extract context from current page URL
   * @returns {{ courseId: string|null, sectionId: string|null, courseName: string|null }}
   */
  getContextFromURL() {
    if (typeof window === 'undefined') return { courseId: null, sectionId: null, courseName: null };
    
    const pathname = window.location.pathname;
    
    // Match patterns like /course/hist8/class/8A or /course/geo6/section/6A
    const courseMatch = pathname.match(/\/course\/([a-zA-Z0-9]+)/i);
    const classMatch = pathname.match(/\/(class|section)\/([a-zA-Z0-9]+)/i);
    
    const courseId = courseMatch ? courseMatch[1] : null;
    const sectionId = classMatch ? classMatch[2].toUpperCase() : null;
    
    // Validate against actual data
    const validCourse = courseId ? teacherData.courses.find(c => c.id === courseId) : null;
    const validSection = sectionId && validCourse 
      ? validCourse.sections.find(s => s.id.toUpperCase() === sectionId.toUpperCase())
      : null;
    
    return {
      courseId: validCourse?.id || null,
      sectionId: validSection?.id || null,
      courseName: validCourse?.title || null
    };
  },

  /**
   * Render voice controls in chat input area
   * @param {Object} props - Component props
   * @returns {JSX.Element|null}
   */
  renderControls(props) {
    return <VoiceProgressControls {...props} />;
  },

  /**
   * Render full panel in tools tab (alias for renderExpandedPanel)
   * DISABLED: Voice input is now integrated directly in chat input
   * @param {Object} props - Component props
   * @returns {null}
   */
  renderPanel(props) {
    return null; // Voice panel disabled - use voice in chat input instead
  },

  /**
   * Render full panel in voice tab (used by chat bars)
   * DISABLED: Voice input is now integrated directly in chat input
   * @param {Object} props - Component props
   * @returns {null}
   */
  renderExpandedPanel(props) {
    return null; // Voice panel disabled - use voice in chat input instead
  },

  /**
   * Cleanup when plugin is destroyed
   */
  destroy() {
    debugLog('Destroying Voice Progress Logger plugin');
  }
};

// Helper function for URL context extraction (standalone for use in onMessage)
function getContextFromURL() {
  if (typeof window === 'undefined') return { courseId: null, sectionId: null, courseName: null };
  
  const pathname = window.location.pathname;
  
  // Match patterns like /course/hist8/class/8A or /course/geo6/section/6A
  const courseMatch = pathname.match(/\/course\/([a-zA-Z0-9]+)/i);
  const classMatch = pathname.match(/\/(class|section)\/([a-zA-Z0-9]+)/i);
  
  const courseId = courseMatch ? courseMatch[1] : null;
  const sectionId = classMatch ? classMatch[2].toUpperCase() : null;
  
  // Validate against actual data
  const validCourse = courseId ? teacherData.courses.find(c => c.id === courseId) : null;
  const validSection = sectionId && validCourse 
    ? validCourse.sections.find(s => s.id.toUpperCase() === sectionId.toUpperCase())
    : null;
  
  return {
    courseId: validCourse?.id || null,
    sectionId: validSection?.id || null,
    courseName: validCourse?.title || null
  };
}

// Register the plugin
registerChatPlugin(VoiceProgressLoggerPlugin);

// Export for direct import
export default VoiceProgressLoggerPlugin;
export { VoiceRecordButton, VoiceProgressPanel, VoiceProgressControls };
