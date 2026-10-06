/**
 * Tool Declarations & Function Map
 * 
 * Maps tool names to executor functions and defines the JSON-schema
 * declarations sent to Gemini for function calling.
 */

import {
  tool_getAvailableCourses,
  tool_getSyllabus,
  tool_searchTopic,
  tool_getProgress,
  tool_getNextTopic,
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
  tool_markAttendance,
  tool_markBulkAttendance,
  tool_getTodayAttendance,
} from './toolExecutors';

// Tool execution map
export const toolFunctions = {
  getAvailableCourses: tool_getAvailableCourses,
  getSyllabus: tool_getSyllabus,
  searchTopic: tool_searchTopic,
  getProgress: tool_getProgress,
  getNextTopic: tool_getNextTopic,
  getSchedule: tool_getSchedule,
  getAttendance: tool_getAttendance,
  getAssignments: tool_getAssignments,
  getStudentsAtRisk: tool_getStudentsAtRisk,
  updateProgress: tool_updateProgress,
  findTopicByPage: tool_findTopicByPage,
  parseAttendance: tool_parseAttendance,
  navigateTo: tool_navigateTo,
  // Class management tools
  createCourse: tool_createCourse,
  createSection: tool_createSection,
  addStudents: tool_addStudents,
  getStudents: tool_getStudents,
  removeStudent: tool_removeStudent,
  deleteCourse: tool_deleteCourse,
  deleteSection: tool_deleteSection,
  applyTimetable: tool_applyTimetable,
  // Attendance tools (global)
  markAttendance: tool_markAttendance,
  markBulkAttendance: tool_markBulkAttendance,
  getTodayAttendance: tool_getTodayAttendance,
};

// Tool declarations for Gemini (voice agent subset)
export const toolDeclarations = [
  {
    name: "getAvailableCourses",
    description: "Get a list of all available courses with their sections. Use this first to understand what courses exist.",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    name: "getSyllabus", 
    description: "Get the full syllabus for a course including all chapters and topics. You can search by courseId, subject name (like 'history' or 'geography'), or sectionId (like '8B' or '6A').",
    parameters: {
      type: "object",
      properties: {
        courseId: { type: "string", description: "The course ID (e.g., 'geo6', 'hist8')" },
        subject: { type: "string", description: "The subject name (e.g., 'history', 'geography')" },
        sectionId: { type: "string", description: "The section ID (e.g., '8B', '6A')" }
      },
      required: []
    }
  },
  {
    name: "searchTopic",
    description: "Search for a topic across syllabi. Use filterSubject or filterSectionId to narrow down results. Always use filters when user mentions a specific subject (history/geography) or section (8B/6A) to avoid wrong matches.",
    parameters: {
      type: "object",
      properties: {
        searchQuery: { type: "string", description: "The topic name or keywords to search for" },
        filterSubject: { type: "string", description: "Optional: Filter by subject (e.g., 'history', 'geography'). ALWAYS use this if user mentioned a subject." },
        filterSectionId: { type: "string", description: "Optional: Filter by section (e.g., '8B', '6A'). ALWAYS use this if user mentioned a section." }
      },
      required: ["searchQuery"]
    }
  },
  {
    name: "parseAttendance",
    description: "Parse a voice command to mark attendance. Returns a list of students to mark as present or absent based on the transcript.",
    parameters: {
      type: "object",
      properties: {
        transcript: { type: "string", description: "The voice transcript text (e.g. 'Mark Rahul and Priya absent')" },
        classId: { type: "string", description: "The class ID (e.g. '6A')" },
        studentNames: { type: "array", items: { type: "string" }, description: "List of student names in the class to fuzzy match against" }
      },
      required: ["transcript", "classId", "studentNames"]
    }
  }
];

