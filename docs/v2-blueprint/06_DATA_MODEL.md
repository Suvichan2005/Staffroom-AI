# SECTION F — DATA MODEL & TENANCY DESIGN

> **Purpose:** Define complete schema that solves multi-tenant isolation, academic year transitions, and offline sync  
> **Database:** PostgreSQL with Row-Level Security

---

## 1. Multi-Tenancy Strategy

### 1.1 Chosen Approach: Pool Model with RLS

| Approach | Description | Our Choice |
|----------|-------------|------------|
| **Silo** | Separate database per school | ❌ Too expensive |
| **Bridge** | Separate schema per school | ❌ Too complex |
| **Pool** | Shared tables with tenant filtering | ✅ Cost-effective, scalable |

**Implementation:** PostgreSQL Row-Level Security (RLS) ensures data isolation at the database level, not application level.

### 1.2 Tenant Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TENANT HIERARCHY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                        ┌─────────────────┐                                  │
│                        │  Organization   │                                  │
│                        │  (School Group) │                                  │
│                        └────────┬────────┘                                  │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                       │
│              │                  │                  │                       │
│       ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐               │
│       │   School    │    │   School    │    │   School    │               │
│       │  (Tenant)   │    │  (Tenant)   │    │  (Tenant)   │               │
│       └──────┬──────┘    └─────────────┘    └─────────────┘               │
│              │                                                              │
│       ┌──────┴──────────────────────────┐                                  │
│       │                                  │                                  │
│  ┌────▼────┐  ┌─────────┐  ┌──────────┐  │                                 │
│  │ Teacher │  │ Student │  │  Class   │  │  (School-scoped entities)      │
│  └─────────┘  └─────────┘  └──────────┘  │                                 │
│                                          │                                  │
│  ┌──────────┐  ┌────────────┐  ┌───────┐ │                                 │
│  │Attendance│  │  Syllabus  │  │ Event │ │  (Academic-year-scoped)        │
│  └──────────┘  └────────────┘  └───────┘ │                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Entities

### 2.1 Organization & School

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- ORGANIZATION - Top-level tenant (school group, trust, etc.)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    
    -- Subscription & limits
    plan            TEXT NOT NULL DEFAULT 'free',
    max_schools     INTEGER NOT NULL DEFAULT 1,
    max_teachers    INTEGER NOT NULL DEFAULT 50,
    ai_monthly_budget_usd DECIMAL(10,2),
    
    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHOOL - The primary tenant unit
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE schools (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,  -- Short code like "DPS-RKP"
    
    -- Location
    address         TEXT,
    city            TEXT,
    state           TEXT,
    country         TEXT NOT NULL DEFAULT 'IN',
    timezone        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    
    -- Configuration
    academic_year_start_month INTEGER NOT NULL DEFAULT 4,  -- April
    working_days    TEXT[] NOT NULL DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat'],
    
    -- Status
    is_active       BOOLEAN NOT NULL DEFAULT true,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (org_id, code)
);

CREATE INDEX idx_schools_org ON schools(org_id);
```

### 2.2 Academic Year

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- ACADEMIC YEAR - Time-bounded container for all academic data
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE academic_years (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    name            TEXT NOT NULL,          -- "2025-26"
    start_date      DATE NOT NULL,          -- 2025-04-01
    end_date        DATE NOT NULL,          -- 2026-03-31
    
    is_current      BOOLEAN NOT NULL DEFAULT false,
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Only one current year per school
    CONSTRAINT unique_current_year 
        EXCLUDE (school_id WITH =) WHERE (is_current = true)
);

CREATE INDEX idx_academic_years_school ON academic_years(school_id);
CREATE INDEX idx_academic_years_current ON academic_years(school_id) WHERE is_current = true;
```

### 2.3 Users & Roles

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- USERS - All people with system access
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Auth (linked to Firebase/Auth.js)
    auth_provider_id TEXT UNIQUE,    -- Firebase UID or Auth.js ID
    
    -- Profile
    email           TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    phone           TEXT,
    avatar_url      TEXT,
    
    -- Global status
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth ON users(auth_provider_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- USER_SCHOOL_ROLES - Many-to-many with roles
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE user_role AS ENUM (
    'super_admin',      -- Platform-wide admin
    'school_admin',     -- School IT admin
    'hod',              -- Head of Department
    'teacher',          -- Regular teacher
    'substitute',       -- Substitute teacher
    'readonly'          -- Observer access
);

CREATE TABLE user_school_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    role            user_role NOT NULL,
    department      TEXT,                   -- For HOD role
    
    -- Effective dates (for substitutes)
    effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (user_id, school_id, role)
);

