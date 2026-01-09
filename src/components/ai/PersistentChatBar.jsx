import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Send, Sparkles, ChevronDown, Paperclip,
  Loader2, X, Image, File, Camera
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import { useAI } from '../../context/AIContext';

/**
 * Persistent Chat Bar - Mobile bottom bar with expandable chat panel
 * 
 * Architecture:
 * - Input bar is ALWAYS visible and functional at the bottom
 * - Chat panel expands ABOVE the input bar when activated
 * - Single real input that's always interactive
 */
export default function PersistentChatBar({ className = '' }) {
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isRecording,
    toggleRecording,
    sendMessage,
  } = useAI();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const hasText = inputValue.trim().length > 0;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  // Handle send message
  const handleSend = useCallback(async (text = inputValue) => {
    if (!text.trim()) return;
    
    // Auto-expand to show the response
    if (!isExpanded) {
      setIsExpanded(true);

    }
    
    await sendMessage(text);
  }, [inputValue, sendMessage, isExpanded]);

  // Handle keyboard
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle mic button
  const handleMicClick = useCallback(() => {
    if (hasText) {
      handleSend();
    } else {
      // Expand when starting to record
      if (!isRecording) {
        setIsExpanded(true);
        setActiveTab('chat');
      }
      toggleRecording();
    }
  }, [hasText, handleSend, isRecording, toggleRecording]);

  // Handle input focus - expand chat
  const handleInputFocus = useCallback(() => {
    setIsExpanded(true);
  }, []);

  // Attach menu options
  const attachOptions = [
    { icon: Image, label: 'Photo', type: 'image' },
    { icon: Camera, label: 'Camera', type: 'camera' },
    { icon: File, label: 'Document', type: 'document' },
  ];

  // Quick suggestions
  const suggestions = [
    "📅 Today's schedule",
    "📊 Attendance summary",
    "📝 Pending tasks",
    "⚠️ Students at risk",
  ];

  return (
    <>
      {/* Backdrop when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Attach Menu Popup */}
      <AnimatePresence>
        {showAttachMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAttachMenu(false)}
              className="fixed inset-0 z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-24 left-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-[61]"
            >
              {attachOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => {
                    setShowAttachMenu(false);
                    console.log('Attach:', option.type);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <option.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{option.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Container - Fixed at bottom, above BottomNav */}
      <div 
        className={`fixed left-0 right-0 bottom-16 z-50 ${className}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Expandable Chat Panel - slides up from input bar */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '65vh', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-t-3xl border-t border-x border-slate-200 overflow-hidden"
              style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0">
                  {/* Drag Handle */}
                  <div 
                    className="flex justify-center pt-3 pb-1 cursor-pointer"
                    onClick={() => setIsExpanded(false)}
                  >
                    <div className="w-10 h-1 bg-slate-300 rounded-full" />
                  </div>
                  
                  {/* Title Bar */}
                  <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Staffroom AI</h3>
                        <p className="text-xs text-slate-500">Your teaching assistant</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                  <div className="p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-14 h-14 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-3">
                          <Sparkles className="w-7 h-7 text-indigo-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mb-1">How can I help?</p>
                        <p className="text-xs text-slate-500 mb-4">Ask me anything about your classes</p>
                        
                        {/* Quick Suggestions */}
                        <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
                            {suggestions.map((suggestion, i) => (
                              <button
                                key={i}
                                onClick={() => handleSend(suggestion)}
                                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-full text-xs transition-all shadow-sm"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          {messages.map((msg) => (
                            <ChatMessage key={msg.id} message={msg} />
                          ))}
                          {isLoading && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl rounded-tl-md w-fit shadow-sm">
                              <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                  <motion.div
                                    key={i}
                                    className="w-2 h-2 bg-indigo-400 rounded-full"
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{
                                      duration: 0.5,
                                      repeat: Infinity,
                                      delay: i * 0.1,
                                    }}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-slate-500 ml-1">Thinking...</span>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Always-Visible Input Bar */}
        <div className="bg-white border-t border-slate-200 px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Attach Button */}
            <button
              onClick={() => setShowAttachMenu(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex-shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            {/* Input Field - Always real and interactive */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/3 -translate-y-1/2 pointer-events-none">
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                placeholder="Ask Staffroom AI..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition-all"
              />
            </div>


            {/* Expand Button - visible when recording and collapsed */}
            {isRecording && !isExpanded && (
              <button
                onClick={() => {
                  setIsExpanded(true);
                  setActiveTab('chat');
                }}
                className="p-2.5 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all flex-shrink-0"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            )}

            {/* Mic/Send Button */}
            <button
              onClick={handleMicClick}
              disabled={isLoading}
              className={`
                p-2.5 rounded-xl transition-all flex-shrink-0
                ${hasText 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                }
                disabled:opacity-50
              `}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : hasText ? (
                <Send className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
