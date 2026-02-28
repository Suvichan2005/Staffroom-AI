import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Send, Sparkles, ChevronDown, ChevronUp, Paperclip,
  Loader2, MessageSquare, X, Maximize2, Minimize2,
  Square, Trash2, Plus, History, Check
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import { useLayout } from '../../context/LayoutContext';
import { useAI } from '../../context/AIContext';
import { getChatPlugins } from '../../plugins';

/**
 * Desktop Persistent Chat Bar - Centered bottom bar for desktop
 * 
 * Architecture:
 * - Input bar is ALWAYS visible and functional at the bottom
 * - Chat panel expands ABOVE the input bar when activated
 * - Single real input that's always interactive
 * - Properly centered accounting for sidebar width
 */
function DesktopChatBarContent({ className = '' }) {
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isRecording,
    liveStatus,
    liveTranscript,
    startRecording,
    stopRecording,
    sendMessage,
    clearChat,
    aiContext,
    getPluginAPI,
    chatHistory,
    currentSessionId,
    loadChatSession,
    startNewChatSession,
    deleteChatSessionById,
  } = useAI();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const { sidebarCollapsed } = useLayout();
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const hasText = inputValue.trim().length > 0;
  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  // Get registered plugins
  const registeredPlugins = getChatPlugins();
  const pluginAPI = getPluginAPI ? getPluginAPI() : null;

  // Auto-scroll to bottom
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  // Handle clear chat
  const handleClearChat = useCallback(() => {
    clearChat();
    setShowClearConfirm(false);
  }, [clearChat]);

  // Handle session switch
  const handleLoadSession = useCallback((sessionId) => {
    loadChatSession(sessionId);
    setShowHistory(false);
  }, [loadChatSession]);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    startNewChatSession();
    setShowHistory(false);
  }, [startNewChatSession]);

  // Handle delete chat
  const handleDeleteChat = useCallback((e, sessionId) => {
    e.stopPropagation();
    deleteChatSessionById(sessionId);
  }, [deleteChatSessionById]);

  // Format date for history
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  }, [handleSend]);

  // Handle mic button - start recording or send text
  const handleMicClick = useCallback(() => {
    if (hasText) {
      // If there's text, send it
      handleSend();
    } else {
      // Start voice recording
      setIsExpanded(true);
      startRecording();
    }
  }, [hasText, handleSend, startRecording]);

  // Handle stop recording
  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // Handle input focus - expand chat
  const handleInputFocus = useCallback(() => {
    setIsExpanded(true);
  }, []);

  // Quick suggestions
  const suggestions = [
    "📅 What's my schedule today?",
    "📊 Show attendance summary",
    "📝 Pending tasks",
    "⚠️ Students needing attention",
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Chat Bar Container - Fixed at bottom, centered */}
      <div 
        className={`fixed bottom-4 z-50 transition-all duration-300 ${className}`}
        style={{ 
          left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2)`,
          transform: 'translateX(-50%)',
          width: `min(560px, calc(100vw - ${sidebarWidth}px - 48px))`,
          maxWidth: '560px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Expandable Chat Panel - slides up from input bar */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 420, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-t-2xl border border-slate-200 border-b-0 overflow-hidden mb-0"
              style={{ boxShadow: '0 -8px 30px rgba(0,0,0,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">Staffroom AI</h3>
                        <p className="text-xs text-indigo-200">Your teaching assistant</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* History Button */}
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-2 rounded-xl transition-colors ${showHistory ? 'bg-white/30' : 'hover:bg-white/10'}`}
                        title="Chat history"
                      >
                        <History className="w-5 h-5" />
                      </button>
                      {/* New Chat Button */}
                      <button
                        onClick={handleNewChat}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        title="New chat"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      {/* Clear Chat Button */}
                      {messages.length > 0 && (
                        showClearConfirm ? (
                          <div className="flex items-center gap-1 bg-white/20 rounded-xl px-2 py-1">
                            <span className="text-xs">Clear?</span>
                            <button
                              onClick={handleClearChat}
                              className="p-1 hover:bg-white/20 rounded-lg"
                              title="Confirm"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowClearConfirm(false)}
                              className="p-1 hover:bg-white/20 rounded-lg"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowClearConfirm(true)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                            title="Clear chat"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )
                      )}
                      {/* Close Button */}
                      <button
                        onClick={() => setIsExpanded(false)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* History Dropdown */}
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white border-b border-slate-200 overflow-hidden"
                    >
                      <div className="p-3 max-h-48 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent Chats</p>
                          <button
                            onClick={handleNewChat}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            <Plus className="w-3 h-3" />
                            New
                          </button>
                        </div>
                        {chatHistory.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2">No chat history yet</p>
                        ) : (
                          <div className="space-y-1">
                            {chatHistory.slice(0, 10).map((session) => (
                              <div
                                key={session.id}
                                className={`group flex items-center gap-1 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                  session.id === currentSessionId
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'hover:bg-slate-100 text-slate-600'
                                }`}
                              >
                                <button
                                  onClick={() => handleLoadSession(session.id)}
                                  className="flex-1 text-left min-w-0"
                                >
                                  <p className="font-medium truncate">{session.title || 'New Chat'}</p>
                                  <p className="text-slate-400 text-[10px]">
                                    {formatDate(session.updatedAt)}
                                    {session.messages ? ` · ${session.messages.length} msgs` : ''}
                                  </p>
                                </button>
                                <button
                                  onClick={(e) => handleDeleteChat(e, session.id)}
                                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all flex-shrink-0"
                                  title="Delete chat"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50">
                  <div className="p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-14 h-14 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-3">
                          <Sparkles className="w-7 h-7 text-indigo-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mb-1">How can I help today?</p>
                        <p className="text-xs text-slate-500 mb-4">Ask me anything about your classes</p>
                        
                        {/* Quick Suggestions */}
                        <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
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
        <div className={`bg-white ${isExpanded ? 'rounded-b-2xl border-x border-b' : 'rounded-2xl shadow-lg border'} border-slate-200 overflow-hidden`}>
          <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Attach Button - hide when recording */}
            {!isRecording && (
              <button
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex-shrink-0"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            )}
            
            {/* Input Field - hidden when recording, shown otherwise */}
            {!isRecording ? (
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
                  placeholder="Ask Staffroom AI anything..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition-all"
                  disabled={isRecording}
                />
              </div>
            ) : (
              /* Live transcript display when recording - with wrapping */
              <div className="flex-1 flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-200 min-h-[2.5rem]">
                <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                  {[0, 1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      className="w-1 h-4 bg-red-500 rounded-full"
                      animate={{ scaleY: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm text-red-700 flex-1 break-words">
                  {liveTranscript || 'Listening...'}
                </span>
                <span className="text-xs text-red-500 px-2 py-0.5 bg-red-100 rounded-full flex-shrink-0 self-start">
                  {liveStatus === 'streaming' ? '🔴 Live' : liveStatus}
                </span>
              </div>
            )}

            {/* Expand Button - show when chat is collapsed (also during recording!) */}
            {!isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex-shrink-0"
                title="Expand chat"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            )}

            {/* Action Button - Mic/Send/Stop */}
            {isRecording ? (
              /* Stop button when recording */
              <button
                onClick={handleStopRecording}
                className="p-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all flex-shrink-0 shadow-lg"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            ) : (
              /* Mic/Send button */
              <button
                onClick={handleMicClick}
                disabled={isLoading}
                className={`
                  p-2.5 rounded-xl transition-all flex-shrink-0
                  ${hasText 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
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
            )}
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Error Boundary Class Component
 * Catches hook errors during hot-reload
 */
class DesktopChatBarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[DesktopChatBar] Error caught:', error.message);
    // Auto-recover after a short delay (for HMR issues)
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
    if (this.state.errorCount < 3) {
      setTimeout(() => {
        this.setState({ hasError: false });
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * Exported component wrapped in error boundary
 */
export default function DesktopChatBar(props) {
  return (
    <DesktopChatBarErrorBoundary>
      <DesktopChatBarContent {...props} />
    </DesktopChatBarErrorBoundary>
  );
}
