# School Companion - Backend & Frontend Integration Plan

## Executive Summary

This document provides a **complete, actionable plan** to migrate from `dummyData.js` to the v2 MongoDB schema and create full backend-frontend integration.

---

## Current State Analysis

### ✅ What's Already Done (Backend)

| Component | Status | Location |
|-----------|--------|----------|
| v2 Mongoose Models | ✅ Complete | `backend/src/models/v2/` |
| Teacher Routes/Controller | ✅ Complete (v1 schema) | `backend/src/routes/teacherRoutes.js` |
| API Base Structure | ✅ Complete | `backend/src/routes/index.js` |
| Database Connection | ✅ Complete | `backend/src/database/index.js` |
| Logger, Error Handler | ✅ Complete | `backend/src/middleware/` |

### ✅ What's Already Done (Frontend)

| Component | Status | Location |
|-----------|--------|----------|
| API Service Layer | ✅ Complete | `frontend/src/services/api.js` |
| Data Service Abstraction | ✅ Complete | `frontend/src/services/dataService.js` |
| Dummy Data | ✅ Complete | `frontend/src/data/dummyData.js` |
| All UI Components | ✅ Complete | `frontend/src/components/`, `pages/` |

### ❌ What's Missing

| Component | Priority | Effort |
|-----------|----------|--------|
| Backend v2 Controllers | 🔴 HIGH | 2-3 days |
| Backend v2 Routes | 🔴 HIGH | 1 day |
| Backend Seed Script (v2) | 🔴 HIGH | 1 day |
| API Response Transformers | 🟡 MEDIUM | 1 day |
| Frontend API Integration | 🟡 MEDIUM | 2 days |

---

## Part 1: Backend Changes Required

### 1.1 Switch to v2 Models

**File:** `backend/src/models/index.js`

```javascript
// CHANGE FROM (current):
const Teacher = require('./Teacher');
const User = require('./User');
// ... old models

// CHANGE TO (new):
const {
  User,
  Course,
  SyllabusMaster,
  AttendanceLog,
  Assignment,
  ClassSection,
  Resource,
  Substitution,
  School
} = require('./v2');

module.exports = {
  User,
  Course,
  SyllabusMaster,
  AttendanceLog,
  Assignment,
  ClassSection,
  Resource,
  Substitution,
  School
};
```

### 1.2 Create New Controllers

**Required Controllers (in `backend/src/controllers/`):**

| Controller | Purpose | Priority |
|------------|---------|----------|
| `authController.js` | Login, Register, JWT | 🔴 HIGH |
| `courseController.js` | Teacher's courses, progress | 🔴 HIGH |
| `syllabusController.js` | Master syllabus CRUD | 🔴 HIGH |
| `attendanceController.js` | Mark/fetch attendance | 🔴 HIGH |
| `studentController.js` | Student management | 🟡 MEDIUM |
| `assignmentController.js` | Assignments/tests | 🟡 MEDIUM |
| `dashboardController.js` | Aggregated dashboard data | 🟡 MEDIUM |
| `resourceController.js` | Shared resources | 🟢 LOW |
| `substitutionController.js` | Smart substitutions | 🟢 LOW |

### 1.3 Create New Routes

**File:** `backend/src/routes/index.js` (updated)

```javascript
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const courseRoutes = require('./courseRoutes');
const syllabusRoutes = require('./syllabusRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const studentRoutes = require('./studentRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const resourceRoutes = require('./resourceRoutes');

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/syllabus', syllabusRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/students', studentRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/resources', resourceRoutes);

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

module.exports = router;
```

---

## Part 2: API Endpoints Specification

### 2.1 Auth Routes (`/api/v1/auth`)

| Method | Endpoint | Purpose | Request Body |
|--------|----------|---------|--------------|
| POST | `/login` | User login | `{ email, password }` |
| POST | `/register` | Create user | `{ email, password, fullName, role }` |
| GET | `/me` | Get current user | JWT Header |
| POST | `/logout` | Logout | JWT Header |

### 2.2 Course Routes (`/api/v1/courses`)

| Method | Endpoint | Purpose | Query/Body |
|--------|----------|---------|------------|
| GET | `/` | Get all courses for teacher | `?teacherId=xxx` |
| GET | `/:id` | Get course by ID | - |
| GET | `/:id/progress` | Get syllabus progress | - |
| PUT | `/:id/progress` | Update progress (voice) | `{ chapterId, status, voiceLog }` |
| GET | `/:id/schedule` | Get course schedule | - |
| GET | `/today` | Get today's courses | `?teacherId=xxx` |

