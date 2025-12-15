import { loadUserState, saveUserState, resetUserNamespace, isUserInitialized, markUserInitialized } from "../utils/userScopedStorage";

// Re-export for backward compatibility
export { resetUserNamespace as resetNamespace };

// CENTRAL SYLLABUS (Admin/HOD controlled)
export const syllabusList = [
  {
    id: "syll_geo6",
    subject: "Geography",
    grade: 6,
    chapters: [
      {
        index: 1,
        title: "The Earth and the Solar System",
        subTopics: [
          { index: 1, title: "The Solar System Overview", pageFrom: 1, pageTo: 6 },
          { index: 2, title: "Planets and Orbits", pageFrom: 7, pageTo: 14 },
          { index: 3, title: "Rotation and Revolution", pageFrom: 15, pageTo: 20 },
        ],
      },
      {
        index: 2,
        title: "Landforms of the Earth",
        subTopics: [
          { index: 1, title: "Mountains and Plateaus", pageFrom: 21, pageTo: 28 },
          { index: 2, title: "Plains and Valleys", pageFrom: 29, pageTo: 36 },
          { index: 3, title: "Rivers and Deltas", pageFrom: 37, pageTo: 44 },
        ],
      },
      {
        index: 3,
        title: "Climate and Weather",
        subTopics: [
          { index: 1, title: "Weather vs Climate", pageFrom: 45, pageTo: 49 },
          { index: 2, title: "Temperature and Rainfall", pageFrom: 50, pageTo: 56 },
          { index: 3, title: "Wind and Pressure", pageFrom: 57, pageTo: 64 },
        ],
      },
    ],
  },
  {
    id: "syll_hist8",
    subject: "History",
    grade: 8,
    chapters: [
      {
        index: 1,
        title: "The Modern World Emerges",
        subTopics: [
          { index: 1, title: "Industrial Revolution", pageFrom: 1, pageTo: 8 },
          { index: 2, title: "Enlightenment", pageFrom: 9, pageTo: 15 },
          { index: 3, title: "Nation States", pageFrom: 16, pageTo: 22 },
        ],
      },
      {
        index: 2,
        title: "Colonialism and Indian Resistance",
        subTopics: [
          { index: 1, title: "Company Rule", pageFrom: 23, pageTo: 30 },
          { index: 2, title: "Revolt of 1857", pageFrom: 31, pageTo: 36 },
          { index: 3, title: "Social Reformers", pageFrom: 37, pageTo: 44 },
        ],
      },
      {
        index: 3,
        title: "National Movements",
        subTopics: [
          { index: 1, title: "INC and Early Politics", pageFrom: 45, pageTo: 51 },
          { index: 2, title: "Gandhian Era", pageFrom: 52, pageTo: 60 },
          { index: 3, title: "Towards Independence", pageFrom: 61, pageTo: 68 },
        ],
      },
    ],
  },
];

// TEACHER DATA (per-teacher, with per-section progress mapping)
export const teacherData = {
  id: "T001",
  name: "Teacher",
  courses: [
    {
      id: "geo6",
      title: "Grade 6 Geography",
      imageUrl: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&auto=format&fit=crop&q=60",
      syllabusRef: "syll_geo6",
      sections: [
        {
          id: "6A",
          schedules: ["Sat 0:00–23:45","Sun 0:00–23:45","Mon 0:00–23:45","Tue 0:00–23:45","Wed 0:00–23:45","Thu 0:00–23:45","Fri 0:00–23:45","Mon 09:00–09:45", "Thu 11:00–11:45"],
          progress: {
            1: { topics: { 
              1: { status: "done", currentPage: null, notes: null, startedAt: "2025-11-01T09:00:00Z", completedAt: "2025-11-01T09:45:00Z", lastCoveredAt: "2025-11-01T10:00:00Z" },
              2: { status: "done", currentPage: null, notes: null, startedAt: "2025-11-03T09:00:00Z", completedAt: "2025-11-03T09:40:00Z", lastCoveredAt: "2025-11-03T10:00:00Z" },
              3: { status: "done", currentPage: null, notes: "Students understood well", startedAt: "2025-11-05T09:00:00Z", completedAt: "2025-11-05T09:45:00Z", lastCoveredAt: "2025-11-05T10:00:00Z" }
            } },
            2: { topics: { 
              1: { status: "done", currentPage: null, notes: null, startedAt: "2025-11-07T09:00:00Z", completedAt: "2025-11-07T09:45:00Z", lastCoveredAt: "2025-11-07T10:00:00Z" },
              2: { status: "ongoing", currentPage: 32, notes: "Covered basic valley formations", startedAt: "2025-11-10T09:00:00Z", completedAt: null, lastCoveredAt: "2025-11-10T10:00:00Z" },
              3: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null }
            } },
            3: { topics: { 
              1: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null },
              2: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null },
              3: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null }
            } }
          },
          exams: [ { date: "2025-11-20", type: "Unit Test", syllabusUpTo: 2 } ]
        },
        {
          id: "6C",
          schedules: ["Tue 10:00–10:45", "Fri 09:00–09:45"],
          progress: {
            1: { topics: { 
              1: { status: "done", currentPage: null, notes: null, startedAt: "2025-11-01T10:00:00Z", completedAt: "2025-11-01T10:40:00Z", lastCoveredAt: "2025-11-01T10:00:00Z" },
              2: { status: "done", currentPage: null, notes: null, startedAt: "2025-11-03T10:00:00Z", completedAt: "2025-11-03T10:45:00Z", lastCoveredAt: "2025-11-03T10:00:00Z" },
              3: { status: "done", currentPage: null, notes: null, startedAt: "2025-11-05T10:00:00Z", completedAt: "2025-11-05T10:45:00Z", lastCoveredAt: "2025-11-05T10:00:00Z" }
            } },
            2: { topics: { 
              1: { status: "done", currentPage: null, notes: null, startedAt: "2025-11-07T10:00:00Z", completedAt: "2025-11-07T10:45:00Z", lastCoveredAt: "2025-11-07T10:00:00Z" },
              2: { status: "done", currentPage: null, notes: null, startedAt: "2025-11-08T10:00:00Z", completedAt: "2025-11-08T10:45:00Z", lastCoveredAt: "2025-11-08T10:00:00Z" },
              3: { status: "done", currentPage: null, notes: null, startedAt: "2025-11-09T10:00:00Z", completedAt: "2025-11-09T10:40:00Z", lastCoveredAt: "2025-11-09T10:00:00Z" }
            } },
            3: { topics: { 
              1: { status: "ongoing", currentPage: 62, notes: "Starting climate zones", startedAt: "2025-11-11T10:00:00Z", completedAt: null, lastCoveredAt: "2025-11-11T10:00:00Z" },
              2: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null },
              3: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null }
            } }
          },
          exams: [ { date: "2025-11-22", type: "Unit Test", syllabusUpTo: 3 } ]
        },
      ],
    },
    {
      id: "hist8",
      title: "Grade 8 History",
      imageUrl: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1200&auto=format&fit=crop&q=60",
      syllabusRef: "syll_hist8",
      sections: [
        {
          id: "8A",
          schedules: ["Mon 12:00–12:45", "Wed 09:00–09:45"],
          progress: {
            1: { topics: { 
              1: { status: "ongoing", currentPage: 18, notes: "Covering pre-colonial era", startedAt: "2025-11-10T12:00:00Z", completedAt: null, lastCoveredAt: "2025-11-10T12:00:00Z" },
              2: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null },
              3: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null }
            } },
            2: { topics: { 
              1: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null },
              2: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null },
              3: { status: "not-started", currentPage: null, notes: null, startedAt: null, completedAt: null, lastCoveredAt: null }
            } },
            3: { topics: { 
              1: { status: "not-started", currentPage: null, notes: null, lastCoveredAt: null },
              2: { status: "not-started", currentPage: null, notes: null, lastCoveredAt: null },
              3: { status: "not-started", currentPage: null, notes: null, lastCoveredAt: null }
            } }
          },
          exams: [ { date: "2025-11-25", type: "Mid Term", syllabusUpTo: 1 } ]
        },
        {
          id: "8B",
          schedules: ["Tue 11:00–11:45", "Thu 10:00–10:45"],
          progress: {
            1: { topics: { 
              1: { status: "done", currentPage: null, notes: null, lastCoveredAt: "2025-11-01T11:00:00Z" },
              2: { status: "done", currentPage: null, notes: null, lastCoveredAt: "2025-11-03T11:00:00Z" },
              3: { status: "done", currentPage: null, notes: "Good discussion on reforms", lastCoveredAt: "2025-11-05T11:00:00Z" }
            } },
            2: { topics: { 
              1: { status: "done", currentPage: null, notes: null, lastCoveredAt: "2025-11-07T11:00:00Z" },
              2: { status: "done", currentPage: null, notes: null, lastCoveredAt: "2025-11-08T11:00:00Z" },
              3: { status: "done", currentPage: null, notes: null, lastCoveredAt: "2025-11-09T11:00:00Z" }
            } },
            3: { topics: { 
              1: { status: "ongoing", currentPage: 95, notes: "Enlightenment philosophers", lastCoveredAt: "2025-11-11T11:00:00Z" },
              2: { status: "not-started", currentPage: null, notes: null, lastCoveredAt: null },
              3: { status: "not-started", currentPage: null, notes: null, lastCoveredAt: null }
            } }
          },
          exams: [ { date: "2025-11-26", type: "Mid Term", syllabusUpTo: 2 } ]
        },
      ],
    },
  ],
};

