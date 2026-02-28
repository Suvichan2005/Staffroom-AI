# SECTION D — DECISION MATRIX & RECOMMENDATIONS

> **Purpose:** Narrow the technology landscape to specific choices with explicit justifications  
> **Methodology:** Trade-off analysis across key criteria, not popularity-based selection

---

## Decision Framework

Each decision is evaluated against these criteria:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Latency** | 25% | Perceived speed for teacher interactions |
| **Offline Support** | 25% | Ability to function without network |
| **Complexity** | 15% | Implementation and maintenance burden |
| **Lock-in Risk** | 15% | Difficulty of migration if needed |
| **Team Suitability** | 10% | Match with existing skills |
| **Cost** | 10% | Total cost of ownership at scale |

---

## 1. Frontend Architecture Decision

### Candidates

| Option | Latency | Offline | Complexity | Lock-in | Team Fit | Cost |
|--------|---------|---------|------------|---------|----------|------|
| **React + Vite (SPA)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Next.js App Router | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| TanStack Start | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Remix | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### ✅ DECISION: React + Vite (SPA with PWA)

**Justification:**
1. **Offline-first is non-negotiable.** SPA architecture gives full control over service worker and local database integration
2. **No SSR needed.** Staffroom is an authenticated dashboard; no SEO requirements
3. **Team has existing React expertise.** V1 is already React-based
4. **Maximum flexibility.** No framework opinions blocking offline patterns
5. **AI tooling ecosystem.** All major AI tools (Vercel AI SDK, LangChain.js) target React first

**Trade-offs accepted:**
- No built-in SSR (not needed)
- Manual routing setup (React Router handles this)
- No edge rendering (acceptable for authenticated app)

**Migration from V1:** Minimal—keep existing component structure, add TypeScript

---

## 2. Local Database Decision

### Candidates

| Option | Latency | Offline | Complexity | Lock-in | Team Fit | Cost |
|--------|---------|---------|------------|---------|----------|------|
| **SQLite-WASM + OPFS** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| IndexedDB (Dexie) | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| localStorage | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### ✅ DECISION: SQLite-WASM with OPFS persistence

**Justification:**
1. **Performance.** 10x faster than IndexedDB for complex queries (50k vs 5k writes/sec)
2. **Real SQL.** Same schema as server, complex joins possible
3. **Proven at scale.** Used by Notion, Linear, Figma for local-first
4. **Sync compatibility.** PowerSync, ElectricSQL, Zero all designed for SQLite client
5. **Data size.** Can handle full school year of attendance (tens of thousands of records)

**Trade-offs accepted:**
- Larger bundle (~500KB for SQLite WASM)
- Worker thread required (acceptable)
- Learning curve for SQL in frontend team

**Implementation approach:**
```
Recommended library: @electric-sql/pglite or wa-sqlite
Persistence: OPFS (Origin Private File System)
Worker: Dedicated worker for database operations
Fallback: IndexedDB VFS for older browsers
```

---

## 3. Sync Engine Decision

### Candidates

| Option | Latency | Offline | Complexity | Lock-in | Team Fit | Cost |
|--------|---------|---------|------------|---------|----------|------|
| **PowerSync** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| ElectricSQL | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Custom Event Sourcing | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Firebase RTDB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

### ✅ DECISION: Custom Event Sourcing with PowerSync-inspired patterns

