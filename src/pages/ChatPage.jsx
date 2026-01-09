import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Send, Sparkles, ArrowLeft, Trash2, 
  User, Bot, Mic, MicOff, Loader2, BookOpen, Users, 
  Calendar, ClipboardList, TrendingUp, AlertCircle,
  ChevronRight, X, FileText, BarChart2, Clock, Zap, History
} from 'lucide-react';
import { useAI } from '../context/AIContext';
import { teacherData, getSyllabusByRef, calculateTopicProgressPercent, normalizeSectionProgress, loadStoredProgress } from '../data/dummyData';
import { PageShell } from '../components/layout';
import ChatHistory from '../components/ai/ChatHistory';

// Simple markdown renderer for chat messages
const renderMarkdown = (text) => {
  if (!text) return '';
  
  // Process line by line
  const lines = text.split('\n');
  const elements = [];
  let inList = false;
  let listItems = [];
  
  const processInlineStyles = (line) => {
    // Bold: **text** or __text__
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic: *text* or _text_
    line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
    line = line.replace(/_(.+?)_/g, '<em>$1</em>');
    // Code: `text`
    line = line.replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 bg-neutral-200 rounded text-xs font-mono">$1</code>');
    return line;
  };
  
  lines.forEach((line, index) => {
    // Check for list items
    if (line.match(/^[\-\*]\s/)) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(processInlineStyles(line.replace(/^[\-\*]\s/, '')));
    } else {
      // Close previous list if any
      if (inList) {
        elements.push(
          <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2">
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        );
        inList = false;
        listItems = [];
      }
      
      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-base font-semibold mt-3 mb-1" 
            dangerouslySetInnerHTML={{ __html: processInlineStyles(line.slice(4)) }} />
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-lg font-semibold mt-3 mb-1"
            dangerouslySetInnerHTML={{ __html: processInlineStyles(line.slice(3)) }} />
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-xl font-bold mt-3 mb-1"
            dangerouslySetInnerHTML={{ __html: processInlineStyles(line.slice(2)) }} />
        );
      } else if (line.trim() === '') {
        elements.push(<br key={index} />);
      } else {
        elements.push(
          <p key={index} className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: processInlineStyles(line) }} />
        );
      }
    }
  });
  
  // Close any remaining list
  if (inList && listItems.length > 0) {
    elements.push(
      <ul key="list-final" className="list-disc list-inside space-y-1 my-2">
        {listItems.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>
    );
  }
  
  return elements;
};

/**
 * Full-page AI Chat Experience
 * Features:
 * - Complete chat history with timestamps
 * - Smart suggestions sidebar
 * - Quick action shortcuts
 * - Voice input support
 * - Context-aware assistance
 */