export const teacherDirectory = [
  { id: "T001", name: "Teacher", role: "Teacher", subject: "Geography", contact: "teacher@school.edu" },
  { id: "T002", name: "Ms. Gupta", role: "Teacher", subject: "History", contact: "gupta@school.demo" },
  { id: "T003", name: "Ms. Rao", role: "HOD", subject: "Geography", contact: "rao@school.demo" },
  { id: "T004", name: "Mr. Sharma", role: "IT Admin", subject: "Operations", contact: "sharma@school.demo" }
];

export const departments = [
  {
    id: "dep_geo",
    name: "Geography",
    hodId: "T003",
    teachers: ["T001"],
    classes: ["6A", "6C"],
    grades: [6],
  },
  {
    id: "dep_hist",
    name: "History",
    hodId: "T002",
    teachers: ["T002"],
    classes: ["8A", "8B"],
    grades: [8],
  }
];

export const schoolStats = {
  totalTeachers: 28,
  totalStudents: 1240,
  totalClasses: 36,
  activeSessionsToday: 14,
  attendanceTrend: [92, 94, 91, 89, 93, 95, 94],
  syllabusCoverage: {
    geo6: 68,
    hist8: 54,
  },
  systemLogs: [
    { id: "log_1", time: "08:45", detail: "8B attendance synced." },
    { id: "log_2", time: "09:10", detail: "Timetable CSV uploaded by IT Admin." },
    { id: "log_3", time: "09:45", detail: "Syllabus updated by Ms. Gupta." },
    { id: "log_4", time: "10:20", detail: "New resource shared: Landforms Worksheet." },
    { id: "log_5", time: "11:05", detail: "Assessment created: Quiz on Climate." }
  ]
};

export const syllabusHeatmap = [
  { courseId: "geo6", sectionId: "6A", chapterIndex: 1, completion: 100 },
  { courseId: "geo6", sectionId: "6A", chapterIndex: 2, completion: 65 },
  { courseId: "geo6", sectionId: "6A", chapterIndex: 3, completion: 20 },
  { courseId: "geo6", sectionId: "6C", chapterIndex: 1, completion: 100 },
  { courseId: "geo6", sectionId: "6C", chapterIndex: 2, completion: 100 },
  { courseId: "geo6", sectionId: "6C", chapterIndex: 3, completion: 45 },
  { courseId: "hist8", sectionId: "8A", chapterIndex: 1, completion: 35 },
  { courseId: "hist8", sectionId: "8A", chapterIndex: 2, completion: 10 },
  { courseId: "hist8", sectionId: "8A", chapterIndex: 3, completion: 5 },
  { courseId: "hist8", sectionId: "8B", chapterIndex: 1, completion: 100 },
  { courseId: "hist8", sectionId: "8B", chapterIndex: 2, completion: 100 },
  { courseId: "hist8", sectionId: "8B", chapterIndex: 3, completion: 35 }
];

