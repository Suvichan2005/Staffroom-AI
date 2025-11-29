import React from 'react';
import { motion } from 'framer-motion';

/**
 * QuickActionTile - Large touch-friendly action tiles for teacher workflows
 * 
 * Used for the top 5 teacher actions that should be accessible in ≤1 tap
 */
export function QuickActionTile({
  icon,
  label,
  description,
  onClick,
  variant = 'default',
  badge,
  disabled = false,
  loading = false,
  className = '',
}) {
  const variants = {
    default: {
      bg: 'bg-white',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      border: 'border-slate-200',
      hoverBorder: 'hover:border-slate-300',
    },
    primary: {
      bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      iconBg: 'bg-white/20',
      iconColor: 'text-white',
      border: 'border-transparent',
      hoverBorder: '',
      textColor: 'text-white',
      descColor: 'text-indigo-100',
    },
    success: {
      bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      iconBg: 'bg-white/20',
      iconColor: 'text-white',
      border: 'border-transparent',
      hoverBorder: '',
      textColor: 'text-white',
      descColor: 'text-emerald-100',
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      iconBg: 'bg-white/20',
      iconColor: 'text-white',
      border: 'border-transparent',
      hoverBorder: '',
      textColor: 'text-white',
      descColor: 'text-amber-100',
    },
    danger: {
      bg: 'bg-gradient-to-br from-rose-500 to-red-600',
      iconBg: 'bg-white/20',
      iconColor: 'text-white',
      border: 'border-transparent',
      hoverBorder: '',
      textColor: 'text-white',
      descColor: 'text-rose-100',
    },
  };

  const v = variants[variant];
  const isColoredVariant = variant !== 'default';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        relative flex flex-col items-center justify-center
        p-4 rounded-2xl border
        min-h-[100px] w-full
        transition-all duration-200
        ${v.bg} ${v.border} ${v.hoverBorder}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isColoredVariant ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}
        ${className}
      `}
    >
      {/* Badge */}
      {badge !== undefined && badge !== null && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}

      {/* Icon */}
      <div className={`p-3 rounded-xl ${v.iconBg} mb-2`}>
        {loading ? (
          <div className={`w-6 h-6 ${v.iconColor}`}>
            <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        ) : (
          <span className={`block w-6 h-6 ${v.iconColor}`}>{icon}</span>
        )}
      </div>

      {/* Label */}
      <span className={`text-sm font-semibold ${v.textColor || 'text-slate-800'}`}>
        {label}
      </span>

      {/* Description */}
      {description && (
        <span className={`text-xs mt-0.5 ${v.descColor || 'text-slate-500'}`}>
          {description}
        </span>
      )}
    </motion.button>
  );
}

/**
 * QuickActionsGrid - Grid layout for quick action tiles
 */
export function QuickActionsGrid({ children, columns = 2, className = '' }) {
  return (
    <div
      className={`grid gap-3 ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * QuickActionBar - Horizontal scrollable action bar
 */
export function QuickActionBar({ children, className = '' }) {
  return (
    <div className={`flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * QuickActionChip - Smaller pill-shaped action buttons
 */
export function QuickActionChip({
  icon,
  label,
  onClick,
  active = false,
  className = '',
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        text-sm font-medium whitespace-nowrap
        transition-all duration-200
        ${active
          ? 'bg-indigo-600 text-white shadow-md'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }
        ${className}
      `}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {label}
    </motion.button>
  );
}

export default QuickActionTile;
