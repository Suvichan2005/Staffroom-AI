# ER Model for Staffroom AI School Management System

## Overview

This document describes the Entity-Relationship model for the Staffroom AI School Management System. The system is designed with a focus on privacy, role-based access control (RBAC), and comprehensive management of academic operations.

### System Architecture

The Staffroom system implements a normalized database design where:
- Each **Student** record links to a **Section** (class) and **Subject**(s)
- Each **Teacher** (a type of User) belongs to one or more **Subject**(s) and may lead a department as an **HOD**
- **Users** have **Roles** (Teacher, HOD, IT Admin, Super Admin) managed via RBAC
- Each **Subject** is associated with an **HOD** who manages syllabus and analytics

---

## Key Entities

### 1. User Management

#### User
**Purpose:** Represents all people with system access  
**Attributes:**
- `user_id` (PK)
- `name`
- `email`
- `contact`

**Relationships:**
- Many-to-Many with Role via UserRole (supports RBAC)
- One User can have multiple Roles (e.g., Teacher + HOD)

#### Role
**Purpose:** Defines system access types  
**Attributes:**
- `role_id` (PK)
- `role_name` (e.g., Teacher, HOD, IT_Admin, Super_Admin)

**Relationships:**
- Many-to-Many with User via UserRole

#### UserRole
**Purpose:** Associative entity linking Users to Roles  
**Attributes:**
- `user_id` (FK, PK composite)
- `role_id` (FK, PK composite)

**Relationships:**
- Implements n:m relationship between User and Role

---

### 2. Student & Parent Management

#### Student
**Purpose:** Represents enrolled students  
**Attributes:**
- `student_id` (PK)
- `name`
- `enrollment_no`
- `contact`
- `section_id` (FK)

**Relationships:**
- Belongs to one Section (1:N)
- Many-to-Many with Parent via StudentParent

#### Parent
**Purpose:** Represents student guardians  
**Attributes:**
- `parent_id` (PK)
- `name`
- `email`
- `phone`

**Relationships:**
- Many-to-Many with Student (one parent can have multiple children, one child can have multiple guardians)
- Supports future parent portals

#### Section (Class)
**Purpose:** Represents class groups  
**Attributes:**
- `section_id` (PK)
- `name` (e.g., "8A")
- `grade_level`

**Relationships:**
- Has many Students (1:N)
- Has many Schedule entries (1:N)

---

### 3. Subject & Curriculum Management

#### Subject (Course)
**Purpose:** Represents academic subjects  
**Attributes:**
- `subject_id` (PK)
- `name` (e.g., "Mathematics")
- `department` (optional)
- `hod_user_id` (FK to User)

**Relationships:**
- Each Subject has one HOD (Teacher user) who leads that subject area
- Can be offered to multiple Sections
- Has one Syllabus (1:1)

#### Syllabus
**Purpose:** Represents curriculum content  
**Attributes:**
- `syllabus_id` (PK)
- `subject_id` (FK)
- `content_file` or `text`
- `created_by` (FK to User - HOD)
- `created_at`

**Relationships:**
- One-to-one with Subject
- Created/updated by HOD

#### SyllabusProgress
**Purpose:** Tracks curriculum coverage per Section  
**Attributes:**
- `progress_id` (PK)
- `section_id` (FK)
- `subject_id` (FK)
- `covered_percent`
- `last_update`
- `updated_by` (FK to User - Teacher)

**Relationships:**
- One Section-Subject can have many progress updates (1:N)
- Updated by Teachers (manually or via voice transcription)

---

### 4. Teaching Management

#### TeachingAssignment
**Purpose:** Links Teacher, Subject, and Section  
**Attributes:**
- `ta_id` (PK)
- `section_id` (FK)
- `subject_id` (FK)
- `teacher_id` (FK to User)

**Relationships:**
- One Teacher can teach many Section-Subject combinations (1:N)
- One Section-Subject can have multiple teachers over time
- Supports CSV bulk imports

