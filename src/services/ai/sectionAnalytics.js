/**
 * Section Analytics
 * 
 * Gemini-powered smart suggestions and dashboard insights.
 * Builds rich context from student data, attendance, grades, and progress,
 * then sends compact prompts for actionable teacher recommendations.
 */

import { 
  teacherData,
  getSyllabusByRef,
  normalizeSectionProgress,
  loadStoredProgress,
  students,
  attendanceLogs,
  assignments,
} from '../../data/dummyData';
import { callGemini } from './callGemini';

/**
 * Build COMPLETE detailed context for a specific section
 */
function buildDetailedSectionContext(sectionId) {
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
  
  const sectionStudents = students.filter(s => s.classId === classId);
  
  const syllabus = getSyllabusByRef(course.syllabusRef);
  const baseProgress = syllabus ? normalizeSectionProgress(classId, syllabus) : {};
  const storedProgress = loadStoredProgress(classId, {});
  const effectiveProgress = { ...baseProgress, ...storedProgress };
  
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
          
          const dayAttendance = attendanceLogs.filter(log => 
            log.classId === classId && log.date === coveredDate
          );
          const presentCount = dayAttendance.filter(a => a.status === 'present').length;
          const totalStudents = sectionStudents.length;
          const attendancePercent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
          
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
          
          if (attendancePercent < 70) {
            topicsWithLowAttendance.push(topicEntry);
          }
        }
      }
    }
  }
  
  topicHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
  
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
  
  const studentDetails = sectionStudents.map(student => {
    const studentLogs = attendanceLogs.filter(log => log.studentId === student.studentId);
    const presentDays = studentLogs.filter(a => a.status === 'present');
    const absentDays = studentLogs.filter(a => a.status === 'absent');
    const attendancePercent = studentLogs.length > 0 
      ? Math.round((presentDays.length / studentLogs.length) * 100) 
      : 100;
    
    const recentAbsences = absentDays
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(a => a.date);
    
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
    topicHistory: topicHistory.slice(0, 10),
    topicsWithLowAttendance,
    otherSections,
    pendingAssignments
  };
}

/**
 * Generate smart suggestions for a specific section using Gemini
 */
export async function generateSectionSuggestions(sectionId) {
  const context = buildDetailedSectionContext(sectionId);
  
  if (!context) {
    console.error('Could not build context for section:', sectionId);
    return getFallbackSuggestions({ sectionName: sectionId, atRiskStudents: [], currentTopic: null, nextTopic: null, otherSections: [], progressPercent: 0, topicsWithLowAttendance: [], pendingAssignments: [] });
  }
  
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
    
    let jsonStr = response.trim();
    jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    
    const startIdx = jsonStr.indexOf('[');
    const endIdx = jsonStr.lastIndexOf(']');
    
    if (startIdx !== -1 && endIdx > startIdx) {
      jsonStr = jsonStr.slice(startIdx, endIdx + 1);
      
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
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
  
  if (context.atRiskStudents?.length > 0) {
    const riskStudents = context.atRiskStudents;
    const summaryNames = riskStudents.slice(0, 2).map(s => `${s.name} (${s.attendancePercent}%)`).join(', ');
    const moreCount = riskStudents.length > 2 ? ` +${riskStudents.length - 2} more` : '';
    
    suggestions.push({
      title: "Students Need Attention",
      summary: `${riskStudents.length} student${riskStudents.length > 1 ? 's' : ''} flagged for follow-up`,
      detail: `Contact parents/guardians: ${summaryNames}${moreCount}. Low attendance may indicate issues.`,
      color: "red",
      icon: "users",
      tableData: riskStudents.map(s => ({
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
 * Try to fix truncated JSON arrays
 */
function fixTruncatedJson(jsonStr) {
  try {
    JSON.parse(jsonStr);
    return jsonStr;
  } catch {
    // Try to close the array
    let fixed = jsonStr.trim();
    // Remove trailing comma if present
    fixed = fixed.replace(/,\s*$/, '');
    // Close any open strings/objects/arrays
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += '}';
    }
    if (!fixed.endsWith(']')) {
      fixed += ']';
    }
    try {
      JSON.parse(fixed);
      return fixed;
    } catch {
      return null;
    }
  }
}

/**
 * Extract partial JSON suggestion objects from messy text
 */
function extractPartialSuggestions(text) {
  const suggestions = [];
  const objPattern = /\{[^{}]*"title"\s*:\s*"([^"]+)"[^{}]*"detail"\s*:\s*"([^"]+)"[^{}]*\}/g;
  let match;
  while ((match = objPattern.exec(text)) !== null && suggestions.length < 5) {
    const colorMatch = match[0].match(/"color"\s*:\s*"(red|yellow|green)"/);
    const iconMatch = match[0].match(/"icon"\s*:\s*"([^"]+)"/);
    suggestions.push({
      title: match[1],
      detail: match[2],
      color: colorMatch ? colorMatch[1] : 'yellow',
      icon: iconMatch ? iconMatch[1] : 'book'
    });
  }
  return suggestions;
}

/**
 * Generate aggregated dashboard insights from all sections
 */
export async function generateDashboardInsights() {
  const allSectionContexts = [];
  
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
  
  const behindSections = allSectionContexts.filter(c => c.progressPercent < avgProgress - 15);
  const aheadSections = allSectionContexts.filter(c => c.progressPercent > avgProgress + 15);
  
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
    
    let jsonStr = response;
    
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\s*/g, '');
    }
    
    const jsonMatch = jsonStr.match(/\[\s*\{[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\}\s*)*\]/);
    if (jsonMatch) {
      try {
        const insights = JSON.parse(jsonMatch[0]);
        return Array.isArray(insights) ? insights.slice(0, 4) : [];
      } catch (parseErr) {
        const fixedJson = fixTruncatedJson(jsonMatch[0]);
        if (fixedJson) {
          const insights = JSON.parse(fixedJson);
          return Array.isArray(insights) ? insights.slice(0, 4) : [];
        }
      }
    }
    
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
  
  if (lowAttendanceTopics.length > 0) {
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
