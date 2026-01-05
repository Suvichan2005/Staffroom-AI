import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseVoiceTranscript, generateDailyBriefing, generateQuiz, generateAssignment, processChat } from '../services/aiService';
import { GeminiLiveSession } from '../services/geminiLiveService';
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

export function AIProvider({ children }) {
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

  // Initialize or restore chat session on mount (using Firestore)
  useEffect(() => {
    const initChatFromFirestore = async () => {
      if (sessionInitializedRef.current) return;
      sessionInitializedRef.current = true;
      
      try {
        // Load chat history from Firestore
        const firestoreHistory = await getAllChatSessionsFromFirestore();
        
        // If no Firestore data but local data exists, migrate it
        const localHistory = getAllChatSessions();
        if (firestoreHistory.length === 0 && localHistory.length > 0) {
          console.log('[AIContext] Migrating local chat history to Firestore');
          await syncLocalToFirestore(localHistory);
          setChatHistory(localHistory);
        } else {
          setChatHistory(firestoreHistory);
        }
        
        // Check if there's a current session ID in storage
        const storedSessionId = getCurrentSessionId();
        
        if (storedSessionId && firestoreHistory.length > 0) {
          // Try to load from Firestore first
          const session = firestoreHistory.find(s => s.id === storedSessionId) 
            || await getChatSessionFromFirestore(storedSessionId);
          if (session) {
            setCurrentSessionIdState(storedSessionId);
            // Convert stored messages to display format
            const formattedMessages = session.messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }));
            setMessages(formattedMessages.length > 0 ? formattedMessages : [
              {
                id: 'welcome',
                role: 'assistant',
                content: "Hi! I'm your AI teaching assistant. I can help you with lesson planning, generate quizzes, track student progress, and more. What would you like help with?",
                timestamp: new Date(),
              },
            ]);
            console.log(`[AIContext] Restored session ${storedSessionId} from Firestore`);
          } else {
            // Session not found, start new
            startNewChatSession();
          }
        } else if (firestoreHistory.length > 0) {
          // Load most recent session
          const mostRecent = firestoreHistory[0];
          setCurrentSessionIdState(mostRecent.id);
          setCurrentSessionId(mostRecent.id);
          const formattedMessages = mostRecent.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(formattedMessages.length > 0 ? formattedMessages : [
            {
              id: 'welcome',
              role: 'assistant',
              content: "Hi! I'm your AI teaching assistant. I can help you with lesson planning, generate quizzes, track student progress, and more. What would you like help with?",
              timestamp: new Date(),
            },
          ]);
          console.log(`[AIContext] Loaded most recent session from Firestore`);
        } else {
          // No sessions at all, start new
          startNewChatSession();
        }
        
        lastPathRef.current = window.location.pathname;
      } catch (error) {
        console.error('[AIContext] Error loading from Firestore, falling back to local:', error);
        // Fallback to local storage
        const history = getAllChatSessions();
        setChatHistory(history);
        startNewChatSession();
      }
    };
    
    initChatFromFirestore();
  }, []);

  // Session management functions
  const startNewChatSession = useCallback(() => {
    const context = getContextFromURL();
    const newSession = createNewChatSession(context);
    
    saveChatSession(newSession);
    // Also save to Firestore
    saveChatSessionToFirestore(newSession);
    setCurrentSessionId(newSession.id);
    setCurrentSessionIdState(newSession.id);
    
    // Reset to welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your AI teaching assistant. I can help you with lesson planning, generate quizzes, track student progress, and more. What would you like help with?",
        timestamp: new Date(),
      },
    ]);
    
    // Refresh history from Firestore
    getAllChatSessionsFromFirestore().then(setChatHistory).catch(() => {
      setChatHistory(getAllChatSessions());
    });
    
    console.log(`[AIContext] Started new session ${newSession.id}`);
    return newSession.id;
  }, [getContextFromURL]);

  const loadChatSession = useCallback(async (sessionId) => {
    // Try Firestore first, fallback to local
    let session = await getChatSessionFromFirestore(sessionId);
    if (!session) {
      session = getChatSession(sessionId);
    }
    
    if (session) {
      setCurrentSessionId(sessionId);
      setCurrentSessionIdState(sessionId);
      
      // Load messages
      const formattedMessages = session.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
      setMessages(formattedMessages.length > 0 ? formattedMessages : [
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hi! I'm your AI teaching assistant. I can help you with lesson planning, generate quizzes, track student progress, and more. What would you like help with?",
          timestamp: new Date(),
        },
      ]);
      
      console.log(`[AIContext] Loaded session ${sessionId}`);
    }
  }, []);

  const deleteChatSessionById = useCallback(async (sessionId) => {
    // Delete from Firestore
    await deleteChatSessionFromFirestore(sessionId);
    // Also delete from local
    deleteChatSession(sessionId);
    
    // Refresh history from Firestore
    const firestoreHistory = await getAllChatSessionsFromFirestore();
    setChatHistory(firestoreHistory.length > 0 ? firestoreHistory : getAllChatSessions());
    
    // If deleted session was current, start new
    if (sessionId === currentSessionId) {
      startNewChatSession();
    }
  }, [currentSessionId, startNewChatSession]);

  const renameChatSession = useCallback(async (sessionId, newTitle) => {
    // Update in Firestore
    await updateChatTitleInFirestore(sessionId, newTitle);
    // Also update local
    updateChatTitle(sessionId, newTitle);
    
    // Refresh history from Firestore
    const firestoreHistory = await getAllChatSessionsFromFirestore();
    setChatHistory(firestoreHistory.length > 0 ? firestoreHistory : getAllChatSessions());
  }, []);

  // Persist messages to current session whenever they change (to both local and Firestore)
  useEffect(() => {
    if (currentSessionId && messages.length > 0 && sessionInitializedRef.current) {
      const session = getChatSession(currentSessionId);
      if (session) {
        session.messages = messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
        }));
        saveChatSession(session);
        // Also save to Firestore (debounced by Firestore's internal handling)
        saveChatSessionToFirestore(session);
      }
    }
  }, [messages, currentSessionId]);

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
- You MUST ask which section when updating syllabus progress
- Available sections: ${availableSections}`;
    }
    
    return `You are Staffroom AI, a helpful and intelligent teaching assistant.