### 2.3 Syllabus Routes (`/api/v1/syllabus`)

| Method | Endpoint | Purpose | Query/Body |
|--------|----------|---------|------------|
| GET | `/` | Get all syllabi | `?subject=xxx&gradeLevel=6` |
| GET | `/:id` | Get syllabus by ID | - |
| POST | `/` | Create syllabus (HOD) | Full syllabus object |
| PUT | `/:id` | Update syllabus | Partial update |
| GET | `/:id/chapters` | Get chapters | - |

### 2.4 Attendance Routes (`/api/v1/attendance`)

| Method | Endpoint | Purpose | Query/Body |
|--------|----------|---------|------------|
| GET | `/` | Get attendance logs | `?courseId=xxx&date=xxx` |
| POST | `/mark` | Mark attendance | `{ courseId, date, records }` |
| GET | `/student/:studentId` | Student attendance | `?startDate&endDate` |
| GET | `/class/:classSectionId` | Class attendance | `?date=xxx` |
| GET | `/at-risk` | Students below threshold | `?threshold=75` |

### 2.5 Dashboard Routes (`/api/v1/dashboard`)

| Method | Endpoint | Purpose | Query/Body |
|--------|----------|---------|------------|
| GET | `/teacher/:id` | Teacher dashboard data | - |
| GET | `/today-actions/:id` | Today's actions | - |
| GET | `/analytics/:id` | Teacher analytics | - |
| GET | `/hod/:subjectId` | HOD overview | - |
| GET | `/school-stats` | Admin stats | - |

### 2.6 Student Routes (`/api/v1/students`)

| Method | Endpoint | Purpose | Query/Body |
|--------|----------|---------|------------|
| GET | `/` | Get all students | `?classId=xxx` |
| GET | `/:id` | Get student by ID | - |
| GET | `/:id/summary` | Student performance | - |
| PUT | `/:id/ai-analysis` | Update AI analysis | AI payload |

### 2.7 Assignment Routes (`/api/v1/assignments`)

| Method | Endpoint | Purpose | Query/Body |
|--------|----------|---------|------------|
| GET | `/` | Get all assignments | `?courseId=xxx` |
| GET | `/:id` | Get assignment by ID | - |
| POST | `/` | Create assignment | Assignment object |
| PUT | `/:id` | Update assignment | Partial update |
| POST | `/:id/submissions` | Add submission | Submission object |
| PUT | `/:id/grade` | Bulk grade | Array of grades |

---

## Part 3: Data Transformation (dummyData → MongoDB)

### 3.1 Mapping Table

| dummyData.js Entity | MongoDB Collection | Key Transformation |
|---------------------|-------------------|-------------------|
| `teacherData` | `users` (role=TEACHER) + `courses` | Split teacher profile from courses |
| `syllabusList` | `syllabus_masters` | Add `schoolId`, `academicYear` |
| `students` | `users` (role=STUDENT) | Add `studentProfile` |
| `attendanceLogs` | `attendance_logs` | **Bucket by session**, not per-student |
| `assignments` | `assignments` | Embed `submissions` array |
| `classSessions` | Embed in `courses.schedule` | No separate collection |
| `teacherDirectory` | `users` (role=TEACHER) | Add `teacherProfile` |

### 3.2 Seed Data Requirements

**Populate the database with:**

| Entity | Count | Details |
|--------|-------|---------|
| **Schools** | 1-2 | Main school + optional branch |
| **Grades** | 6-10 | Grades 1-10 (or 6-12 for secondary) |
| **Sections per Grade** | 5 | A, B, C, D, E |
| **Subjects** | 5 | English, Maths, History, Geography, Science |
| **Teachers** | 10-20 | Each handles 2-3 subjects across 2-4 grades |
| **Students per Section** | 30-40 | ~1500-2000 total students |
| **Syllabus Masters** | 50 | 10 grades × 5 subjects |
| **Courses** | 250 | 10 grades × 5 sections × 5 subjects |

### 3.3 Seed Data Structure

**File:** `backend/src/database/seedV2.js`

