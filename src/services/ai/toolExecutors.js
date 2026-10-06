/**
 * Tool Executor Functions
 * 
 * All tool_* functions that the LLM invokes via function calling.
 * These read/write local data (dummyData, classManagement, localStorage).
 */

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
} from '../../data/dummyData';
import * as classManagement from '../../utils/classManagement';

// ============================================================================
// TOOL DEFINITIONS FOR LLM FUNCTION CALLING
// ============================================================================

/**
 * Get list of all available courses with their sections
 */
export function tool_getAvailableCourses() {
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
export function tool_getSyllabus(courseId = null, subject = null, sectionId = null) {
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
        pagesCompleted = totalTopicPages;
        percentComplete = 100;
      } else if (topicStatus === 'ongoing' && topicProgress?.currentPage) {
        pagesCompleted = Math.max(0, topicProgress.currentPage - t.pageFrom + 1);
        percentComplete = Math.round((pagesCompleted / totalTopicPages) * 100);
      }
      
      return {
        index: t.index,
        title: t.title,
        pageFrom: t.pageFrom,
        pageTo: t.pageTo,
        totalPages: totalTopicPages,
        status: topicStatus,
        currentPage: topicProgress?.currentPage || null,
        pagesCompleted,
        percentComplete,
        notes: topicProgress?.notes || null,
        lastCoveredAt: topicProgress?.lastCoveredAt || null,
        continueFromPage: topicStatus === 'done' ? null : (topicProgress?.currentPage || t.pageFrom)
      };
    });
    
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
    totalChapters: chapters.length,
    totalTopics,
    completedTopics,
    totalPages,
    completedPages,
    overallPercent: totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0,
    lastCompletedTopic,
    currentTopic,
    nextTopic,
    continueFromPage: currentTopic?.continueFromPage || nextTopic?.pageFrom || null,
    chapters
  };
}

/**
 * Search for a topic across all syllabi (or filtered by subject/section)
 */
