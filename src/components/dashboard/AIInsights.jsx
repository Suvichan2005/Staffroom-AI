import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, AlertCircle, TrendingUp } from 'lucide-react';

/**
 * AIInsights - AI-powered insights panel
 * Shows suggestions based on teacher data
 */
export default function AIInsights({ insights = [] }) {
  // Default insights if none provided
  const defaultInsights = [
    {
      type: 'suggestion',
      icon: Lightbulb,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      title: 'Quiz Opportunity',
      text: 'Chapter 3 quiz is ready - consider scheduling for Friday.',
    },
    {
      type: 'alert',
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      title: 'Attendance Alert',
      text: 'Section 8A: 3 students below 75% attendance threshold.',
    },
    {
      type: 'trend',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      title: 'Progress Update',
      text: 'Section 6C ahead of schedule - consider bonus content.',
    },
  ];

  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  return (
    <div className="bg-white rounded-3xl border border-black-200 p-4 sm:p-5 h-full min-h-[160px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-black-800">AI Insights</h3>
      </div>

      <div className="space-y-2">
        {displayInsights.map((insight, index) => {
          const Icon = insight.icon || Lightbulb;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-xl ${insight.bg} border border-transparent hover:border-black-200 transition-all cursor-pointer`}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 ${insight.color} mt-0.5 flex-shrink-0`} />
                <div>
                  <p className="text-xs font-semibold text-black-700">{insight.title}</p>
                  <p className="text-xs text-black-600 mt-0.5">{insight.text}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <button className="w-full mt-3 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors">
        View All Suggestions
      </button>
    </div>
  );
}
