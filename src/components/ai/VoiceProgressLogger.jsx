import React, { useState } from 'react';
import { Mic, MicOff, Loader2, Check, X } from 'lucide-react';
import { recordAndTranscribe } from '../../services/voiceService';
import { parseVoiceTranscript } from '../../services/aiService';
import { persistProgress, teacherData, getSyllabusByRef, getCourseById } from '../../data/dummyData';

/**
 * Voice Progress Logger Component
 * 
 * Allows teachers to update syllabus progress via voice input
 * Usage: <VoiceProgressLogger courseId="geo6" sectionId="6A" onUpdate={callback} />
 */
export default function VoiceProgressLogger({ courseId, sectionId, onUpdate }) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | listening | processing | success | error
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [typedText, setTypedText] = useState('');

  const processTextInput = async (text) => {
    setTranscript(text);
    setStatus('processing');
    setError('');
    setResult(null);

    try {
      const course = getCourseById(teacherData, courseId);
      const context = {
        courses: teacherData.courses,
        currentCourseId: courseId,
        currentSectionId: sectionId
      };

      let parsed = await parseVoiceTranscript(text, context);

      console.log('Parsed result:', parsed);

      // Re-validate after parsing
      const stillMissing = typeof parsed.chapterIndex !== 'number' || typeof parsed.topicIndex !== 'number' || !isFinite(parsed.chapterIndex) || !isFinite(parsed.topicIndex);
      if (stillMissing || parsed.action === 'unclear') {
        setStatus('error');
        setError('Could not understand the command. Please try again or refine your text.');
        return;
      }

      const effectiveCourseId = parsed.courseId || courseId;
      const effectiveSectionId = parsed.sectionId || sectionId;
      if ((parsed.courseId && parsed.courseId !== courseId) || (parsed.sectionId && parsed.sectionId !== sectionId)) {
        setStatus('error');
        setError(`Detected different class (${parsed.sectionId || 'unknown'}). Current class: ${sectionId}`);
        return;
      }

      const section = course.sections.find(s => s.id === effectiveSectionId);
      const syllabus = getSyllabusByRef(course.syllabusRef);

      if (!section || !syllabus) {
        setStatus('error');
        setError('Could not find section or syllabus data.');
        return;
      }

      if (!section.progress[parsed.chapterIndex]) {
        section.progress[parsed.chapterIndex] = { topics: {} };
      }

      const statusMap = {
        'mark_complete': 'done',
        'mark_ongoing': 'ongoing',
        'mark_pending': 'not-started'
      };

      section.progress[parsed.chapterIndex].topics[parsed.topicIndex] = statusMap[parsed.action];
      persistProgress(effectiveSectionId, section.progress);

      const chapter = syllabus.chapters.find(ch => ch.index === parsed.chapterIndex);
      const topic = chapter?.subTopics?.find(t => t.index === parsed.topicIndex);

      setResult({
        action: parsed.action,
        chapter: chapter?.title || 'Unknown Chapter',
        topic: topic?.title || 'Unknown Topic',
        status: statusMap[parsed.action]
      });

      setStatus('success');

      if (onUpdate) {
        onUpdate({
          chapterIndex: parsed.chapterIndex,
          topicIndex: parsed.topicIndex,
          status: statusMap[parsed.action]
        });
      }

    } catch (err) {
      console.error('Text processing error:', err);
      setStatus('error');
      setError(err.message || 'Failed to process input. Please try again.');
    }
  };

  const handleStartRecording = async () => {
    setIsRecording(true);
    setStatus('listening');
    setTranscript('');
    setError('');
    setResult(null);

    try {
      // Record and transcribe
      const { transcript: text, confidence } = await recordAndTranscribe({
        onProgress: (progress) => {
          if (progress.status === 'transcribing') {
            setStatus('processing');
          }
        }
      });

      setTranscript(text);
      await processTextInput(text);

    } catch (err) {
      console.error('Voice logging error:', err);
      setStatus('error');
      setError(err.message || 'Failed to process voice input. Please try again.');
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
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Voice Progress Logger</h3>
        
        {status === 'idle' && (
          <button
            onClick={handleStartRecording}
            disabled={isRecording}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Mic className="w-4 h-4" />
            <span className="text-sm font-medium">Start Recording</span>
          </button>
        )}

        {status === 'listening' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg animate-pulse">
            <Mic className="w-4 h-4" />
            <span className="text-sm font-medium">Listening...</span>
          </div>
        )}

        {status === 'processing' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Processing...</span>
          </div>
        )}

        {status === 'success' && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Success! Record Again</span>
          </button>
        )}

        {status === 'error' && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="text-sm font-medium">Try Again</span>
          </button>
        )}
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">You said:</p>
          <p className="text-sm text-gray-900 italic">"{transcript}"</p>
        </div>
      )}

      {/* Typed Input Fallback */}
      {(status === 'idle' || status === 'error' || status === 'success') && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <label className="block text-xs text-gray-600 mb-1">Or type your update:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="e.g., Finished Chapter 2, Topic 1 in 6A"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={() => typedText.trim() && processTextInput(typedText.trim())}
              disabled={!typedText.trim()}
              className="px-3 py-2 text-sm bg-gray-800 text-white rounded-md disabled:opacity-50"
            >
              Update
            </button>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Try: "I finished Chapter 2 Topic 1" or "Mark Chapter 3 Topic 2 ongoing"</p>
        </div>
      )}

      {/* Success Result */}
      {status === 'success' && result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900 mb-1">Progress Updated!</p>
              <p className="text-sm text-green-700">
                Marked <strong>{result.chapter}</strong> → <strong>{result.topic}</strong> as{' '}
                <span className="px-2 py-0.5 bg-green-200 rounded text-xs font-medium">
                  {result.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {status === 'error' && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900 mb-1">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {status === 'idle' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900 font-medium mb-2">💡 How to use:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Click "Start Recording" and speak clearly</li>
            <li>• Say: "I finished Chapter 2, Topic 1"</li>
            <li>• Or: "I'm working on Chapter 3, Topic 2"</li>
            <li>• System will automatically update progress</li>
          </ul>
        </div>
      )}
    </div>
  );
}