// Extended tool declarations for chat agent
export const chatToolDeclarations = [
  ...toolDeclarations,
  {
    name: "getProgress",
    description: "Get syllabus progress summary for a section or all sections. Shows completion percentage per chapter.",
    parameters: {
      type: "object",
      properties: {
        sectionId: { type: "string", description: "Optional section ID (e.g., '8B', '6A'). If omitted, returns progress for all sections." }
      },
      required: []
    }
  },
  {
    name: "getNextTopic",
    description: "Get the next topic to teach for a specific section. Returns the first incomplete topic in the syllabus.",
    parameters: {
      type: "object",
      properties: {
        sectionId: { type: "string", description: "The section ID (e.g., '8B', '6A'). REQUIRED." }
      },
      required: ["sectionId"]
    }
  },
  {
    name: "getSchedule",
    description: "Get the teacher's schedule including today's classes and upcoming sessions.",
    parameters: {
      type: "object",
      properties: {
        daysAhead: { type: "number", description: "Number of days to look ahead. Default is 7." }
      },
      required: []
    }
  },
  {
    name: "getAttendance",
    description: "Get attendance summary for a section or all sections. Shows overall percentage and students below 75%.",
    parameters: {
      type: "object",
      properties: {
        sectionId: { type: "string", description: "Optional section ID. If omitted, returns attendance for all sections." }
      },
      required: []
    }
  },
  {
    name: "getAssignments",
    description: "Get assignments summary including upcoming and past due assignments.",
    parameters: {
      type: "object",
      properties: {
        sectionId: { type: "string", description: "Optional section ID to filter assignments." }
      },
      required: []
    }
  },
  {
    name: "getStudentsAtRisk",
    description: "Get list of students who need attention due to low attendance or missing assignments.",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    name: "updateProgress",
    description: "Update the progress status for a specific topic. Use this when the teacher says they finished/completed a topic. Can also set the current page (for ongoing topics) and add notes.",
    parameters: {
      type: "object",
      properties: {
        sectionId: { type: "string", description: "The section ID (e.g., '8B', '6A'). REQUIRED." },
        chapterIndex: { type: "number", description: "The chapter number (1-based index). REQUIRED." },
        topicIndex: { type: "number", description: "The topic number within the chapter (1-based index). REQUIRED." },
        status: { type: "string", description: "The new status: 'complete', 'ongoing', or 'pending'. Default is 'complete'." },
        currentPage: { type: "number", description: "The page number where teaching left off (only for ongoing topics)." },
        notes: { type: "string", description: "Teacher's notes about the topic." }
      },
      required: ["sectionId", "chapterIndex", "topicIndex"]
    }
  },
  {
    name: "findTopicByPage",
    description: "Find which topic contains a specific page number in a syllabus. Use this when the teacher mentions a page number to identify the topic.",
    parameters: {
      type: "object",
      properties: {
        sectionId: { type: "string", description: "The section ID (e.g., '8B', '6A'). REQUIRED." },
        pageNumber: { type: "number", description: "The page number to search for. REQUIRED." }
      },
      required: ["sectionId", "pageNumber"]
    }
  },
  {
    name: "navigateTo",
    description: "Navigate the user to a different page in the app. Use this when the teacher asks to 'open', 'show', 'go to', or 'take me to' a page.",
    parameters: {
      type: "object",
      properties: {
        destination: { type: "string", description: "The page or destination to navigate to." },
        courseId: { type: "string", description: "Optional course ID if navigating to a specific course." },
        sectionId: { type: "string", description: "Optional section ID if navigating to a specific class." }
      },
      required: ["destination"]
    }
  },
  // ── Class Management Tools ──
  {
    name: "createCourse",
    description: "Create a new course/subject for the teacher.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string", description: "The subject name. REQUIRED." },
        grade: { type: "string", description: "The grade level. REQUIRED." },
        title: { type: "string", description: "Optional custom title." }
      },
      required: ["subject", "grade"]
    }
  },
  {
    name: "createSection",
    description: "Create a new section/class within an existing course.",
    parameters: {
      type: "object",
      properties: {
        courseId: { type: "string", description: "The ID of the course. REQUIRED." },
        sectionId: { type: "string", description: "The section identifier (e.g., '10A'). REQUIRED." },
        schedules: { type: "array", items: { type: "string" }, description: "Optional schedule strings." }
      },
      required: ["courseId", "sectionId"]
    }
  },
  {
    name: "addStudents",
    description: "Add students to a class/section.",
    parameters: {
      type: "object",
      properties: {
        classId: { type: "string", description: "The section/class ID. REQUIRED." },
        students: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Student's full name. REQUIRED." },
              rollNo: { type: "number", description: "Roll number (optional)" },
              email: { type: "string", description: "Email address (optional)" }
            },
            required: ["name"]
          },
          description: "Array of student objects. REQUIRED."
        }
      },
      required: ["classId", "students"]
    }
  },
  {
    name: "getStudents",
    description: "Get the list of all students in a class/section.",
    parameters: {
      type: "object",
      properties: {
        classId: { type: "string", description: "The section/class ID. REQUIRED." }
      },
      required: ["classId"]
    }
  },
  {
    name: "removeStudent",
    description: "Remove a student from a class. Only works for custom-added students.",
    parameters: {
      type: "object",
      properties: {
        studentId: { type: "string", description: "The student's unique ID. REQUIRED." }
      },
      required: ["studentId"]
    }
  },
  {
    name: "deleteCourse",
    description: "Delete an entire course and all its sections, students, and syllabus. Destructive and cannot be undone.",
    parameters: {
      type: "object",
      properties: {
        courseId: { type: "string", description: "The course ID to delete. REQUIRED." }
      },
      required: ["courseId"]
    }
  },
  {
    name: "deleteSection",
    description: "Delete a section from a course, including its students.",
    parameters: {
      type: "object",
      properties: {
        courseId: { type: "string", description: "The parent course ID. REQUIRED." },
        sectionId: { type: "string", description: "The section ID to delete. REQUIRED." }
      },
      required: ["courseId", "sectionId"]
    }
  },
  {
    name: "applyTimetable",
    description: "Apply timetable/schedule data to sections.",
    parameters: {
      type: "object",
      properties: {
        scheduleData: {
          type: "array",
          items: {
            type: "object",
            properties: {
              classId: { type: "string", description: "Section ID" },
              day: { type: "string", description: "Day abbreviation: Sun, Mon, Tue, Wed, Thu, Fri, Sat" },
              startTime: { type: "string", description: "Start time in HH:MM format" },
              endTime: { type: "string", description: "End time in HH:MM format" }
            },
            required: ["classId", "day", "startTime", "endTime"]
          },
          description: "Array of schedule entries. REQUIRED."
        }
      },
      required: ["scheduleData"]
    }
  },
  // ── Attendance Tools ──
  {
    name: "markAttendance",
    description: "Mark a single student as present or absent for a class. Uses fuzzy name matching.",
    parameters: {
      type: "object",
      properties: {
        classId: { type: "string", description: "The class/section ID. REQUIRED." },
        studentName: { type: "string", description: "The student's name (fuzzy matched). REQUIRED." },
        status: { type: "string", description: "Attendance status: 'present' or 'absent'. Default is 'present'.", enum: ["present", "absent"] },
        date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today." }
      },
      required: ["classId", "studentName"]
    }
  },
  {
    name: "markBulkAttendance",
    description: "Mark all students in a class as present or absent at once. Optionally exclude specific students.",
    parameters: {
      type: "object",
      properties: {
        classId: { type: "string", description: "The class/section ID. REQUIRED." },
        status: { type: "string", description: "Default status: 'present' or 'absent'.", enum: ["present", "absent"] },
        exceptions: { type: "array", items: { type: "string" }, description: "Names of students who get the OPPOSITE status." },
        date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today." }
      },
      required: ["classId"]
    }
  },
  {
    name: "getTodayAttendance",
    description: "Get today's attendance status for all students in a class.",
    parameters: {
      type: "object",
      properties: {
        classId: { type: "string", description: "The class/section ID. REQUIRED." }
      },
      required: ["classId"]
    }
  }
];