// STUDENTS (per class)
export const students = [
  // Section 6A - Geography
  { studentId: "stu_6A_001", name: "Aarav Singh", classId: "6A", email: "aarav.singh@school.edu", rollNo: 1 },
  { studentId: "stu_6A_002", name: "Riya Das", classId: "6A", email: "riya.das@school.edu", rollNo: 2 },
  { studentId: "stu_6A_003", name: "Aditya Kumar", classId: "6A", email: "aditya.kumar@school.edu", rollNo: 3 },
  { studentId: "stu_6A_004", name: "Priya Sharma", classId: "6A", email: "priya.sharma@school.edu", rollNo: 4 },
  { studentId: "stu_6A_005", name: "Vikram Patel", classId: "6A", email: "vikram.patel@school.edu", rollNo: 5 },
  { studentId: "stu_6A_006", name: "Ananya Gupta", classId: "6A", email: "ananya.gupta@school.edu", rollNo: 6 },
  
  // Section 6C - Geography
  { studentId: "stu_6C_001", name: "Rohit Verma", classId: "6C", email: "rohit.verma@school.edu", rollNo: 1 },
  { studentId: "stu_6C_002", name: "Meera Nair", classId: "6C", email: "meera.nair@school.edu", rollNo: 2 },
  { studentId: "stu_6C_003", name: "Arjun Reddy", classId: "6C", email: "arjun.reddy@school.edu", rollNo: 3 },
  { studentId: "stu_6C_004", name: "Kavya Menon", classId: "6C", email: "kavya.menon@school.edu", rollNo: 4 },
  
  // Section 8A - History
  { studentId: "stu_8A_001", name: "Rahul Joshi", classId: "8A", email: "rahul.joshi@school.edu", rollNo: 1 },
  { studentId: "stu_8A_002", name: "Sneha Iyer", classId: "8A", email: "sneha.iyer@school.edu", rollNo: 2 },
  { studentId: "stu_8A_003", name: "Karthik Rao", classId: "8A", email: "karthik.rao@school.edu", rollNo: 3 },
  { studentId: "stu_8A_004", name: "Divya Nair", classId: "8A", email: "divya.nair@school.edu", rollNo: 4 },
  
  // Section 8B - History
  { studentId: "stu_8B_001", name: "Ishaan Roy", classId: "8B", email: "ishaan.roy@school.edu", rollNo: 1 },
  { studentId: "stu_8B_002", name: "Tara Sen", classId: "8B", email: "tara.sen@school.edu", rollNo: 2 },
  { studentId: "stu_8B_003", name: "Nikhil Bose", classId: "8B", email: "nikhil.bose@school.edu", rollNo: 3 },
  { studentId: "stu_8B_004", name: "Pooja Mukherjee", classId: "8B", email: "pooja.mukherjee@school.edu", rollNo: 4 },
  { studentId: "stu_8B_005", name: "Arun Chatterjee", classId: "8B", email: "arun.chatterjee@school.edu", rollNo: 5 },
];

// ATTENDANCE LOGS (event-like; one row per student per date)
export const attendanceLogs = [
  // 6A earlier week samples
  { studentId: "stu_6A_001", classId: "6A", date: "2025-11-03", status: "present", method: "manual" },
  { studentId: "stu_6A_002", classId: "6A", date: "2025-11-03", status: "present", method: "manual" },
  { studentId: "stu_6A_003", classId: "6A", date: "2025-11-03", status: "absent", method: "manual" },
  { studentId: "stu_6A_004", classId: "6A", date: "2025-11-03", status: "present", method: "manual" },
  { studentId: "stu_6A_005", classId: "6A", date: "2025-11-03", status: "present", method: "manual" },
  { studentId: "stu_6A_006", classId: "6A", date: "2025-11-03", status: "present", method: "manual" },
  
  { studentId: "stu_6A_001", classId: "6A", date: "2025-11-06", status: "present", method: "manual" },
  { studentId: "stu_6A_002", classId: "6A", date: "2025-11-06", status: "absent", method: "manual" },
  { studentId: "stu_6A_003", classId: "6A", date: "2025-11-06", status: "present", method: "manual" },
  { studentId: "stu_6A_004", classId: "6A", date: "2025-11-06", status: "absent", method: "manual" },
  { studentId: "stu_6A_005", classId: "6A", date: "2025-11-06", status: "present", method: "manual" },
  { studentId: "stu_6A_006", classId: "6A", date: "2025-11-06", status: "present", method: "manual" },
  
  // 6A current window
  { studentId: "stu_6A_001", classId: "6A", date: "2025-11-07", status: "present", method: "manual" },
  { studentId: "stu_6A_002", classId: "6A", date: "2025-11-07", status: "absent", method: "manual" },
  { studentId: "stu_6A_003", classId: "6A", date: "2025-11-07", status: "present", method: "manual" },
  { studentId: "stu_6A_004", classId: "6A", date: "2025-11-07", status: "present", method: "manual" },
  { studentId: "stu_6A_005", classId: "6A", date: "2025-11-07", status: "absent", method: "manual" },
  { studentId: "stu_6A_006", classId: "6A", date: "2025-11-07", status: "present", method: "manual" },
  
  { studentId: "stu_6A_001", classId: "6A", date: "2025-11-08", status: "present", method: "voice" },
  { studentId: "stu_6A_002", classId: "6A", date: "2025-11-08", status: "present", method: "voice" },
  { studentId: "stu_6A_003", classId: "6A", date: "2025-11-08", status: "present", method: "voice" },
  { studentId: "stu_6A_004", classId: "6A", date: "2025-11-08", status: "present", method: "voice" },
  { studentId: "stu_6A_005", classId: "6A", date: "2025-11-08", status: "present", method: "voice" },
  { studentId: "stu_6A_006", classId: "6A", date: "2025-11-08", status: "present", method: "voice" },
  
  // 6C Geography samples
  { studentId: "stu_6C_001", classId: "6C", date: "2025-11-04", status: "present", method: "manual" },
  { studentId: "stu_6C_002", classId: "6C", date: "2025-11-04", status: "present", method: "manual" },
  { studentId: "stu_6C_003", classId: "6C", date: "2025-11-04", status: "absent", method: "manual" },
  { studentId: "stu_6C_004", classId: "6C", date: "2025-11-04", status: "present", method: "manual" },
  
  { studentId: "stu_6C_001", classId: "6C", date: "2025-11-08", status: "present", method: "manual" },
  { studentId: "stu_6C_002", classId: "6C", date: "2025-11-08", status: "present", method: "manual" },
  { studentId: "stu_6C_003", classId: "6C", date: "2025-11-08", status: "present", method: "manual" },
  { studentId: "stu_6C_004", classId: "6C", date: "2025-11-08", status: "absent", method: "manual" },
  
  // 8A History samples
  { studentId: "stu_8A_001", classId: "8A", date: "2025-11-05", status: "present", method: "manual" },
  { studentId: "stu_8A_002", classId: "8A", date: "2025-11-05", status: "present", method: "manual" },
  { studentId: "stu_8A_003", classId: "8A", date: "2025-11-05", status: "absent", method: "manual" },
  { studentId: "stu_8A_004", classId: "8A", date: "2025-11-05", status: "present", method: "manual" },
  
  // 8B History samples
  { studentId: "stu_8B_001", classId: "8B", date: "2025-11-06", status: "present", method: "manual" },
  { studentId: "stu_8B_002", classId: "8B", date: "2025-11-06", status: "present", method: "manual" },
  { studentId: "stu_8B_003", classId: "8B", date: "2025-11-06", status: "present", method: "manual" },
  { studentId: "stu_8B_004", classId: "8B", date: "2025-11-06", status: "absent", method: "manual" },
  { studentId: "stu_8B_005", classId: "8B", date: "2025-11-06", status: "present", method: "manual" },
  
  { studentId: "stu_8B_001", classId: "8B", date: "2025-11-08", status: "absent", method: "manual" },
  { studentId: "stu_8B_002", classId: "8B", date: "2025-11-08", status: "present", method: "manual" },
  { studentId: "stu_8B_003", classId: "8B", date: "2025-11-08", status: "present", method: "manual" },
  { studentId: "stu_8B_004", classId: "8B", date: "2025-11-08", status: "present", method: "manual" },
  { studentId: "stu_8B_005", classId: "8B", date: "2025-11-08", status: "present", method: "manual" },
];

