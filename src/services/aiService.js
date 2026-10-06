/**
 * AI Service — Barrel Re-export
 * 
 * All functionality has been split into focused modules under src/services/ai/.
 * This file re-exports everything to maintain backward compatibility.
 */

export { callGemini, isRateLimitError, sleep } from './ai/callGemini';

export {
  tool_getAvailableCourses,
  tool_getSyllabus,
  tool_searchTopic,
  tool_getProgress,
  tool_getNextTopic,
  getTemporalContext,
  tool_getSchedule,
  tool_getAttendance,
  tool_getAssignments,
  tool_getStudentsAtRisk,
  tool_updateProgress,
  tool_findTopicByPage,
  tool_parseAttendance,
  tool_navigateTo,
  tool_createCourse,
  tool_createSection,
  tool_addStudents,
  tool_getStudents,
  tool_removeStudent,
  tool_deleteCourse,
  tool_deleteSection,
  tool_applyTimetable,
  fuzzyMatchStudentInClass,
  tool_markAttendance,
  tool_markBulkAttendance,
  tool_getTodayAttendance,
} from './ai/toolExecutors';

export {
  toolFunctions,
  toolDeclarations,
  chatToolDeclarations,
} from './ai/toolDeclarations';

export {
  parseVoiceTranscript,
  parseAttendanceVoice,
} from './ai/voiceParsing';

export {
  generateQuiz,
  generateAssignment,
  analyzeStudentPerformance,
  generateDailyBriefing,
  suggestNextTopic,
  detectAttendanceRisks,
  getMockResponse,
  getMockQuiz,
  getMockAssignment,
  getMockStudentAnalysis,
  getMockBriefing,
} from './ai/generators';

export {
  processChat,
} from './ai/chatProcessor';

export {
  generateSectionSuggestions,
  generateDashboardInsights,
} from './ai/sectionAnalytics';

// Re-import for default export object
import { processChat } from './ai/chatProcessor';
import { parseVoiceTranscript, parseAttendanceVoice } from './ai/voiceParsing';
import {
  generateQuiz, generateAssignment, analyzeStudentPerformance,
  generateDailyBriefing, suggestNextTopic, detectAttendanceRisks,
} from './ai/generators';

// Default export for backward compatibility
export default {
  processChat,
  parseVoiceTranscript,
  parseAttendanceVoice,
  generateQuiz,
  generateAssignment,
  analyzeStudentPerformance,
  generateDailyBriefing,
  suggestNextTopic,
  detectAttendanceRisks,
};
