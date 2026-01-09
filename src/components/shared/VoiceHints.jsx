import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

/**
 * VoiceHints - Contextual voice command suggestions
 * Shows users what they can say to the AI assistant
 */
export default function VoiceHints({ 
  hints = [], 
  variant = "default",
  collapsible = true,
  defaultExpanded = false,
  title = "Try saying",
  compact = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || hints.length === 0) return null;

  const displayHints = compact ? hints.slice(0, 2) : hints;

  const variantStyles = {
    default: {
      container: "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100",
      icon: "bg-indigo-100 text-indigo-600",
      chip: "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50",
    },
    purple: {
      container: "bg-white/10 border-white/20",
      icon: "bg-white/20 text-white",
      chip: "bg-white/10 border-white/20 text-white hover:bg-white/20",
    },
    minimal: {
      container: "bg-neutral-50 border-neutral-200",
      icon: "bg-neutral-100 text-neutral-600",
      chip: "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100",
    },
  };

  const styles = variantStyles[variant] || variantStyles.default;

  if (collapsible && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full flex items-center justify-between p-3 rounded-xl border ${styles.container} transition-colors`}
      >
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium text-neutral-700">Voice commands available</span>
        </div>
        <ChevronDown className="w-4 h-4 text-neutral-400" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${styles.container}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${styles.icon}`}>
            <Mic className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-medium text-neutral-700">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {collapsible && (
            <button
              onClick={() => setExpanded(false)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {displayHints.map((hint, idx) => (
          <button
            key={idx}
            onClick={() => {
              // Try to populate the chat input with this hint
              const chatInput = document.querySelector('[data-chat-input]');
              if (chatInput) {
                chatInput.value = hint;
                chatInput.focus();
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${styles.chip}`}
          >
            "{hint}"
          </button>
        ))}
      </div>

      {compact && hints.length > 2 && (
        <p className="text-xs text-neutral-500 mt-2">
          +{hints.length - 2} more commands
        </p>
      )}
    </motion.div>
  );
}

// Pre-defined hint sets for different contexts
export const CLASS_PAGE_HINTS = [
  "Mark everyone present except Rahul",
  "Finished pages 12 to 18",
  "Complete Chapter 2, Topic 3",
];

export const ATTENDANCE_HINTS = [
  "Mark Rahul and Priya absent",
  "Everyone is present today",
  "Undo last attendance",
];

export const SYLLABUS_HINTS = [
  "Mark Chapter 2 as done",
  "Finished Industrial Revolution",
  "Complete Topic 3 in Unit 1",
];

export const DASHBOARD_HINTS = [
  "What's my day look like?",
  "Take me to 8A Geography",
  "Which class needs attention?",
];
