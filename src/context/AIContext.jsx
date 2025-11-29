import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { parseVoiceTranscript, generateDailyBriefing, generateQuiz, generateAssignment, processChat } from '../services/aiService';
import { initializeAllPlugins, getChatPlugins, createPluginAPI } from '../plugins';
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

  // Start voice recording
  const startRecording = useCallback(() => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      console.warn('Speech recognition not supported');
    }
  }, []);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  // Toggle voice recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

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
      
      addAssistantMessage(response);
      
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

    // Input
    inputValue,
    setInputValue,
    isLoading,

    // Voice
    isRecording,
    startRecording,
    stopRecording,
    toggleRecording,

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