// CLASS SESSIONS (schedule log)
export const classSessions = [
  // Geography 6A (Mon/Thu pattern + recent days)
  { classId: "6A", date: "2025-11-03", subject: "Geography", teacherId: "T001", startTime: "09:00", endTime: "09:45", attendanceTaken: true },
  { classId: "6A", date: "2025-11-06", subject: "Geography", teacherId: "T001", startTime: "11:00", endTime: "11:45", attendanceTaken: true },
  { classId: "6A", date: "2025-11-07", subject: "Geography", teacherId: "T001", startTime: "09:00", endTime: "09:45", attendanceTaken: true },
  { classId: "6A", date: "2025-11-10", subject: "Geography", teacherId: "T001", startTime: "09:00", endTime: "09:45", attendanceTaken: false },
  // Geography 6C (Tue/Fri pattern)
  { classId: "6C", date: "2025-11-04", subject: "Geography", teacherId: "T001", startTime: "10:00", endTime: "10:45", attendanceTaken: true },
  { classId: "6C", date: "2025-11-08", subject: "Geography", teacherId: "T001", startTime: "09:00", endTime: "09:45", attendanceTaken: true },
  { classId: "6C", date: "2025-11-11", subject: "Geography", teacherId: "T001", startTime: "10:00", endTime: "10:45", attendanceTaken: false },
  // History 8A (Mon/Wed)
  { classId: "8A", date: "2025-11-05", subject: "History", teacherId: "T001", startTime: "12:00", endTime: "12:45", attendanceTaken: true },
  { classId: "8A", date: "2025-11-10", subject: "History", teacherId: "T001", startTime: "12:00", endTime: "12:45", attendanceTaken: false },
  // History 8B (Tue/Thu)
  { classId: "8B", date: "2025-11-06", subject: "History", teacherId: "T001", startTime: "10:00", endTime: "10:45", attendanceTaken: true },
  { classId: "8B", date: "2025-11-08", subject: "History", teacherId: "T001", startTime: "10:00", endTime: "10:45", attendanceTaken: false },
  { classId: "8B", date: "2025-11-11", subject: "History", teacherId: "T001", startTime: "10:00", endTime: "10:45", attendanceTaken: false },
];

// HELPERS
export const getSyllabusByRef = (refId) => syllabusList.find((s) => s.id === refId);

export const getCourseById = (teacher, courseId) =>
  (teacher?.courses || []).find((c) => c.id === courseId);

const DEFAULT_TOPIC_STATUS = "not-started";

// Default topic object for new schema
const DEFAULT_TOPIC_DATA = { status: "not-started", currentPage: null, notes: null, lastCoveredAt: null };

// Normalize a single topic to new object format
const normalizeTopicData = (rawTopic) => {
  if (!rawTopic) return { ...DEFAULT_TOPIC_DATA };
  // Handle old string format (e.g., "done", "ongoing")
  if (typeof rawTopic === 'string') {
    return { status: rawTopic, currentPage: null, notes: null, lastCoveredAt: null };
  }
  // Handle new object format
  if (typeof rawTopic === 'object') {
    return {
      status: rawTopic.status || DEFAULT_TOPIC_STATUS,
      currentPage: rawTopic.currentPage ?? null,
      notes: rawTopic.notes ?? null,
      lastCoveredAt: rawTopic.lastCoveredAt ?? null
    };
  }
  return { ...DEFAULT_TOPIC_DATA };
};

const normalizeChapterProgress = (chapter, chapterProgress) => {
  const topics = {};
  const subTopics = chapter?.subTopics || [];
  if (chapterProgress && typeof chapterProgress === "object" && chapterProgress.topics) {
    subTopics.forEach((st) => {
      topics[st.index] = normalizeTopicData(chapterProgress.topics[st.index]);
    });
  } else if (typeof chapterProgress === "string") {
    // Legacy: entire chapter has single status string
    subTopics.forEach((st) => {
      topics[st.index] = { status: chapterProgress, currentPage: null, notes: null, lastCoveredAt: null };
    });
  } else {
    subTopics.forEach((st) => {
      topics[st.index] = { ...DEFAULT_TOPIC_DATA };
    });
  }
  return { topics };
};

