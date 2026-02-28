import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseVoiceTranscript, generateDailyBriefing, generateQuiz, generateAssignment, processChat } from '../services/aiService';
import { GeminiLiveSession } from '../services/geminiLiveService';
import { AzureRealtimeSession, isAzureRealtimeAvailable } from '../services/providers/azureRealtimeProvider';
import { getToolsByContext, handleChatToolCall } from '../services/chatToolsDefinition';
import { initializeAllPlugins, getChatPlugins, createPluginAPI } from '../plugins';
import {
  getAllChatSessions,
  getChatSession,
  saveChatSession,
  deleteChatSession,
  createNewChatSession,
  getCurrentSessionId,
  setCurrentSessionId,
  clearCurrentSession,
  addMessageToSession,
  updateChatTitle,
} from '../utils/chatStorage';
import {
  getAllChatSessionsFromFirestore,
  getChatSessionFromFirestore,
  saveChatSessionToFirestore,
  deleteChatSessionFromFirestore,
  updateChatTitleInFirestore,
  syncLocalToFirestore,
  subscribeToChatSessions,
  subscribeToSession,
  saveActiveSessionIdToFirestore,
  getActiveSessionIdFromFirestore,
} from '../services/firestoreChatService';
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

/**
 * AI Context - Manages AI assistant state and chat history
 * Enhanced with plugin system for extensible chat features
 */
const AIContext = createContext(null);

// Determine which AI/Voice provider to use
const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'gemini';
const USE_AZURE_VOICE = AI_PROVIDER === 'azure';

// Helper: Read a File as base64 (strip data URL prefix, return only base64)
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      // Strip "data:image/png;base64," prefix
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Helper: Read a File as text
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Serialize a message for safe storage (localStorage + Firestore).
 * Strips non-serializable fields: File objects, blob URLs, streaming state.
 */
function serializeMessageForStorage(msg) {
  const serialized = {
    id: msg.id,
    role: msg.role,
    content: msg.content || '',
    timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : (msg.timestamp || new Date().toISOString()),
  };
  // Preserve optional fields
  if (msg.thinking) serialized.thinking = msg.thinking;
  if (msg.isVoice) serialized.isVoice = true;
  if (msg.type) serialized.type = msg.type;
  // Attachments: keep metadata only (strip File objects, blob URLs)
  if (msg.attachments && msg.attachments.length > 0) {
    serialized.attachments = msg.attachments.map(att => ({
      name: att.name,
      type: att.type,
      mimeType: att.mimeType,
      size: att.size,
      // Keep data URLs but strip blob: URLs (they expire after page reload)
      ...(att.previewUrl && !att.previewUrl.startsWith('blob:') ? { previewUrl: att.previewUrl } : {}),
    }));
  }
  // Never persist transient streaming state
  return serialized;
}

