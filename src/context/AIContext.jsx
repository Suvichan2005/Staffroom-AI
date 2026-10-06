import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseVoiceTranscript, generateDailyBriefing, generateQuiz, generateAssignment, processChat } from '../services/aiService';
import { GeminiLiveSession } from '../services/geminiLiveService';
import { getToolsByContext, handleChatToolCall } from '../services/chatToolsDefinition';
import { initializeAllPlugins, getChatPlugins, createPluginAPI } from '../plugins';
import { useAuth } from './AuthContext';
import {
  teacherData,
  syllabusList,
  getSyllabusByRef,
  getCourseById,
  getSectionProgress,
  calculateTopicProgressPercent,
  normalizeSectionProgress,
  loadStoredProgress,
  persistProgress,
  getUpcomingSessions,
  getAttendanceForClass,
  students,
  attendanceLogs,
  assignments,
  getAssignmentsForClass,
  notifications,
  getUnreadNotifications
} from '../data/dummyData';
import {
  deleteChatSession,
  getAllChatSessions,
} from '../utils/chatStorage';
import {
  deleteChatSessionFromFirestore,
} from '../services/firestoreChatService';

// Extracted modules
import { readFileAsBase64, readFileAsText } from './ai/helpers';
import { buildVoiceSystemPrompt } from './ai/voicePromptBuilder';
import { handleClarificationResponse } from './ai/dataSummaries';
import { useChatSessions } from './ai/useChatSessions';

/**
 * AI Context - Manages AI assistant state and chat history
 * Enhanced with plugin system for extensible chat features
 */
const AIContext = createContext(null);