**Justification:**
1. **Full audit trail.** Every change is an immutable event—perfect for attendance compliance
2. **Flexible conflict resolution.** Apply domain-specific rules (teacher's mark wins)
3. **No vendor lock-in.** Own the sync protocol
4. **Simpler initial implementation.** Don't need full CRDT complexity for our use cases
5. **PowerSync patterns.** Adopt their client architecture without managed service dependency

**Trade-offs accepted:**
- More implementation work than managed service
- Need to build sync server component
- Less mature than Firebase

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                      EVENT SOURCING SYNC                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LOCAL (SQLite)                 SERVER (PostgreSQL)             │
│  ─────────────                  ────────────────────            │
│  events table ────────────────► events table                    │
│  (append-only)    HTTP POST     (append-only, partitioned)      │
│                                                                  │
│  materialized ◄──────────────── materialized                    │
│  views            CDC/Polling   views                           │
│                                                                  │
│  Conflict Resolution:                                           │
│  1. Events have vector clocks                                   │
│  2. Server determines canonical order                           │
│  3. Client replays to match server state                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Server Database Decision

### Candidates

| Option | Latency | Offline | Complexity | Lock-in | Team Fit | Cost |
|--------|---------|---------|------------|---------|----------|------|
| **PostgreSQL (Supabase)** | ⭐⭐⭐⭐ | N/A | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| PostgreSQL (Neon) | ⭐⭐⭐⭐⭐ | N/A | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| PostgreSQL (Self-managed) | ⭐⭐⭐⭐ | N/A | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Firestore | ⭐⭐⭐⭐⭐ | N/A | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

### ✅ DECISION: PostgreSQL on Supabase (initially), portable

**Justification:**
1. **Row-Level Security.** Native multi-tenancy without application code
2. **SQL power.** Complex analytics queries, joins, window functions
3. **Portable.** Standard Postgres, can migrate to any managed/self-hosted
4. **Supabase bonuses.** Managed auth, real-time, storage—can use or ignore
5. **Sync compatibility.** PowerSync, ElectricSQL, Zero all Postgres-first

**Trade-offs accepted:**
- Supabase patterns may creep in
- Managed service cost vs self-hosted

**Multi-tenancy approach:**
```sql
-- Row-Level Security policy
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON attendance
    USING (school_id = current_setting('app.current_school_id')::uuid);

-- All queries automatically filtered
SELECT * FROM attendance WHERE student_id = '...';
-- Becomes: ... WHERE student_id = '...' AND school_id = current_school
```

---

## 5. AI Gateway Decision

### Candidates

| Option | Latency | Offline | Complexity | Lock-in | Team Fit | Cost |
|--------|---------|---------|------------|---------|----------|------|
| **Custom Gateway + AI SDK patterns** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Vercel AI Gateway | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| LangChain.js | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Portkey | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

### ✅ DECISION: Custom AI Gateway with Vercel AI SDK patterns

**Justification:**
1. **Provider swapping requirement.** Config-only change between Gemini, OpenAI, Anthropic
2. **Cost routing.** Route cheap tasks to cheap models automatically
3. **Offline queue.** Cache AI requests when offline, process when online
4. **Control.** Full visibility into costs, latency, failures
5. **Vercel AI SDK.** Use their streaming patterns and TypeScript types, not their hosted gateway

**Architecture:**
```typescript
// AI Gateway Interface
interface AIGateway {
  // Text generation
  generate(options: GenerateOptions): Promise<GenerateResult>;
  stream(options: GenerateOptions): AsyncGenerator<StreamChunk>;
  
  // Voice
  transcribe(audio: AudioData): Promise<TranscriptResult>;
  createVoiceSession(config: VoiceConfig): VoiceSession;
  
  // Routing
  selectProvider(task: TaskType): ProviderConfig;
  
  // Observability
  getUsage(timeRange: TimeRange): UsageMetrics;
}

// Provider Registration
const providers = {
  'gemini-flash': { provider: 'google', model: 'gemini-2.5-flash', tier: 'fast' },
  'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini', tier: 'standard' },
  'claude-sonnet': { provider: 'anthropic', model: 'claude-3-5-sonnet', tier: 'pro' },
};

// Task → Provider mapping (configurable)
const taskRouting = {
  'attendance-parse': 'gemini-flash',  // Cheapest, fast enough
  'quiz-generate': 'gemini-flash',
  'syllabus-analyze': 'gpt-4o-mini',
  'complex-reasoning': 'claude-sonnet',
};
```

---

## 6. Speech-to-Text Decision

### Candidates

| Option | Latency | Offline | Complexity | Lock-in | Team Fit | Cost |
|--------|---------|---------|------------|---------|----------|------|
| **Deepgram Nova-3** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| AssemblyAI | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Web Speech API | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Gemini Live | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

### ✅ DECISION: Hybrid approach—Deepgram (online) + Web Speech API (offline)

**Justification:**
1. **Deepgram.** Sub-200ms latency critical for real-time attendance feel
2. **Web Speech API.** Free, works offline, acceptable for fallback
3. **Not Gemini Live.** V1 uses this but it's higher latency and couples STT + LLM
4. **Separating concerns.** STT and LLM should be independent for flexibility

**Implementation:**
```typescript
// STT Provider Abstraction
interface STTProvider {
  startStreaming(config: StreamConfig): STTSession;
  transcribe(audio: Blob): Promise<Transcript>;
}

class STTGateway {
  private online: DeepgramProvider;
  private offline: WebSpeechProvider;
  
  async startStreaming(config: StreamConfig): STTSession {
    if (navigator.onLine && await this.online.isAvailable()) {
      return this.online.startStreaming(config);
    }
    return this.offline.startStreaming(config);
  }
}
```

---

## 7. Authentication Decision

### ✅ DECISION: Keep Firebase Auth (V1), plan migration path to Auth.js

**Justification:**
1. **Already implemented.** V1 uses Firebase Auth successfully
2. **Google Sign-In.** Critical for teacher adoption (everyone has Google)
3. **Migration cost.** Changing auth is disruptive
4. **Auth.js ready.** When we need more control, migration is straightforward

**Constraints:**
- Abstract auth behind interface from day 1
- Don't use Firebase-specific features in business logic
- Prepare migration guide

---

## 8. Hosting Decision

### ✅ DECISION: Vercel (frontend) + Supabase Edge Functions or Vercel Functions (API)

**Justification:**
1. **DX.** Vercel offers best developer experience for React apps
2. **Edge Functions.** Low latency for AI proxy
3. **Integrated.** Works well with Supabase for database
4. **Existing setup.** V1 already has Vercel configuration

**Alternative path if costs become concern:**
- Frontend: Cloudflare Pages (free tier is generous)
- API: Cloudflare Workers (lowest cost at scale)
- Database: Keep Supabase Postgres

---

## Final Architecture Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          STAFFROOM V2 ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FRONTEND                                                                    │
│  ──────────                                                                  │
│  React 18 + TypeScript + Vite                                               │
│  TanStack Query (server state)                                              │
│  Zustand (client state)                                                     │
│  SQLite-WASM + OPFS (local database)                                        │
│  Service Worker (offline + sync)                                            │
│                                                                              │
│  HOSTING                                                                     │
│  ────────                                                                    │
│  Vercel (frontend)                                                          │
│  Vercel Functions / Supabase Edge (API)                                     │
│                                                                              │
│  BACKEND SERVICES                                                            │
│  ─────────────────                                                           │
│  Custom AI Gateway (TypeScript)                                             │
│  Sync API (event sourcing)                                                  │
│  Auth: Firebase Auth (→ Auth.js later)                                      │
│                                                                              │
│  DATA LAYER                                                                  │
│  ───────────                                                                 │
│  PostgreSQL on Supabase                                                     │
│  Row-Level Security for multi-tenancy                                       │
│  Event store for sync                                                        │
│  S3-compatible storage for audio                                            │
│                                                                              │
│  AI PROVIDERS (Swappable)                                                   │
│  ────────────────────────                                                    │
│  Primary: Google Gemini 2.5 Flash (cost-effective)                          │
│  Fallback: OpenAI GPT-4o-mini                                               │
│  Pro: Anthropic Claude 3.5 Sonnet                                           │
│  STT: Deepgram Nova-3 + Web Speech API fallback                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SQLite-WASM performance issues in Safari | Medium | Medium | Test early, IndexedDB fallback |
| Deepgram pricing changes | Low | Medium | Abstraction layer, alternatives ready |
| Supabase outages | Low | High | Offline-first means app works anyway |
| Firebase Auth deprecation | Very Low | High | Auth.js migration path documented |
| AI model quality regression | Medium | Medium | A/B testing, fallback chain |
| Sync conflicts cause data loss | Medium | High | Comprehensive testing, audit trail |

---

## What We Explicitly Did Not Choose

| Technology | Why Not |
|------------|---------|
| **Next.js** | RSC complexity not needed for authenticated SPA |
| **MongoDB** | No RLS, different paradigm than sync engines expect |
| **Firebase RTDB** | Vendor lock-in, not SQL |
| **Managed sync (Firebase)** | Need more control for our conflict resolution |
| **LangChain** | Over-engineered for our use cases |
| **Vercel AI Gateway** | Want to avoid dependency on managed service |
| **On-device LLM** | Not reliable enough for production accuracy |
