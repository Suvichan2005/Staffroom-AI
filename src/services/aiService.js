import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  teacherData, 
  getSyllabusByRef, 
  getCourseById,
  normalizeSectionProgress,
  loadStoredProgress,
  calculateTopicProgressPercent,
  persistProgress,
  getUpcomingSessions,
  students,
  attendanceLogs,
  assignments,
  notifications,
  getUnreadNotifications
} from '../data/dummyData';

/**
 * AI Service for School Companion
 * Wraps Google Gemini API for various AI features
 * 
 * Features:
 * - Voice transcript parsing with function calling
 * - Quiz/Assignment generation
 * - Student analysis
 * - Daily briefing generation
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('⚠️  VITE_GEMINI_API_KEY not found. AI features will use mock responses.');
}

// Initialize Gemini
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Models
const MODELS = {
  TEXT: 'gemini-2.5-flash', // Fast, good for most tasks
  PRO: 'gemini-3-pro'     // More capable, use for complex analysis
};

// Generation config
const generationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
};

// Rate limit handling
const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 60000,
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error) {
  return error?.message?.includes('429') || 
         error?.message?.includes('quota') ||
         error?.message?.includes('rate limit') ||
         error?.status === 429;
}

/**
 * Extract retry delay from error message if available
 */
function extractRetryDelay(error) {
  const match = error?.message?.match(/retry in (\d+(?:\.\d+)?)/i);
  if (match) {
    return Math.ceil(parseFloat(match[1]) * 1000); // Convert to ms
  }
  return null;
}

/**
 * Core AI call function with retry logic
 */
