/**
 * Voice Parsing
 * 
 * LLM-powered parsers for voice transcript → syllabus-update intent
 * and voice transcript → attendance records.
 */

import { teacherData } from '../../data/dummyData';
import { callAIGenerate } from '../aiApiClient';
import { callGemini } from './callGemini';
import {
  tool_getAvailableCourses,
  tool_getSyllabus,
  tool_searchTopic,
} from './toolExecutors';

/**
 * Parse voice transcript to extract syllabus update intent
 * LLM-FIRST approach with function calling for intelligent context gathering
 * 
 * @param {string} transcript - "I finished Chapter 2, Topic 1 in 6A Geography"
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

  try {
    const courses = tool_getAvailableCourses();
    
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
    
    const jsonMatches = finalText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (!jsonMatches || jsonMatches.length === 0) {
      console.warn('No JSON in LLM response, using fallback');
      return simpleFallbackParse(text, currentCourseId, currentSectionId);
    }
    
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
    
    if (parsedResults.length > 1) {
      console.log('[LLM] Batch update detected:', parsedResults.length, 'topics');
      return {
        action: 'batch_update',
        updates: parsedResults,
        _source: 'llm-function-calling-batch'
      };
    }
    
    if (parsedResults.length === 1) {
      const parsed = parsedResults[0];
      
      if (!parsed.chapterIndex || !parsed.topicIndex || parsed.action === 'unclear') {
        console.warn('LLM returned unclear result, trying fallback');
        const fallback = simpleFallbackParse(text, currentCourseId, currentSectionId);
        if (fallback.chapterIndex && fallback.topicIndex) {
          return { ...fallback, _source: 'fallback-after-llm' };
        }
      }
      
      return parsed;
    }
    
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
  
  const allSections = teacherData.courses.flatMap(c => c.sections.map(s => s.id));
  const sectionPattern = new RegExp(`\\b(${allSections.join('|')})\\b`, 'i');
  const sectionMatch = lower.match(sectionPattern);
  const sectionId = sectionMatch ? sectionMatch[1].toUpperCase() : currentSectionId;
  
  const subjectMatch = lower.match(/\b(history|geography|science|math|english)\b/i);
  const subject = subjectMatch ? subjectMatch[1].toLowerCase() : null;
  
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
 */
export async function parseAttendanceVoice(transcript, classId, studentList) {
  const text = (transcript || '').trim();

  if (!text) {
    return { error: 'Empty transcript' };
  }

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

  try {
    const response = await callAIGenerate({
      prompt,
      systemInstruction: 'You are a helpful AI that parses attendance voice commands. Return ONLY valid JSON, no markdown.',
      generationConfig: { temperature: 0.1 }
    });

    const responseText = response.text || '';
    console.log('[parseAttendanceVoice] Response:', responseText);

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
    const updates = {};

    const findStudent = (entry) => {
      if (entry.rollNo !== undefined && entry.rollNo !== null) {
        const byRoll = studentList.find(s => s.rollNo === entry.rollNo);
        if (byRoll) return byRoll;
      }
      
      const name = (entry.name || entry).toString().toLowerCase();
      
      const rollMatch = name.match(/roll\s*(?:number|no|num|#)?\s*(\d+)/i);
      if (rollMatch) {
        const num = parseInt(rollMatch[1], 10);
        const byRoll = studentList.find(s => s.rollNo === num);
        if (byRoll) return byRoll;
      }
      
      return studentList.find(s => s.name.toLowerCase().includes(name) || name.includes(s.name.toLowerCase()));
    };

    (json.present || []).forEach(entry => {
      const student = findStudent(entry);
      if (student) updates[student.studentId] = true;
    });

    (json.absent || []).forEach(entry => {
      const student = findStudent(entry);
      if (student) updates[student.studentId] = false;
    });

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