export const normalizeSectionProgress = (syllabus, rawProgress = {}) => {
  const result = {};
  (syllabus?.chapters || []).forEach((chapter) => {
    result[chapter.index] = normalizeChapterProgress(chapter, rawProgress[chapter.index]);
  });
  return result;
};

export const getSectionProgress = (teacher, courseId, sectionId) => {
  const course = getCourseById(teacher, courseId);
  const syllabus = getSyllabusByRef(course?.syllabusRef);
  const section = course?.sections.find((s) => s.id === sectionId);
  return normalizeSectionProgress(syllabus, section?.progress || {});
};

// Parse schedule string "Mon 09:00–09:45" returning { day:1, start:"09:00", end:"09:45" }
const dayMap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
export function parseSchedule(scheduleStr){
  if(!scheduleStr) return null;
  const [day, times] = scheduleStr.split(' ');
  if(!(day in dayMap) || !times) return null;
  const [start,end] = times.split('–');
  return { day: dayMap[day], start, end };
}

// Get upcoming sessions from sections.schedules across all courses (next N days)
export function getUpcomingSessions(teacher, daysAhead=7){
  const now = new Date();
  const sessions = [];
  const courses = (teacher && Array.isArray(teacher.courses)) ? teacher.courses : [];
  
  // Helper to get local date string YYYY-MM-DD (avoids UTC timezone issues)
  const getLocalDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  courses.forEach((course) => {
    (course.sections || []).forEach((sec) => {
      (sec.schedules||[]).forEach((s) => {
        const parsed = parseSchedule(s);
        if(!parsed) return;
        for(let i=0;i<=daysAhead;i++){
          const d = new Date(now);
          d.setDate(now.getDate()+i);
          if(d.getDay() === parsed.day){
            const dateStr = getLocalDateStr(d);
            sessions.push({
              courseId: course.id,
              subject: course.title.split(' ').slice(1).join(' ') || course.title,
              classId: sec.id,
              date: dateStr,
              startTime: parsed.start,
              endTime: parsed.end,
              schedule: s
            });
          }
        }
      });
    });
  });
  // sort chronologically
  sessions.sort((a,b)=> (a.date + a.startTime).localeCompare(b.date + b.startTime));
  return sessions;
}

export const getAttendanceForClass = (classId, date = null) => {
  const filtered = attendanceLogs.filter(
    (a) => a.classId === classId && (!date || a.date === date)
  );
  const grouped = {};
  filtered.forEach((rec) => {
    if (!grouped[rec.date]) grouped[rec.date] = [];
    grouped[rec.date].push(rec);
  });
  return grouped; // { 'YYYY-MM-DD': [records...] }
};

export const getStudentAttendanceSummary = (studentId) => {
  const logs = attendanceLogs.filter((a) => a.studentId === studentId);
  const presentCount = logs.filter((l) => l.status === "present").length;
  return {
    totalClasses: logs.length,
    presentCount,
    attendancePercent: logs.length ? ((presentCount / logs.length) * 100).toFixed(1) : 0,
  };
};

export const getTeacherTodayActions = (teacherId = teacherData.id, date = new Date()) => {
  const today = date.toISOString().slice(0, 10);
  const todaysSessions = classSessions.filter(
    (session) => session.teacherId === teacherId && session.date === today
  );
  const pendingAttendance = todaysSessions.filter((session) => !session.attendanceTaken).length;

  // Count actual incomplete chapters across all sections
  const chaptersLeft = teacherData.courses.reduce((sum, course) => {
    const syllabus = getSyllabusByRef(course.syllabusRef);
    const totalChapters = syllabus?.chapters?.length || 0;
    
    return (
      sum +
      course.sections.reduce((sectionSum, section) => {
        const baseProgress = normalizeSectionProgress(syllabus, section.progress);
        const effective = normalizeSectionProgress(
          syllabus,
          loadStoredProgress(section.id, baseProgress)
        );
        
        // Count chapters that are not 100% complete
        let incompleteChapters = 0;
        (syllabus?.chapters || []).forEach((chapter) => {
          const chapterProgress = effective?.[chapter.index];
          const topics = chapter?.subTopics || [];
          const doneTopics = topics.filter(topic => 
            chapterProgress?.topics?.[topic.index] === 'done'
          ).length;
          // A chapter is incomplete if not all topics are done
          if (doneTopics < topics.length) {
            incompleteChapters++;
          }
        });
        
        return sectionSum + incompleteChapters;
      }, 0)
    );
  }, 0);

  const assignmentsDue = assignments.filter((assn) => assn.dueDate === today).length;

  return {
    date: today,
    pendingAttendance,
    chaptersLeft,
    assignmentsDue,
  };
};

const computeChapterCompletion = (syllabus, progressMap = {}) => {
  return (syllabus?.chapters || []).map((chapter) => {
    const subTopics = chapter?.subTopics || [];
    const totalPages = subTopics.reduce(
      (sum, topic) => sum + Math.max(0, (topic.pageTo ?? 0) - (topic.pageFrom ?? 0) + 1),
      0
    );
    const completedPages = subTopics.reduce((sum, topic) => {
      const topicData = progressMap?.[chapter.index]?.topics?.[topic.index] || DEFAULT_TOPIC_STATUS;
      // Handle both object schema { status: "done" } and legacy string "done"
      const status = typeof topicData === 'object' ? topicData.status : topicData;
      const pages = Math.max(0, (topic.pageTo ?? 0) - (topic.pageFrom ?? 0) + 1);
      return sum + (status === "done" ? pages : 0);
    }, 0);
    const percent = totalPages ? Math.round((completedPages / totalPages) * 100) : 0;
    return {
      chapterIndex: chapter.index,
      chapterTitle: chapter.title,
      totalPages,
      completedPages,
      percent,
    };
  });
};

export const getHeatmapData = (subjectIdOrCourseId = null) => {
  const rows = [];
  teacherData.courses.forEach((course) => {
    const syllabus = getSyllabusByRef(course.syllabusRef);
    course.sections.forEach((section) => {
      const baseProgress = normalizeSectionProgress(syllabus, section.progress);
      const effective = normalizeSectionProgress(
        syllabus,
        loadStoredProgress(section.id, baseProgress)
      );
      const chapters = computeChapterCompletion(syllabus, effective);
      chapters.forEach((chapter) => {
        rows.push({
          courseId: course.id,
          courseTitle: course.title,
          subject: syllabus?.subject,
          sectionId: section.id,
          ...chapter,
        });
      });
    });
  });

  if (!subjectIdOrCourseId) {
    return rows;
  }

  return rows.filter(
    (row) =>
      row.courseId === subjectIdOrCourseId ||
      row.subject?.toLowerCase() === subjectIdOrCourseId.toLowerCase()
  );
};

