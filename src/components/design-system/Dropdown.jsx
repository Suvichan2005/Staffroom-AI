import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Dropdown Menu Component
 * 
 * @param {React.ReactNode} trigger - Element that triggers the dropdown
 * @param {'left' | 'right'} align - Alignment relative to trigger
 * @param {Array} items - Menu items
 */
export function Dropdown({
  trigger,
  align = 'left',
  items = [],
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const alignments = {
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {/* Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute top-full mt-2 z-50
              ${alignments[align]}
              min-w-[180px] py-1
              bg-white rounded-xl shadow-lg border border-slate-200
            `}
          >
            {items.map((item, index) => (
              <React.Fragment key={index}>
                {item.divider ? (
                  <div className="h-px bg-slate-100 my-1" />
                ) : (
                  <button
                    onClick={() => {
                      item.onClick?.();
                      setIsOpen(false);
                    }}
                    disabled={item.disabled}
                    className={`
                      w-full px-4 py-2 text-left text-sm
                      flex items-center gap-3
                      transition-colors
                      ${item.disabled
                        ? 'text-slate-300 cursor-not-allowed'
                        : item.destructive
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-slate-700 hover:bg-slate-50'
                      }
                    `}
                  >
                    {item.icon && (
                      <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>
                    )}
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-slate-400">{item.shortcut}</span>
                    )}
                  </button>
                )}
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Select Component - Dropdown select input
 */
export function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  label,
  error,
  disabled = false,
  size = 'md',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[32px]',
    md: 'px-4 py-2.5 text-sm min-h-[42px]',
    lg: 'px-4 py-3 text-base min-h-[50px]',
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full rounded-xl border bg-white
            flex items-center justify-between gap-2
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${sizes[size]}
            ${disabled
              ? 'bg-slate-50 text-slate-500 cursor-not-allowed'
              : 'text-slate-900'
            }
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : isOpen
                ? 'border-indigo-500 ring-2 ring-indigo-100'
                : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
            }
          `}
        >
          <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="
                absolute top-full left-0 right-0 mt-1 z-50
                max-h-60 overflow-y-auto
                bg-white rounded-xl shadow-lg border border-slate-200
                py-1
              "
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  disabled={option.disabled}
                  className={`
                    w-full px-4 py-2 text-left text-sm
                    flex items-center justify-between
                    transition-colors
                    ${option.disabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : option.value === value
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }
                  `}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-indigo-600" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export default Dropdown;