export default function ChatPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const {
    messages,
    inputValue,
    setInputValue,
    sendMessage,
    clearChat,
    isLoading,
    isRecording,
    toggleRecording,
  } = useAI();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showHistory, setShowHistory] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    clearChat();
    setShowClearConfirm(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  // Quick action categories
  const categories = [
    { id: 'all', label: 'All', icon: Sparkles },
    { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
    { id: 'attendance', label: 'Attendance', icon: Users },
    { id: 'assignments', label: 'Tasks', icon: ClipboardList },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
  ];

  // Smart suggestions based on context and data
  const smartSuggestions = {
    all: [
      "What's my schedule today?",
      "Which students need attention?",
      "Show my progress overview",
      "What's next to teach?",
    ],
    syllabus: [
      "What's my progress in all sections?",
      "What's the next topic for 8A?",
      "Show syllabus completion by chapter",
      "Which topics are pending in 6A?",
      "Mark Chapter 3 complete in 8B",
    ],
    attendance: [
      "Show attendance summary",
      "Which students have low attendance?",
      "Compare attendance across sections",
      "Who was absent yesterday?",
      "Send attendance reminder",
    ],
    assignments: [
      "Show pending assignments",
      "What's due this week?",
      "Which students haven't submitted?",
      "Generate a quiz for Chapter 2",
      "Create an assignment about rivers",
    ],
    insights: [
      "Students at risk of failing",
      "Performance trends this month",
      "Which class is performing best?",
      "Generate weekly progress report",
      "Suggest focus areas for 6A",
    ],
  };

  // Get dynamic stats for the sidebar
  const getQuickStats = () => {
    const stats = [];
    
    // Calculate overall progress
    let totalProgress = 0;
    let sectionCount = 0;
    
    teacherData.courses.forEach(course => {
      const syllabus = getSyllabusByRef(course.syllabusRef);
      if (!syllabus) return;
      
      course.sections.forEach(section => {
        const baseProgress = normalizeSectionProgress(syllabus, section.progress);
        const storedProgress = loadStoredProgress(section.id, baseProgress);
        totalProgress += calculateTopicProgressPercent(syllabus, storedProgress);
        sectionCount++;
      });
    });
    
    const avgProgress = sectionCount > 0 ? Math.round(totalProgress / sectionCount) : 0;
    
    stats.push({
      label: 'Avg Progress',
      value: `${avgProgress}%`,
      icon: BarChart2,
      color: 'indigo',
    });
    
    // Total sections
    const totalSections = teacherData.courses.reduce((sum, c) => sum + c.sections.length, 0);
    stats.push({
      label: 'Sections',
      value: totalSections,
      icon: Users,
      color: 'green',
    });
    
    // Total courses
    stats.push({
      label: 'Courses',
      value: teacherData.courses.length,
      icon: BookOpen,
      color: 'yellow',
    });
    
    return stats;
  };

  const stats = getQuickStats();
  const currentSuggestions = smartSuggestions[selectedCategory] || smartSuggestions.all;

  // Format message timestamp
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for grouping
  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <PageShell width="7xl">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)]">
        {/* Chat History Sidebar - Desktop */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '320px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="hidden lg:block flex-shrink-0 overflow-hidden"
            >
              <div className="h-full overflow-y-auto bg-white rounded-2xl border border-neutral-200 p-4">
                <ChatHistory />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat History Modal - Mobile */}
        <AnimatePresence>
          {showHistory && (
            <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[80vh] overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-neutral-100">
                  <h3 className="text-lg font-semibold">Chat History</h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <ChatHistory />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Mobile/Tablet Quick Suggestions (horizontal scroll) */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {currentSuggestions.slice(0, 4).map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(suggestion)}
              className="flex-shrink-0 px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-700 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl lg:rounded-3xl border border-neutral-200 shadow-sm overflow-hidden min-h-0">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-neutral-100 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors lg:hidden"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="relative">
                <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-indigo-600" />
              </div>
              <div>
                <h1 className="font-bold text-white text-base lg:text-lg">AI Teaching Assistant</h1>
                <p className="text-xs lg:text-sm text-white/70 flex items-center gap-1.5">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      <span>Ready to help</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2.5 rounded-xl transition-colors ${
                  showHistory 
                    ? 'bg-white/20 text-white' 
                    : 'hover:bg-white/10 text-white/80 hover:text-white'
                }`}
                title="Chat history"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
                title="Clear chat history"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-gradient-to-b from-neutral-50 to-white">
            {/* Welcome Banner - Show when no messages */}
            {Object.keys(groupedMessages).length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-neutral-800 mb-2">How can I help today?</h2>
                <p className="text-neutral-500 text-sm max-w-md mb-6">
                  I can help with your classes, track syllabus progress, analyze attendance, and provide insights about your students.
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-sm">
                  {currentSuggestions.slice(0, 4).map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="p-3 text-left text-sm bg-white border border-neutral-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                    >
                      <span className="text-neutral-700">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center mb-4">
                  <span className="px-4 py-1.5 bg-white border border-neutral-100 shadow-sm rounded-full text-xs text-neutral-500 font-medium">
                    {date}
                  </span>
                </div>

                {/* Messages for this date */}
                <div className="space-y-4">
                  {dateMessages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`
                        w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm
                        ${message.role === 'user' 
                          ? 'bg-indigo-600' 
                          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                        }
                      `}>
                        {message.role === 'user' 
                          ? <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                          : <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                        }
                      </div>

                      {/* Message Content */}
                      <div className={`
                        max-w-[75%] lg:max-w-[65%]
                        ${message.role === 'user' ? 'text-right' : ''}
                      `}>
                        <div className={`
                          px-4 py-3 rounded-2xl shadow-sm
                          ${message.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : 'bg-white border border-neutral-100 text-neutral-800 rounded-tl-sm'
                          }
                        `}>
                          <div className="text-sm">
                            {message.role === 'assistant' 
                              ? renderMarkdown(message.content)
                              : <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            }
                          </div>
                        </div>
                        <p className={`
                          text-xs text-neutral-400 mt-1 
                          ${message.role === 'user' ? 'text-right' : 'text-left'}
                        `}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                <div className="px-4 py-3 bg-white border border-neutral-100 rounded-2xl rounded-tl-sm shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-neutral-500">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 lg:px-6 py-3 lg:py-4 border-t border-neutral-100 bg-white">
            <div className="flex items-end gap-2 lg:gap-3">
              {/* Voice Input */}
              <button
                onClick={toggleRecording}
                className={`
                  p-3 rounded-xl transition-all flex-shrink-0
                  ${isRecording 
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
                    : 'bg-neutral-100 text-neutral-500 hover:bg-indigo-100 hover:text-indigo-600'
                  }
                `}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Text Input */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your classes..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white text-sm transition-colors"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className={`
                  p-3 rounded-xl transition-all flex-shrink-0
                  ${inputValue.trim() && !isLoading
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-200 hover:scale-105'
                    : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }
                `}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Hidden on mobile, visible on lg+ */}
        <div className="hidden lg:flex w-80 flex-col gap-4">
          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
            <h3 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Quick Stats
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={i}
                    className="p-3 rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100 text-center border border-neutral-100"
                  >
                    <Icon className="w-5 h-5 text-indigo-600 mx-auto mb-1.5" />
                    <p className="text-lg font-bold text-neutral-800">{stat.value}</p>
                    <p className="text-xs text-neutral-500">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Smart Suggestions */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Smart Suggestions
            </h3>

            {/* Category Tabs */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`
                      flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                      ${isActive 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }
                    `}
                  >
                    <Icon className="w-3 h-3" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Suggestions List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {currentSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 hover:bg-indigo-50 text-left transition-colors group"
                >
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-indigo-600 transition-colors" />
                  <span className="text-sm text-neutral-700 group-hover:text-indigo-700">
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-4 text-white">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pro Tips
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 mt-1.5 flex-shrink-0" />
                <span className="text-white/90">
                  Say "Mark [topic] complete in [section]" to update progress
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 mt-1.5 flex-shrink-0" />
                <span className="text-white/90">
                  Ask follow-up questions like "and 6A?" for quick context switches
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 mt-1.5 flex-shrink-0" />
                <span className="text-white/90">
                  Use voice input for hands-free interaction during class
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Clear Chat Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-800">Clear Chat History?</h3>
                  <p className="text-sm text-neutral-500">This action cannot be undone.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 font-medium hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearChat}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
