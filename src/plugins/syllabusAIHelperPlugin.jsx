/**
 * Syllabus AI Helper Plugin
 * 
 * Wired-in by plugin integration pass ─ user asked to keep files intact.
 * 
 * Integrates SyllabusAIHelper functionality into the chat interface.
 * Provides AI-powered tools for quiz generation, assignment creation,
 * and topic suggestions directly from the chatbox.
 * 
 * Features:
 * - Quick action buttons in chat composer
 * - Quiz generation with customizable options
 * - Assignment creation with rubrics
 * - Smart topic suggestions based on progress
 * - Integration with existing syllabus data
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Loader2, 
  FileText, 
  ClipboardList, 
  Lightbulb,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  Download,
  X
} from 'lucide-react';
import { registerChatPlugin, emitEvent } from './chat-plugins';
import { generateQuiz, generateAssignment, suggestNextTopic } from '../services/aiService';
import { teacherData, getSyllabusByRef, getCourseById } from '../data/dummyData';

// Debug flag
const DEBUG = import.meta.env.VITE_DEBUG_PLUGINS === 'true';
const debugLog = (...args) => DEBUG && console.log('[SyllabusAIPlugin]', ...args);

/**
 * Quick Action Button Component
 * Small buttons shown in chat input area
 */
function QuickActionButton({ icon: Icon, label, onClick, active, disabled }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        transition-all border
        ${active 
          ? 'bg-purple-100 text-purple-700 border-purple-300' 
          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      aria-label={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

/**
 * Quiz Result Display Component
 */
function QuizResultDisplay({ questions, onClose, onSave }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopy = (question, idx) => {
    const text = `${idx + 1}. ${question.question}\n` +
      Object.entries(question.options).map(([k, v]) => `   ${k}. ${v}`).join('\n') +
      `\n   Answer: ${question.correctAnswer}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-purple-600" />
          Generated Quiz ({questions.length} questions)
        </h4>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {questions.map((q, idx) => (
          <div 
            key={idx} 
            className="p-3 bg-white rounded-lg border border-neutral-200 hover:border-purple-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-neutral-800">
                {idx + 1}. {q.question}
              </p>
              <button
                onClick={() => handleCopy(q, idx)}
                className="p-1 text-neutral-400 hover:text-purple-600 flex-shrink-0"
                aria-label="Copy question"
              >
                {copiedIndex === idx ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {Object.entries(q.options).map(([key, value]) => (
                <div
                  key={key}
                  className={`text-xs px-2 py-1 rounded ${
                    key === q.correctAnswer
                      ? 'bg-green-100 text-green-800 font-medium'
                      : 'bg-neutral-50 text-neutral-600'
                  }`}
                >
                  {key}. {value}
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2 italic">
              ðŸ’¡ {q.explanation}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          <Download className="w-4 h-4" />
          Save as Assignment
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Assignment Result Display Component
 */
function AssignmentResultDisplay({ assignment, onClose, onCreate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" />
          {assignment.title}
        </h4>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        <div className="p-3 bg-white rounded-lg border border-neutral-200">
          <p className="text-xs text-neutral-500 mb-1">Description</p>
          <p className="text-sm text-neutral-800">{assignment.description}</p>
        </div>

        <div className="p-3 bg-white rounded-lg border border-neutral-200">
          <p className="text-xs text-neutral-500 mb-1">Instructions</p>
          <p className="text-sm text-neutral-700 whitespace-pre-line">{assignment.instructions}</p>
        </div>

        <div className="p-3 bg-white rounded-lg border border-neutral-200">
          <p className="text-xs text-neutral-500 mb-2">Rubric</p>
          <div className="space-y-2">
            {assignment.rubric?.map((r, idx) => (
              <div key={idx} className="flex justify-between items-start p-2 bg-neutral-50 rounded">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{r.criterion}</p>
                  <p className="text-xs text-neutral-500">{r.description}</p>
                </div>
                <span className="text-sm font-semibold text-purple-600">{r.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 text-xs text-neutral-600 p-2 bg-neutral-50 rounded-lg">
          <span>â±ï¸ Est. Time: {assignment.estimatedTime}</span>
          <span>ðŸ“… Due in: {assignment.dueInDays} days</span>
        </div>
      </div>

      <button
        onClick={onCreate}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
      >
        <Check className="w-4 h-4" />
        Create Assignment
      </button>
    </motion.div>
  );
}

/**
 * Topic Suggestion Display Component
 */
function TopicSuggestionDisplay({ suggestion, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          Next Topic Suggestion
        </h4>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
        <p className="text-lg font-semibold text-neutral-800 mb-1">
          {suggestion.suggestedTopic}
        </p>
        <p className="text-sm text-neutral-700">{suggestion.reasoning}</p>
      </div>

      <div className="p-3 bg-white rounded-lg border border-neutral-200">
        <p className="text-xs text-neutral-500 mb-2">Preparation Tips</p>
        <ul className="space-y-1">
          {suggestion.preparationTips?.map((tip, idx) => (
            <li key={idx} className="text-sm text-neutral-700 flex items-start gap-2">
              <span className="text-yellow-500">–</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-sm text-neutral-600 p-2 bg-neutral-50 rounded-lg">
        â±ï¸ Estimated: {suggestion.estimatedHours || 2} hours
      </div>
    </motion.div>
  );
}

/**
 * Syllabus AI Panel Component
 * Full panel shown in the "Tools" tab
 * DYNAMIC: Loads all courses/chapters/topics from teacherData
 */
function SyllabusAIPanel({ context, onGenerated }) {
  const [activeTab, setActiveTab] = useState('quiz');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  
  // Dynamic selection state
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedChapterIndex, setSelectedChapterIndex] = useState('');
  const [selectedTopicIndex, setSelectedTopicIndex] = useState('');

  // Get all available courses dynamically
  const allCourses = teacherData.courses || [];
  
  // Initialize with context or first available course
  useEffect(() => {
    const initialCourse = context?.currentCourseId || context?.urlContext?.courseId || allCourses[0]?.id;
    if (initialCourse && !selectedCourseId) {
      setSelectedCourseId(initialCourse);
    }
  }, [context, allCourses, selectedCourseId]);

  // Get selected course and its syllabus
  const selectedCourse = allCourses.find(c => c.id === selectedCourseId);
  const syllabus = selectedCourse ? getSyllabusByRef(selectedCourse.syllabusRef) : null;
  const chapters = syllabus?.chapters || [];
  
  // Get selected chapter and topics
  const selectedChapter = chapters.find(ch => ch.index === Number(selectedChapterIndex));
  const topics = selectedChapter?.subTopics || [];
  const selectedTopic = topics.find(t => t.index === Number(selectedTopicIndex));

  // Auto-select first chapter when course changes
  useEffect(() => {
    if (chapters.length > 0 && !selectedChapterIndex) {
      setSelectedChapterIndex(String(chapters[0].index));
    }
  }, [chapters, selectedChapterIndex]);

  // Auto-select first topic when chapter changes
  useEffect(() => {
    if (topics.length > 0 && !selectedTopicIndex) {
      setSelectedTopicIndex(String(topics[0].index));
    }
  }, [topics, selectedTopicIndex]);

  // Reset dependent selections when parent changes
  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);
    setSelectedChapterIndex('');
    setSelectedTopicIndex('');
    setResult(null);
    setError('');
  };

  const handleChapterChange = (chapterIdx) => {
    setSelectedChapterIndex(chapterIdx);
    setSelectedTopicIndex('');
    setResult(null);
    setError('');
  };

  // Derived values for API calls
  const subject = syllabus?.subject || selectedCourse?.title || 'Subject';
  const grade = syllabus?.grade || '';
  const chapterTitle = selectedChapter?.title || '';
  const topicTitle = selectedTopic?.title || '';

  const handleGenerateQuiz = async () => {
    if (!chapterTitle || !topicTitle) {
      setError('Please select a chapter and topic first');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const questions = await generateQuiz({
        subject,
        grade,
        chapterTitle,
        topicTitle,
        count: questionCount
      });

      setResult({ type: 'quiz', data: questions });
      
      if (onGenerated) {
        onGenerated({ type: 'quiz', data: questions });
      }
      emitEvent('syllabus:quiz-generated', { questions });
    } catch (err) {
      const errorMsg = err.message?.includes('429') || err.message?.includes('quota')
        ? 'Rate limit reached. Please wait a moment and try again.'
        : err.message || 'Failed to generate quiz';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAssignment = async () => {
    if (!chapterTitle || !topicTitle) {
      setError('Please select a chapter and topic first');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const assignment = await generateAssignment({
        subject,
        grade,
        chapterTitle,
        topicTitle,
        type: 'homework'
      });

      setResult({ type: 'assignment', data: assignment });
      
      if (onGenerated) {
        onGenerated({ type: 'assignment', data: assignment });
      }
      emitEvent('syllabus:assignment-generated', { assignment });
    } catch (err) {
      const errorMsg = err.message?.includes('429') || err.message?.includes('quota')
        ? 'Rate limit reached. Please wait a moment and try again.'
        : err.message || 'Failed to generate assignment';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestNext = async () => {
    if (!selectedCourseId) {
      setError('Please select a course first');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      // Get completed chapters from progress
      const section = selectedCourse?.sections?.[0];
      const completedChapters = chapters
        .filter(ch => {
          const progress = section?.progress?.[ch.index]?.topics || {};
          const doneCount = Object.values(progress).filter(s => s === 'done').length;
          return doneCount === ch.subTopics?.length;
        })
        .map(ch => ch.title);

      const suggestion = await suggestNextTopic({
        subject,
        grade,
        completedChapters: completedChapters.length > 0 ? completedChapters : [chapters[0]?.title || ''],
        upcomingExams: section?.exams?.filter(e => new Date(e.date) > new Date()) || []
      });

      setResult({ type: 'suggestion', data: suggestion });
      emitEvent('syllabus:topic-suggested', { suggestion });
    } catch (err) {
      const errorMsg = err.message?.includes('429') || err.message?.includes('quota')
        ? 'Rate limit reached. Please wait a moment and try again.'
        : err.message || 'Failed to get suggestion';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'quiz', label: 'Quiz', icon: ClipboardList, action: handleGenerateQuiz },
    { id: 'assignment', label: 'Assignment', icon: FileText, action: handleGenerateAssignment },
    { id: 'suggest', label: 'Suggest', icon: Lightbulb, action: handleSuggestNext }
  ];

  // Check if we have valid data to work with
  const hasData = allCourses.length > 0;
  const canGenerate = selectedCourseId && (activeTab === 'suggest' || (selectedChapterIndex && selectedTopicIndex));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-neutral-800">Syllabus AI Helper</h3>
          <p className="text-sm text-neutral-500">Generate quizzes, assignments & suggestions</p>
        </div>
      </div>

      {!hasData ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-yellow-700">No courses available. Please set up your courses first.</p>
        </div>
      ) : (
        <>
          {/* Dynamic Course/Chapter/Topic Selection */}
          <div className="space-y-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            {/* Course Selection */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              >
                <option value="">Select a course...</option>
                {allCourses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title} ({course.sections.map(s => s.id).join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter Selection - Only for Quiz/Assignment */}
            {activeTab !== 'suggest' && selectedCourseId && chapters.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Chapter</label>
                <select
                  value={selectedChapterIndex}
                  onChange={(e) => handleChapterChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                >
                  <option value="">Select a chapter...</option>
                  {chapters.map(chapter => (
                    <option key={chapter.index} value={chapter.index}>
                      {chapter.index}. {chapter.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Topic Selection - Only for Quiz/Assignment */}
            {activeTab !== 'suggest' && selectedChapterIndex && topics.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Topic</label>
                <select
                  value={selectedTopicIndex}
                  onChange={(e) => { setSelectedTopicIndex(e.target.value); setResult(null); setError(''); }}
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                >
                  <option value="">Select a topic...</option>
                  {topics.map(topic => (
                    <option key={topic.index} value={topic.index}>
                      {topic.index}. {topic.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Current Selection Summary */}
            {selectedCourseId && (
              <div className="pt-2 border-t border-neutral-200">
                <p className="text-xs text-purple-600 font-medium">
                  {subject} {grade ? `- Grade ${grade}` : ''}
                  {selectedChapter && ` â†’ ${selectedChapter.title}`}
                  {selectedTopic && ` â†’ ${selectedTopic.title}`}
                </p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-neutral-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setResult(null); setError(''); }}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium
                    transition-colors border-b-2 -mb-px
                    ${isActive
                      ? 'text-purple-700 border-purple-600 bg-purple-50'
                      : 'text-neutral-600 border-transparent hover:text-neutral-800 hover:bg-neutral-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
            <AnimatePresence mode="wait">
              {result ? (
                <div key="result">
                  {result.type === 'quiz' && (
                    <QuizResultDisplay
                      questions={result.data}
                      onClose={() => setResult(null)}
                      onSave={() => {
                        debugLog('Save quiz as assignment');
                        setResult(null);
                      }}
                    />
                  )}
                  {result.type === 'assignment' && (
                    <AssignmentResultDisplay
                      assignment={result.data}
                      onClose={() => setResult(null)}
                      onCreate={() => {
                        debugLog('Create assignment');
                        setResult(null);
                      }}
                    />
                  )}
                  {result.type === 'suggestion' && (
                    <TopicSuggestionDisplay
                      suggestion={result.data}
                      onClose={() => setResult(null)}
                    />
                  )}
                </div>
              ) : (
                <motion.div
                  key="action"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Quiz Options */}
                  {activeTab === 'quiz' && (
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <label className="block text-xs text-neutral-600 mb-2">
                        Number of questions
                      </label>
                      <div className="flex gap-2">
                        {[3, 5, 10].map(num => (
                          <button
                            key={num}
                            onClick={() => setQuestionCount(num)}
                            className={`
                              px-4 py-2 rounded-lg text-sm font-medium transition-colors
                              ${questionCount === num
                                ? 'bg-purple-600 text-white'
                                : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-purple-50'
                              }
                            `}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggest Tab Info */}
                  {activeTab === 'suggest' && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ðŸ’¡ AI will analyze your progress and suggest the best next topic to teach based on syllabus sequence and upcoming exams.
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{error}</p>
                      <button
                        onClick={() => setError('')}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={tabs.find(t => t.id === activeTab)?.action}
                    disabled={isLoading || !canGenerate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate {tabs.find(t => t.id === activeTab)?.label}</span>
                      </>
                    )}
                  </button>

                  {/* Validation Message */}
                  {!canGenerate && !error && (
                    <p className="text-xs text-neutral-500 text-center">
                      {activeTab === 'suggest' 
                        ? 'Select a course to get suggestions'
                        : 'Select course, chapter, and topic to generate'}
                    </p>
                  )}

                  {/* Info */}
                  <p className="text-xs text-neutral-400 text-center">
                    Powered by Google Gemini AI
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Syllabus Quick Actions Component
 * Compact controls rendered in chat input area
 * DYNAMIC: Uses context to determine current course/topic
 */
function SyllabusQuickActions({ context, onMessage, expanded, onToggleExpanded }) {
  const [activeAction, setActiveAction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get course from context (URL or explicit)
  const courseId = context?.currentCourseId || context?.urlContext?.courseId || teacherData.courses[0]?.id;
  const course = getCourseById(teacherData, courseId);
  const syllabus = getSyllabusByRef(course?.syllabusRef);
  
  // Derive values
  const subject = syllabus?.subject || course?.title || 'Subject';
  const grade = syllabus?.grade || '';
  const currentChapter = syllabus?.chapters?.[0]?.title || 'Chapter 1';
  const currentTopic = syllabus?.chapters?.[0]?.subTopics?.[0]?.title || 'Topic 1';

  const handleAction = async (actionType) => {
    if (isLoading) return;
    
    setActiveAction(actionType);
    setIsLoading(true);

    try {
      let response;
      if (actionType === 'quiz') {
        const questions = await generateQuiz({
          subject, grade, chapterTitle: currentChapter, topicTitle: currentTopic, count: 5
        });
        response = `ðŸ“ **Generated Quiz** for ${subject} ${grade ? `Grade ${grade}` : ''}\n` +
          `Topic: ${currentChapter} â†’ ${currentTopic}\n\n` +
          questions.map((q, i) => 
            `**${i + 1}. ${q.question}**\n` +
            Object.entries(q.options).map(([k, v]) => `   ${k}. ${v}`).join('\n') +
            `\n   ✓ Answer: ${q.correctAnswer}`
          ).join('\n\n');
      } else if (actionType === 'assignment') {
        const assignment = await generateAssignment({
          subject, grade, chapterTitle: currentChapter, topicTitle: currentTopic, type: 'homework'
        });
        response = `ðŸ“„ **${assignment.title}**\n` +
          `Topic: ${currentChapter} â†’ ${currentTopic}\n\n` +
          `${assignment.description}\n\n` +
          `**Instructions:**\n${assignment.instructions}\n\n` +
          `**Rubric:**\n` + assignment.rubric.map(r => `– ${r.criterion}: ${r.points} pts`).join('\n') +
          `\n\nâ±ï¸ ${assignment.estimatedTime} | ðŸ“… Due in ${assignment.dueInDays} days`;
      } else if (actionType === 'suggest') {
        const suggestion = await suggestNextTopic({
          subject, grade, completedChapters: [currentChapter], upcomingExams: []
        });
        response = `ðŸ’¡ **Next Topic Suggestion** for ${subject}\n\n` +
          `**${suggestion.suggestedTopic}**\n\n` +
          `${suggestion.reasoning}\n\n` +
          `**Preparation Tips:**\n` + (suggestion.preparationTips || []).map(t => `– ${t}`).join('\n') +
          `\n\nâ±ï¸ Estimated: ${suggestion.estimatedHours || 2} hours`;
      }

      onMessage?.({
        type: 'assistant',
        content: response
      });
    } catch (err) {
      const errorMsg = err.message?.includes('429') || err.message?.includes('quota')
        ? `â³ Rate limit reached. Please wait a moment and try again.`
        : `âŒ Failed to generate ${actionType}: ${err.message}`;
      onMessage?.({
        type: 'error',
        content: errorMsg
      });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  if (!expanded) {
    return (
      <QuickActionButton
        icon={Sparkles}
        label="AI Tools"
        onClick={onToggleExpanded}
        active={false}
        disabled={isLoading}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-wrap gap-2"
    >
      <QuickActionButton
        icon={ClipboardList}
        label="Quiz"
        onClick={() => handleAction('quiz')}
        active={activeAction === 'quiz'}
        disabled={isLoading}
      />
      <QuickActionButton
        icon={FileText}
        label="Assignment"
        onClick={() => handleAction('assignment')}
        active={activeAction === 'assignment'}
        disabled={isLoading}
      />
      <QuickActionButton
        icon={Lightbulb}
        label="Suggest"
        onClick={() => handleAction('suggest')}
        active={activeAction === 'suggest'}
        disabled={isLoading}
      />
      <button
        onClick={onToggleExpanded}
        className="p-1.5 text-neutral-400 hover:text-neutral-600"
        aria-label="Collapse"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ============================================
// Plugin Definition and Registration
// ============================================

/**
 * Syllabus AI Helper Plugin
 */
const SyllabusAIHelperPlugin = {
  id: 'syllabus-ai-helper',
  name: 'Syllabus AI',
  description: 'Generate quizzes, assignments, and get topic suggestions',
  priority: 5,
  enabled: true,

  /**
   * Initialize plugin with chat API
   * @param {Object} api - Chat API instance
   */
  init(api) {
    debugLog('Initializing Syllabus AI Helper plugin');
  },

  /**
   * Process incoming messages for syllabus-related intents
   * DYNAMIC: Uses context and extracts course/topic from message
   * @param {Object} message - Message object
   * @param {Object} context - Current context
   * @returns {Promise<Object|null>} - Response or null
   */
  async onMessage(message, context) {
    const content = (message.content || '').toLowerCase();
    
    // Check for quiz generation intent
    const isQuizRequest = 
      (content.includes('quiz') || content.includes('test')) &&
      (content.includes('generate') || content.includes('create') || content.includes('make'));

    // Check for assignment intent
    const isAssignmentRequest =
      (content.includes('assignment') || content.includes('homework')) &&
      (content.includes('generate') || content.includes('create') || content.includes('make'));

    // Check for suggestion intent
    const isSuggestionRequest =
      content.includes('suggest') || content.includes('what should') || content.includes('next topic');

    if (isQuizRequest || isAssignmentRequest || isSuggestionRequest) {
      try {
        // Get course from context (URL or explicit) - fully dynamic
        const courseId = context?.currentCourseId || context?.urlContext?.courseId || teacherData.courses[0]?.id;
        const course = getCourseById(teacherData, courseId);
        const syllabus = getSyllabusByRef(course?.syllabusRef);
        
        // Try to extract specific chapter/topic from message
        let targetChapter = syllabus?.chapters?.[0];
        let targetTopic = targetChapter?.subTopics?.[0];
        
        // Check if user mentioned a specific chapter or topic
        if (syllabus?.chapters) {
          for (const chapter of syllabus.chapters) {
            if (content.includes(chapter.title.toLowerCase())) {
              targetChapter = chapter;
              targetTopic = chapter.subTopics?.[0];
              break;
            }
            for (const topic of chapter.subTopics || []) {
              if (content.includes(topic.title.toLowerCase())) {
                targetChapter = chapter;
                targetTopic = topic;
                break;
              }
            }
          }
        }
        
        const subject = syllabus?.subject || course?.title || 'Subject';
        const grade = syllabus?.grade || '';
        const chapterTitle = targetChapter?.title || 'Chapter 1';
        const topicTitle = targetTopic?.title || 'Topic 1';

        if (isQuizRequest) {
          const questions = await generateQuiz({
            subject, grade, chapterTitle, topicTitle, count: 5
          });
          
          return {
            handled: true,
            response: `ðŸ“ **Generated Quiz** for ${subject} ${grade ? `Grade ${grade}` : ''}\n` +
              `Topic: ${chapterTitle} â†’ ${topicTitle}\n\n` +
              questions.map((q, i) => 
                `**${i + 1}. ${q.question}**\n` +
                Object.entries(q.options).map(([k, v]) => `   ${k}. ${v}`).join('\n') +
                `\n   ✓ Answer: ${q.correctAnswer}\n   ðŸ’¡ ${q.explanation}`
              ).join('\n\n')
          };
        }

        if (isAssignmentRequest) {
          const assignment = await generateAssignment({
            subject, grade, chapterTitle, topicTitle, type: 'homework'
          });
          
          return {
            handled: true,
            response: `ðŸ“„ **${assignment.title}**\n` +
              `Topic: ${chapterTitle} â†’ ${topicTitle}\n\n` +
              `${assignment.description}\n\n` +
              `**Instructions:**\n${assignment.instructions}\n\n` +
              `**Rubric:**\n` + assignment.rubric.map(r => `– ${r.criterion}: ${r.points} pts - ${r.description}`).join('\n') +
              `\n\nâ±ï¸ ${assignment.estimatedTime} | ðŸ“… Due in ${assignment.dueInDays} days`
          };
        }

        if (isSuggestionRequest) {
          const suggestion = await suggestNextTopic({
            subject, grade, completedChapters: [chapterTitle], upcomingExams: []
          });
          
          return {
            handled: true,
            response: `ðŸ’¡ **Next Topic Suggestion** for ${subject}\n\n` +
              `**${suggestion.suggestedTopic}**\n\n` +
              `${suggestion.reasoning}\n\n` +
              `**Preparation Tips:**\n` + (suggestion.preparationTips || []).map(t => `– ${t}`).join('\n') +
              `\n\nâ±ï¸ Estimated: ${suggestion.estimatedHours || 2} hours`
          };
        }
      } catch (err) {
        debugLog('Error processing syllabus request:', err);
        const errorMsg = err.message?.includes('429') || err.message?.includes('quota')
          ? `â³ Rate limit reached. Please wait a moment and try again.`
          : `âŒ Sorry, I couldn't process that request. Error: ${err.message}`;
        return {
          handled: true,
          response: errorMsg
        };
      }
    }

    return null;
  },

  /**
   * Render quick action buttons in chat input area
   * @param {Object} props - Component props
   * @returns {JSX.Element|null}
   */
  renderControls(props) {
    return <SyllabusQuickActions {...props} />;
  },

  /**
   * Render full panel in tools tab (alias for renderExpandedPanel)
   * @param {Object} props - Component props
   * @returns {JSX.Element}
   */
  renderPanel(props) {
    return <SyllabusAIPanel {...props} />;
  },

  /**
   * Render full panel in tools tab (used by chat bars)
   * @param {Object} props - Component props
   * @returns {JSX.Element}
   */
  renderExpandedPanel(props) {
    return <SyllabusAIPanel {...props} />;
  },

  /**
   * Cleanup when plugin is destroyed
   */
  destroy() {
    debugLog('Destroying Syllabus AI Helper plugin');
  }
};

// Register the plugin
registerChatPlugin(SyllabusAIHelperPlugin);

// Export for direct import
export default SyllabusAIHelperPlugin;
export { SyllabusAIPanel, SyllabusQuickActions, QuickActionButton };
