import { 
  teacherData, 
  getSyllabusByRef, 
  getCourseById,
  normalizeSectionProgress,
  getSectionProgress,
  loadStoredProgress,
  calculateTopicProgressPercent,
  persistProgress,
  getUpcomingSessions,
  students,
  attendanceLogs,
  assignments,
  notifications,
  getUnreadNotifications,
  getUserAttendanceLogs,
  saveUserAttendanceLogs,
  markClassAttendance
} from '../data/dummyData';
import { logGeminiCall, logAction, LogCategory } from './activityLogger';
import { callAIGenerate } from './aiApiClient';
import * as classManagement from '../utils/classManagement';

/**
 * AI Service for School Companion
 * 
 * All AI calls go through the backend proxy (callAIGenerate from aiApiClient).
 * Zero API keys in the client bundle.
 */

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
 * Core AI call function with retry logic.
 * Always routes through the backend proxy.
 */
async function callGemini(prompt, usePro = false, retryCount = 0) {
  const startTime = Date.now();

  try {
    const result = await callAIGenerate({
      prompt,
      type: usePro ? 'complex' : 'default',
    });
    
    const text = result.text || '';
    logGeminiCall('callGemini', { 
      promptPreview: prompt.substring(0, 200), 
      model: usePro ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
      retryCount 
    }, text, Date.now() - startTime);
    
    return text;
  } catch (error) {
    console.error('AI API Error:', error);
    
    // Handle rate limit with retry
    if (isRateLimitError(error) && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
      const delay = Math.min(
        RATE_LIMIT_CONFIG.baseDelayMs * Math.pow(2, retryCount),
        RATE_LIMIT_CONFIG.maxDelayMs
      );
      console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`);
      await sleep(delay);
      return callGemini(prompt, usePro, retryCount + 1);
    }
    
    logGeminiCall('callGemini', { 
      promptPreview: prompt.substring(0, 200),
      retryCount 
    }, null, Date.now() - startTime, error);
    
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
 * Returns full details including page numbers, progress, notes for each topic
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
  
  // Get progress for the specific section if provided
  let sectionProgress = null;
  let targetSection = null;
  if (sectionId) {
    targetSection = course.sections.find(s => s.id.toUpperCase() === sectionId.toUpperCase());
    if (targetSection) {
      sectionProgress = getSectionProgress(teacherData, course.id, targetSection.id);
    }
  }
  
  // Build detailed chapter/topic info
  const chapters = syllabus.chapters.map(ch => {
    const chapterProgress = sectionProgress ? sectionProgress[ch.index] : null;
    
    const topics = ch.subTopics.map(t => {
      const topicProgress = chapterProgress?.topics?.[t.index];
      const topicStatus = topicProgress?.status || 'not-started';
      const totalTopicPages = t.pageTo - t.pageFrom + 1;
      
      // Calculate pages completed based on status
      let pagesCompleted = 0;
      let percentComplete = 0;
      
      if (topicStatus === 'done') {
        // Topic is complete - all pages done
        pagesCompleted = totalTopicPages;
        percentComplete = 100;
      } else if (topicStatus === 'ongoing' && topicProgress?.currentPage) {
        // Topic in progress - use currentPage to calculate
        pagesCompleted = Math.max(0, topicProgress.currentPage - t.pageFrom + 1);
        percentComplete = Math.round((pagesCompleted / totalTopicPages) * 100);
      }
      
      return {
        index: t.index,
        title: t.title,
        pageFrom: t.pageFrom,
        pageTo: t.pageTo,
        totalPages: totalTopicPages,
        // Progress info (if section specified)
        status: topicStatus,
        currentPage: topicProgress?.currentPage || null,
        pagesCompleted,
        percentComplete,
        notes: topicProgress?.notes || null,
        lastCoveredAt: topicProgress?.lastCoveredAt || null,
        // For easy reference
        continueFromPage: topicStatus === 'done' ? null : (topicProgress?.currentPage || t.pageFrom)
      };
    });
    
    // Calculate chapter-level progress - use correct status values
    const completedTopics = topics.filter(t => t.status === 'done').length;
    const inProgressTopics = topics.filter(t => t.status === 'ongoing').length;
    const totalTopicPages = topics.reduce((sum, t) => sum + t.totalPages, 0);
    const completedPages = topics.reduce((sum, t) => sum + t.pagesCompleted, 0);
    
    return {
      index: ch.index,
      title: ch.title,
      topicsCount: topics.length,
      completedTopics,
      inProgressTopics,
      totalPages: totalTopicPages,
      completedPages,
      percentComplete: totalTopicPages > 0 ? Math.round((completedPages / totalTopicPages) * 100) : 0,
      topics
    };
  });
  
  // Calculate overall progress
  const totalTopics = chapters.reduce((sum, ch) => sum + ch.topicsCount, 0);
  const completedTopics = chapters.reduce((sum, ch) => sum + ch.completedTopics, 0);
  const totalPages = chapters.reduce((sum, ch) => sum + ch.totalPages, 0);
  const completedPages = chapters.reduce((sum, ch) => sum + ch.completedPages, 0);
  
  // Find current topic (first ongoing) and next topic (first not-started after current)
  let currentTopic = null;
  let nextTopic = null;
  let lastCompletedTopic = null;
  
  for (const ch of chapters) {
    for (const t of ch.topics) {
      if (t.status === 'done') {
        // Track last completed topic for context
        lastCompletedTopic = {
          chapterIndex: ch.index,
          chapterTitle: ch.title,
          topicIndex: t.index,
          topicTitle: t.title,
          pageFrom: t.pageFrom,
          pageTo: t.pageTo
        };
      } else if (t.status === 'ongoing' && !currentTopic) {
        currentTopic = {
          chapterIndex: ch.index,
          chapterTitle: ch.title,
          topicIndex: t.index,
          topicTitle: t.title,
          currentPage: t.currentPage,
          pageFrom: t.pageFrom,
          pageTo: t.pageTo,
          continueFromPage: t.currentPage || t.pageFrom,
          notes: t.notes
        };
      } else if (t.status === 'not-started' && !nextTopic) {
        nextTopic = {
          chapterIndex: ch.index,
          chapterTitle: ch.title,
          topicIndex: t.index,
          topicTitle: t.title,
          pageFrom: t.pageFrom,
          pageTo: t.pageTo
        };
      }
    }
  }
  
  return {
    courseId: course.id,
    courseTitle: course.title,
    sections: course.sections.map(s => s.id),
    currentSection: sectionId || null,
    subject: syllabus.subject,
    grade: syllabus.grade,
    // Overall stats
    totalChapters: chapters.length,
    totalTopics,
    completedTopics,
    totalPages,
    completedPages,
    overallPercent: totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0,
    // Current position
    lastCompletedTopic,
    currentTopic,
    nextTopic,
    continueFromPage: currentTopic?.continueFromPage || nextTopic?.pageFrom || null,
    // Detailed chapters
    chapters
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
        // Handle new object format: { status, currentPage, notes }
        const done = Object.values(chapterProgress).filter(t => {
          const status = typeof t === 'string' ? t : (t?.status || 'not-started');
          return status === 'done';
        }).length;
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
  let nextTopicPages = null;
  let currentTopic = null;
  let currentChapter = null;
  let currentTopicPages = null;
  let currentPage = null;
  let lastCompletedTopic = null;
  let lastCompletedChapter = null;
  
  for (const chapter of syllabus.chapters) {
    const chapterProgress = storedProgress[chapter.index]?.topics || {};
    
    for (const topic of chapter.subTopics || []) {
      const topicData = chapterProgress[topic.index];
      // Handle both string and object format
      const status = typeof topicData === 'string' ? topicData : (topicData?.status || 'not-started');
      
      if (status === 'done') {
        lastCompletedTopic = topic.title;
        lastCompletedChapter = chapter.title;
      } else if (status === 'ongoing' && !currentTopic) {
        // Currently in progress topic
        currentTopic = topic.title;
        currentChapter = chapter.title;
        currentTopicPages = { from: topic.pageFrom, to: topic.pageTo };
        currentPage = topicData?.currentPage || topic.pageFrom;
      } else if (status === 'not-started' && !nextTopic) {
        // First not-started topic
        nextTopic = topic.title;
        nextChapter = chapter.title;
        nextTopicPages = { from: topic.pageFrom, to: topic.pageTo };
      }
    }
  }
  
  // Check for upcoming exams
  const upcomingExam = targetSection.exams?.find(e => new Date(e.date) > new Date());
  
  return {
    sectionId: targetSection.id,
    courseId: targetCourse.id,
    courseTitle: targetCourse.title,
    subject: syllabus.subject,
    grade: syllabus.grade,
    // Current in-progress topic (if any)
    currentChapter,
    currentTopic,
    currentTopicPages,
    currentPage,
    // Next not-started topic
    nextChapter,
    nextTopic,
    nextTopicPages,
    // Last completed for context
    lastCompletedChapter,
    lastCompletedTopic,
    allComplete: !nextTopic && !currentTopic,
    upcomingExam: upcomingExam ? {
      type: upcomingExam.type,
      date: upcomingExam.date,
      syllabusUpTo: upcomingExam.syllabusUpTo
    } : null
  };
}

/**
 * Get temporal context - current time, day, and class status
 * Returns information about what class teacher has now, just had, or is coming up
 */
function getTemporalContext() {
  const now = new Date();
  // Use local date format to avoid UTC timezone issues
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentHHMM = now.toTimeString().slice(0, 5); // "HH:MM" format for comparison
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[now.getDay()];
  const dateFormatted = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  // Get today's sessions
  const todaySessions = getUpcomingSessions(teacherData, 0).filter(s => s.date === today);
  
  // Sort by start time
  todaySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  let currentClass = null;
  let justHadClass = null;
  let upcomingClass = null;
  
  for (const session of todaySessions) {
    const startTime = session.startTime;
    const endTime = session.endTime;
    
    if (currentHHMM >= startTime && currentHHMM <= endTime) {
      // Currently in this class
      currentClass = session;
    } else if (currentHHMM > endTime) {
      // This class has ended - track as "just had" (most recent)
      justHadClass = session;
    } else if (currentHHMM < startTime && !upcomingClass) {
      // This class is coming up (first upcoming one)
      upcomingClass = session;
    }
  }
  
  // Build class status string
  let classStatus = '';
  if (currentClass) {
    classStatus = `Currently IN CLASS: ${currentClass.subject} with section ${currentClass.classId} (${currentClass.startTime}–${currentClass.endTime})`;
  } else if (justHadClass && upcomingClass) {
    classStatus = `Just finished: ${justHadClass.subject} (${justHadClass.classId}) at ${justHadClass.endTime}. Next up: ${upcomingClass.subject} (${upcomingClass.classId}) at ${upcomingClass.startTime}`;
  } else if (justHadClass) {
    classStatus = `Last class today was ${justHadClass.subject} (${justHadClass.classId}) which ended at ${justHadClass.endTime}. No more classes today.`;
  } else if (upcomingClass) {
    classStatus = `First class today: ${upcomingClass.subject} (${upcomingClass.classId}) at ${upcomingClass.startTime}`;
  } else {
    classStatus = 'No classes scheduled for today.';
  }
  
  return {
    now,
    today,
    currentTime,
    dayName,
    dateFormatted,
    todaySessions,
    currentClass,
    justHadClass,
    upcomingClass,
    classStatus,
    summary: `Current time: ${currentTime} on ${dateFormatted}. ${classStatus}`
  };
}

/**
 * Get schedule/upcoming sessions
 */
function tool_getSchedule(daysAhead = 7) {
  const sessions = getUpcomingSessions(teacherData, daysAhead);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
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
  
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
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
 * Update progress for a topic - now supports new object schema with currentPage and notes
 */
function tool_updateProgress(sectionId, chapterIndex, topicIndex, status, options = {}) {
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
  
  // Load current progress from localStorage
  const baseProgress = normalizeSectionProgress(syllabus, targetSection.progress);
  const currentProgress = loadStoredProgress(targetSection.id, baseProgress);
  
  // Ensure chapter exists
  if (!currentProgress[chapterIndex]) {
    currentProgress[chapterIndex] = { topics: {} };
  }
  
  const statusMap = { 'complete': 'done', 'done': 'done', 'ongoing': 'ongoing', 'pending': 'not-started', 'not-started': 'not-started' };
  const newStatus = statusMap[status] || 'done';
  
  // Get existing topic data or create new
  const existingData = currentProgress[chapterIndex].topics[topicIndex] || {};
  const existingObj = typeof existingData === 'string' 
    ? { status: existingData, currentPage: null, notes: null, lastCoveredAt: null }
    : existingData;
  
  // Build new topic data object
  const newTopicData = {
    status: newStatus,
    currentPage: newStatus === 'ongoing' ? (options.currentPage ?? existingObj.currentPage) : null,
    notes: options.notes ?? existingObj.notes,
    lastCoveredAt: (newStatus === 'ongoing' || newStatus === 'done') ? new Date().toISOString() : existingObj.lastCoveredAt
  };
  
  currentProgress[chapterIndex].topics[topicIndex] = newTopicData;
  persistProgress(targetSection.id, currentProgress);
  
  return {
    success: true,
    sectionId: targetSection.id,
    courseTitle: targetCourse.title,
    chapterTitle: chapter.title,
    topicTitle: topic.title,
    chapterIndex: chapterIndex,
    topicIndex: topicIndex,
    newStatus: newStatus,
    currentPage: newTopicData.currentPage,
    notes: newTopicData.notes
  };
}

/**
 * Find topic by page number - returns the topic whose page range contains the given page
 */
function tool_findTopicByPage(sectionId, pageNumber) {
  if (!sectionId || !pageNumber) {
    return { error: 'sectionId and pageNumber are required' };
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
    return { error: `Section ${sectionId} not found` };
  }
  
  const syllabus = getSyllabusByRef(targetCourse.syllabusRef);
  if (!syllabus) return { error: 'Syllabus not found' };
  
  // Find the topic whose page range contains the given page
  for (const chapter of syllabus.chapters) {
    for (const topic of chapter.subTopics || []) {
      const pageFrom = topic.pageFrom || 0;
      const pageTo = topic.pageTo || 0;
      
      if (pageNumber >= pageFrom && pageNumber <= pageTo) {
        return {
          found: true,
          sectionId: targetSection.id,
          courseId: targetCourse.id,
          courseTitle: targetCourse.title,
          chapterIndex: chapter.index,
          chapterTitle: chapter.title,
          topicIndex: topic.index,
          topicTitle: topic.title,
          pageFrom: pageFrom,
          pageTo: pageTo,
          pageNumber: pageNumber
        };
      }
    }
  }
  
  return { 
    found: false, 
    error: `No topic found containing page ${pageNumber} in ${sectionId}`,
    message: `Page ${pageNumber} is not in any topic's page range for ${targetCourse.title}`
  };
}

/**
 * Tool wrapper for attendance parsing in chat
 */
function tool_parseAttendance(transcript, classId, studentNames) {
  // In chat context, we just return the raw intent for now
  // A real implementation might call the complex parsing logic
  return {
    transcript,
    classId,
    action: "attendance_log",
    status: "processing_required",
    message: "I can help mark attendance. Please use the dedicated 'Voice Mode' in the Attendance tab for best results."
  };
}

/**
 * Navigation tool - returns navigation intent for the UI to execute
 * Uses actual course/section data instead of heuristic matching
 * The actual navigation is handled by the UI layer (AIContext)
 */
function tool_navigateTo(destination, options = {}) {
  const { courseId, sectionId } = options;
  
  // Map common destinations to paths
  const routeMap = {
    // Main pages
    'home': '/',
    'dashboard': '/dashboard',
    'landing': '/',
    'schedule': '/schedule',
    'classes': '/classes',
    'assessments': '/assessments',
    'resources': '/resources',
    'profile': '/profile',
    'settings': '/settings',
    'chat': '/chat',
    
    // Role dashboards
    'hod': '/hod-dashboard',
    'hod-dashboard': '/hod-dashboard',
    'admin': '/admin-dashboard',
    'admin-dashboard': '/admin-dashboard',
  };
  
  let path = null;
  let displayName = destination;
  
  // Check for direct route match
  const normalizedDest = destination.toLowerCase().trim();
  if (routeMap[normalizedDest]) {
    path = routeMap[normalizedDest];
    displayName = normalizedDest.charAt(0).toUpperCase() + normalizedDest.slice(1);
  }
  // Check for section/class navigation (e.g., "6A geography", "8B history")
  else if (sectionId || /\d+[a-z]/i.test(destination)) {
    const sectionMatch = destination.match(/(\d+[a-z])/i);
    const targetSection = sectionId || (sectionMatch ? sectionMatch[1].toUpperCase() : null);
    
    if (targetSection) {
      // Find the course and section in actual data
      for (const course of teacherData.courses) {
        const section = course.sections.find(s => s.id.toUpperCase() === targetSection.toUpperCase());
        if (section) {
          path = `/course/${course.id}/class/${section.id}`;
          displayName = `${course.title} - Section ${section.id}`;
          break;
        }
      }
    }
  }
  // Check for course navigation by explicit courseId or subject/grade match
  else {
    let matchedCourse = null;
    
    // First, try exact courseId match if provided
    if (courseId) {
      matchedCourse = teacherData.courses.find(c => c.id === courseId);
    }
    
    // If no courseId or no match, try to find by destination string
    if (!matchedCourse) {
      const destLower = destination.toLowerCase();
      
      // Try to find course by matching subject name and/or grade
      matchedCourse = teacherData.courses.find(course => {
        const nameLower = course.title.toLowerCase();
        const idLower = course.id.toLowerCase();
        
        // Check if destination contains the course ID
        if (destLower.includes(idLower)) {
          return true;
        }
        
        // Check if destination contains the course name
        if (destLower.includes(nameLower)) {
          return true;
        }
        
        // Check for individual words match (e.g., "geography" or "grade 6")
        const destWords = destLower.split(/\s+/);
        const nameWords = nameLower.split(/\s+/);
        
        // If at least half of the destination words are in the course name, it's a match
        const matchingWords = destWords.filter(word => 
          nameWords.some(nameWord => nameWord.includes(word) || word.includes(nameWord))
        );
        
        return matchingWords.length >= Math.min(2, destWords.length);
      });
    }
    
    if (matchedCourse) {
      path = `/course/${matchedCourse.id}`;
      displayName = matchedCourse.title;
    }
  }
  
  if (path) {
    return {
      success: true,
      action: 'navigate',
      path: path,
      displayName: displayName,
      message: `Navigating to ${displayName}`
    };
  }
  
  return {
    success: false,
    error: `Could not find page for "${destination}"`,
    message: `I couldn't find a page matching "${destination}". Try saying "dashboard", "schedule", "6A geography", or a specific class name.`,
    availablePages: ['dashboard', 'schedule', 'classes', 'assessments', 'resources', 'profile', 'settings', ...teacherData.courses.map(c => c.title)]
  };
}

// ============================================================================
// CLASS MANAGEMENT TOOL FUNCTIONS
// ============================================================================

/**
 * Create a new course/subject
 */
function tool_createCourse(subject, grade, title) {
  try {
    const courseData = {
      subject: subject || 'General',
      grade: grade || '1',
      title: title || `${subject} Grade ${grade}`,
    };
    const course = classManagement.createCourse(courseData);
    return {
      success: true,
      course: {
        id: course.id,
        title: course.title,
        subject: course.subject,
        grade: course.grade,
        sections: [],
      },
      message: `Created course "${course.title}" (ID: ${course.id})`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a new section/class within a course
 */
function tool_createSection(courseId, sectionId, schedules) {
  try {
    // Try to find course by ID or by fuzzy match on title/subject
    let resolvedCourseId = courseId;
    if (courseId && !classManagement.findCourseById(courseId)) {
      // Try matching by title or subject
      const allCourses = classManagement.getAllCourses();
      const match = allCourses.find(c =>
        c.title.toLowerCase().includes(courseId.toLowerCase()) ||
        c.subject.toLowerCase().includes(courseId.toLowerCase()) ||
        c.id.toLowerCase() === courseId.toLowerCase()
      );
      if (match) resolvedCourseId = match.id;
    }

    const sectionData = {
      id: sectionId || undefined,
      schedules: schedules || [],
    };
    const section = classManagement.createSection(resolvedCourseId, sectionData);
    if (!section) {
      return { success: false, error: `Course "${courseId}" not found. Use getAvailableCourses to see existing courses.` };
    }
    return {
      success: true,
      section: {
        id: section.id,
        courseId: resolvedCourseId,
        schedules: section.schedules,
      },
      message: `Created section "${section.id}" in course "${resolvedCourseId}"`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Add students to a section
 */
function tool_addStudents(classId, studentsList) {
  try {
    if (!classId) return { success: false, error: 'classId is required' };
    if (!studentsList || !Array.isArray(studentsList) || studentsList.length === 0) {
      return { success: false, error: 'students array is required and must not be empty' };
    }

    const parsedStudents = studentsList.map((s, i) => ({
      name: typeof s === 'string' ? s : (s.name || `Student ${i + 1}`),
      rollNo: typeof s === 'string' ? (i + 1) : (s.rollNo || i + 1),
      email: typeof s === 'string' ? '' : (s.email || ''),
    }));

    const added = classManagement.addStudentsToClass(classId, parsedStudents);
    return {
      success: true,
      addedCount: added.length,
      students: added.map(s => ({ name: s.name, rollNo: s.rollNo, studentId: s.studentId })),
      message: `Added ${added.length} students to class "${classId}"`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get students for a class/section
 */
function tool_getStudents(classId) {
  try {
    if (!classId) return { success: false, error: 'classId is required' };
    const studentList = classManagement.getStudentsForClass(classId);
    return {
      success: true,
      classId,
      count: studentList.length,
      students: studentList.map(s => ({
        studentId: s.studentId,
        name: s.name,
        rollNo: s.rollNo,
        email: s.email || '',
      })),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove a student by ID
 */
function tool_removeStudent(studentId) {
  try {
    if (!studentId) return { success: false, error: 'studentId is required' };
    const removed = classManagement.removeStudent(studentId);
    return {
      success: removed,
      message: removed ? `Student "${studentId}" removed` : `Student "${studentId}" not found (only custom-added students can be removed)`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a course and all its sections/students
 */
function tool_deleteCourse(courseId) {
  try {
    if (!courseId) return { success: false, error: 'courseId is required' };
    const deleted = classManagement.deleteCourse(courseId);
    return {
      success: deleted,
      message: deleted ? `Course "${courseId}" and all its sections/students deleted` : `Course "${courseId}" not found`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a section from a course
 */
function tool_deleteSection(courseId, sectionId) {
  try {
    if (!courseId || !sectionId) return { success: false, error: 'courseId and sectionId are required' };
    const deleted = classManagement.deleteSection(courseId, sectionId);
    return {
      success: deleted,
      message: deleted ? `Section "${sectionId}" deleted from course "${courseId}"` : `Section "${sectionId}" not found in course "${courseId}"`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Apply timetable schedule data to sections
 */
function tool_applyTimetable(scheduleData) {
  try {
    if (!scheduleData || !Array.isArray(scheduleData) || scheduleData.length === 0) {
      return { success: false, error: 'scheduleData array is required' };
    }
    const result = classManagement.applyTimetableData(scheduleData);
    return {
      success: true,
      updated: result.updated,
      notFound: result.notFound,
      message: `Updated ${result.updated} sections. ${result.notFound.length > 0 ? `Not found: ${result.notFound.join(', ')}` : ''}`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// ATTENDANCE TOOL FUNCTIONS (Global - works without VoiceAttendanceLogger)
// ============================================================================

/**
 * Fuzzy match a student name against the student list for a class
 */
function fuzzyMatchStudentInClass(classId, studentName) {
  const classStudents = classManagement.getStudentsForClass(classId);
  if (!classStudents || classStudents.length === 0) return null;

  const query = studentName.toLowerCase().trim();
  
  // Exact match first
  let match = classStudents.find(s => s.name.toLowerCase() === query);
  if (match) return match;
  
  // Partial match (name contains query or query contains name parts)
  match = classStudents.find(s => s.name.toLowerCase().includes(query) || query.includes(s.name.toLowerCase()));
  if (match) return match;
  
  // First name match
  match = classStudents.find(s => {
    const firstName = s.name.split(' ')[0].toLowerCase();
    return firstName === query || query.startsWith(firstName);
  });
  if (match) return match;
  
  // Last name match
  match = classStudents.find(s => {
    const parts = s.name.split(' ');
    const lastName = parts[parts.length - 1].toLowerCase();
    return lastName === query;
  });
  
  return match || null;
}

/**
 * Mark attendance for a single student
 */
function tool_markAttendance(classId, studentName, status, date) {
  try {
    if (!classId) return { success: false, error: 'classId is required' };
    if (!studentName) return { success: false, error: 'studentName is required' };
    
    const matchedStudent = fuzzyMatchStudentInClass(classId, studentName);
    if (!matchedStudent) {
      const available = classManagement.getStudentsForClass(classId);
      return {
        success: false,
        error: `Student "${studentName}" not found in class "${classId}"`,
        availableStudents: available.map(s => s.name).slice(0, 20),
      };
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const attendanceStatus = (status || 'present').toLowerCase();
    
    const logs = getUserAttendanceLogs();
    // Remove existing entry for this student/class/date
    const filtered = logs.filter(l => 
      !(l.studentId === matchedStudent.studentId && l.classId === classId && l.date === attendanceDate)
    );
    // Add new record
    filtered.push({
      studentId: matchedStudent.studentId,
      classId: classId,
      date: attendanceDate,
      status: attendanceStatus,
      method: 'ai-agent',
    });
    saveUserAttendanceLogs(filtered);

    return {
      success: true,
      student: { name: matchedStudent.name, rollNo: matchedStudent.rollNo, studentId: matchedStudent.studentId },
      status: attendanceStatus,
      date: attendanceDate,
      classId,
      message: `Marked ${matchedStudent.name} (Roll ${matchedStudent.rollNo}) as ${attendanceStatus} for ${attendanceDate}`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark attendance for all students in a class at once
 */
function tool_markBulkAttendance(classId, status, exceptions, date) {
  try {
    if (!classId) return { success: false, error: 'classId is required' };
    
    const classStudents = classManagement.getStudentsForClass(classId);
    if (!classStudents || classStudents.length === 0) {
      return { success: false, error: `No students found in class "${classId}"` };
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const defaultStatus = (status || 'present').toLowerCase();
    const exceptionList = (exceptions || []).map(e => typeof e === 'string' ? e.toLowerCase() : '');

    // Match exceptions to actual students
    const exceptionStudentIds = new Set();
    exceptionList.forEach(excName => {
      const matched = fuzzyMatchStudentInClass(classId, excName);
      if (matched) exceptionStudentIds.add(matched.studentId);
    });

    const oppositeStatus = defaultStatus === 'present' ? 'absent' : 'present';
    
    const records = classStudents.map(student => ({
      studentId: student.studentId,
      classId: classId,
      date: attendanceDate,
      status: exceptionStudentIds.has(student.studentId) ? oppositeStatus : defaultStatus,
      method: 'ai-agent',
    }));

    markClassAttendance(classId, attendanceDate, records);

    return {
      success: true,
      classId,
      date: attendanceDate,
      totalStudents: classStudents.length,
      markedAs: defaultStatus,
      exceptions: exceptionList.length,
      message: `Marked ${classStudents.length} students in "${classId}" as ${defaultStatus} for ${attendanceDate}${exceptionList.length > 0 ? ` (${exceptionList.length} exceptions marked ${oppositeStatus})` : ''}`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get today's attendance status for a class
 */
function tool_getTodayAttendance(classId) {
  try {
    if (!classId) return { success: false, error: 'classId is required' };
    
    const today = new Date().toISOString().split('T')[0];
    const logs = getUserAttendanceLogs();
    const todayLogs = logs.filter(l => l.classId === classId && l.date === today);
    
    const classStudents = classManagement.getStudentsForClass(classId);
    
    const result = classStudents.map(student => {
      const log = todayLogs.find(l => l.studentId === student.studentId);
      return {
        name: student.name,
        rollNo: student.rollNo,
        status: log ? log.status : 'not-marked',
      };
    });

    const present = result.filter(r => r.status === 'present').length;
    const absent = result.filter(r => r.status === 'absent').length;
    const notMarked = result.filter(r => r.status === 'not-marked').length;

    return {
      success: true,
      classId,
      date: today,
      summary: { present, absent, notMarked, total: classStudents.length },
      students: result,
      message: `${classId} today: ${present} present, ${absent} absent, ${notMarked} not marked (of ${classStudents.length})`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
  updateProgress: tool_updateProgress,
  findTopicByPage: tool_findTopicByPage,
  parseAttendance: tool_parseAttendance,
  navigateTo: tool_navigateTo,
  // Class management tools
  createCourse: tool_createCourse,
  createSection: tool_createSection,
  addStudents: tool_addStudents,
  getStudents: tool_getStudents,
  removeStudent: tool_removeStudent,
  deleteCourse: tool_deleteCourse,
  deleteSection: tool_deleteSection,
  applyTimetable: tool_applyTimetable,
  // Attendance tools (global)
  markAttendance: tool_markAttendance,
  markBulkAttendance: tool_markBulkAttendance,
  getTodayAttendance: tool_getTodayAttendance,
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
  },
  {
    name: "parseAttendance",
    description: "Parse a voice command to mark attendance. Returns a list of students to mark as present or absent based on the transcript.",
    parameters: {
      type: "object",
      properties: {
        transcript: {
          type: "string",
          description: "The voice transcript text (e.g. 'Mark Rahul and Priya absent')"
        },
        classId: {
          type: "string",
          description: "The class ID (e.g. '6A')"
        },
        studentNames: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of student names in the class to fuzzy match against"
        }
      },
      required: ["transcript", "classId", "studentNames"]
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
    description: "Update the progress status for a specific topic. Use this when the teacher says they finished/completed a topic. Can also set the current page (for ongoing topics) and add notes.",
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
        },
        currentPage: {
          type: "number",
          description: "The page number where teaching left off (only for ongoing topics). E.g., if teacher says 'left at page 34', set this to 34."
        },
        notes: {
          type: "string",
          description: "Teacher's notes about the topic. E.g., 'students understand clearly' or 'need to revisit deltas'."
        }
      },
      required: ["sectionId", "chapterIndex", "topicIndex"]
    }
  },
  {
    name: "findTopicByPage",
    description: "Find which topic contains a specific page number in a syllabus. Use this when the teacher mentions a page number to identify the topic. Returns chapter and topic indices that can be used with updateProgress.",
    parameters: {
      type: "object",
      properties: {
        sectionId: {
          type: "string",
          description: "The section ID (e.g., '8B', '6A'). REQUIRED."
        },
        pageNumber: {
          type: "number",
          description: "The page number to search for. REQUIRED."
        }
      },
      required: ["sectionId", "pageNumber"]
    }
  },
  {
    name: "navigateTo",
    description: "Navigate the user to a different page in the app. Use this when the teacher asks to 'open', 'show', 'go to', or 'take me to' a page. Examples: 'open 6A geography', 'show me my schedule', 'go to dashboard', 'take me to the assessments page'.",
    parameters: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          description: "The page or destination to navigate to. Can be: 'dashboard', 'home', 'schedule', 'classes', 'assessments', 'resources', 'profile', 'settings', 'chat', 'hod-dashboard', 'admin-dashboard', or a class/section like '6A geography', '8B history', 'grade 6 geography'."
        },
        courseId: {
          type: "string",
          description: "Optional course ID if navigating to a specific course (e.g., 'geo6', 'hist8')."
        },
        sectionId: {
          type: "string",
          description: "Optional section ID if navigating to a specific class (e.g., '6A', '8B')."
        }
      },
      required: ["destination"]
    }
  },
  // ── Class Management Tools ──
  {
    name: "createCourse",
    description: "Create a new course/subject for the teacher. Use when the teacher wants to add a new subject like 'Mathematics Grade 10' or 'Physics Grade 12'.",
    parameters: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "The subject name (e.g., 'Mathematics', 'Physics', 'English', 'History'). REQUIRED."
        },
        grade: {
          type: "string",
          description: "The grade level (e.g., '6', '8', '10', '12'). REQUIRED."
        },
        title: {
          type: "string",
          description: "Optional custom title. If omitted, defaults to '{subject} Grade {grade}'."
        }
      },
      required: ["subject", "grade"]
    }
  },
  {
    name: "createSection",
    description: "Create a new section/class within an existing course. For example, adding section '10A' to 'Mathematics Grade 10'. Use getAvailableCourses first to find the courseId.",
    parameters: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description: "The ID of the course to add the section to. Use getAvailableCourses to find this. REQUIRED."
        },
        sectionId: {
          type: "string",
          description: "The section identifier (e.g., '10A', '6B', '8C'). REQUIRED."
        },
        schedules: {
          type: "array",
          items: { type: "string" },
          description: "Optional array of schedule strings like ['Mon 09:00–09:45', 'Wed 10:00–10:45']"
        }
      },
      required: ["courseId", "sectionId"]
    }
  },
  {
    name: "addStudents",
    description: "Add students to a class/section. Provide a list of student names (and optionally roll numbers/emails). Use getAvailableCourses to find the classId (section ID like '6A', '8B').",
    parameters: {
      type: "object",
      properties: {
        classId: {
          type: "string",
          description: "The section/class ID (e.g., '6A', '8B', '10A'). REQUIRED."
        },
        students: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Student's full name. REQUIRED." },
              rollNo: { type: "number", description: "Roll number (optional, auto-generated if omitted)" },
              email: { type: "string", description: "Email address (optional)" }
            },
            required: ["name"]
          },
          description: "Array of student objects. REQUIRED."
        }
      },
      required: ["classId", "students"]
    }
  },
  {
    name: "getStudents",
    description: "Get the list of all students in a class/section with their names, roll numbers, and emails.",
    parameters: {
      type: "object",
      properties: {
        classId: {
          type: "string",
          description: "The section/class ID (e.g., '6A', '8B'). REQUIRED."
        }
      },
      required: ["classId"]
    }
  },
  {
    name: "removeStudent",
    description: "Remove a student from a class. Only works for custom-added students (not demo data). Use getStudents first to find the studentId.",
    parameters: {
      type: "object",
      properties: {
        studentId: {
          type: "string",
          description: "The student's unique ID. REQUIRED. Use getStudents to find this."
        }
      },
      required: ["studentId"]
    }
  },
  {
    name: "deleteCourse",
    description: "Delete an entire course and all its sections, students, and syllabus. This is destructive and cannot be undone. Use getAvailableCourses to find the courseId.",
    parameters: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description: "The course ID to delete. REQUIRED."
        }
      },
      required: ["courseId"]
    }
  },
  {
    name: "deleteSection",
    description: "Delete a section from a course, including its students. Use getAvailableCourses to find courseId and sectionId.",
    parameters: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description: "The parent course ID. REQUIRED."
        },
        sectionId: {
          type: "string",
          description: "The section ID to delete. REQUIRED."
        }
      },
      required: ["courseId", "sectionId"]
    }
  },
  {
    name: "applyTimetable",
    description: "Apply timetable/schedule data to sections. Provide an array of schedule entries mapping class sections to their time slots.",
    parameters: {
      type: "object",
      properties: {
        scheduleData: {
          type: "array",
          items: {
            type: "object",
            properties: {
              classId: { type: "string", description: "Section ID (e.g., '6A', '8B')" },
              day: { type: "string", description: "Day abbreviation: Sun, Mon, Tue, Wed, Thu, Fri, Sat" },
              startTime: { type: "string", description: "Start time in HH:MM format (e.g., '09:00')" },
              endTime: { type: "string", description: "End time in HH:MM format (e.g., '09:45')" }
            },
            required: ["classId", "day", "startTime", "endTime"]
          },
          description: "Array of schedule entries. REQUIRED."
        }
      },
      required: ["scheduleData"]
    }
  },
  // ── Attendance Tools (Global) ──
  {
    name: "markAttendance",
    description: "Mark a single student as present or absent for a class. Uses fuzzy name matching to find the student. Use getStudents first if unsure of exact names.",
    parameters: {
      type: "object",
      properties: {
        classId: {
          type: "string",
          description: "The class/section ID (e.g., '6A', '8B'). REQUIRED."
        },
        studentName: {
          type: "string",
          description: "The student's name (fuzzy matched). REQUIRED."
        },
        status: {
          type: "string",
          description: "Attendance status: 'present' or 'absent'. Default is 'present'.",
          enum: ["present", "absent"]
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format. Defaults to today if omitted."
        }
      },
      required: ["classId", "studentName"]
    }
  },
  {
    name: "markBulkAttendance",
    description: "Mark all students in a class as present or absent at once. Optionally exclude specific students (exceptions get the opposite status). For example: 'mark all of 6A present except Rahul and Priya'.",
    parameters: {
      type: "object",
      properties: {
        classId: {
          type: "string",
          description: "The class/section ID (e.g., '6A', '8B'). REQUIRED."
        },
        status: {
          type: "string",
          description: "Default status for all students: 'present' or 'absent'. Default is 'present'.",
          enum: ["present", "absent"]
        },
        exceptions: {
          type: "array",
          items: { type: "string" },
          description: "Names of students who should get the OPPOSITE status. Optional."
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format. Defaults to today if omitted."
        }
      },
      required: ["classId"]
    }
  },
  {
    name: "getTodayAttendance",
    description: "Get today's attendance status for all students in a class. Shows who is present, absent, or not yet marked.",
    parameters: {
      type: "object",
      properties: {
        classId: {
          type: "string",
          description: "The class/section ID (e.g., '6A', '8B'). REQUIRED."
        }
      },
      required: ["classId"]
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

  // All calls go through backend proxy now.
  // Pre-load syllabus context and send everything in a single prompt.

  try {
    // Pre-load syllabus context so we can send everything in one prompt
    const courses = tool_getAvailableCourses();
    
    // Gather syllabus data for context
    let syllabusContext = '';
    if (currentCourseId) {
      const syl = tool_getSyllabus(currentCourseId, null, currentSectionId);
      syllabusContext = JSON.stringify(syl, null, 1);
    } else {
      const allSyl = courses.map(c => ({
        courseId: c.courseId,
        title: c.title,
        syllabus: tool_getSyllabus(c.courseId)
      }));
      syllabusContext = JSON.stringify(allSyl, null, 1);
    }

    const prompt = `You are a teaching assistant parsing voice commands for updating syllabus progress.

The user said: "${text}"

Current context:
- Current Course ID: ${currentCourseId || 'not set'}
- Current Section ID: ${currentSectionId || 'not set'}

Available courses: ${JSON.stringify(courses)}

Syllabus data:
${syllabusContext}

MULTI-STEP COMMAND DETECTION:
The user may give MULTIPLE operations in ONE command. Identify ALL of them.

CRITICAL RULES:
- "not done", "has not done", "hasn't done" → action: "mark_pending"
- Notes go with the topic being worked on (ongoing), NOT completed topics
- "covered to page X" means topic is at page X
- Handle speech-to-text errors like "deformers" → "reformers", "planes" → "plains"
- If user says "in it" without specifying subject, use the Current Course ID
- "mark the next" means find the next topic after the current one in sequence
- Use 1-based indices from syllabus
- courseId must match where the topic was found!

Return JSON (no markdown, no explanation, one JSON per line if multiple):
{
  "action": "mark_complete" | "mark_ongoing" | "mark_pending" | "unclear",
  "courseId": "courseId where topic was found",
  "sectionId": "string",
  "chapterIndex": number,
  "topicIndex": number,
  "matchedTopic": "exact topic title from syllabus",
  "matchedChapter": "exact chapter title from syllabus",
  "currentPage": number (optional),
  "notes": "string (optional)",
  "confidence": "high" | "medium" | "low"
}`;

    const finalText = await callGemini(prompt);
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
 * Parse attendance voice command (supports names and roll numbers)
 * @param {string} transcript - "Mark Rahul and Priya absent, everyone else present" or "roll number 2 present"
 * @param {string} classId - The class ID (e.g. "6A")
 * @param {Array} studentList - List of student objects { studentId, name, rollNo }
 */
export async function parseAttendanceVoice(transcript, classId, studentList) {
  const text = (transcript || '').trim();

  if (!text) {
    return { error: 'Empty transcript' };
  }

  // Build student list with roll numbers
  const studentListWithRolls = studentList.map(s => 
    `Roll ${s.rollNo || '?'}: ${s.name}`
  ).join(', ');

  const prompt = `
Parse this attendance voice command for Class ${classId}:
"${text}"

Students (Roll No: Name): ${studentListWithRolls}

Return JSON with:
{
  "present": [{"name": "Student Name", "rollNo": 1}, ...],
  "absent": [{"name": "Student Name", "rollNo": 2}, ...],
  "late": [{"name": "Student Name", "rollNo": 3}, ...],
  "unmentioned_status": "present" | "absent" | "unknown"
}

Rules:
- Match both names AND roll numbers (e.g., "roll number 2 present" → find student with rollNo 2)
- Handle spoken number words: "one"=1, "two"=2, "three"=3, "four"=4, "five"=5, etc.
- Handle variations: "roll", "role", "roll number", "number"
- Fuzzy match names from the student list
- If user says "everyone present except X", unmentioned_status is "present"
- If user says "only X present", unmentioned_status is "absent"
- Always include both name and rollNo in the output
`;

  // Route through backend proxy
  try {
    const response = await callAIGenerate({
      prompt,
      systemInstruction: 'You are a helpful AI that parses attendance voice commands. Return ONLY valid JSON, no markdown.',
      generationConfig: { temperature: 0.1 }
    });

    const responseText = response.text || '';
    console.log('[parseAttendanceVoice] Response:', responseText);

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { error: 'Failed to parse AI response', _fallback: true, transcript };
    }

    const json = JSON.parse(jsonMatch[0]);
    return processAttendanceResult(json, studentList);

  } catch (error) {
    console.error('[parseAttendanceVoice] Error:', error);
    return { error: error.message };
  }
}

/**
 * Process attendance JSON result and map to student IDs
 */
function processAttendanceResult(json, studentList) {
    // Map names/roll numbers back to IDs
    const updates = {};

    // Helper to find student by name or roll number
    const findStudent = (entry) => {
      // If entry has rollNo, try that first
      if (entry.rollNo !== undefined && entry.rollNo !== null) {
        const byRoll = studentList.find(s => s.rollNo === entry.rollNo);
        if (byRoll) return byRoll;
      }
      
      // Try by name
      const name = (entry.name || entry).toString().toLowerCase();
      
      // Check for roll number pattern in name string
      const rollMatch = name.match(/roll\s*(?:number|no|num|#)?\s*(\d+)/i);
      if (rollMatch) {
        const num = parseInt(rollMatch[1], 10);
        const byRoll = studentList.find(s => s.rollNo === num);
        if (byRoll) return byRoll;
      }
      
      // Fuzzy name match
      return studentList.find(s => s.name.toLowerCase().includes(name) || name.includes(s.name.toLowerCase()));
    };

    // Process explicit lists
    (json.present || []).forEach(entry => {
      const student = findStudent(entry);
      if (student) updates[student.studentId] = true;
    });

    (json.absent || []).forEach(entry => {
      const student = findStudent(entry);
      if (student) updates[student.studentId] = false;
    });

    // Handle unmentioned
    if (json.unmentioned_status === 'present') {
      studentList.forEach(s => {
        if (updates[s.studentId] === undefined) updates[s.studentId] = true;
      });
    } else if (json.unmentioned_status === 'absent') {
      studentList.forEach(s => {
        if (updates[s.studentId] === undefined) updates[s.studentId] = false;
      });
    }

    return { updates, confidence: 'high' };
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
  const startTime = Date.now();
  const text = (message || '').trim();
  
  if (!text) {
    return "I didn't catch that. Could you please repeat?";
  }

  console.log('[processChat] Input:', text);
  console.log('[processChat] Context:', context);
  console.log('[processChat] History length:', conversationHistory.length);
  
  // Log the chat action
  logAction('chat_message', { 
    messagePreview: text.substring(0, 100),
    hasContext: !!context.urlContext,
    historyLength: conversationHistory.length 
  });

  try {
    // ── Build conversation history ──────────────────────────────
    // Gemini requires history to start with 'user' role, not 'model'
    let validHistory = conversationHistory.slice(-10);
    const firstUserIndex = validHistory.findIndex(m => m.role === 'user');
    if (firstUserIndex > 0) validHistory = validHistory.slice(firstUserIndex);
    else if (firstUserIndex === -1) validHistory = [];
    // Exclude current message from history
    validHistory = validHistory.slice(0, -1);

    const historyMessages = validHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // ── Pronoun resolution ──────────────────────────────────────
    const lower = text.toLowerCase();
    const needsContext = /\b(it|this|that|those|these)\b/.test(lower) &&
      (lower.includes('mark') || lower.includes('done') || lower.includes('complete') || lower.includes('finish'));

    let enhancedMessage = text;
    if (needsContext && conversationHistory.length > 0) {
      const recentAssistantMsgs = conversationHistory
        .filter(m => m.role === 'assistant').slice(-3);
      for (const msg of recentAssistantMsgs.reverse()) {
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

    // ── Temporal context ────────────────────────────────────────
    const temporal = getTemporalContext();

    // ── Build full system instruction ───────────────────────────
    const systemInstruction = `You are a helpful AI teaching assistant for a school management app. You help teachers with:
- Tracking syllabus progress
- Finding the next topic to teach
- Viewing schedules and attendance
- Managing assignments
- Identifying students at risk

TEMPORAL CONTEXT (CURRENT TIME):
📅 ${temporal.summary}
${temporal.currentClass ? `🔴 You are IN CLASS right now with ${temporal.currentClass.classId}!` : ''}
${temporal.todaySessions.length > 0 ? `Today's full schedule: ${temporal.todaySessions.map(s => `${s.classId} (${s.startTime})`).join(', ')}` : ''}

CRITICAL CONTEXT RULES:
1. The teacher is CURRENTLY VIEWING: ${context.urlContext?.sectionId ? `Section ${context.urlContext.sectionId} of ${context.urlContext?.courseId || 'a course'}` : 'the main dashboard'}
2. When the user asks about "the page", "where I left off", "current topic", etc. WITHOUT specifying a section, USE THE CURRENT PAGE CONTEXT (${context.urlContext?.sectionId || 'unknown'})
3. If user asks "what's next?" or "what should I teach?" - consider BOTH the current class (if in one) AND the page context
4. ALWAYS check conversation history for context when user uses pronouns like "it", "that", "this"
5. If user says "mark it as done" or "mark it complete", find the LAST topic mentioned in conversation and mark THAT topic
6. When user says "and X?" (like "and 6A?"), repeat a similar query type for the new section

TOOL USAGE RULES:
1. Use the available tools to get real data - don't make up information
2. When the user mentions a section like "8B" or "6A", use it in your tool calls
3. If user asks about progress/page WITHOUT specifying section, use URL section: ${context.urlContext?.sectionId || 'ask for clarification'}
4. For updateProgress: you need sectionId, chapterIndex, and topicIndex - get these from getSyllabus or searchTopic first
5. If user says "mark [topic] done in [section]", first call searchTopic to find the chapter/topic indices, then call updateProgress
6. When getting syllabus/progress info, ALWAYS include page numbers in your response

MULTI-STEP OPERATION HANDLING (CRITICAL):
When the teacher gives complex commands with MULTIPLE operations, YOU MUST execute them ALL in sequence:

Pattern 1: "Mark X as done AND mark the next as [status]"
REQUIRED STEPS: searchTopic → updateProgress(complete) → getNextTopic → updateProgress(ongoing)

Pattern 2: "Done with X, covered to page Y, note Z"
REQUIRED STEPS: searchTopic → updateProgress(complete) → findTopicByPage(Y) → updateProgress(ongoing, page=Y, notes=Z)
KEY: Notes and currentPage go on ONGOING topics, not completed ones!

Pattern 3: "Mark X as ongoing with note Y and page Z"
REQUIRED STEPS: searchTopic → updateProgress(ongoing, page=Z, notes=Y)

CRITICAL RULES FOR MULTI-STEP:
✅ DO: Execute ALL operations; chain function calls; notes on ONGOING topics
✅ DO: Use getNextTopic() for sequence; read progress before updating
❌ DON'T: Stop after first operation; put notes on completed topics

RESPONSE RULES:
1. Keep responses concise and use markdown formatting
2. When reporting progress, ALWAYS include: topic name, chapter name, page range (pageFrom-pageTo), and current page if in progress
3. If you're unsure about a section or topic, ask for clarification
4. Available sections: ${teacherData.courses.flatMap(c => c.sections.map(s => `${s.id} (${c.title})`)).join(', ')}

IMAGE & FILE CAPABILITIES:
- You CAN see and analyze images (whiteboards, textbook pages, student work, charts)
- You CAN read text files (CSV, TXT, JSON) attached by the user
- When an image is attached, describe what you see and provide helpful analysis

EXAMPLE RESPONSES:
- "In section 6A, you're currently on **Plains and Valleys** (pages 29-36). You left off at page 32."
- "Your current topic in ${context.urlContext?.sectionId || '[section]'} is **[Topic Name]** in chapter **[Chapter]**. Continue from page [X]."`;

    // ── Build user message parts (text + attachments) ──────────
    const userParts = [{ text: enhancedMessage }];
    if (context.attachments && context.attachments.length > 0) {
      for (const att of context.attachments) {
        if (att.type === 'image' && att.data) {
          userParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
        } else if (att.type === 'text' && att.data) {
          const label = att.name ? `[File: ${att.name}]` : '[Attached file]';
          userParts.push({ text: `\n\n${label}\n${att.data}` });
        }
      }
    }

    // ── Initial AI call with tool declarations ──────────────────
    let result = await callAIGenerate({
      parts: userParts,
      systemInstruction,
      tools: [{ functionDeclarations: chatToolDeclarations }],
      history: historyMessages,
      type: 'default',
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    });

    // ── Multi-turn tool calling loop ────────────────────────────
    let navigationIntent = null;
    let iterations = 0;
    const maxIterations = 5;
    // Keep a running list of all messages for subsequent turns
    const allMessages = [...historyMessages, { role: 'user', parts: userParts }];

    while (result.functionCalls && result.functionCalls.length > 0 && iterations < maxIterations) {
      iterations++;
      console.log(`[Chat] Iteration ${iterations}: ${result.functionCalls.length} function call(s)`);

      // Execute each function call locally
      const fnResponseParts = [];
      for (const fc of result.functionCalls) {
        const { name, args } = fc;
        console.log(`[Chat] Calling tool: ${name}`, args);
        const fn = toolFunctions[name];
        let fnResult;
        if (fn) {
          try {
            switch (name) {
              case 'getAvailableCourses': fnResult = fn(); break;
              case 'getSyllabus': fnResult = fn(args.courseId, args.subject, args.sectionId); break;
              case 'searchTopic': fnResult = fn(args.searchQuery, args.filterSubject, args.filterSectionId); break;
              case 'getProgress': fnResult = fn(args.sectionId); break;
              case 'getNextTopic': fnResult = fn(args.sectionId); break;
              case 'getSchedule': fnResult = fn(args.daysAhead); break;
              case 'getAttendance': fnResult = fn(args.sectionId); break;
              case 'getAssignments': fnResult = fn(args.sectionId); break;
              case 'getStudentsAtRisk': fnResult = fn(); break;
              case 'updateProgress': fnResult = fn(args.sectionId, args.chapterIndex, args.topicIndex, args.status, { currentPage: args.currentPage, notes: args.notes }); break;
              case 'findTopicByPage': fnResult = fn(args.sectionId, args.pageNumber); break;
              case 'navigateTo':
                fnResult = fn(args.destination, { courseId: args.courseId, sectionId: args.sectionId });
                if (fnResult.success && fnResult.path) navigationIntent = fnResult;
                break;
              case 'createCourse': fnResult = fn(args.subject, args.grade, args.title); break;
              case 'createSection': fnResult = fn(args.courseId, args.sectionId, args.schedules); break;
              case 'addStudents': fnResult = fn(args.classId, args.students); break;
              case 'getStudents': fnResult = fn(args.classId); break;
              case 'removeStudent': fnResult = fn(args.studentId); break;
              case 'deleteCourse': fnResult = fn(args.courseId); break;
              case 'deleteSection': fnResult = fn(args.courseId, args.sectionId); break;
              case 'applyTimetable': fnResult = fn(args.scheduleData); break;
              case 'markAttendance': fnResult = fn(args.classId, args.studentName, args.status, args.date); break;
              case 'markBulkAttendance': fnResult = fn(args.classId, args.status, args.exceptions, args.date); break;
              case 'getTodayAttendance': fnResult = fn(args.classId); break;
              default: fnResult = { error: `Unknown function: ${name}` };
            }
          } catch (err) {
            console.error(`[Chat] Error calling ${name}:`, err);
            fnResult = { error: err.message };
          }
        } else {
          fnResult = { error: `Unknown function: ${name}` };
        }
        console.log(`[Chat] Tool result:`, fnResult);
        fnResponseParts.push({ functionResponse: { name, response: { result: fnResult } } });
      }

      // Append model's function-call turn and our function-response turn to history
      allMessages.push({
        role: 'model',
        parts: result.functionCalls.map(fc => ({ functionCall: fc })),
      });
      allMessages.push({
        role: 'user',
        parts: fnResponseParts,
      });

      // Call again with the extended history (no new prompt — continuation)
      result = await callAIGenerate({
        systemInstruction,
        tools: [{ functionDeclarations: chatToolDeclarations }],
        history: allMessages,
        type: 'default',
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      });
    }

    // ── Extract final text ──────────────────────────────────────
    const finalText = result.text || '';
    console.log('[Chat] Final response:', finalText || '(empty)');

    logGeminiCall('processChat', {
      messagePreview: text.substring(0, 100),
      model: 'gemini-proxy',
      toolsUsed: iterations > 0,
      iterations,
    }, finalText, Date.now() - startTime);

    // If navigation was requested, return object with both text and navigation
    if (navigationIntent) {
      return {
        text: finalText || `Navigating to ${navigationIntent.displayName}...`,
        navigate: navigationIntent.path,
      };
    }

    if (!finalText || finalText.trim() === '') {
      console.warn('[Chat] Empty response from AI, using fallback');
      return "I understood your request but couldn't generate a proper response. Could you please rephrase?";
    }

    return finalText;

  } catch (error) {
    console.error('Chat processing error:', error);

    logGeminiCall('processChat', {
      messagePreview: text.substring(0, 100),
      model: 'gemini-proxy',
    }, null, Date.now() - startTime, error);

    if (isRateLimitError(error)) {
      return `⏳ **Rate Limit Reached**\n\nI'm getting too many requests right now. Please wait about 60 seconds and try again.\n\n_In the meantime, here's what I can help with:_\n• "What's next in 8B?"\n• "Show progress for 6A"\n• "What's my schedule today?"`;
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
  parseAttendanceVoice,
  generateQuiz,
  generateAssignment,
  analyzeStudentPerformance,
  generateDailyBriefing,
  suggestNextTopic,
  detectAttendanceRisks
};

// ============================================================================
// SMART AI SUGGESTIONS - GEMINI-POWERED
// ============================================================================
// SMART AI SUGGESTIONS - GEMINI-POWERED WITH COMPLETE CONTEXT
// ============================================================================

/**
 * Build COMPLETE detailed context for a specific section
 * Includes: per-student attendance per day, topics covered each day, grades, comparisons
 */
function buildDetailedSectionContext(sectionId) {
  // Find course and section
  let course = null;
  let section = null;
  for (const c of teacherData.courses) {
    const s = c.sections.find(sec => sec.sectionId === sectionId || sec.id === sectionId || sec.name === sectionId);
    if (s) {
      course = c;
      section = s;
      break;
    }
  }
  
  if (!course || !section) return null;
  
  const classId = section.sectionId || section.id || section.name;
  
  // Get students for this section
  const sectionStudents = students.filter(s => s.classId === classId);
  
  // Get syllabus and progress
  const syllabus = getSyllabusByRef(course.syllabusRef);
  const baseProgress = syllabus ? normalizeSectionProgress(classId, syllabus) : {};
  const storedProgress = loadStoredProgress(classId, {});
  const effectiveProgress = { ...baseProgress, ...storedProgress };
  
  // Build topic history with dates
  const topicHistory = [];
  const topicsWithLowAttendance = [];
  
  if (syllabus) {
    for (const chapter of syllabus.chapters) {
      for (const topic of chapter.subTopics) {
        const topicData = effectiveProgress[chapter.index]?.topics?.[topic.index];
        const status = typeof topicData === 'object' ? topicData.status : topicData;
        const lastCoveredAt = typeof topicData === 'object' ? topicData.lastCoveredAt : null;
        
        if (status === 'done' && lastCoveredAt) {
          const coveredDate = new Date(lastCoveredAt).toISOString().split('T')[0];
          
          // Get attendance for that day
          const dayAttendance = attendanceLogs.filter(log => 
            log.classId === classId && log.date === coveredDate
          );
          const presentCount = dayAttendance.filter(a => a.status === 'present').length;
          const totalStudents = sectionStudents.length;
          const attendancePercent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
          
          // Get names of absent students that day
          const absentStudentIds = dayAttendance.filter(a => a.status === 'absent').map(a => a.studentId);
          const absentNames = sectionStudents
            .filter(s => absentStudentIds.includes(s.studentId))
            .map(s => s.name);
          
          const topicEntry = {
            topic: topic.title,
            chapter: chapter.title,
            chapterIndex: chapter.index,
            topicIndex: topic.index,
            date: coveredDate,
            attendancePercent,
            presentCount,
            totalStudents,
            absentStudents: absentNames
          };
          
          topicHistory.push(topicEntry);
          
          // Flag topics covered with low attendance (<70%)
          if (attendancePercent < 70) {
            topicsWithLowAttendance.push(topicEntry);
          }
        }
      }
    }
  }
  
  // Sort topic history by date (most recent first)
  topicHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Find current topic and next topic
  let currentTopic = null;
  let nextTopic = null;
  let completedTopics = 0;
  let totalTopics = 0;
  
  if (syllabus) {
    for (const chapter of syllabus.chapters) {
      for (const topic of chapter.subTopics) {
        totalTopics++;
        const topicData = effectiveProgress[chapter.index]?.topics?.[topic.index];
        const status = typeof topicData === 'object' ? topicData.status : topicData;
        
        if (status === 'done') {
          completedTopics++;
        } else if (status === 'ongoing' && !currentTopic) {
          currentTopic = {
            title: topic.title,
            chapter: chapter.title,
            chapterIndex: chapter.index,
            topicIndex: topic.index,
            currentPage: topicData?.currentPage || topic.pageFrom,
            pageTo: topic.pageTo,
            notes: topicData?.notes
          };
        } else if (!status || status === 'not-started') {
          if (!nextTopic) {
            nextTopic = {
              title: topic.title,
              chapter: chapter.title,
              chapterIndex: chapter.index,
              topicIndex: topic.index,
              pageFrom: topic.pageFrom,
              pageTo: topic.pageTo
            };
          }
        }
      }
    }
  }
  
  // Per-student detailed attendance with dates
  const studentDetails = sectionStudents.map(student => {
    const studentLogs = attendanceLogs.filter(log => log.studentId === student.studentId);
    const presentDays = studentLogs.filter(a => a.status === 'present');
    const absentDays = studentLogs.filter(a => a.status === 'absent');
    const attendancePercent = studentLogs.length > 0 
      ? Math.round((presentDays.length / studentLogs.length) * 100) 
      : 100;
    
    // Get the last 5 absence dates
    const recentAbsences = absentDays
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(a => a.date);
    
    // Get student grades
    const studentGrades = [];
    assignments.filter(a => a.classId === classId).forEach(assn => {
      const submission = assn.submissions?.find(s => s.studentId === student.studentId);
      if (submission && submission.grade !== undefined) {
        studentGrades.push({
          assignment: assn.title,
          grade: submission.grade,
          maxPoints: assn.maxPoints,
          percent: Math.round((submission.grade / assn.maxPoints) * 100)
        });
      }
    });
    
    const avgGrade = studentGrades.length > 0 
      ? Math.round(studentGrades.reduce((sum, g) => sum + g.percent, 0) / studentGrades.length)
      : null;
    
    // Check which completed topics this student missed
    const missedTopics = topicHistory
      .filter(th => th.absentStudents.includes(student.name))
      .map(th => ({ topic: th.topic, chapter: th.chapter, date: th.date }));
    
    return {
      name: student.name,
      rollNo: student.rollNo,
      attendancePercent,
      totalPresent: presentDays.length,
      totalAbsent: absentDays.length,
      recentAbsenceDates: recentAbsences,
      avgGrade,
      grades: studentGrades,
      missedTopics
    };
  });
  
  // Identify at-risk students
  const atRiskStudents = studentDetails.filter(s => 
    s.attendancePercent < 75 || 
    (s.avgGrade !== null && s.avgGrade < 60) ||
    s.totalAbsent >= 3
  ).map(s => ({
    name: s.name,
    attendancePercent: s.attendancePercent,
    avgGrade: s.avgGrade,
    recentAbsenceDates: s.recentAbsenceDates,
    missedTopics: s.missedTopics.slice(0, 3)
  }));
  
  // Get other sections in same course for comparison
  const otherSections = course.sections
    .filter(s => (s.sectionId || s.id || s.name) !== classId)
    .map(s => {
      const otherId = s.sectionId || s.id || s.name;
      const otherProgress = loadStoredProgress(otherId, {});
      const otherBase = syllabus ? normalizeSectionProgress(otherId, syllabus) : {};
      const otherEffective = { ...otherBase, ...otherProgress };
      
      let otherCompleted = 0;
      let otherCurrentTopic = null;
      
      if (syllabus) {
        for (const ch of syllabus.chapters) {
          for (const t of ch.subTopics) {
            const td = otherEffective[ch.index]?.topics?.[t.index];
            const st = typeof td === 'object' ? td.status : td;
            if (st === 'done') otherCompleted++;
            else if (st === 'ongoing' && !otherCurrentTopic) {
              otherCurrentTopic = t.title;
            }
          }
        }
      }
      
      return {
        name: s.name,
        completedTopics: otherCompleted,
        progressPercent: totalTopics > 0 ? Math.round((otherCompleted / totalTopics) * 100) : 0,
        currentTopic: otherCurrentTopic
      };
    });
  
  // Get pending assignments for this class
  const pendingAssignments = assignments
    .filter(a => a.classId === classId && new Date(a.dueDate) >= new Date())
    .map(a => ({
      title: a.title,
      dueDate: a.dueDate,
      submitted: a.submissions?.length || 0,
      total: sectionStudents.length
    }));
  
  return {
    courseName: course.title,
    sectionName: section.name,
    classId,
    subject: syllabus?.subject,
    grade: syllabus?.grade,
    currentTopic,
    nextTopic,
    completedTopics,
    totalTopics,
    progressPercent: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
    studentCount: sectionStudents.length,
    students: studentDetails,
    atRiskStudents,
    topicHistory: topicHistory.slice(0, 10), // Last 10 topics covered
    topicsWithLowAttendance,
    otherSections,
    pendingAssignments
  };
}

/**
 * Generate smart suggestions for a specific section using Gemini
 * Optimized for speed with shorter prompts
 */
export async function generateSectionSuggestions(sectionId) {
  const context = buildDetailedSectionContext(sectionId);
  
  if (!context) {
    console.error('Could not build context for section:', sectionId);
    return getFallbackSuggestions({ sectionName: sectionId, atRiskStudents: [], currentTopic: null, nextTopic: null, otherSections: [], progressPercent: 0, topicsWithLowAttendance: [], pendingAssignments: [] });
  }
  
  // Build compact data for faster processing
  const atRiskList = context.atRiskStudents.slice(0, 5).map(s => 
    `${s.name}:${s.attendancePercent}%${s.avgGrade ? `,${s.avgGrade}%grade` : ''}`
  ).join('|');
  
  const lowAttTopics = context.topicsWithLowAttendance.slice(0, 3).map(t => 
    `"${t.topic}"(${t.date},${t.attendancePercent}%)`
  ).join('|');
  
  const prompt = `You are a helpful teacher assistant. Analyze this class data and give 3 brief suggestions.

Class: ${context.courseName} - ${context.sectionName}
Students: ${context.studentCount}
Progress: ${context.progressPercent}%
Current topic: ${context.currentTopic?.title || context.nextTopic?.title || 'Completed'}
${atRiskList ? `At-risk students: ${atRiskList}` : ''}
${lowAttTopics ? `Low attendance topics: ${lowAttTopics}` : ''}

Respond with exactly 3 suggestions in this JSON format:
[
  {"title": "short title", "detail": "brief explanation", "color": "red", "icon": "alert"},
  {"title": "short title", "detail": "brief explanation", "color": "yellow", "icon": "users"},
  {"title": "short title", "detail": "brief explanation", "color": "green", "icon": "check"}
]

Colors: red=urgent, yellow=attention, green=positive
Icons: alert, users, book, calendar, trending, target, check`;

  try {
    const response = await callGemini(prompt, false);
    
    if (!response) {
      console.warn('Empty response from Gemini');
      return getFallbackSuggestions(context);
    }
    
    // Clean up response
    let jsonStr = response.trim();
    
    // Remove markdown code blocks
    jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    
    // Try to find JSON array in response
    const startIdx = jsonStr.indexOf('[');
    const endIdx = jsonStr.lastIndexOf(']');
    
    if (startIdx !== -1 && endIdx > startIdx) {
      jsonStr = jsonStr.slice(startIdx, endIdx + 1);
      
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate each suggestion has required fields
          const valid = parsed.filter(s => s && s.title && s.detail);
          if (valid.length > 0) {
            return valid.slice(0, 5).map(s => ({
              title: String(s.title).slice(0, 50),
              detail: String(s.detail).slice(0, 200),
              color: ['red', 'yellow', 'green'].includes(s.color) ? s.color : 'yellow',
              icon: s.icon || 'book'
            }));
          }
        }
      } catch (parseErr) {
        console.warn('JSON parse failed, trying extraction:', parseErr.message);
      }
    }
    
    // Fallback: try to extract individual objects with relaxed pattern
    const extracted = extractSuggestionsFromText(jsonStr);
    if (extracted.length > 0) {
      return extracted;
    }
    
    console.warn('Could not parse suggestions, using fallback');
    return getFallbackSuggestions(context);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return getFallbackSuggestions(context);
  }
}

/**
 * Extract suggestions from text using flexible patterns
 */
function extractSuggestionsFromText(text) {
  const suggestions = [];
  
  // Try to match JSON-like objects with title and detail
  const patterns = [
    /"title"\s*:\s*"([^"]+)"[^}]*"detail"\s*:\s*"([^"]+)"[^}]*"color"\s*:\s*"([^"]+)"[^}]*"icon"\s*:\s*"([^"]+)"/gi,
    /"title"\s*:\s*"([^"]+)"[^}]*"detail"\s*:\s*"([^"]+)"/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null && suggestions.length < 5) {
      suggestions.push({
        title: match[1],
        detail: match[2],
        color: match[3] && ['red', 'yellow', 'green'].includes(match[3]) ? match[3] : 'yellow',
        icon: match[4] || 'book'
      });
    }
    if (suggestions.length > 0) break;
  }
  
  return suggestions;
}

/**
 * Fallback suggestions when API fails - uses real data with table support
 */
function getFallbackSuggestions(context) {
  const suggestions = [];
  
  // Topics with low attendance need revision
  if (context.topicsWithLowAttendance?.length > 0) {
    const topics = context.topicsWithLowAttendance;
    const topic = topics[0];
    const absentNames = topic.absentStudents.slice(0, 3).join(', ');
    const moreCount = topic.absentStudents.length > 3 ? ` +${topic.absentStudents.length - 3} more` : '';
    
    suggestions.push({
      title: "Revision Needed",
      summary: `${topics.length} topic${topics.length > 1 ? 's' : ''} covered with low attendance`,
      detail: `"${topic.topic}" (${topic.date}) had only ${topic.attendancePercent}% attendance. Absent: ${absentNames}${moreCount}. Plan a revision session.`,
      color: "yellow",
      icon: "book",
      tableData: topics.length > 1 ? topics.map(t => ({
        topic: t.topic,
        date: t.date,
        attendance: `${t.attendancePercent}%`,
        absent: t.absentStudents.join(', ')
      })) : null,
      tableColumns: [
        { key: 'topic', label: 'Topic' },
        { key: 'date', label: 'Date' },
        { key: 'attendance', label: 'Attendance' },
        { key: 'absent', label: 'Absent Students' }
      ]
    });
  }
  
  // At-risk students with table data
  if (context.atRiskStudents?.length > 0) {
    const students = context.atRiskStudents;
    const topStudent = students[0];
    const summaryNames = students.slice(0, 2).map(s => `${s.name} (${s.attendancePercent}%)`).join(', ');
    const moreCount = students.length > 2 ? ` +${students.length - 2} more` : '';
    
    suggestions.push({
      title: "Students Need Attention",
      summary: `${students.length} student${students.length > 1 ? 's' : ''} flagged for follow-up`,
      detail: `Contact parents/guardians: ${summaryNames}${moreCount}. Low attendance may indicate issues.`,
      color: "red",
      icon: "users",
      tableData: students.map(s => ({
        name: s.name,
        attendance: `${s.attendancePercent}%`,
        grade: s.avgGrade !== null ? `${s.avgGrade}%` : 'N/A',
        recentAbsences: s.recentAbsenceDates?.slice(0, 3).join(', ') || 'None',
        missedTopics: s.missedTopics?.slice(0, 2).map(t => t.topic).join(', ') || 'None'
      })),
      tableColumns: [
        { key: 'name', label: 'Student' },
        { key: 'attendance', label: 'Attendance' },
        { key: 'grade', label: 'Avg Grade' },
        { key: 'recentAbsences', label: 'Recent Absences' },
        { key: 'missedTopics', label: 'Missed Topics' }
      ]
    });
  }
  
  // Current/next topic
  if (context.currentTopic) {
    suggestions.push({
      title: "Continue Teaching",
      summary: `Resume ${context.currentTopic.title}`,
      detail: `Continue "${context.currentTopic.title}" from page ${context.currentTopic.currentPage} of ${context.currentTopic.pageTo} (${context.currentTopic.chapter})`,
      color: "green",
      icon: "book"
    });
  } else if (context.nextTopic) {
    suggestions.push({
      title: "Start Next Topic",
      summary: `Ready for ${context.nextTopic.title}`,
      detail: `Begin "${context.nextTopic.title}" - pages ${context.nextTopic.pageFrom}-${context.nextTopic.pageTo} (${context.nextTopic.chapter})`,
      color: "green",
      icon: "target"
    });
  }
  
  // Comparison with other sections
  if (context.otherSections?.length > 0) {
    const ahead = context.otherSections.filter(s => s.progressPercent > (context.progressPercent || 0) + 10);
    if (ahead.length > 0) {
      suggestions.push({
        title: "Section Comparison",
        summary: `${ahead[0].name} is ahead by ${ahead[0].progressPercent - context.progressPercent}%`,
        detail: `${ahead[0].name} is at ${ahead[0].progressPercent}% vs your ${context.progressPercent}%. Consider accelerating pace.`,
        color: "yellow",
        icon: "trending"
      });
    }
  }
  
  // Pending assignments
  if (context.pendingAssignments?.length > 0) {
    const assn = context.pendingAssignments[0];
    const missing = assn.total - assn.submitted;
    if (missing > 0) {
      suggestions.push({
        title: "Assignment Reminder",
        summary: `${missing} pending submissions for ${assn.title}`,
        detail: `"${assn.title}" due ${assn.dueDate} - ${missing} of ${assn.total} students haven't submitted`,
        color: "yellow",
        icon: "calendar"
      });
    }
  }
  
  return suggestions.slice(0, 5);
}

/**
 * Generate aggregated dashboard insights from all sections
 * Optimized for speed with shorter prompts
 */
export async function generateDashboardInsights() {
  const allSectionContexts = [];
  
  // Gather context for all sections
  for (const course of teacherData.courses) {
    for (const section of course.sections) {
      const sectionId = section.sectionId || section.id || section.name;
      const context = buildDetailedSectionContext(sectionId);
      if (context) {
        allSectionContexts.push(context);
      }
    }
  }
  
  if (allSectionContexts.length === 0) {
    return [{ title: "No Data", detail: "No sections found", color: "yellow", icon: "alert" }];
  }
  
  // Aggregate data
  const totalStudents = allSectionContexts.reduce((sum, c) => sum + c.studentCount, 0);
  const allAtRisk = allSectionContexts.flatMap(c => 
    c.atRiskStudents.map(s => ({ ...s, section: c.sectionName, course: c.courseName }))
  );
  const allLowAttendanceTopics = allSectionContexts.flatMap(c => 
    c.topicsWithLowAttendance.map(t => ({ ...t, section: c.sectionName }))
  );
  const avgProgress = Math.round(
    allSectionContexts.reduce((sum, c) => sum + c.progressPercent, 0) / allSectionContexts.length
  );
  
  // Find sections behind/ahead
  const behindSections = allSectionContexts.filter(c => c.progressPercent < avgProgress - 15);
  const aheadSections = allSectionContexts.filter(c => c.progressPercent > avgProgress + 15);
  
  // Build compact data for faster processing
  const sectionsCompact = allSectionContexts.map(c => 
    `${c.sectionName}:${c.progressPercent}%,${c.atRiskStudents.length}risk`
  ).join('|');
  
  const lowAttCompact = allLowAttendanceTopics.slice(0, 3).map(t => 
    `${t.section}:"${t.topic}"(${t.attendancePercent}%)`
  ).join('|');
  
  const atRiskCompact = allAtRisk.slice(0, 4).map(s => 
    `${s.name}(${s.section}):${s.attendancePercent}%`
  ).join('|');

  const prompt = `Dashboard insights for teacher. Give 3-4 SHORT prioritized insights.

SUMMARY: ${allSectionContexts.length} sections, ${totalStudents} students, ${avgProgress}% avg progress
SECTIONS: ${sectionsCompact}
LOW_ATT_TOPICS: ${lowAttCompact || 'None'}
AT_RISK: ${atRiskCompact || 'None'}
BEHIND: ${behindSections.map(c => c.sectionName).join(',') || 'None'}
AHEAD: ${aheadSections.map(c => c.sectionName).join(',') || 'None'}

Rules:
- Priority: red (critical) > yellow (attention) > green (positive)
- Use icon: alert|users|book|calendar|trending|target|check
- Each: short title + 1-sentence detail with names

JSON only:
[{"title":"3-5 words","detail":"one sentence","color":"red|yellow|green","icon":"alert|users|book|trending|target"}]`;

  try {
    const response = await callGemini(prompt, false);
    
    // Parse JSON from response - handle markdown code blocks
    let jsonStr = response;
    
    // Remove markdown code block wrappers if present
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\s*/g, '');
    }
    
    // Try to extract complete JSON array
    const jsonMatch = jsonStr.match(/\[\s*\{[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\}\s*)*\]/);
    if (jsonMatch) {
      try {
        const insights = JSON.parse(jsonMatch[0]);
        return Array.isArray(insights) ? insights.slice(0, 4) : [];
      } catch (parseErr) {
        // JSON was truncated, try to fix it
        const fixedJson = fixTruncatedJson(jsonMatch[0]);
        if (fixedJson) {
          const insights = JSON.parse(fixedJson);
          return Array.isArray(insights) ? insights.slice(0, 4) : [];
        }
      }
    }
    
    // Try to extract partial JSON objects
    const partialInsights = extractPartialSuggestions(jsonStr);
    if (partialInsights.length > 0) {
      return partialInsights.slice(0, 4);
    }
    
    console.warn('Could not parse insights, using fallback');
    return getFallbackDashboardInsights(allSectionContexts, allAtRisk, allLowAttendanceTopics, avgProgress);
  } catch (error) {
    console.error('Error generating dashboard insights:', error);
    return getFallbackDashboardInsights(allSectionContexts, allAtRisk, allLowAttendanceTopics, avgProgress);
  }
}

/**
 * Fallback dashboard insights when API fails
 */
function getFallbackDashboardInsights(sections, atRisk, lowAttendanceTopics, avgProgress) {
  const insights = [];
  
  // Topics needing revision with table data
  if (lowAttendanceTopics.length > 0) {
    const topic = lowAttendanceTopics[0];
    const summaryTopics = lowAttendanceTopics.slice(0, 2).map(t => `"${t.topic}" (${t.section})`).join(', ');
    insights.push({
      title: "Revision Needed",
      summary: `${lowAttendanceTopics.length} topic${lowAttendanceTopics.length > 1 ? 's' : ''} covered with low attendance`,
      detail: `${summaryTopics}${lowAttendanceTopics.length > 2 ? ` +${lowAttendanceTopics.length - 2} more` : ''} - plan revision sessions.`,
      color: "yellow",
      icon: "book",
      tableData: lowAttendanceTopics.length > 1 ? lowAttendanceTopics.map(t => ({
        section: t.section,
        topic: t.topic,
        date: t.date,
        attendance: `${t.attendancePercent}%`
      })) : null,
      tableColumns: [
        { key: 'section', label: 'Section' },
        { key: 'topic', label: 'Topic' },
        { key: 'date', label: 'Date' },
        { key: 'attendance', label: 'Attendance' }
      ]
    });
  }
  
  // At-risk students with table data
  if (atRisk.length > 0) {
    const summaryNames = atRisk.slice(0, 2).map(s => `${s.name} (${s.attendancePercent}%)`).join(', ');
    insights.push({
      title: "Students Need Attention",
      summary: `${atRisk.length} student${atRisk.length > 1 ? 's' : ''} flagged across all classes`,
      detail: `Contact: ${summaryNames}${atRisk.length > 2 ? ` +${atRisk.length - 2} more` : ''}`,
      color: "red",
      icon: "users",
      tableData: atRisk.map(s => ({
        name: s.name,
        section: s.section,
        attendance: `${s.attendancePercent}%`,
        grade: s.avgGrade !== null ? `${s.avgGrade}%` : 'N/A'
      })),
      tableColumns: [
        { key: 'name', label: 'Student' },
        { key: 'section', label: 'Section' },
        { key: 'attendance', label: 'Attendance' },
        { key: 'grade', label: 'Avg Grade' }
      ]
    });
  }
  
  // Section comparisons
  const behind = sections.filter(s => s.progressPercent < avgProgress - 10);
  if (behind.length > 0) {
    insights.push({
      title: "Section Behind",
      summary: `${behind[0].sectionName} needs attention`,
      detail: `${behind[0].sectionName} at ${behind[0].progressPercent}% vs ${avgProgress}% average - consider acceleration`,
      color: "yellow",
      icon: "trending"
    });
  }
  
  const ahead = sections.filter(s => s.progressPercent > avgProgress + 10);
  if (ahead.length > 0) {
    insights.push({
      title: "Strong Progress",
      summary: `${ahead[0].sectionName} ahead of schedule`,
      detail: `${ahead[0].sectionName} at ${ahead[0].progressPercent}% - great pace!`,
      color: "green",
      icon: "target"
    });
  }
  
  if (insights.length === 0) {
    insights.push({
      title: "All On Track",
      summary: "No urgent items",
      detail: `All ${sections.length} sections at ~${avgProgress}% average. Keep up the good work!`,
      color: "green",
      icon: "check"
    });
  }
  
  return insights.slice(0, 4);
}

// Export tool functions and declarations for voice agent to share
export { toolFunctions, chatToolDeclarations, toolDeclarations };
