import React from 'react';
import { motion } from 'framer-motion';

/**
 * Design System Button Component
 * 
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'} variant - Button style variant
 * @param {'sm' | 'md' | 'lg'} size - Button size
 * @param {boolean} fullWidth - Whether button takes full width
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} disabled - Disable button
 * @param {React.ReactNode} leftIcon - Icon on the left
 * @param {React.ReactNode} rightIcon - Icon on the right
 * @param {React.ReactNode} children - Button content
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  ...props
}) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium transition-all duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
  `;

  const variants = {
    primary: `
      bg-indigo-600 text-white
      hover:bg-indigo-700
      focus-visible:ring-indigo-500
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-black-100 text-black-800
      hover:bg-black-200
      focus-visible:ring-black-400
    `,
    outline: `
      border-2 border-black-200 text-black-700 bg-transparent
      hover:bg-black-50 hover:border-black-300
      focus-visible:ring-black-400
    `,
    ghost: `
      text-black-600 bg-transparent
      hover:bg-black-100 hover:text-black-800
      focus-visible:ring-black-400
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      focus-visible:ring-red-500
      shadow-sm hover:shadow-md
    `,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg min-h-[32px]',
    md: 'px-4 py-2 text-sm rounded-xl min-h-[40px]',
    lg: 'px-6 py-3 text-base rounded-xl min-h-[48px]',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
}

/**
 * Icon Button - Square button for icons only
 */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  'aria-label': ariaLabel,
  children,
  className = '',
  ...props
}) {
  const baseStyles = `
    inline-flex items-center justify-center
    transition-all duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95
  `;

  const variants = {
    primary: `
      bg-indigo-600 text-white
      hover:bg-indigo-700
      focus-visible:ring-indigo-500
    `,
    secondary: `
      bg-black-100 text-black-700
      hover:bg-black-200
      focus-visible:ring-black-400
    `,
    ghost: `
      text-black-500 bg-transparent
      hover:bg-black-100 hover:text-black-700
      focus-visible:ring-black-400
    `,
    danger: `
      text-red-500 bg-transparent
      hover:bg-red-50 hover:text-red-600
      focus-visible:ring-red-500
    `,
  };

  const sizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.95 }}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : (
        <span className={iconSizes[size]}>{children}</span>
      )}
    </motion.button>
  );
}

/**
 * Loading Spinner Component
 */
function LoadingSpinner({ size = 16, className = '' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default Button;
