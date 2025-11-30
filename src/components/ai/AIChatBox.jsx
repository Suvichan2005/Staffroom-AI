import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2, Send, Sparkles, Loader2 } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import AISuggestions from './AISuggestions';

/**
 * AI ChatBox - Floating chat interface
 * Integrates with aiService for real AI responses
 */
export default function AIChatBox({ 
  isOpen, 
  onClose, 
  isMinimized, 
  onToggleMinimize,
  initialMessages = [],
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response (replace with actual aiService call)
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        role: 'assistant',
        content: getAIResponse(text),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSuggestionClick = (suggestion) => {
    handleSend(suggestion);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          height: isMinimized ? 'auto' : '500px',
        }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`
          fixed bottom-20 right-4 z-50
          w-[360px] max-w-[calc(100vw-2rem)]
          bg-white rounded-2xl shadow-2xl border border-black-200
          flex flex-col overflow-hidden
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Staffroom AI</h3>
              <p className="text-[10px] text-indigo-200">Your teaching assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleMinimize}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black-50">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <p className="text-sm font-medium text-black-700">How can I help you today?</p>
                  <p className="text-xs text-black-500 mt-1">Ask me anything about your classes</p>
                  
                  <AISuggestions onSuggestionClick={handleSuggestionClick} />
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-black-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              isLoading={isLoading}
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Simple response generator (replace with actual AI service)
function getAIResponse(input) {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('attendance')) {
    return "I can help you with attendance! You have 2 classes pending attendance submission today. Would you like me to show you which classes need attention?";
  }
  if (lowerInput.includes('quiz') || lowerInput.includes('test')) {
    return "I've prepared a quiz based on Chapter 3 content. It includes 10 multiple choice questions covering the key concepts. Would you like me to share it with a specific section?";
  }
  if (lowerInput.includes('student') || lowerInput.includes('struggling')) {
    return "Based on recent assessments, 3 students in Section 8A are showing below-average performance. I recommend scheduling one-on-one sessions or additional practice assignments.";
  }
  if (lowerInput.includes('progress') || lowerInput.includes('syllabus')) {
    return "Your overall syllabus progress is at 67% across all sections. Section 6C is ahead at 75%, while Section 8A needs attention at 58%. Would you like a detailed breakdown?";
  }
  
  return "I understand you're asking about \"" + input + "\". I can help you with attendance tracking, quiz generation, student progress analysis, and lesson planning. What specific aspect would you like to explore?";
}
