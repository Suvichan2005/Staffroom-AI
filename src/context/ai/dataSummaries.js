/**
 * AIContext — Data summary formatters & clarification handler
 *
 * Pure functions that build markdown-formatted summaries from teacherData.
 * Used by the AIProvider for quick-response commands and clarification flow.
 */

import {
  teacherData,
  syllabusList,
  getSyllabusByRef,
  getSectionProgress,
  calculateTopicProgressPercent,
  normalizeSectionProgress,
  loadStoredProgress,
  persistProgress,
  students,
  attendanceLogs,
  assignments,
} from '../../data/dummyData';

import { getProgressBar } from './helpers';

// ─── Progress Summary ────────────────────────────────────────────

export function getProgressSummary(sectionId = null) {
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

// ─── Attendance Summary ──────────────────────────────────────────

export function getAttendanceSummary(sectionId = null) {
  let response = '📋 **Attendance Summary**\n\n';

  const allSections = teacherData.courses.flatMap(c => c.sections.map(s => s.id));
  const sectionsToCheck = sectionId ? [sectionId.toUpperCase()] : allSections;

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

// ─── Assignment Summary ──────────────────────────────────────────

export function getAssignmentSummary(sectionId = null) {
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

// ─── Student Insights ────────────────────────────────────────────

export function getStudentInsights() {
  let response = '🎯 **Students Needing Attention**\n\n';

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
      studentsAtRisk.push({ ...student, issues, attendancePercent });
    }
  });

  if (studentsAtRisk.length === 0) {
    return response + '✅ All students are on track! No immediate concerns.';
  }

  studentsAtRisk.sort((a, b) => a.attendancePercent - b.attendancePercent);

  studentsAtRisk.slice(0, 5).forEach((student, i) => {
    response += `${i + 1}. **${student.name}** (${student.classId})\n`;
    response += `   ${student.issues.join(' | ')}\n`;
  });

  response += '\n*Would you like me to draft a parent communication for any of these students?*';

  return response;
}

// ─── Next Topic Suggestion ───────────────────────────────────────

export function getNextTopicSuggestion(sectionId = null, getContextFromURL = null) {
  let response = '💡 **Next Topic Suggestion**\n\n';

  if (!sectionId && getContextFromURL) {
    const urlContext = getContextFromURL();
    sectionId = urlContext.sectionId;
  }

  if (!sectionId) {
    const allSections = teacherData.courses.flatMap(c =>
      c.sections.map(s => `${s.id} (${c.title})`)
    );
    return response + `Which section would you like suggestions for?\n\nAvailable: ${allSections.join(', ')}\n\n*Try: "What next in 8B?" or "Suggest next topic for 6A"*`;
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
    const availableSections = teacherData.courses.flatMap(c => c.sections.map(s => s.id)).join(', ');
    return response + `Section "${sectionId}" not found.\n\nAvailable sections: ${availableSections}`;
  }

  const syllabus = getSyllabusByRef(targetCourse.syllabusRef);
  if (!syllabus) {
    return response + `Could not find syllabus for ${targetCourse.title}.`;
  }

  const baseProgress = normalizeSectionProgress(syllabus, targetSection.progress);
  const storedProgress = loadStoredProgress(targetSection.id, baseProgress);

  let nextTopic = null;
  let nextChapter = null;
  let lastCompletedTopic = null;

  for (const chapter of syllabus.chapters) {
    const chapterProgress = storedProgress[chapter.index]?.topics || {};
    for (const topic of chapter.subTopics || []) {
      const status = chapterProgress[topic.index] || 'not-started';
      if (status === 'done') {
        lastCompletedTopic = topic;
      } else if (!nextTopic) {
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

  const upcomingExam = targetSection.exams?.find(e => new Date(e.date) > new Date());
  if (upcomingExam) {
    const daysUntil = Math.ceil((new Date(upcomingExam.date) - new Date()) / (1000 * 60 * 60 * 24));
    response += `⚠️ **Upcoming Exam**: ${upcomingExam.type} in ${daysUntil} days (covers up to Chapter ${upcomingExam.syllabusUpTo})\n\n`;
  }

  response += `*Say "Mark ${nextTopic.title} complete in ${targetSection.id}" when done!*`;

  return response;
}

// ─── Clarification Handler ───────────────────────────────────────

/**
 * Handle user response to a clarification request.
 * User can respond with just a section name to complete a pending action.
 */
export async function handleClarificationResponse(userResponse, pending) {
  const lower = userResponse.toLowerCase().trim();

  const allSectionIds = teacherData.courses.flatMap(c => c.sections.map(s => s.id));
  const sectionPattern = new RegExp(`^(${allSectionIds.join('|')})$`, 'i');
  const sectionMatch = lower.match(sectionPattern);

  const prefixedMatch = lower.match(/^(?:section|class|in)?\s*([a-z0-9]+)$/i);
  const matchedSection = sectionMatch
    ? sectionMatch[1].toUpperCase()
    : (prefixedMatch && allSectionIds.some(s => s.toUpperCase() === prefixedMatch[1].toUpperCase()))
      ? prefixedMatch[1].toUpperCase()
      : null;

  if (matchedSection && pending.type === 'progress_update') {
    const { parsed, matchedTopic, matchedChapter } = pending;

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

    const chapter = syllabus.chapters.find(ch => ch.index === parsed.chapterIndex);
    const topic = chapter?.subTopics?.find(t => t.index === parsed.topicIndex);

    if (!topic) {
      return {
        handled: true,
        response: `❌ "${matchedTopic || 'That topic'}" doesn't exist in ${course.title}.\n\n` +
          `Did you mean a different subject? The topic was found in: **${parsed.matchedCourse || 'another course'}**`
      };
    }

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

  return { handled: false };
}
