import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, FileText, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';

/**
 * AssignmentCard - Display assignment with status and actions
 */
export function AssignmentCard({
  id,
  title,
  description,
  dueDate,
  className: classSection,
  subject,
  totalStudents,
  submittedCount = 0,
  gradedCount = 0,
  status = 'active', // 'draft', 'active', 'past-due', 'closed'
  type = 'assignment', // 'assignment', 'quiz', 'project'
  onView,
  onGrade,
  onClick,
  cardClassName = '',
}) {
  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isPastDue = dueDate && new Date(dueDate) < new Date();
  const submissionRate = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;
  const pendingCount = totalStudents - submittedCount;
  const toGradeCount = submittedCount - gradedCount;

  const statusConfig = {
    draft: { color: 'text-neutral-500 bg-neutral-100', label: 'Draft' },
    active: { color: 'text-green-600 bg-green-50', label: 'Active' },
    'past-due': { color: 'text-yellow-600 bg-yellow-50', label: 'Past Due' },
    closed: { color: 'text-neutral-500 bg-neutral-100', label: 'Closed' },
  };

  const typeConfig = {
    assignment: { icon: FileText, color: 'from-indigo-500 to-blue-500' },
    quiz: { icon: CheckCircle, color: 'from-purple-500 to-pink-500' },
    project: { icon: Calendar, color: 'from-yellow-500 to-orange-500' },
  };

  const TypeIcon = typeConfig[type]?.icon || FileText;

  return (
    <motion.div
      onClick={onClick || onView}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={`
        bg-white rounded-2xl border overflow-hidden
        transition-all duration-200 cursor-pointer
        ${isPastDue && status === 'active'
          ? 'border-yellow-300 shadow-md shadow-yellow-50'
          : 'border-neutral-200 hover:border-neutral-300 shadow-sm hover:shadow-md'
        }
        ${cardClassName}
      `}
    >
      {/* Progress bar */}
      <div className="h-1 bg-neutral-100">
        <div
          className={`h-full transition-all duration-500 ${
            submissionRate === 100
              ? 'bg-green-500'
              : submissionRate >= 50
                ? 'bg-indigo-500'
                : 'bg-yellow-500'
          }`}
          style={{ width: `${submissionRate}%` }}
        />
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Type icon */}
          <div className={`p-2 rounded-xl bg-gradient-to-br ${typeConfig[type]?.color || typeConfig.assignment.color}`}>
            <TypeIcon className="w-5 h-5 text-white" />
          </div>

          {/* Title & meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-neutral-800 truncate">{title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[status]?.color}`}>
                {statusConfig[status]?.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-neutral-500">
              {classSection && <span>{classSection}</span>}
              {classSection && subject && <span>–</span>}
              {subject && <span>{subject}</span>}
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-neutral-600 line-clamp-2 mb-3">{description}</p>
        )}

        {/* Due date */}
        {dueDate && (
          <div className={`flex items-center gap-2 text-sm mb-3 ${isPastDue ? 'text-yellow-600' : 'text-neutral-500'}`}>
            <Clock className="w-4 h-4" />
            <span>
              Due {formatDate(dueDate)} at {formatTime(dueDate)}
            </span>
            {isPastDue && (
              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                Past due
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-neutral-800">{submittedCount}/{totalStudents}</span>
            <span className="text-neutral-500">submitted</span>
          </div>
          {toGradeCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 font-medium rounded-full">
                {toGradeCount} to grade
              </span>
            </div>
          )}
          {pendingCount > 0 && status === 'active' && (
            <div className="flex items-center gap-1.5 text-neutral-500">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span>{pendingCount} pending</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100">
          {onGrade && toGradeCount > 0 && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onGrade();
              }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Grade Submissions
            </motion.button>
          )}
          {onView && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                onGrade && toGradeCount > 0
                  ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  : 'flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              View Details
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * AssignmentCardCompact - Smaller list item version
 */
export function AssignmentCardCompact({
  title,
  classSection,
  dueDate,
  submittedCount,
  totalStudents,
  status,
  onClick,
  className = '',
}) {
  const isPastDue = dueDate && new Date(dueDate) < new Date();
  const submissionRate = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`
        w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-200
        hover:border-neutral-300 hover:shadow-sm transition-all text-left
        ${className}
      `}
    >
      {/* Progress indicator */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke={submissionRate === 100 ? '#22c55e' : '#6366f1'}
            strokeWidth="3"
            strokeDasharray={`${submissionRate} 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-neutral-700">
          {submissionRate}%
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-800 truncate">{title}</span>
          {isPastDue && status === 'active' && (
            <span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
          {classSection && <span>{classSection}</span>}
          {dueDate && (
            <>
              <span>–</span>
              <span className={isPastDue ? 'text-yellow-600' : ''}>
                Due {new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
    </motion.button>
  );
}

/**
 * AssignmentList - Container for assignment cards
 */
export function AssignmentList({ children, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {children}
    </div>
  );
}

export default AssignmentCard;