```javascript
// Seed order (respects foreign key dependencies):
// 1. Schools (tenants)
// 2. ClassSections (grades + sections)
// 3. Users (Teachers first, then Students)
// 4. SyllabusMasters (per subject per grade)
// 5. Courses (links teacher, section, syllabus)
// 6. AttendanceLogs
// 7. Assignments

const seedData = {
  // ===== 1. SCHOOLS (1-2) =====
  schools: [
    {
      name: "Birla High School - Main Campus",
      address: "1, Moira Street, Kolkata 700017",
      email: "admin@birlahighschool.com",
      phone: "+91-33-2475-4870",
      website: "https://birlahighschool.com/",
      subscriptionPlan: "ENTERPRISE",
      settings: {
        academicYear: "2025-2026",
        workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
      }
    },
    {
      name: "Birla High School - Mukundapur Branch",
      address: "Mukundapur, Kolkata 700099",
      email: "admin@bhs-mukundapur.com",
      phone: "+91-33-2416-5432",
      subscriptionPlan: "PRO"
    }
  ],

  // ===== 2. GRADES & SECTIONS (6-10 grades × 5 sections) =====
  // Generated: Grades 5-10 with sections A, B, C, D, E
  classSections: [
    // Grade 5
    { gradeLevel: 5, name: "A", roomNumber: "501" },
    { gradeLevel: 5, name: "B", roomNumber: "502" },
    { gradeLevel: 5, name: "C", roomNumber: "503" },
    { gradeLevel: 5, name: "D", roomNumber: "504" },
    { gradeLevel: 5, name: "E", roomNumber: "505" },
    // Grade 6
    { gradeLevel: 6, name: "A", roomNumber: "601" },
    { gradeLevel: 6, name: "B", roomNumber: "602" },
    // ... (5 sections each for grades 5-10 = 30 sections total)
  ],

  // ===== 3. SUBJECTS =====
  subjects: ["English", "Mathematics", "History", "Geography", "Science"],

  // ===== 4. TEACHERS (10-20, each handles multiple subjects/grades) =====
  teachers: [
    {
      fullName: "Mr. Rajesh Kumar",
      email: "rajesh.kumar@birlahighschool.com",
      role: "TEACHER",
      teacherProfile: {
        departments: ["Mathematics", "Science"],
        qualification: "M.Sc. Mathematics, B.Ed",
        employeeId: "T001"
      },
      // Teaches: Maths (Grades 5-7), Science (Grades 5-6)
      assignedSubjectsGrades: [
        { subject: "Mathematics", grades: [5, 6, 7] },
        { subject: "Science", grades: [5, 6] }
      ]
    },
    {
      fullName: "Ms. Priya Sharma",
      email: "priya.sharma@birlahighschool.com",
      role: "HOD",
      teacherProfile: {
        departments: ["English"],
        qualification: "M.A. English Literature, B.Ed",
        employeeId: "T002"
      },
      // HOD English, teaches: English (Grades 8-10)
      assignedSubjectsGrades: [
        { subject: "English", grades: [8, 9, 10] }
      ]
    },
    {
      fullName: "Mr. Arun Verma",
      email: "arun.verma@birlahighschool.com",
      role: "TEACHER",
      teacherProfile: {
        departments: ["History", "Geography"],
        qualification: "M.A. History, B.Ed",
        employeeId: "T003"
      },
      // Teaches: History (Grades 6-8), Geography (Grades 6-8)
      assignedSubjectsGrades: [
        { subject: "History", grades: [6, 7, 8] },
        { subject: "Geography", grades: [6, 7, 8] }
      ]
    },
    {
      fullName: "Ms. Kavita Nair",
      email: "kavita.nair@birlahighschool.com",
      role: "TEACHER",
      teacherProfile: {
        departments: ["Science"],
        qualification: "M.Sc. Physics, B.Ed",
        employeeId: "T004"
      },
      assignedSubjectsGrades: [
        { subject: "Science", grades: [7, 8, 9, 10] }
      ]
    },
    {
      fullName: "Mr. Suresh Iyer",
      email: "suresh.iyer@birlahighschool.com",
      role: "HOD",
      teacherProfile: {
        departments: ["Mathematics"],
        qualification: "Ph.D. Mathematics",
        employeeId: "T005"
      },
      assignedSubjectsGrades: [
        { subject: "Mathematics", grades: [8, 9, 10] }
      ]
    },
    {
      fullName: "Ms. Anita Desai",
      email: "anita.desai@birlahighschool.com",
      role: "TEACHER",
      teacherProfile: {
        departments: ["English"],
        qualification: "M.A. English, B.Ed",
        employeeId: "T006"
      },
      assignedSubjectsGrades: [
        { subject: "English", grades: [5, 6, 7] }
      ]
    },
    {
      fullName: "Mr. Vikram Singh",
      email: "vikram.singh@birlahighschool.com",
      role: "HOD",
      teacherProfile: {
        departments: ["History", "Geography"],
        qualification: "M.A. Geography, Ph.D.",
        employeeId: "T007"
      },
      assignedSubjectsGrades: [
        { subject: "History", grades: [9, 10] },
        { subject: "Geography", grades: [9, 10] }
      ]
    },
    {
      fullName: "Ms. Meera Reddy",
      email: "meera.reddy@birlahighschool.com",
      role: "TEACHER",
      teacherProfile: {
        departments: ["Science", "Mathematics"],
        qualification: "M.Sc. Chemistry, B.Ed",
        employeeId: "T008"
      },
      assignedSubjectsGrades: [
        { subject: "Science", grades: [5, 6] },
        { subject: "Mathematics", grades: [5] }
      ]
    },
    {
      fullName: "Mr. Deepak Joshi",
      email: "deepak.joshi@birlahighschool.com",
      role: "TEACHER",
      teacherProfile: {
        departments: ["English", "History"],
        qualification: "M.A. English, B.Ed",
        employeeId: "T009"
      },
      assignedSubjectsGrades: [
        { subject: "English", grades: [5, 6] },
        { subject: "History", grades: [5] }
      ]
    },
    {
      fullName: "Ms. Sunita Gupta",
      email: "sunita.gupta@birlahighschool.com",
      role: "TEACHER",
      teacherProfile: {
        departments: ["Geography"],
        qualification: "M.A. Geography, B.Ed",
        employeeId: "T010"
      },
      assignedSubjectsGrades: [
        { subject: "Geography", grades: [5, 6, 7] }
      ]
    },
    // Add 5-10 more teachers as needed...
  ],

  // ===== 5. STUDENTS (30-40 per section) =====
  // Auto-generated: ~35 students × 30 sections = 1050 students
  studentsPerSection: 35,
  studentNamePatterns: {
    firstNames: ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", 
                 "Ayaan", "Krishna", "Ishaan", "Ananya", "Diya", "Priya", "Riya", 
                 "Saanvi", "Aanya", "Isha", "Kavya", "Myra", "Sara"],
    lastNames: ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", 
                "Nair", "Iyer", "Joshi", "Das", "Roy", "Bose", "Sen", "Mukherjee"]
  },

  // ===== 6. SYLLABUS MASTERS (5 subjects × 6 grades = 30) =====
  // Each syllabus has 8-12 chapters with 3-5 sub-topics each
  syllabusMasterTemplate: {
    chaptersPerSubject: {
      "English": 10,      // Literature, Grammar, Writing units
      "Mathematics": 12,  // Algebra, Geometry, Arithmetic, etc.
      "History": 8,       // Chronological chapters
      "Geography": 8,     // Physical, Human, Map work
      "Science": 10       // Physics, Chemistry, Biology units
    }
  }
};
```