export function AIProvider({ children }) {
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();
  const isAuthed = !!authUser;

  // ── Chat UI state ──────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDocked, setIsDocked] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => { setIsOpen(false); setIsExpanded(false); }, []);
  const toggleChat = useCallback(() => { isOpen ? closeChat() : openChat(); }, [isOpen, openChat, closeChat]);
  const expandChat = useCallback(() => setIsExpanded(true), []);
  const collapseChat = useCallback(() => setIsExpanded(false), []);
  const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), []);
  const toggleDocked = useCallback(() => setIsDocked(prev => !prev), []);

  // ── Input state ────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // ── Context for AI (current course, class, etc.) ───────────────
  const [aiContext, setAIContext] = useState({
    currentCourseId: null,
    currentSectionId: null,
    courses: [],
  });
  const [pendingAction, setPendingAction] = useState(null);

  /**
   * Extract context from current URL
   */
  const getContextFromURL = useCallback(() => {
    if (typeof window === 'undefined') return { courseId: null, sectionId: null };
    const pathname = window.location.pathname;
    const courseMatch = pathname.match(/\/course\/([a-zA-Z0-9]+)/i);
    const classMatch = pathname.match(/\/(class|section)\/([a-zA-Z0-9]+)/i);
    const courseId = courseMatch ? courseMatch[1] : null;
    const sectionId = classMatch ? classMatch[2].toUpperCase() : null;
    const validCourse = courseId ? teacherData.courses.find(c => c.id === courseId) : null;
    const validSection = sectionId && validCourse
      ? validCourse.sections.find(s => s.id.toUpperCase() === sectionId.toUpperCase())
      : null;
    return {
      courseId: validCourse?.id || null,
      sectionId: validSection?.id || null,
      courseName: validCourse?.title || null
    };
  }, []);

  // ── Chat session persistence (custom hook) ─────────────────────
  const {
    messages, setMessages,
    currentSessionId, chatHistory,
    startNewChatSession, loadChatSession, deleteChatSessionById, renameChatSession,
    messagesRef, currentSessionIdRef, isAuthedRef, sessionInitializedRef,
    buildAndSaveSession, markPendingSave,
  } = useChatSessions({ isAuthed, authLoading, getContextFromURL });

  // ── Quick suggestions ──────────────────────────────────────────
  const [suggestions, setSuggestions] = useState([
    "What's my schedule today?",
    "Which students need attention?",
    "Generate a quiz for Chapter 3",
    "Show attendance summary",
  ]);

  // ── Plugin state ───────────────────────────────────────────────
  const [plugins, setPlugins] = useState([]);
  const [activePlugin, setActivePlugin] = useState(null);
  const pluginsInitializedRef = useRef(false);

  // ── Voice recognition ──────────────────────────────────────────
  const recognitionRef = useRef(null);
  const geminiLiveSessionRef = useRef(null);
  const liveTranscriptRef = useRef('');
  const [useLiveAPI, setUseLiveAPI] = useState(true);
  const [liveStatus, setLiveStatus] = useState('disconnected');
  const [liveTranscript, setLiveTranscript] = useState('');

  // ── Initialize speech recognition ──────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setInputValue(transcript);
      };
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
    }
  }, []);

  // ── Initialize plugins ─────────────────────────────────────────
  useEffect(() => {
    if (!pluginsInitializedRef.current) {
      pluginsInitializedRef.current = true;
      initializeAllPlugins();
      const registeredPlugins = getChatPlugins();
      setPlugins(registeredPlugins);
      console.log(`[AIContext] Initialized ${registeredPlugins.length} chat plugins:`,
        registeredPlugins.map(p => p.id).join(', '));
    }
    return () => {
      const registeredPlugins = getChatPlugins();
      registeredPlugins.forEach(plugin => { if (plugin.cleanup) plugin.cleanup(); });
    };
  }, []);

  // ── Add user / assistant message ───────────────────────────────

  const addUserMessage = useCallback((content) => {
    const message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      attachments: [...attachments],
    };
    setMessages(prev => [...prev, message]);
    setAttachments([]);
    markPendingSave();
    return message;
  }, [attachments, setMessages, markPendingSave]);

  const addAssistantMessage = useCallback((content, metadata = {}) => {
    const message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      ...metadata,
    };
    setMessages(prev => [...prev, message]);
    markPendingSave();
    return message;
  }, [setMessages, markPendingSave]);

  // ── Voice recording (Gemini Live) ──────────────────────────────

  const voiceSystemPrompt = useCallback(() => {
    return buildVoiceSystemPrompt(aiContext, getContextFromURL, messages);
  }, [aiContext, getContextFromURL, messages]);

  const startGeminiLiveRecording = useCallback(async () => {
    try {
      setIsRecording(true);
      setLiveStatus('connecting');

      const tools = getToolsByContext('combined');

      const sessionOptions = {
        classId: 'GlobalChat',
        studentList: students || [],
        systemPrompt: voiceSystemPrompt(),
        tools,
        onTranscript: (data) => {
          if (data.type === 'input') {
            setLiveTranscript(data.combined || data.transcript || '');
            liveTranscriptRef.current = data.combined || data.transcript || '';
          } else if (data.type === 'thinking' && data.text) {
            const currentTranscript = liveTranscriptRef.current;
            if (currentTranscript && currentTranscript.trim()) {
              setMessages(prev => {
                const lastUserMsg = prev.filter(m => m.role === 'user').slice(-1)[0];
                if (lastUserMsg && lastUserMsg.content === currentTranscript.trim()) return prev;
                return [...prev, { id: Date.now() - 1, role: 'user', content: currentTranscript.trim(), timestamp: new Date(), isVoice: true }];
              });
              liveTranscriptRef.current = '';
            }
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
                return [...prev.slice(0, -1), { ...lastMsg, thinking: (lastMsg.thinking || '') + data.text }];
              }
              return [...prev, { id: Date.now(), role: 'assistant', content: '', thinking: data.text, timestamp: new Date(), isStreaming: true, isVoice: true }];
            });
          } else if (data.type === 'model' && data.text) {
            const currentTranscript = liveTranscriptRef.current;
            if (currentTranscript && currentTranscript.trim()) {
              setMessages(prev => {
                const lastUserMsg = prev.filter(m => m.role === 'user').slice(-1)[0];
                if (lastUserMsg && lastUserMsg.content === currentTranscript.trim()) return prev;
                return [...prev, { id: Date.now() - 1, role: 'user', content: currentTranscript.trim(), timestamp: new Date(), isVoice: true }];
              });
              liveTranscriptRef.current = '';
            }
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
                return [...prev.slice(0, -1), { ...lastMsg, content: (lastMsg.content || '') + data.text }];
              }
              return [...prev, { id: Date.now(), role: 'assistant', content: data.text, timestamp: new Date(), isStreaming: true, isVoice: true }];
            });
          }
        },
        onToolCall: (toolCall) => {
          const displayText = toolCall.display || `${toolCall.name || 'Tool'} executed`;
          addAssistantMessage(`✓ ${displayText}`, {
            type: 'tool-action',
            toolName: toolCall.name,
            args: toolCall.args,
            result: toolCall.result,
          });
          if (toolCall.result?.success && toolCall.result?.path) {
            console.log('[Voice] Navigating to:', toolCall.result.path);
            setTimeout(() => navigate(toolCall.result.path), 500);
          }
        },
        onTurnComplete: () => {
          setMessages(prev => {
            const finalized = prev.map(msg =>
              msg.isStreaming ? { ...msg, isStreaming: false } : msg
            );
            if (finalized.length > 0) {
              buildAndSaveSession(finalized, currentSessionIdRef.current, isAuthedRef.current);
            }
            return finalized;
          });
          setLiveTranscript('');
          liveTranscriptRef.current = '';
        },
        onStatusChange: (status) => {
          console.log('[Voice Gemini] Status:', status);
          setLiveStatus(status);
        },
        onError: (error) => {
          console.error('Voice session error:', error);
          addAssistantMessage(`⚠️ Connection error: ${error.message}`);
          setIsRecording(false);
          setLiveStatus('disconnected');
        },
      };

      console.log('[Voice] Using Gemini Live');
      const session = new GeminiLiveSession(sessionOptions);

      await session.connect();
      geminiLiveSessionRef.current = session;

      if (session.startStreaming) {
        await session.startStreaming();
      } else if (session.start) {
        await session.start();
      }
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      addAssistantMessage(`Error: Could not start voice recording. ${error.message}`);
      setIsRecording(false);
      setLiveStatus('disconnected');
    }
  }, [addAssistantMessage, voiceSystemPrompt, setMessages, buildAndSaveSession, navigate]);

  const stopGeminiLiveRecording = useCallback(async () => {
    if (geminiLiveSessionRef.current) {
      const session = geminiLiveSessionRef.current;
      geminiLiveSessionRef.current = null;

      try {
        if (session.stop) await session.stop();
        else if (session.disconnect) session.disconnect();
      } catch (err) {
        console.error('Error stopping voice session:', err);
      }

      setMessages(prev => {
        const hasStreaming = prev.some(m => m.isStreaming);
        if (!hasStreaming && prev.length === 0) return prev;
        const finalized = prev.map(msg =>
          msg.isStreaming ? { ...msg, isStreaming: false } : msg
        );
        if (finalized.length > 0) {
          buildAndSaveSession(finalized, currentSessionIdRef.current, isAuthedRef.current);
        }
        return finalized;
      });

      setIsRecording(false);
      setLiveStatus('disconnected');
      setLiveTranscript('');
    }
  }, [buildAndSaveSession, setMessages]);

  const startRecording = useCallback(() => {
    if (useLiveAPI) {
      startGeminiLiveRecording();
    } else if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      console.warn('Speech recognition not supported');
    }
  }, [useLiveAPI, startGeminiLiveRecording]);

  const stopRecording = useCallback(async () => {
    if (useLiveAPI) {
      await stopGeminiLiveRecording();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, [useLiveAPI, stopGeminiLiveRecording]);

  const toggleRecording = useCallback(() => {
    isRecording ? stopRecording() : startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // ── Send message (main chat processing) ────────────────────────

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() && attachments.length === 0) return;

    const userContent = content || inputValue;
    setInputValue('');

    const currentAttachments = [...attachments];
    const userMessage = addUserMessage(userContent);
    setIsLoading(true);

    try {
      // Process file attachments
      let fileContents = [];
      if (currentAttachments.length > 0) {
        fileContents = await Promise.all(currentAttachments.map(async (att) => {
          const file = att.file || att;
          try {
            if (file.type?.startsWith('image/')) {
              const base64 = await readFileAsBase64(file);
              return { type: 'image', mimeType: file.type, data: base64, name: file.name || att.name };
            } else {
              const text = await readFileAsText(file);
              return { type: 'text', mimeType: file.type, data: text, name: file.name || att.name };
            }
          } catch (err) {
            console.error(`[sendMessage] Failed to read file ${att.name}:`, err);
            return { type: 'error', name: att.name, error: err.message };
          }
        }));
      }

      // Check pending clarification
      if (pendingAction) {
        const clarificationResult = await handleClarificationResponse(userContent, pendingAction);
        if (clarificationResult.handled) {
          addAssistantMessage(clarificationResult.response);
          setPendingAction(null);
          setIsLoading(false);
          return;
        }
      }

      // Try plugins first
      const registeredPlugins = getChatPlugins();
      const urlContext = getContextFromURL();
      const dynamicContext = {
        ...aiContext,
        courses: teacherData.courses,
        currentCourseId: aiContext.currentCourseId || urlContext.courseId || null,
        currentSectionId: aiContext.currentSectionId || urlContext.sectionId || null,
        urlContext,
      };

      for (const plugin of registeredPlugins) {
        if (plugin.onMessage) {
          const result = await plugin.onMessage(userMessage, dynamicContext);
          if (result && result.handled) {
            if (result.response) addAssistantMessage(result.response);
            if (result.pendingAction) setPendingAction(result.pendingAction);
            setIsLoading(false);
            return;
          }
        }
      }

      // LLM-first chat processing
      const response = await processChat(
        userContent,
        messages,
        {
          currentCourseId: dynamicContext.currentCourseId,
          currentSectionId: dynamicContext.currentSectionId,
          urlContext: dynamicContext.urlContext,
          attachments: fileContents.length > 0 ? fileContents : undefined,
        }
      );

      if (typeof response === 'object' && response.navigate) {
        addAssistantMessage(response.text);
        setTimeout(() => navigate(response.navigate), 500);
      } else {
        addAssistantMessage(response);
      }
    } catch (error) {
      console.error('AI response error:', error);
      addAssistantMessage(
        "I encountered an error processing your request. Please try again or rephrase your question."
      );
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, attachments, aiContext, addUserMessage, addAssistantMessage, pendingAction, getContextFromURL, messages, navigate]);

  // ── Clear chat ─────────────────────────────────────────────────

  const clearChat = useCallback(() => {
    if (currentSessionId) {
      if (isAuthed) {
        deleteChatSessionFromFirestore(currentSessionId);
      }
      deleteChatSession(currentSessionId);
      if (!isAuthed) {
        // chatHistory managed by useChatSessions
      }
    }
    startNewChatSession();
  }, [currentSessionId, startNewChatSession, isAuthed]);

  // ── Attachments ────────────────────────────────────────────────
  const addAttachment = useCallback((file) => setAttachments(prev => [...prev, file]), []);
  const removeAttachment = useCallback((index) => setAttachments(prev => prev.filter((_, i) => i !== index)), []);

  // ── Context ────────────────────────────────────────────────────
  const updateContext = useCallback((newContext) => setAIContext(prev => ({ ...prev, ...newContext })), []);

  // ── Plugin API ─────────────────────────────────────────────────
  const getPluginAPI = useCallback(() => {
    return createPluginAPI({
      addMessage: addAssistantMessage,
      setLoading: setIsLoading,
      getContext: () => aiContext,
      updateContext,
    });
  }, [addAssistantMessage, aiContext, updateContext]);

  const processPluginMessage = useCallback(async (message) => {
    const registeredPlugins = getChatPlugins();
    for (const plugin of registeredPlugins) {
      if (plugin.onMessage) {
        const handled = await plugin.onMessage(message, getPluginAPI());
        if (handled) return true;
      }
    }
    return false;
  }, [getPluginAPI]);

  const activatePlugin = useCallback((pluginId) => {
    const plugin = plugins.find(p => p.id === pluginId);
    if (plugin) setActivePlugin(plugin);
  }, [plugins]);

  const deactivatePlugin = useCallback(() => setActivePlugin(null), []);

  // ── Context value ──────────────────────────────────────────────

  const value = {
    // Chat UI
    isOpen, isExpanded, isDocked,
    openChat, closeChat, toggleChat,
    expandChat, collapseChat, toggleExpanded, toggleDocked,

    // Messages
    messages, setMessages,
    addUserMessage, addAssistantMessage,
    sendMessage, clearChat,

    // Chat history / sessions
    currentSessionId, chatHistory,
    startNewChatSession, loadChatSession,
    deleteChatSessionById, renameChatSession,

    // Input
    inputValue, setInputValue, isLoading,

    // Voice
    isRecording, startRecording, stopRecording, toggleRecording,
    useLiveAPI, setUseLiveAPI, liveStatus, liveTranscript,

    // Attachments
    attachments, addAttachment, removeAttachment,

    // Context
    aiContext, updateContext,

    // Suggestions
    suggestions, setSuggestions,

    // Plugins
    plugins, activePlugin, activatePlugin, deactivatePlugin,
    processPluginMessage, getPluginAPI,
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

/**
 * Safe version of useAI that returns null instead of throwing.
 */
export function useAISafe() {
  return useContext(AIContext);
}

export default AIContext;
