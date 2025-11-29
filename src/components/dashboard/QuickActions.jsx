import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  GraduationCap,
  FileEdit,
  Folder,
  Sparkles,
  CalendarDays,
} from 'lucide-react';

/**
 * QuickActions - Grid of quick action buttons
 * Navigation callbacks use real routes
 */
export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Take Attendance',
      icon: ClipboardCheck,
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => navigate('/classes'),
    },
    {
      label: 'View Courses',
      icon: GraduationCap,
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/classes'),
    },
    {
      label: 'Assignments',
      icon: FileEdit,
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => navigate('/assignments'),
    },
    {
      label: 'Resources',
      icon: Folder,
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/resources'),
    },
    {
      label: 'AI Assistant',
      icon: Sparkles,
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => navigate('/chat'),
    },
    {
      label: 'Schedule',
      icon: CalendarDays,
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/schedule'),
    },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-3xl border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group h-full"
          >
            <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-600 text-center leading-tight">
              {action.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