### 3.4 Teacher-Course Assignment Matrix

| Teacher | Subject(s) | Grades | Sections | Total Courses |
|---------|------------|--------|----------|---------------|
| Mr. Rajesh Kumar | Maths, Science | 5-7, 5-6 | A-E | 25 |
| Ms. Priya Sharma (HOD) | English | 8-10 | A-E | 15 |
| Mr. Arun Verma | History, Geography | 6-8 | A-E | 30 |
| Ms. Kavita Nair | Science | 7-10 | A-E | 20 |
| Mr. Suresh Iyer (HOD) | Mathematics | 8-10 | A-E | 15 |
| Ms. Anita Desai | English | 5-7 | A-E | 15 |
| Mr. Vikram Singh (HOD) | History, Geography | 9-10 | A-E | 20 |
| Ms. Meera Reddy | Science, Maths | 5-6 | A-E | 15 |
| Mr. Deepak Joshi | English, History | 5-6 | A-E | 15 |
| Ms. Sunita Gupta | Geography | 5-7 | A-E | 15 |

**Note:** Some sections may share teachers; workload distributed to ~15-25 courses per teacher.

### 3.3 Critical Transformation: Attendance Bucketing

**FROM (dummyData.js):** One row per student per date
```javascript
{ studentId: "stu_6A_001", classId: "6A", date: "2025-11-03", status: "present" },
{ studentId: "stu_6A_002", classId: "6A", date: "2025-11-03", status: "present" },
```

