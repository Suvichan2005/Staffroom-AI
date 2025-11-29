import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Sheet Component - Bottom sheet for mobile, slide-over for desktop
 * 
 * @param {boolean} isOpen - Control sheet visibility
 * @param {Function} onClose - Close handler
 * @param {string} title - Sheet title
 * @param {'bottom' | 'right' | 'left'} position - Sheet position
 * @param {boolean} draggable - Enable drag to close (mobile bottom sheets)
 * @param {'sm' | 'md' | 'lg' | 'full' | 'auto'} height - Sheet height (for bottom)
 * @param {'sm' | 'md' | 'lg'} width - Sheet width (for side sheets)
 */
export function Sheet({
  isOpen,
  onClose,
  title,
  position = 'bottom',
  draggable = true,
  height = 'auto',
  width = 'md',
  children,
  className = '',
}) {
  const dragControls = useDragControls();

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const heights = {
    sm: 'max-h-[30vh]',
    md: 'max-h-[50vh]',
    lg: 'max-h-[70vh]',
    full: 'h-[calc(100vh-2rem)]',
    auto: 'max-h-[85vh]',
  };

  const widths = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[480px]',
  };

  const getVariants = () => {
    if (position === 'bottom') {
      return {
        hidden: { y: '100%' },
        visible: { 
          y: 0,
          transition: { type: 'spring', damping: 30, stiffness: 300 },
        },
        exit: { y: '100%', transition: { duration: 0.2 } },
      };
    }
    if (position === 'right') {
      return {
        hidden: { x: '100%' },
        visible: { 
          x: 0,
          transition: { type: 'spring', damping: 30, stiffness: 300 },
        },
        exit: { x: '100%', transition: { duration: 0.2 } },
      };
    }
    return {
      hidden: { x: '-100%' },
      visible: { 
        x: 0,
        transition: { type: 'spring', damping: 30, stiffness: 300 },
      },
      exit: { x: '-100%', transition: { duration: 0.2 } },
    };
  };

  const handleDragEnd = useCallback((event, info) => {
    if (position === 'bottom' && info.offset.y > 100) {
      onClose();
    } else if (position === 'right' && info.offset.x > 100) {
      onClose();
    } else if (position === 'left' && info.offset.x < -100) {
      onClose();
    }
  }, [position, onClose]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            variants={getVariants()}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={draggable ? (position === 'bottom' ? 'y' : 'x') : false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={`
              absolute bg-white shadow-2xl
              ${position === 'bottom' ? `
                bottom-0 left-0 right-0
                rounded-t-3xl
                ${heights[height]}
              ` : ''}
              ${position === 'right' ? `
                top-0 right-0 bottom-0
                ${widths[width]}
              ` : ''}
              ${position === 'left' ? `
                top-0 left-0 bottom-0
                ${widths[width]}
              ` : ''}
              ${className}
            `}
          >
            {/* Drag Handle (Bottom Sheet) */}
            {position === 'bottom' && draggable && (
              <div
                className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="w-10 h-1 bg-slate-300 rounded-full" />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Action Sheet - Quick action list for mobile
 */
export function ActionSheet({
  isOpen,
  onClose,
  title,
  actions = [],
  cancelText = 'Cancel',
}) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} position="bottom" height="auto">
      {title && (
        <p className="text-center text-sm text-slate-500 mb-4">{title}</p>
      )}
      
      <div className="space-y-1">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onClick?.();
              onClose();
            }}
            className={`
              w-full px-4 py-3 text-left rounded-xl
              flex items-center gap-3
              transition-colors
              ${action.destructive
                ? 'text-red-600 hover:bg-red-50'
                : 'text-slate-700 hover:bg-slate-100'
              }
            `}
          >
            {action.icon && (
              <span className="flex-shrink-0">{action.icon}</span>
            )}
            <div>
              <div className="font-medium">{action.label}</div>
              {action.description && (
                <div className="text-sm text-slate-500">{action.description}</div>
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full mt-4 px-4 py-3 text-center font-medium text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
      >
        {cancelText}
      </button>
    </Sheet>
  );
}

export default Sheet;
