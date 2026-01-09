import React from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Clock, MapPin, ChevronRight, MoreVertical } from 'lucide-react';

/**
 * ClassCard - Display class information with quick actions
 */
export function ClassCard({
  id,
  name,
  section,
  subject,
  studentCount,
  room,
  nextClass,
  isActive = false,
  isLive = false,
  progress,
  onStart,
  onViewDetails,
  onClick,
  className = '',
}) {
  const formatTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

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
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      onClick={onClick || onViewDetails}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={`
        relative bg-white rounded-2xl border overflow-hidden
        transition-all duration-200 cursor-pointer
        ${isActive || isLive
          ? 'border-indigo-300 shadow-lg shadow-indigo-100'
          : 'border-neutral-200 hover:border-neutral-300 shadow-sm hover:shadow-md'
        }
        ${className}
      `}
    >
      {/* Live indicator */}
      {isLive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
      )}

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="h-1 bg-neutral-100">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-neutral-800 truncate">{name}</h3>
              {section && (
                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-md">
                  {section}
                </span>
              )}
            </div>
            {subject && (
              <p className="text-sm text-neutral-500 mt-0.5">{subject}</p>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-sm text-neutral-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{studentCount} students</span>
          </div>
          {room && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{room}</span>
            </div>
          )}
        </div>

        {/* Next class info */}
        {nextClass && !isLive && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-neutral-50 rounded-xl">
            <Clock className="w-4 h-4 text-neutral-400" />
            <span className="text-sm text-neutral-600">
              {formatDate(nextClass)} at {formatTime(nextClass)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onStart && !isLive && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Class
            </motion.button>
          )}
          {isLive && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.();
              }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Continue Class
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
          {onViewDetails && !isLive && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                onStart
                  ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  : 'flex-1 bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {onStart ? (
                <MoreVertical className="w-4 h-4" />
              ) : (
                <>
                  View
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * ClassCardCompact - Smaller version for lists
 */
export function ClassCardCompact({
  name,
  section,
  time,
  studentCount,
  isLive,
  onClick,
  className = '',
}) {
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
      {/* Status indicator */}
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isLive ? 'bg-green-500 animate-pulse' : 'bg-neutral-300'}`} />
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-800 truncate">{name}</span>
          {section && (
            <span className="text-xs text-neutral-500">{section}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
          {time && <span>{time}</span>}
          <span>{studentCount} students</span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
    </motion.button>
  );
}

/**
 * ClassList - Container for class cards
 */
export function ClassList({ children, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {children}
    </div>
  );
}

export default ClassCard;