export function tool_searchTopic(searchQuery, filterSubject = null, filterSectionId = null) {
  const query = searchQuery.toLowerCase();
  const results = [];
  
  const corrections = {
    'deformers': 'reformers',
    'planes': 'plains',
    'valleys': 'valleys',
    'lightning': 'enlightenment',
    'lite': 'light',
    'in light': 'enlightenment',
    'enlitement': 'enlightenment'
  };
  
  let correctedQuery = query;
  for (const [wrong, right] of Object.entries(corrections)) {
    correctedQuery = correctedQuery.replace(new RegExp(wrong, 'gi'), right);
  }
  
  for (const course of teacherData.courses) {
    const syllabus = getSyllabusByRef(course.syllabusRef);
    if (!syllabus) continue;
    
    if (filterSubject && !syllabus.subject.toLowerCase().includes(filterSubject.toLowerCase())) {
      continue;
    }
    if (filterSectionId && !course.sections.some(s => s.id.toUpperCase() === filterSectionId.toUpperCase())) {
      continue;
    }
    
    for (const chapter of syllabus.chapters) {
      for (const topic of chapter.subTopics || []) {
        const titleLower = topic.title.toLowerCase();
        const queryWords = correctedQuery.split(/\s+/).filter(w => w.length > 2);
        const matchCount = queryWords.filter(w => titleLower.includes(w)).length;
        
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
  
  results.sort((a, b) => b.relevance - a.relevance);
  return results.slice(0, 5);
}

/**
 * Get progress summary for a section
 */
export function tool_getProgress(sectionId = null) {
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
export function tool_getNextTopic(sectionId) {
  if (!sectionId) {
    return { error: 'Section ID required', availableSections: teacherData.courses.flatMap(c => c.sections.map(s => s.id)) };
  }
  
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
      const status = typeof topicData === 'string' ? topicData : (topicData?.status || 'not-started');
      
      if (status === 'done') {
        lastCompletedTopic = topic.title;
        lastCompletedChapter = chapter.title;
      } else if (status === 'ongoing' && !currentTopic) {
        currentTopic = topic.title;
        currentChapter = chapter.title;
        currentTopicPages = { from: topic.pageFrom, to: topic.pageTo };
        currentPage = topicData?.currentPage || topic.pageFrom;
      } else if (status === 'not-started' && !nextTopic) {
        nextTopic = topic.title;
        nextChapter = chapter.title;
        nextTopicPages = { from: topic.pageFrom, to: topic.pageTo };
      }
    }
  }
  
  const upcomingExam = targetSection.exams?.find(e => new Date(e.date) > new Date());
  
  return {
    sectionId: targetSection.id,
    courseId: targetCourse.id,
    courseTitle: targetCourse.title,
    subject: syllabus.subject,
    grade: syllabus.grade,
    currentChapter,
    currentTopic,
    currentTopicPages,
    currentPage,
    nextChapter,
    nextTopic,
    nextTopicPages,
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
 */
export function getTemporalContext() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentHHMM = now.toTimeString().slice(0, 5);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[now.getDay()];
  const dateFormatted = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const todaySessions = getUpcomingSessions(teacherData, 0).filter(s => s.date === today);
  todaySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  let currentClass = null;
  let justHadClass = null;
  let upcomingClass = null;
  
  for (const session of todaySessions) {
    const startTime = session.startTime;
    const endTime = session.endTime;
    
    if (currentHHMM >= startTime && currentHHMM <= endTime) {
      currentClass = session;
    } else if (currentHHMM > endTime) {
      justHadClass = session;
    } else if (currentHHMM < startTime && !upcomingClass) {
      upcomingClass = session;
    }
  }
  
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
export function tool_getSchedule(daysAhead = 7) {
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
export function tool_getAttendance(sectionId = null) {
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
export function tool_getAssignments(sectionId = null) {
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
export function tool_getStudentsAtRisk() {
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
export function tool_updateProgress(sectionId, chapterIndex, topicIndex, status, options = {}) {
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
  
  const baseProgress = normalizeSectionProgress(syllabus, targetSection.progress);
  const currentProgress = loadStoredProgress(targetSection.id, baseProgress);
  
  if (!currentProgress[chapterIndex]) {
    currentProgress[chapterIndex] = { topics: {} };
  }
  
  const statusMap = { 'complete': 'done', 'done': 'done', 'ongoing': 'ongoing', 'pending': 'not-started', 'not-started': 'not-started' };
  const newStatus = statusMap[status] || 'done';
  
  const existingData = currentProgress[chapterIndex].topics[topicIndex] || {};
  const existingObj = typeof existingData === 'string' 
    ? { status: existingData, currentPage: null, notes: null, lastCoveredAt: null }
    : existingData;
  
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
 * Find topic by page number
 */
export function tool_findTopicByPage(sectionId, pageNumber) {
  if (!sectionId || !pageNumber) {
    return { error: 'sectionId and pageNumber are required' };
  }
  
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
export function tool_parseAttendance(transcript, classId, studentNames) {
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
 */
export function tool_navigateTo(destination, options = {}) {
  const { courseId, sectionId } = options;
  
  const routeMap = {
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
    'hod': '/hod-dashboard',
    'hod-dashboard': '/hod-dashboard',
    'admin': '/admin-dashboard',
    'admin-dashboard': '/admin-dashboard',
  };
  
  let path = null;
  let displayName = destination;
  
  const normalizedDest = destination.toLowerCase().trim();
  if (routeMap[normalizedDest]) {
    path = routeMap[normalizedDest];
    displayName = normalizedDest.charAt(0).toUpperCase() + normalizedDest.slice(1);
  }
  else if (sectionId || /\d+[a-z]/i.test(destination)) {
    const sectionMatch = destination.match(/(\d+[a-z])/i);
    const targetSection = sectionId || (sectionMatch ? sectionMatch[1].toUpperCase() : null);
    
    if (targetSection) {
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
  else {
    let matchedCourse = null;
    
    if (courseId) {
      matchedCourse = teacherData.courses.find(c => c.id === courseId);
    }
    
    if (!matchedCourse) {
      const destLower = destination.toLowerCase();
      
      matchedCourse = teacherData.courses.find(course => {
        const nameLower = course.title.toLowerCase();
        const idLower = course.id.toLowerCase();
        
        if (destLower.includes(idLower)) return true;
        if (destLower.includes(nameLower)) return true;
        
        const destWords = destLower.split(/\s+/);
        const nameWords = nameLower.split(/\s+/);
        
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
export function tool_createCourse(subject, grade, title) {
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
export function tool_createSection(courseId, sectionId, schedules) {
  try {
    let resolvedCourseId = courseId;
    if (courseId && !classManagement.findCourseById(courseId)) {
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
export function tool_addStudents(classId, studentsList) {
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
export function tool_getStudents(classId) {
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
export function tool_removeStudent(studentId) {
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
export function tool_deleteCourse(courseId) {
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
export function tool_deleteSection(courseId, sectionId) {
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
export function tool_applyTimetable(scheduleData) {
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
// ATTENDANCE TOOL FUNCTIONS
// ============================================================================

/**
 * Fuzzy match a student name against the student list for a class
 */
export function fuzzyMatchStudentInClass(classId, studentName) {
  const classStudents = classManagement.getStudentsForClass(classId);
  if (!classStudents || classStudents.length === 0) return null;

  const query = studentName.toLowerCase().trim();
  
  let match = classStudents.find(s => s.name.toLowerCase() === query);
  if (match) return match;
  
  match = classStudents.find(s => s.name.toLowerCase().includes(query) || query.includes(s.name.toLowerCase()));
  if (match) return match;
  
  match = classStudents.find(s => {
    const firstName = s.name.split(' ')[0].toLowerCase();
    return firstName === query || query.startsWith(firstName);
  });
  if (match) return match;
  
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
export function tool_markAttendance(classId, studentName, status, date) {
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
    const filtered = logs.filter(l => 
      !(l.studentId === matchedStudent.studentId && l.classId === classId && l.date === attendanceDate)
    );
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
export function tool_markBulkAttendance(classId, status, exceptions, date) {
  try {
    if (!classId) return { success: false, error: 'classId is required' };
    
    const classStudents = classManagement.getStudentsForClass(classId);
    if (!classStudents || classStudents.length === 0) {
      return { success: false, error: `No students found in class "${classId}"` };
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const defaultStatus = (status || 'present').toLowerCase();
    const exceptionList = (exceptions || []).map(e => typeof e === 'string' ? e.toLowerCase() : '');

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
export function tool_getTodayAttendance(classId) {
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