#### Assignment
**Purpose:** Represents student assignments  
**Attributes:**
- `assignment_id` (PK)
- `title`
- `description`
- `due_date`
- `section_id` (FK)
- `subject_id` (FK)
- `created_by` (FK to User - Teacher)

**Relationships:**
- One Section-Subject can have many Assignments (1:N)
- Created by one Teacher

#### AssignmentSubmission
**Purpose:** Tracks student assignment submissions  
**Attributes:**
- `submission_id` (PK)
- `assignment_id` (FK)
- `student_id` (FK)
- `submission_file` or `text`
- `submitted_at`
- `grade`
- `feedback`

**Relationships:**
- One Assignment has many Submissions (1:N)
- One Student has many Submissions (1:N)

---

### 5. Attendance Management

#### AttendanceRecord
**Purpose:** Logs student attendance  
**Attributes:**
- `attendance_id` (PK)
- `student_id` (FK)
- `subject_id` (FK)
- `date`
- `status` (Present/Absent)
- `marked_by` (FK to User - Teacher)

**Relationships:**
- One Student has many attendance records (1:N)
- One class session produces many student records

---

### 6. Resource Management

#### Resource
**Purpose:** Shared teaching materials  
**Attributes:**
- `resource_id` (PK)
- `subject_id` (FK)
- `title`
- `resource_url` or `file`
- `uploaded_by` (FK to User - Teacher)
- `posted_at`

**Relationships:**
- One Subject can have many Resources (1:N)
- Shared at Subject level for all teachers

#### DiscussionThread
**Purpose:** Subject-specific discussions  
**Attributes:**
- `thread_id` (PK)
- `subject_id` (FK)
- `started_by` (FK to User - Teacher)
- `topic`
- `created_at`

**Relationships:**
- One Subject can have many discussion threads (1:N)
- Teachers participate in course discussions

#### Post (Optional)
**Purpose:** Discussion replies  
**Attributes:**
- `post_id` (PK)
- `thread_id` (FK)
- `author_id` (FK)
- `message`
- `timestamp`

---

### 7. Scheduling

#### Schedule (Timetable)
**Purpose:** Recurring class periods  
**Attributes:**
- `schedule_id` (PK)
- `section_id` (FK)
- `subject_id` (FK)
- `teacher_id` (FK to User)
- `day_of_week`
- `start_time`
- `end_time`
- `location`

**Relationships:**
- One Section has many Schedule entries (1:N)
- One Teacher may appear in many entries (1:N)
- Supports CSV bulk imports

#### Substitution
**Purpose:** Tracks substitute teacher assignments  
**Attributes:**
- `sub_id` (PK)
- `schedule_id` (FK)
- `date`
- `substitute_teacher_id` (FK to User)
- `reason`

**Relationships:**
- One Schedule entry can have multiple substitution records over time (1:N)

---

### 8. Assessment Management

#### Exam
**Purpose:** Represents examinations  
**Attributes:**
- `exam_id` (PK)
- `subject_id` (FK)
- `section_id` (FK)
- `title`
- `exam_date`
- `total_marks`
- `created_by` (FK to User - Teacher)

**Relationships:**
- One Subject-Section can have many Exams (1:N)
- Created by Teacher or HOD

#### ExamResult
**Purpose:** Stores student exam results  
**Attributes:**
- `result_id` (PK)
- `exam_id` (FK)
- `student_id` (FK)
- `marks_obtained`
- `grade`
- `remarks`

**Relationships:**
- One Exam has many ExamResults (1:N)
- One Student has many ExamResults (1:N)

---

## Relationships and Cardinalities Summary

