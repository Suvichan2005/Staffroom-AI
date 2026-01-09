import React, { useState } from 'react';
import { Sparkles, Loader2, FileText, ClipboardList, Lightbulb } from 'lucide-react';
import { generateQuiz, generateAssignment, suggestNextTopic } from '../../services/aiService';

/**
 * Syllabus AI Helper Component
 * 
 * Provides AI-powered assistance for syllabus planning
 * - Generate quizzes
 * - Create assignments
 * - Get topic suggestions
 */
export default function SyllabusAIHelper({ subject, grade, chapterTitle, topicTitle, onGenerated }) {
  const [activeTab, setActiveTab] = useState('quiz'); // quiz | assignment | suggest
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerateQuiz = async () => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const questions = await generateQuiz({
        subject,
        grade,
        chapterTitle,
        topicTitle,
        count: 5
      });

      setResult({ type: 'quiz', data: questions });
      
      if (onGenerated) {
        onGenerated({ type: 'quiz', data: questions });
      }
    } catch (err) {
      setError(err.message || 'Failed to generate quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAssignment = async () => {
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
    } catch (err) {
      setError(err.message || 'Failed to generate assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestNext = async () => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const suggestion = await suggestNextTopic({
        subject,
        grade,
        completedChapters: [chapterTitle],
        upcomingExams: []
      });

      setResult({ type: 'suggestion', data: suggestion });
    } catch (err) {
      setError(err.message || 'Failed to get suggestion');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'quiz', label: 'Generate Quiz', icon: ClipboardList, action: handleGenerateQuiz },
    { id: 'assignment', label: 'Create Assignment', icon: FileText, action: handleGenerateAssignment },
    { id: 'suggest', label: 'Suggest Next', icon: Lightbulb, action: handleSuggestNext }
  ];

  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="text-sm font-semibold text-neutral-900">AI Assistant</h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Context Display */}
        <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-neutral-500 mb-1">Current Context:</p>
          <p className="text-sm text-neutral-900">
            <strong>{subject}</strong> - Grade {grade}
          </p>
          <p className="text-sm text-neutral-700">
            {chapterTitle} {topicTitle && `â†’ ${topicTitle}`}
          </p>
        </div>

        {/* Action Button */}
        {!result && !error && (
          <button
            onClick={tabs.find(t => t.id === activeTab)?.action}
            disabled={isLoading}
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
                <span>{tabs.find(t => t.id === activeTab)?.label}</span>
              </>
            )}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError('')}
              className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {result && result.type === 'quiz' && (
          <QuizResult questions={result.data} onClose={() => setResult(null)} />
        )}

        {result && result.type === 'assignment' && (
          <AssignmentResult assignment={result.data} onClose={() => setResult(null)} />
        )}

        {result && result.type === 'suggestion' && (
          <SuggestionResult suggestion={result.data} onClose={() => setResult(null)} />
        )}
      </div>
    </div>
  );
}

// Quiz Result Display
function QuizResult({ questions, onClose }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-900">Generated Quiz</h4>
        <button
          onClick={onClose}
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          Close
        </button>
      </div>

      {questions.map((q, idx) => (
        <div key={idx} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
          <p className="text-sm font-medium text-neutral-900 mb-2">
            {idx + 1}. {q.question}
          </p>
          <div className="space-y-1 mb-2">
            {Object.entries(q.options).map(([key, value]) => (
              <div
                key={key}
                className={`text-xs px-2 py-1 rounded ${
                  key === q.correctAnswer
                    ? 'bg-green-100 text-green-800 font-medium'
                    : 'bg-white text-neutral-700'
                }`}
              >
                {key}. {value}
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-600 italic">
            <strong>Answer:</strong> {q.correctAnswer} - {q.explanation}
          </p>
        </div>
      ))}

      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
        Save as Assignment
      </button>
    </div>
  );
}

// Assignment Result Display
function AssignmentResult({ assignment, onClose }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-900">{assignment.title}</h4>
        <button
          onClick={onClose}
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          Close
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-neutral-500">Description:</p>
          <p className="text-sm text-neutral-900">{assignment.description}</p>
        </div>

        <div>
          <p className="text-xs text-neutral-500">Instructions:</p>
          <p className="text-sm text-neutral-700 whitespace-pre-line">{assignment.instructions}</p>
        </div>

        <div>
          <p className="text-xs text-neutral-500 mb-2">Rubric:</p>
          <div className="space-y-1">
            {assignment.rubric.map((r, idx) => (
              <div key={idx} className="flex justify-between items-start p-2 bg-neutral-50 rounded">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{r.criterion}</p>
                  <p className="text-xs text-neutral-600">{r.description}</p>
                </div>
                <span className="text-sm font-semibold text-purple-600">{r.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 text-xs text-neutral-600">
          <span>â±ï¸ Est. Time: {assignment.estimatedTime}</span>
          <span>ðŸ“… Due in: {assignment.dueInDays} days</span>
        </div>
      </div>

      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
        Create Assignment
      </button>
    </div>
  );
}

// Suggestion Result Display
function SuggestionResult({ suggestion, onClose }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-900">Next Topic Suggestion</h4>
        <button
          onClick={onClose}
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          Close
        </button>
      </div>

      <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
        <p className="text-lg font-semibold text-neutral-900 mb-1">
          {suggestion.suggestedTopic}
        </p>
        <p className="text-sm text-neutral-700">{suggestion.reasoning}</p>
      </div>

      <div>
        <p className="text-xs text-neutral-500 mb-2">Preparation Tips:</p>
        <ul className="space-y-1">
          {suggestion.preparationTips?.map((tip, idx) => (
            <li key={idx} className="text-sm text-neutral-700 flex items-start gap-2">
              <span className="text-yellow-600">–</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-sm text-neutral-600">
        â±ï¸ Estimated Hours: {suggestion.estimatedHours || 2}
      </div>
    </div>
  );
}
