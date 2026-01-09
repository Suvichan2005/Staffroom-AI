import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, ChevronRight, ChevronLeft, Lightbulb, Sparkles } from 'lucide-react';
import { loadUserState, saveUserState } from '../../utils/userScopedStorage';

// Context for managing tooltips globally
const TooltipContext = createContext(null);

export function TooltipProvider({ children }) {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [seenTooltips, setSeenTooltips] = useState(() => 
    loadUserState('ui:seenTooltips', [])
  );
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const markTooltipSeen = (id) => {
    if (!seenTooltips.includes(id)) {
      const newSeen = [...seenTooltips, id];
      setSeenTooltips(newSeen);
      saveUserState('ui:seenTooltips', newSeen);
    }
  };

  const showTooltip = (id) => {
    setActiveTooltip(id);
    markTooltipSeen(id);
  };

  const hideTooltip = () => {
    setActiveTooltip(null);
  };

  const hasSeenTooltip = (id) => seenTooltips.includes(id);

  const resetTooltips = () => {
    setSeenTooltips([]);
    saveUserState('ui:seenTooltips', []);
  };

  return (
    <TooltipContext.Provider value={{
      activeTooltip,
      showTooltip,
      hideTooltip,
      hasSeenTooltip,
      markTooltipSeen,
      resetTooltips,
      tourActive,
      setTourActive,
      tourStep,
      setTourStep
    }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function useTooltips() {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltips must be used within a TooltipProvider');
  }
  return context;
}

// Feature tooltip definitions
export const FEATURE_TIPS = {
  voiceAttendance: {
    id: 'voiceAttendance',
    title: 'Voice Attendance',
    description: 'Say student names naturally and AI will mark attendance automatically. Works with nicknames and accents!',
    example: '"Rahul present, Priya absent, Amit is here"',
    icon: '🎤'
  },
  syllabusProgress: {
    id: 'syllabusProgress',
    title: 'Track Syllabus Progress',
    description: 'Click on any topic to mark it as complete. Progress auto-saves and syncs across devices.',
    example: 'Green = Done, Yellow = In Progress, Gray = Not Started',
    icon: '📚'
  },
  aiChat: {
    id: 'aiChat',
    title: 'AI Assistant',
    description: 'Ask anything! The AI knows your classes, schedule, and syllabus. It can even take actions for you.',
    example: '"What\'s my attendance rate for 6A?" or "Mark chapter 3 complete"',
    icon: '✨'
  },
  quickActions: {
    id: 'quickActions',
    title: 'Quick Actions',
    description: 'Access common tasks directly from the dashboard. No need to navigate to different pages.',
    example: 'Take attendance, update progress, view schedule',
    icon: '⚡'
  },
  gradeBook: {
    id: 'gradeBook',
    title: 'Grade Book Matrix',
    description: 'View all student grades in a spreadsheet-style grid. Color-coded for quick identification.',
    example: 'Green ≥80%, Yellow ≥60%, Red <60%',
    icon: '📊'
  },
  topicNotes: {
    id: 'topicNotes',
    title: 'Topic Notes',
    description: 'Add teaching notes to any syllabus topic. Great for recording what worked well or needs review.',
    example: 'Click the notes icon next to any topic',
    icon: '📝'
  },
  hodHeatmap: {
    id: 'hodHeatmap',
    title: 'Section Parity Heatmap',
    description: 'Compare syllabus progress across sections at a glance. Identify which sections need attention.',
    example: 'Dark = High progress, Light = Low progress',
    icon: '🗺️'
  },
  scheduleView: {
    id: 'scheduleView',
    title: 'Smart Schedule',
    description: 'Your schedule shows upcoming classes with quick links to attendance and syllabus.',
    example: 'Click any class to jump directly to it',
    icon: '📅'
  }
};

// Inline help tooltip component
export function FeatureTooltip({ tipId, position = 'right', showOnce = true, children }) {
  const { activeTooltip, showTooltip, hideTooltip, hasSeenTooltip } = useTooltips();
  const tip = FEATURE_TIPS[tipId];
  const [showPulse, setShowPulse] = useState(false);
  
  useEffect(() => {
    if (showOnce && !hasSeenTooltip(tipId)) {
      // Show pulse animation for unseen tips
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [tipId, hasSeenTooltip, showOnce]);

  if (!tip) return children;

  const isActive = activeTooltip === tipId;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-flex items-center gap-1">
      {children}
      <button
        onClick={() => isActive ? hideTooltip() : showTooltip(tipId)}
        className={`relative p-1 rounded-full transition-colors ${
          isActive 
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' 
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        <HelpCircle className="w-4 h-4" />
        {showPulse && (
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75" />
        )}
      </button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute z-50 ${positionClasses[position]}`}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-72">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tip.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {tip.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {tip.description}
                  </p>
                  {tip.example && (
                    <div className="mt-2 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-500 dark:text-gray-400 italic">
                      {tip.example}
                    </div>
                  )}
                </div>
                <button
                  onClick={hideTooltip}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Floating help button that shows contextual tips
export function FloatingHelpButton({ context = 'dashboard' }) {
  const [isOpen, setIsOpen] = useState(false);
  const { resetTooltips } = useTooltips();

  const contextTips = {
    dashboard: ['quickActions', 'aiChat', 'scheduleView'],
    classPage: ['voiceAttendance', 'syllabusProgress', 'topicNotes'],
    assessments: ['gradeBook'],
    hod: ['hodHeatmap']
  };

  const tips = (contextTips[context] || contextTips.dashboard).map(id => FEATURE_TIPS[id]).filter(Boolean);

  return (
    <div className="fixed bottom-20 right-4 z-40 md:bottom-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-14 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80 mb-2"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Tips for this page
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {tips.map(tip => (
                <div 
                  key={tip.id}
                  className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <span className="text-xl">{tip.icon}</span>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {tip.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tip.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={resetTooltips}
              className="mt-3 w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Reset all tip indicators
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isOpen 
            ? 'bg-blue-600 text-white' 
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
        }`}
      >
        {isOpen ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
      </motion.button>
    </div>
  );
}

// Guided tour component
export function GuidedTour({ steps, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    saveUserState('ui:tourCompleted', true);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible || !step) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={handleSkip} />
        
        {/* Tour card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-96 max-w-[90vw]"
        >
          {/* Progress */}
          <div className="flex gap-1 mb-4">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentStep ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center">
            <span className="text-4xl mb-3 block">{step.icon}</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {step.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Skip tour
            </button>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Default tour steps
export const DEFAULT_TOUR_STEPS = [
  {
    icon: '👋',
    title: 'Welcome to Staffroom!',
    description: 'Your AI-powered teaching assistant. Let me show you around.'
  },
  {
    icon: '🎤',
    title: 'Voice Attendance',
    description: 'Just speak student names naturally. "Rahul present, Priya absent" - and attendance is marked!'
  },
  {
    icon: '📚',
    title: 'Syllabus Tracking',
    description: 'Click any topic to mark progress. Everything auto-saves and syncs across your devices.'
  },
  {
    icon: '✨',
    title: 'AI Assistant',
    description: 'Ask questions, get insights, or let AI take actions. It knows your classes and schedule!'
  },
  {
    icon: '🚀',
    title: 'You\'re all set!',
    description: 'Start by checking your dashboard or visiting any class page. Look for help icons for more tips!'
  }
];
