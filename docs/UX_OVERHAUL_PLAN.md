# 🎯 Staffroom AI: Comprehensive UI/UX Overhaul Plan

> **Document Version:** 1.0  
> **Created:** January 5, 2026  
> **Purpose:** Planning, Audit & Recommendations for MVP Adoption Readiness  
> **Status:** PLANNING ONLY — No implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [UX Audit: Current State Analysis](#2-ux-audit-current-state-analysis)
3. [Information Architecture Proposal](#3-information-architecture-proposal)
4. [Role-Based UX Breakdown](#4-role-based-ux-breakdown)
5. [Feature-by-Feature UX Recommendations](#5-feature-by-feature-ux-recommendations)
6. [Stub Feature Analysis & Recommendations](#6-stub-feature-analysis--recommendations)
7. [MVP Scope Definition](#7-mvp-scope-definition)
8. [Onboarding Flow Design](#8-onboarding-flow-design)
9. [AI Integration Strategy](#9-ai-integration-strategy)
10. [Implementation Priority Matrix](#10-implementation-priority-matrix)

---

## 1. Executive Summary

### Assessment Overview

Staffroom is a **functionally sophisticated prototype** with strong technical foundations (voice AI, real-time tool calling, context-aware chat) but lacks the **UX polish and strategic structure** required for real-world teacher adoption. The current implementation conflates demo/developer needs with end-user flows, creating friction for first-time users.

### Key Findings

| Dimension | Strength | Gap |
|-----------|----------|-----|
| **Core Functionality** | Voice attendance, syllabus tracking, AI chat work well | Discoverability is poor; features feel hidden |
| **Technical Foundation** | Gemini Live, tool calling, context extraction are excellent | No backend = all progress is localStorage-only |
| **Information Architecture** | Logical page structure exists | Role switching is confusing; no clear entry points |
| **Onboarding** | None exists | Critical gap for pilot success |
| **Mobile Experience** | Responsive layouts implemented | Some flows (grading, analytics) are desktop-optimized |
| **AI Integration** | Chat bar is persistent and context-aware | AI as "feature" vs AI as "assistant" line is blurry |

### Strategic Recommendation

Transform from a "feature demo" to an "adoption-ready MVP" by:
1. **Implementing progressive onboarding** for both individual teachers and school admins
2. **Clarifying role-based entry points** (Teacher vs Admin vs HOD)
3. **Making AI optional-but-present** rather than central-to-navigation
4. **Hiding incomplete stubs** behind feature flags rather than exposing them
5. **Prioritizing the 3 core workflows**: Attendance, Syllabus Tracking, Daily Dashboard

---

## 2. UX Audit: Current State Analysis

### 2.1 What Currently Works Well ✅

#### Voice Attendance System
- **Real-time transcription feedback** builds trust
- **Fuzzy name matching** handles accent variations and STT errors
- **Live tool calling** provides instant visual confirmation
- **Fallback architecture** (Gemini Live → Web Speech API) ensures resilience

#### Syllabus Progress Tracking
- **Hierarchical view** (Chapter → Topic → Sub-topic) is clear
- **Page number mapping** is practical for textbook-based teaching
- **Visual progress indicators** (color-coded dots, percentage bars) are intuitive
- **Notes per topic** captures real teacher workflow

#### AI Chat Integration
- **Persistent chat bar** across pages maintains context
- **URL-based context extraction** (knows which class you're viewing)
- **Natural language commands** work reliably ("Mark chapter 2 as done in 6A")
- **Multi-step tool execution** handles complex requests gracefully

#### Responsive Design
- **Separate mobile/desktop layouts** optimize for each form factor
- **Bottom navigation** on mobile is touch-friendly
- **Collapsible sidebar** on desktop saves screen real estate
- **Framer Motion animations** feel polished without being distracting

### 2.2 What Causes Confusion ⚠️

#### Role Switching is Jarring
- **Problem**: Teacher, HOD, and Admin dashboards exist as separate pages but there's no clear indication of which role the user is in, or how to switch.
- **Evidence**: Sidebar shows all three dashboards to all users regardless of actual role.
- **Impact**: Teachers see HOD/Admin options they can't use; admins waste time navigating to teacher views.

#### No Clear "Starting Point" After Login
- **Problem**: After login, users land on a dashboard with demo data but no explanation of what to do first.
- **Evidence**: Dashboard shows "Welcome, Teacher" with pre-populated stats but no onboarding prompts.
- **Impact**: First-time users don't know if they should add their classes, upload rosters, or just explore.

#### Feature Discoverability is Poor
- **Problem**: Powerful features (voice attendance, AI commands, topic notes) are hidden behind icons or require prior knowledge.
- **Evidence**: Voice attendance requires navigating to a specific class page and finding a small mic icon.
- **Impact**: Teachers default to manual workflows, missing the product's core value proposition.

#### Attendance vs Syllabus Entry Points are Scattered
- **Problem**: Both attendance and syllabus can be updated from multiple locations (dashboard quick actions, class page, AI chat, voice logger) but the relationship between these entry points is unclear.
- **Evidence**: Dashboard has "Pending Attendance" stat but clicking it doesn't navigate anywhere.
- **Impact**: Teachers have to hunt for the right interface.

#### Assessments Module Feels Disconnected
- **Problem**: Assessments/Assignments page exists but doesn't clearly connect to syllabus chapters or class sections.
- **Evidence**: Creating an assignment requires selecting class from dropdown rather than navigating from class context.
- **Impact**: Breaks the natural "I'm teaching 6A → I want to assign homework for 6A" flow.

### 2.3 What Creates Unnecessary Cognitive Load 🧠

#### Too Many Navigation Options
- **Current State**: Sidebar has 9 items (Dashboard, Classes, Schedule, Assessments, Resources, AI Assistant, HOD Dashboard, Admin Dashboard, Profile, Settings).
- **Problem**: Teachers don't need HOD/Admin views; showing them adds noise.
- **Recommendation**: Show only role-relevant navigation items.

#### Analytics Before Actions
- **Current State**: Dashboard prominently displays charts (Attendance Trend, Syllabus Coverage, Performance Pulse).
- **Problem**: For an MVP, teachers need **actions** more than **analytics**. Analytics are "nice to have" after core workflows are habituated.
- **Recommendation**: Minimize chart presence on dashboard; focus on "Today's Tasks" and "Quick Actions".

#### Course vs Class vs Section Terminology
- **Current State**: UI uses "Course" (e.g., "Grade 6 Geography"), "Class" (e.g., "6A"), and "Section" interchangeably.
- **Problem**: Indian school terminology typically uses "Class" for grade level and "Section" for divisions. The current mapping reverses this in places.
- **Recommendation**: Standardize terminology: "Subject" (Geography), "Class" (Grade 6), "Section" (A, B, C).

#### Dual-Mode AI (Chat vs Voice) Without Clear Cues
- **Current State**: Chat bar has a mic icon for voice input, but Voice Attendance Logger is a separate component.
- **Problem**: Users don't know whether to use the global chat mic or the class-specific voice logger.
- **Recommendation**: Unify voice entry points; context determines what voice does.

#### Settings/Profile Contains Dev Options
- **Current State**: Settings page includes "Reset Demo Data" and other debug-oriented options.
- **Problem**: Confuses end users; suggests the product is not real.
- **Recommendation**: Hide developer options behind a feature flag or admin-only section.

---

## 3. Information Architecture Proposal

### 3.1 Proposed Screen Hierarchy

```
📱 STAFFROOM
│
├── 🔐 Authentication (Pre-Login)
│   ├── Landing Page
│   ├── Login
│   └── Register
│
├── 🎓 TEACHER VIEW (Default for teachers)
│   │
│   ├── Dashboard (Home)
│   │   ├── Today's Schedule (actionable)
│   │   ├── Pending Tasks (attendance, grading)
│   │   ├── AI Quick Actions
│   │   └── Notifications/Notices
│   │
│   ├── My Classes
│   │   └── [Class Card] → Class Page
│   │       ├── Syllabus Tab (with progress editor)
│   │       ├── Attendance Tab (with voice logger)
│   │       ├── Assessments Tab (class-specific)
│   │       └── Insights Tab (AI-generated)
│   │
│   ├── Schedule (Calendar view)
│   │
│   ├── Assessments (Cross-class view)
│   │   ├── Assignments
│   │   └── Tests/Quizzes
│   │
│   ├── Resources (Shared materials)
│   │
│   └── Profile & Settings
│
├── 👔 HOD VIEW (Overlay, not separate app)
│   ├── Department Overview
│   ├── Section Parity Heatmap
│   └── Teacher Performance (future)
│
└── 🔧 ADMIN VIEW (Separate entry point)
    ├── School Setup Wizard
    ├── User Management
    ├── Class/Section Structure
    ├── Timetable Upload
    └── System Logs
```

### 3.2 Navigation Structure

#### Mobile (Teacher)
| Tab | Icon | Purpose |
|-----|------|---------|
| Home | 🏠 | Dashboard with today's focus |
| Classes | 📚 | List of assigned classes |
| Schedule | 📅 | Week view calendar |

**Drawer Menu (☰):**
- Assessments
- Resources
- AI Chat (full screen)
- Profile
- Settings

#### Desktop (Teacher)
| Sidebar Section | Items |
|-----------------|-------|
| **Main** | Dashboard, My Classes, Schedule |
| **Work** | Assessments, Resources |
| **AI** | Chat/Assistant |
| **Account** | Profile, Settings |

#### Role Switching
- **Teacher seeing HOD view**: Badge on sidebar "View Department" if HOD-eligible
- **Admin view**: Completely separate entry point (`/admin/*` routes)

### 3.3 What is Global vs Contextual

| Element | Scope | Rationale |
|---------|-------|-----------|
| AI Chat Bar | Global | Always available for commands |
| Top Navigation | Global | Consistent header |
| Bottom Nav (Mobile) | Global | Primary navigation |
| Attendance Logger | Contextual (Class) | Only shown within class page |
| Syllabus Editor | Contextual (Class) | Only shown within class page |
| Grading Modal | Contextual (Assessment) | Only shown for specific assessment |
| HOD Heatmap | Contextual (Subject) | Only in HOD view |

---

## 4. Role-Based UX Breakdown

### 4.1 Individual Teacher (Self-Onboarded)

#### Profile
- Teacher who signed up independently
- Manages their own schedule, classes, and data
- No admin support; must self-configure

#### What They See
| Screen | Content |
|--------|---------|
| **Dashboard** | "My Day" focus: upcoming classes, pending attendance, quick AI entry |
| **Setup Wizard** | First-time: Add your schedule, subjects, sections, student lists |
| **Classes** | Only classes they've configured |
| **Assessments** | Only their created assessments |
| **Settings** | Full control over all settings |

#### What They DON'T See
- Admin Dashboard
- User Management
- Timetable Upload (they enter their own schedule)
- Multi-teacher analytics

#### Key UX Principles
1. **Minimize setup friction**: Allow starting with just one class, expand gradually
2. **Default to demo data if empty**: Show sample data until real data is added
3. **Inline help**: Contextual tooltips explaining features
4. **Progress tracking**: "You've set up 2 of 5 sections"

### 4.2 School Teacher (Admin-Onboarded)

#### Profile
- Teacher whose school admin created their account
- Schedule, sections, and student lists pre-assigned
- Limited configuration needed

#### What They See
| Screen | Content |
|--------|---------|
| **Dashboard** | Fully populated with assigned classes |
| **Classes** | Pre-configured by admin; read-only structure |
| **Assessments** | Can create/edit for assigned sections |
| **Profile** | View-only for assigned subjects/sections |

#### What They DON'T See
- Setup Wizard (admin handled this)
- Admin Dashboard
- Structure editing (class/section creation)

#### Key UX Principles
1. **Zero setup required**: Everything is pre-configured
2. **Clear scope**: "You teach Geography to 6A, 6C, 8A"
3. **Focused actions**: Hide configuration options that don't apply
4. **Elevation path**: "Contact admin to change assignments"

### 4.3 Admin (School/Institution)

#### Profile
- IT Admin or Academic Coordinator
- Sets up school structure, assigns teachers
- May not teach any classes

#### What They See
| Screen | Content |
|--------|---------|
| **Admin Dashboard** | School-wide overview, user management |
| **School Setup** | Create classes, sections, upload rosters |
| **User Management** | Create/edit teacher accounts, assign roles |
| **Timetable** | Upload and configure schedules |
| **System Logs** | Activity tracking, error logs |

#### What They DON'T See
- Individual teacher dashboards (unless impersonating)
- Syllabus editing (that's teacher's job)
- Grade entry (that's teacher's job)

#### Key UX Principles
1. **Batch operations**: Upload CSV of students, bulk assign teachers
2. **Delegation model**: Create structure, assign teachers, step back
3. **Oversight without micromanagement**: See completion stats, not individual entries
4. **Audit trail**: All actions logged

### 4.4 HOD (Department Head)

#### Profile
- Senior teacher with oversight of subject department
- Teaches their own classes + monitors other teachers
- Cares about section parity and exam readiness

#### What They See
| Screen | Content |
|--------|---------|
| **Teacher Dashboard** | Their own teaching duties |
| **HOD Dashboard** | Cross-section comparison, department metrics |
| **Section Heatmap** | Chapter-by-chapter progress across all sections |
| **Teacher List** | Who teaches what (read-only) |

#### What They DON'T See
- Admin functions (user creation, structure editing)
- Other departments' data

#### Key UX Principles
1. **Dual identity**: Teacher first, HOD second (toggle, not mode switch)
2. **Comparative focus**: Always show "this section vs others"
3. **Intervention prompts**: "Section 6B is 20% behind 6A"
4. **Read-mostly**: HODs observe, teachers act

---

## 5. Feature-by-Feature UX Recommendations

### 5.1 Syllabus Tracking

#### Current State
- ✅ Hierarchical chapter/topic/subtopic structure
- ✅ Page number mapping
- ✅ Color-coded status (not started, ongoing, done)
- ✅ Per-topic notes
- ⚠️ Voice commands work but aren't discoverable
- ⚠️ Saving requires explicit "Save" button

#### Recommendations

**R5.1.1: Auto-Save with Visual Feedback**
- Remove manual "Save" button
- Auto-save on every status change with micro-animation
- Show "Saved" toast briefly, then fade

**R5.1.2: Add Voice Prompt Above Syllabus Editor**
- Add dismissible banner: "💡 Try saying: 'Mark Chapter 2 as done'"
- Show only on first 3 visits, then hide permanently

**R5.1.3: Quick Actions per Topic**
- Hover/tap reveals: Mark Done, Add Note, Set Page
- Currently requires expanding the topic row

**R5.1.4: Progress Calculation Transparency**
- Show how percentage is calculated: "5 of 9 topics completed"
- Currently shows just percentage without context

**R5.1.5: Link Topics to Assessments**
- When creating assessment, suggest: "Based on Chapter 2 topics"
- Show which topics are covered by existing tests

### 5.2 Attendance

#### Current State
- ✅ Voice-based roll call with Gemini Live
- ✅ Real-time visual updates during voice input
- ✅ Manual grid fallback
- ✅ History modal
- ⚠️ Voice logger only appears within class page
- ⚠️ "Take Attendance" button is small and low in visual hierarchy
- ⚠️ No confirmation summary after voice attendance

#### Recommendations

**R5.2.1: Promote Attendance Action on Class Page**
- Make "Take Attendance" a primary CTA (large button, accent color)
- Position above syllabus section

**R5.2.2: Add Attendance Summary Modal**
- After voice attendance: "Marked 28 present, 2 absent"
- List exceptions with edit option
- Require explicit "Confirm" to save

**R5.2.3: Dashboard Quick Entry**
- "Pending Attendance" stat should link directly to next class needing attendance
- Add "Quick Attendance" card showing next class with one-tap start

**R5.2.4: Master Attendance Inheritance (School Mode)**
- If class teacher marked morning attendance, show inherited status
- Subject teachers see: "Pre-marked by Class Teacher" badge
- Can only add exceptions (late arrivals, early departures)

**R5.2.5: Offline Resilience**
- Queue attendance in localStorage if offline
- Sync when connection restored with conflict resolution

### 5.3 Notes (Per-Topic)

#### Current State
- ✅ Text field per subtopic
- ⚠️ No formatting, no attachments
- ⚠️ Not searchable
- ⚠️ Not visible from course overview

#### Recommendations

**R5.3.1: Upgrade to Rich Notes**
- Support basic markdown (bold, lists, links)
- Add image attachment (photo of board, student work)
- Keep simple; avoid full document editor

**R5.3.2: Notes Panel on Class Page**
- Add "Recent Notes" section showing last 5 notes with topic context
- Quick add without navigating into syllabus tree

**R5.3.3: AI-Suggested Notes**
- After class time ends: "Add notes for today's topic?"
- Pre-fill with: "Covered: [topic name]. Key points: [placeholder]"

**R5.3.4: Note Search**
- Global search across all notes
- Useful for: "What did I say about deltas last time?"

### 5.4 Assessments & Grades

#### Current State
- ✅ Assessment list with filtering
- ✅ Create modal with AI quiz generation
- ✅ Grading modal for individual assessments
- ⚠️ No grade book view (student × assessment matrix)
- ⚠️ Limited integration with syllabus topics
- ⚠️ Submission tracking is stubbed (no actual file uploads)

#### Recommendations

**R5.4.1: Grade Book View (MVP Critical)**
- Add matrix view: Students as rows, Assessments as columns
- Show grades inline; click to edit
- Filter by section, type, date range

**R5.4.2: Topic Mapping at Creation**
- When creating assessment, require linking to syllabus chapter(s)
- Enables: "This quiz covers Chapter 2, Topics 1-3"

**R5.4.3: Bulk Grade Entry**
- Support pasting from spreadsheet
- "Enter grades for 6A Geography Quiz 3" → table input

**R5.4.4: Student Submission Tracking (Defer)**
- Mark as "Submitted / Not Submitted" without file upload
- File upload is a V2 feature

**R5.4.5: Grade Distribution Visualization**
- Show histogram for each assessment
- Highlight outliers (failing, top performers)

### 5.5 AI Interactions

#### Current State
- ✅ Persistent chat bar on all pages
- ✅ Context-aware (knows current class/course from URL)
- ✅ Multi-step tool calling (search → update → confirm)
- ✅ Voice input via mic button
- ⚠️ No suggested prompts for new users
- ⚠️ Chat history per session, not persistent across logins
- ⚠️ No clear indication of what AI can/cannot do

#### Recommendations

**R5.5.1: Suggested Prompts (Contextual)**
- On class page: "Mark today's topic as done", "Who was absent last time?"
- On dashboard: "What's my next class?", "Summarize this week"
- Show 3 suggestions; rotate on each visit

**R5.5.2: Capability Discovery**
- First chat interaction: AI introduces itself with capabilities
- "I can help you update syllabus, check attendance, generate quizzes..."

**R5.5.3: Persistent Chat History**
- Save chat sessions to user-scoped storage
- Show "Recent Conversations" in chat panel sidebar
- Allow naming/archiving conversations

**R5.5.4: Confidence Indicators**
- When AI isn't sure, show: "I think you mean 6A? [Confirm / Change]"
- Already partially implemented; make it more prominent

**R5.5.5: Undo/Rollback Support**
- After AI action: "I marked Chapter 3 as done. [Undo]"
- Keep last 5 actions in undo stack

---

## 6. Stub Feature Analysis & Recommendations

### 6.1 Student 360° Profile Lookup

| Aspect | Current State |
|--------|---------------|
| **UI Presence** | Not visible in navigation |
| **Data** | Students array exists in dummyData |
| **Functionality** | None implemented |

**What It Should Do:**
- Global search bar → type student name → slide-over panel
- Show: attendance trend, grade average, recent submissions, behavior notes
- Quick actions: Add note, View parent contact

**Data Requirements:**
- Student profiles with metadata (roll number, parent contact)
- Aggregated attendance by student
- Aggregated grades by student
- Teacher notes tagged to students

**Recommended UX Entry Points:**
1. Global search in top nav (🔍)
2. Attendance grid → click student name → opens profile
3. Grade book → click student name → opens profile

**MVP Verdict:** DEFER
- Requires aggregation logic not yet implemented
- Core value is in teacher workflows, not student profiles
- Add to V1.5 after core workflows stable

**Documentation:**
```
Feature: Student 360° Profile
Status: DEFERRED to V1.5
Rationale: Core attendance/syllabus workflows take priority for pilot.
Data Needed: Student model with attendance & grade aggregations.
Entry Point: Global search, Attendance grid, Grade book.
```

### 6.2 WhatsApp Voice Note Integration

| Aspect | Current State |
|--------|---------------|
| **UI Presence** | None |
| **Backend** | None |
| **Functionality** | Concept only |

**What It Should Do:**
- Teacher sends voice note to verified WhatsApp number
- System transcribes and processes as if spoken in app
- Replies with confirmation: "Marked 6A attendance. Rohan absent."

**Data Requirements:**
- WhatsApp Business API integration
- Teacher phone verification flow
- Command parsing pipeline (reuse existing)

**Recommended UX Entry Points:**
1. Settings → Enable WhatsApp Integration → Verify Phone
2. Out-of-app (WhatsApp itself)

**MVP Verdict:** DEFER
- Significant infrastructure requirement
- Core app UX not yet proven
- Consider for V2 after product-market fit

**Documentation:**
```
Feature: WhatsApp Voice Note Integration
Status: DEFERRED to V2
Rationale: Requires WhatsApp Business API and infrastructure.
Data Needed: Teacher phone numbers, verification tokens.
Entry Point: Settings page toggle, then out-of-app usage.
```

### 6.3 In-Class Audio Recording & Smart Summarization

| Aspect | Current State |
|--------|---------------|
| **UI Presence** | None |
| **Backend** | None |
| **Functionality** | Concept only |

**What It Should Do:**
- Record full class audio
- Transcribe and diarize (separate teacher/student voices)
- Extract: topics covered, questions asked, assignments mentioned
- Auto-update syllabus progress

**Data Requirements:**
- Long-form audio storage (significant costs)
- Speaker diarization model
- Consent management system

**MVP Verdict:** DEFER INDEFINITELY
- Privacy concerns are substantial (FERPA, COPPA, parental consent)
- Infrastructure costs are high
- Core value proposition doesn't require this

**Documentation:**
```
Feature: In-Class Audio Recording
Status: DEFERRED INDEFINITELY
Rationale: Privacy, legal, and cost concerns outweigh MVP value.
Alternative: Manual voice logging (current implementation) is sufficient.
If Revisited: Start with opt-in manual recording, not automatic.
```

### 6.4 Smart Substitution Module

| Aspect | Current State |
|--------|---------------|
| **UI Presence** | Mentioned in README, not implemented |
| **Backend** | None |
| **Functionality** | Concept only |

**What It Should Do:**
- Coordinator marks teacher as absent
- AI suggests substitutes based on: free periods, subject match, load balance
- Substitute accepts/declines notification
- Timetable updates automatically

**Data Requirements:**
- Real timetable data (not just schedules)
- Teacher availability/leave status
- Notification system (push/email/SMS)

**Recommended UX Entry Points:**
1. Admin/Coordinator Dashboard → Substitution Module
2. Teacher notification: "You've been assigned to cover 6A Period 3"

**MVP Verdict:** DEFER
- Requires multi-user real-time coordination
- Depends on proper backend and notifications
- Add to V1.5 after school pilot validates core features

**Documentation:**
```
Feature: Smart Substitution
Status: DEFERRED to V1.5
Rationale: Requires backend, notifications, and multi-user coordination.
Data Needed: Full timetable, teacher availability, notification channels.
Entry Point: Admin dashboard, Teacher notifications.
```

### 6.5 Shared Resources

| Aspect | Current State |
|--------|---------------|
| **UI Presence** | Page exists at `/resources` |
| **Data** | `defaultResources` array with mock data |
| **Functionality** | Display only; no upload |

**What It Should Do:**
- Teachers upload files (PDFs, images, links) tagged to subject/chapter
- Other teachers see shared resources
- Search/filter by subject, grade, topic
- Download tracking

**Data Requirements:**
- File storage (Firebase Storage, S3)
- Resource metadata (uploader, tags, download count)
- Permission model (department-scoped visibility)

**Recommended UX Entry Points:**
1. Sidebar → Resources
2. Class Page → Resources Tab (filtered to that subject)
3. AI: "Find resources for Chapter 3 Landforms"

**MVP Verdict:** INCLUDE (SIMPLIFIED)
- Remove upload functionality for MVP
- Show curated/admin-uploaded resources only
- Enable upload in V1.5 when backend supports file storage

**Documentation:**
```
Feature: Shared Resources
Status: PARTIALLY INCLUDED in MVP
MVP Scope: Display curated resources; no teacher uploads.
V1.5 Scope: Enable uploads with tagging and search.
Data Needed: File storage, resource metadata.
Entry Point: Sidebar, Class page tab, AI search.
```

### 6.6 HOD Dashboard Enhancements

| Aspect | Current State |
|--------|---------------|
| **UI Presence** | Page exists at `/hod-dashboard` |
| **Data** | Uses same dummyData as teacher |
| **Functionality** | Heatmap, radar chart, metrics work |

**What It Should Do (Additional):**
- Real teacher-to-section mapping
- Historical comparison (this month vs last month)
- Alert flags: "Section behind target"
- Drill-down to individual teacher's progress

**MVP Verdict:** INCLUDE (AS-IS)
- Current implementation is MVP-sufficient
- Defer historical comparison and alerts to V1.5
- Visible only to HOD-role users

### 6.7 Admin Dashboard Enhancements

| Aspect | Current State |
|--------|---------------|
| **UI Presence** | Page exists at `/admin-dashboard` |
| **Data** | Basic summary from dummyData |
| **Functionality** | Overview charts, teacher mapping stub |

**What It Should Do (Additional):**
- Full CRUD for users
- CSV upload for student rosters
- Timetable configuration
- System health monitoring

**MVP Verdict:** EXPAND for School Mode
- Required for school onboarding
- See Section 8 for detailed onboarding flow

---

## 7. MVP Scope Definition

### 7.1 MUST Exist for Pilot Success ✅

| Feature | Rationale | Current State | Gap |
|---------|-----------|---------------|-----|
| **Teacher Login/Registration** | Entry point | ✅ Works | Add onboarding wizard |
| **Dashboard with Today's Focus** | Daily utility | ✅ Works | De-emphasize analytics |
| **Syllabus Tracking** | Core value prop #1 | ✅ Works | Add suggested prompts |
| **Voice Attendance** | Core value prop #2 | ✅ Works | Add summary confirmation |
| **Manual Attendance Fallback** | Accessibility | ✅ Works | No gap |
| **AI Chat (Text)** | Core value prop #3 | ✅ Works | Add capability intro |
| **Per-Class View** | Navigation | ✅ Works | Improve tab clarity |
| **Schedule View** | Planning utility | ✅ Works | No gap |
| **Basic Onboarding** | First-time experience | ❌ Missing | Build wizard |
| **Role-Based Nav** | Declutter UI | ⚠️ Partial | Hide admin for teachers |

### 7.2 Should Exist (Important but Not Blocking) 🟡

| Feature | Rationale | Current State | Recommendation |
|---------|-----------|---------------|----------------|
| **Grade Book Matrix** | Teacher expects this | ❌ Missing | Build simplified version |
| **Assessment Creation** | Workflow continuation | ✅ Works | Link to syllabus |
| **Topic Notes** | Common workflow | ✅ Works | Add search |
| **Resources (View Only)** | Useful for demo | ⚠️ Stub | Curate sample resources |
| **Profile Page** | Personalization | ✅ Works | No gap |
| **Settings** | User control | ✅ Works | Hide dev options |

### 7.3 Should Be Hidden for MVP 🚫

| Feature | Rationale | Action |
|---------|-----------|--------|
| **HOD Dashboard** | Only for HOD role | Hide from teacher sidebar |
| **Admin Dashboard** | Only for admin role | Separate `/admin` routes |
| **Reset Demo Data** | Dev feature | Hide behind flag |
| **Debug Integrations** | Dev feature | Remove from production |
| **AI Test Page** | Dev feature | Remove from production |
| **Activity Logs** | Admin-only | Move to admin section |

### 7.4 Should Be Disabled/Greyed (Coming Soon) 🔜

| Feature | UI Treatment | Tooltip |
|---------|--------------|---------|
| **Student Lookup** | Grey search icon | "Coming in next update" |
| **Resource Upload** | Disabled button | "Admin-uploaded resources only" |
| **WhatsApp Integration** | Hidden | N/A |
| **Bulk Grade Import** | Disabled button | "Coming soon" |

---

## 8. Onboarding Flow Design

### 8.1 Individual Teacher Mode (Self-Onboarding)

#### First-Time User Journey

```
1. LANDING PAGE
   └── "Get Started Free" → Register

2. REGISTRATION
   └── Google Sign-In (recommended) OR Email/Password
   
3. WELCOME SCREEN (NEW)
   ├── "Welcome to Staffroom!"
   ├── "Let's set up your teaching profile in 3 steps"
   └── [Start Setup]

4. STEP 1: YOUR SUBJECTS
   ├── "What subjects do you teach?"
   ├── [Geography] [History] [Science] [Math] [English] [+ Other]
   ├── "Select all that apply"
   └── [Continue]

5. STEP 2: YOUR CLASSES (per subject)
   ├── "Which classes do you teach Geography to?"
   ├── Grade selector: [5] [6] [7] [8] [9] [10]
   ├── Section selector: [A] [B] [C] [D]
   ├── Creates: "Grade 6 Geography - 6A, 6B"
   └── [Continue]

6. STEP 3: YOUR SCHEDULE (per class)
   ├── "When do you teach 6A Geography?"
   ├── Day pills: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat]
   ├── Time picker: Start [09:00] End [09:45]
   ├── [+ Add another slot]
   └── [Continue]

7. OPTIONAL: ADD STUDENTS
   ├── "Add your student roster now or later?"
   ├── [Add Now] → CSV upload or manual entry
   ├── [Skip for Now] → Uses placeholder roster
   └── Explain: "You can add students anytime from Settings"

8. OPTIONAL: UPLOAD SYLLABUS
   ├── "Do you have a syllabus document?"
   ├── [Upload PDF] → AI extracts chapters/topics
   ├── [Use Default Syllabus] → Template structure
   ├── [Skip] → Empty syllabus to fill manually
   └── [Complete Setup]

9. DASHBOARD (Post-Onboarding)
   ├── Confetti animation 🎉
   ├── "You're all set! Here's your teaching dashboard."
   ├── Highlight: "Your next class is [6A Geography] at [09:00]"
   ├── Show: First-time tips as dismissible cards
   └── AI: "Hi! I noticed you teach 6A. Want me to help track your syllabus?"
```

#### Progressive Disclosure Strategy

| Visit # | What's Shown | What's Hidden |
|---------|--------------|---------------|
| 1st | Onboarding wizard | All features |
| 2nd | Dashboard with tips | Advanced settings |
| 3rd | Full feature set | Tips auto-hidden |
| 5th | Feature discovery prompts | Onboarding elements |
| 10th | Mature user experience | All tutorials |

### 8.2 School/Institution Mode (Admin Onboarding)

#### Admin Setup Journey

```
1. ADMIN REGISTRATION
   └── "Set up your school on Staffroom"
   └── Separate `/admin/register` route

2. SCHOOL PROFILE
   ├── School name
   ├── Address
   ├── Academic year (e.g., 2025-26)
   └── [Continue]

3. CLASS STRUCTURE
   ├── "Define your school's classes and sections"
   ├── Quick setup: "Grades 1-10, Sections A-D" → [Generate]
   ├── Manual: Add individual class/section pairs
   └── [Continue]

4. SUBJECT CONFIGURATION
   ├── "What subjects are taught?"
   ├── Template: [Standard CBSE] [Standard ICSE] [Custom]
   ├── Map subjects to grades
   └── [Continue]

5. TEACHER ACCOUNTS
   ├── "Add your teachers"
   ├── [Upload CSV] with columns: Name, Email, Subjects, Sections
   ├── [Add Manually] → Form per teacher
   ├── Emails sent: "Welcome to Staffroom - Set your password"
   └── [Continue]

6. STUDENT ROSTERS
   ├── "Add students per section"
   ├── [Upload CSV] → Section, Roll No, Name, Parent Contact
   ├── [Skip] → Teachers add their own rosters
   └── [Continue]

7. TIMETABLE (Optional)
   ├── "Upload your school timetable"
   ├── [Upload Excel/CSV] → Parse and map
   ├── [Skip] → Teachers enter own schedules
   └── [Complete Setup]

8. ADMIN DASHBOARD
   ├── "Your school is ready!"
   ├── Show: Total teachers, students, classes
   ├── CTA: "Invite teachers to start using Staffroom"
   └── [View Teacher List] [Send Invites]
```

#### Teacher Experience (Post-Admin Setup)

```
1. EMAIL INVITATION
   └── "You've been added to [School Name] on Staffroom"
   └── [Set Password & Login]

2. FIRST LOGIN
   ├── "Welcome, [Teacher Name]!"
   ├── "Your admin has configured your classes:"
   ├── Show: List of assigned sections
   └── [Go to Dashboard]

3. DASHBOARD
   ├── Fully populated with assigned classes
   ├── No setup wizard needed
   ├── Feature tips as dismissible cards
   └── AI: "Welcome! Your first class today is 6A at 09:00"
```

### 8.3 Onboarding for HOD Users

```
1. FIRST ACCESS TO HOD VIEW
   ├── "You have HOD access for [Geography]"
   ├── Explain: "See how all sections compare"
   ├── Quick tour: Heatmap, metrics, section cards
   └── [Got it]
```

---

## 9. AI Integration Strategy

### 9.1 AI as Assistant, Not Interface

#### Principle
AI should **augment** teacher workflows, not **replace** traditional navigation. Teachers should be able to accomplish any task through UI alone; AI accelerates but doesn't gatekeep.

#### Current State Assessment
- ✅ Chat bar is optional (can be minimized)
- ✅ All features accessible via UI
- ⚠️ Some AI capabilities aren't clear (discoverability)
- ⚠️ Voice attendance logger is separate from global voice input

### 9.2 Where AI Fits Naturally

| Context | AI Role | Entry Point |
|---------|---------|-------------|
| **Dashboard** | Daily briefing, quick answers | "What's my day look like?" |
| **Class Page** | Syllabus updates, attendance review | "Mark chapter 2 done", "Who was absent?" |
| **Assessments** | Quiz generation, grade summaries | "Create a 5-question quiz on Landforms" |
| **Schedule** | Navigation, planning | "When's my next 6A class?" |
| **Search** | Cross-cutting queries | "Where did I leave off in 8B?" |

### 9.3 Where Traditional UI is Better

| Task | Why UI is Better |
|------|------------------|
| **Batch attendance marking** | Grid is faster than voice for 30 students |
| **Grade entry for many students** | Spreadsheet-like input is efficient |
| **Browsing syllabus structure** | Visual hierarchy aids understanding |
| **Viewing analytics/charts** | Visual data is hard to speak |
| **Configuring settings** | Toggles/dropdowns are precise |

### 9.4 Recommended AI Enhancements

**E9.4.1: Proactive Suggestions**
- End of class time: "Add notes for 6A Geography?"
- Pending attendance: "3 classes need attendance today. Start with 6A?"
- Before exam: "6A has a test in 3 days. Any topics to review?"

**E9.4.2: Smart Defaults**
- AI infers class from schedule: "Updating 6A progress" (during 6A period)
- AI remembers preferences: "You usually take attendance at period start"

**E9.4.3: Explanation Mode**
- When uncertain: "I found 2 topics matching 'rivers'. Did you mean..."
- After action: "I marked Rivers and Deltas as done. This brings 6A to 67% complete."

**E9.4.4: Learning from Corrections**
- If teacher changes AI's interpretation, remember for next time
- "You usually call Priya 'Pri'. I'll remember that."

---

## 10. Implementation Priority Matrix

### Phase 1: Critical Path (Weeks 1-2)

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Basic onboarding wizard (individual mode) | M | High | Frontend |
| Role-based navigation filtering | S | High | Frontend |
| Attendance summary confirmation modal | S | Medium | Frontend |
| Hide dev pages from production | S | Medium | Frontend |
| AI suggested prompts (3 per context) | S | High | AI/Frontend |
| Dashboard de-emphasis of analytics | S | Medium | Frontend |

### Phase 2: Core Improvements (Weeks 3-4)

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Grade book matrix view | M | High | Frontend |
| Syllabus auto-save | S | Medium | Frontend |
| Topic-to-assessment linking | M | Medium | Frontend |
| Rich notes (markdown + images) | M | Medium | Frontend |
| Chat history persistence | M | Medium | AI/Frontend |
| Settings cleanup | S | Low | Frontend |

### Phase 3: School Mode (Weeks 5-6)

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Admin onboarding wizard | L | High | Frontend |
| User management CRUD | L | High | Backend + Frontend |
| CSV student roster upload | M | High | Backend + Frontend |
| Teacher invitation flow | M | High | Backend + Frontend |
| Timetable upload (basic) | M | Medium | Backend + Frontend |

### Phase 4: Polish & Launch Prep (Week 7-8)

| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Onboarding analytics (funnel tracking) | M | Medium | Analytics |
| Feature tooltips and help | S | Medium | Frontend |
| Performance optimization | M | Medium | Frontend |
| Error handling improvements | M | Medium | Frontend |
| Pilot-ready documentation | M | High | Product |

---

## Appendix A: Terminology Glossary

| Term | Definition | UI Usage |
|------|------------|----------|
| **Subject** | Academic discipline (Geography, History) | Course cards, filters |
| **Class** | Grade level (Grade 6, Grade 8) | Headers, labels |
| **Section** | Division within grade (A, B, C, D) | Cards, navigation |
| **Course** | Subject + Grade combination (Grade 6 Geography) | Course page title |
| **Topic** | Specific lesson within chapter | Syllabus tree |
| **Subtopic** | Smallest trackable unit | Syllabus leaf nodes |
| **Period** | Scheduled class time slot | Schedule view |
| **Assessment** | Assignment or Test | Assessments page |

---

## Appendix B: Mobile vs Desktop Parity

| Feature | Mobile | Desktop | Notes |
|---------|--------|---------|-------|
| Dashboard | ✅ Full | ✅ Full | Same layout, responsive |
| Class Page | ✅ Full | ✅ Full | Tabs work on both |
| Attendance (Voice) | ✅ Full | ✅ Full | Mic access required |
| Attendance (Grid) | ⚠️ Scroll | ✅ Full | Small screens need horizontal scroll |
| Syllabus Editor | ⚠️ Narrow | ✅ Full | Topic names may truncate |
| Grade Book | ⚠️ Limited | ✅ Full | Matrix requires wider screen |
| AI Chat | ✅ Full | ✅ Full | Expands to modal on mobile |
| HOD Heatmap | ⚠️ Scroll | ✅ Full | Large heatmaps need scroll |
| Admin Dashboard | ❌ Basic | ✅ Full | Admin should use desktop |

---

## Appendix C: Analytics Recommendations (Post-MVP)

The current analytics implementation is sophisticated but premature for MVP. Recommendations for V1.5:

1. **Keep only actionable metrics on dashboard:**
   - Pending attendance count (actionable)
   - Chapters remaining before exam (actionable)
   - Students at risk (actionable)

2. **Move detailed analytics to dedicated page:**
   - Attendance trends → Analytics page
   - Syllabus coverage charts → Analytics page
   - Performance distribution → Analytics page

3. **Align analytics with school calendar:**
   - Term-based views
   - Exam-relative progress
   - Year-over-year comparison (V2)

---

## Appendix D: Accessibility Considerations

| Area | Current State | Recommendation |
|------|---------------|----------------|
| **Keyboard Navigation** | Partial | Ensure all actions reachable via Tab + Enter |
| **Screen Reader** | Not tested | Add ARIA labels to icons, charts |
| **Color Contrast** | Good | Maintain WCAG AA compliance |
| **Voice Input** | ✅ Built-in | Core feature, no changes needed |
| **Text Scaling** | ⚠️ Partial | Test at 150% zoom, fix overflows |
| **Touch Targets** | ✅ 44px min | Already implemented |

---

## Appendix E: Implementation Log

### Phase 1 Progress (January 2026)

| Task | Status | Notes |
|------|--------|-------|
| Basic onboarding wizard (individual mode) | ✅ DONE | `OnboardingWizard.jsx` - 3-step wizard shows on first login |
| Role-based navigation filtering | ✅ DONE | `Sidebar.jsx` - Shows nav items based on persona context |
| Attendance summary confirmation modal | ✅ DONE | `AttendanceEditor.jsx` - Modal with stats before saving |
| Hide dev pages from production | ✅ DONE | `AdminRoute.jsx` - `/ai-test`, `/logs`, `/_debug` require admin persona |
| AI suggested prompts (3 per context) | ✅ DONE | Dashboard AI section includes suggested prompts |
| Dashboard de-emphasis of analytics | ✅ DONE | `Dashboard.jsx` - Redesigned as "Today View" with actions first |

### Phase 2 Progress (January 2026)

| Task | Status | Notes |
|------|--------|-------|
| Syllabus auto-save | ✅ DONE | `SyllabusProgress.jsx` - Debounced auto-save with visual feedback |
| Settings cleanup | ✅ DONE | `SettingsPage.jsx` - Dev options hidden unless admin persona |
| Grade book matrix view | ✅ DONE | `GradeBookMatrix.jsx` - Students × assessments grid with averages |
| Topic-to-assessment linking | ⏳ Pending | Deferred to Phase 3 - needs schema work |
| Rich notes (markdown + images) | ⏳ Pending | |
| Chat history persistence | ✅ DONE | Already implemented in `chatStorage.js` + `AIContext.jsx` |

### Files Modified

1. **`src/pages/Dashboard.jsx`** - Complete redesign as "Today View"
   - Hero card shows next class with quick actions
   - Stats are clickable/actionable
   - My Classes section with progress bars
   - AI Quick Actions with suggested prompts
   - De-emphasized analytics

2. **`src/components/layout/Sidebar.jsx`** - Role-based navigation
   - Navigation items filtered by persona (teacher/hod/admin)
   - Persona indicator at bottom when viewing as HOD/Admin
   - Removed role-switching section from primary nav

3. **`src/pages/ClassPage.jsx`** - Tab URL support
   - Supports `?tab=attendance`, `?tab=syllabus` query params
   - Allows deep linking to specific tabs

4. **`src/components/dashboard/UpcomingClasses.jsx`** - Compact mode
   - Supports `compact` prop for sidebar view
   - Supports `daysAhead={0}` for today-only schedule

5. **`src/components/shared/OnboardingWizard.jsx`** - NEW
   - 3-step onboarding wizard
   - Shows once per user (stored in userScopedStorage)
   - Explains core features: Attendance, Syllabus, AI

6. **`src/components/shared/AdminRoute.jsx`** - NEW
   - Route guard for admin-only pages
   - Redirects non-admins to dashboard

7. **`src/App.jsx`** - Route protection
   - Dev routes now require admin persona

8. **`src/components/attendance/AttendanceEditor.jsx`** - Confirmation modal
   - Shows summary before final save (present/absent counts)
   - Lists absent students for review
   - Attendance percentage visualization

9. **`src/components/syllabus/SyllabusProgress.jsx`** - Auto-save
   - Debounced auto-save (2s delay after changes)
   - Visual save status feedback (saving/saved)
   - Manual save still available

10. **`src/pages/SettingsPage.jsx`** - Admin-only options
    - "Reset Demo Data" only visible when admin persona active
    - Cleaner interface for regular teachers

11. **`src/components/teacher/GradeBookMatrix.jsx`** - NEW
    - Matrix view: students as rows, assessments as columns
    - Color-coded grades (green ≥80%, yellow ≥60%, red <60%)
    - Sortable by name or average
    - Type filter (assignments vs tests)
    - Shows class averages and student averages
    - Legend for grade colors and status icons

12. **`src/pages/Assessments.jsx`** - View toggle added
    - List/Grade Book toggle button in header
    - Auto-selects first class when switching to Grade Book
    - Integrates GradeBookMatrix component

13. **`src/services/firestoreChatService.js`** - NEW (Cross-device chat sync)
    - Firestore-based chat storage for cross-device persistence
    - Functions: getAllChatSessionsFromFirestore, saveChatSessionToFirestore, deleteChatSessionFromFirestore
    - Auto-migration of local storage chats to Firestore on first use
    - Collection structure: users/{userId}/chatSessions/{sessionId}

14. **`src/context/AIContext.jsx`** - Firestore integration
    - Chat sessions now sync to Firestore (cross-device)
    - Loads from Firestore on startup with local fallback
    - All CRUD operations sync to both local and Firestore
    - One-time migration of existing local chats

15. **`src/components/shared/AdminRoute.jsx`** - Email whitelist
    - Added ADMIN_EMAILS whitelist array
    - suvanshagar@gmail.com can now access /logs directly
    - Either email whitelist OR admin persona grants access

16. **`firestore.rules`** - Chat session rules
    - Added chatSessions subcollection rules under users/{userId}
    - Users can CRUD their own chat sessions
    - Added suvanshagar@gmail.com to admin list

### Phase 3 Progress (January 2026)

| Task | Status | Notes |
|------|--------|-------|
| Admin onboarding wizard | ✅ DONE | `AdminOnboardingWizard.jsx` - 5-step school setup wizard |
| Teacher invitation flow | ✅ DONE | `TeacherManagement.jsx` - Invite teachers via email, manage subjects |
| CSV student roster upload | ✅ DONE | `StudentRosterUpload.jsx` - Drag-drop CSV import with validation |
| Timetable manager | ✅ DONE | `TimetableManager.jsx` - Visual grid editor + CSV import/export |
| Parent portal structure | ⏳ Pending | Deferred - not MVP critical |

17. **`src/components/shared/AdminOnboardingWizard.jsx`** - NEW
    - 5-step wizard: School Profile → Class Structure → Invite Teachers → Add Students → Review
    - Collects: school name, principal, classes/sections, teachers, students
    - Each step has validation and progress indicator
    - Animated transitions with Framer Motion

18. **`src/components/admin/TeacherManagement.jsx`** - NEW
    - Teacher list view with subjects and status
    - Email invitation system with pending invite tracking
    - Actions: View profile, Resend invite, Cancel invite, Remove teacher
    - Search and filter by subject
    - Storage: `admin:teachers`, `admin:pendingInvites`

19. **`src/components/admin/StudentRosterUpload.jsx`** - NEW
    - Drag-drop CSV file upload
    - Template download with required columns (name, rollNumber, class, section)
    - Preview table with validation (duplicate detection)
    - Progress tracking for large imports
    - Storage: `admin:students`, `admin:importedStudentCount`

20. **`src/components/admin/TimetableManager.jsx`** - NEW
    - Visual grid: Days × Time slots with subject/teacher cells
    - Click to edit mode with inline cell editor
    - Color-coded subjects for quick identification
    - CSV import with template download
    - Export current timetable to CSV
    - Per-class timetable management
    - Break/lunch slot detection

21. **`src/pages/AdminDashboard.jsx`** - Updated
    - Added "Teachers", "Student Roster", and "Timetable Manager" tabs to sidebar
    - Integrated AdminOnboardingWizard modal
    - School setup prompt banner for new admins
    - Tab rendering for all new components

### Phase 4 Progress (January 2026)

| Task | Status | Notes |
|------|--------|-------|
| Feature tooltips and help | ✅ DONE | `FeatureTooltips.jsx` - Context-aware tips with floating help button |
| Loading states & skeletons | ✅ DONE | `Skeletons.jsx` - Full skeleton component library |
| Error handling improvements | ✅ DONE | `errorHandler.js` - Toast notifications, error classification |
| Keyboard shortcuts | ✅ DONE | `useKeyboardShortcuts.jsx` - Global navigation shortcuts |
| Performance optimization | ⏳ Pending | Bundle size warning - needs code splitting |

22. **`src/components/shared/FeatureTooltips.jsx`** - NEW
    - TooltipProvider context for managing tooltip state
    - FeatureTooltip inline component with pulse animation for unseen tips
    - FloatingHelpButton shows context-aware tips per page
    - GuidedTour component for first-time user walkthrough
    - FEATURE_TIPS definitions for all major features
    - Remembers seen tooltips in user storage

23. **`src/components/shared/Skeletons.jsx`** - NEW
    - Base Skeleton with shimmer animation
    - SkeletonText, SkeletonCard, SkeletonStatCard
    - SkeletonTable, SkeletonList, SkeletonChart
    - Page-level skeletons: DashboardSkeleton, ClassPageSkeleton, SyllabusSkeleton
    - LoadingOverlay, Spinner, EmptyState components

24. **`src/utils/errorHandler.js`** - NEW
    - ErrorType classification (network, auth, validation, etc.)
    - User-friendly error messages with recovery options
    - showErrorToast, showSuccessToast, showWarningToast, showInfoToast
    - withErrorHandling wrapper for async functions
    - useAsyncHandler hook for operations with loading states
    - Global error and network status listeners

25. **`src/hooks/useKeyboardShortcuts.jsx`** - NEW
    - KeyboardShortcutsProvider with global shortcut handling
    - Navigation shortcuts: g+d (dashboard), g+c (classes), etc.
    - Action shortcuts: / (focus chat), Ctrl+K (command palette), Escape (close)
    - ? shows keyboard shortcuts modal
    - Sequence detection for multi-key shortcuts (g+d)
    - Respects input field focus

26. **`src/App.jsx`** - Updated
    - Added TooltipProvider wrapper
    - Added KeyboardShortcutsProvider wrapper
    - All providers now properly nested

27. **`src/components/layout/ResponsiveLayout.jsx`** - Updated
    - Added FloatingHelpButton to all pages
    - Context detection based on current route
    - Help button hidden on auth pages

---

*End of Document*

---

**Next Steps:**
1. ~~Review this plan with stakeholders~~ ✅
2. ~~Prioritize Phase 1 tasks~~ ✅
3. ~~Begin implementation (only after approval)~ ✅ Complete
4. ~~Phase 1: All tasks complete~~ ✅
5. ~~Phase 2: All core tasks complete~~ ✅
6. ~~Deploy Firestore rules~~ ✅ (`firebase deploy --only firestore:rules`)
7. ~~Phase 3: Core admin features complete~~ ✅
8. ~~Phase 4: Polish features complete~~ ✅
9. Optional: Performance optimization (code splitting)
10. Production testing and feedback collection
