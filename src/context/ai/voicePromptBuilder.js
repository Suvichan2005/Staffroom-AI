/**
 * AIContext — Voice system prompt builder
 * Builds a context-aware system prompt for Gemini Live voice sessions.
 */

import {
  teacherData,
  getSyllabusByRef,
  normalizeSectionProgress,
  loadStoredProgress,
  getUpcomingSessions,
  students,
} from '../../data/dummyData';

/**
 * Build a full system prompt for voice chat, incorporating:
 * - Current course/section context from URL + explicit aiContext
 * - Syllabus progress (ongoing/next topic)
 * - Student names for attendance
 * - Temporal context (today's schedule, current/next class)
 * - Recent conversation history for continuity
 *
 * @param {{ currentCourseId?: string, currentSectionId?: string }} aiContext
 * @param {() => { courseId, sectionId, courseName }} getContextFromURL
 * @param {Array} messages — recent chat messages
 * @returns {string} system prompt
 */
export function buildVoiceSystemPrompt(aiContext, getContextFromURL, messages) {
  const urlContext = getContextFromURL();
  const currentCourseId = aiContext.currentCourseId || urlContext.courseId;
  const currentSectionId = aiContext.currentSectionId || urlContext.sectionId;

  // ── Syllabus context ──────────────────────────────────────────
  let syllabusContext = '';
  if (currentCourseId && teacherData) {
    const course = teacherData.courses.find(c => c.id === currentCourseId);
    if (course) {
      const syllabus = getSyllabusByRef(course.syllabusRef);
      const section = course.sections.find(s => s.id === currentSectionId) || course.sections[0];

      if (syllabus && section) {
        const baseProgress = normalizeSectionProgress(syllabus, section.progress || {});
        const currentProgress = loadStoredProgress(section.id, baseProgress);

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

  // ── Student names ─────────────────────────────────────────────
  const studentNames = students && students.length > 0
    ? `\nCurrent class students: ${students.map(s => s.name || s.firstName).join(', ')}`
    : '';

  // ── Recent conversation history ───────────────────────────────
  const recentHistory = messages
    .slice(-10)
    .filter(m => m.role !== 'welcome' && m.content)
    .map(m => `${m.role === 'user' ? 'Teacher' : 'AI'}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`)
    .join('\n');

  const conversationContext = recentHistory
    ? `\n\nRECENT CONVERSATION HISTORY (for context):\n${recentHistory}\n\nUse this context to understand references like "it", "that topic", etc.`
    : '';

  // ── Available sections ────────────────────────────────────────
  const availableSections = teacherData.courses
    .flatMap(c => c.sections.map(s => `${s.id} (${c.title})`))
    .join(', ');

  // ── Temporal context ──────────────────────────────────────────
  const sessions = getUpcomingSessions(teacherData, 1);
  const now = new Date();
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

  // ── Current page context ──────────────────────────────────────
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

  // ── Assemble the full prompt ──────────────────────────────────
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
}
