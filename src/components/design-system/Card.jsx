import React from 'react';
import { motion } from 'framer-motion';

/**
 * Card Component - Container with elevation and optional hover effects
 * 
 * @param {'elevated' | 'outlined' | 'flat'} variant - Card style
 * @param {boolean} hoverable - Enable hover animation
 * @param {boolean} clickable - Enable click styling
 * @param {'sm' | 'md' | 'lg' | 'none'} padding - Padding size
 */
export function Card({
  variant = 'elevated',
  hoverable = false,
  clickable = false,
  padding = 'md',
  className = '',
  children,
  onClick,
  ...props
}) {
  const baseStyles = 'rounded-2xl transition-all duration-200';

  const variants = {
    elevated: 'bg-white shadow-md border border-black-100',
    outlined: 'bg-white border-2 border-black-200',
    flat: 'bg-black-50',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const hoverStyles = hoverable || clickable
    ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
    : '';

  const Component = clickable ? motion.button : motion.div;

  return (
    <Component
      onClick={onClick}
      whileHover={hoverable || clickable ? { y: -2 } : {}}
      whileTap={clickable ? { scale: 0.99 } : {}}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${paddings[padding]}
        ${hoverStyles}
        ${clickable ? 'text-left w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Card Header with title and optional subtitle
 */
export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-black-800 truncate">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-black-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Card Content wrapper
 */
export function CardContent({ className = '', children }) {
  return <div className={`${className}`}>{children}</div>;
}

/**
 * Card Footer with actions
 */
export function CardFooter({
  className = '',
  children,
  border = true,
}) {
  return (
    <div
      className={`
        flex items-center justify-end gap-2 pt-4 mt-4
        ${border ? 'border-t border-black-100' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * Stat Card - For displaying numbers with labels
 */
export function StatCard({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
  className = '',
}) {
  const changeColors = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-black-600 bg-black-50',
  };

  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-black-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-black-800 mt-1">{value}</p>
          {change && (
            <span
              className={`
                inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2
                ${changeColors[changeType]}
              `}
            >
              {changeType === 'positive' && '↑ '}
              {changeType === 'negative' && '↓ '}
              {change}
            </span>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Feature Card - For showcasing features with icon
 */
export function FeatureCard({
  icon,
  title,
  description,
  onClick,
  className = '',
}) {
  return (
    <Card
      clickable={!!onClick}
      onClick={onClick}
      hoverable
      className={className}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl text-white flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-black-800">{title}</h4>
          <p className="text-sm text-black-500 mt-1">{description}</p>
        </div>
      </div>
    </Card>
  );
}

export default Card;
