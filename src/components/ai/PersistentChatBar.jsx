import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Send, Sparkles, ChevronDown, ChevronUp, Paperclip,
  Loader2, X, Square, Trash2, Plus, History, Check,
  FileText
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import { useAISafe } from '../../context/AIContext';

/**
 * Persistent Chat Bar - Mobile bottom bar with expandable chat panel
 * Full feature parity with DesktopChatBar:
 *   - Real AI context (messages, voice agent, attachments, sessions)
 *   - Chat history sidebar
 *   - File attachments
 *   - Voice agent with live transcript
 *   - Session management (new / delete / switch)
 */
export default function PersistentChatBar({ className = '' }) {
  const ai = useAISafe();

  // Gracefully handle missing context (e.g. during HMR)
  if (!ai) return null;

  return <PersistentChatBarInner className={className} />;
}

function PersistentChatBarInner({ className = '' }) {
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
    chatHistory,
    currentSessionId,
    loadChatSession,
    startNewChatSession,
    deleteChatSessionById,
    attachments,
    addAttachment,
    removeAttachment,
  } = useAISafe();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const hasText = inputValue.trim().length > 0;
  const hasContent = hasText || (attachments && attachments.length > 0);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isExpanded && !showHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded, showHistory]);

  // ── File attachments ────────────────────────────────────────────
  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const fileData = {
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      };
      addAttachment(fileData);
    });
    e.target.value = '';
    setIsExpanded(true);
    setShowHistory(false);
  }, [addAttachment]);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ── Send / keyboard ────────────────────────────────────────────
  const handleSend = useCallback(async (text = inputValue) => {
    if (!text.trim() && (!attachments || attachments.length === 0)) return;
    if (!isExpanded) setIsExpanded(true);
    setShowHistory(false);
    await sendMessage(text);
  }, [inputValue, sendMessage, isExpanded, attachments]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Voice agent ─────────────────────────────────────────────────
  const handleMicClick = useCallback(() => {
    if (hasContent) {
      handleSend();
    } else {
      setShowHistory(false);
      startRecording();
    }
  }, [hasContent, handleSend, startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleInputFocus = useCallback(() => {
    setIsExpanded(true);
    setShowHistory(false);
  }, []);

  // ── Session management ──────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    startNewChatSession();
    setShowHistory(false);
  }, [startNewChatSession]);

  const handleLoadSession = useCallback((sessionId) => {
    loadChatSession(sessionId);
    setShowHistory(false);
  }, [loadChatSession]);

  const handleDeleteChat = useCallback((e, sessionId) => {
    e.stopPropagation();
    deleteChatSessionById(sessionId);
  }, [deleteChatSessionById]);

  const handleClearChat = useCallback(() => {
    clearChat();
    setShowClearConfirm(false);
  }, [clearChat]);

  // ── Helpers ─────────────────────────────────────────────────────
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

  const suggestions = [
    "📅 Today's schedule",
    "📊 Attendance summary",
    "📝 Pending tasks",
    "⚠️ Students at risk",
  ];

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
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
            onClick={() => { setIsExpanded(false); setShowHistory(false); }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Main Chat Container — fixed above BottomNav */}
      <div
        className={`fixed left-0 right-0 bottom-16 z-50 ${className}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Expandable Chat Panel ─────────────────────────────── */}
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
                  {/* Drag handle */}
                  <div
                    className="flex justify-center pt-3 pb-1 cursor-pointer"
                    onClick={() => { setIsExpanded(false); setShowHistory(false); }}
                  >
                    <div className="w-10 h-1 bg-slate-300 rounded-full" />
                  </div>

                  {/* Title bar + action buttons */}
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

                    <div className="flex items-center gap-1">
                      {/* History toggle */}
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-2 rounded-xl transition-colors ${showHistory ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
                        title="Chat history"
                      >
                        <History className="w-5 h-5" />
                      </button>
                      {/* New chat */}
                      <button
                        onClick={handleNewChat}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                        title="New chat"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      {/* Clear / confirm */}
                      {messages.length > 0 && (
                        showClearConfirm ? (
                          <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-xl px-2 py-1">
                            <span className="text-xs text-red-600">Clear?</span>
                            <button onClick={handleClearChat} className="p-1 hover:bg-red-100 rounded-lg">
                              <Check className="w-4 h-4 text-red-600" />
                            </button>
                            <button onClick={() => setShowClearConfirm(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                              <X className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowClearConfirm(true)}
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                            title="Clear chat"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )
                      )}
                      {/* Close */}
                      <button
                        onClick={() => { setIsExpanded(false); setShowHistory(false); }}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── History Panel (collapsible) ──────────────────── */}
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-b border-slate-200 overflow-hidden flex-shrink-0"
                    >
                      <div className="p-3 max-h-48 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent Chats</p>
                          <button onClick={handleNewChat} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                            <Plus className="w-3 h-3" /> New
                          </button>
                        </div>
                        {chatHistory.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2">No chat history yet</p>
                        ) : (
                          <div className="space-y-1">
                            {chatHistory.slice(0, 15).map((session) => (
                              <div
                                key={session.id}
                                className={`group flex items-center gap-1 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                  session.id === currentSessionId
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'hover:bg-slate-100 text-slate-600'
                                }`}
                              >
                                <button onClick={() => handleLoadSession(session.id)} className="flex-1 text-left min-w-0">
                                  <p className="font-medium truncate">{session.title || 'New Chat'}</p>
                                  <p className="text-slate-400 text-[10px]">
                                    {formatDate(session.updatedAt)}
                                    {session.messages ? ` · ${session.messages.length} msgs` : ''}
                                  </p>
                                </button>
                                <button
                                  onClick={(e) => handleDeleteChat(e, session.id)}
                                  className="p-1 rounded opacity-0 group-hover:opacity-100 active:opacity-100 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all flex-shrink-0"
                                  title="Delete"
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

                {/* ── Scrollable Messages ──────────────────────────── */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                  <div className="p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-14 h-14 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-3">
                          <Sparkles className="w-7 h-7 text-indigo-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mb-1">How can I help?</p>
                        <p className="text-xs text-slate-500 mb-4">Ask me anything about your classes</p>

                        {/* Quick suggestions */}
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

        {/* ── Always-Visible Input Bar ─────────────────────────── */}
        <div className="bg-white border-t border-slate-200 overflow-hidden">
          {/* Attachment previews */}
          {attachments && attachments.length > 0 && (
            <div className="px-3 pt-2 flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                  {att.previewUrl ? (
                    <img src={att.previewUrl} alt={att.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[80px] text-slate-700">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="ml-1 p-0.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.csv,.xlsx,.xls,.pdf,.txt,.json"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="px-3 py-2 flex items-center gap-2">
            {/* Attach — hide when recording */}
            {!isRecording && (
              <button
                onClick={handleAttachClick}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex-shrink-0"
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            )}

            {/* Input field — hidden when recording */}
            {!isRecording ? (
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
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
            ) : (
              /* Live transcript display */
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
                <span className="text-[10px] text-red-500 px-2 py-0.5 bg-red-100 rounded-full flex-shrink-0 self-start">
                  {liveStatus === 'streaming' ? '🔴 Live' : liveStatus}
                </span>
              </div>
            )}

            {/* Expand button — when recording/connecting and collapsed */}
            {(isRecording || liveStatus === 'connecting' || liveStatus === 'streaming') && !isExpanded && (
              <button
                onClick={() => { setIsExpanded(true); setShowHistory(false); }}
                className="p-2.5 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all flex-shrink-0"
                title="Expand chat"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            )}

            {/* Action button — Send / Mic / Stop */}
            {isRecording ? (
              <button
                onClick={handleStopRecording}
                className="p-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all flex-shrink-0 shadow-lg"
                title="Stop recording"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleMicClick}
                disabled={isLoading}
                className={`
                  p-2.5 rounded-xl transition-all flex-shrink-0
                  ${hasContent
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                  }
                  disabled:opacity-50
                `}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : hasContent ? (
                  <Send className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
