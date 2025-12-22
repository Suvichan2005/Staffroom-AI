# MongoDB Schema Migration Plan for School Companion

## Executive Summary

This document outlines the migration from the current normalized SQL-style schema to a **denormalized, read-optimized MongoDB schema** designed specifically for AI-native workflows and fast dashboard rendering.

## Current State Analysis

### Existing Models (SQL-Style Normalized)
- ❌ **User.js** - Separate from Teacher/Student
- ❌ **Teacher.js** - Separate entity with duplication
- ❌ **Subject.js** - Detached from actual teaching assignments
- ❌ **Student.js** - Separate entity
- ❌ **Attendance.js** - Per-student records (will explode to 700K+ docs/year)
- ❌ **Assignment.js** - Submissions likely separate

### Problems Identified
1. **Join Hell**: Dashboard requires 5+ queries (User → Teacher → TeachingAssignment → Subject → Syllabus)
2. **Attendance Explosion**: One doc per student per day = 500 students × 200 days = 100K docs
3. **No AI Context**: Data scattered across collections makes LLM integration slow
4. **Missing Multi-Tenancy**: No `schoolId` field for SaaS model
5. **Voice/AI Fields Missing**: No fields for `voiceLog`, `aiSummary`, etc.

## Recommended Schema Architecture

### Core Design Principles
1. **Denormalization**: Embed data that's always accessed together
2. **Read-Optimization**: Cache computed values (attendance %, progress %)
3. **AI-Ready**: Include fields for AI summaries, voice logs, learning styles
4. **Multi-Tenancy**: Every collection has `schoolId`
5. **Bucket Pattern**: Group time-series data (attendance) by session/day

### New Schema (8 Collections)

```
BEFORE (19 collections):          AFTER (8 collections):
- users                          ✓ users (polymorphic)
- roles                          ✓ courses (THE ENGINE)
- teachers                       ✓ syllabus_masters
- students                       ✓ attendance_logs (bucketed)
- parents                        ✓ assignments (embedded submissions)
- sections                       ✓ resources
- subjects                       ✓ substitutions
- syllabi                        ✓ class_sections
- syllabusprogresses
- teachingassignments
- assignments
- assignmentsubmissions
- attendancerecords
- schedules
- substitutions
- resources
- discussionthreads
- exams
- examresults
```

## Schema Details

### 1. **users** (Polymorphic Identity)
**Purpose**: Single collection for Teachers, Students, HODs, Admins

**Key Changes**:
- Add `schoolId` for multi-tenancy
- Add `role` enum: `['STUDENT', 'TEACHER', 'HOD', 'ADMIN']`
- Add polymorphic profiles:
  - `teacherProfile.departments`, `teacherProfile.stats`
  - `studentProfile.classSectionId`, `studentProfile.aiAnalysis`

**AI Fields**:
- `studentProfile.aiAnalysis.learningStyle` - "Visual", "Kinesthetic"
- `studentProfile.aiAnalysis.cachedSummary` - "Strong in dates, weak in essays"

---

### 2. **courses** (The Application Core)
**Purpose**: Replaces TeachingAssignment + Subject + Section links. Represents "Mr. Sharma teaching History to 6A"

**Key Fields**:
```javascript
{
  schoolId, teacherId, classSectionId,
  name: "Grade 6 History",
  subject: "History",
  gradeLevel: 6,
  sectionName: "6A", // CACHED from ClassSection
  
  // SCHEDULE CACHE (no separate Schedule collection!)
  schedule: [{ day: "MON", startTime: "09:00", endTime: "09:45" }],
  
  // SYLLABUS TRACKER (Your USP!)
  syllabusProgress: [
    {
      chapterId: ObjectId, // from syllabus_masters
      status: "COMPLETED",
      completionDate: Date,
      lastVoiceLog: "I finished planets today",
      aiRemarks: "Pace is 10% slower than expected",
      completedSubTopics: ["Planets", "Stars"]
    }
  ],
  
  // FAST ACCESS (no need to fetch syllabus_masters for simple views)
  currentChapter: {
    chapterId: ObjectId,
    chapterTitle: "The Solar System", // CACHED
    startedAt: Date
  }
}
```

**Why This is Critical**:
- Dashboard query: `Course.find({ teacherId: "X" })` → 1 query, instant load
- Voice update: Update `syllabusProgress` array directly
- AI context: Send entire `Course` document to Gemini

---

### 3. **syllabus_masters** (The Blueprint)
**Purpose**: HOD-defined curriculum. Shared across all sections of "Grade 6 History"

**Key Fields**:
```javascript
{
  schoolId, subject, gradeLevel, academicYear,
  updatedBy: ObjectId, // HOD ID
  
  chapters: [
    {
      _id: ObjectId, // CRUCIAL for tracking
      title: "The Solar System",
      order: 1,
      expectedHours: 5,
      subTopics: [
        { title: "Planets", pageRef: "12-15" }
      ],
      resources: [{ title: "PPT", url: "..." }]
    }
  ]
}
```

---

### 4. **attendance_logs** (Bucket Pattern)
**Purpose**: One document per class session (not per student!)

**Before**: 500 students × 200 days = 100,000 documents  
**After**: 30 classes × 200 days = 6,000 documents (16x reduction!)

