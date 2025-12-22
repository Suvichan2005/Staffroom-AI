# Staffroom - Teacher-First AI Workflow Assistant

Staffroom is evolving from a hackathon prototype into the MVP for an AI-powered, teacher-first workflow platform. The goal is simple: give educators an intelligent copilot that streamlines attendance, syllabus tracking, assignments, and cross-faculty collaboration so they can focus on teaching.

> Mission: Reduce teacher burnout and administrative overhead through intuitive, voice-enabled tools that handle the routine “work” of teaching.

> Vision: Become the indispensable AI assistant embedded in every school staff room, unifying classroom data and actionable insights across stakeholders.

## Why Staffroom

Teachers currently juggle fragmented tools, clunky ERPs, and manual spreadsheets for tasks like attendance and curriculum coverage. Staffroom addresses four core pain points:

- **Administrative overload** – logging attendance, tracking syllabus completion, grading, and reporting consume disproportionate time.
- **Admin-first software** – legacy ERPs prioritise fee collection and admissions, leaving educators with unintuitive workflows.
- **Information silos** – progress, resources, and communication are scattered across WhatsApp groups, printouts, and Excel sheets.
- **Lack of assistive intelligence** – teachers rarely have proactive suggestions on what to teach next, which student needs attention, or how to prep the next quiz quickly.

## Solution Overview

Staffroom delivers a purpose-built, workflow-native experience:

- **Teacher-centric dashboard** with classes, schedules, and actionable tasks.
- **Voice-powered logging** so progress updates like “Finished Chapter 4 in 6A Geography” are transcribed and applied automatically.
- **Embedded AI assistant** (Gemini) that recommends upcoming topics, surfaces shared resources, highlights at-risk students, and drafts assessments.
- **Unified data layer** for teachers, HODs, coordinators, and admins to access the same truth with role-based permissions.
- **Smart modules** such as substitution management — a daily pain point unserved by competitors.

## Core Modules (MVP & V1)

1. **Teacher Dashboard** – classes, upcoming sessions, “today’s actions”, AI chat/voice input, AI summary, notices.
2. **Course Workspace** – per-course sections, shared resources hub, teacher chatroom, expandable syllabus overview.
3. **Class Page** – weighted syllabus tracker with save state, attendance metrics and history, assignments/tests management, AI insight cards.
4. **Assignments & Tests** – create via modal, manage grading in modal with long student lists, track submissions/averages.
5. **Student Lookup** (planned) – quick profile lookup with attendance, grades, remarks.
6. **Smart Substitution** (post-MVP) – coordinator console with AI suggested substitutes using timetable + load balancing.

## Roles & Permissions

| Role | Focus | Key Capabilities |
|------|-------|------------------|
| IT Admin | Setup & structure | Manage accounts, upload rosters, timetables |
| Subject Teacher | Day-to-day teaching | Update syllabus, create assignments/tests, view analytics |
| Class Teacher | Section lead | Take attendance, manage student profiles, add remarks |
| HOD | Subject oversight | Review cross-section progress, edit master syllabus |
| Exam Coordinator | Assessment workflow | Map exams to syllabus, schedule tests, monitor readiness |
| Substitution Coordinator | Daily cover management | See absentees, assign substitutes, approve AI suggestions |

## Product Strategy & Roadmap

### Near-Term Action Plan (Nov–Dec 2025)

1. Complete academic obligations (lab and semester finals).
2. Finalise survey questionnaires and schedule teacher interviews.
3. Late November: run structured feedback calls and launch Google Form.
4. Kick off backend foundations (Node/Express, auth) and iterate UI based on insights.

### MVP Build Phases

1. **Phase 1 – Foundational MVP (4 weeks)**
	- Role-based auth, seeded data
	- Teacher dashboard, course/class pages (read-only)
	- Attendance capture for class teachers
2. **Phase 2 – Smart Workflows (6 weeks)**
	- CRUD for syllabus tracker, assignments, tests
	- Student lookup panel
	- Read-only HOD dashboard
3. **Phase 3 – AI & Analytics (8 weeks)**
	- Whisper voice transcription integration
	- Gemini-powered suggestions and chat
	- Smart substitution module and exam readiness insights
4. **Phase 4 – Pilot & Iteration**
	- Deploy to first department pilot (e.g., BHS)
	- Capture metrics, learn, iterate quickly

## Go-To-Market

- **Phase 1 – Validation & Pilot (0–3 months)**
  - Interviews with target teachers/professors
  - Quantitative survey to 200+ educators
  - Propose free 1-month pilot for a single department (e.g., BHS)

- **Phase 2 – Bottom-Up Adoption (3–9 months)**
  - Launch freemium product for individual teachers
  - Public landing page + “Register your school” funnel
  - Encourage teacher champions to drive internal demand

- **Phase 3 – School Contracts (9+ months)**
  - Convert pilots with ROI narratives (e.g., hours saved per week)
  - Targeted outreach using interest list
  - Offer school-wide licensing with admin/HOD capabilities

### Pricing Signals (subject to validation)

| Tier | Audience | Indicative Price (per teacher) | Highlights |
|------|----------|-----------------|------------|
| Free | Individual teacher | ₹0 | Manual attendance/syllabus, basic dashboard |
| Pro | Individual teacher | ₹250–₹500/mo | AI assistant, voice logging, unlimited classes, analytics |
| Pro+ | Schools | ₹600-1000/mo | All Pro features for staff + admin console, substitution, central support |
* will provide a week of free trial of pro to individual teachers, and also for school demos for one department

## Technology & Architecture

- **Frontend**: React + Vite, Tailwind CSS.
- **Backend**: Node.js + Express (API-first approach).
- **Database**: MongoDB Atlas to support flexible syllabus/topic schemas.
- **AI Services**: Gemini (Google) for generation and insights, Whisper (OpenAI) for voice transcription.
- **Hosting**: Vercel (frontend), Render/AWS (backend) with CI/CD via GitHub.

### Data Model Snapshot

- `users`: role, departments, assigned classes
- `classes`: timetable, class teacher, student roster
- `students`: profile, attendance history, assignment/test results
- `attendance`: per-day records with status per student
- `syllabus`: chapters, sub-topics, status per class section
- `assignments` & `tests`: due dates, submissions, grading metadata
- `substitutions`: absent teacher, recommended substitute, status
- `resources`: shared files by grade/subject/topic

## Current Implementation Status

- React frontend scaffold with dashboard, course, and class experiences
- Local dummy data aligned with planned Mongo schema
- Voice and AI interactions prototyped in UI (backed by mocks)
- Assignment and test management modals for scalable grading workflows
- Attendance capture modal with history & metrics
- Shared resources UI and AI summary cards integrated

## Team & Contributors

- **Suvansh Agarwal** – Product lead & frontend engineering, driving vision and UX.
- **Aksha** – Backend, infrastructure, and cybersecurity partner (joining post-exams for API, deployment, and data hardening).
- **Advisors & Champion Teachers** – Ongoing conversations with educators from BHS and KIIT.

## Getting Started (Developers)

```powershell
# inside ./frontend
npm install
npm run dev
```

Open the provided local URL (default http://localhost:5173). The project currently uses mock data; backend integration will land post-auth setup.

## Next Steps for Contributors

1. Stand up backend skeletal service (auth, syllabus, attendance endpoints).
2. Integrate voice transcription pipeline against local mocks for end-to-end demo.
3. Prepare teacher feedback scripts and survey distribution list.

---

Staffroom is building the AI-powered staff room teachers deserve. Contributions, feedback, and pilot interest are welcome — reach out if you’d like to help shape the future of teacher-first software.