CREATE INDEX idx_user_roles_user ON user_school_roles(user_id);
CREATE INDEX idx_user_roles_school ON user_school_roles(school_id);
```

### 2.4 Students & Sections

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- SECTIONS (Classes) - Academic groupings of students
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE sections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    
    name            TEXT NOT NULL,          -- "8A", "10B"
    grade_level     INTEGER NOT NULL,       -- 8, 10
    
    -- Class teacher
    class_teacher_id UUID REFERENCES users(id),
    
    -- Room assignment
    default_room    TEXT,
    
    -- Capacity
    max_students    INTEGER NOT NULL DEFAULT 40,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (school_id, academic_year_id, name)
);

CREATE INDEX idx_sections_school_year ON sections(school_id, academic_year_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- STUDENTS - Enrolled students
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Identity
    admission_no    TEXT NOT NULL,
    name            TEXT NOT NULL,
    
    -- Nicknames for voice recognition
    nicknames       TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Contact
    email           TEXT,
    phone           TEXT,
    
    -- Status
    is_active       BOOLEAN NOT NULL DEFAULT true,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (school_id, admission_no)
);

CREATE INDEX idx_students_school ON students(school_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION_STUDENTS - Student enrollment per academic year
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE section_students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id      UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    roll_number     INTEGER NOT NULL,
    
    -- Enrollment dates
    enrolled_at     DATE NOT NULL DEFAULT CURRENT_DATE,
    left_at         DATE,
    
    UNIQUE (section_id, student_id),
    UNIQUE (section_id, roll_number)
);

CREATE INDEX idx_section_students ON section_students(section_id);
```

### 2.5 Subjects & Teaching Assignments

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- SUBJECTS - Curriculum subjects
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE subjects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    name            TEXT NOT NULL,          -- "Mathematics"
    code            TEXT NOT NULL,          -- "MATH"
    department      TEXT,                   -- "Science"
    
    -- Color for UI
    color           TEXT DEFAULT '#3B82F6',
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (school_id, code)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- TEACHING_ASSIGNMENTS - Teacher → Section → Subject mapping
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE teaching_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    
    teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id      UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    -- For tracking workload
    periods_per_week INTEGER NOT NULL DEFAULT 1,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (academic_year_id, teacher_id, section_id, subject_id)
);

CREATE INDEX idx_teaching_assignments_teacher ON teaching_assignments(teacher_id);
CREATE INDEX idx_teaching_assignments_section ON teaching_assignments(section_id);
```

### 2.6 Syllabus Structure

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- SYLLABUS - Hierarchical curriculum structure
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE syllabi (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    -- Grade level this syllabus applies to
    grade_level     INTEGER NOT NULL,
    
    -- Metadata
    name            TEXT NOT NULL,          -- "Class 8 Mathematics"
    total_periods   INTEGER NOT NULL DEFAULT 0,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (school_id, academic_year_id, subject_id, grade_level)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SYLLABUS_TOPICS - Chapters, units, sub-topics (hierarchical)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE syllabus_topics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id     UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES syllabus_topics(id) ON DELETE CASCADE,
    
    -- Hierarchy
    level           INTEGER NOT NULL,       -- 0=Chapter, 1=Unit, 2=Topic
    position        INTEGER NOT NULL,       -- Order within parent
    
    -- Content
    title           TEXT NOT NULL,
    description     TEXT,
    
    -- Page range (for voice: "I'm on page 42")
    start_page      INTEGER,
    end_page        INTEGER,
    
    -- Expected duration
    estimated_periods INTEGER NOT NULL DEFAULT 1,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_syllabus_topics_syllabus ON syllabus_topics(syllabus_id);
CREATE INDEX idx_syllabus_topics_parent ON syllabus_topics(parent_id);
CREATE INDEX idx_syllabus_topics_pages ON syllabus_topics(syllabus_id, start_page, end_page);
```

### 2.7 Syllabus Progress

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- SYLLABUS_PROGRESS - Per section progress tracking
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE progress_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'skipped'
);