**Structure**:
```javascript
{
  schoolId, courseId, classSectionId,
  date: ISODate("2025-11-27"),
  takenBy: ObjectId, // Teacher ID
  type: "DAILY_MASTER", // or "SUBJECT_WISE"
  
  stats: {
    totalStudents: 45,
    presentCount: 42,
    absentCount: 3
  },
  
  records: [
    { studentId: ObjectId, status: "PRESENT" },
    { studentId: ObjectId, status: "ABSENT", remarks: "Sick" }
  ]
}
```

**AI Benefit**: To find "students at risk", aggregate by `studentId` across `records` arrays.

---

### 5. **assignments** (Embedded Submissions)
**Purpose**: Assignments with submissions embedded (faster grading UI)

**Structure**:
```javascript
{
  courseId, title, dueDate, totalMarks,
  
  // EMBEDDED (ideal for class sizes < 200)
  submissions: [
    {
      studentId: ObjectId,
      submittedAt: Date,
      fileUrl: String,
      content: String, // Text submission
      grade: 85,
      feedback: "Good work!",
      status: "GRADED"
    }
  ],
  
  stats: {
    averageScore: 82,
    submissionCount: 38
  },
  
  gradingStatus: "RELEASED" // OPEN, CLOSED, RELEASED
}
```

**AI Use Case**: Bulk grading
- Fetch assignment with all submissions in 1 query
- Send batch to Gemini
- Update `submissions.$.grade` with `bulkWrite()`

---

### 6. **resources** (Smart Sharing)
**Purpose**: Shared teaching materials (PDFs, PPTs)

**Key Fields**:
```javascript
{
  schoolId,
  subject: "History",
  gradeLevel: 6, // NOT tied to specific section
  uploadedBy: ObjectId,
  title: "Chapter 4 Notes",
  fileUrl: "s3://...",
  tags: ["Mughal", "Architecture", "Diagrams"], // AI-generated!
  uploadedAt: Date
}
```

**Sharing Logic**: All Grade 6 History teachers see this resource, regardless of section.

---

### 7. **substitutions** (Smart Helper)
**Purpose**: Track absent teachers and AI-suggested substitutes

**Structure**:
```javascript
{
  schoolId, date, period,
  classSectionId, subjectName,
  absentTeacherId: ObjectId,
  assignedTeacherId: ObjectId,
  status: "ASSIGNED", // REQUESTED, ASSIGNED, COMPLETED
  generatedBy: "AI_AUTO_SUGGEST" // or MANUAL
}
```

---

### 8. **class_sections** (Physical Classes)
**Purpose**: Represents "6A", "8B"

**Structure**:
```javascript
{
  schoolId,
  name: "A",
  gradeLevel: 6,
  classTeacherId: ObjectId, // For morning attendance
  roomNumber: String,
  studentCount: 45 // CACHED
}
```

---

## Migration Strategy

### Phase 1: Backend Schema Update (4 hours)
1. Create new model files in `backend/src/models/v2/`
2. Keep old models for reference
3. Create seed script to populate test data

### Phase 2: Parallel Development (During Hackathon)
1. Frontend uses `dummyData.js` (already matches new schema!)
2. Backend team migrates controllers to use new schema
3. No frontend changes needed

### Phase 3: Data Migration (Post-Hackathon)
1. Write migration script to transform old data → new schema
2. Test with pilot school data
3. Deprecate old models

---

## AI Workflow Optimization

### Scenario: Voice Log ("I finished Chapter 3")

**Old Schema** (5 queries):
```javascript
1. Find Teacher
2. Find TeachingAssignments
3. Find Subject
4. Find Syllabus
5. Create/Update SyllabusProgress
```

**New Schema** (1 query + 1 update):
```javascript
1. Course.findOne({ teacherId, sectionName: "6A" })
   .populate('syllabusMasterId')
2. Course.updateOne({ _id, "syllabusProgress.chapterId": X },
   { $set: { "syllabusProgress.$.status": "COMPLETED" } })
```

### Scenario: Dashboard Load

**Old Schema**: 5-7 queries with joins  
**New Schema**: 1 query
```javascript
const courses = await Course.find({ teacherId: "X" })
  .select('name schedule currentChapter syllabusProgress');
```

### Scenario: AI "How is Student X doing?"

**Old Schema**: 8+ queries (Attendance, Assignments, Grades, Remarks)  
**New Schema**: 3 queries
```javascript
1. User.findById(studentId).select('studentProfile.stats studentProfile.aiAnalysis')
2. AttendanceLog.find({ "records.studentId": X })
3. Assignment.find({ "submissions.studentId": X })
```

---

## Performance Benchmarks (Expected)

| Operation | Old Schema | New Schema | Improvement |
|-----------|------------|------------|-------------|
| Dashboard Load | 250ms (5 queries) | 30ms (1 query) | **8.3x faster** |
| Voice Update | 150ms (3 queries) | 20ms (1 update) | **7.5x faster** |
| Attendance Fetch | 80ms (join) | 10ms (single doc) | **8x faster** |
| AI Context Prep | 300ms (assemble) | 40ms (1 doc) | **7.5x faster** |

---

## Conclusion

The new schema is **purpose-built for School Companion's AI-first vision**:

✅ **Fast**: 1-query dashboard  
✅ **AI-Ready**: Embedded context for LLMs  
✅ **Scalable**: Bucket pattern reduces doc count  
✅ **SaaS-Ready**: Multi-tenancy built-in  
✅ **Hackathon-Friendly**: Works with existing `dummyData.js`

**Next Step**: Implement the models in `backend/src/models/v2/` and start LLM integration!