**TO (MongoDB v2):** One document per class session
```javascript
{
  courseId: ObjectId("..."),
  classSectionId: ObjectId("..."),
  date: ISODate("2025-11-03"),
  stats: { totalStudents: 6, presentCount: 5, absentCount: 1 },
  records: [
    { studentId: ObjectId("..."), status: "PRESENT" },
    { studentId: ObjectId("..."), status: "ABSENT" }
  ]
}
```

---

## Part 4: Frontend Integration Strategy

### 4.1 The `dataService.js` Pattern (Already Built!)

Your `dataService.js` is **perfectly architected** for this migration. It has:

1. **Mock Service** - Uses `dummyData.js` (current)
2. **API Service** - Uses `api.js` endpoints (target)
3. **Toggle Switch** - `VITE_USE_MOCK_DATA` env variable

**Migration Steps:**

1. Keep `USE_MOCK=true` during backend development
2. Implement backend endpoints one-by-one
3. Update `apiService` methods in `dataService.js`
4. Test each endpoint
5. Set `USE_MOCK=false` when ready

### 4.2 Files That Import dummyData Directly (Must Fix)

These files bypass `dataService.js` and import `dummyData.js` directly:

| File | Imports | Fix Required |
|------|---------|--------------|
| `pages/ClassPage.jsx` | `teacherData`, helpers | Use `dataService` |
| `pages/CoursePage.jsx` | `teacherData`, helpers | Use `dataService` |
| `pages/SchedulePage.jsx` | `teacherData`, helpers | Use `dataService` |
| `components/dashboard/UpcomingClasses.jsx` | `teacherData` | Use `TeacherContext` |
| `components/dashboard/WeeklySchedule.jsx` | `teacherData` | Use `TeacherContext` |
| `components/dashboard/DashboardMobile.jsx` | `teacherData` | Use `TeacherContext` |
| `components/dashboard/NoticesPanel.jsx` | `notices` | Create API endpoint |
| `components/dashboard/CourseGrid.jsx` | helpers | Move helpers to utils |
| `context/TeacherContext.jsx` | `teacherData`, `teacherDirectory` | Use `dataService` |

### 4.3 Refactoring Pattern

**BEFORE (direct import):**
```javascript
import { teacherData, getSyllabusByRef } from "../data/dummyData";

const teacher = teacherData;
const syllabus = getSyllabusByRef(course.syllabusRef);
```

**AFTER (service pattern):**
```javascript
import { useTeacher } from "../context/TeacherContext";
import { dataService } from "../services/dataService";

const { teacher } = useTeacher();
const syllabus = await dataService.getSyllabusById(course.syllabusRef);
```

### 4.4 Helper Functions Migration

Move these functions from `dummyData.js` to `frontend/src/utils/syllabusHelpers.js`:

- `normalizeSectionProgress()`
- `calculateTopicProgressPercent()`
- `loadStoredProgress()`
- `persistProgress()`
- `parseSchedule()`
- `formatNotificationTime()`

These are **pure utility functions** that don't depend on data source.

---

## Part 5: Implementation Checklist

### Phase 1: Backend Foundation (Days 1-3)

- [ ] Create `backend/src/database/seedV2.js`
- [ ] Update `backend/src/models/index.js` to export v2 models
- [ ] Create `backend/src/controllers/authController.js`
- [ ] Create `backend/src/controllers/courseController.js`
- [ ] Create `backend/src/controllers/syllabusController.js`
- [ ] Create `backend/src/routes/authRoutes.js`
- [ ] Create `backend/src/routes/courseRoutes.js`
- [ ] Create `backend/src/routes/syllabusRoutes.js`
- [ ] Run seed script, verify data in MongoDB

### Phase 2: Core API Endpoints (Days 4-5)