CREATE TABLE syllabus_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    topic_id        UUID NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE,
    section_id      UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    
    status          progress_status NOT NULL DEFAULT 'not_started',
    
    -- When was this taught?
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    
    -- Who marked it?
    marked_by_id    UUID REFERENCES users(id),
    
    -- How was it marked?
    source          TEXT,                   -- 'voice', 'manual', 'ai_suggested'
    
    -- Notes
    notes           TEXT,
    
    -- For sync
    version         INTEGER NOT NULL DEFAULT 1,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (topic_id, section_id)
);

CREATE INDEX idx_syllabus_progress_section ON syllabus_progress(section_id);
CREATE INDEX idx_syllabus_progress_topic ON syllabus_progress(topic_id);
```

### 2.8 Attendance

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- ATTENDANCE_SESSIONS - A single attendance-taking event
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE attendance_session_type AS ENUM (
    'master',       -- Morning class teacher attendance
    'subject',      -- Subject-specific period attendance
    'event'         -- Special event attendance
);

CREATE TABLE attendance_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    section_id      UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    
    -- Type
    type            attendance_session_type NOT NULL,
    
    -- For subject attendance
    subject_id      UUID REFERENCES subjects(id),
    teaching_assignment_id UUID REFERENCES teaching_assignments(id),
    
    -- When
    date            DATE NOT NULL,
    period          INTEGER,                -- Period number (1-8)
    
    -- Who took it
    taken_by_id     UUID NOT NULL REFERENCES users(id),
    
    -- How
    method          TEXT NOT NULL,          -- 'voice', 'manual', 'imported'
    
    -- Voice session data
    transcript      TEXT,
    audio_url       TEXT,
    
    -- Status
    is_finalized    BOOLEAN NOT NULL DEFAULT false,
    finalized_at    TIMESTAMPTZ,
    
    -- For sync
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Only one master attendance per section per day
    CONSTRAINT unique_master_attendance 
        EXCLUDE (section_id WITH =, date WITH =) 
        WHERE (type = 'master')
);

CREATE INDEX idx_attendance_sessions_section_date ON attendance_sessions(section_id, date);
CREATE INDEX idx_attendance_sessions_teacher ON attendance_sessions(taken_by_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ATTENDANCE_RECORDS - Individual student attendance marks
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE attendance_status AS ENUM (
    'present',
    'absent',
    'late',
    'excused',
    'half_day'
);

CREATE TABLE attendance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    session_id      UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    status          attendance_status NOT NULL,
    
    -- For late arrivals
    arrival_time    TIME,
    
    -- AI confidence (if voice-marked)
    confidence      DECIMAL(3,2),           -- 0.00 to 1.00
    
    -- Override tracking
    was_overridden  BOOLEAN NOT NULL DEFAULT false,
    original_status attendance_status,
    override_reason TEXT,
    
    -- Notes
    notes           TEXT,
    
    -- For sync
    version         INTEGER NOT NULL DEFAULT 1,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (session_id, student_id)
);

CREATE INDEX idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(school_id, student_id);
```

### 2.9 Substitutions

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- SUBSTITUTIONS - Temporary teacher replacements
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE substitution_status AS ENUM (
    'pending',      -- Needs approval
    'approved',     -- Approved, not yet active
    'active',       -- Currently in effect
    'completed',    -- Period ended
    'cancelled'     -- Cancelled before use
);

CREATE TABLE substitutions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Original assignment
    teaching_assignment_id UUID NOT NULL REFERENCES teaching_assignments(id),
    original_teacher_id UUID NOT NULL REFERENCES users(id),
    
    -- Substitute
    substitute_teacher_id UUID NOT NULL REFERENCES users(id),
    
    -- Time range
    date            DATE NOT NULL,
    period_start    INTEGER NOT NULL,       -- First period covered
    period_end      INTEGER NOT NULL,       -- Last period covered (inclusive)
    
    -- Reason
    reason          TEXT NOT NULL,          -- 'leave', 'medical', 'duty', etc.
    notes           TEXT,
    
    -- Status
    status          substitution_status NOT NULL DEFAULT 'pending',
    
    -- Approval
    approved_by_id  UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    
    -- Lock: prevents changes after class starts
    is_locked       BOOLEAN NOT NULL DEFAULT false,
    locked_at       TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_substitutions_date ON substitutions(school_id, date);