async function callGemini(prompt, usePro = false, retryCount = 0) {
  if (!genAI) {
    console.warn('Using mock response - no API key');
    return getMockResponse(prompt);
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: usePro ? MODELS.PRO : MODELS.TEXT,
      generationConfig
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Handle rate limit with retry
    if (isRateLimitError(error) && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
      const suggestedDelay = extractRetryDelay(error);
      const backoffDelay = Math.min(
        RATE_LIMIT_CONFIG.baseDelayMs * Math.pow(2, retryCount),
        RATE_LIMIT_CONFIG.maxDelayMs
      );
      const delay = suggestedDelay || backoffDelay;
      
      console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`);
      await sleep(delay);
      return callGemini(prompt, usePro, retryCount + 1);
    }
    
    // Final fallback to mock if all retries exhausted
    if (isRateLimitError(error)) {
      console.warn('All retries exhausted, using mock response');
      return getMockResponse(prompt);
    }
    
    throw error;
  }
}

// ============================================================================
// TOOL DEFINITIONS FOR LLM FUNCTION CALLING
// ============================================================================

/**
 * Get list of all available courses with their sections
 */
function tool_getAvailableCourses() {
  return teacherData.courses.map(course => ({
    courseId: course.id,
    title: course.title,
    sections: course.sections.map(s => s.id),
    syllabusRef: course.syllabusRef
  }));
}

/**
 * Get syllabus for a specific course (by courseId or by subject+section)
 */
function tool_getSyllabus(courseId = null, subject = null, sectionId = null) {
  let course = null;
  
  // Find course by ID
  if (courseId) {
    course = teacherData.courses.find(c => c.id === courseId);
  }
  
  // Find course by subject name and/or section
  if (!course && (subject || sectionId)) {
    course = teacherData.courses.find(c => {
      const matchesSubject = !subject || c.title.toLowerCase().includes(subject.toLowerCase());
      const matchesSection = !sectionId || c.sections.some(s => s.id.toUpperCase() === sectionId.toUpperCase());
      return matchesSubject && matchesSection;
    });
  }
  
  if (!course) {
    return { error: 'Course not found', availableCourses: tool_getAvailableCourses() };
  }
  
  const syllabus = getSyllabusByRef(course.syllabusRef);
  if (!syllabus) {
    return { error: 'Syllabus not found for course', courseId: course.id };
  }
  
  return {
    courseId: course.id,
    courseTitle: course.title,
    sections: course.sections.map(s => s.id),
    subject: syllabus.subject,
    grade: syllabus.grade,
    chapters: syllabus.chapters.map(ch => ({
      index: ch.index,
      title: ch.title,
      topics: ch.subTopics.map(t => ({
        index: t.index,
        title: t.title
      }))
    }))
  };
}

/**
 * Search for a topic across all syllabi (or filtered by subject/section)
 * @param {string} searchQuery - Topic name to search for
 * @param {string} [filterSubject] - Optional subject filter (e.g., "history")
 * @param {string} [filterSectionId] - Optional section filter (e.g., "8B")
 */
function tool_searchTopic(searchQuery, filterSubject = null, filterSectionId = null) {
  const query = searchQuery.toLowerCase();
  const results = [];
  
  // Common speech-to-text corrections
  const corrections = {
    'deformers': 'reformers',
    'planes': 'plains',
    'valleys': 'valleys',
    'lightning': 'enlightenment',
    'lite': 'light',
    'in light': 'enlightenment',
    'enlitement': 'enlightenment'
  };
  
  // Apply corrections
  let correctedQuery = query;
  for (const [wrong, right] of Object.entries(corrections)) {
    correctedQuery = correctedQuery.replace(new RegExp(wrong, 'gi'), right);
  }
  
  for (const course of teacherData.courses) {
    const syllabus = getSyllabusByRef(course.syllabusRef);
    if (!syllabus) continue;
    
    // Apply filters if provided
    if (filterSubject && !syllabus.subject.toLowerCase().includes(filterSubject.toLowerCase())) {
      continue;
    }
    if (filterSectionId && !course.sections.some(s => s.id.toUpperCase() === filterSectionId.toUpperCase())) {
      continue;
    }
    
    for (const chapter of syllabus.chapters) {
      for (const topic of chapter.subTopics || []) {
        const titleLower = topic.title.toLowerCase();
        // Check if query words appear in topic title
        const queryWords = correctedQuery.split(/\s+/).filter(w => w.length > 2);
        const matchCount = queryWords.filter(w => titleLower.includes(w)).length;
        
        // Also check for exact match or partial match
        const hasExactMatch = titleLower.includes(correctedQuery);
        const hasPartialMatch = queryWords.some(w => titleLower.includes(w) && w.length > 3);
        
        if (matchCount > 0 || hasExactMatch || hasPartialMatch) {
          results.push({
            courseId: course.id,
            courseTitle: course.title,
            sections: course.sections.map(s => s.id),
            subject: syllabus.subject,
            grade: syllabus.grade,
            chapterIndex: chapter.index,
            chapterTitle: chapter.title,
            topicIndex: topic.index,
            topicTitle: topic.title,
            relevance: hasExactMatch ? 1.0 : (matchCount / Math.max(queryWords.length, 1))
          });
        }
      }
    }
  }
  
  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);
  return results.slice(0, 5); // Top 5 matches
}

/**
 * Get progress summary for a section
 */
function tool_getProgress(sectionId = null) {
  const result = { sections: [] };
  
  teacherData.courses.forEach(course => {
    const syllabus = getSyllabusByRef(course.syllabusRef);
    if (!syllabus) return;
    
    const sectionsToShow = sectionId 
      ? course.sections.filter(s => s.id.toUpperCase() === sectionId.toUpperCase())
      : course.sections;
    
    sectionsToShow.forEach(section => {
      const baseProgress = normalizeSectionProgress(syllabus, section.progress);
      const storedProgress = loadStoredProgress(section.id, baseProgress);
      const percent = calculateTopicProgressPercent(syllabus, storedProgress);
      
      const chapters = syllabus.chapters.map(chapter => {
        const chapterProgress = storedProgress[chapter.index]?.topics || {};
        const done = Object.values(chapterProgress).filter(s => s === 'done').length;
        const total = chapter.subTopics.length;
        return {
          index: chapter.index,
          title: chapter.title,
          done,
          total,
          percent: total > 0 ? Math.round((done / total) * 100) : 0
        };
      });
      
      result.sections.push({
        sectionId: section.id,
        courseId: course.id,
        courseTitle: course.title,
        subject: syllabus.subject,
        grade: syllabus.grade,
        overallPercent: percent,
        chapters
      });
    });
  });
  
  return result;
}

/**
 * Get the next topic to teach for a section
 */
function tool_getNextTopic(sectionId) {
  if (!sectionId) {
    return { error: 'Section ID required', availableSections: teacherData.courses.flatMap(c => c.sections.map(s => s.id)) };
  }
  
  // Find course and section
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
    return { error: `Section ${sectionId} not found`, availableSections: teacherData.courses.flatMap(c => c.sections.map(s => s.id)) };
  }
  
  const syllabus = getSyllabusByRef(targetCourse.syllabusRef);
  if (!syllabus) return { error: 'Syllabus not found' };
  
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
        lastCompletedTopic = topic.title;
        lastCompletedChapter = chapter.title;
      } else if (!nextTopic) {
        nextTopic = topic.title;
        nextChapter = chapter.title;
        break;
      }
    }
    
    if (nextTopic) break;
  }
  
  // Check for upcoming exams
  const upcomingExam = targetSection.exams?.find(e => new Date(e.date) > new Date());
  
  return {
    sectionId: targetSection.id,
    courseId: targetCourse.id,
    courseTitle: targetCourse.title,
    subject: syllabus.subject,
    grade: syllabus.grade,
    nextChapter,
    nextTopic,
    lastCompletedChapter,
    lastCompletedTopic,
    allComplete: !nextTopic,
    upcomingExam: upcomingExam ? {
      type: upcomingExam.type,
      date: upcomingExam.date,
      syllabusUpTo: upcomingExam.syllabusUpTo
    } : null
  };
}

/**
 * Get schedule/upcoming sessions
 */
function tool_getSchedule(daysAhead = 7) {
  const sessions = getUpcomingSessions(teacherData, daysAhead);
  const today = new Date().toISOString().slice(0, 10);
  
  return {
    today: sessions.filter(s => s.date === today),
    upcoming: sessions.slice(0, 10),
    totalSessions: sessions.length
  };
}

/**
 * Get attendance summary for a section
 */
function tool_getAttendance(sectionId = null) {
  const allSections = teacherData.courses.flatMap(c => c.sections.map(s => s.id));
  const sectionsToCheck = sectionId ? [sectionId.toUpperCase()] : allSections;
  
  const result = { sections: [] };
  
  sectionsToCheck.forEach(classId => {
    const classStudents = students.filter(s => s.classId === classId);
    const classLogs = attendanceLogs.filter(l => l.classId === classId);
    
    if (classStudents.length === 0) return;
    
    const totalRecords = classLogs.length;
    const presentRecords = classLogs.filter(l => l.status === 'present').length;
    const attendancePercent = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
    
    const lowAttendance = classStudents.filter(student => {
      const studentLogs = classLogs.filter(l => l.studentId === student.studentId);
      const studentPresent = studentLogs.filter(l => l.status === 'present').length;
      const studentPercent = studentLogs.length > 0 ? (studentPresent / studentLogs.length) * 100 : 100;
      return studentPercent < 75;
    }).map(s => s.name);
    
    result.sections.push({
      sectionId: classId,
      studentCount: classStudents.length,
      overallPercent: attendancePercent,
      studentsBelow75: lowAttendance
    });
  });
  
  return result;
}

/**
 * Get assignments summary
 */
function tool_getAssignments(sectionId = null) {
  const relevantAssignments = sectionId 
    ? assignments.filter(a => a.classId.toUpperCase() === sectionId.toUpperCase())
    : assignments;
  
  const today = new Date().toISOString().slice(0, 10);
  
  return {
    upcoming: relevantAssignments.filter(a => a.dueDate >= today).map(a => ({
      title: a.title,
      classId: a.classId,
      dueDate: a.dueDate,
      submissionCount: a.submissions.length,
      totalStudents: students.filter(s => s.classId === a.classId).length
    })),
    pastDue: relevantAssignments.filter(a => a.dueDate < today).slice(0, 5).map(a => ({
      title: a.title,
      classId: a.classId,
      dueDate: a.dueDate,
      avgGrade: a.submissions.length > 0 
        ? (a.submissions.reduce((s, c) => s + c.grade, 0) / a.submissions.length).toFixed(1)
        : null,
      maxPoints: a.maxPoints
    }))
  };
}

/**
 * Get students needing attention
 */
function tool_getStudentsAtRisk() {
  const studentsAtRisk = [];
  
  students.forEach(student => {
    const studentLogs = attendanceLogs.filter(l => l.studentId === student.studentId);
    const presentCount = studentLogs.filter(l => l.status === 'present').length;
    const attendancePercent = studentLogs.length > 0 ? (presentCount / studentLogs.length) * 100 : 100;
    
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
      studentsAtRisk.push({
        name: student.name,
        classId: student.classId,
        issues,
        attendancePercent
      });
    }
  });
  
  return studentsAtRisk.sort((a, b) => a.attendancePercent - b.attendancePercent).slice(0, 10);
}

/**
 * Update progress for a topic
 */
function tool_updateProgress(sectionId, chapterIndex, topicIndex, status) {
  // Find course and section
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
    return { success: false, error: `Section ${sectionId} not found` };
  }
  
  const syllabus = getSyllabusByRef(targetCourse.syllabusRef);
  if (!syllabus) return { success: false, error: 'Syllabus not found' };
  
  const chapter = syllabus.chapters.find(ch => ch.index === chapterIndex);
  const topic = chapter?.subTopics?.find(t => t.index === topicIndex);
  
  if (!chapter || !topic) {
    return { success: false, error: `Chapter ${chapterIndex} Topic ${topicIndex} not found` };
  }
  
  // Update progress
  if (!targetSection.progress[chapterIndex]) {
    targetSection.progress[chapterIndex] = { topics: {} };
  }
  
  const statusMap = { 'complete': 'done', 'done': 'done', 'ongoing': 'ongoing', 'pending': 'not-started', 'not-started': 'not-started' };
  targetSection.progress[chapterIndex].topics[topicIndex] = statusMap[status] || 'done';
  persistProgress(targetSection.id, targetSection.progress);
  
  return {
    success: true,
    sectionId: targetSection.id,
    courseTitle: targetCourse.title,
    chapterTitle: chapter.title,
    topicTitle: topic.title,
    newStatus: statusMap[status] || 'done'
  };
}

// Tool execution map
const toolFunctions = {
  getAvailableCourses: tool_getAvailableCourses,
  getSyllabus: tool_getSyllabus,
  searchTopic: tool_searchTopic,
  getProgress: tool_getProgress,
  getNextTopic: tool_getNextTopic,
  getSchedule: tool_getSchedule,
  getAttendance: tool_getAttendance,
  getAssignments: tool_getAssignments,
  getStudentsAtRisk: tool_getStudentsAtRisk,
  updateProgress: tool_updateProgress
};

// Tool declarations for Gemini
const toolDeclarations = [
  {
    name: "getAvailableCourses",
    description: "Get a list of all available courses with their sections. Use this first to understand what courses exist.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "getSyllabus", 
    description: "Get the full syllabus for a course including all chapters and topics. You can search by courseId, subject name (like 'history' or 'geography'), or sectionId (like '8B' or '6A').",
    parameters: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description: "The course ID (e.g., 'geo6', 'hist8')"
        },
        subject: {
          type: "string", 
          description: "The subject name (e.g., 'history', 'geography')"
        },
        sectionId: {
          type: "string",
          description: "The section ID (e.g., '8B', '6A')"
        }
      },
      required: []
    }
  },
  {
    name: "searchTopic",
    description: "Search for a topic across syllabi. Use filterSubject or filterSectionId to narrow down results. Always use filters when user mentions a specific subject (history/geography) or section (8B/6A) to avoid wrong matches.",
    parameters: {
      type: "object",
      properties: {
        searchQuery: {
          type: "string",
          description: "The topic name or keywords to search for"
        },
        filterSubject: {
          type: "string",
          description: "Optional: Filter by subject (e.g., 'history', 'geography'). ALWAYS use this if user mentioned a subject."
        },
        filterSectionId: {
          type: "string",
          description: "Optional: Filter by section (e.g., '8B', '6A'). ALWAYS use this if user mentioned a section."
        }
      },
      required: ["searchQuery"]
    }
  }
];

// Extended tool declarations for chat agent
const chatToolDeclarations = [
  ...toolDeclarations,
  {
    name: "getProgress",
    description: "Get syllabus progress summary for a section or all sections. Shows completion percentage per chapter.",
    parameters: {
      type: "object",
      properties: {
        sectionId: {
          type: "string",
          description: "Optional section ID (e.g., '8B', '6A'). If omitted, returns progress for all sections."
        }
      },
      required: []
    }
  },
  {
    name: "getNextTopic",
    description: "Get the next topic to teach for a specific section. Returns the first incomplete topic in the syllabus.",
    parameters: {
      type: "object",
      properties: {
        sectionId: {
          type: "string",
          description: "The section ID (e.g., '8B', '6A'). REQUIRED."
        }
      },
      required: ["sectionId"]
    }
  },
  {
    name: "getSchedule",
    description: "Get the teacher's schedule including today's classes and upcoming sessions.",
    parameters: {
      type: "object",
      properties: {
        daysAhead: {
          type: "number",
          description: "Number of days to look ahead. Default is 7."
        }
      },
      required: []
    }
  },
  {
    name: "getAttendance",
    description: "Get attendance summary for a section or all sections. Shows overall percentage and students below 75%.",
    parameters: {
      type: "object",
      properties: {
        sectionId: {
          type: "string",
          description: "Optional section ID. If omitted, returns attendance for all sections."
        }
      },
      required: []
    }
  },
  {
    name: "getAssignments",
    description: "Get assignments summary including upcoming and past due assignments.",
    parameters: {
      type: "object",
      properties: {
        sectionId: {
          type: "string",
          description: "Optional section ID to filter assignments."
        }
      },
      required: []
    }
  },
  {
    name: "getStudentsAtRisk",
    description: "Get list of students who need attention due to low attendance or missing assignments.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "updateProgress",
    description: "Update the progress status for a specific topic. Use this when the teacher says they finished/completed a topic.",
    parameters: {
      type: "object",
      properties: {
        sectionId: {
          type: "string",
          description: "The section ID (e.g., '8B', '6A'). REQUIRED."
        },
        chapterIndex: {
          type: "number",
          description: "The chapter number (1-based index). REQUIRED."
        },
        topicIndex: {
          type: "number",
          description: "The topic number within the chapter (1-based index). REQUIRED."
        },
        status: {
          type: "string",
          description: "The new status: 'complete', 'ongoing', or 'pending'. Default is 'complete'."
        }
      },
      required: ["sectionId", "chapterIndex", "topicIndex"]
    }
  }
];

/**
 * Parse voice transcript to extract syllabus update intent
 * LLM-FIRST approach with function calling for intelligent context gathering
 * 
 * @param {string} transcript - "I finished Chapter 2, Topic 1 in 6A Geography" or "mark social reformers not done in 8B history"
 * @param {object} context - { courses, currentCourseId, currentSectionId }
 * @returns {Promise<object>} - { action, courseId, sectionId, chapterIndex, topicIndex }
 */
export async function parseVoiceTranscript(transcript, context) {
  const { currentCourseId, currentSectionId } = context || {};
  const text = (transcript || '').trim();
  
  if (!text) {
    return { action: 'unclear', confidence: 'low', error: 'Empty transcript' };
  }

  console.log('[parseVoiceTranscript] Input:', text);

  // If no API key, use simple fallback
  if (!genAI) {
    console.warn('No Gemini API key, using simple fallback');
    return simpleFallbackParse(text, currentCourseId, currentSectionId);
  }

  try {
    // Create model with function calling
    const model = genAI.getGenerativeModel({
      model: MODELS.TEXT, // Using gemini-2.5-flash for best function calling support
      tools: [{ functionDeclarations: toolDeclarations }]
    });

    const systemPrompt = `You are a teaching assistant helping to parse voice commands for updating syllabus progress.

The user said: "${text}"

Current context:
- Current Course ID: ${currentCourseId || 'not set'}
- Current Section ID: ${currentSectionId || 'not set'}

Your task:
1. First, identify what subject/section the user is referring to:
   - Look for explicit mentions like "history", "geography", "8B", "6A"
   - If they say "in it" or don't specify, use the Current Course ID context above
   
2. Use the tools strategically:
   - Call getSyllabus with subject filter if user mentioned a subject
   - Call searchTopic with filterSubject/filterSectionId to AVOID cross-subject matches
   - IMPORTANT: "Enlightenment" in History is different from topics in Geography!

3. Determine:
   - action: "mark_complete" (finished/done/completed), "mark_pending" (not done/undo/hasn't), "mark_ongoing" (started/working on), or "unclear"
   - courseId: the course this belongs to
   - sectionId: the section mentioned or from context
   - chapterIndex: the chapter number (1-based index from syllabus)
   - topicIndex: the topic number (1-based index from syllabus)

CRITICAL RULES:
- "not done", "has not done", "hasn't done" → action: "mark_pending"  
- When searching topics, ALWAYS filter by subject if one was mentioned or is in context
- Handle speech-to-text errors like "deformers" → "reformers", "planes" → "plains"
- If user says "in it" without specifying subject, use the Current Course ID to determine subject

Start by identifying the subject context, then fetch the relevant syllabus.`;

    const chat = model.startChat();
    let response = await chat.sendMessage(systemPrompt);
    
    // Process function calls iteratively
    let maxIterations = 5;
    let iterations = 0;
    
    while (iterations < maxIterations) {
      iterations++;
      const candidate = response.response.candidates?.[0];
      const content = candidate?.content;
      
      if (!content?.parts) break;
      
      // Check for function calls
      const functionCalls = content.parts.filter(p => p.functionCall);
      
      if (functionCalls.length === 0) {
        // No more function calls, get the final text response
        break;
      }
      
      // Execute function calls
      const functionResponses = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        console.log(`[LLM] Calling tool: ${name}`, args);
        
        const fn = toolFunctions[name];
        if (fn) {
          let result;
          if (name === 'getAvailableCourses') {
            result = fn();
          } else if (name === 'getSyllabus') {
            result = fn(args.courseId, args.subject, args.sectionId);
          } else if (name === 'searchTopic') {
            result = fn(args.searchQuery, args.filterSubject, args.filterSectionId);
          }
          
          console.log(`[LLM] Tool result:`, result);
          functionResponses.push({
            functionResponse: {
              name,
              response: { result }
            }
          });
        }
      }
      
      // Send function responses back to LLM
      response = await chat.sendMessage(functionResponses);
    }
    
    // Now ask for the final structured response
    const finalPrompt = `Based on the syllabus information you gathered, provide your final answer.

CRITICAL: Use the courseId from the syllabus where you actually found the topic!
- If you found "Enlightenment" in the History syllabus (hist8), return courseId: "hist8"
- If you found "Plains and Valleys" in Geography syllabus (geo6), return courseId: "geo6"
- Do NOT use the default context course if the topic is from a different course!

Return ONLY a JSON object (no markdown, no explanation):
{
  "action": "mark_complete" | "mark_ongoing" | "mark_pending" | "unclear",
  "courseId": "the courseId where the topic was found (e.g., 'hist8', 'geo6')",
  "sectionId": "string (from user input or context)", 
  "chapterIndex": number,
  "topicIndex": number,
  "matchedTopic": "the exact topic title from syllabus",
  "matchedChapter": "the exact chapter title from syllabus",
  "confidence": "high" | "medium" | "low"
}

Remember:
- "not done", "hasn't done", "has not" → action: "mark_pending"
- Use the exact indices from the syllabus (1-based, not 0-based)
- courseId must match where the topic was found!
- If you couldn't find the topic, set action: "unclear"`;

    const finalResponse = await chat.sendMessage(finalPrompt);
    const finalText = finalResponse.response.text();
    
    console.log('[LLM] Final response:', finalText);
    
    // Parse JSON from response - handle multiple JSON blocks for batch updates
    const jsonMatches = finalText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (!jsonMatches || jsonMatches.length === 0) {
      console.warn('No JSON in LLM response, using fallback');
      return simpleFallbackParse(text, currentCourseId, currentSectionId);
    }
    
    // Parse all JSON blocks
    const parsedResults = [];
    for (const jsonStr of jsonMatches) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.action && parsed.chapterIndex !== undefined && parsed.topicIndex !== undefined) {
          parsed._source = 'llm-function-calling';
          parsedResults.push(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse JSON block:', jsonStr, e);
      }
    }
    
    // If we got multiple valid results, return as batch
    if (parsedResults.length > 1) {
      console.log('[LLM] Batch update detected:', parsedResults.length, 'topics');
      return {
        action: 'batch_update',
        updates: parsedResults,
        _source: 'llm-function-calling-batch'
      };
    }
    
    // Single result
    if (parsedResults.length === 1) {
      const parsed = parsedResults[0];
      
      // Validate required fields
      if (!parsed.chapterIndex || !parsed.topicIndex || parsed.action === 'unclear') {
        console.warn('LLM returned unclear result, trying fallback');
        const fallback = simpleFallbackParse(text, currentCourseId, currentSectionId);
        if (fallback.chapterIndex && fallback.topicIndex) {
          return { ...fallback, _source: 'fallback-after-llm' };
        }
      }
      
      return parsed;
    }
    
    // No valid results, use fallback
    console.warn('No valid JSON results, using fallback');
    return simpleFallbackParse(text, currentCourseId, currentSectionId);
    
  } catch (error) {
    console.error('LLM parsing error:', error);
    return simpleFallbackParse(text, currentCourseId, currentSectionId);
  }
}

/**
 * Simple fallback parser when LLM is unavailable
 */
function simpleFallbackParse(text, currentCourseId, currentSectionId) {
  const lower = text.toLowerCase();
  
  // Detect action
  let action = 'unclear';
  if (/(not\s+done|hasn't|has\s+not|haven't|not\s+complete|incomplete|undo|reset)/i.test(lower)) {
    action = 'mark_pending';
  } else if (/(finished|complete(d)?|done|mark.*complete)/i.test(lower)) {
    action = 'mark_complete';
  } else if (/(start(ed|ing)?|begin|working|ongoing|in\s+progress)/i.test(lower)) {
    action = 'mark_ongoing';
  } else if (/(pending|not[- ]?started)/i.test(lower)) {
    action = 'mark_pending';
  }
  
  // Extract section
  const allSections = teacherData.courses.flatMap(c => c.sections.map(s => s.id));
  const sectionPattern = new RegExp(`\\b(${allSections.join('|')})\\b`, 'i');
  const sectionMatch = lower.match(sectionPattern);
  const sectionId = sectionMatch ? sectionMatch[1].toUpperCase() : currentSectionId;
  
  // Extract subject
  const subjectMatch = lower.match(/\b(history|geography|science|math|english)\b/i);
  const subject = subjectMatch ? subjectMatch[1].toLowerCase() : null;
  
  // Find course
  let courseId = currentCourseId;
  for (const course of teacherData.courses) {
    const hasSection = course.sections.some(s => s.id.toUpperCase() === sectionId?.toUpperCase());
    const matchesSubject = subject && course.title.toLowerCase().includes(subject);
    if (hasSection && matchesSubject) {
      courseId = course.id;
      break;
    } else if (matchesSubject && !courseId) {
      courseId = course.id;
    }
  }
  
  // Try to find topic using search - WITH FILTERS to avoid cross-subject matches
  const searchResults = tool_searchTopic(lower, subject, sectionId);
  if (searchResults.length > 0) {
    const best = searchResults[0];
    
    return {
      action,
      courseId: best.courseId,
      sectionId: sectionId || best.sections[0],
      chapterIndex: best.chapterIndex,
      topicIndex: best.topicIndex,
      matchedTopic: best.topicTitle,
      matchedChapter: best.chapterTitle,
      confidence: 'medium',
      _source: 'fallback-search'
    };
  }
  
  // Try Chapter X Topic Y format
  const chapMatch = lower.match(/chapter\s*(\d+)/i);
  const topicMatch = lower.match(/topic\s*(\d+)/i);
  if (chapMatch && topicMatch) {
    return {
      action,
      courseId,
      sectionId,
      chapterIndex: Number(chapMatch[1]),
      topicIndex: Number(topicMatch[1]),
      confidence: 'medium',
      _source: 'fallback-numeric'
    };
  }
  
  return { action, courseId, sectionId, confidence: 'low', _source: 'fallback-none' };
}

/**
 * Generate quiz questions for a chapter
 * 
 * @param {object} params - { subject, grade, chapterTitle, topicTitle, count }
 * @returns {Promise<Array>} - Array of question objects
 */
export async function generateQuiz(params) {
  const { subject, grade, chapterTitle, topicTitle, count = 5 } = params;

  const prompt = `
Generate ${count} multiple-choice questions for:

Subject: ${subject}
Grade: ${grade}
Chapter: ${chapterTitle}
Topic: ${topicTitle}

Return ONLY a JSON array (no markdown):
[
  {
    "question": "string",
    "options": {
      "A": "string",
      "B": "string", 
      "C": "string",
      "D": "string"
    },
    "correctAnswer": "A" | "B" | "C" | "D",
    "explanation": "string"
  }
]

Make questions appropriate for grade ${grade} students. Mix difficulty levels.
`;

  try {
    const response = await callGemini(prompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse quiz JSON');
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Quiz generation error:', error);
    return getMockQuiz(count);
  }
}

/**
 * Generate assignment with rubric
 */
export async function generateAssignment(params) {
  const { subject, grade, chapterTitle, topicTitle, type = 'homework' } = params;

  const prompt = `
Create a ${type} assignment for:

Subject: ${subject}
Grade: ${grade}
Chapter: ${chapterTitle}
Topic: ${topicTitle}

Return ONLY a JSON object:
{
  "title": "string",
  "description": "string (2-3 sentences)",
  "instructions": "string (detailed steps)",
  "rubric": [
    { "criterion": "string", "points": number, "description": "string" }
  ],
  "estimatedTime": "string (e.g., '30 minutes')",
  "dueInDays": number
}
`;

  try {
    const response = await callGemini(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Assignment generation error:', error);
    return getMockAssignment();
  }
}

/**
 * Analyze student performance
 */
export async function analyzeStudentPerformance(studentData) {
  const { name, attendance, assignments, grades } = studentData;

  const prompt = `
Analyze this student's performance:

Name: ${name}
Attendance: ${attendance}%
Assignment Average: ${assignments?.avgGrade || 'N/A'}%
Recent Grades: ${grades?.join(', ') || 'N/A'}

Return ONLY a JSON object:
{
  "summary": "string (2-3 sentences)",
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "learningStyle": "Visual" | "Auditory" | "Kinesthetic" | "Mixed",
  "recommendations": ["string", "string", "string"],
  "riskLevel": "low" | "medium" | "high"
}

Be constructive and specific. If attendance < 75%, mark riskLevel as "high".
`;

  try {
    const response = await callGemini(prompt, true); // Use Pro model
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Student analysis error:', error);
    return getMockStudentAnalysis(studentData);
  }
}

/**
 * Generate daily teacher briefing
 */
export async function generateDailyBriefing(teacherData) {
  const { courses, todaySessions, alerts } = teacherData;

  const prompt = `
Generate a daily briefing for a teacher:

Today's Schedule:
${todaySessions.map(s => `- ${s.time} ${s.subject} ${s.class}`).join('\n')}

Courses & Progress:
${courses.map(c => `- ${c.title}: ${c.progress}% complete`).join('\n')}

Alerts:
${alerts.join('\n')}

Return ONLY a JSON object:
{
  "greeting": "string (personalized)",
  "todayFocus": "string (what to prioritize)",
  "alerts": [
    { "type": "info|warning|critical", "message": "string" }
  ],
  "suggestions": ["string", "string"],
  "motivationalQuote": "string (teaching-related)"
}
`;

  try {
    const response = await callGemini(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Briefing generation error:', error);
    return getMockBriefing();
  }
}

/**
 * Get next topic suggestion
 */
export async function suggestNextTopic(courseData) {
  const { subject, grade, completedChapters, upcomingExams } = courseData;

  const prompt = `
Based on this course progress:

Subject: ${subject}
Grade: ${grade}
Completed: ${completedChapters.join(', ')}
Upcoming Exam: ${upcomingExams?.[0]?.title || 'None'} on ${upcomingExams?.[0]?.date || 'N/A'}

Suggest the next topic to teach. Return JSON:
{
  "suggestedChapter": number,
  "suggestedTopic": string,
  "reasoning": "string (1-2 sentences)",
  "preparationTips": ["string", "string"],
  "estimatedHours": number
}
`;

  try {
    const response = await callGemini(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Topic suggestion error:', error);
    return { suggestedChapter: 3, suggestedTopic: 'Next available topic', reasoning: 'Continue with syllabus' };
  }
}

/**
 * Detect attendance risks using AI
 */
export async function detectAttendanceRisks(attendanceData) {
  const { students, classAverage, recentTrend } = attendanceData;

  const prompt = `
Analyze attendance patterns:

Class Average: ${classAverage}%
Recent Trend: ${recentTrend}

Students:
${students.map(s => `- ${s.name}: ${s.attendance}% (${s.absences} recent absences)`).join('\n')}

Return ONLY a JSON array:
[
  {
    "studentName": "string",
    "attendancePercent": number,
    "riskLevel": "low" | "medium" | "high" | "critical",
    "insight": "string (specific pattern detected)",
    "action": "string (recommended action)"
  }
]

Only include students with concerning patterns.
`;

  try {
    const response = await callGemini(prompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Risk detection error:', error);
    return [];
  }
}

// ============================================
// MOCK RESPONSES (for testing without API key)
// ============================================

function getMockResponse(prompt) {
  if (prompt.includes('quiz')) return JSON.stringify(getMockQuiz());
  if (prompt.includes('assignment')) return JSON.stringify(getMockAssignment());
  if (prompt.includes('student')) return JSON.stringify(getMockStudentAnalysis());
  if (prompt.includes('briefing')) return JSON.stringify(getMockBriefing());
  return '{ "status": "mock", "message": "AI feature demo mode" }';
}

function getMockQuiz(count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    question: `Sample Question ${i + 1}: What is the definition of [concept]?`,
    options: {
      A: 'Option A - Plausible answer',
      B: 'Option B - Another answer',
      C: 'Option C - Correct answer',
      D: 'Option D - Wrong answer'
    },
    correctAnswer: 'C',
    explanation: 'This is the correct answer because of [reasoning].'
  }));
}

function getMockAssignment() {
  return {
    title: 'Map Labeling Exercise',
    description: 'Students will identify and label major geographical features on a map.',
    instructions: '1. Download the blank map\n2. Label 10 features\n3. Submit by due date',
    rubric: [
      { criterion: 'Accuracy', points: 5, description: 'Correctness of labels' },
      { criterion: 'Neatness', points: 3, description: 'Legibility and organization' },
      { criterion: 'Completeness', points: 2, description: 'All 10 features labeled' }
    ],
    estimatedTime: '30 minutes',
    dueInDays: 3
  };
}

function getMockStudentAnalysis(studentData) {
  return {
    summary: `${studentData?.name || 'Student'} shows consistent effort with room for improvement in certain areas.`,
    strengths: ['Good attendance record', 'Participates actively in class'],
    weaknesses: ['Needs more practice with written assignments', 'Occasionally late submissions'],
    learningStyle: 'Visual',
    recommendations: [
      'Provide additional practice worksheets',
      'Consider visual aids for complex topics',
      'Schedule one-on-one review session'
    ],
    riskLevel: (studentData?.attendance || 90) < 75 ? 'high' : 'low'
  };
}

function getMockBriefing() {
  return {
    greeting: 'Good morning! Ready for a productive day?',
    todayFocus: 'Focus on completing Chapter 2 coverage in 6A and taking attendance early.',
    alerts: [
      { type: 'warning', message: '3 students have attendance below 75%' },
      { type: 'info', message: 'Assignment submissions due today: 2' }
    ],
    suggestions: [
      'Review maps before 6A class',
      'Prepare quiz for 8B History'
    ],
    motivationalQuote: 'Teaching is the one profession that creates all other professions.'
  };
}

// ============================================================================
// LLM-FIRST CHAT AGENT
// ============================================================================

/**
 * Process a chat message using LLM with function calling
 * This is the main entry point for the AI chat assistant
 * 
 * @param {string} message - User's message
 * @param {Array} conversationHistory - Previous messages for context
 * @param {object} context - { currentCourseId, currentSectionId, urlContext }
 * @returns {Promise<string>} - AI response
 */
export async function processChat(message, conversationHistory = [], context = {}) {
  const text = (message || '').trim();
  
  if (!text) {
    return "I didn't catch that. Could you please repeat?";
  }

  console.log('[processChat] Input:', text);
  console.log('[processChat] Context:', context);
  console.log('[processChat] History length:', conversationHistory.length);

  // If no API key, use simple fallback
  if (!genAI) {
    console.warn('No Gemini API key, using fallback response');
    return getFallbackResponse(text, context, conversationHistory);
  }

  try {
    // Build conversation history for context (last 10 messages)
    // IMPORTANT: Gemini requires history to start with 'user' role, not 'model'
    // Filter out leading assistant/model messages (like welcome message)
    let validHistory = conversationHistory.slice(-10);
    
    // Find first user message index
    const firstUserIndex = validHistory.findIndex(m => m.role === 'user');
    if (firstUserIndex > 0) {
      // Skip leading assistant messages
      validHistory = validHistory.slice(firstUserIndex);
    } else if (firstUserIndex === -1) {
      // No user messages in history, start fresh
      validHistory = [];
    }
    
    // Exclude the last message (current message) from history - it will be sent separately
    validHistory = validHistory.slice(0, -1);
    
    const historyMessages = validHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    
    // Detect if user is using pronouns that need context resolution
    const lower = text.toLowerCase();
    const needsContext = /\b(it|this|that|those|these)\b/.test(lower) && 
                         (lower.includes('mark') || lower.includes('done') || lower.includes('complete') || lower.includes('finish'));
    
    // If user says "mark it done", add context hint from recent messages
    let enhancedMessage = text;
    if (needsContext && conversationHistory.length > 0) {
      // Find the last assistant message that mentioned a topic
      const recentAssistantMsgs = conversationHistory
        .filter(m => m.role === 'assistant')
        .slice(-3);
      
      for (const msg of recentAssistantMsgs.reverse()) {
        // Look for topic mentions in format "Topic Name" or → **Topic**
        const topicMatch = msg.content.match(/→\s*\*\*([^*]+)\*\*/);
        const sectionMatch = msg.content.match(/Section:\s*(\w+)|for\s+(\w+):|Next for (\w+)/i);
        
        if (topicMatch) {
          const topic = topicMatch[1];
          const section = sectionMatch ? (sectionMatch[1] || sectionMatch[2] || sectionMatch[3]) : null;
          
          if (section) {
            enhancedMessage = `${text} (referring to "${topic}" in section ${section} from our previous conversation)`;
            console.log('[processChat] Enhanced message with context:', enhancedMessage);
            break;
          }
        }
      }
    }

    // Create model with function calling
    const model = genAI.getGenerativeModel({
      model: MODELS.TEXT, // Using gemini-2.5-flash for best function calling support
      tools: [{ functionDeclarations: chatToolDeclarations }],
      systemInstruction: `You are a helpful AI teaching assistant for a school management app. You help teachers with:
- Tracking syllabus progress
- Finding the next topic to teach
- Viewing schedules and attendance
- Managing assignments
- Identifying students at risk

CRITICAL RULES FOR CONTEXT UNDERSTANDING:
1. ALWAYS check conversation history for context when user uses pronouns like "it", "that", "this"
2. If user says "mark it as done" or "mark it complete", find the LAST topic mentioned in conversation and mark THAT topic
3. Example: If previous message mentioned "Plains and Valleys in 6A", then "mark it done" means mark "Plains and Valleys" in section "6A"
4. When user says "and X?" (like "and 6A?"), repeat the SAME query type for the new section

TOOL USAGE RULES:
1. Use the available tools to get real data - don't make up information
2. When the user mentions a section like "8B" or "6A", use it in your tool calls
3. For updateProgress: you need sectionId, chapterIndex, and topicIndex - get these from getSyllabus or searchTopic first
4. If user says "mark [topic] done in [section]", first call searchTopic to find the chapter/topic indices, then call updateProgress

RESPONSE RULES:
1. Keep responses concise and use markdown formatting
2. When updating progress, confirm: topic name, chapter name, section, and new status
3. If you're unsure about a section or topic, ask for clarification
4. Available sections: ${teacherData.courses.flatMap(c => c.sections.map(s => `${s.id} (${c.title})`)).join(', ')}

Current page context:
- URL Course ID: ${context.urlContext?.courseId || 'not on a course page'}
- URL Section ID: ${context.urlContext?.sectionId || 'not on a section page'}`
    });

    // Start chat with history
    const chat = model.startChat({ history: historyMessages });
    
    // Send message (use enhanced message if context was added)
    let response = await chat.sendMessage(enhancedMessage);
    
    // Process function calls iteratively
    let maxIterations = 5;
    let iterations = 0;
    
    while (iterations < maxIterations) {
      iterations++;
      const candidate = response.response.candidates?.[0];
      const content = candidate?.content;
      
      if (!content?.parts) break;
      
      // Check for function calls
      const functionCalls = content.parts.filter(p => p.functionCall);
      
      if (functionCalls.length === 0) {
        // No more function calls, get the final text response
        break;
      }
      
      // Execute function calls
      const functionResponses = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        console.log(`[Chat] Calling tool: ${name}`, args);
        
        const fn = toolFunctions[name];
        if (fn) {
          let result;
          try {
            // Call the appropriate function with its arguments
            switch (name) {
              case 'getAvailableCourses':
                result = fn();
                break;
              case 'getSyllabus':
                result = fn(args.courseId, args.subject, args.sectionId);
                break;
              case 'searchTopic':
                result = fn(args.searchQuery, args.filterSubject, args.filterSectionId);
                break;
              case 'getProgress':
                result = fn(args.sectionId);
                break;
              case 'getNextTopic':
                result = fn(args.sectionId);
                break;
              case 'getSchedule':
                result = fn(args.daysAhead);
                break;
              case 'getAttendance':
                result = fn(args.sectionId);
                break;
              case 'getAssignments':
                result = fn(args.sectionId);
                break;
              case 'getStudentsAtRisk':
                result = fn();
                break;
              case 'updateProgress':
                result = fn(args.sectionId, args.chapterIndex, args.topicIndex, args.status);
                break;
              default:
                result = { error: `Unknown function: ${name}` };
            }
          } catch (err) {
            console.error(`Error calling ${name}:`, err);
            result = { error: err.message };
          }
          
          console.log(`[Chat] Tool result:`, result);
          functionResponses.push({
            functionResponse: {
              name,
              response: { result }
            }
          });
        }
      }
      
      // Send function responses back to LLM
      response = await chat.sendMessage(functionResponses);
    }
    
    // Extract final text response
    const finalText = response.response.text();
    console.log('[Chat] Final response:', finalText);
    
    return finalText || "I processed your request but couldn't generate a response. Please try again.";
    
  } catch (error) {
    console.error('Chat processing error:', error);
    
    // Handle rate limit errors with user-friendly message
    if (isRateLimitError(error)) {
      const retryDelay = extractRetryDelay(error);
      const waitTime = retryDelay ? Math.ceil(retryDelay / 1000) : 60;
      return `⏳ **Rate Limit Reached**\n\nI'm getting too many requests right now. Please wait about ${waitTime} seconds and try again.\n\n_In the meantime, here's what I can help with:_\n• "What's next in 8B?"\n• "Show progress for 6A"\n• "What's my schedule today?"`;
    }
    
    return getFallbackResponse(text, context, conversationHistory);
  }
}

/**
 * Simple fallback response when API is unavailable
 */
function getFallbackResponse(text, context, conversationHistory = []) {
  const lower = text.toLowerCase();
  
  // Handle "mark it as done" with context from history
  if ((lower.includes('mark') || lower.includes('done') || lower.includes('complete')) && 
      /\b(it|this|that)\b/.test(lower)) {
    // Find last topic mentioned
    const recentAssistantMsgs = conversationHistory
      .filter(m => m.role === 'assistant')
      .slice(-3);
    
    for (const msg of recentAssistantMsgs.reverse()) {
      const topicMatch = msg.content.match(/→\s*\*\*([^*]+)\*\*/);
      const sectionMatch = msg.content.match(/Section:\s*(\w+)|for\s+(\w+):|Next for (\w+)/i);
      
      if (topicMatch && sectionMatch) {
        const topic = topicMatch[1];
        const section = (sectionMatch[1] || sectionMatch[2] || sectionMatch[3]).toUpperCase();
        
        // Search for the topic to get indices
        const searchResult = tool_searchTopic(topic, null, section);
        if (searchResult.length > 0) {
          const match = searchResult[0];
          const updateResult = tool_updateProgress(section, match.chapterIndex, match.topicIndex, 'complete');
          
          if (updateResult.success) {
            return `✅ **Progress Updated!**\n\n**${updateResult.chapterTitle}** → **${updateResult.topicTitle}**\n\nStatus: DONE\nSection: ${section}`;
          }
        }
        
        return `❌ Could not find "${topic}" in section ${section}. Please specify the topic name.`;
      }
    }
    
    return `🤔 I'm not sure what you want to mark as done. Could you specify the topic and section?\n\nExample: "Mark Plains and Valleys done in 6A"`;
  }
  
  // Check for "and X?" pattern (follow-up)
  const sectionMatch = lower.match(/\b(6a|6c|8a|8b)\b/i);
  
  if (sectionMatch) {
    const sectionId = sectionMatch[1].toUpperCase();
    
    // Check what they might be asking about
    if (lower.includes('next') || lower.includes('and')) {
      const result = tool_getNextTopic(sectionId);
      if (result.error) return result.error;
      if (result.allComplete) return `🎉 All topics complete for ${sectionId}!`;
      return `💡 **Next for ${sectionId}:**\n\n**${result.nextChapter}** → **${result.nextTopic}**\n\n📚 ${result.subject} (Grade ${result.grade})`;
    }
    
    if (lower.includes('progress')) {
      const result = tool_getProgress(sectionId);
      const section = result.sections[0];
      if (!section) return `Section ${sectionId} not found.`;
      return `📊 **Progress for ${sectionId}:**\n\n${section.courseTitle}: ${section.overallPercent}%`;
    }
  }
  
  if (lower.includes('schedule') || lower.includes('today')) {
    const result = tool_getSchedule(7);
    if (result.today.length === 0) return "📅 No classes scheduled for today.";
    return `📅 **Today's Classes:**\n\n${result.today.map(s => `• ${s.startTime} - ${s.subject} (${s.classId})`).join('\n')}`;
  }
  
  if (lower.includes('student') || lower.includes('attention') || lower.includes('risk')) {
    const result = tool_getStudentsAtRisk();
    if (result.length === 0) return "✅ All students are on track!";
    return `🎯 **Students Needing Attention:**\n\n${result.slice(0, 5).map(s => `• ${s.name} (${s.classId}): ${s.issues.join(', ')}`).join('\n')}`;
  }
  
  // Default help
  const sections = teacherData.courses.flatMap(c => c.sections.map(s => s.id)).join(', ');
  return `I can help with:\n• "What's next in 8B?"\n• "Show progress for 6A"\n• "What's my schedule today?"\n• "Which students need attention?"\n\nAvailable sections: ${sections}`;
}

export default {
  processChat,
  parseVoiceTranscript,
  generateQuiz,
  generateAssignment,
  analyzeStudentPerformance,
  generateDailyBriefing,
  suggestNextTopic,
  detectAttendanceRisks
};
