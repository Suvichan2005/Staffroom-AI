/**
 * Onboarding Agent Service
 * 
 * A Gemini-powered AI agent that intelligently analyses uploaded documents
 * (timetables, student lists, teacher mappings, syllabi) during onboarding.
 * Uses function calling so the model returns structured data through tool calls
 * rather than free-form text.
 */

import { extractTextFromFile, getAcceptString as _getAcceptString } from './documentParserService.js';
import { callAIAgent } from './aiApiClient.js';

// ============================================================================
// AGENT SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are an intelligent onboarding assistant for Staffroom AI, an education management platform.

Your job is to analyse uploaded documents and extract structured data to help set up teachers and schools.
Documents may include weekly timetables, student rosters, teacher-class mappings, syllabi, or mixed content.

You MUST call one or more of the provided functions to report your findings. Never respond with plain text only.

Analysis guidelines:
- Be thorough but accurate — only extract data you can confidently identify.
- If a document contains multiple types of data (e.g., a timetable AND student names), call the appropriate function for EACH type.
- Handle diverse formats: printed schedules (photographed), Excel exports, CSVs, PDFs, handwritten notes, tables, etc.
- Normalise day names to exactly one of: Mon, Tue, Wed, Thu, Fri, Sat, Sun.
- Normalise times to 24-hour HH:MM format.
- For class/section identifiers, preserve the original naming but clean up (e.g., "Class 6 Sec A" → "6A").
- If data is ambiguous, make reasonable assumptions and document them in the "notes" field.
- If the document is unrecognisable or irrelevant, call report_unrecognized.`;

// ============================================================================
// TOOL DECLARATIONS  (Gemini functionDeclarations format)
// ============================================================================

const TOOL_DECLARATIONS = [
  {
    name: 'extract_timetable',
    description:
      'Extract class timetable / schedule data. Use when the document contains weekly schedules, period timings, or class-time mappings for a teacher.',
    parameters: {
      type: 'OBJECT',
      properties: {
        classes: {
          type: 'ARRAY',
          description: 'Array of classes/sections found in the timetable',
          items: {
            type: 'OBJECT',
            properties: {
              className: {
                type: 'STRING',
                description: 'Class/section name e.g. "8A", "XII-B"',
              },
              subject: {
                type: 'STRING',
                description: 'Subject taught in this class (if identifiable)',
              },
              grade: {
                type: 'STRING',
                description: 'Grade / year level e.g. "8", "12"',
              },
              schedules: {
                type: 'ARRAY',
                description: 'Weekly schedule slots for this class',
                items: {
                  type: 'OBJECT',
                  properties: {
                    day: {
                      type: 'STRING',
                      description: 'Day of week: Mon/Tue/Wed/Thu/Fri/Sat/Sun',
                    },
                    startTime: {
                      type: 'STRING',
                      description: '24-hour start time HH:MM',
                    },
                    endTime: {
                      type: 'STRING',
                      description: '24-hour end time HH:MM',
                    },
                  },
                },
              },
            },
          },
        },
        notes: {
          type: 'STRING',
          description: 'Assumptions made or ambiguities encountered',
        },
      },
      required: ['classes'],
    },
  },
  {
    name: 'extract_student_list',
    description:
      'Extract student roster data. Use when the document contains student names, roll numbers, or enrolment lists for one or more classes.',
    parameters: {
      type: 'OBJECT',
      properties: {
        className: {
          type: 'STRING',
          description:
            'Class/section these students belong to (if identifiable)',
        },
        students: {
          type: 'ARRAY',
          description: 'Array of students extracted',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'Full student name' },
              rollNo: {
                type: 'INTEGER',
                description: 'Roll number or serial number',
              },
              email: {
                type: 'STRING',
                description: 'Student email if available',
              },
            },
          },
        },
        notes: {
          type: 'STRING',
          description: 'Any assumptions or issues',
        },
      },
      required: ['students'],
    },
  },
  {
    name: 'extract_teacher_mapping',
    description:
      'Extract teacher-to-class assignments. Use when the document maps teachers to classes and/or subjects they teach.',
    parameters: {
      type: 'OBJECT',
      properties: {
        mappings: {
          type: 'ARRAY',
          description: 'Array of teacher → class/subject mappings',
          items: {
            type: 'OBJECT',
            properties: {
              teacherName: {
                type: 'STRING',
                description: 'Teacher full name',
              },
              teacherEmail: {
                type: 'STRING',
                description: 'Teacher email if available',
              },
              subject: { type: 'STRING', description: 'Subject taught' },
              classes: {
                type: 'ARRAY',
                description: 'List of class/section names assigned',
                items: { type: 'STRING' },
              },
            },
          },
        },
        notes: {
          type: 'STRING',
          description: 'Any assumptions or issues',
        },
      },
      required: ['mappings'],
    },
  },
  {
    name: 'extract_syllabus',
    description:
      'Extract course syllabus / curriculum data. Use when the document contains chapter listings, topic outlines, book indexes, or course content.',
    parameters: {
      type: 'OBJECT',
      properties: {
        subject: { type: 'STRING', description: 'Subject name' },
        grade: {
          type: 'STRING',
          description: 'Grade level if identifiable',
        },
        chapters: {
          type: 'ARRAY',
          description: 'Chapters / units extracted',
          items: {
            type: 'OBJECT',
            properties: {
              chapterNumber: {
                type: 'INTEGER',
                description: 'Chapter / unit number',
              },
              title: { type: 'STRING', description: 'Chapter title' },
              topics: {
                type: 'ARRAY',
                description: 'Sub-topics within this chapter',
                items: { type: 'STRING' },
              },
              estimatedPeriods: {
                type: 'INTEGER',
                description: 'Estimated teaching periods needed',
              },
            },
          },
        },
        notes: {
          type: 'STRING',
          description: 'Any assumptions or issues',
        },
      },
      required: ['chapters'],
    },
  },
  {
    name: 'report_unrecognized',
    description:
      'Report that the document does not contain recognisable educational data (not a timetable, student list, teacher mapping, or syllabus).',
    parameters: {
      type: 'OBJECT',
      properties: {
        documentDescription: {
          type: 'STRING',
          description: 'What the document appears to contain',
        },
        suggestion: {
          type: 'STRING',
          description: 'What the user should upload instead',
        },
      },
      required: ['documentDescription'],
    },
  },
];

// ============================================================================
// HINT TEXTS  — added to the user message when a specific doc type is expected
// ============================================================================

const HINT_TEXTS = {
  extract_timetable:
    'This document is expected to be a weekly timetable or class schedule.',
  extract_student_list:
    'This document is expected to be a student roster or enrolment list.',
  extract_teacher_mapping:
    'This document is expected to map teachers to their assigned classes/subjects.',
  extract_syllabus:
    'This document is expected to be a course syllabus, curriculum outline, or book index.',
};

// ============================================================================
// HELPERS
// ============================================================================

/** Convert a File to base64 (data portion only). */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// GEMINI API CALL (with function calling)
// ============================================================================

/**
 * Call the backend agent endpoint with function-calling tool declarations.
 *
 * @param {Object[]} contents  – Gemini `contents` array
 * @returns {{ functionCalls: {name:string, args:Object}[], text: string }}
 */
async function callGeminiAgent(contents) {
  console.group('🤖 OnboardingAgent → Backend Proxy');

  const result = await callAIAgent({
    contents,
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    toolConfig: {
      functionCallingConfig: {
        mode: 'ANY', // force the model to call at least one function
      },
    },
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 16384,
    },
  });

  const functionCalls = result.functionCalls || [];
  const text = result.text || '';

  console.log(
    'Tool calls:',
    functionCalls.length,
    functionCalls.map((f) => f.name),
  );
  if (text) console.log('Text:', text.substring(0, 200));
  console.groupEnd();

  return { functionCalls, text };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * @typedef {'timetable'|'student_list'|'teacher_mapping'|'syllabus'|'unrecognized'|'multi'} ExtractionType
 *
 * @typedef {Object} OnboardingResult
 * @property {boolean}        success
 * @property {ExtractionType} type
 * @property {Object}         data   – shape depends on type
 * @property {string}         [notes]
 * @property {string}         [error]
 */

/**
 * Process any document through the onboarding agent.
 *
 * The agent will auto-detect the document type and return structured data
 * via Gemini function calling.
 *
 * @param {File}     file                – The uploaded file
 * @param {string}   [hint]              – Optional hint: 'extract_timetable' | 'extract_student_list' | …
 * @param {Function} [onProgress]        – Progress callback: (stage: string) => void
 * @returns {Promise<OnboardingResult>}
 */
export async function processOnboardingDocument(
  file,
  hint = null,
  onProgress = null,
) {
  console.group('📋 OnboardingAgent: processDocument');
  console.log(
    'File:',
    file.name,
    file.type,
    `${(file.size / 1024).toFixed(1)} KB`,
  );
  console.log('Hint:', hint || 'auto-detect');

  try {
    // ── Stage 1: read file ────────────────────────────────────────────
    onProgress?.('reading');
    const extracted = await extractTextFromFile(file);
    console.log(
      'Extracted type:',
      extracted.type,
      '| has text:',
      !!extracted.text,
    );

    // ── Stage 2: build Gemini user-parts ──────────────────────────────
    onProgress?.('analyzing');
    const userParts = [];

    const hintSuffix =
      hint && HINT_TEXTS[hint]
        ? `\n${HINT_TEXTS[hint]} Extract that data primarily, but also report any other data types you find.`
        : '';

    if (extracted.text) {
      userParts.push({
        text: `Analyze this document and extract all relevant educational data.${hintSuffix}\n\n${extracted.text}`,
      });
    }

    // add vision data when available
    if (extracted.base64) {
      userParts.push({
        text: extracted.text
          ? 'The document also has a visual component — use it if the text above is incomplete:'
          : `Analyze this document image and extract all relevant educational data.${hintSuffix}`,
      });
      userParts.push({
        inline_data: {
          mime_type: extracted.mimeType || file.type,
          data: extracted.base64,
        },
      });
    } else if (!extracted.text) {
      // neither text nor base64 from extractTextFromFile — fallback to raw base64
      const base64 = await fileToBase64(file);
      userParts.push({
        text: `Analyze this document and extract all relevant educational data.${hintSuffix}`,
      });
      userParts.push({
        inline_data: { mime_type: file.type, data: base64 },
      });
    }

    const contents = [{ role: 'user', parts: userParts }];

    // ── Stage 3: call Gemini agent ────────────────────────────────────
    onProgress?.('extracting');
    const { functionCalls, text } = await callGeminiAgent(contents);

    if (!functionCalls || functionCalls.length === 0) {
      console.warn('No function calls returned');
      console.groupEnd();
      return {
        success: false,
        type: 'unrecognized',
        data: {},
        error:
          text ||
          'The AI could not extract structured data from this document.',
      };
    }

    // ── Stage 4: map function calls to result objects ─────────────────
    onProgress?.('finalizing');

    const TYPE_MAP = {
      extract_timetable: 'timetable',
      extract_student_list: 'student_list',
      extract_teacher_mapping: 'teacher_mapping',
      extract_syllabus: 'syllabus',
      report_unrecognized: 'unrecognized',
    };

    const results = functionCalls.map((fc) => ({
      type: TYPE_MAP[fc.name] || 'unknown',
      data: fc.args,
    }));

    if (results.length === 1) {
      const r = results[0];
      console.log('✅ Single result:', r.type);
      console.groupEnd();
      return {
        success: r.type !== 'unrecognized',
        type: r.type,
        data: r.data,
        notes: r.data?.notes || '',
      };
    }

    // multiple extractions from the same document
    console.log(
      '✅ Multi result:',
      results.map((r) => r.type),
    );
    console.groupEnd();
    return {
      success: true,
      type: 'multi',
      data: { extractions: results },
      notes: results
        .map((r) => r.data?.notes)
        .filter(Boolean)
        .join('; '),
    };
  } catch (error) {
    console.error('❌ Agent error:', error);
    console.groupEnd();
    return {
      success: false,
      type: 'unrecognized',
      data: {},
      error: error.message,
    };
  }
}

// ── Convenience wrappers ────────────────────────────────────────────────────

/** Process a timetable / schedule document. */
export function processScheduleDocument(file, onProgress) {
  return processOnboardingDocument(file, 'extract_timetable', onProgress);
}

/** Process a student list / roster document. */
export function processStudentDocument(file, onProgress) {
  return processOnboardingDocument(file, 'extract_student_list', onProgress);
}

/** Process a teacher → class mapping document. */
export function processTeacherMappingDocument(file, onProgress) {
  return processOnboardingDocument(file, 'extract_teacher_mapping', onProgress);
}

/** Process a syllabus / curriculum document. */
export function processSyllabusDocument(file, onProgress) {
  return processOnboardingDocument(file, 'extract_syllabus', onProgress);
}

// Re-export getAcceptString for convenience
export const getAcceptString = _getAcceptString;