export const getTeacherAnalyticsSnapshot = (teacherId = teacherData.id) => {
  const courses = teacherData.courses.map((course) => {
    const syllabus = getSyllabusByRef(course.syllabusRef);
    const sectionPercents = course.sections.map((section) => {
      const base = normalizeSectionProgress(syllabus, section.progress);
      const effective = normalizeSectionProgress(
        syllabus,
        loadStoredProgress(section.id, base)
      );
      return calculateTopicProgressPercent(syllabus, effective);
    });
    const avgPercent = sectionPercents.length
      ? Math.round(sectionPercents.reduce((s, c) => s + c, 0) / sectionPercents.length)
      : 0;
    return {
      courseId: course.id,
      courseTitle: course.title,
      averageProgress: avgPercent,
      sections: course.sections.length,
    };
  });

  const attendancePct = (() => {
    const classIds = new Set(
      teacherData.courses.flatMap((course) => course.sections.map((section) => section.id))
    );
    const records = attendanceLogs.filter((log) => classIds.has(log.classId));
    if (!records.length) return 92;
    const present = records.filter((log) => log.status === "present").length;
    return Math.round((present / records.length) * 100);
  })();

  return {
    courses,
    overallProgress: courses.length
      ? Math.round(courses.reduce((s, c) => s + c.averageProgress, 0) / courses.length)
      : 0,
    attendancePercent: attendancePct,
    averageGrade: 82,
  };
};

export const getHODOverview = (courseId = teacherData.courses[0]?.id) => {
  const course = teacherData.courses.find((c) => c.id === courseId) || teacherData.courses[0];
  if (!course) return null;
  const syllabus = getSyllabusByRef(course.syllabusRef);
  const sectionDetails = course.sections.map((section) => {
    const base = normalizeSectionProgress(syllabus, section.progress);
    const effective = normalizeSectionProgress(syllabus, loadStoredProgress(section.id, base));
    return {
      sectionId: section.id,
      schedules: section.schedules,
      progressPercent: calculateTopicProgressPercent(syllabus, effective),
      chapterBreakdown: computeChapterCompletion(syllabus, effective),
      upcomingExams: section.exams,
    };
  });

  return {
    course,
    subject: syllabus?.subject,
    heatmap: getHeatmapData(course.id),
    sections: sectionDetails,
    filters: {
      subjects: teacherData.courses.map((c) => ({ id: c.id, title: c.title })),
      classes: sectionDetails.map((section) => section.sectionId),
    },
    teacherInsights: {
      syllabusUpdateRate: 88,
      attendanceSubmissionRate: 92,
      resourceSharing: 74,
    },
  };
};

export const getAdminSummary = () => ({
  schoolStats,
  departments,
  teachers: teacherDirectory,
});

// Additional UI data
export const notices = [
  { id: 1, title: "PTM next Friday", detail: "Slot booking opens tomorrow." },
  { id: 2, title: "Unit Test Week", detail: "Starts 18 Nov. Syllabus up to Ch-3." },
];

// NOTIFICATIONS (system-wide alerts for teachers)
export const notifications = [
  {
    id: "notif_1",
    type: "meeting",
    title: "Staff Meeting at 3 PM",
    message: "Monthly staff meeting in the conference room. Agenda: Term review and planning.",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    read: false,
    priority: "normal",
    actionUrl: "/meetings",
  },
  {
    id: "notif_2",
    type: "event",
    title: "Parent-Teacher Conference Friday",
    message: "Please prepare student progress reports for the upcoming PTM session.",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    read: false,
    priority: "high",
    actionUrl: "/events",
  },
  {
    id: "notif_3",
    type: "update",
    title: "New Curriculum Update Available",
    message: "The Geography curriculum has been updated with new NCERT guidelines for Class 6.",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    read: false,
    priority: "normal",
    actionUrl: "/curriculum",
  },
  {
    id: "notif_4",
    type: "alert",
    title: "3 Students Below Attendance Threshold",
    message: "Riya Das, Aditya Kumar need attention - attendance below 75%.",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
    read: true,
    priority: "high",
    actionUrl: "/attendance",
  },
  {
    id: "notif_5",
    type: "submission",
    title: "New Assignment Submissions",
    message: "5 students submitted their Map Labeling Lab assignment.",
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
    read: true,
    priority: "normal",
    actionUrl: "/assignments",
  },
];