- [ ] Create `backend/src/controllers/attendanceController.js`
- [ ] Create `backend/src/controllers/dashboardController.js`
- [ ] Create `backend/src/routes/attendanceRoutes.js`
- [ ] Create `backend/src/routes/dashboardRoutes.js`
- [ ] Update `backend/src/routes/index.js` with all routes
- [ ] Test all endpoints with Postman/Thunder Client

### Phase 3: Frontend Migration (Days 6-7)

- [ ] Create `frontend/src/utils/syllabusHelpers.js`
- [ ] Update `frontend/src/services/api.js` with new endpoints
- [ ] Update `frontend/src/services/dataService.js` API methods
- [ ] Refactor `TeacherContext.jsx` to use dataService
- [ ] Refactor pages that import dummyData directly
- [ ] Set `VITE_USE_MOCK_DATA=false` and test

### Phase 4: Polish & Testing (Day 8)

- [ ] Create `backend/src/controllers/studentController.js`
- [ ] Create `backend/src/controllers/assignmentController.js`
- [ ] Add error handling for all edge cases
- [ ] Write integration tests
- [ ] Update README documentation

---

## Part 6: API Response Format Standardization

All API responses should follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": { /* actual data */ },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Resource not found",
  "error": "RESOURCE_NOT_FOUND",
  "details": { /* optional debug info */ }
}
```

---

## Part 7: Environment Variables

### Backend `.env`
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/school_companion
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_USE_MOCK_DATA=false
```

---

## Part 8: MongoDB Collection Summary

| Collection | Documents (Approx) | Indexes | Seed Data |
|------------|-------------------|---------|-----------|
| `schools` | 1-2 | `_id` | Birla High School Main + Mukundapur |
| `users` | 1,000-1,200 | `email`, `role`, `schoolId` | 10-20 teachers + ~1,050 students |
| `class_sections` | 30 | `schoolId`, `gradeLevel` | 6 grades × 5 sections (A-E) |
| `syllabus_masters` | 30 | `subject`, `gradeLevel` | 6 grades × 5 subjects |
| `courses` | 150-250 | `teacherId`, `schoolId` | Each teacher-section-subject combo |
| `attendance_logs` | 500+/year | `courseId`, `date` | Sample logs for demo |
| `assignments` | 50+/year | `courseId`, `dueDate` | Sample assignments |
| `resources` | 20+ | `subject`, `gradeLevel` | Sample PDFs/links |
| `substitutions` | Variable | `date`, `status` | Empty initially |

### Seed Data Volume Calculations

```
Schools:           2
Grades:            6 (Grades 5-10)
Sections/Grade:    5 (A, B, C, D, E)
Total Sections:    30

Subjects:          5 (English, Maths, History, Geography, Science)
Syllabus Masters:  30 (6 grades × 5 subjects)

Teachers:          10-20 (each handles 2-3 subjects, 2-4 grades)
Students/Section:  35
Total Students:    1,050 (30 sections × 35)

Courses:           150 (30 sections × 5 subjects)
                   (distributed among 10-20 teachers)
```

---

## Quick Start Commands

```powershell
# Backend setup
cd "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\backend"
npm install
npm run seed:v2  # After creating seedV2.js
npm run dev

# Frontend setup
cd "c:\Users\KIIT0001\Documents\STAFFROOM AI\Staffroom\frontend"
npm install
npm run dev

# Test API
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/api/v1/courses?teacherId=xxx
```

---

## Summary: What Changes Where

| Layer | File(s) to Change | Action |
|-------|-------------------|--------|
| **DB Models** | `models/index.js` | Point to v2 |
| **Controllers** | `controllers/*.js` | Create 8 new files |
| **Routes** | `routes/*.js` | Create 8 new files |
| **Seeds** | `database/seedV2.js` | Create new seed |
| **Frontend API** | `services/api.js` | Add new endpoints |
| **Frontend Service** | `services/dataService.js` | Complete API methods |
| **Frontend Utils** | `utils/syllabusHelpers.js` | Extract helpers |
| **Frontend Pages** | 6 files | Replace dummyData imports |
| **Frontend Context** | `TeacherContext.jsx` | Use dataService |

---

**Total Estimated Effort:** 8-10 developer days

**Priority Order:**
1. Seed Script (data first)
2. Course + Syllabus APIs (core features)
3. Attendance APIs (critical workflow)
4. Dashboard APIs (aggregations)
5. Frontend integration
6. Student/Assignment APIs (secondary)

---

*Last Updated: November 29, 2025*