| Relationship | Type | Description |
|---|---|---|
| **User ↔ Role** | Many-to-Many | Via UserRole. Each User can hold multiple Roles; each Role can be assigned to many Users (RBAC) |
| **Section → Student** | One-to-Many | One Section has many Students; each Student belongs to exactly one Section |
| **Student ↔ Parent** | Many-to-Many | Via StudentParent. A student may have multiple guardians; a parent may have multiple children |
| **User (HOD) → Subject** | One-to-Many | A Teacher acting as HOD leads one or more Subjects; each Subject has exactly one HOD |
| **Section-Subject ↔ Teacher** | Many-to-Many | Via TeachingAssignment. One Teacher can teach multiple Section-Subjects; one Section-Subject may have multiple teachers over time |
| **Subject → Syllabus** | One-to-One | Each Subject has one Syllabus per term (created/updated by HOD) |
| **Section-Subject → SyllabusProgress** | One-to-Many | Each Section-Subject can have many progress updates (timestamped) |
| **Section-Subject → Assignment** | One-to-Many | One Section-Subject can have many Assignments; created by one Teacher |
| **Assignment → AssignmentSubmission** | One-to-Many | One Assignment has many Submissions; one Student has many Submissions |
| **Student → AttendanceRecord** | One-to-Many | One Student has many attendance records; one class session produces many records |
| **Subject → Resource** | One-to-Many | One Subject can have many Resources (shared at course level) |
| **Subject → DiscussionThread** | One-to-Many | One Subject can have many discussion threads |
| **Section → Schedule** | One-to-Many | One Section has many Schedule entries (one per class slot) |
| **Schedule → Substitution** | One-to-Many | One Schedule entry can have multiple substitution records over time |
| **Subject-Section → Exam** | One-to-Many | One Subject-Section can have many Exams |
| **Exam → ExamResult** | One-to-Many | One Exam has many ExamResults; one Student has many ExamResults |

---

## Design Principles

### Normalization
- **No Repeating Groups:** Each piece of data is stored once
- **Join Tables:** All many-to-many relationships use associative entities (UserRole, StudentParent, TeachingAssignment)
- **Separation of Concerns:** Clear distinction between users, students, scheduling, and coursework

### Extensibility
This design supports future enhancements:
- **Student Dashboards:** Join Student with Assignment, AttendanceRecord, ExamResult
- **Parent Portals:** Use Student-Parent relationships to display child's data
- **Analytics:** HODs can view aggregated data per Subject/Section
- **Notifications:** Link to User, Student entities for alerts
- **Performance Tracking:** Use ExamResult and AssignmentSubmission for progress reports

### Role-Based Access Control (RBAC)
- **Teachers:** Manage classes, mark attendance, create assignments, update syllabus progress, grade submissions
- **HODs:** Lead subjects, manage syllabi, create exams, view analytics across sections
- **IT Admins:** Bulk CSV imports for schedules, staff, students; system configuration
- **Super Admins:** Full system oversight, user management, and security settings

### Bulk Data Import Support
- **Schedule Import:** CSV with fields: class name, teacher username, day, time, location
- **Staff Import:** CSV with teacher details and subject assignments
- **Student Import:** CSV with enrollment data and section assignments

---

## Data Integrity

### Primary Keys (PK)
All entities use surrogate primary keys:
- **MongoDB:** ObjectId (auto-generated 12-byte identifier)
- **SQL:** Auto-incrementing integers

### Foreign Keys (FK)
- Maintain referential integrity across related entities
- Cascade rules apply for deletions (e.g., deleting a Section should handle related Students)
- In MongoDB: References using ObjectId with Mongoose `populate()`

### Unique Constraints
- `User.email` - Unique email addresses
- `Student.enrollment_no` - Unique enrollment numbers
- `Section.name` + `grade_level` - Unique class identification

### Indexes
Recommended indexes for performance:
- `User.email` (unique)
- `Student.enrollment_no` (unique)
- `Student.section_id`
- `AttendanceRecord.student_id` + `date` (composite)
- `Schedule.section_id` + `day_of_week` (composite)
- `TeachingAssignment.teacher_id`
- `Assignment.section_id` + `subject_id` (composite)

---

## Implementation Notes

### MongoDB Collections
All entities are implemented as MongoDB collections with Mongoose schemas:
- **Automatic Timestamps:** `createdAt`, `updatedAt` added automatically
- **Schema Validation:** Type validation, required fields, enum values
- **Virtual Fields:** Computed properties (e.g., `fullName` from `firstName` + `lastName`)
- **Reference Relationships:** ObjectId references with `populate()` for joins
- **Middleware:** Pre/post hooks for data transformation