export function AIProvider({ children }) {
  // Router navigation (use this instead of window.location to preserve state)
  const navigate = useNavigate();
  
  // Auth context — needed to gate Firestore access on resolved auth state
  const { user: authUser, loading: authLoading } = useAuth();
  const isAuthed = !!authUser;
  
  // Chat UI state
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDocked, setIsDocked] = useState(false);

  // Chat messages
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI teaching assistant. I can help you with lesson planning, generate quizzes, track student progress, and more. What would you like help with?",
      timestamp: new Date(),
    },
  ]);

  // Chat history and session management
  const [currentSessionId, setCurrentSessionIdState] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const sessionInitializedRef = useRef(false);
  const lastPathRef = useRef(null);

  // Input state
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // Chat open/close handlers
  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setIsExpanded(false);
  }, []);

  const toggleChat = useCallback(() => {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  }, [isOpen, openChat, closeChat]);

  const expandChat = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapseChat = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const toggleDocked = useCallback(() => {
    setIsDocked((prev) => !prev);
  }, []);

  // Voice recognition
  const recognitionRef = useRef(null);
  const geminiLiveSessionRef = useRef(null);
  const liveTranscriptRef = useRef(''); // Ref to track transcript for callbacks
  const [useLiveAPI, setUseLiveAPI] = useState(true); // Use Gemini Live API by default
  const [liveStatus, setLiveStatus] = useState('disconnected');
  const [liveTranscript, setLiveTranscript] = useState('');

  // Context for AI (current course, class, etc.)
  const [aiContext, setAIContext] = useState({
    currentCourseId: null,
    currentSectionId: null,
    courses: [],
  });

  // Pending action for clarification flow
  const [pendingAction, setPendingAction] = useState(null);

  /**
   * Extract context from current URL
   * e.g., /course/hist8/class/8A → { courseId: 'hist8', sectionId: '8A' }
   */
  const getContextFromURL = useCallback(() => {
    if (typeof window === 'undefined') return { courseId: null, sectionId: null };
    
    const pathname = window.location.pathname;
    
    // Match patterns like /course/hist8/class/8A or /course/geo6/section/6A
    const courseMatch = pathname.match(/\/course\/([a-zA-Z0-9]+)/i);
    const classMatch = pathname.match(/\/(class|section)\/([a-zA-Z0-9]+)/i);
    
    const courseId = courseMatch ? courseMatch[1] : null;
    const sectionId = classMatch ? classMatch[2].toUpperCase() : null;
    
    // Validate against actual data
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

  // Quick suggestions
  const [suggestions, setSuggestions] = useState([
    "What's my schedule today?",
    "Which students need attention?",
    "Generate a quiz for Chapter 3",
    "Show attendance summary",
  ]);

  // Plugin state
  const [plugins, setPlugins] = useState([]);
  const [activePlugin, setActivePlugin] = useState(null);
  const pluginsInitializedRef = useRef(false);

  // Initialize speech recognition
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

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
    }
  }, []);

  // Initialize plugins
  useEffect(() => {
    if (!pluginsInitializedRef.current) {
      pluginsInitializedRef.current = true;
      
      // Initialize all registered plugins
      initializeAllPlugins();
      
      // Get all registered plugins
      const registeredPlugins = getChatPlugins();
      setPlugins(registeredPlugins);
      
      console.log(`[AIContext] Initialized ${registeredPlugins.length} chat plugins:`, 
        registeredPlugins.map(p => p.id).join(', '));
    }
    
    // Cleanup plugins on unmount
    return () => {
      const registeredPlugins = getChatPlugins();
      registeredPlugins.forEach(plugin => {
        if (plugin.cleanup) {
          plugin.cleanup();
        }
      });
    };
  }, []);

  // ====================================================================
  // CHAT PERSISTENCE — Firestore real-time sync + localStorage fallback
  // ====================================================================

  // Ref to track the current Firestore session document listener unsub
  const sessionListenerRef = useRef(null);
  // Ref to track the Firestore session LIST listener unsub
  const sessionsListListenerRef = useRef(null);
  // Ref that always mirrors the latest `messages` state (for sync comparison)
  const messagesRef = useRef([]);
  // Refs that mirror latest values for use in voice callbacks (stable closures)
  const currentSessionIdRef = useRef(null);
  const isAuthedRef = useRef(false);
  // Flag: set to true by local mutations (addUserMessage, addAssistantMessage, etc.)
  // Read by save effect — only saves when a local change happened
  const pendingSaveRef = useRef(false);

  // Keep refs always in sync with latest state
  useEffect(() => { messagesRef.current = messages; });
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);
  useEffect(() => { isAuthedRef.current = isAuthed; }, [isAuthed]);

  // Helper: format a session's messages for display
  const formatSessionMessages = (session) => {
    const msgs = (session?.messages || []).map(msg => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    }));
    return msgs.length > 0 ? msgs : [{
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI teaching assistant. I can help you with lesson planning, generate quizzes, track student progress, and more. What would you like help with?",
      timestamp: new Date(),
    }];
  };

  // Helper: build session object from messages and save to all stores
  const buildAndSaveSession = useCallback((msgs, sessionId, authed) => {
    if (!sessionId) return;
    const serialized = msgs.map(serializeMessageForStorage);
    // Auto-title from first user message
    let title = 'New Chat';
    const firstUserMsg = msgs.find(m => m.role === 'user');
    if (firstUserMsg?.content) {
      const t = firstUserMsg.content;
      title = t.length > 50 ? `${t.substring(0, 50)}...` : t;
    }
    // Get existing session shell from localStorage (for createdAt, context)
    const existing = getChatSession(sessionId);
    const session = {
      id: sessionId,
      title: existing?.title === 'New Chat' ? title : (existing?.title || title),
      messages: serialized,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: existing?.context || {},
    };
    // Save to localStorage (synchronous — survives immediate refresh)
    saveChatSession(session);
    // Save to Firestore (fire-and-forget)
    if (authed) {
      saveChatSessionToFirestore(session);
    } else {
      // Anonymous: update sidebar manually
      setChatHistory(prev => {
        const idx = prev.findIndex(s => s.id === session.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...session };
          return updated;
        }
        return [session, ...prev];
      });
    }
    console.log(`[AIContext] 💾 Saved session ${sessionId} (${serialized.length} msgs)`);
  }, []);

  // Helper: create & persist a new session
  const createAndSetNewSession = useCallback((authenticated) => {
    const context = getContextFromURL();
    const newSession = createNewChatSession(context);

    saveChatSession(newSession);
    setCurrentSessionId(newSession.id);
    setCurrentSessionIdState(newSession.id);

    if (authenticated) {
      saveChatSessionToFirestore(newSession);
      saveActiveSessionIdToFirestore(newSession.id);
    }

    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI teaching assistant. I can help you with lesson planning, generate quizzes, track student progress, and more. What would you like help with?",
      timestamp: new Date(),
    }]);

    // Refresh history (will be overwritten by real-time listener if authed)
    if (!authenticated) {
      setChatHistory(getAllChatSessions());
    }

    console.log(`[AIContext] Started new session ${newSession.id}`);
    return newSession.id;
  }, [getContextFromURL]);

  // ------------------------------------------------------------------
  // EFFECT 1: Initialize chat session AFTER auth resolves
  // ------------------------------------------------------------------
  useEffect(() => {
    if (authLoading) {
      console.log('[AIContext] Auth still loading, deferring chat init');
      return;
    }

    let cancelled = false;
    const authed = isAuthed;

    const initChatHistory = async () => {
      sessionInitializedRef.current = true;

      try {
        let history = [];

        if (authed) {
          console.log('[AIContext] Authenticated — loading from Firestore');
          const firestoreHistory = await getAllChatSessionsFromFirestore();
          if (cancelled) return;

          // One-time migration: local → Firestore
          const localHistory = getAllChatSessions();
          if (firestoreHistory.length === 0 && localHistory.length > 0) {
            console.log('[AIContext] Migrating local chat history to Firestore');
            await syncLocalToFirestore(localHistory);
            if (cancelled) return;
            history = localHistory;
          } else {
            history = firestoreHistory;
          }
        } else {
          console.log('[AIContext] Anonymous — using localStorage');
          history = getAllChatSessions();
        }

        if (cancelled) return;
        setChatHistory(history);

        // Determine which session to open
        let storedSessionId = getCurrentSessionId();

        // For cross-device: check Firestore active session pointer
        if (!storedSessionId && authed) {
          storedSessionId = await getActiveSessionIdFromFirestore();
          if (cancelled) return;
        }

        if (storedSessionId && history.length > 0) {
          // Merge: check both Firestore and localStorage, take whichever has more messages
          let session = history.find(s => s.id === storedSessionId);
          const localSession = getChatSession(storedSessionId);

          if (!session && authed) {
            session = await getChatSessionFromFirestore(storedSessionId);
            if (cancelled) return;
          }
          if (!session) session = localSession;

          // If both exist, take the one with more messages
          if (session && localSession) {
            const fsMsgs = session.messages?.length || 0;
            const lsMsgs = localSession.messages?.length || 0;
            if (lsMsgs > fsMsgs) {
              console.log(`[AIContext] localStorage has more messages (${lsMsgs} vs ${fsMsgs}), using local`);
              session = localSession;
              // Sync back to Firestore
              if (authed) saveChatSessionToFirestore(localSession);
            }
          }

          if (session) {
            setCurrentSessionId(storedSessionId);
            setCurrentSessionIdState(storedSessionId);
            const restored = formatSessionMessages(session);
            setMessages(restored);
            console.log(`[AIContext] Restored session ${storedSessionId} (${(session.messages || []).length} msgs)`);
          } else {
            createAndSetNewSession(authed);
          }
        } else if (history.length > 0) {
          const mostRecent = history[0];
          setCurrentSessionId(mostRecent.id);
          setCurrentSessionIdState(mostRecent.id);
          const restored = formatSessionMessages(mostRecent);
          setMessages(restored);
          console.log(`[AIContext] Loaded most recent session`);
        } else {
          createAndSetNewSession(authed);
        }

        lastPathRef.current = window.location.pathname;
      } catch (error) {
        console.error('[AIContext] Error loading chat history:', error);
        if (cancelled) return;
        setChatHistory(getAllChatSessions());
        createAndSetNewSession(authed);
      }
    };

    initChatHistory();

    return () => {
      cancelled = true;
      sessionInitializedRef.current = false;
    };
  }, [isAuthed, authLoading, getContextFromURL, createAndSetNewSession]);

  // ------------------------------------------------------------------
  // EFFECT 2: Real-time Firestore listener for session LIST (sidebar)
  // ------------------------------------------------------------------
  useEffect(() => {
    // Tear down previous listener
    if (sessionsListListenerRef.current) {
      sessionsListListenerRef.current();
      sessionsListListenerRef.current = null;
    }

    if (!isAuthed || authLoading) return;

    const unsub = subscribeToChatSessions((sessions) => {
      setChatHistory(sessions);
    });
    sessionsListListenerRef.current = unsub;

    return () => {
      if (sessionsListListenerRef.current) {
        sessionsListListenerRef.current();
        sessionsListListenerRef.current = null;
      }
    };
  }, [isAuthed, authLoading]);

  // ------------------------------------------------------------------
  // EFFECT 3: Real-time Firestore listener for CURRENT session (messages)
  //           → enables cross-device live sync of the open chat
  //           Uses messagesRef to compare against current local state
  // ------------------------------------------------------------------
  useEffect(() => {
    // Tear down previous session listener
    if (sessionListenerRef.current) {
      sessionListenerRef.current();
      sessionListenerRef.current = null;
    }

    if (!isAuthed || authLoading || !currentSessionId) return;

    const unsub = subscribeToSession(currentSessionId, (session) => {
      if (!session) return; // deleted remotely

      const remoteMsgs = session.messages || [];
      if (remoteMsgs.length === 0) return;

      const localMsgs = messagesRef.current;
      const remoteLastId = remoteMsgs[remoteMsgs.length - 1]?.id || null;
      const localLastId = localMsgs[localMsgs.length - 1]?.id || null;

      // Skip if remote matches what we already have locally
      // (either our own echo or already-applied data)
      if (remoteMsgs.length === localMsgs.length && remoteLastId === localLastId) {
        return;
      }

      // Only apply remote data if it has STRICTLY MORE messages than local
      // This prevents race conditions where an in-flight echo has fewer messages
      // than what the user has locally (e.g., user sent another message before echo arrived)
      if (remoteMsgs.length <= localMsgs.length) {
        return;
      }

      // Genuinely new data from another device — apply it
      console.log(`[AIContext] 🔄 Remote update: ${remoteMsgs.length} msgs (local: ${localMsgs.length})`);
      setMessages(formatSessionMessages(session));
      // Also update localStorage to keep offline cache current
      saveChatSession({
        ...session,
        messages: remoteMsgs.map(m => serializeMessageForStorage(m)),
      });
    });
    sessionListenerRef.current = unsub;

    return () => {
      if (sessionListenerRef.current) {
        sessionListenerRef.current();
        sessionListenerRef.current = null;
      }
    };
  }, [isAuthed, authLoading, currentSessionId]);

  // ------------------------------------------------------------------
  // Session management functions
  // ------------------------------------------------------------------
  const startNewChatSession = useCallback(() => {
    return createAndSetNewSession(isAuthed);
  }, [createAndSetNewSession, isAuthed]);

  // Track if a session load is in progress to prevent race conditions
  const loadingSessionRef = useRef(false);

  const loadChatSession = useCallback(async (sessionId) => {
    if (loadingSessionRef.current) return;
    if (sessionId === currentSessionId) return;

    loadingSessionRef.current = true;
    console.log(`[AIContext] Loading session: ${sessionId}`);

    try {
      // Merge: check both Firestore and localStorage, take whichever has more messages
      let firestoreSession = null;
      if (isAuthed) {
        firestoreSession = await getChatSessionFromFirestore(sessionId);
      }
      const localSession = getChatSession(sessionId);
      
      let session = firestoreSession || localSession;
      if (firestoreSession && localSession) {
        const fsMsgs = firestoreSession.messages?.length || 0;
        const lsMsgs = localSession.messages?.length || 0;
        session = lsMsgs > fsMsgs ? localSession : firestoreSession;
      }

      if (session) {
        setCurrentSessionId(sessionId);
        setCurrentSessionIdState(sessionId);
        if (isAuthed) saveActiveSessionIdToFirestore(sessionId);

        const loaded = formatSessionMessages(session);
        setMessages(loaded);

        console.log(`[AIContext] Loaded session ${sessionId} (${(session.messages || []).length} msgs)`);
      } else {
        console.warn(`[AIContext] Session ${sessionId} not found`);
      }
    } finally {
      loadingSessionRef.current = false;
    }
  }, [currentSessionId, isAuthed]);

  const deleteChatSessionById = useCallback(async (sessionId) => {
    if (isAuthed) {
      await deleteChatSessionFromFirestore(sessionId);
    }
    deleteChatSession(sessionId);

    // For anonymous users, refresh manually (authed uses real-time listener)
    if (!isAuthed) {
      setChatHistory(getAllChatSessions());
    }

    if (sessionId === currentSessionId) {
      startNewChatSession();
    }
  }, [currentSessionId, startNewChatSession, isAuthed]);

  const renameChatSession = useCallback(async (sessionId, newTitle) => {
    if (isAuthed) {
      await updateChatTitleInFirestore(sessionId, newTitle);
    }
    updateChatTitle(sessionId, newTitle);

    if (!isAuthed) {
      setChatHistory(getAllChatSessions());
    }
  }, [isAuthed]);

  // ------------------------------------------------------------------
  // EFFECT 4: Save to stores when local changes happen
  //           Uses pendingSaveRef — only saves when a local mutation set it
  //           No debounce — saves immediately after React render
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!pendingSaveRef.current) return; // No local changes to save
    if (!currentSessionId || !sessionInitializedRef.current) return;
    if (messages.some(m => m.isStreaming)) return; // Wait for streaming to complete

    pendingSaveRef.current = false;
    buildAndSaveSession(messages, currentSessionId, isAuthed);
  }, [messages, currentSessionId, isAuthed, buildAndSaveSession]);

  // ------------------------------------------------------------------
  // EFFECT 5: beforeunload safety net — save to localStorage on page close
  //           Saves ALL messages (including mid-stream) to prevent data loss
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!currentSessionId || !sessionInitializedRef.current) return;
      const msgs = messagesRef.current;
      if (msgs.length === 0) return;
      // Strip streaming flags — save whatever we have, even mid-stream
      const serialized = msgs.map(m => serializeMessageForStorage(
        m.isStreaming ? { ...m, isStreaming: false } : m
      ));
      const existing = getChatSession(currentSessionId);
      const session = {
        id: currentSessionId,
        title: existing?.title || 'New Chat',
        messages: serialized,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        context: existing?.context || {},
      };
      saveChatSession(session);
      console.log(`[AIContext] 🛡️ beforeunload: saved ${serialized.length} msgs to localStorage`);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentSessionId]);

  // Add user message
  const addUserMessage = useCallback((content) => {
    const message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      attachments: [...attachments],
    };
    setMessages((prev) => [...prev, message]);
    setAttachments([]);
    pendingSaveRef.current = true; // Mark for save
    return message;
  }, [attachments]);

  // Add assistant message
  const addAssistantMessage = useCallback((content, metadata = {}) => {
    const message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      ...metadata,
    };
    setMessages((prev) => [...prev, message]);
    pendingSaveRef.current = true; // Mark for save
    return message;
  }, []);

  // Start voice recording with Gemini Live API (for global chat)
  // Build context-aware system prompt for voice chat
  const buildVoiceSystemPrompt = useCallback(() => {
    // Get current context
    const urlContext = getContextFromURL();
    const currentCourseId = aiContext.currentCourseId || urlContext.courseId;
    const currentSectionId = aiContext.currentSectionId || urlContext.sectionId;
    
    // Find current course and syllabus
    let syllabusContext = '';
    if (currentCourseId && teacherData) {
      const course = teacherData.courses.find(c => c.id === currentCourseId);
      if (course) {
        const syllabus = getSyllabusByRef(course.syllabusRef);
        const section = course.sections.find(s => s.id === currentSectionId) || course.sections[0];
        
        if (syllabus && section) {
          const baseProgress = normalizeSectionProgress(syllabus, section.progress || {});
          const currentProgress = loadStoredProgress(section.id, baseProgress);
          
          // Find ongoing and next topics based on actual syllabus structure
          let ongoingTopic = null;
          let nextTopic = null;
          let foundOngoing = false;
          
          for (const chapter of syllabus.chapters || []) {
            for (const subTopic of chapter.subTopics || []) {
              const status = currentProgress[chapter.index]?.topics?.[subTopic.index];
              
              if (status === 'ongoing' && !foundOngoing) {
                ongoingTopic = { name: subTopic.title, chapter: chapter.title };
                foundOngoing = true;
              } else if (foundOngoing && !nextTopic && status !== 'done') {
                nextTopic = { name: subTopic.title, chapter: chapter.title };
                break;
              } else if (!foundOngoing && !nextTopic && status !== 'done' && status !== 'ongoing') {
                nextTopic = { name: subTopic.title, chapter: chapter.title };
              }
            }
            if (nextTopic) break;
          }
          
          syllabusContext = `
CURRENT SYLLABUS CONTEXT (${syllabus.subject} - Section ${section.id}):${ongoingTopic ? `
- Currently Ongoing: "${ongoingTopic.name}" (Chapter: ${ongoingTopic.chapter})` : ''}${nextTopic ? `
- Next Topic in Sequence: "${nextTopic.name}" (Chapter: ${nextTopic.chapter})` : ''}

SPECIAL HANDLING FOR "NEXT TOPIC":
- When user says "mark [topic] done and also for the next topic" or "and the next topic as ongoing":
  1. First call searchTopic to find the topic's chapterIndex and topicIndex
  2. Call updateProgress with sectionId="${section.id}", chapterIndex, topicIndex, status="complete"
  3. Then call searchTopic for "${nextTopic?.name || 'the next topic'}"
  4. Call updateProgress for the next topic with status="ongoing"
- When user says "what's the next topic" or "mark the next topic ongoing":
  Use searchTopic for: ${nextTopic ? `"${nextTopic.name}"` : 'ask for clarification'}
`;
        }
      }
    }
    
    // Get student names for attendance context
    const studentNames = students && students.length > 0 
      ? `\nCurrent class students: ${students.map(s => s.name || s.firstName).join(', ')}`
      : '';
    
    // Include recent conversation history for context continuity
    const recentHistory = messages
      .slice(-10) // Last 10 messages
      .filter(m => m.role !== 'welcome' && m.content)
      .map(m => `${m.role === 'user' ? 'Teacher' : 'AI'}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`)
      .join('\n');
    
    const conversationContext = recentHistory 
      ? `\n\nRECENT CONVERSATION HISTORY (for context):\n${recentHistory}\n\nUse this context to understand references like "it", "that topic", etc.`
      : '';
    
    // Available sections for tool calls
    const availableSections = teacherData.courses.flatMap(c => c.sections.map(s => `${s.id} (${c.title})`)).join(', ');
    
    // Build temporal context - today's schedule, current/next class
    const sessions = getUpcomingSessions(teacherData, 1); // Today and tomorrow
    const now = new Date();
    // Use local date format to avoid UTC timezone issues
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTimeStr = now.toTimeString().slice(0, 5);
    
    const todaysSessions = sessions.filter(s => s.date === today);
    const currentClass = todaysSessions.find(s => {
      const startMinutes = parseInt(s.startTime.split(':')[0]) * 60 + parseInt(s.startTime.split(':')[1] || 0);
      const endMinutes = parseInt(s.endTime.split(':')[0]) * 60 + parseInt(s.endTime.split(':')[1] || 0);
      const nowMinutes = parseInt(currentTimeStr.split(':')[0]) * 60 + parseInt(currentTimeStr.split(':')[1]);
      return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    });
    const nextClass = todaysSessions.find(s => s.startTime > currentTimeStr);
    
    let temporalContext = `\nTEMPORAL CONTEXT (Current time: ${currentTimeStr}):`;
    temporalContext += `\n- Today's classes: ${todaysSessions.length > 0 ? todaysSessions.map(s => `${s.subject} ${s.classId} at ${s.startTime}`).join(', ') : 'No classes scheduled'}`;
    if (currentClass) {
      temporalContext += `\n- CURRENTLY IN CLASS: ${currentClass.subject} ${currentClass.classId} (${currentClass.startTime}-${currentClass.endTime})`;
    }
    if (nextClass) {
      temporalContext += `\n- Next class: ${nextClass.subject} ${nextClass.classId} at ${nextClass.startTime}`;
    }
    
    // Build current URL context - explicit about what page user is viewing
    let currentPageContext = '';
    if (currentSectionId && currentCourseId) {
      const course = teacherData.courses.find(c => c.id === currentCourseId);
      currentPageContext = `\n\nCURRENT PAGE CONTEXT (from URL):
- User is currently viewing: ${course?.title || currentCourseId} - Section ${currentSectionId}
- DEFAULT SECTION: ${currentSectionId} (use this if teacher doesn't specify a section)
- When teacher says "mark topic done" without specifying section, use sectionId="${currentSectionId}"`;
    } else {
      currentPageContext = `\n\nCURRENT PAGE CONTEXT:
- User is on a general page (not viewing a specific class)
- Only ask which section if they specifically want to update syllabus/attendance
- For general conversation or teaching discussions, just respond normally
- Available sections (if needed for tools): ${availableSections}`;
    }
    
    return `You are Staffroom AI, a helpful and intelligent teaching assistant.

CRITICAL LANGUAGE RULE - MANDATORY:
- You MUST ALWAYS respond in ENGLISH ONLY, regardless of the input language
- If the teacher speaks in Hindi, Hinglish, Spanish, or ANY other language, understand them but ALWAYS respond in English
- Do NOT repeat the user's words in their original language
- Your ONLY output language is English

CRITICAL RESPONSE STYLE - MANDATORY:
- Respond CONVERSATIONALLY and DIRECTLY to the user
- NEVER output your inner reasoning, thought process, or chain-of-thought as your response
- NEVER say things like "I need to identify...", "Let me process...", "The user is asking...", "I should..."
- Instead, speak DIRECTLY like a human assistant: "Sure!", "Done!", "Marked Aarav as present.", "Your next topic is..."
- Keep responses SHORT and NATURAL — as if speaking to someone in person
- When executing tools, just confirm the action: "Got it, Aarav is present." NOT "I am now calling the mark_student_present function..."

You help teachers with:
- Lesson planning and curriculum design
- Generating quizzes, assignments, and assessments
- Student progress tracking and performance analysis
- Attendance management with voice commands
- Syllabus planning and topic tracking
- Classroom management strategies and tips
- Educational resource recommendations
- GENERAL TEACHING DISCUSSIONS - teachers may talk about subjects they teach (programming, math, science, etc.)

IMPORTANT: WHEN TO USE TOOLS vs GENERAL CONVERSATION:
- If teacher is TEACHING or EXPLAINING concepts (like programming, variables, Python), just listen and respond helpfully
- DO NOT ask for section/class info unless they explicitly want to update syllabus or attendance
- Tools are ONLY needed when teacher says "mark topic done", "mark student present", etc.
- For general conversation about teaching, coding, subjects - just respond naturally without tools

IMPORTANT CAPABILITIES:
- You can mark student attendance using voice commands (e.g., "mark Aarav as present")
- You can update syllabus progress and mark topics as completed
- You can find which topic contains a specific page number
- You can NAVIGATE to different pages (e.g., "open 6A geography", "show me my schedule", "go to dashboard")
- You can answer general questions about teaching and education
- You provide concise, practical advice focused on teacher needs
${syllabusContext}${studentNames}${temporalContext}${currentPageContext}

AVAILABLE SECTIONS: ${availableSections}

NAVIGATION:
- Use navigateTo tool when teacher asks to "open", "show", "go to", or "take me to" a page
- Examples: "open 6A geography" → navigateTo("6A geography")
- "show me my schedule" → navigateTo("schedule")
- "go to dashboard" → navigateTo("dashboard")
- Available pages: dashboard, schedule, classes, assessments, resources, profile, settings, and all class pages like "6A geography"

TOOL USAGE - USE THE SAME MULTI-STEP APPROACH AS TEXT CHAT:
1. When teacher mentions a topic by NAME: use searchTopic → updateProgress
2. When teacher mentions a PAGE NUMBER (e.g., "left at page 34"): use findTopicByPage → get topic indices
3. Then use updateProgress with the found indices to update status/currentPage/notes
4. Always use searchTopic or findTopicByPage before updateProgress

FINDING TOPICS BY PAGE NUMBER:
- If teacher says "I stopped at page 34" or "left at page 34", use findTopicByPage(sectionId, 34)
- This returns the topic whose page range includes that page
- Then use updateProgress with the returned chapterIndex/topicIndex and set currentPage

MULTI-STEP SYLLABUS UPDATE LOGIC:
When teacher gives multiple pieces of info like "done with X, covered to page Y, note Z":

1. FIRST: Mark the mentioned topic as DONE (complete)
   - searchTopic("X") → get indices
   - updateProgress(status="complete") → NO notes, NO currentPage for completed topic

2. THEN: Find what topic contains page Y (this is the NEXT topic they're working on)
   - findTopicByPage(sectionId, Y) → get the topic containing that page
   - updateProgress(status="ongoing", currentPage=Y, notes="Z") → notes go HERE on ongoing topic

EXAMPLE: "done with Plains and Valleys, covered to page 42, students understood clearly"
- Plains and Valleys is p.29-36, page 42 is in Rivers and Deltas (p.37-44)
- Step 1: searchTopic("Plains and Valleys") → updateProgress(status="complete")
- Step 2: findTopicByPage(sectionId, 42) → returns Rivers and Deltas indices
- Step 3: updateProgress(status="ongoing", currentPage=42, notes="students understood clearly")

KEY INSIGHT: The note "students understood clearly about the new topic" refers to WHERE THEY LEFT OFF (the ongoing topic), not the completed topic!

CRITICAL: findTopicByPage ONLY FINDS the topic - it does NOT update anything!
- After calling findTopicByPage, you MUST call updateProgress to actually make changes
- findTopicByPage returns chapterIndex and topicIndex - use these in updateProgress
- Never say "I've updated" unless you actually called updateProgress!

CRITICAL INSTRUCTIONS:
- For syllabus updates: ALWAYS use tools first, then respond with confirmation
- When user is on a specific section page, use that section by default
- Execute tools immediately without asking for clarification when context is clear
- Be friendly, efficient, and action-oriented
${conversationContext}

Respond helpfully and naturally to voice input. Execute relevant tools immediately when the intent is clear.`;
  }, [aiContext, getContextFromURL, students, messages]);

  const startGeminiLiveRecording = useCallback(async () => {
    try {
      setIsRecording(true);
      setLiveStatus('connecting');
      
      // Get combined tools (attendance + syllabus)
      const tools = getToolsByContext('combined');
      
      // Common session options
      const sessionOptions = {
        classId: 'GlobalChat',
        studentList: students || [],
        systemPrompt: buildVoiceSystemPrompt(),
        tools: tools,
        onTranscript: (data) => {
          if (data.type === 'input') {
            // Show live transcription - but NOT in input box (separate from text mode)
            setLiveTranscript(data.combined || data.transcript || '');
            liveTranscriptRef.current = data.combined || data.transcript || '';
          } else if (data.type === 'thinking' && data.text) {
            // Model is thinking/reasoning — store as collapsible thinking text
            // First add the user message if not added yet
            const currentTranscript = liveTranscriptRef.current;
            if (currentTranscript && currentTranscript.trim()) {
              setMessages(prev => {
                const lastUserMsg = prev.filter(m => m.role === 'user').slice(-1)[0];
                if (lastUserMsg && lastUserMsg.content === currentTranscript.trim()) {
                  return prev;
                }
                return [
                  ...prev,
                  {
                    id: Date.now() - 1,
                    role: 'user',
                    content: currentTranscript.trim(),
                    timestamp: new Date(),
                    isVoice: true,
                  }
                ];
              });
              liveTranscriptRef.current = '';
            }
            
            // Stream thinking text into the message's thinking field
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, thinking: (lastMsg.thinking || '') + data.text }
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: Date.now(),
                    role: 'assistant',
                    content: '', // Will be filled by outputTranscription
                    thinking: data.text,
                    timestamp: new Date(),
                    isStreaming: true,
                    isVoice: true,
                  }
                ];
              }
            });
          } else if (data.type === 'model' && data.text) {
            // Model's actual spoken response (from outputTranscription)
            // First add the user message if not added yet
            const currentTranscript = liveTranscriptRef.current;
            if (currentTranscript && currentTranscript.trim()) {
              setMessages(prev => {
                const lastUserMsg = prev.filter(m => m.role === 'user').slice(-1)[0];
                if (lastUserMsg && lastUserMsg.content === currentTranscript.trim()) {
                  return prev;
                }
                return [
                  ...prev,
                  {
                    id: Date.now() - 1,
                    role: 'user',
                    content: currentTranscript.trim(),
                    timestamp: new Date(),
                    isVoice: true,
                  }
                ];
              });
              liveTranscriptRef.current = '';
            }
            
            // Stream actual response into the message's content field
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: (lastMsg.content || '') + data.text }
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: Date.now(),
                    role: 'assistant',
                    content: data.text,
                    timestamp: new Date(),
                    isStreaming: true,
                    isVoice: true,
                  }
                ];
              }
            });
          }
        },
        onToolCall: (toolCall) => {
          // Tool call already processed by voice service
          // toolCall contains: { id, name, args, display, result }
          const displayText = toolCall.display || `${toolCall.name || 'Tool'} executed`;
          addAssistantMessage(`✓ ${displayText}`, {
            type: 'tool-action',
            toolName: toolCall.name,
            args: toolCall.args,
            result: toolCall.result
          });
          
          // Handle navigation if the tool result includes a path
          // navigateTo returns { success: true, path: '/...', message: '...' }
          if (toolCall.result?.success && toolCall.result?.path) {
            console.log('[Voice] Navigating to:', toolCall.result.path);
            setTimeout(() => {
              navigate(toolCall.result.path);
            }, 500);
          }
        },
        onTurnComplete: () => {
          // Mark streaming messages as complete AND save in the same setMessages callback
          // This ensures we save the absolute latest messages (including the last onTranscript update)
          setMessages(prev => {
            const finalized = prev.map(msg => 
              msg.isStreaming ? { ...msg, isStreaming: false } : msg
            );
            // Save directly from the setState callback — `finalized` is the authoritative latest state
            if (finalized.length > 0) {
              buildAndSaveSession(finalized, currentSessionIdRef.current, isAuthedRef.current);
            }
            return finalized;
          });
          
          // Clear transcript display for next turn
          setLiveTranscript('');
          liveTranscriptRef.current = '';
          
          // Don't auto-disconnect — keep session alive for multi-turn conversation.
          // User must press stop button to end session.
        },
        onStatusChange: (status) => {
          console.log(`[Voice ${USE_AZURE_VOICE ? 'Azure' : 'Gemini'}] Status:`, status);
          setLiveStatus(status);
        },
        onError: (error) => {
          console.error('Voice session error:', error);
          addAssistantMessage(`⚠️ Connection error: ${error.message}`);
          setIsRecording(false);
          setLiveStatus('disconnected');
        },
      };
      
      // Create session based on provider
      let session;
      if (USE_AZURE_VOICE && isAzureRealtimeAvailable()) {
        console.log('[Voice] Using Azure OpenAI Realtime API');
        session = new AzureRealtimeSession(sessionOptions);
      } else {
        console.log('[Voice] Using Gemini Live');
        session = new GeminiLiveSession(sessionOptions);
      }
      
      await session.connect();
      geminiLiveSessionRef.current = session;
      
      // Start streaming (Azure uses start(), Gemini uses startStreaming())
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
  }, [addAssistantMessage, students, buildVoiceSystemPrompt]);

  // Stop Gemini Live recording
  const stopGeminiLiveRecording = useCallback(async () => {
    if (geminiLiveSessionRef.current) {
      const session = geminiLiveSessionRef.current;
      geminiLiveSessionRef.current = null; // Prevent double-stop
      
      // Stop session and wait for final processing
      // Azure uses async stop() that processes remaining text
      // Gemini uses disconnect()
      try {
        if (session.stop) {
          await session.stop();
        } else if (session.disconnect) {
          session.disconnect();
        }
      } catch (err) {
        console.error('Error stopping voice session:', err);
      }
      
      setIsRecording(false);
      setLiveStatus('disconnected');
      setLiveTranscript('');
    }
  }, []);

  // Start voice recording (fallback to browser)
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

  // Stop voice recording
  const stopRecording = useCallback(async () => {
    if (useLiveAPI) {
      await stopGeminiLiveRecording();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, [useLiveAPI, stopGeminiLiveRecording]);

  // Toggle voice recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Process user input and generate response
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() && attachments.length === 0) return;

    const userContent = content || inputValue;
    setInputValue('');
    
    // Capture current attachments before addUserMessage clears them
    const currentAttachments = [...attachments];
    const userMessage = addUserMessage(userContent);
    setIsLoading(true);

    try {
      // Process file attachments for the AI
      let fileContents = [];
      if (currentAttachments.length > 0) {
        fileContents = await Promise.all(currentAttachments.map(async (att) => {
          const file = att.file || att;
          try {
            if (file.type?.startsWith('image/')) {
              // Read image as base64 for Gemini vision
              const base64 = await readFileAsBase64(file);
              return { type: 'image', mimeType: file.type, data: base64, name: file.name || att.name };
            } else {
              // Read text-based files (CSV, TXT, JSON, etc.)
              const text = await readFileAsText(file);
              return { type: 'text', mimeType: file.type, data: text, name: file.name || att.name };
            }
          } catch (err) {
            console.error(`[sendMessage] Failed to read file ${att.name}:`, err);
            return { type: 'error', name: att.name, error: err.message };
          }
        }));
      }

      // Check if this is a response to a pending clarification
      if (pendingAction) {
        const clarificationResult = await handleClarificationResponse(userContent, pendingAction);
        if (clarificationResult.handled) {
          addAssistantMessage(clarificationResult.response);
          setPendingAction(null);
          setIsLoading(false);
          return;
        }
      }

      // First, try to process through plugins
      const registeredPlugins = getChatPlugins();
      
      // Build dynamic context from teacherData AND current URL
      const urlContext = getContextFromURL();
      const dynamicContext = {
        ...aiContext,
        courses: teacherData.courses,
        // Priority: explicit aiContext > URL context > null (let LLM figure it out)
        currentCourseId: aiContext.currentCourseId || urlContext.courseId || null,
        currentSectionId: aiContext.currentSectionId || urlContext.sectionId || null,
        urlContext, // Pass URL context for plugins to use
      };
      
      for (const plugin of registeredPlugins) {
        if (plugin.onMessage) {
          const result = await plugin.onMessage(userMessage, dynamicContext);
          if (result && result.handled) {
            if (result.response) {
              addAssistantMessage(result.response);
            }
            // Capture pending action for clarification flow
            if (result.pendingAction) {
              setPendingAction(result.pendingAction);
            }
            setIsLoading(false);
            return;
          }
        }
      }

      // ========== LLM-FIRST CHAT PROCESSING ==========
      // Use the LLM with function calling to understand and respond to messages
      // This handles natural language, follow-ups like "and 6A?", and all queries
      
      const response = await processChat(
        userContent, 
        messages, // Pass conversation history for context
        {
          currentCourseId: dynamicContext.currentCourseId,
          currentSectionId: dynamicContext.currentSectionId,
          urlContext: dynamicContext.urlContext,
          attachments: fileContents.length > 0 ? fileContents : undefined,
        }
      );
      
      // Handle response - can be string or object with navigation
      if (typeof response === 'object' && response.navigate) {
        addAssistantMessage(response.text);
        // Navigate using React Router to preserve chat state
        setTimeout(() => {
          navigate(response.navigate);
        }, 500);
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
  }, [inputValue, attachments, aiContext, addUserMessage, addAssistantMessage, pendingAction, getContextFromURL, messages]);

  // ========== CLARIFICATION HANDLER ==========
  
  /**
   * Handle user response to a clarification request
   * User can respond with just section name to complete pending action
   */
  async function handleClarificationResponse(userResponse, pending) {
    const lower = userResponse.toLowerCase().trim();
    
    // Check if user is responding with a section name
    const allSectionIds = teacherData.courses.flatMap(c => c.sections.map(s => s.id));
    const sectionPattern = new RegExp(`^(${allSectionIds.join('|')})$`, 'i');
    const sectionMatch = lower.match(sectionPattern);
    
    // Also check for "section X" or "class X" patterns  
    const prefixedMatch = lower.match(/^(?:section|class|in)?\s*([a-z0-9]+)$/i);
    const matchedSection = sectionMatch 
      ? sectionMatch[1].toUpperCase()
      : (prefixedMatch && allSectionIds.some(s => s.toUpperCase() === prefixedMatch[1].toUpperCase()))
        ? prefixedMatch[1].toUpperCase()
        : null;
    
    if (matchedSection && pending.type === 'progress_update') {
      // User provided the section, now complete the pending action
      const { parsed, matchedTopic, matchedChapter } = pending;
      
      // Find the course that has this section
      const course = teacherData.courses.find(c => 
        c.sections.some(s => s.id.toUpperCase() === matchedSection)
      );
      
      if (!course) {
        return {
          handled: true,
          response: `❌ Section "${matchedSection}" not found. Available sections: ${allSectionIds.join(', ')}`
        };
      }
      
      const section = course.sections.find(s => s.id.toUpperCase() === matchedSection);
      const syllabus = getSyllabusByRef(course.syllabusRef);
      
      if (!section || !syllabus) {
        return { handled: true, response: '❌ Could not find section or syllabus data.' };
      }
      
      // Verify the topic exists in this course's syllabus
      const chapter = syllabus.chapters.find(ch => ch.index === parsed.chapterIndex);
      const topic = chapter?.subTopics?.find(t => t.index === parsed.topicIndex);
      
      if (!topic) {
        // Topic doesn't exist in this course - suggest the right one
        return {
          handled: true,
          response: `❌ "${matchedTopic || 'That topic'}" doesn't exist in ${course.title}.\n\n` +
                    `Did you mean a different subject? The topic was found in: **${parsed.matchedCourse || 'another course'}**`
        };
      }
      
      // Update progress
      if (!section.progress[parsed.chapterIndex]) {
        section.progress[parsed.chapterIndex] = { topics: {} };
      }
      
      const statusMap = {
        'mark_complete': 'done',
        'mark_ongoing': 'ongoing', 
        'mark_pending': 'not-started'
      };
      
      section.progress[parsed.chapterIndex].topics[parsed.topicIndex] = statusMap[parsed.action];
      persistProgress(matchedSection, section.progress);
      
      return {
        handled: true,
        response: `✅ **Progress Updated!**\n\n` +
                  `**${chapter.title}** → **${topic.title}**\n\n` +
                  `Status: ${statusMap[parsed.action].toUpperCase()}\n` +
                  `Section: ${matchedSection}`
      };
    }
    
    // User response doesn't match expected clarification - not handled
    return { handled: false };
  }

  // ========== HELPER FUNCTIONS FOR DYNAMIC RESPONSES ==========
  
  // Get progress summary for a section or all sections
  function getProgressSummary(sectionId = null) {
    let response = '📊 **Syllabus Progress**\n\n';
    
    teacherData.courses.forEach(course => {
      const syllabus = getSyllabusByRef(course.syllabusRef);
      if (!syllabus) return;
      
      const sectionsToShow = sectionId 
        ? course.sections.filter(s => s.id.toUpperCase() === sectionId.toUpperCase())
        : course.sections;
      
      if (sectionsToShow.length === 0) return;
      
      response += `**${course.title}**\n`;
      
      sectionsToShow.forEach(section => {
        const baseProgress = normalizeSectionProgress(syllabus, section.progress);
        const storedProgress = loadStoredProgress(section.id, baseProgress);
        const percent = calculateTopicProgressPercent(syllabus, storedProgress);
        
        const progressBar = getProgressBar(percent);
        response += `• Section ${section.id}: ${progressBar} ${percent}%\n`;
        
        // Show chapter breakdown if single section
        if (sectionId) {
          response += '\n  **Chapters:**\n';
          syllabus.chapters.forEach(chapter => {
            const chapterProgress = storedProgress[chapter.index]?.topics || {};
            const done = Object.values(chapterProgress).filter(s => s === 'done').length;
            const total = chapter.subTopics.length;
            const chapterPercent = total > 0 ? Math.round((done / total) * 100) : 0;
            response += `  ${chapter.index}. ${chapter.title}: ${chapterPercent}% (${done}/${total} topics)\n`;
          });
        }
      });
      response += '\n';
    });
    
    if (response === '📊 **Syllabus Progress**\n\n') {
      const availableSections = teacherData.courses.flatMap(c => c.sections.map(s => s.id)).join(', ');
      response += sectionId 
        ? `Section "${sectionId}" not found. Available sections: ${availableSections}`
        : 'No progress data available.';
    }
    
    return response;
  }
  
  // Get attendance summary
  function getAttendanceSummary(sectionId = null) {
    let response = '📋 **Attendance Summary**\n\n';
    
    // Get all section IDs dynamically from teacherData
    const allSections = teacherData.courses.flatMap(c => c.sections.map(s => s.id));
    const sectionsToCheck = sectionId 
      ? [sectionId.toUpperCase()]
      : allSections;
    
    sectionsToCheck.forEach(classId => {
      const classStudents = students.filter(s => s.classId === classId);
      const classLogs = attendanceLogs.filter(l => l.classId === classId);
      
      if (classStudents.length === 0) return;
      
      const totalRecords = classLogs.length;
      const presentRecords = classLogs.filter(l => l.status === 'present').length;
      const attendancePercent = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
      
      response += `**Section ${classId}**\n`;
      response += `• Overall: ${attendancePercent}%\n`;
      response += `• Students: ${classStudents.length}\n`;
      
      // Find students with low attendance
      const lowAttendance = classStudents.filter(student => {
        const studentLogs = classLogs.filter(l => l.studentId === student.studentId);
        const studentPresent = studentLogs.filter(l => l.status === 'present').length;
        const studentPercent = studentLogs.length > 0 ? (studentPresent / studentLogs.length) * 100 : 100;
        return studentPercent < 75;
      });
      
      if (lowAttendance.length > 0) {
        response += `• ⚠️ Below 75%: ${lowAttendance.map(s => s.name).join(', ')}\n`;
      }
      response += '\n';
    });
    
    return response;
  }
  
  // Get assignment summary
  function getAssignmentSummary(sectionId = null) {
    let response = '📝 **Assignments**\n\n';
    
    const relevantAssignments = sectionId 
      ? assignments.filter(a => a.classId.toUpperCase() === sectionId.toUpperCase())
      : assignments;
    
    if (relevantAssignments.length === 0) {
      return response + (sectionId ? `No assignments for section ${sectionId}.` : 'No assignments found.');
    }
    
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = relevantAssignments.filter(a => a.dueDate >= today);
    const past = relevantAssignments.filter(a => a.dueDate < today);
    
    if (upcoming.length > 0) {
      response += '**Upcoming:**\n';
      upcoming.forEach(a => {
        const classStudents = students.filter(s => s.classId === a.classId).length;
        const submitted = a.submissions.length;
        response += `• **${a.title}** (${a.classId})\n`;
        response += `  Due: ${a.dueDate} | Submitted: ${submitted}/${classStudents}\n`;
      });
      response += '\n';
    }
    
    if (past.length > 0) {
      response += '**Past Due:**\n';
      past.slice(0, 3).forEach(a => {
        const avgGrade = a.submissions.length > 0 
          ? (a.submissions.reduce((s, c) => s + c.grade, 0) / a.submissions.length).toFixed(1)
          : 'N/A';
        response += `• ${a.title} (${a.classId}) - Avg: ${avgGrade}/${a.maxPoints}\n`;
      });
    }
    
    return response;
  }
  
  // Get student insights
  function getStudentInsights() {
    let response = '🎯 **Students Needing Attention**\n\n';
    
    const studentsAtRisk = [];
    
    students.forEach(student => {
      const studentLogs = attendanceLogs.filter(l => l.studentId === student.studentId);
      const presentCount = studentLogs.filter(l => l.status === 'present').length;
      const attendancePercent = studentLogs.length > 0 ? (presentCount / studentLogs.length) * 100 : 100;
      
      // Find assignment submissions
      const classAssignments = assignments.filter(a => a.classId === student.classId);
      const studentSubmissions = classAssignments.flatMap(a => 
        a.submissions.filter(s => s.studentId === student.studentId)
      );
      const submissionRate = classAssignments.length > 0 
        ? (studentSubmissions.length / classAssignments.length) * 100 
        : 100;
      
      const issues = [];
      if (attendancePercent < 75) issues.push(`Attendance: ${attendancePercent.toFixed(0)}%`);
      if (submissionRate < 70) issues.push(`Submissions: ${submissionRate.toFixed(0)}%`);
      
      if (issues.length > 0) {
        studentsAtRisk.push({ ...student, issues, attendancePercent });
      }
    });
    
    if (studentsAtRisk.length === 0) {
      return response + '✅ All students are on track! No immediate concerns.';
    }
    
    // Sort by attendance (lowest first)
    studentsAtRisk.sort((a, b) => a.attendancePercent - b.attendancePercent);
    
    studentsAtRisk.slice(0, 5).forEach((student, i) => {
      response += `${i + 1}. **${student.name}** (${student.classId})\n`;
      response += `   ${student.issues.join(' | ')}\n`;
    });
    
    response += '\n*Would you like me to draft a parent communication for any of these students?*';
    
    return response;
  }
  
  // Helper to create a text progress bar
  function getProgressBar(percent) {
    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  // Get next topic suggestion for a section
  function getNextTopicSuggestion(sectionId = null) {
    let response = '💡 **Next Topic Suggestion**\n\n';
    
    // If no section specified, try URL context or ask for clarification
    if (!sectionId) {
      const urlContext = getContextFromURL();
      sectionId = urlContext.sectionId;
    }
    
    if (!sectionId) {
      // List all sections and ask
      const allSections = teacherData.courses.flatMap(c => 
        c.sections.map(s => `${s.id} (${c.title})`)
      );
      return response + `Which section would you like suggestions for?\n\nAvailable: ${allSections.join(', ')}\n\n*Try: "What next in 8B?" or "Suggest next topic for 6A"*`;
    }
    
    // Find the course and section
    let targetCourse = null;
    let targetSection = null;
    
    for (const course of teacherData.courses) {
      const section = course.sections.find(s => s.id.toUpperCase() === sectionId.toUpperCase());
      if (section) {
        targetCourse = course;
        targetSection = section;
        break;
      }
    }
    
    if (!targetCourse || !targetSection) {
      const availableSections = teacherData.courses.flatMap(c => c.sections.map(s => s.id)).join(', ');
      return response + `Section "${sectionId}" not found.\n\nAvailable sections: ${availableSections}`;
    }
    
    const syllabus = getSyllabusByRef(targetCourse.syllabusRef);
    if (!syllabus) {
      return response + `Could not find syllabus for ${targetCourse.title}.`;
    }
    
    // Get stored progress for this section
    const baseProgress = normalizeSectionProgress(syllabus, targetSection.progress);
    const storedProgress = loadStoredProgress(targetSection.id, baseProgress);
    
    // Find next incomplete topic
    let nextTopic = null;
    let nextChapter = null;
    let lastCompletedTopic = null;
    let lastCompletedChapter = null;
    
    for (const chapter of syllabus.chapters) {
      const chapterProgress = storedProgress[chapter.index]?.topics || {};
      
      for (const topic of chapter.subTopics || []) {
        const status = chapterProgress[topic.index] || 'not-started';
        
        if (status === 'done') {
          lastCompletedTopic = topic;
          lastCompletedChapter = chapter;
        } else if (!nextTopic) {
          // First incomplete topic
          nextTopic = topic;
          nextChapter = chapter;
          break;
        }
      }
      
      if (nextTopic) break;
    }
    
    if (!nextTopic) {
      return response + `🎉 **Congratulations!**\n\nAll topics in **${targetCourse.title}** for section **${targetSection.id}** are complete!\n\nConsider:\n• Revision sessions\n• Practice tests\n• Moving to advanced topics`;
    }
    
    response += `**${nextChapter.title}** → **${nextTopic.title}**\n\n`;
    response += `📍 Section: ${targetSection.id}\n`;
    response += `📚 Subject: ${syllabus.subject} (Grade ${syllabus.grade})\n\n`;
    
    if (lastCompletedTopic) {
      response += `*After completing "${lastCompletedTopic.title}", this is the natural next step.*\n\n`;
    }
    
    // Check for upcoming exams
    const upcomingExam = targetSection.exams?.find(e => new Date(e.date) > new Date());
    if (upcomingExam) {
      const daysUntil = Math.ceil((new Date(upcomingExam.date) - new Date()) / (1000 * 60 * 60 * 24));
      response += `⚠️ **Upcoming Exam**: ${upcomingExam.type} in ${daysUntil} days (covers up to Chapter ${upcomingExam.syllabusUpTo})\n\n`;
    }
    
    response += `*Say "Mark ${nextTopic.title} complete in ${targetSection.id}" when done!*`;
    
    return response;
  }

  // Clear chat history
  const clearChat = useCallback(() => {
    if (currentSessionId) {
      if (isAuthed) {
        deleteChatSessionFromFirestore(currentSessionId);
      }
      deleteChatSession(currentSessionId);

      if (!isAuthed) {
        setChatHistory(getAllChatSessions());
      }
    }
    
    // Start a new session
    startNewChatSession();
  }, [currentSessionId, startNewChatSession, isAuthed]);

  // Add attachment
  const addAttachment = useCallback((file) => {
    setAttachments((prev) => [...prev, file]);
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update AI context
  const updateContext = useCallback((newContext) => {
    setAIContext((prev) => ({ ...prev, ...newContext }));
  }, []);

  // Get plugin API for a specific plugin
  const getPluginAPI = useCallback(() => {
    return createPluginAPI({
      addMessage: addAssistantMessage,
      setLoading: setIsLoading,
      getContext: () => aiContext,
      updateContext,
    });
  }, [addAssistantMessage, aiContext, updateContext]);

  // Process message through plugins
  const processPluginMessage = useCallback(async (message) => {
    const registeredPlugins = getChatPlugins();
    
    for (const plugin of registeredPlugins) {
      if (plugin.onMessage) {
        const handled = await plugin.onMessage(message, getPluginAPI());
        if (handled) {
          return true; // Message was handled by plugin
        }
      }
    }
    return false; // No plugin handled the message
  }, [getPluginAPI]);

  // Activate a specific plugin
  const activatePlugin = useCallback((pluginId) => {
    const plugin = plugins.find(p => p.id === pluginId);
    if (plugin) {
      setActivePlugin(plugin);
    }
  }, [plugins]);

  // Deactivate current plugin
  const deactivatePlugin = useCallback(() => {
    setActivePlugin(null);
  }, []);

  const value = {
    // Chat UI state
    isOpen,
    isExpanded,
    isDocked,
    openChat,
    closeChat,
    toggleChat,
    expandChat,
    collapseChat,
    toggleExpanded,
    toggleDocked,

    // Messages
    messages,
    setMessages,
    addUserMessage,
    addAssistantMessage,
    sendMessage,
    clearChat,

    // Chat history and sessions
    currentSessionId,
    chatHistory,
    startNewChatSession,
    loadChatSession,
    deleteChatSessionById,
    renameChatSession,

    // Input
    inputValue,
    setInputValue,
    isLoading,

    // Voice
    isRecording,
    startRecording,
    stopRecording,
    toggleRecording,
    // Gemini Live API
    useLiveAPI,
    setUseLiveAPI,
    liveStatus,
    liveTranscript,

    // Attachments
    attachments,
    addAttachment,
    removeAttachment,

    // Context
    aiContext,
    updateContext,

    // Suggestions
    suggestions,
    setSuggestions,

    // Plugins
    plugins,
    activePlugin,
    activatePlugin,
    deactivatePlugin,
    processPluginMessage,
    getPluginAPI,
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
 * Use in components wrapped by error boundaries to prevent crashes during HMR.
 */
export function useAISafe() {
  return useContext(AIContext);
}

export default AIContext;