CREATE INDEX idx_substitutions_original ON substitutions(original_teacher_id, date);
CREATE INDEX idx_substitutions_substitute ON substitutions(substitute_teacher_id, date);
```

---

## 3. Event Sourcing for Sync

### 3.1 Event Store

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- SYNC_EVENTS - Append-only event log for offline sync
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE sync_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Event identification
    sequence        BIGSERIAL,              -- Global order
    client_id       UUID NOT NULL,          -- Device that created event
    client_sequence BIGINT NOT NULL,        -- Order on that device
    
    -- Event type and data
    entity_type     TEXT NOT NULL,          -- 'attendance_record', 'syllabus_progress'
    entity_id       UUID NOT NULL,          -- ID of affected entity
    event_type      TEXT NOT NULL,          -- 'created', 'updated', 'deleted'
    
    -- The actual change
    payload         JSONB NOT NULL,
    
    -- Metadata
    user_id         UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Prevent duplicate events from same client
    UNIQUE (client_id, client_sequence)
);

-- Partitioning by school for performance
CREATE INDEX idx_sync_events_school_seq ON sync_events(school_id, sequence);
CREATE INDEX idx_sync_events_entity ON sync_events(entity_type, entity_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SYNC_CURSORS - Track sync progress per client
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE sync_cursors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    client_id       UUID NOT NULL,
    
    -- Last synced sequence
    last_sequence   BIGINT NOT NULL DEFAULT 0,
    
    -- Client info
    device_name     TEXT,
    user_agent      TEXT,
    
    last_sync_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (school_id, client_id)
);
```

---

## 4. Row-Level Security