### API Structure
RESTful API endpoints follow the pattern:
```
/api/v1/{entity-name}
```

**Examples:**
- `POST /api/v1/teachers` - Create teacher
- `GET /api/v1/students?section=8A` - Get students by section
- `PUT /api/v1/syllabus/:id` - Update syllabus (HOD only)
- `GET /api/v1/attendance?student=123&date=2025-11-26` - Get attendance records
- `POST /api/v1/assignments/:id/submissions` - Submit assignment

### Authentication & Authorization
- **JWT Tokens:** Stateless authentication with refresh tokens
- **Role Middleware:** Route-level protection based on user roles
- **Permission System:** Fine-grained control (e.g., only HOD can modify syllabus)

---

## Database Schema Highlights

### Collections Created
1. **users** - All system users with RBAC
2. **roles** - Role definitions
3. **teachers** - Teacher-specific data (extends User)
4. **students** - Student records
5. **parents** - Parent/guardian information
6. **sections** - Class groups
7. **subjects** - Academic subjects with HOD assignment
8. **syllabi** - Curriculum content
9. **syllabusprogresses** - Coverage tracking
10. **teachingassignments** - Teacher-Section-Subject mapping
11. **assignments** - Student assignments
12. **assignmentsubmissions** - Student submission tracking
13. **attendancerecords** - Attendance logs
14. **schedules** - Timetable entries
15. **substitutions** - Substitute teacher records
16. **resources** - Shared teaching materials
17. **discussionthreads** - Subject discussions
18. **exams** - Examination records
19. **examresults** - Student exam scores

---

## Migration from SQL to MongoDB

### Key Differences
| SQL (PostgreSQL) | MongoDB |
|---|---|
| Tables | Collections |
| Rows | Documents |
| Columns | Fields |
| JOIN | `$lookup` or `populate()` |
| SQL queries | JSON queries |
| Migrations | Schema-less (optional validation) |
| AUTO_INCREMENT | ObjectId |
| Foreign Keys | References (not enforced) |

### Advantages of MongoDB for Staffroom
- **Flexible Schema:** Easy to add new fields without migrations
- **JSON Native:** Natural fit for REST APIs
- **Scalability:** Horizontal scaling with sharding
- **Cloud Ready:** MongoDB Atlas for easy deployment
- **Document Model:** Complex nested data (e.g., syllabus chapters) stored naturally

---

## References

**Design Based On:**
- Common school LMS/MIS models and best practices
- RBAC implementation standards
- Bulk CSV import patterns for educational systems
- [Staffroom AI Features](https://staffroom-ai.com/features)

**Database Implementation:**
- See `backend/src/models/` for complete Mongoose schemas
- See `backend/README.md` for API documentation
- See `backend/MONGODB_SETUP.md` for setup instructions
- See `backend/GET_STARTED.md` for quick start guide

**Tools & Technologies:**
- **Database:** MongoDB 6.0+ with Mongoose ODM 8.0+
- **Backend:** Node.js 14+, Express.js 4.18+
- **Validation:** Joi 17.11+
- **Security:** Helmet, CORS, Rate Limiting
- **Logging:** Winston 3.11+

---

## Future Enhancements

### Planned Features
- **Real-time Notifications:** WebSocket integration for instant updates
- **Mobile API:** Optimized endpoints for mobile apps
- **AI Integration:** Voice transcription for syllabus updates, attendance marking
- **Analytics Dashboard:** Advanced visualizations for HODs and Admins
- **Parent Portal:** Dedicated interface for guardian access
- **Exam Scheduling:** Automated timetable generation
- **Report Cards:** PDF generation for student performance
- **Messaging System:** Internal communication between teachers, students, parents

### Scalability Considerations
- **Sharding Strategy:** Shard by school/institution for multi-tenancy
- **Caching:** Redis integration for frequently accessed data
- **CDN:** Static resources (images, PDFs) served via CDN
- **Microservices:** Split into services (Auth, Scheduling, Grading, etc.) as system grows

---

**Last Updated:** November 26, 2025  
**Version:** 2.0 (MongoDB Implementation)
