# Staffroom AI — Critical Improvement Analysis

> **Date**: March 2026  
> **Scope**: Architecture, AI capabilities, security, performance, cost, analytics, and teacher experience  
> **Status**: Analysis only — no implementation changes

---

## Table of Contents

1. [Making Staffroom More Agentic](#1-making-staffroom-more-agentic)
2. [Saving More Time for Teachers](#2-saving-more-time-for-teachers)
3. [Better Data & Analytics Representation](#3-better-data--analytics-representation)
4. [Cost Efficiency](#4-cost-efficiency)
5. [Performance Improvements](#5-performance-improvements)
6. [What Else Can We Solve](#6-what-else-can-we-solve)
7. [Security Flaws](#7-security-flaws)
8. [How to Fix the Security Flaws](#8-how-to-fix-the-security-flaws)

---

## 1. Making Staffroom More Agentic

### Current State

The system already has strong agentic foundations:
- 25+ tool declarations available to the LLM via function calling
- Iterative multi-step tool execution (up to 5 rounds per conversation turn)
- Voice + text share the same tool set
- Navigation, attendance, syllabus tracking, class management, and data queries all handled through tool calls

### Critical Improvements

#### 1.1 Autonomous Multi-Turn Planning (Agent Loop)

**Gap**: The current agent can execute chains of tool calls within a single turn, but it has no concept of *planning*. It reacts to the current user message and decides tools call-by-call.

**Recommendation**: Introduce a **planner layer** that decomposes complex teacher requests into sub-goals before executing. For example, "Prepare everything for tomorrow's Geography class" should:
1. Check the schedule for tomorrow's Geography sections
2. Look up syllabus progress for each section
3. Identify what topics to cover next
4. Generate a daily plan with time allocations
5. Pre-generate quiz questions for review
6. Flag students with attendance concerns

Currently, the teacher would need to ask each of these as separate prompts. A planner agent would handle the full workflow autonomously.

#### 1.2 Proactive Agent Actions (Background Agents)

**Gap**: The AI is entirely reactive — it only acts when the teacher sends a message.

**Recommendation**: Add **background agents** that trigger without teacher initiation:
- **Morning Briefing Agent**: Auto-runs at the start of each school day, compiles a briefing with today's classes, pending grading, students at risk, and syllabus gaps
- **Attendance Anomaly Agent**: After attendance is marked, automatically flags students with 3+ consecutive absences or declining trends
- **Syllabus Drift Agent**: Weekly check that compares actual syllabus progress against the academic calendar and alerts the teacher if they're falling behind
- **Deadline Reminder Agent**: Monitors upcoming assignment deadlines and prompts teachers to prepare grading rubrics or follow up on low submission rates

#### 1.3 Memory & Long-Term Context

**Gap**: Each conversation session starts with only injected context (current class, student list, syllabus state). The AI has no memory of prior observations, teacher preferences, or past interactions beyond the current session's message history.

**Recommendation**: Implement a **teacher memory store**:
- Track teacher preferences: "This teacher always wants quizzes with 10 questions", "This teacher prefers to start class with attendance"
- Store observations: "Ravi has been absent 4 of last 5 classes", "Section 6A is 2 weeks behind Section 6C on the same syllabus"
- Cross-session continuity: "Last session, the teacher asked about remedial material for plate tectonics — follow up on whether they used it"

This could be implemented as a structured Firestore collection (`users/{uid}/memory`) with vector embeddings for semantic retrieval.

#### 1.4 Tool Composition & Higher-Order Tools

**Gap**: Tools are flat — each tool does one atomic operation. Complex workflows require the LLM to chain many calls.

**Recommendation**: Add **composite tools** that encapsulate common multi-step workflows:
- `endOfClassRoutine(sectionId)` → marks syllabus progress + saves notes + generates homework suggestion + logs activity
- `weeklyReport(courseId)` → aggregates attendance + syllabus progress + assignment submissions into a formatted report
- `studentProfile(studentId)` → combines attendance history + performance data + teacher notes into a comprehensive view

#### 1.5 Multi-Agent Orchestration

**Gap**: There's a single AI agent handling all tasks. As capability grows, a single prompt/context window becomes limiting.

**Recommendation**: Move toward a **multi-agent architecture**:
- **Router Agent**: Classifies the teacher's intent and delegates to specialist agents
- **Syllabus Agent**: Deep expertise in curriculum pacing, topic dependencies, and pedagogical sequencing
- **Data Agent**: Handles all analytics queries with SQL-like precision
- **Admin Agent**: Manages class/student CRUD operations
- **Content Agent**: Generates quizzes, assignments, and educational materials

Each agent gets a focused system prompt and a relevant subset of tools, reducing context pollution and improving accuracy.

#### 1.6 Tool Result Reflection & Self-Correction

**Gap**: When a tool call returns an error or unexpected result, the LLM's behavior is not explicitly guided. There's no retry-with-different-parameters logic or graceful degradation.

**Recommendation**: Add a **reflection step** after each tool execution:
- If `searchTopic` returns no results, the agent should try alternative search terms before telling the teacher "topic not found"
- If `markAttendance` fails for a student, the agent should suggest the closest matching name
- Build a structured error → recovery mapping so the agent can autonomously resolve common failures

---

## 2. Saving More Time for Teachers

### Current State

Teachers can currently:
- Mark attendance by voice (including bulk/exception patterns)
- Track syllabus progress through natural language
- Generate quizzes and assignments via chat
- Navigate the app by voice
- View schedules and student insights via chat

### Critical Improvements

#### 2.1 One-Command Class Session Flow

**Gap**: Starting a class still requires multiple actions: navigate to the class, open attendance, mark students, switch to syllabus, update progress.

**Recommendation**: Introduce a **"Start Class" command** that:
1. Auto-detects the current class from the timetable and time
2. Opens attendance mode immediately
3. After attendance, transitions to the syllabus view for that section
4. At class end, prompts for syllabus progress update and notes
5. Total interaction: 1 tap to start, voice commands during class, 1 tap to end

#### 2.2 Predictive Auto-Fill

**Gap**: The system doesn't learn from teacher patterns.

**Recommendation**:
- **Attendance patterns**: If a student has been present every day for a month, pre-mark them as present by default. Teacher only needs to confirm exceptions
- **Syllabus pacing**: Auto-suggest the next topic based on the teacher's historical pace (not just the next in order)
- **Assignment templates**: After a teacher creates several assignments for a course, learn the format/style and auto-populate templates

#### 2.3 Batch Operations Across Sections

**Gap**: If a teacher has the same course across 3 sections (e.g., Geography for 6A, 6C, 8A), updates must be done section by section.

**Recommendation**: Enable **cross-section batch operations**:
- "I covered Chapter 4 in all my Geography sections today" → applies to 6A, 6C, etc.
- "Create a quiz on Rivers for all Grade 6 sections" → generates and distributes to multiple sections
- "Show me attendance comparison across all my sections" → side-by-side view

#### 2.4 Smart Notifications & Digests

**Gap**: No notification system exists. Teachers must proactively check for updates.

**Recommendation**:
- **Push notifications** for: upcoming classes (5 min reminder), assignment deadline reminders, students reaching critical absence thresholds
- **Weekly digest email/report**: Syllabus progress summary, attendance trends, top concerns — auto-generated, zero teacher effort
- **Escalation alerts**: "3 students in 8B have missed 5+ classes this month — consider parent contact"

#### 2.5 Document Intelligence

**Gap**: Document parsing (CSV, PDF, images via Gemini Vision) exists but isn't deeply integrated with workflows.

**Recommendation**:
- **Syllabus auto-import**: Upload a PDF syllabus → AI extracts chapters, topics, subtopics, and page ranges → auto-creates the syllabus structure in the system
- **Student list auto-import**: Upload a class roster (Excel/CSV) → AI parses names, roll numbers, and creates student records
- **Answer sheet scanning**: Upload photos of handwritten answer sheets → AI provides preliminary grading suggestions (long-term vision)
- **Timetable OCR**: Photograph a printed timetable → AI extracts schedule and populates the system

#### 2.6 Quick Actions Dashboard Widget

**Gap**: The dashboard provides information but doesn't minimize clicks for frequent actions.

**Recommendation**: Add a **"Quick Actions" panel** showing:
- The current/next class with a one-tap "Start Class" button
- Most likely action based on time of day (e.g., mark attendance in the morning, update syllabus after class)
- Unresolved items: unanswered student questions, pending assignment reviews
- Voice activation button always visible (not buried in the chat page)

---

## 3. Better Data & Analytics Representation

### Current State

Analytics exist for syllabus (pie charts, bar charts, progress matrices, behind-schedule alerts) and attendance (trends, patterns). All using Recharts with standard chart types.

### Critical Improvements

#### 3.1 Comparative Analytics

**Gap**: Analytics are per-section only. Teachers can't compare across sections, time periods, or against benchmarks.

**Recommendation**:
- **Section-vs-section comparison**: Side-by-side syllabus progress bars for all sections of the same course
- **Year-over-year**: "How does this batch's progress compare to last year's at this point?"
- **Teacher benchmarks**: Anonymous comparison against department averages (for HOD view)
- **Pace tracking**: Overlay actual progress against planned pacing guide on a timeline chart

#### 3.2 Predictive Analytics

**Gap**: All analytics are backward-looking (what happened). No forward projection.

**Recommendation**:
- **Syllabus completion forecast**: "At your current pace, you'll complete the syllabus by [date] — 2 weeks before exams" or "you'll be 3 chapters short"
- **Student risk scoring**: Predictive model combining attendance + assignment performance → probability of failing, flagged early
- **Workload forecasting**: "Next week will be heavy — 3 assignment deadlines + 2 tests to grade"

#### 3.3 Interactive & Drill-Down Visualizations

**Gap**: Charts are static. Can't click into a data point for details.

**Recommendation**:
- Click on a student in the attendance chart → drill down to that student's full attendance history
- Click on a topic in the syllabus progress → see when it was covered in each section, completion notes, related quiz scores
- Click on a day in the heatmap → see all activities, classes, and events for that day
- Use **Recharts interactivity** (already available but underused): tooltips, click handlers, brush for date range selection

#### 3.4 Natural Language Analytics

**Gap**: Teachers must navigate to specific analytics pages and interpret charts themselves.

**Recommendation**: Let teachers ask analytics questions in natural language via chat:
- "How is Section 6A doing compared to 6C?" → comparative chart rendered inline
- "Which students have attendance below 75%?" → filtered table with actionable insights
- "What's my slowest-progressing section?" → answer with data and suggested remediation
- "Show me a trend of my syllabus progress this semester" → inline time-series chart

This requires adding **chart rendering tools** to the AI's tool set, and inline chart components in the chat interface.

#### 3.5 Exportable Reports

**Gap**: No export functionality for analytics.

**Recommendation**:
- **PDF report generation**: One-click export of syllabus progress, attendance records, and student performance reports — useful for parent-teacher meetings, HOD reviews, and compliance
- **Excel/CSV export**: Raw data export for teachers who want to do their own analysis
- **Printable report cards**: Auto-generated student report cards combining all available data

#### 3.6 Dashboard Customization

**Gap**: Dashboards show a fixed layout. Different teachers have different priorities.

**Recommendation**:
- **Widget-based dashboard**: Teachers can choose which analytics cards to display and reorder them
- **Pinned metrics**: Teacher pins "Section 8B attendance" to always see it front and center
- **Quick filters**: Toggle between "Today", "This Week", "This Month", "This Semester" across all analytics

---

## 4. Cost Efficiency

### Current State

**Cost Risks Identified**:
| Risk | Estimated Impact | Root Cause |
|------|------------------|------------|
| Unbounded AI API calls | $$$$$ | API keys exposed client-side; no auth on Cloud Functions |
| No per-user quotas | $$$ | No daily/monthly limits per teacher |
| Expensive model defaults | $$ | `gpt-5-mini` / `gemini-2.5-pro` used for simple tasks |
| Audio session costs | $$ | Gemini Live / Azure Realtime billed per session-minute |
| Firestore activity logging | $ | Every navigation, click, and AI call creates a new document |
| No spending alerts | $$ | No budget cap mechanism visible in the codebase |

### Critical Improvements

#### 4.1 Intelligent Model Routing

**Gap**: Model selection is coarse — "fast" vs "complex" via `getDeploymentForUseCase`. Simple tasks like "what time is my next class?" hit the same model as "analyze this student's performance across 6 months."

**Recommendation**: Implement **tiered model routing**:
| Task Type | Recommended Model | Est. Cost Ratio |
|-----------|-------------------|:-----:|
| Greetings, navigation, simple facts | Rule-based (no LLM) | 0x |
| Attendance parsing, data lookups | Gemini Flash / GPT-4o-mini | 1x |
| Syllabus analysis, quiz generation | Gemini Flash | 1x |
| Complex analysis, report generation | Gemini Pro / GPT-4.1 | 10x |
| Voice interaction | Gemini Live (audio-native) | 20x |

Add a **classifier** (could be a small local model or rule-based) that routes to the cheapest model capable of handling the task.

#### 4.2 Aggressive Caching

**Gap**: Identical or near-identical queries hit the LLM every time. "What's my schedule today?" produces the same answer whether asked at 8:01 or 8:02.

**Recommendation**:
- **Response caching**: Cache AI responses keyed by (user, intent-hash, date). TTL: 5 minutes for dynamic data, 24 hours for static content
- **Tool result caching**: Cache `getSchedule`, `getAvailableCourses`, `getSyllabus` results for the duration of a session. Invalidate only on writes
- **Quiz/assignment caching**: Generated content doesn't change — cache permanently and allow teachers to regenerate only if they explicitly request it

#### 4.3 Per-User Quotas & Spending Controls

**Gap**: No mechanism to prevent a single user from making hundreds of AI requests per day.

**Recommendation**:
- Set **daily AI call limits** per user (e.g., 50 text queries + 30 minutes voice per day)
- Display remaining quota in the UI so teachers self-regulate
- Implement **quota tiers** (e.g., free tier: 20 calls/day, school plan: 100 calls/day)
- Add **budget alerts** at the infrastructure level (Google Cloud Budget Alerts, Azure Cost Management)
- Monthly cost reports per school/department for administrators

#### 4.4 Reduce Firestore Operations

**Gap**: Activity logging writes a new Firestore document for every navigation, AI call, auth event, and error. Real-time listeners (2 per active user) generate continuous reads.

**Recommendation**:
- **Batch activity logs**: Buffer logs locally for 30 seconds, then write a single document with a `logEntries[]` array — reduces writes by 10-50x
- **Lazy-load chat sessions**: Don't subscribe to the full session list in real-time. Load the list on demand and only subscribe to the *active* session
- **Compress chat history**: Old sessions with 50+ messages can be summarized and archived to reduce read sizes
- **Use Firestore TTL**: Auto-delete activity logs older than 90 days
- Consider **BigQuery export** for analytics on historical logs instead of querying Firestore directly

#### 4.5 Voice Session Optimization

**Gap**: Gemini Live and Azure Realtime sessions are expensive per-minute. Sessions may stay open while the teacher is not speaking.

**Recommendation**:
- **Auto-disconnect after 30 seconds of silence** — the current implementation doesn't have explicit idle timeouts
- **Downgrade to text** for follow-up questions that don't need voice: "I see you've been quiet for a bit — switching to text mode to save resources"
- **Limit voice session duration** (e.g., 10-minute cap with option to extend)
- **Use browser-side STT (Web Speech API) → text → LLM** as the default voice path. Only use server-side realtime audio for complex conversations requiring low latency

#### 4.6 Client-Side Intelligence

**Gap**: Every interaction routes through an LLM, even simple deterministic tasks.

**Recommendation**: Handle these **without an LLM call**:
- Schedule queries → local lookup from cached schedule data
- "Navigate to [page]" → regex/keyword match on known routes
- "Mark all present" → direct function call, no LLM needed
- Basic math ("How many students in 6A?") → count from local data
- Template responses ("Good morning!") → no LLM needed

Add a **pre-processor** before the AI pipeline that catches deterministic queries and returns instant results.

---

## 5. Performance Improvements

### Current State

- Lazy loading for most pages via `React.lazy()` + `Suspense`
- Manual chunk splitting for vendor libraries (react, firebase, motion)
- localStorage caching for chat sessions and syllabus progress
- Before-unload handler to prevent data loss

### Critical Improvements

#### 5.1 File Size & Bundle Optimization

**Gap**: Several critical files are excessively large:
| File | Lines | Concern |
|------|-------|---------|
| `aiService.js` | 4,454 | Maintenance nightmare, tree-shaking impossible |
| `AIContext.jsx` | 1,864 | Single context re-renders entire tree on any AI state change |
| `dummyData.js` | 1,192 | Ships in production bundle even if unused |

**Recommendation**:
- **Split `aiService.js`** into modules: `tool-definitions.js`, `tool-executors.js`, `prompt-builder.js`, `chat-processor.js`, `quiz-generator.js`, `assignment-generator.js`
- **Split `AIContext.jsx`** into focused contexts: `ChatContext`, `VoiceContext`, `SessionContext`. This also eliminates unnecessary re-renders when voice state changes trigger chat component re-renders
- **Conditionally load `dummyData.js`** only when `VITE_USE_MOCK_DATA=true` using dynamic `import()`. Strip it from production builds
- **Tree-shake tool declarations**: Only include tools relevant to the current page context (e.g., don't load syllabus tools on the admin dashboard)

#### 5.2 AudioWorklet Migration

**Gap**: Both `geminiLiveService.js` and `azureRealtimeProvider.js` use the deprecated `ScriptProcessorNode` for audio processing. This runs on the main thread and causes jank during voice interactions.

**Recommendation**: Migrate to `AudioWorklet` which runs on a dedicated audio thread:
- Eliminates UI freezing during voice recording/playback
- Better supported in modern browsers
- Required for Web Audio API compliance going forward

#### 5.3 React Rendering Optimization

**Gap**: `AIContext` provides a single monolithic value object that changes on every message, causing all consumers to re-render.

**Recommendation**:
- Use `useMemo` / `useCallback` extensively for context value objects
- Split into multiple contexts (as noted in 5.1)
- Implement `React.memo()` on heavy components (chart containers, message lists)
- Use **virtualized lists** (`react-window` or `@tanstack/virtual`) for chat message history (50+ messages cause layout thrashing)

#### 5.4 Network Optimization

**Gap**: No prefetching, no service worker, no offline support.

**Recommendation**:
- **Service Worker**: Cache the app shell for instant loads. Pre-cache frequently accessed data (schedule, student lists)
- **Prefetch**: When the teacher opens the dashboard, prefetch data for the next likely class
- **Stale-While-Revalidate**: Show cached data immediately, update in background (especially for schedules, student lists)
- **Connection-aware loading**: Detect slow connections (via `navigator.connection`) and reduce data fetching aggressiveness, disable auto-loading of analytics charts

#### 5.5 Startup Performance

**Gap**: The app loads Firebase, AI services, and provider health checks on initial render.

**Recommendation**:
- **Defer AI initialization** until the chat page is opened (not on app load)
- **Remove health check on boot**: The circuit breaker calls `healthCheck()` on every provider initialization. Skip this for providers not yet used
- **Lazy-load Firebase Auth listeners** — use a lightweight auth check first, then hydrate the full auth context
- **Code-split Firebase SDK**: Only import `firebase/firestore` on pages that use Firestore, `firebase/auth` on auth pages

#### 5.6 Image & Asset Optimization

**Gap**: No evidence of image optimization, WebP/AVIF usage, or responsive images.

**Recommendation**:
- Serve images in modern formats (WebP/AVIF) with fallbacks
- Use `loading="lazy"` on below-fold images
- Implement responsive `srcset` for different screen densities
- Use SVG for icons/illustrations instead of raster images where possible

---

## 6. What Else Can We Solve

### 6.1 Parent Communication Bridge

**Problem**: Teachers spend significant time on parent communication — progress reports, behavior notes, absence notifications.

**Solution**: AI-powered parent communication:
- Auto-generate parent update messages based on student data
- Template library for common communications (absence follow-up, commendation, concern)
- Suggested parent meeting agenda based on student performance data
- Multi-language support for parent communication

### 6.2 Substitute Teacher Handoff

**Problem**: When a teacher is absent, the substitute has zero context.

**Solution**: One-click "Substitute Briefing" that generates:
- Current syllabus position for each section
- Class management notes (seating arrangements, students needing attention)
- Pre-planned activities for the day
- Student context cards with photos and key notes

### 6.3 Exam & Assessment Workflow

**Problem**: Exam preparation, paper setting, and grading are time-intensive.

**Solution**:
- **Question Bank**: AI generates and stores questions tagged by topic, difficulty, and Bloom's taxonomy level
- **Paper Generator**: "Create a 50-mark test on Chapters 3-5 with 30% easy, 50% medium, 20% hard"
- **Answer Key Generator**: Auto-generate marking schemes
- **Grade Analytics**: After inputting scores, auto-generate class performance analytics, identify topic-wise weak areas

### 6.4 Collaborative Planning

**Problem**: Teachers teaching the same course in different sections have no collaboration tools.

**Solution**:
- Shared syllabus pacing across teachers for the same course
- Cross-teacher resource sharing (quizzes, assignments, materials)
- Department-level planning calendar
- "Teacher A covered this topic with this approach and quiz — would you like to reuse?"

### 6.5 Student Wellness & Behavior Tracking

**Problem**: Behavioral patterns and wellness concerns are often tracked on paper or in teacher memory.

**Solution**:
- Quick-log behavior observations via voice: "Note: Ravi was disruptive in class today"
- Pattern detection: "Ravi has had 3 behavior incidents this month — trending upward"
- Wellness check-ins: Attend to social-emotional learning (SEL) metrics
- Integration with counselor workflow

### 6.6 Professional Development Tracking

**Problem**: Teachers need to track their own professional development hours and certifications.

**Solution**:
- Log PD hours and activities
- AI-suggest relevant PD opportunities based on teaching subject and gaps
- Auto-generate PD portfolio for appraisals

### 6.7 Classroom Resource Management

**Problem**: Lab equipment, library books, AV equipment — tracking shared resources is chaotic.

**Solution**:
- Resource booking system: "Book the projector for 8A Geography on Tuesday"
- Availability calendar for shared resources
- AI-assisted conflict resolution: "The projector is booked — would 3rd period work instead?"

### 6.8 Offline-First Architecture

**Problem**: Many schools have unreliable internet. The app currently requires connectivity for all AI features.

**Solution**:
- Local-first data storage with sync when online
- Queue AI requests offline and process when connectivity returns
- Pre-cache likely needed data (today's classes, student lists, recent syllabus)
- Degrade gracefully: allow manual attendance and syllabus updates offline

---

## 7. Security Flaws

### CRITICAL Severity

#### 7.1 Client-Side API Key Exposure
**All AI provider API keys are bundled into the client-side JavaScript** and are extractable from browser DevTools.

| Exposed Key | Files |
|-------------|-------|
| `VITE_GEMINI_API_KEY` | `aiService.js`, `geminiProvider.js`, `geminiVoiceProvider.js`, `documentParserService.js` |
| `VITE_AZURE_OPENAI_API_KEY` | `aiApiClient.js`, `azureProvider.js`, `azureVoiceProvider.js`, `azureRealtimeProvider.js` |
| `VITE_OPENAI_API_KEY` | `voiceService.js` |

**Impact**: Anyone can extract these keys and make unlimited billed API calls. The `USE_PROXY` flag in `aiApiClient.js` is **hardcoded to `false`**, meaning the Cloud Functions proxy (which properly uses server-side secrets) is entirely bypassed even in production.

#### 7.2 `getLiveToken` Returns Raw API Key
The Cloud Function `getLiveToken` constructs a WebSocket URL containing the raw Gemini API key and returns it to the client:
```
wss://generativelanguage.googleapis.com/...?key=${apiKey}
```
**Impact**: The key is visible in network responses and can be extracted for unrestricted Gemini API access. The `expiresIn: 3600` is cosmetic — the key itself never expires.

#### 7.3 Cloud Functions Have No Authentication
**None** of the Cloud Functions (`aiGenerate`, `transcribe`, `azureGenerate`, `getLiveToken`) verify Firebase Auth tokens. Any unauthenticated HTTP request can invoke them.

**Impact**: An attacker doesn't even need a Staffroom account to consume AI API quota.

### HIGH Severity

#### 7.4 Client-Side Admin Authorization
`AdminRoute` checks admin status via a hardcoded email list and a `persona` field from client-side React context. Both can be manipulated via browser DevTools.

**Impact**: Any user can access admin features by modifying the `persona` state.

#### 7.5 No Role-Based Access on HOD Dashboard
The `/hod-dashboard` route uses `ProtectedRoute` which only checks `user !== null`. Any authenticated user can access HOD-level analytics and cross-teacher comparisons.

#### 7.6 Inconsistent Admin Email Lists
| Location | Admin Emails |
|----------|-------------|
| `firestore.rules` | `admin@staffroom.ai`, `suvichan2005@gmail.com`, `suvanshagar@gmail.com` |
| `AdminRoute.jsx` | `suvanshagar@gmail.com` only |

**Impact**: Two of the three rule-defined admins can't access admin UI routes. Rules and UI have different security boundaries.

### MEDIUM Severity

#### 7.7 CORS Configuration Vulnerability
Cloud Functions use `origin.includes('.web.app')` and `origin.includes('.firebaseapp.com')` for CORS checks. An attacker can create `evil.web.app` or `anything.firebaseapp.com` domains that pass this check.

#### 7.8 Ineffective Rate Limiting
The rate limiter uses an **in-memory `Map()`** that:
- Resets on every Cloud Function cold start
- Is not shared across function instances (`maxInstances: 10` = 10 independent stores)
- Only rate-limits by IP, not by authenticated user
- Effective limit: ~300 requests/min total (30/min × 10 instances) — essentially no limit

#### 7.9 Firestore Attendance Rules Too Permissive
```
allow create: if isAuthenticated()
```
Any authenticated user can create attendance records for **any** teacher's class. There is no ownership verification on creation.

#### 7.10 No Input Validation on Cloud Functions
- `history`, `tools`, `systemInstruction` arrays are passed directly to AI APIs without validation — **prompt injection vector**
- `azureGenerate` validates `messages` as an array but not individual message structure
- No max-length limit on Azure message content (only Gemini has 32K char limit)
- Audio uploads have size limit (25MB) but no MIME type validation

### LOW Severity

#### 7.11 Third-Party IP Tracking
`activityLogger.js` calls `https://api.ipify.org` to capture user IP. This leaks user activity metadata to a third party and fails silently if the service is blocked.

#### 7.12 Silent Logging Failures
`saveToFirestore` in `activityLogger.js` catches all errors silently. If Firestore logging breaks, there's no indication — audit trail integrity is silently compromised.

#### 7.13 Hardcoded Admin Emails in Firestore Rules
Admin identity is managed by hardcoding email addresses in security rules. Adding/removing admins requires redeploying Firestore rules.

#### 7.14 Deprecated ScriptProcessorNode
`ScriptProcessorNode` usage in audio services runs on the main thread and is deprecated. While not a direct security vulnerability, it creates a DoS vector where malicious audio streams could freeze the UI.

---

## 8. How to Fix the Security Flaws

### 8.1 Fix API Key Exposure (Fixes 7.1, 7.2)

**Priority: IMMEDIATE**

1. **Set `USE_PROXY = true`** in production or, better yet, remove the flag entirely and always route through Cloud Functions in production builds:
   ```js
   const USE_PROXY = import.meta.env.PROD; // true in production, false in dev
   ```

2. **Remove all `VITE_*` API key references from client code** in production. Use build-time environment checks:
   ```js
   const apiKey = import.meta.env.DEV ? import.meta.env.VITE_GEMINI_API_KEY : null;
   if (!apiKey && !import.meta.env.PROD) throw new Error('Missing API key for dev mode');
   ```

3. **Fix `getLiveToken`**: Instead of returning the raw API key in the WebSocket URL, proxy the WebSocket connection through a Cloud Function or generate a short-lived token:
   - Option A: Server-side WebSocket proxy (Firebase Functions → Gemini, client → Firebase Functions)
   - Option B: Use Gemini's OAuth-based authentication instead of API keys for WebSocket connections

4. **Strip API keys from Vite build**: Add a Vite plugin that errors if `VITE_*_API_KEY` appears in the production bundle.

### 8.2 Add Authentication to Cloud Functions (Fixes 7.3)

**Priority: IMMEDIATE**

Add Firebase Auth token verification to every Cloud Function:

```js
// Middleware pattern for all functions
function requireAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded; // { uid, email, ... }
  } catch (e) {
    res.status(403).json({ error: 'Invalid token' });
    return null;
  }
}

// Usage in each function:
const user = await requireAuth(req, res);
if (!user) return;
```

On the client side, include the Firebase Auth token in all API requests:
```js
const token = await auth.currentUser.getIdToken();
fetch(url, { headers: { Authorization: `Bearer ${token}` } });
```

### 8.3 Implement Server-Side Role-Based Access Control (Fixes 7.4, 7.5, 7.6, 7.13)

**Priority: HIGH**

1. **Use Firebase Custom Claims** instead of hardcoded email lists:
   ```js
   // Admin script to set claims:
   admin.auth().setCustomUserClaims(uid, { role: 'admin' }); // or 'hod', 'teacher'
   ```

2. **Check claims server-side** in Cloud Functions:
   ```js
   const decoded = await admin.auth().verifyIdToken(token);
   if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
   ```

3. **Check claims in Firestore Rules**:
   ```
   function isAdmin() {
     return request.auth.token.role == 'admin';
   }
   ```

4. **Mirror claims on client** for UI display only (not security):
   ```js
   const { claims } = await user.getIdTokenResult();
   setIsAdmin(claims.role === 'admin');
   ```

5. Gate `/hod-dashboard` with a new `HODRoute` component that checks `claims.role === 'hod' || claims.role === 'admin'`.

### 8.4 Fix CORS (Fixes 7.7)

**Priority: HIGH**

Replace `includes()` with exact-match allowlists:

```js
const ALLOWED_ORIGINS = [
  'https://staffroom-ai.web.app',
  'https://staffroom-ai.firebaseapp.com',
  'http://localhost:5173',    // dev only, guard with env check
  'http://localhost:3000',
];

if (ALLOWED_ORIGINS.includes(origin)) {
  res.set('Access-Control-Allow-Origin', origin);
} else {
  return res.status(403).json({ error: 'Origin not allowed' });
}
```

Also remove `cors: true` from `aiGenerate` and use manual CORS everywhere for consistency.

### 8.5 Implement Persistent Rate Limiting (Fixes 7.8)

**Priority: HIGH**

Replace the in-memory `Map()` with a **Firestore-based or Redis-based rate limiter**:

```js
// Firestore approach:
async function checkRateLimit(userId, limit = 50) {
  const windowStart = new Date(Date.now() - 60000); // 1 minute window
  const ref = db.collection('rateLimits').doc(userId);
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data() || { requests: [] };
    const recent = data.requests.filter(t => t > windowStart);
    if (recent.length >= limit) return false;
    recent.push(new Date());
    tx.set(ref, { requests: recent });
    return true;
  });
}
```

Combine with **per-user limits** (not just per-IP) now that auth is enforced. Implement daily quota tracking:

```
users/{uid}/usage/{date}: { aiCalls: 47, voiceMinutes: 12.5, tokensUsed: 123456 }
```

### 8.6 Fix Firestore Attendance Rules (Fixes 7.9)

**Priority: MEDIUM**

Add ownership verification:

```
match /attendance/{doc} {
  allow create: if isAuthenticated() 
    && request.resource.data.teacherId == request.auth.uid;
  allow update: if isAuthenticated() 
    && (resource.data.teacherId == request.auth.uid || isAdmin());
  allow read: if isAuthenticated();
  allow delete: if isAdmin();
}
```

### 8.7 Add Input Validation to Cloud Functions (Fixes 7.10)

**Priority: MEDIUM**

```js
function validateMessages(messages) {
  if (!Array.isArray(messages)) throw new Error('messages must be array');
  if (messages.length > 100) throw new Error('Too many messages');
  for (const msg of messages) {
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      throw new Error('Invalid role');
    }
    if (typeof msg.content !== 'string') throw new Error('Content must be string');
    if (msg.content.length > 32000) throw new Error('Content too long');
  }
  return messages;
}

// Validate tools array
function validateTools(tools) {
  if (!Array.isArray(tools)) return [];
  if (tools.length > 50) throw new Error('Too many tools');
  // Validate each tool has name, description, parameters
  return tools.filter(t => t.name && t.description);
}
```

Add MIME type validation for audio uploads and strict schema validation for all input payloads.

### 8.8 Minor Fixes (Fixes 7.11, 7.12, 7.14)

- **IP tracking**: Remove third-party IP lookup. If needed, capture IP server-side from Cloud Function request headers (`req.ip` or `x-forwarded-for`)
- **Silent failures**: Add error alerting to the logging system — if Firestore writes fail 3 times consecutively, trigger a notification channel (email/Slack)
- **ScriptProcessorNode**: Migrate to `AudioWorklet` (see Performance section 5.2)

---

## Priority Matrix

| # | Fix | Severity | Effort | Priority |
|---|-----|----------|--------|----------|
| 8.1 | API key exposure | CRITICAL | Medium | **P0 — Do Now** |
| 8.2 | Cloud Function auth | CRITICAL | Low | **P0 — Do Now** |
| 8.3 | RBAC with custom claims | HIGH | Medium | **P1 — This Sprint** |
| 8.4 | CORS fix | HIGH | Low | **P1 — This Sprint** |
| 8.5 | Persistent rate limiting | HIGH | Medium | **P1 — This Sprint** |
| 4.1 | Model routing for cost | HIGH | Medium | **P1 — This Sprint** |
| 4.3 | Per-user quotas | HIGH | Medium | **P1 — This Sprint** |
| 8.6 | Attendance rules fix | MEDIUM | Low | **P2 — Next Sprint** |
| 8.7 | Input validation | MEDIUM | Low | **P2 — Next Sprint** |
| 5.1 | File splitting / bundling | MEDIUM | High | **P2 — Next Sprint** |
| 1.2 | Proactive agents | HIGH (value) | High | **P2 — Next Sprint** |
| 2.1 | One-command class flow | HIGH (value) | Medium | **P2 — Next Sprint** |
| 3.4 | NL analytics queries | MEDIUM (value) | High | **P3 — Roadmap** |
| 1.5 | Multi-agent orchestration | HIGH (value) | Very High | **P3 — Roadmap** |

---

## Summary

Staffroom AI has a strong foundation with its multi-provider AI system, 25+ tool declarations, iterative function calling, and bidirectional voice. The core agentic loop works. However, there are **critical security gaps** (exposed API keys, unauthenticated Cloud Functions) that must be fixed **before any public deployment**, and significant opportunities to:

1. **Go deeper on agentic behavior** — planning, proactive actions, memory, and multi-agent architecture
2. **Eliminate teacher friction** — one-command class flows, predictive auto-fill, batch cross-section operations
3. **Make data actionable** — predictive analytics, natural language queries, drill-down interactivity
4. **Control costs** — intelligent model routing, caching, per-user quotas, voice session optimization
5. **Ship production-grade security** — server-side key management, RBAC, proper rate limiting

The most impactful immediate actions are fixing the security critical issues (P0), then implementing cost controls (P1), followed by the teacher time-saving features that differentiate the product.
