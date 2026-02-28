# SECTION B — SYSTEM DESIGN PRINCIPLES

> **Purpose:** Establish non-negotiable constraints that govern all architectural decisions  
> **These principles must be satisfied by every component, feature, and technology choice**

---

## Core Philosophy

**Staffroom is a Teacher Operating System, not an LMS.**

This distinction matters:
- LMS: Student-centric, content delivery, assessments, grades
- Teacher OS: Teacher-centric, classroom operations, time savings, invisible infrastructure

Teachers operate under extreme constraints:
- **30-40 students** demanding attention
- **Noisy classrooms** (70+ dB ambient noise)
- **Weak/intermittent internet** (especially in tier-2/3 cities)
- **5-minute transitions** between classes
- **Zero tolerance for technology that wastes time**

Every design decision must respect these realities.

---

## The Seven Principles

### Principle 1: Voice > UI

**Statement:** Voice input must be the fastest path to any action.

**Rationale:**
- Teachers' hands are occupied (chalk, papers, gestures)
- Looking at a screen breaks eye contact with students
- Voice is 3x faster than typing for most teachers
- Noisy classrooms are solvable with modern STT

**Constraints:**
- Every core action (attendance, syllabus, navigation) must have voice path
- Voice latency budget: <500ms from speech end to visible feedback
- Fallback to touch must exist but not be primary
- Voice must work in 70dB ambient noise

**Anti-patterns:**
- ❌ "Click the attendance button, then select each student"
- ❌ "Type the topic name in the search box"
- ❌ Voice as an afterthought feature

**Correct patterns:**
- ✅ "Roll 15 present, roll 16 absent" → Immediate attendance update
- ✅ "I finished heredity today with 9B" → Syllabus marked complete
- ✅ "Show me next week's schedule" → Navigation executed

---

### Principle 2: Optimistic Actions > Confirmations

**Statement:** Assume success and handle failure gracefully, rather than blocking on confirmations.

**Rationale:**
- Teachers don't have time to confirm dialogs
- Network latency should not block workflows
- Most actions succeed; optimize for the common case
- Undo is faster than "Are you sure?"

**Constraints:**
- All write operations apply locally immediately
- UI reflects optimistic state before server confirmation
- Failures surface as non-blocking notifications with undo
- Sync conflicts resolve automatically when possible, prompt only when necessary

**Anti-patterns:**
- ❌ "Are you sure you want to mark Aarav present?"
- ❌ Spinner blocking UI while saving
- ❌ "Please wait while we sync..."

**Correct patterns:**
- ✅ Attendance checkmark appears instantly
- ✅ Toast: "Marked present" with subtle undo link
- ✅ Background sync with conflict resolution
- ✅ Offline indicator only when relevant

---

### Principle 3: Human-in-the-Loop AI

**Statement:** AI assists but never acts autonomously on critical data without confirmation.

**Rationale:**
- Attendance is a legal document in many jurisdictions
- Wrong attendance can affect student records permanently
- AI accuracy is 95%+, but 5% errors on 40 students = 2 errors daily
- Trust requires transparency

**Constraints:**
- AI suggestions always display before application
- Low-confidence matches (<75%) require explicit confirmation
- Voice transcripts visible in real-time
- Undo available for 30 seconds minimum
- Audit trail captures AI confidence and human override

**Anti-patterns:**
- ❌ AI silently marks attendance without display
- ❌ "Auto-apply" mode that skips review
- ❌ No visibility into AI reasoning

**Correct patterns:**
- ✅ Live transcript: "I heard 'Ravi present'"
- ✅ Confidence indicator on each match
- ✅ "Did you mean Ravi or Ravikant?" for ambiguous input
- ✅ Complete session summary for review

---

### Principle 4: Teacher Time is Sacred

**Statement:** Every second of teacher time saved is a success; every second wasted is a failure.

**Rationale:**
- Teachers have 5 minutes between classes
- Administrative burden is the #1 complaint
- Mental load affects teaching quality
- Time saved = better education for students

**Constraints:**
- Attendance by voice: <90 seconds for 40 students
- Syllabus update: <10 seconds including voice command
- Navigation to any screen: <3 taps or 1 voice command
- No training required; intuitive first-use experience
- Zero mandatory fields that could be inferred

**Anti-patterns:**
- ❌ Multi-step wizards for simple actions
- ❌ Required fields the system could infer
- ❌ "Loading..." states that block
- ❌ Onboarding flows that take >2 minutes

**Correct patterns:**
- ✅ One-tap to start voice attendance
- ✅ Context-aware defaults (current class, current time)
- ✅ Auto-detect class from schedule
- ✅ Progressive disclosure of advanced features

---

### Principle 5: Offline-First, Not Offline-Capable

**Statement:** The system must be designed for offline as the default state, not as a fallback.

**Rationale:**
- Indian school internet is unreliable
- Classrooms often have poor connectivity
- Teachers cannot wait for network
- Data must never be lost due to disconnection

**Constraints:**
- All read operations served from local database
- All write operations queued locally first
- Sync happens in background when online
- Conflict resolution is deterministic and predictable
- Offline period of 8 hours must be fully functional

**Anti-patterns:**
- ❌ "No internet connection" as an error
- ❌ Features that only work online
- ❌ Retry loops that block UI
- ❌ "Sync failed" with data loss

**Correct patterns:**
- ✅ App works identically offline
- ✅ Sync status as ambient indicator
- ✅ Conflicts auto-resolved with audit
- ✅ Manual sync trigger available but not required

