/**
 * Unified Tools for Global Chat (Text + Voice)
 * 
 * This module provides a single source of truth for tools used by both
 * text chat and voice chat agents. Both agents now use the same multi-step
 * tool calling approach.
 */

import { 
  toolFunctions, 
  chatToolDeclarations,
  toolDeclarations 
} from './aiService';

/**
 * Convert tool declarations from aiService format to Gemini Live API format
 * Gemini Live uses slightly different schema format (TYPE in caps, OBJECT/STRING/NUMBER/ARRAY)
 */
function convertToLiveApiFormat(declarations) {
  return [{
    functionDeclarations: declarations.map(decl => ({
      name: decl.name,
      description: decl.description,
      parameters: convertParametersToLiveFormat(decl.parameters)
    }))
  }];
}

function convertParametersToLiveFormat(params) {
  if (!params) return { type: 'OBJECT', properties: {}, required: [] };
  
  const converted = {
    type: params.type?.toUpperCase() || 'OBJECT',
    required: params.required || []
  };
  
  if (params.properties) {
    converted.properties = {};
    for (const [key, value] of Object.entries(params.properties)) {
      converted.properties[key] = {
        type: value.type?.toUpperCase() || 'STRING',
        description: value.description
      };
      if (value.enum) {
        converted.properties[key].enum = value.enum;
      }
      if (value.items) {
        converted.properties[key].items = { type: value.items.type?.toUpperCase() || 'STRING' };
      }
    }
  }
  
  return converted;
}

// Tool declarations for Gemini Live API (voice)
export const VOICE_TOOLS = convertToLiveApiFormat(chatToolDeclarations);

// Re-export for backwards compatibility
export const ATTENDANCE_TOOLS = convertToLiveApiFormat([
  chatToolDeclarations.find(t => t.name === 'parseAttendance')
].filter(Boolean));

export const SYLLABUS_TOOLS = convertToLiveApiFormat([
  chatToolDeclarations.find(t => t.name === 'searchTopic'),
  chatToolDeclarations.find(t => t.name === 'updateProgress'),
  chatToolDeclarations.find(t => t.name === 'getProgress'),
  chatToolDeclarations.find(t => t.name === 'getNextTopic'),
  chatToolDeclarations.find(t => t.name === 'findTopicByPage')
].filter(Boolean));

export const COMBINED_TOOLS = VOICE_TOOLS;

/**
 * Get tools based on context
 * @param {string} context - 'attendance' | 'syllabus' | 'combined' | 'voice'
 * @returns {Array} Tool definitions in Gemini Live API format
 */
export function getToolsByContext(context = 'combined') {
  switch (context) {
    case 'attendance':
      return ATTENDANCE_TOOLS;
    case 'syllabus':
      return SYLLABUS_TOOLS;
    case 'voice':
    case 'combined':
    default:
      return VOICE_TOOLS;
  }
}

/**
 * Execute a tool call from the voice agent
 * Uses the same tool functions as the text chat agent
 * 
 * @param {Object} toolCall - Tool call from Gemini Live { name, args, id }
 * @param {Function} onAction - Callback to notify UI of action
 * @returns {Object} Result of the tool execution
 */