### 4.1 RLS Policies

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY SETUP
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tenant tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Get current user's school from JWT claims
CREATE OR REPLACE FUNCTION current_school_id() 
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'school_id', '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user ID from JWT
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has role in current school
CREATE OR REPLACE FUNCTION user_has_role(required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_school_roles
        WHERE user_id = current_user_id()
        AND school_id = current_school_id()
        AND role = required_role
        AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Students: visible to all teachers in the school
CREATE POLICY students_school_isolation ON students
    USING (school_id = current_school_id());

-- Attendance Records: visible to teachers, modifiable by session owner
CREATE POLICY attendance_records_read ON attendance_records
    FOR SELECT
    USING (school_id = current_school_id());

CREATE POLICY attendance_records_insert ON attendance_records
    FOR INSERT
    WITH CHECK (
        school_id = current_school_id()
        AND EXISTS (
            SELECT 1 FROM attendance_sessions s
            WHERE s.id = session_id
            AND s.taken_by_id = current_user_id()
            AND NOT s.is_finalized
        )
    );

CREATE POLICY attendance_records_update ON attendance_records
    FOR UPDATE
    USING (
        school_id = current_school_id()
        AND EXISTS (
            SELECT 1 FROM attendance_sessions s
            WHERE s.id = session_id
            AND (s.taken_by_id = current_user_id() OR user_has_role('school_admin'))
            AND NOT s.is_finalized
        )
    );

-- Syllabus Progress: modifiable by assigned teachers
CREATE POLICY syllabus_progress_read ON syllabus_progress
    FOR SELECT
    USING (school_id = current_school_id());

CREATE POLICY syllabus_progress_write ON syllabus_progress
    FOR ALL
    USING (
        school_id = current_school_id()
        AND (
            user_has_role('school_admin')
            OR user_has_role('hod')
            OR EXISTS (
                SELECT 1 FROM teaching_assignments ta
                JOIN syllabus_topics t ON t.syllabus_id IN (
                    SELECT id FROM syllabi WHERE subject_id = ta.subject_id
                )
                WHERE ta.teacher_id = current_user_id()
                AND ta.section_id = syllabus_progress.section_id
                AND t.id = syllabus_progress.topic_id
            )
        )
    );

-- Sync Events: school isolation
CREATE POLICY sync_events_isolation ON sync_events
    USING (school_id = current_school_id());
```

---

## 5. Academic Year Transitions

### 5.1 Rollover Process

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- ACADEMIC YEAR ROLLOVER PROCEDURE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION rollover_academic_year(
    p_school_id UUID,
    p_new_year_name TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS UUID AS $$
DECLARE
    v_old_year_id UUID;
    v_new_year_id UUID;
BEGIN
    -- 1. Get current year
    SELECT id INTO v_old_year_id
    FROM academic_years
    WHERE school_id = p_school_id AND is_current = true;
    
    -- 2. Mark old year as not current
    UPDATE academic_years
    SET is_current = false
    WHERE id = v_old_year_id;
    
    -- 3. Create new year
    INSERT INTO academic_years (school_id, name, start_date, end_date, is_current)
    VALUES (p_school_id, p_new_year_name, p_start_date, p_end_date, true)
    RETURNING id INTO v_new_year_id;
    
    -- 4. Copy sections structure (with grade promotion)
    INSERT INTO sections (school_id, academic_year_id, name, grade_level, max_students)
    SELECT 
        school_id,
        v_new_year_id,
        name,
        grade_level,  -- Same structure, students promoted separately
        max_students
    FROM sections
    WHERE academic_year_id = v_old_year_id;
    
    -- 5. Copy syllabi structure
    INSERT INTO syllabi (school_id, academic_year_id, subject_id, grade_level, name, total_periods)
    SELECT
        school_id,
        v_new_year_id,
        subject_id,
        grade_level,
        name,
        total_periods
    FROM syllabi
    WHERE academic_year_id = v_old_year_id;
    
    -- 6. Copy syllabus topics (reset progress)
    INSERT INTO syllabus_topics (syllabus_id, parent_id, level, position, title, description, start_page, end_page, estimated_periods)
    SELECT
        new_s.id,
        NULL,  -- parent_id fixed in subsequent step
        t.level,
        t.position,
        t.title,
        t.description,
        t.start_page,
        t.end_page,
        t.estimated_periods
    FROM syllabus_topics t
    JOIN syllabi old_s ON t.syllabus_id = old_s.id
    JOIN syllabi new_s ON new_s.academic_year_id = v_new_year_id
        AND new_s.subject_id = old_s.subject_id
        AND new_s.grade_level = old_s.grade_level
    WHERE old_s.academic_year_id = v_old_year_id;
    
    -- 7. Teaching assignments copied but need manual review
    -- (Teachers may change, leave, etc.)
    
    RETURN v_new_year_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROMOTE STUDENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION promote_students(
    p_old_section_id UUID,
    p_new_section_id UUID,
    p_student_ids UUID[]
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Enroll specified students in new section
    INSERT INTO section_students (section_id, student_id, roll_number)
    SELECT 
        p_new_section_id,
        ss.student_id,
        ROW_NUMBER() OVER (ORDER BY ss.roll_number)
    FROM section_students ss
    WHERE ss.section_id = p_old_section_id
    AND ss.student_id = ANY(p_student_ids)
    AND ss.left_at IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Mark as left in old section
    UPDATE section_students
    SET left_at = CURRENT_DATE
    WHERE section_id = p_old_section_id
    AND student_id = ANY(p_student_ids);
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Indexing Strategy

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- Attendance queries by date range
CREATE INDEX idx_attendance_sessions_date_range 
ON attendance_sessions(school_id, date DESC);

-- Attendance by student for reports
CREATE INDEX idx_attendance_records_student_date
ON attendance_records(student_id, session_id);

-- Syllabus progress for section view
CREATE INDEX idx_syllabus_progress_section_status
ON syllabus_progress(section_id, status);

-- Sync events for delta sync
CREATE INDEX idx_sync_events_school_sequence
ON sync_events(school_id, sequence DESC);

-- Teaching assignments lookup
CREATE INDEX idx_teaching_lookup
ON teaching_assignments(teacher_id, academic_year_id);

-- Full-text search on student names
CREATE INDEX idx_students_name_search
ON students USING gin(to_tsvector('english', name));
```

---

## 7. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIPS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  organization ──1:N──► school ──1:N──► academic_year                        │
│                           │                 │                               │
│                           │                 └──1:N──► section               │
│                           │                              │                  │
│                           │                              ├──N:M──► student  │
│                           │                              │    (via section_students)
│                           │                              │                  │
│                           │                              └──1:N──► attendance_session
│                           │                                          │      │
│                           │                                          └──1:N─┤
│                           │                                    attendance_record
│                           │                                                  │
│                           └──1:N──► user_school_roles ──N:1──► user         │
│                                                                              │
│  subject ──1:N──► syllabus ──1:N──► syllabus_topic                         │
│      │                                    │                                  │
│      └──1:N──► teaching_assignment        └──1:N──► syllabus_progress       │
│                      │                            (per section)             │
│                      │                                                       │
│                      └──1:N──► substitution                                 │
│                                                                              │
│  ALL ENTITIES ──N:1──► sync_events (for offline sync)                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
