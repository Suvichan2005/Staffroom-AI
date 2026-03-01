/**
 * Document Parser Service
 * 
 * AI-powered document parsing using Gemini API (via backend proxy)
 * Supports: CSV, Excel, PDF, and image files
 */

import { callAIGenerate, callAIVision } from './aiApiClient.js';

/**
 * Extract text content from various file types
 * @param {File} file - The uploaded file
 * @returns {Promise<{text: string, type: string}>} Extracted text and file type
 */
export async function extractTextFromFile(file) {
  const fileType = getFileType(file);
  
  switch (fileType) {
    case 'csv':
      return { text: await readCSVFile(file), type: 'csv' };
    case 'excel': {
      const text = await readExcelFile(file);
      if (text === null) {
        // Use Gemini vision for Excel files
        return { text: null, type: 'excel', base64: await fileToBase64(file), mimeType: file.type };
      }
      return { text, type: 'excel' };
    }
    case 'pdf': {
      const text = await readPDFFile(file);
      if (text === null) {
        // Use Gemini vision for PDF files
        return { text: null, type: 'pdf', base64: await fileToBase64(file), mimeType: 'application/pdf' };
      }
      return { text, type: 'pdf' };
    }
    case 'image':
      return { text: null, type: 'image', base64: await fileToBase64(file), mimeType: file.type };
    case 'text':
      return { text: await file.text(), type: 'text' };
    default:
      throw new Error(`Unsupported file type: ${file.type}`);
  }
}

/**
 * Determine file type from MIME type or extension
 */
function getFileType(file) {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (mimeType === 'text/csv' || extension === 'csv') return 'csv';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || 
      extension === 'xlsx' || extension === 'xls') return 'excel';
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/')) return 'text';
  
  return 'unknown';
}

/**
 * Read CSV file as text
 */
async function readCSVFile(file) {
  return await file.text();
}

/**
 * Read Excel file - returns null to trigger Gemini vision processing
 * Note: xlsx library could be installed optionally for better text extraction
 */
async function readExcelFile(file) {
  // Excel files need Gemini vision for parsing since xlsx is not bundled
  // Return null to signal we need to use image-based processing
  console.info('Excel file detected - will use Gemini AI for parsing');
  return null;
}

/**
 * Read PDF file - returns null to trigger Gemini vision processing
 * Note: pdfjs-dist could be installed optionally for text extraction
 */
async function readPDFFile(file) {
  // PDF files need Gemini vision for parsing since pdf.js is not bundled
  // Return null to signal we need to use image-based processing
  console.info('PDF file detected - will use Gemini AI for parsing');
  return null;
}

/**
 * Convert file to base64 for image processing
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// JSON EXTRACTION HELPER
// ============================================================================

/**
 * Robustly extract JSON from AI response text
 * Handles markdown code blocks and properly handles braces inside strings
 */
function extractJSON(text) {
  if (!text || typeof text !== 'string') {
    console.warn('extractJSON: Input is empty or not a string');
    return null;
  }
  
  console.log('extractJSON: Input length:', text.length);
  
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  console.log('extractJSON: After cleaning code blocks, length:', cleaned.length);
  
  // Find the first { 
  const startIndex = cleaned.indexOf('{');
  if (startIndex === -1) {
    console.warn('extractJSON: No { found in cleaned text');
    return null;
  }
  
  // String-aware brace matching
  let braceCount = 0;
  let endIndex = -1;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIndex; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    // Only count braces outside of strings
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }
  }
  
  if (endIndex === -1) {
    console.warn('extractJSON: Incomplete JSON - braces never balanced!');
    console.warn('extractJSON: Final brace count:', braceCount);
    console.warn('extractJSON: Last 100 chars:', cleaned.substring(cleaned.length - 100));
    return null;
  }
  
  const jsonStr = cleaned.substring(startIndex, endIndex + 1);
  console.log('extractJSON: Extracted JSON length:', jsonStr.length);
  
  try {
    const result = JSON.parse(jsonStr);
    console.log('extractJSON: Successfully parsed!');
    return result;
  } catch (e) {
    console.warn('extractJSON: Parse failed, trying fixes...', e.message);
    // Try to fix common issues
    try {
      // Fix trailing commas in arrays/objects
      const fixed = jsonStr
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(fixed);
    } catch (e2) {
      console.warn('extractJSON: All parsing attempts failed:', e2.message);
      console.warn('extractJSON: First 200 chars:', jsonStr.substring(0, 200));
      return null;
    }
  }
}