export function handleChatToolCall(toolCall, onAction) {
  const { name, args, id } = toolCall;

  console.log(`[Voice Tool] Executing: ${name}`, args);

  const action = {
    type: name,
    args,
    id,
    timestamp: new Date().toLocaleTimeString(),
  };

  let result = null;

  try {
    switch (name) {
      case 'getAvailableCourses':
        result = toolFunctions.getAvailableCourses();
        action.display = `Found ${result.length} courses`;
        break;
        
      case 'getSyllabus':
        result = toolFunctions.getSyllabus(args.courseId, args.subject, args.sectionId);
        action.display = result ? `Loaded syllabus: ${result.subject} Grade ${result.grade}` : 'Syllabus not found';
        break;
        
      case 'searchTopic':
        result = toolFunctions.searchTopic(args.searchQuery, args.filterSubject, args.filterSectionId);
        if (result.length > 0) {
          action.display = `Found topic: ${result[0].topicTitle} (Chapter ${result[0].chapterIndex})`;
        } else {
          action.display = `No matches for "${args.searchQuery}"`;
        }
        break;
        
      case 'getProgress':
        result = toolFunctions.getProgress(args.sectionId);
        if (result.sections.length > 0) {
          const section = result.sections[0];
          action.display = `${section.courseTitle} - ${section.sectionId}: ${section.overallPercent}% complete`;
        } else {
          action.display = 'No progress data found';
        }
        break;
        
      case 'getNextTopic':
        result = toolFunctions.getNextTopic(args.sectionId);
        if (result.nextTopic) {
          action.display = `Next topic: ${result.nextTopic} (${result.nextChapter})`;
        } else if (result.error) {
          action.display = result.error;
        } else {
          action.display = 'All topics completed!';
        }
        break;
        
      case 'getSchedule':
        result = toolFunctions.getSchedule(args.daysAhead);
        action.display = `Today: ${result.today.length} classes, Upcoming: ${result.upcoming.length}`;
        break;
        
      case 'getAttendance':
        result = toolFunctions.getAttendance(args.sectionId);
        if (result.sections?.length > 0) {
          const avg = result.sections.reduce((sum, s) => sum + s.percent, 0) / result.sections.length;
          action.display = `Average attendance: ${Math.round(avg)}%`;
        } else {
          action.display = 'No attendance data';
        }
        break;
        
      case 'getAssignments':
        result = toolFunctions.getAssignments(args.sectionId);
        action.display = `${result.upcoming?.length || 0} upcoming, ${result.pastDue?.length || 0} past due`;
        break;
        
      case 'getStudentsAtRisk':
        result = toolFunctions.getStudentsAtRisk();
        action.display = `${result.length} students need attention`;
        break;
        
      case 'updateProgress':
        result = toolFunctions.updateProgress(
          args.sectionId, 
          args.chapterIndex, 
          args.topicIndex, 
          args.status || 'complete',
          { currentPage: args.currentPage, notes: args.notes }
        );
        if (result.success) {
          action.display = `✅ Updated "${result.topicTitle}" to ${result.newStatus}`;
        } else {
          action.display = `❌ ${result.error}`;
        }
        break;
        
      case 'parseAttendance':
        result = toolFunctions.parseAttendance(args.transcript, args.classId, args.studentNames);
        action.display = `Processing attendance for ${args.classId}`;
        break;
        
      case 'findTopicByPage':
        result = toolFunctions.findTopicByPage(args.sectionId, args.pageNumber);
        if (result.found) {
          action.display = `Page ${args.pageNumber} is in "${result.topicTitle}" (Chapter ${result.chapterIndex})`;
        } else {
          action.display = result.error || `No topic found for page ${args.pageNumber}`;
        }
        break;
        
      case 'navigateTo':
        result = toolFunctions.navigateTo(args.destination, { 
          courseId: args.courseId, 
          sectionId: args.sectionId 
        });
        if (result.success) {
          action.display = `🔗 ${result.message}`;
          action.navigate = result.path; // Signal to UI to navigate
        } else {
          action.display = `❌ ${result.error}`;
        }
        break;
        
      default:
        result = { error: `Unknown tool: ${name}` };
        action.display = `Unknown tool: ${name}`;
    }
  } catch (error) {
    console.error(`[Voice Tool] Error in ${name}:`, error);
    result = { error: error.message };
    action.display = `Error: ${error.message}`;
  }

  action.result = result;

  if (onAction) {
    onAction(action);
  }

  return { action, result };
}

/**
 * Format tool result for display to user
 * @param {string} toolName - Name of the tool
 * @param {Object} result - Result from tool execution
 * @returns {string} Human-readable summary
 */
export function formatToolResult(toolName, result) {
  if (!result) return 'No result';
  if (result.error) return `Error: ${result.error}`;
  
  switch (toolName) {
    case 'searchTopic':
      if (Array.isArray(result) && result.length > 0) {
        return `Found: "${result[0].topicTitle}" in ${result[0].chapterTitle} (${result[0].courseTitle})`;
      }
      return 'No matching topics found';
      
    case 'updateProgress':
      if (result.success) {
        return `Updated "${result.topicTitle}" in ${result.sectionId} to ${result.newStatus}`;
      }
      return result.error || 'Update failed';
      
    case 'getProgress':
      if (result.sections?.length > 0) {
        return result.sections.map(s => `${s.sectionId}: ${s.overallPercent}%`).join(', ');
      }
      return 'No progress data';
      
    case 'getNextTopic':
      if (result.nextTopic) {
        return `Next: ${result.nextTopic} (${result.nextChapter})`;
      }
      return result.allComplete ? 'All topics completed!' : (result.error || 'Unknown');
      
    case 'findTopicByPage':
      if (result.found) {
        return `Page ${result.pageNumber} is in "${result.topicTitle}" (Chapter ${result.chapterIndex}, Topic ${result.topicIndex})`;
      }
      return result.error || 'Page not found in any topic';
      
    default:
      return JSON.stringify(result).slice(0, 200);
  }
}

// Export tool functions for direct access
export { toolFunctions, chatToolDeclarations };

