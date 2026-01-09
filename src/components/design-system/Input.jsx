import React, { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Search, X } from 'lucide-react';

/**
 * Design System Input Component
 * 
 * @param {'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number'} type
 * @param {'sm' | 'md' | 'lg'} size
 * @param {string} label - Optional label
 * @param {string} error - Error message
 * @param {string} hint - Helper text
 * @param {React.ReactNode} leftIcon - Icon on the left
 * @param {React.ReactNode} rightIcon - Icon on the right
 * @param {boolean} clearable - Show clear button when has value
 */
export const Input = forwardRef(({
  type = 'text',
  size = 'md',
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  clearable = false,
  className = '',
  id,
  value,
  onChange,
  onClear,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasValue = value && value.length > 0;
  
  const isPassword = type === 'password';
  const isSearch = type === 'search';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[32px]',
    md: 'px-4 py-2.5 text-sm min-h-[42px]',
    lg: 'px-4 py-3 text-base min-h-[50px]',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5',
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Left Icon */}
        {(leftIcon || isSearch) && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            {isSearch ? <Search className={iconSizes[size]} /> : leftIcon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          value={value}
          onChange={onChange}
          className={`
            w-full rounded-xl border bg-white
            transition-all duration-200
            placeholder:text-neutral-400
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed
            ${sizes[size]}
            ${leftIcon || isSearch ? 'pl-10' : ''}
            ${rightIcon || isPassword || (clearable && hasValue) ? 'pr-10' : ''}
            ${error
              ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-200'
              : 'border-neutral-200 text-neutral-900 focus:border-indigo-500 focus:ring-indigo-100'
            }
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />

        {/* Right Icon / Password Toggle / Clear Button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className={iconSizes[size]} />
              ) : (
                <Eye className={iconSizes[size]} />
              )}
            </button>
          )}
          
          {clearable && hasValue && !isPassword && (
            <button
              type="button"
              onClick={handleClear}
              className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
              tabIndex={-1}
              aria-label="Clear input"
            >
              <X className={iconSizes[size]} />
            </button>
          )}
          
          {rightIcon && !isPassword && !(clearable && hasValue) && (
            <span className="text-neutral-400 pointer-events-none">{rightIcon}</span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          id={`${inputId}-error`}
          className="mt-1.5 text-sm text-red-600 flex items-center gap-1"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </motion.p>
      )}

      {/* Hint Text */}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Textarea Component
 */
export const Textarea = forwardRef(({
  label,
  error,
  hint,
  rows = 4,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={`
          w-full px-4 py-3 rounded-xl border bg-white
          text-sm text-neutral-900
          transition-all duration-200
          placeholder:text-neutral-400
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed
          resize-none
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-neutral-200 focus:border-indigo-500 focus:ring-indigo-100'
          }
        `}
        aria-invalid={error ? 'true' : 'false'}
        {...props}
      />

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}

      {hint && !error && (
        <p className="mt-1.5 text-sm text-neutral-500">{hint}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Input;