// ============================================================================
// GEMINI API INTEGRATION (via backend proxy)
// ============================================================================

/**
 * Call Gemini API with text prompt (via backend)
 */
async function callGeminiText(prompt, systemPrompt = '') {
  const result = await callAIGenerate({
    prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });
  return result.text || '';
}

/**
 * Call Gemini API with image — vision (via backend)
 */
async function callGeminiVision(prompt, imageBase64, mimeType) {
  const result = await callAIVision({
    prompt,
    imageBase64,
    mimeType,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 25000,
    },
  });
  return result.text || '';
}

// ============================================================================
// TIMETABLE PARSING
// ============================================================================

const TIMETABLE_SYSTEM_PROMPT = `You are a document parser that extracts timetable/schedule information from various formats.
Extract class schedules and return ONLY valid JSON in this exact format:

{
  "success": true,
  "schedules": [
    {
      "classId": "6A",
      "day": "Mon",
      "startTime": "09:00",
      "endTime": "09:45"
    }
  ],
  "errors": []
}

Rules:
- Day must be one of: Sun, Mon, Tue, Wed, Thu, Fri, Sat
- Time must be in 24-hour format: HH:MM
- classId should match the section/class identifier (e.g., "6A", "8B", "Class 6A", "VI", "XII")
- If you cannot parse certain rows, add them to errors array
- If no valid data found, return { "success": false, "schedules": [], "errors": ["No schedule data found"] }`;

/**
 * Parse a timetable document
 * @param {File} file - Uploaded timetable file
 * @returns {Promise<{success: boolean, schedules: Array, errors: string[]}>}
 */
export async function parseTimetableDocument(file) {
  console.group('📋 parseTimetableDocument');
  console.log('File:', file.name, file.type, (file.size / 1024).toFixed(1) + 'KB');
  
  try {
    const extracted = await extractTextFromFile(file);
    console.log('Extracted type:', extracted.type);
    console.log('Has text:', !!extracted.text, extracted.text ? `(${extracted.text.length} chars)` : '');
    if (extracted.text) {
      console.log('Text preview:', extracted.text.substring(0, 300) + '...');
    }
    
    let response;
    
    if (extracted.type === 'image' || !extracted.text) {
      console.log('Using: Gemini Vision API');
      const base64 = extracted.base64 || await fileToBase64(file);
      const prompt = `${TIMETABLE_SYSTEM_PROMPT}\n\nExtract the timetable/schedule data from this document:`;
      response = await callGeminiVision(prompt, base64, file.type);
    } else {
      console.log('Using: Gemini Text API');
      const prompt = `${TIMETABLE_SYSTEM_PROMPT}\n\nExtract the timetable/schedule data from this content:\n\n${extracted.text}`;
      response = await callGeminiText(prompt);
    }
    
    console.log('📥 RAW AI RESPONSE:');
    console.log(response);
    
    // Parse JSON response using robust extractor
    const parsed = extractJSON(response);
    console.log('📦 PARSED JSON:', parsed);
    
    if (parsed) {
      const result = {
        success: parsed.success !== false,
        schedules: parsed.schedules || [],
        errors: parsed.errors || [],
      };
      console.log('✅ Result:', result);
      console.groupEnd();
      return result;
    }
    
    console.warn('❌ No valid JSON found in response');
    console.groupEnd();
    return { success: false, schedules: [], errors: ['Failed to parse AI response - no valid JSON found'] };
  } catch (error) {
    console.error('❌ Timetable parsing error:', error);
    console.groupEnd();
    return { success: false, schedules: [], errors: [error.message] };
  }
}

// ============================================================================
// STUDENT LIST PARSING
// ============================================================================

