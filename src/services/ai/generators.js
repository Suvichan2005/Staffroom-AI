/**
 * AI Content Generators
 * 
 * Functions that call the LLM to generate educational content:
 * quizzes, assignments, student analyses, briefings, topic suggestions,
 * attendance risk detection, and mock fallbacks.
 */

import { callGemini } from './callGemini';

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generate quiz questions for a chapter
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
    const response = await callGemini(prompt, true);
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

// ============================================================================
// MOCK RESPONSES (for testing without API key)
// ============================================================================

export function getMockResponse(prompt) {
  if (prompt.includes('quiz')) return JSON.stringify(getMockQuiz());
  if (prompt.includes('assignment')) return JSON.stringify(getMockAssignment());
  if (prompt.includes('student')) return JSON.stringify(getMockStudentAnalysis());
  if (prompt.includes('briefing')) return JSON.stringify(getMockBriefing());
  return '{ "status": "mock", "message": "AI feature demo mode" }';
}

export function getMockQuiz(count = 5) {
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

export function getMockAssignment() {
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

export function getMockStudentAnalysis(studentData) {
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

export function getMockBriefing() {
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
