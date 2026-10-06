/**
 * Chat Processor
 * 
 * Main LLM chat agent with multi-turn function calling.
 * Handles the conversation loop: user message → LLM → tool calls → LLM → response.
 */

import { teacherData } from '../../data/dummyData';
import { logGeminiCall, logAction } from '../activityLogger';
import { callAIGenerate } from '../aiApiClient';
import { isRateLimitError } from './callGemini';
import { toolFunctions, chatToolDeclarations } from './toolDeclarations';
import {
  getTemporalContext,
  tool_getNextTopic,
  tool_getProgress,
  tool_getSchedule,
  tool_getStudentsAtRisk,
  tool_searchTopic,
  tool_updateProgress,
} from './toolExecutors';

/**
 * Process a chat message using LLM with function calling
 * This is the main entry point for the AI chat assistant
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
  
  logAction('chat_message', { 
    messagePreview: text.substring(0, 100),
    hasContext: !!context.urlContext,
    historyLength: conversationHistory.length 
  });

  try {
    // ── Build conversation history ──────────────────────────────
    let validHistory = conversationHistory.slice(-10);
    const firstUserIndex = validHistory.findIndex(m => m.role === 'user');
    if (firstUserIndex > 0) validHistory = validHistory.slice(firstUserIndex);
    else if (firstUserIndex === -1) validHistory = [];
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
5. For greetings like "hi", "hello", "hii": respond warmly in 1 short sentence, then ask what they want to do next (do NOT output a generic capability list unless asked)
6. For short follow-ups like "why", "how", "what", "which one": explain your previous answer using conversation context instead of resetting to a menu
7. Only show a full "I can help with..." capability menu if the user explicitly asks for help/capabilities (e.g., "what can you do?")

IMAGE & FILE CAPABILITIES:
- You CAN see and analyze images (whiteboards, textbook pages, student work, charts)
- You CAN read text files (CSV, TXT, JSON) attached by the user
- When an image is attached, describe what you see and provide helpful analysis

EXAMPLE RESPONSES:
- "In section 6A, you're currently on **Plains and Valleys** (pages 29-36). You left off at page 32."
- "Your current topic in ${context.urlContext?.sectionId || '[section]'} is **[Topic Name]** in chapter **[Chapter]**. Continue from page [X]."
- "Hey! Good to see you. Want me to check next topic, today's schedule, or student risks?"
- "Because your last message didn't specify a section, I defaulted to available sections. Tell me a section (e.g., 8B) and I'll be specific."`;

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
    const allMessages = [...historyMessages, { role: 'user', parts: userParts }];

    while (result.functionCalls && result.functionCalls.length > 0 && iterations < maxIterations) {
      iterations++;
      console.log(`[Chat] Iteration ${iterations}: ${result.functionCalls.length} function call(s)`);

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

      allMessages.push({
        role: 'model',
        parts: result.functionCalls.map(fc => ({ functionCall: fc })),
      });
      allMessages.push({
        role: 'user',
        parts: fnResponseParts,
      });

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
  
  if ((lower.includes('mark') || lower.includes('done') || lower.includes('complete')) && 
      /\b(it|this|that)\b/.test(lower)) {
    const recentAssistantMsgs = conversationHistory
      .filter(m => m.role === 'assistant')
      .slice(-3);
    
    for (const msg of recentAssistantMsgs.reverse()) {
      const topicMatch = msg.content.match(/→\s*\*\*([^*]+)\*\*/);
      const sectionMatch = msg.content.match(/Section:\s*(\w+)|for\s+(\w+):|Next for (\w+)/i);
      
      if (topicMatch && sectionMatch) {
        const topic = topicMatch[1];
        const section = (sectionMatch[1] || sectionMatch[2] || sectionMatch[3]).toUpperCase();
        
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
  
  const sectionMatch = lower.match(/\b(6a|6c|8a|8b)\b/i);
  
  if (sectionMatch) {
    const sectionId = sectionMatch[1].toUpperCase();
    
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
  
  const sections = teacherData.courses.flatMap(c => c.sections.map(s => s.id)).join(', ');
  return `I can help with:\n• "What's next in 8B?"\n• "Show progress for 6A"\n• "What's my schedule today?"\n• "Which students need attention?"\n\nAvailable sections: ${sections}`;
}
