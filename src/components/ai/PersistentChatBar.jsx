import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Send, Sparkles, ChevronDown, Paperclip,
  Loader2, MessageSquare, BookOpen, FileText, Lightbulb,
  Volume2, Check, AlertCircle, X, Image, File, Camera
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import { useAI } from '../../context/AIContext';
import { getChatPlugins } from '../../plugins';

/**
 * Persistent Chat Bar - Mobile bottom bar that expands when active
 * 
 * Features:
 * - Collapsed: Shows input bar with attach/mic/send above BottomNav
 * - Expanded: Full chat interface with WhatsApp-style bubbles
 * - Mic transforms to Send when typing
 * - Smooth spring animations
 * - Plugin integration for VoiceProgressLogger and SyllabusAIHelper
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
    aiContext,
    plugins,
    getPluginAPI,
  } = useAI();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [activePluginPanel, setActivePluginPanel] = useState(null);
  
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const expandedInputRef = useRef(null);

  const hasText = inputValue.trim().length > 0;

  // Get registered plugins
  const registeredPlugins = getChatPlugins();

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
  };

  const handleMicClick = () => {
    if (hasText) {
      handleSend();
    } else {
      toggleRecording();
    }
  };

  const handleAttach = (type) => {
    setShowAttachMenu(false);
    // TODO: Implement file attachment
    console.log('Attach:', type);
  };

  // Quick suggestions
  const suggestions = [
    "📅 Today's schedule",
    "📊 Attendance summary",
    "📝 Pending tasks",
    "⚠️ Students at risk",
  ];

  const tabs = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'tools', icon: Sparkles, label: 'Tools' },
  ];

  const attachOptions = [
    { icon: Image, label: 'Photo', type: 'image' },
    { icon: Camera, label: 'Camera', type: 'camera' },
    { icon: File, label: 'Document', type: 'document' },
  ];

  // Plugin API for rendering
  const pluginAPI = getPluginAPI ? getPluginAPI() : null;

  // Render plugin controls in the input area
  const renderPluginControls = () => {
    if (!registeredPlugins.length) return null;
    
    return registeredPlugins.map(plugin => {
      if (plugin.renderControls) {
        return (
          <div key={plugin.id} className="plugin-control">
            {plugin.renderControls({ 
              context: aiContext, 
              api: pluginAPI,
              isExpanded: false,
            })}
          </div>
        );
      }
      return null;
    });
  };

  // Render plugin expanded panels
  const renderPluginExpandedPanel = (pluginId) => {
    const plugin = registeredPlugins.find(p => p.id === pluginId);
    if (plugin && plugin.renderExpandedPanel) {
      return plugin.renderExpandedPanel({
        context: aiContext,
        api: pluginAPI,
        onClose: () => setActivePluginPanel(null),
      });
    }
    return null;
  };

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Attach Menu */}
      <AnimatePresence>
        {showAttachMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAttachMenu(false)}
              className="fixed inset-0 z-[51]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-32 left-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-[52]"
            >
              {attachOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => handleAttach(option.type)}
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

      {/* Chat Bar Container */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? '85vh' : 'auto',
        }}
        transition={{ 
          type: 'tween', 
          duration: 0.25,
          ease: 'easeOut',
        }}
        className={`
          fixed left-0 right-0 z-50
          ${isExpanded ? 'bottom-0 rounded-t-3xl shadow-2xl' : 'bottom-16'}
          bg-white
          ${isExpanded ? 'border-t border-slate-200' : ''}
          ${className}
        `}
        style={{ paddingBottom: isExpanded ? 'env(safe-area-inset-bottom)' : '0' }}
      >
        {/* Collapsed Input Bar */}
        {!isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2.5"
          >
            {/* Attach Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAttachMenu(true)}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </motion.button>
            
            {/* Input Field */}
            <div 
              className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-2xl cursor-text"
              onClick={() => setIsExpanded(true)}
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-sm text-slate-500">Ask Staffroom AI...</span>
            </div>

            {/* Mic/Send Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleMicClick}
              className={`
                p-2.5 rounded-xl transition-all
                ${hasText 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                }
              `}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={hasText ? 'send' : 'mic'}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                >
                  {hasText ? <Send className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </motion.div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <motion.div
            key="expanded-chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="h-full flex flex-col"
          >
            {/* Header with drag handle */}
              <div className="relative">
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-slate-300 rounded-full" />
                </div>
                
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

              {/* Tab Bar */}
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100">
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

              {/* Chat Content */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50">
                {activeTab === 'chat' && (
                  <div className="p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                          className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mb-4"
                        >
                          <Sparkles className="w-10 h-10 text-indigo-600" />
                        </motion.div>
                        <p className="text-base font-semibold text-slate-800 mb-1">How can I help today?</p>
                        <p className="text-sm text-slate-500 mb-6">Ask me anything about your classes</p>
                        
                        {/* Quick Suggestions */}
                        <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
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
                        {messages.map((msg, idx) => (
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

                {activeTab === 'tools' && (
                  <div className="p-4 space-y-3">
                    {/* Check for syllabus-ai-helper plugin */}
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
                            <tool.icon className="w-6 h-6 text-white" />
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
              {activeTab === 'chat' && (
                <div className="p-3 bg-white border-t border-slate-100">
                  <div className="flex items-end gap-2">
                    {/* Attach */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowAttachMenu(true)}
                      className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex-shrink-0"
                    >
                      <Paperclip className="w-5 h-5" />
                    </motion.button>

                    {/* Text Input */}
                    <div className="flex-1 relative">
                      <textarea
                        ref={expandedInputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all max-h-32"
                        style={{ minHeight: '44px' }}
                      />
                    </div>

                    {/* Mic/Send */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleMicClick}
                      disabled={isLoading}
                      className={`
                        p-3 rounded-xl transition-all flex-shrink-0
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
              )}
            </motion.div>
          )}
      </motion.div>
    </>
  );
}
