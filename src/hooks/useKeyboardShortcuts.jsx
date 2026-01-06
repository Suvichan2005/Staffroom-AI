/**
 * Keyboard Shortcuts System
 * Provides global and contextual keyboard shortcuts throughout the app
 */

import { useEffect, useCallback, useState, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadUserState, saveUserState } from '../utils/userScopedStorage';

// Shortcut definitions
export const SHORTCUTS = {
  // Navigation
  'g+d': { 
    description: 'Go to Dashboard', 
    category: 'Navigation',
    action: (navigate) => navigate('/dashboard')
  },
  'g+c': { 
    description: 'Go to Classes', 
    category: 'Navigation',
    action: (navigate) => navigate('/classes')
  },
  'g+s': { 
    description: 'Go to Schedule', 
    category: 'Navigation',
    action: (navigate) => navigate('/schedule')
  },
  'g+a': { 
    description: 'Go to Assessments', 
    category: 'Navigation',
    action: (navigate) => navigate('/assessments')
  },
  'g+r': { 
    description: 'Go to Resources', 
    category: 'Navigation',
    action: (navigate) => navigate('/resources')
  },
  'g+p': { 
    description: 'Go to Profile', 
    category: 'Navigation',
    action: (navigate) => navigate('/profile')
  },

  // Actions
  '/': { 
    description: 'Focus AI Chat', 
    category: 'Actions',
    action: () => {
      const chatInput = document.querySelector('[data-chat-input]');
      if (chatInput) {
        chatInput.focus();
        return true;
      }
      return false;
    }
  },
  'Escape': { 
    description: 'Close modal/panel', 
    category: 'Actions',
    action: () => {
      // Try to close any open modal
      const closeButton = document.querySelector('[data-modal-close]');
      if (closeButton) {
        closeButton.click();
        return true;
      }
      // Or blur current focus
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
        return true;
      }
      return false;
    }
  },
  'ctrl+k': { 
    description: 'Command palette (AI Chat)', 
    category: 'Actions',
    action: () => {
      const chatInput = document.querySelector('[data-chat-input]');
      if (chatInput) {
        chatInput.focus();
        return true;
      }
      return false;
    }
  },

  // Help
  '?': { 
    description: 'Show keyboard shortcuts', 
    category: 'Help',
    action: (_, __, showHelp) => {
      showHelp?.();
      return true;
    }
  },
};

// Context for keyboard shortcuts
const KeyboardShortcutsContext = createContext(null);

export function KeyboardShortcutsProvider({ children }) {
  const navigate = useNavigate();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [enabled, setEnabled] = useState(() => 
    loadUserState('settings:keyboardShortcuts', true)
  );
  const [keyBuffer, setKeyBuffer] = useState([]);
  const [bufferTimeout, setBufferTimeout] = useState(null);

  const toggleEnabled = useCallback(() => {
    setEnabled(prev => {
      const newValue = !prev;
      saveUserState('settings:keyboardShortcuts', newValue);
      return newValue;
    });
  }, []);

  const handleKeyDown = useCallback((event) => {
    // Skip if disabled or in input/textarea
    if (!enabled) return;
    
    const target = event.target;
    const tagName = target.tagName.toLowerCase();
    const isEditable = target.isContentEditable || 
                       tagName === 'input' || 
                       tagName === 'textarea' || 
                       tagName === 'select';

    // Allow some shortcuts even in inputs
    const allowedInInput = ['Escape', 'ctrl+k'];
    const key = event.key;
    const combo = `${event.ctrlKey ? 'ctrl+' : ''}${event.metaKey ? 'meta+' : ''}${event.altKey ? 'alt+' : ''}${key}`;
    
    if (isEditable && !allowedInInput.includes(combo)) {
      return;
    }

    // Handle single-key shortcuts
    if (SHORTCUTS[key]) {
      event.preventDefault();
      SHORTCUTS[key].action(navigate, null, () => setShowShortcutsModal(true));
      return;
    }

    // Handle combo shortcuts like ctrl+k
    if (SHORTCUTS[combo]) {
      event.preventDefault();
      SHORTCUTS[combo].action(navigate, null, () => setShowShortcutsModal(true));
      return;
    }

    // Handle sequence shortcuts like g+d
    // Clear existing timeout
    if (bufferTimeout) {
      clearTimeout(bufferTimeout);
    }

    // Add key to buffer
    const newBuffer = [...keyBuffer, key].slice(-2);
    setKeyBuffer(newBuffer);

    // Check for matching shortcut
    const sequence = newBuffer.join('+');
    if (SHORTCUTS[sequence]) {
      event.preventDefault();
      setKeyBuffer([]);
      SHORTCUTS[sequence].action(navigate, null, () => setShowShortcutsModal(true));
      return;
    }

    // Set timeout to clear buffer
    const timeout = setTimeout(() => {
      setKeyBuffer([]);
    }, 1000);
    setBufferTimeout(timeout);

  }, [enabled, navigate, keyBuffer, bufferTimeout]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
      }
    };
  }, [handleKeyDown, bufferTimeout]);

  return (
    <KeyboardShortcutsContext.Provider value={{ 
      enabled, 
      toggleEnabled,
      showShortcutsModal,
      setShowShortcutsModal 
    }}>
      {children}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    // Return a no-op context if not wrapped
    return { enabled: false, toggleEnabled: () => {}, showShortcutsModal: false, setShowShortcutsModal: () => {} };
  }
  return context;
}

// Modal showing all shortcuts
function KeyboardShortcutsModal({ onClose }) {
  // Group shortcuts by category
  const grouped = Object.entries(SHORTCUTS).reduce((acc, [key, shortcut]) => {
    const category = shortcut.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ key, ...shortcut });
    return acc;
  }, {});

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            ⌨️ Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            data-modal-close
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {Object.entries(grouped).map(([category, shortcuts]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map(({ key, description }) => (
                  <div 
                    key={key}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {description}
                    </span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                      {formatShortcut(key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">?</kbd> anytime to show this dialog
          </p>
        </div>
      </div>
    </div>
  );
}

// Format shortcut key for display
function formatShortcut(key) {
  return key
    .replace('ctrl+', 'Ctrl + ')
    .replace('meta+', '⌘ + ')
    .replace('alt+', 'Alt + ')
    .replace('g+', 'G then ')
    .replace(/\+$/, '')
    .toUpperCase();
}

// Hook for registering custom shortcuts
export function useShortcut(key, callback, deps = []) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const isEditable = target.isContentEditable || 
                         target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA';
      
      if (isEditable && key !== 'Escape') return;

      const combo = `${event.ctrlKey ? 'ctrl+' : ''}${event.metaKey ? 'meta+' : ''}${event.key}`;
      
      if (combo === key || event.key === key) {
        event.preventDefault();
        callback(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, ...deps]);
}
