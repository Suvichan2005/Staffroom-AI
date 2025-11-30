import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './Button';

/**
 * Modal Component - Accessible dialog overlay
 * 
 * @param {boolean} isOpen - Control modal visibility
 * @param {Function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {string} description - Modal description
 * @param {'sm' | 'md' | 'lg' | 'xl' | 'full'} size - Modal width
 * @param {boolean} closable - Show close button
 * @param {boolean} closeOnOverlay - Close when clicking overlay
 * @param {boolean} closeOnEsc - Close on Escape key
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closable = true,
  closeOnOverlay = true,
  closeOnEsc = true,
  children,
  footer,
  className = '',
}) {
  // Handle escape key
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && closeOnEsc && closable) {
      onClose();
    }
  }, [closeOnEsc, closable, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)]',
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: 20,
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        duration: 0.3,
        bounce: 0.2,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 bg-black-900/50 backdrop-blur-sm"
            onClick={closeOnOverlay && closable ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              aria-describedby={description ? 'modal-description' : undefined}
              className={`
                w-full ${sizes[size]} ${className}
                bg-white rounded-2xl shadow-2xl
                flex flex-col max-h-[calc(100vh-2rem)]
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || closable) && (
                <div className="flex items-start justify-between p-4 sm:p-6 border-b border-black-100">
                  <div>
                    {title && (
                      <h2
                        id="modal-title"
                        className="text-lg font-semibold text-black-800"
                      >
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p
                        id="modal-description"
                        className="text-sm text-black-500 mt-1"
                      >
                        {description}
                      </p>
                    )}
                  </div>
                  {closable && (
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      aria-label="Close modal"
                      className="-mr-2 -mt-2"
                    >
                      <X />
                    </IconButton>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-black-100">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Confirmation Modal - Preset for confirm/cancel dialogs
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
}) {
  const { Button } = require('./Button');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-black-600">{message}</p>
    </Modal>
  );
}

export default Modal;
