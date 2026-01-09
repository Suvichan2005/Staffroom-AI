import React from 'react';

/**
 * Badge Component - Small status indicators
 * 
 * @param {'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'} variant
 * @param {'sm' | 'md' | 'lg'} size
 * @param {boolean} dot - Show status dot
 * @param {boolean} pill - Full rounded corners
 */
export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  pill = true,
  className = '',
  children,
}) {
  const variants = {
    default: 'bg-neutral-100 text-neutral-700',
    primary: 'bg-indigo-100 text-indigo-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  const dotColors = {
    default: 'bg-neutral-500',
    primary: 'bg-indigo-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2 h-2',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium
        ${variants[variant]}
        ${sizes[size]}
        ${pill ? 'rounded-full' : 'rounded-md'}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`
            ${dotSizes[size]}
            ${dotColors[variant]}
            rounded-full flex-shrink-0
          `}
        />
      )}
      {children}
    </span>
  );
}

/**
 * Status Badge - Predefined status indicators
 */
export function StatusBadge({ status, className = '' }) {
  const statusConfig = {
    active: { variant: 'success', label: 'Active', dot: true },
    inactive: { variant: 'default', label: 'Inactive', dot: true },
    pending: { variant: 'warning', label: 'Pending', dot: true },
    completed: { variant: 'success', label: 'Completed', dot: false },
    overdue: { variant: 'error', label: 'Overdue', dot: true },
    draft: { variant: 'default', label: 'Draft', dot: false },
    published: { variant: 'info', label: 'Published', dot: false },
    present: { variant: 'success', label: 'Present', dot: false },
    absent: { variant: 'error', label: 'Absent', dot: false },
    late: { variant: 'warning', label: 'Late', dot: false },
  };

  const config = statusConfig[status] || statusConfig.active;

  return (
    <Badge
      variant={config.variant}
      dot={config.dot}
      className={className}
    >
      {config.label}
    </Badge>
  );
}

/**
 * Count Badge - For notification counts
 */
export function CountBadge({
  count,
  max = 99,
  variant = 'error',
  size = 'sm',
  className = '',
}) {
  const displayCount = count > max ? `${max}+` : count;
  
  if (count === 0) return null;

  const baseStyles = 'font-bold';
  
  const variants = {
    primary: 'bg-indigo-600 text-white',
    error: 'bg-red-500 text-white',
    success: 'bg-green-500 text-white',
  };

  const sizes = {
    sm: 'min-w-[18px] h-[18px] text-[10px] px-1',
    md: 'min-w-[22px] h-[22px] text-xs px-1.5',
    lg: 'min-w-[26px] h-[26px] text-sm px-2',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center rounded-full
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
}

/**
 * Avatar Badge - Badge positioned on an avatar
 */
export function AvatarBadge({
  children,
  badge,
  badgePosition = 'bottom-right',
  className = '',
}) {
  const positions = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1',
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      {children}
      <span className={`absolute ${positions[badgePosition]}`}>
        {badge}
      </span>
    </div>
  );
}

export default Badge;