// Notification helpers
export const getUnreadNotifications = () => notifications.filter(n => !n.read);
export const getUnreadCount = () => notifications.filter(n => !n.read).length;
export const markNotificationRead = (notificationId) => {
  const notif = notifications.find(n => n.id === notificationId);
  if (notif) notif.read = true;
};
export const markAllNotificationsRead = () => {
  notifications.forEach(n => n.read = true);
};
export const getNotificationsByPriority = (priority) => notifications.filter(n => n.priority === priority);
export const formatNotificationTime = (timestamp) => {
  const now = new Date();
  const notifTime = new Date(timestamp);
  const diffMs = now - notifTime;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return notifTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Progress utilities
// Helper to extract status from either string format or object format
const getTopicStatusValue = (topicData) => {
  if (!topicData) return DEFAULT_TOPIC_STATUS;
  if (typeof topicData === 'string') return topicData;
  if (typeof topicData === 'object' && topicData.status) return topicData.status;
  return DEFAULT_TOPIC_STATUS;
};

// Helper to extract currentPage from object format
const getTopicCurrentPage = (topicData) => {
  if (!topicData || typeof topicData !== 'object') return null;
  return topicData.currentPage ?? null;
};

export const calculateTopicProgressPercent = (syllabus, progressMap = {}) => {
  let totalPages = 0;
  let completedPages = 0;
  (syllabus?.chapters || []).forEach((chapter) => {
    const subTopics = chapter?.subTopics || [];
    const chapterProgress = progressMap[chapter.index]?.topics || {};
    subTopics.forEach((st) => {
      const topicPages = Math.max(0, (st.pageTo ?? 0) - (st.pageFrom ?? 0) + 1);
      totalPages += topicPages;
      
      const topicData = chapterProgress[st.index];
      const status = getTopicStatusValue(topicData);
      
      if (status === "done") {
        completedPages += topicPages;
      } else if (status === "ongoing") {
        // Calculate partial progress for ongoing topics
        const currentPage = getTopicCurrentPage(topicData);
        if (currentPage != null && st.pageFrom != null) {
          const pagesCovered = Math.max(0, currentPage - st.pageFrom);
          completedPages += Math.min(pagesCovered, topicPages); // Cap at topic's max pages
        }
      }
    });
  });
  if (!totalPages) return 0;
  return Math.round((completedPages / totalPages) * 100);
};

export const getProgressPercent = (syllabus, progressMap) =>
  calculateTopicProgressPercent(syllabus, progressMap);

const buildProgressStorageKey = (classId) => `syllabus:progress:${classId}`;

// User-scoped progress loading - each user has their own progress
export const loadStoredProgress = (classId, fallbackProgress = {}) => {
  const stored = loadUserState(buildProgressStorageKey(classId), null);
  if (!stored) {
    // Handle undefined/null fallback gracefully
    if (fallbackProgress === undefined || fallbackProgress === null) {
      return {};
    }
    return JSON.parse(JSON.stringify(fallbackProgress));
  }
  return stored;
};

// User-scoped progress persistence
export const persistProgress = (classId, progress) => {
  saveUserState(buildProgressStorageKey(classId), progress);
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('syllabus-progress-updated', { detail: { classId } }));
    }
  } catch (e) {
    // no-op
  }
};

// ASSIGNMENTS (per class) demo
export const assignments = [
  {
    id: "assn_geo6A_1",
    classId: "6A",
    title: "Map Labeling Lab",
    description: "Label all major continents, oceans, and geographical features on the world map.",
    dueDate: "2025-11-12",
    maxPoints: 10,
    type: "homework",
    chapterRef: 1,
    submissions: [
      { studentId: "stu_6A_001", submittedDate: "2025-11-11", grade: 9 },
      { studentId: "stu_6A_003", submittedDate: "2025-11-12", grade: 8 },
      { studentId: "stu_6A_004", submittedDate: "2025-11-12", grade: 10 },
      { studentId: "stu_6A_005", submittedDate: "2025-11-12", grade: 7 },
    ]
  },
  {
    id: "assn_geo6A_2",
    classId: "6A",
    title: "Solar System Diagram",
    description: "Draw and label a diagram of the solar system with all planets in correct order.",
    dueDate: "2025-11-15",
    maxPoints: 15,
    type: "project",
    chapterRef: 1,
    submissions: [
      { studentId: "stu_6A_001", submittedDate: "2025-11-14", grade: 14 },
    ]
  },
  {
    id: "assn_geo6C_1",
    classId: "6C",
    title: "Climate Zones Report",
    description: "Write a 2-page report on different climate zones around the world.",
    dueDate: "2025-11-14",
    maxPoints: 20,
    type: "homework",
    chapterRef: 3,
    submissions: [
      { studentId: "stu_6C_001", submittedDate: "2025-11-13", grade: 18 },
      { studentId: "stu_6C_002", submittedDate: "2025-11-14", grade: 16 },
    ]
  },
  {
    id: "assn_hist8A_1",
    classId: "8A",
    title: "Industrial Revolution Essay",
    description: "Write an essay discussing the impact of the Industrial Revolution on society.",
    dueDate: "2025-11-16",
    maxPoints: 25,
    type: "homework",
    chapterRef: 1,
    submissions: [
      { studentId: "stu_8A_001", submittedDate: "2025-11-15", grade: 22 },
      { studentId: "stu_8A_002", submittedDate: "2025-11-16", grade: 20 },
    ]
  },
  {
    id: "assn_hist8B_1",
    classId: "8B",
    title: "Revolution Timeline",
    description: "Create a detailed timeline of major events during the Indian independence movement.",
    dueDate: "2025-11-13",
    maxPoints: 15,
    type: "project",
    chapterRef: 2,
    submissions: [
      { studentId: "stu_8B_001", submittedDate: "2025-11-13", grade: 14 },
      { studentId: "stu_8B_002", submittedDate: "2025-11-13", grade: 15 },
      { studentId: "stu_8B_003", submittedDate: "2025-11-13", grade: 13 },
      { studentId: "stu_8B_004", submittedDate: "2025-11-13", grade: 12 },
    ]
  },
  {
    id: "assn_hist8B_2",
    classId: "8B",
    title: "Leaders Biography",
    description: "Write a biography of any one freedom fighter from the Gandhian Era.",
    dueDate: "2025-11-18",
    maxPoints: 20,
    type: "homework",
    chapterRef: 3,
    submissions: []
  }
];

export const getAssignmentsForClass = (classId) => assignments.filter(a => a.classId === classId);
export const getAssignmentStats = (assignment) => {
  const count = assignment.submissions.length;
  const avg = count ? (assignment.submissions.reduce((s,c)=> s + (c.grade||0),0)/count).toFixed(1) : 0;
  return { submissionCount: count, averageGrade: avg };
};

export const getExamsForClass = (courseId, classId) => {
  const course = teacherData.courses.find(c=> c.id === courseId);
  const section = course?.sections.find(s=> s.id === classId);
  return section?.exams || [];
};