const STUDENT_LIST_SYSTEM_PROMPT = `You are a document parser that extracts student information from various formats (CSV, Excel, PDF, images of printed lists).
Extract student data and return ONLY valid JSON in this exact format:

{
  "success": true,
  "students": [
    {
      "name": "Student Name",
      "rollNo": 1,
      "email": "student@school.edu"
    }
  ],
  "classId": "6A",
  "errors": []
}

Rules:
- name is required, rollNo and email are optional
- If rollNo is not provided, use the row number
- If email is not in the document, leave it as empty string ""
- classId should be extracted if present in the document header or title
- If classId cannot be determined, set to null
- Handle various formats: numbered lists, tables, comma-separated, etc.
- If you cannot parse certain rows, add them to errors array`;

/**
 * Parse a student list document
 * @param {File} file - Uploaded student list file
 * @param {string} [defaultClassId] - Default class ID if not found in document
 * @returns {Promise<{success: boolean, students: Array, classId: string|null, errors: string[]}>}
 */
export async function parseStudentListDocument(file, defaultClassId = null) {
  console.group('👥 parseStudentListDocument');
  console.log('File:', file.name, file.type, (file.size / 1024).toFixed(1) + 'KB');
  console.log('Default classId:', defaultClassId);
  
  try {
    const extracted = await extractTextFromFile(file);
    console.log('Extracted type:', extracted.type);
    console.log('Has text:', !!extracted.text, extracted.text ? `(${extracted.text.length} chars)` : '');
    if (extracted.text) {
      console.log('Text preview:', extracted.text.substring(0, 300) + '...');
    }
    
    let response;
    
    if (extracted.type === 'image' || !extracted.text) {
      console.log('Using: Gemini Vision API');
      const base64 = extracted.base64 || await fileToBase64(file);
      const prompt = `${STUDENT_LIST_SYSTEM_PROMPT}\n\nExtract the student list from this document:`;
      response = await callGeminiVision(prompt, base64, file.type);
    } else {
      console.log('Using: Gemini Text API');
      const prompt = `${STUDENT_LIST_SYSTEM_PROMPT}\n\nExtract the student list from this content:\n\n${extracted.text}`;
      response = await callGeminiText(prompt);
    }
    
    console.log('📥 RAW AI RESPONSE:');
    console.log(response);
    
    // Parse JSON response using robust extractor
    const parsed = extractJSON(response);
    console.log('📦 PARSED JSON:', parsed);
    
    if (parsed) {
      const result = {
        success: parsed.success !== false,
        students: parsed.students || [],
        classId: parsed.classId || defaultClassId,
        errors: parsed.errors || [],
      };
      console.log('✅ Result:', result);
      console.groupEnd();
      return result;
    }
    
    console.warn('❌ No valid JSON found in response');
    console.groupEnd();
    return { success: false, students: [], classId: defaultClassId, errors: ['Failed to parse AI response - no valid JSON found'] };
  } catch (error) {
    console.error('❌ Student list parsing error:', error);
    console.groupEnd();
    return { success: false, students: [], classId: defaultClassId, errors: [error.message] };
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate parsed schedule data
 */
export function validateScheduleData(schedules) {
  const validDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  
  return schedules.filter(schedule => {
    if (!schedule.classId || typeof schedule.classId !== 'string') return false;
    if (!validDays.includes(schedule.day)) return false;
    if (!timeRegex.test(schedule.startTime)) return false;
    if (!timeRegex.test(schedule.endTime)) return false;
    return true;
  });
}

/**
 * Validate parsed student data
 */
export function validateStudentData(students) {
  return students.filter(student => {
    if (!student.name || typeof student.name !== 'string') return false;
    if (student.name.trim().length === 0) return false;
    return true;
  }).map((student, index) => ({
    ...student,
    name: student.name.trim(),
    rollNo: student.rollNo || index + 1,
    email: student.email || '',
  }));
}

/**
 * Get supported file types for upload
 */
export function getSupportedFileTypes() {
  return {
    timetable: [
      '.csv',
      '.xlsx',
      '.xls',
      '.pdf',
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
    ],
    studentList: [
      '.csv',
      '.xlsx',
      '.xls',
      '.pdf',
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
      '.txt',
    ],
  };
}

/**
 * Get accept string for file input
 */
export function getAcceptString(type) {
  const types = getSupportedFileTypes()[type] || [];
  return types.join(',');
}
