import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, AlertTriangle, TrendingDown, TrendingUp, MoreHorizontal } from 'lucide-react';

/**
 * StudentCard - Display student information with status
 */
export function StudentCard({
  id,
  name,
  avatar,
  rollNumber,
  email,
  phone,
  attendance,
  grade,
  isAtRisk = false,
  alerts = [],
  onMessage,
  onViewProfile,
  onClick,
  className = '',
}) {
  const getAttendanceColor = (pct) => {
    if (pct >= 90) return 'text-green-600 bg-green-50';
    if (pct >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getGradeColor = (grade) => {
    if (!grade) return 'text-black-500 bg-black-50';
    const gradeUpper = grade.toUpperCase();
    if (gradeUpper.startsWith('A')) return 'text-green-600 bg-green-50';
    if (gradeUpper.startsWith('B')) return 'text-blue-600 bg-blue-50';
    if (gradeUpper.startsWith('C')) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      onClick={onClick || onViewProfile}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      className={`
        relative bg-white rounded-2xl border overflow-hidden
        transition-all duration-200 cursor-pointer
        ${isAtRisk
          ? 'border-yellow-300 shadow-md shadow-yellow-50'
          : 'border-black-200 hover:border-black-300 shadow-sm hover:shadow-md'
        }
        ${className}
      `}
    >
      {/* At-risk indicator */}
      {isAtRisk && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-red-400" />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {initials}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-black-800 truncate">{name}</h3>
              {isAtRisk && (
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
            </div>
            {rollNumber && (
              <p className="text-sm text-black-500">Roll #{rollNumber}</p>
            )}
          </div>

          {/* More actions */}
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="p-1.5 hover:bg-black-100 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-black-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 mt-3">
          {attendance !== undefined && (
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getAttendanceColor(attendance)}`}>
              {attendance}% Attendance
            </span>
          )}
          {grade && (
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getGradeColor(grade)}`}>
              Grade {grade}
            </span>
          )}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mt-3 space-y-1">
            {alerts.slice(0, 2).map((alert, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1.5 bg-yellow-50 rounded-lg text-xs text-yellow-700"
              >
                {alert.type === 'attendance' && <TrendingDown className="w-3 h-3" />}
                {alert.type === 'grade' && <TrendingDown className="w-3 h-3" />}
                {alert.type === 'improvement' && <TrendingUp className="w-3 h-3 text-green-600" />}
                <span className="truncate">{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        {(onMessage || email || phone) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black-100">
            {onMessage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Mail className="w-3 h-3" />
                Message
              </button>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black-100 text-black-600 text-xs font-medium rounded-lg hover:bg-black-200 transition-colors"
              >
                <Phone className="w-3 h-3" />
                Call
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * StudentCardCompact - Smaller list-style student card
 */
export function StudentCardCompact({
  name,
  avatar,
  rollNumber,
  attendance,
  isAtRisk,
  onClick,
  selected,
  className = '',
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`
        w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
        ${selected
          ? 'bg-indigo-50 border-indigo-300'
          : 'bg-white border-black-200 hover:border-black-300'
        }
        ${className}
      `}
    >
      {/* Avatar */}
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          {initials}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-black-800 truncate">{name}</span>
          {isAtRisk && (
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-black-500">
          {rollNumber && <span>#{rollNumber}</span>}
          {attendance !== undefined && (
            <span className={attendance < 75 ? 'text-red-500' : ''}>
              {attendance}% att.
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/**
 * StudentList - Container for student cards
 */
export function StudentList({ children, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
}

/**
 * StudentGrid - Grid layout for student cards
 */
export function StudentGrid({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {children}
    </div>
  );
}

export default StudentCard;