// TESTS data (similar structure to assignments but for tests/quizzes)
export const tests = [
  {
    id: "test_geo6A_1",
    classId: "6A",
    title: "Unit Test 1 - Earth & Solar System",
    description: "Covers chapters 1-2: Earth in the Solar System and Landforms",
    dueDate: "2025-11-20",
    maxPoints: 50,
    type: "unit-test",
    chapterRef: 2,
    submissions: [
      { studentId: "stu_6A_001", submittedDate: "2025-11-20", grade: 45 },
      { studentId: "stu_6A_002", submittedDate: "2025-11-20", grade: 38 },
      { studentId: "stu_6A_003", submittedDate: "2025-11-20", grade: 42 },
      { studentId: "stu_6A_004", submittedDate: "2025-11-20", grade: 48 },
    ]
  },
  {
    id: "test_geo6A_2",
    classId: "6A",
    title: "Quiz - Map Reading",
    description: "Short quiz on reading maps and understanding coordinates",
    dueDate: "2025-11-25",
    maxPoints: 20,
    type: "quiz",
    chapterRef: 1,
    submissions: []
  },
  {
    id: "test_geo6C_1",
    classId: "6C",
    title: "Mid Term Exam",
    description: "Comprehensive exam covering all topics from chapters 1-3",
    dueDate: "2025-11-22",
    maxPoints: 100,
    type: "mid-term",
    chapterRef: 3,
    submissions: [
      { studentId: "stu_6C_001", submittedDate: "2025-11-22", grade: 82 },
      { studentId: "stu_6C_002", submittedDate: "2025-11-22", grade: 78 },
    ]
  },
  {
    id: "test_hist8A_1",
    classId: "8A",
    title: "Unit Test - Industrial Revolution",
    description: "Test on the causes and effects of the Industrial Revolution",
    dueDate: "2025-11-25",
    maxPoints: 50,
    type: "unit-test",
    chapterRef: 1,
    submissions: [
      { studentId: "stu_8A_001", submittedDate: "2025-11-25", grade: 44 },
    ]
  },
  {
    id: "test_hist8B_1",
    classId: "8B",
    title: "Mid Term - Indian Independence",
    description: "Covers the entire independence movement from 1857 to 1947",
    dueDate: "2025-11-26",
    maxPoints: 100,
    type: "mid-term",
    chapterRef: 2,
    submissions: [
      { studentId: "stu_8B_001", submittedDate: "2025-11-26", grade: 88 },
      { studentId: "stu_8B_002", submittedDate: "2025-11-26", grade: 92 },
      { studentId: "stu_8B_003", submittedDate: "2025-11-26", grade: 75 },
    ]
  },
  {
    id: "test_hist8B_2",
    classId: "8B",
    title: "Quiz - Gandhian Era",
    description: "Quick quiz on key events and figures of the Gandhian Era",
    dueDate: "2025-12-01",
    maxPoints: 25,
    type: "quiz",
    chapterRef: 3,
    submissions: []
  }
];

// Combined assessments (assignments + tests)
export const getAllAssessments = () => [...assignments, ...tests];
export const getAssessmentsForClass = (classId) => getAllAssessments().filter(a => a.classId === classId);
export const getTestsForClass = (classId) => tests.filter(t => t.classId === classId);

/**
 * Get the next topic to teach for a section
 * Finds the first "not-started" or "ongoing" topic
 */
export const getNextTopic = (sectionId) => {
  const section = teacherData.courses
    .flatMap(c => c.sections)
    .find(s => s.id === sectionId);
  
  if (!section) return null;
  
  const course = teacherData.courses.find(c => 
    c.sections.some(s => s.id === sectionId)
  );
  
  if (!course) return null;
  
  const syllabus = getSyllabusByRef(course.syllabusRef);
  if (!syllabus) return null;
  
  const baseProgress = normalizeSectionProgress(syllabus, section.progress);
  const effective = normalizeSectionProgress(syllabus, loadStoredProgress(sectionId, baseProgress));
  
  // Find first non-completed topic
  for (const chapter of syllabus.chapters || []) {
    for (const topic of chapter.subTopics || []) {
      const topicData = effective?.[chapter.index]?.topics?.[topic.index];
      const status = typeof topicData === 'object' ? topicData?.status : topicData;
      
      if (status === 'ongoing') {
        return {
          title: topic.title,
          chapterIndex: chapter.index,
          chapterTitle: chapter.title,
          topicIndex: topic.index,
          status: 'ongoing',
          currentPage: topicData?.currentPage || topic.pageFrom,
        };
      }
      
      if (status === 'not-started' || !status) {
        return {
          title: topic.title,
          chapterIndex: chapter.index,
          chapterTitle: chapter.title,
          topicIndex: topic.index,
          status: 'not-started',
          pageFrom: topic.pageFrom,
          pageTo: topic.pageTo,
        };
      }
    }
  }
  
  return null; // All topics completed
};

/**
 * Reset all demo data for the current user
 */
export const resetDemoState = () => {
  resetUserNamespace();
};

/**
 * Seed initial demo data for a new user
 * Called on first login to populate the user's isolated sandbox
 */
export const seedDemoDataForUser = () => {
  if (isUserInitialized()) {
    console.log('Demo data already seeded for this user');
    return false;
  }

  console.log('Seeding demo data for new user...');

  // Seed initial progress state from teacherData
  // This gives each user their own copy of the demo progress
  teacherData.courses.forEach((course) => {
    const syllabus = getSyllabusByRef(course.syllabusRef);
    course.sections.forEach((section) => {
      const initialProgress = normalizeSectionProgress(syllabus, section.progress);
      saveUserState(buildProgressStorageKey(section.id), initialProgress);
    });
  });

  // Seed initial attendance logs for user's sandbox
  saveUserState('attendance:logs', attendanceLogs);
  
  // Seed initial notifications
  saveUserState('notifications', notifications);
  
  // Mark user as initialized
  markUserInitialized();
  
  console.log('Demo data seeded successfully');
  return true;
};

/**
 * Check if current user needs demo data seeding
 */
export const needsDemoSeeding = () => {
  return !isUserInitialized();
};

/**
 * Get user-specific attendance logs
 */
export const getUserAttendanceLogs = () => {
  return loadUserState('attendance:logs', attendanceLogs);
};

/**
 * Save user-specific attendance logs
 */
export const saveUserAttendanceLogs = (logs) => {
  saveUserState('attendance:logs', logs);
};

/**
 * Mark attendance for a class (user-scoped)
 */
export const markClassAttendance = (classId, date, records) => {
  const logs = getUserAttendanceLogs();
  
  // Remove existing logs for this class/date
  const filtered = logs.filter(l => !(l.classId === classId && l.date === date));
  
  // Add new records
  const newLogs = [...filtered, ...records];
  
  saveUserAttendanceLogs(newLogs);
  return newLogs;
};

/**
 * Get user-specific notifications
 */
export const getUserNotifications = () => {
  return loadUserState('notifications', notifications);
};

/**
 * Save user-specific notifications
 */
export const saveUserNotifications = (notifs) => {
  saveUserState('notifications', notifs);
};