---

### Principle 6: No Lock-In

**Statement:** Every external dependency must be swappable without rewriting business logic.

**Rationale:**
- AI providers change pricing, features, availability
- Cloud providers may not serve all regions
- Vendor lock-in reduces negotiating power
- Open standards enable migration

**Constraints:**
- AI providers: Swappable via configuration only
- Database: Standard SQL, portable schema
- Auth: Standard protocols (OAuth 2.0, OIDC)
- Storage: Standard APIs (S3-compatible)
- No proprietary SDKs in business logic

**Implementation requirements:**
```typescript
// AI Abstraction - Business logic sees only this interface
interface AIGateway {
  generate(input: AIInput): Promise<AIOutput>;
  stream(input: AIInput): AsyncIterator<AIChunk>;
  transcribe(audio: AudioData): Promise<Transcript>;
}

// Database Abstraction - Standard SQL
// No Firestore-specific queries in business logic
// No DynamoDB-specific patterns
```

**Anti-patterns:**
- ❌ Firestore-specific queries in business logic
- ❌ OpenAI SDK directly in components
- ❌ Vendor-specific authentication
- ❌ Non-standard SQL extensions

---

### Principle 7: Scale-Ready from Day One

**Statement:** Architecture must support growth from 1 teacher to 10,000 schools without redesign.

**Rationale:**
- Retrofitting multi-tenancy is extremely difficult
- Performance problems compound with scale
- Security gaps become breaches at scale
- Rewriting is more expensive than designing right

**Constraints:**
- Multi-tenant data isolation enforced at database level
- Horizontal scaling without code changes
- Per-tenant rate limiting and cost controls
- Observability built in, not bolted on
- Academic year transitions handled automatically

**Anti-patterns:**
- ❌ Single-tenant design "for now"
- ❌ Global state that doesn't partition
- ❌ Hardcoded limits
- ❌ "We'll add monitoring later"

**Correct patterns:**
- ✅ Tenant ID in every query
- ✅ Row-Level Security in PostgreSQL
- ✅ Metrics per tenant per endpoint
- ✅ Automated academic year archival

---

## Principle Verification Checklist

For every feature, verify:

| Principle | Question to Ask |
|-----------|-----------------|
| Voice > UI | Can this be done by voice? Is voice the fastest path? |
| Optimistic | Does UI update before server responds? Is undo available? |
| Human-in-Loop | Is AI reasoning visible? Can teacher override? |
| Time Sacred | How many seconds does this take? Can we reduce it? |
| Offline-First | Does this work without network? What happens if network dies mid-action? |
| No Lock-In | Can we swap the underlying provider? Is business logic isolated? |
| Scale-Ready | Does this work for 10,000 schools? Is tenant isolation enforced? |

---

## Derived Technical Requirements

From these principles, we derive:

### From Voice > UI:
- Sub-500ms STT latency requirement
- WebSocket for real-time streaming
- Noise-robust audio processing
- Multi-language support (Hindi + English + regional)

### From Optimistic Actions:
- Local-first database (SQLite-WASM)
- Optimistic UI update pattern
- Background sync queue
- Undo stack with TTL

### From Human-in-Loop:
- Confidence scoring on all AI outputs
- Confirmation threshold configuration
- Complete audit logging
- Transparent AI reasoning display

### From Time Sacred:
- <100ms UI response time (local operations)
- <3 tap navigation
- Zero required fields when inferrable
- Progressive loading over blocking

### From Offline-First:
- SQLite-WASM with OPFS persistence
- Event sourcing for sync
- CRDT or LWW for conflicts
- 8-hour offline operation minimum

### From No Lock-In:
- AI Gateway abstraction layer
- PostgreSQL (portable SQL)
- OAuth 2.0 / OIDC authentication
- S3-compatible object storage

### From Scale-Ready:
- PostgreSQL Row-Level Security
- Tenant ID in all tables
- Per-tenant resource quotas
- Partitioning by academic year

---

## Principle Priority When Conflicts Arise

When principles conflict, use this priority order:

1. **Offline-First** — Teacher must never lose work
2. **Human-in-Loop** — AI must never corrupt data
3. **Teacher Time** — Don't waste teacher attention
4. **Voice > UI** — Prefer faster input method
5. **Optimistic** — Don't block on network
6. **Scale-Ready** — Design for growth
7. **No Lock-In** — Maintain flexibility

**Example conflict resolution:**

*"Should we require confirmation for every attendance mark?"*
- Human-in-Loop says: Yes, confirm
- Teacher Time says: No, too slow
- Resolution: Show real-time feedback, allow batch confirmation at end, provide undo

*"Should we store data in a proprietary format that's faster?"*
- Scale-Ready says: Maybe, for performance
- No Lock-In says: No, use standards
- Resolution: Use standard format with proper indexing; optimize later if needed

---

## Measuring Principle Adherence

| Principle | Metric | Target |
|-----------|--------|--------|
| Voice > UI | % of actions with voice path | 100% for core actions |
| Optimistic | P95 perceived latency | <100ms |
| Human-in-Loop | AI override rate | <5% (indicates accuracy) |
| Time Sacred | Task completion time | Attendance <90s, syllabus <10s |
| Offline-First | Offline operation duration | 8+ hours |
| No Lock-In | Provider abstraction coverage | 100% of external calls |
| Scale-Ready | Per-tenant data isolation | 100% RLS coverage |
