import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, FileQuestion, TrendingUp, Users } from 'lucide-react';

/**
 * AISuggestions - Quick suggestion buttons for chat
 */
export default function AISuggestions({ onSuggestionClick }) {
  const suggestions = [
    {
      icon: ClipboardList,
      text: 'Check attendance status',
      query: 'What is the attendance status for my classes today?',
    },
    {
      icon: FileQuestion,
      text: 'Generate a quiz',
      query: 'Can you generate a quiz for Chapter 3?',
    },
    {
      icon: TrendingUp,
      text: 'View progress summary',
      query: 'Show me the syllabus progress across all sections',
    },
    {
      icon: Users,
      text: 'Students needing help',
      query: 'Which students are struggling and need attention?',
    },
  ];

  return (
    <div className="mt-6 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-black-400 font-semibold">
        Quick Actions
      </p>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSuggestionClick(suggestion.query)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-black-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
            >
              <Icon className="w-4 h-4 text-black-400 group-hover:text-indigo-600 transition-colors" />
              <span className="text-xs text-black-600 group-hover:text-black-800">
                {suggestion.text}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
