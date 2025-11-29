import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Send, Sparkles, ChevronDown, ChevronUp, Paperclip,
  Loader2, MessageSquare, X, Maximize2, Minimize2,
  FileText, BookOpen, Lightbulb
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import { useLayout } from '../../context/LayoutContext';
import { useAI } from '../../context/AIContext';
import { getChatPlugins } from '../../plugins';

/**
 * Desktop Persistent Chat Bar - Centered bottom bar for desktop
 * 
 * Features:
 * - Collapsed: Shows centered input bar at bottom of screen
 * - Expanded: Full chat interface that pops up from the bar
 * - Mic transforms to Send when typing
 * - Smooth spring animations
 * - Properly centered accounting for sidebar width
 * - Plugin integration for VoiceProgressLogger and SyllabusAIHelper
 */
export default function DesktopChatBar({ className = '' }) {
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isRecording,
    toggleRecording,
    sendMessage,
    aiContext,
    getPluginAPI,
  } = useAI();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  const { sidebarCollapsed } = useLayout();
  const inputRef = useRef(null);
  const expandedInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const hasText = inputValue.trim().length > 0;
  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  // Get registered plugins
  const registeredPlugins = getChatPlugins();
  const pluginAPI = getPluginAPI ? getPluginAPI() : null;

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded && activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isExpanded, activeTab]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && expandedInputRef.current) {
      setTimeout(() => expandedInputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const handleSend = async (text = inputValue) => {
    if (!text.trim()) return;
    await sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  const handleMicClick = () => {
    if (hasText) {
      handleSend();
    } else {
      toggleRecording();
    }
  };

  // Quick suggestions
  const suggestions = [
    "📅 What's my schedule today?",
    "📊 Show attendance summary",
    "📝 Pending tasks",
    "⚠️ Students needing attention",
  ];

  // Tabs including plugin tools
  const tabs = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'tools', icon: Sparkles, label: 'Tools' },
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

      {/* Chat Bar Container */}
      <div 
        className={`fixed bottom-4 z-50 transition-all duration-300 ${className}`}
        style={{ 
          left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2)`,
          transform: 'translateX(-50%)',
          width: `min(560px, calc(100vw - ${sidebarWidth}px - 48px))`,
          maxWidth: '560px'
        }}
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            /* Expanded Chat Panel */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white rounded-t-3xl shadow-2xl border border-slate-200 border-b-0 overflow-hidden mb-0"
              style={{ height: '500px' }}
            >
              {/* Header */}
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
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Bar */}
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-white">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                        ${isActive 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'text-slate-500 hover:bg-slate-100'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto bg-slate-50" style={{ height: '290px' }}>
                {/* Chat Tab */}
                {activeTab === 'chat' && (
                  <div className="p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                          className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4"
                        >
                          <Sparkles className="w-8 h-8 text-indigo-600" />
                        </motion.div>
                        <p className="text-base font-semibold text-slate-800 mb-1">How can I help today?</p>
                        <p className="text-sm text-slate-500 mb-6">Ask me anything about your classes</p>
                        
                        {/* Quick Suggestions */}
                        <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                          {suggestions.map((suggestion, i) => (
                            <motion.button
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              onClick={() => handleSend(suggestion)}
                              className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-full text-sm transition-all shadow-sm"
                            >
                              {suggestion}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg) => (
                          <ChatMessage key={msg.id} message={msg} />
                        ))}
                        {isLoading && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl rounded-tl-md w-fit shadow-sm"
                          >
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
                          </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                )}

                {/* Tools Tab - Renders SyllabusAIHelper plugin */}
                {activeTab === 'tools' && (
                  <div className="p-4 space-y-3">
                    {(() => {
                      const syllabusPlugin = registeredPlugins.find(p => p.id === 'syllabus-ai-helper');
                      if (syllabusPlugin && syllabusPlugin.renderExpandedPanel) {
                        return syllabusPlugin.renderExpandedPanel({
                          context: aiContext,
                          api: pluginAPI,
                          onClose: () => setActiveTab('chat'),
                        });
                      }
                      // Fallback tools UI
                      return [
                        { icon: FileText, label: 'Generate Quiz', desc: 'Create questions for any topic', color: 'from-blue-500 to-indigo-500' },
                        { icon: BookOpen, label: 'Create Assignment', desc: 'Generate homework with rubric', color: 'from-purple-500 to-pink-500' },
                        { icon: Lightbulb, label: 'Suggest Topic', desc: 'AI-powered recommendations', color: 'from-amber-500 to-orange-500' },
                      ].map((tool, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left"
                        >
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${tool.color}`}>
                            <tool.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">{tool.label}</p>
                            <p className="text-sm text-slate-500">{tool.desc}</p>
                          </div>
                        </motion.button>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-slate-100">
                <div className="flex items-center gap-3">
                  {/* Attach */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </motion.button>

                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <input
                      ref={expandedInputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Mic/Send */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleMicClick}
                    disabled={isLoading}
                    className={`
                      p-3 rounded-xl transition-all
                      ${hasText 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                        : isRecording
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={hasText ? 'send' : isLoading ? 'loading' : 'mic'}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ duration: 0.15 }}
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : hasText ? (
                          <Send className="w-5 h-5" />
                        ) : (
                          <Mic className="w-5 h-5" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Collapsed Input Bar */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="mb-4"
            >
              <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-lg border border-slate-200">
                {/* Attach Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </motion.button>
                
                {/* Input Field - Click to expand */}
                <div 
                  className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-slate-100 rounded-xl cursor-text hover:bg-slate-50 transition-colors"
                  onClick={() => setIsExpanded(true)}
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm text-slate-500">Ask Staffroom AI anything...</span>
                </div>

                {/* Mic Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleMicClick}
                  className={`
                    p-2.5 rounded-xl transition-all
                    ${isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }
                  `}
                >
                  <Mic className="w-5 h-5" />
                </motion.button>

                {/* Expand Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsExpanded(true)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                >
                  <ChevronUp className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