You help teachers with:
- Lesson planning and curriculum design
- Generating quizzes, assignments, and assessments
- Student progress tracking and performance analysis
- Attendance management with voice commands
- Syllabus planning and topic tracking
- Classroom management strategies and tips
- Educational resource recommendations

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
      
      const session = new GeminiLiveSession({
        classId: 'GlobalChat',
        studentList: students || [],
        systemPrompt: buildVoiceSystemPrompt(),
        tools: tools,
        onTranscript: (data) => {
          if (data.type === 'input') {
            // Show live transcription - but NOT in input box (separate from text mode)
            setLiveTranscript(data.combined);
            liveTranscriptRef.current = data.combined; // Track in ref for callbacks
          } else if (data.type === 'model' && data.text) {
            // When model starts responding, first add the user message if not added
            const currentTranscript = liveTranscriptRef.current;
            if (currentTranscript && currentTranscript.trim()) {
              setMessages(prev => {
                // Check if we already have this user message
                const lastUserMsg = prev.filter(m => m.role === 'user').slice(-1)[0];
                if (lastUserMsg && lastUserMsg.content === currentTranscript.trim()) {
                  return prev; // Already added
                }
                // Add user message
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
              // Clear ref so we don't add again
              liveTranscriptRef.current = '';
            }
            
            // Stream model response - update last assistant message or create new one
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
                // Update existing streaming message
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: lastMsg.content + data.text }
                ];
              } else {
                // Create new streaming message
                return [
                  ...prev,
                  {
                    id: Date.now(),
                    role: 'assistant',
                    content: data.text,
                    timestamp: new Date(),
                    isStreaming: true
                  }
                ];
              }
            });
          }
        },
        onToolCall: (toolCall) => {
          // Tool call already processed by geminiLiveService.handleToolCall
          // toolCall contains: { id, name, args, display, result }
          const displayText = toolCall.display || `${toolCall.name || 'Tool'} executed`;
          addAssistantMessage(`✓ ${displayText}`, {
            type: 'tool-action',
            toolName: toolCall.name,
            args: toolCall.args,
            result: toolCall.result
          });
          
          // Handle navigation if the tool result includes a navigate path
          if (toolCall.result?.action === 'navigate' && toolCall.result?.path) {
            // Small delay to let the message appear first
            setTimeout(() => {
              window.location.href = toolCall.result.path;
            }, 500);
          }
        },
        onTurnComplete: () => {
          // Mark streaming message as complete
          setMessages(prev => {
            return prev.map(msg => 
              msg.isStreaming ? { ...msg, isStreaming: false } : msg
            );
          });
          
          // Clear transcript display (ref already cleared when user msg added)
          setLiveTranscript('');
          liveTranscriptRef.current = '';
          
          // Auto-stop recording after turn completes to allow text input
          // This prevents UI from being stuck in recording mode
          if (geminiLiveSessionRef.current) {
            setTimeout(() => {
              if (geminiLiveSessionRef.current) {
                geminiLiveSessionRef.current.disconnect();
                geminiLiveSessionRef.current = null;
              }
              setIsRecording(false);
              setLiveStatus('disconnected');
            }, 500);
          }
        },
        onStatusChange: (status) => {
          console.log('[Chat Gemini Live] Status:', status);
          setLiveStatus(status);
        },
        onError: (error) => {
          console.error('Gemini Live error:', error);
          addAssistantMessage(`⚠️ Connection error: ${error.message}`);
          setIsRecording(false);
          setLiveStatus('disconnected');
        },
      });
      
      await session.connect();
      geminiLiveSessionRef.current = session;
      await session.startStreaming();
    } catch (error) {
      console.error('Failed to start Gemini Live:', error);
      addAssistantMessage(`Error: Could not start voice recording. ${error.message}`);
      setIsRecording(false);
      setLiveStatus('disconnected');
    }
  }, [addAssistantMessage, students, buildVoiceSystemPrompt]);

  // Stop Gemini Live recording
  const stopGeminiLiveRecording = useCallback(() => {
    if (geminiLiveSessionRef.current) {
      geminiLiveSessionRef.current.disconnect();
      geminiLiveSessionRef.current = null;
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
  const stopRecording = useCallback(() => {
    if (useLiveAPI) {
      stopGeminiLiveRecording();
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
    const userMessage = addUserMessage(userContent);
    setIsLoading(true);

    try {
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
          urlContext: dynamicContext.urlContext
        }
      );
      
      // Handle response - can be string or object with navigation
      if (typeof response === 'object' && response.navigate) {
        addAssistantMessage(response.text);
        // Navigate after a short delay to show the message
        setTimeout(() => {
          window.location.href = response.navigate;
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
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Chat cleared. How can I help you?",
        timestamp: new Date(),
      },
    ]);
  }, []);

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

export default AIContext;
