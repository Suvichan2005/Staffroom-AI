# SECTION C — TECHNOLOGY LANDSCAPE MAP

> **Purpose:** Enumerate ALL viable options for each architectural layer, not just top choices  
> **Research Date:** January 2026  
> **Methodology:** Web research, production case studies, benchmark data

---

## 1. Application Architecture Patterns

### 1.1 Full-Stack Frameworks

| Framework | Strengths | Weaknesses | Failure Modes | Scaling | Lock-in Risk | DX |
|-----------|-----------|------------|---------------|---------|--------------|-----|
| **Next.js 15 (App Router)** | RSC mature, Vercel integration, huge ecosystem | Vercel-optimized, complex caching | Memory leaks in RSC, hydration mismatches | Excellent (Vercel) | Medium (Vercel) | ⭐⭐⭐⭐⭐ |
| **Remix** | Excellent data loading, standard web APIs | Smaller ecosystem, fewer edge features | Less predictable than Next | Good | Low | ⭐⭐⭐⭐ |
| **TanStack Start** | Client-first + SSR, Vite-based, TanStack ecosystem | Newer, smaller community | Less battle-tested | Good | Low | ⭐⭐⭐⭐ |
| **SvelteKit** | Excellent performance, simpler mental model | Smaller talent pool, different paradigm | Team onboarding cost | Good | Low | ⭐⭐⭐⭐ |
| **Nuxt 3** | Vue ecosystem, good DX | Vue market share declining | Fewer AI tools support Vue | Good | Low | ⭐⭐⭐ |
| **Solid Start** | Best reactivity performance | Smallest ecosystem | Hard to hire | Good | Low | ⭐⭐⭐ |
| **React + Vite (SPA)** | Maximum flexibility, proven patterns | No SSR out of box | SEO if needed | Client-side only | None | ⭐⭐⭐⭐⭐ |

### 1.2 Rendering Strategies

| Strategy | Use Case | Latency | Offline | Complexity |
|----------|----------|---------|---------|------------|
| **SPA (Client-Only)** | Dashboard apps, authenticated only | Fast after load | ✅ Full PWA | Low |
| **SSR (Dynamic)** | SEO pages, personalized content | Medium | ❌ | Medium |
| **RSC (React Server)** | Data-heavy, streaming UI | Variable | Partial | High |
| **SSG (Static)** | Marketing, docs | Fastest | ✅ Cacheable | Low |
| **ISR (Incremental)** | Blog, catalog | Fast | Partial | Medium |

**Recommendation for Staffroom:** SPA with PWA. No SEO needed (authenticated app), offline-first requirement favors client-side.

### 1.3 Edge Computing Platforms

| Platform | Cold Start | Max CPU Time | Storage | Strengths | Weaknesses |
|----------|------------|--------------|---------|-----------|------------|
| **Cloudflare Workers** | <1ms (V8 isolates) | 30s+ (paid) | D1, KV, R2, Durable Objects | Best performance, global, integrated AI | Worker size limits, learning curve |
| **Vercel Edge Functions** | ~5-50ms | 25s (hobby), 5min (pro) | None built-in | Next.js integration | Vercel lock-in |
| **Deno Deploy** | ~10-50ms | 50ms (free), 15min (paid) | Deno KV, cron | TypeScript native, simpler | Smaller ecosystem |
| **AWS Lambda@Edge** | 100-500ms (containers) | 30s | None at edge | AWS ecosystem | Slow cold starts |
| **Netlify Edge** | ~10-50ms (Deno) | 50s | None | Easy deployment | Limited features |

---

## 2. Local-First & Offline Data Systems

### 2.1 Browser Storage Technologies

| Technology | Type | Capacity | Performance | Query Capability | Best For |
|------------|------|----------|-------------|------------------|----------|
| **SQLite-WASM + OPFS** | Relational | 10+ GB | ⭐⭐⭐⭐⭐ Best | Full SQL | Complex queries, large datasets |
| **IndexedDB** | Document | 50%+ disk | ⭐⭐⭐ Good | Index-based | Simple key-value, compatibility |
| **OPFS (raw files)** | File | 10+ GB | ⭐⭐⭐⭐⭐ Best | None | Binary blobs, audio |
| **localStorage** | Key-Value | 5-10 MB | ⭐⭐⭐ Good | None | Small settings |
| **Cache API** | HTTP cache | Quota | ⭐⭐⭐⭐ Good | URL-based | Assets, API cache |

**Benchmark data (2025):**
- SQLite-WASM + OPFS: ~50,000 writes/sec
- IndexedDB: ~5,000 writes/sec
- localStorage: ~15,000 writes/sec (but blocking)

### 2.2 Sync Engines

| Engine | Backend | Conflict Resolution | Offline | Open Source | Maturity | Notes |
|--------|---------|---------------------|---------|-------------|----------|-------|
| **PowerSync** | PostgreSQL | Custom mutators | ✅ Excellent | Yes (SDK) | Production | Best Postgres integration |
| **ElectricSQL** | PostgreSQL | CRDTs | ✅ Excellent | Yes | Production | Direct-to-Postgres sync |
| **Zero (Rocicorp)** | PostgreSQL | IVM, custom | ✅ Excellent | Yes | Production | Query-driven sync |
| **LiveStore** | Custom | Event sourcing | ✅ Excellent | Yes | Beta | Event-centric |
| **Convex** | Convex DB | Transactional | ✅ Good | No | Production | Managed service |
| **Firebase RTDB** | Firebase | LWW | ✅ Good | No | Production | Google lock-in |
| **Supabase Realtime** | PostgreSQL | None (manual) | ⚠️ Partial | Yes | Production | Need custom offline |
| **Triplit** | Custom | CRDTs | ✅ Excellent | Yes | Beta | Local-first native |

### 2.3 Conflict Resolution Strategies

| Strategy | How It Works | Pros | Cons | Best For |
|----------|--------------|------|------|----------|
| **Last-Write-Wins (LWW)** | Latest timestamp wins | Simple, predictable | Can lose data | Single-user edits |
| **CRDTs** | Mathematically mergeable | Never loses data | Complex, size overhead | Collaborative editing |
| **Event Sourcing** | Replay events to resolve | Full audit trail | Storage overhead | Financial, compliance |
| **Custom Mutators** | Application-specific logic | Business rules encoded | More code | Domain-specific merge |
| **Manual Resolution** | User picks winner | Always correct | Interrupts user | Rare conflicts |

**Recommendation for Staffroom:**
- Attendance: LWW with teacher ID priority (teacher's latest mark wins)
- Syllabus: LWW with timestamp (most recent progress wins)
- Conflicts: Auto-resolve, log for audit, never block teacher

---

## 3. AI Orchestration Patterns

### 3.1 LLM Providers Comparison (January 2026)

| Provider | Best Model | Input Cost | Output Cost | Latency | Multimodal | Streaming |
|----------|------------|------------|-------------|---------|------------|-----------|
| **OpenAI** | GPT-4o | $2.50/1M | $10/1M | ~500ms | ✅ Full | ✅ |
| **Anthropic** | Claude 3.5 Sonnet | $3/1M | $15/1M | ~600ms | ✅ Images | ✅ |
| **Google** | Gemini 2.5 Flash | $0.15/1M | $0.60/1M | ~300ms | ✅ Full | ✅ |
| **Google** | Gemini 2.5 Pro | $1.25/1M | $5/1M | ~800ms | ✅ Full | ✅ |
| **Azure OpenAI** | GPT-4o | $2.50/1M | $10/1M | ~500ms | ✅ Full | ✅ |
| **Mistral** | Large 2 | $2/1M | $6/1M | ~400ms | ❌ | ✅ |
| **Cohere** | Command R+ | $2.50/1M | $10/1M | ~500ms | ❌ | ✅ |

### 3.2 AI Abstraction Approaches

| Approach | Description | Pros | Cons | Lock-in |
|----------|-------------|------|------|---------|
| **Vercel AI SDK** | TypeScript SDK with provider adapters | Excellent DX, streaming | Vercel ecosystem | Low |
| **LiteLLM** | Python unified interface | 100+ providers | Python only | None |
| **AI Gateway (Vercel)** | Managed proxy to providers | BYOK, routing | Vercel dependency | Medium |
| **Portkey** | AI gateway with observability | Fallbacks, caching | Extra service | Low |
| **Custom Gateway** | Self-built abstraction | Full control | Build cost | None |
| **LangChain** | Chains, agents, tools | Full-featured | Over-engineered for simple cases | Low |

### 3.3 Cost-Aware Routing

```
┌─────────────────────────────────────────────────────────────────┐
│                      COST-AWARE AI ROUTING                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case            → Model Tier      → Provider               │
│  ─────────────────────────────────────────────────────────────  │
│  Quick chat          → FAST (cheap)    → Gemini 2.5 Flash       │
│  Quiz generation     → FAST            → Gemini 2.5 Flash       │
│  Attendance parsing  → FAST + tools    → Gemini 2.5 Flash       │
│  Syllabus analysis   → STANDARD        → GPT-4o-mini            │
│  Complex reasoning   → REASONING       → Claude 3.5 Sonnet      │
│  Voice transcription → STT             → Deepgram Nova-3        │
│                                                                  │
│  Fallback Chain: Primary → Secondary → Tertiary                 │
│  Circuit Breaker: 3 failures → 60s cooldown → retry             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Speech-to-Text Providers

### 4.1 Real-Time STT Comparison

| Provider | Latency | Accuracy (WER) | Hindi Support | Streaming | Cost | Notes |
|----------|---------|----------------|---------------|-----------|------|-------|
| **Deepgram Nova-3** | <200ms | ~8% WER | ✅ Good | ✅ WebSocket | $0.0043/min | Best latency |
| **AssemblyAI Real-time** | ~300ms | ~7% WER | ⚠️ Limited | ✅ WebSocket | $0.0065/min | Best accuracy |
| **OpenAI Whisper** | Batch only | ~5% WER | ✅ Excellent | ❌ | $0.006/min | Best multilingual |
| **Google Cloud STT** | ~300ms | ~8% WER | ✅ Good | ✅ gRPC | $0.009/min | Good Hindi |
| **Azure Speech** | ~200ms | ~9% WER | ✅ Good | ✅ WebSocket | $0.016/min | Enterprise features |
| **Sarvam AI** | ~400ms | ~10% WER | ✅ Excellent | ✅ WebSocket | Variable | Indian languages |
| **Web Speech API** | ~500ms | Variable | ⚠️ Device | ✅ Browser | Free | Fallback only |

### 4.2 Voice Pipeline Architectures

| Architecture | Flow | Latency | Cost | Offline |
|--------------|------|---------|------|---------|
| **Direct WebSocket** | Browser → STT Provider | Lowest | Higher | ❌ |
| **Edge Proxy** | Browser → Edge → STT | +10-50ms | Same | ❌ |
| **On-Device** | Browser Web Speech API | Variable | Free | ✅ |
| **Hybrid** | On-device + cloud verification | Medium | Lower | ✅ Partial |
| **Gemini Live** | Browser → Gemini (Audio+LLM) | ~500ms | Medium | ❌ |

**Recommendation for Staffroom:**
- Primary: Deepgram Nova-3 (best latency for real-time)
- Fallback: Web Speech API (offline/free)
- For LLM actions: Gemini 2.5 Flash (handles audio natively)

---

## 5. Database Options

### 5.1 Primary Database

| Database | Multi-tenant | Scaling | Offline Sync | Cost | Strengths | Weaknesses |
|----------|--------------|---------|--------------|------|-----------|------------|
| **PostgreSQL** | RLS native | Read replicas | PowerSync/Electric | Low | SQL power, RLS, extensions | Manage yourself |
| **Supabase** | RLS native | Auto | Partial | Medium | Managed Postgres + auth | Supabase patterns |
| **Neon** | RLS native | Serverless | Electric compatible | Medium | Serverless Postgres | Newer |
| **PlanetScale** | Manual | Auto | Custom | Medium | Vitess scaling | MySQL (not Postgres) |
| **CockroachDB** | Manual | Distributed | Custom | High | Global distribution | Complexity |
| **MongoDB** | Manual | Sharding | Realm (deprecated) | Medium | Flexible schema | No RLS |
| **Firestore** | Rules-based | Auto | Built-in | Medium | Real-time native | Vendor lock-in |

### 5.2 Multi-Tenancy Patterns

| Pattern | Description | Isolation | Cost | Complexity | Best For |
|---------|-------------|-----------|------|------------|----------|
| **Silo (DB per tenant)** | Separate database | ✅ Complete | High | High | Enterprise, compliance |
| **Bridge (Schema per tenant)** | Same DB, separate schemas | ✅ Strong | Medium | Medium | Mid-size |
| **Pool (RLS)** | Same tables, row filtering | ⚠️ RLS | Low | Low | SaaS at scale |

**Recommendation for Staffroom:** Pool with PostgreSQL RLS
- Schools share infrastructure
- Data isolated at row level
- Cost-effective scaling

---

## 6. Authentication Options

| Provider | Protocols | Social Logins | Strengths | Weaknesses | Lock-in |
|----------|-----------|---------------|-----------|------------|---------|
| **Firebase Auth** | Custom | ✅ Many | Easy, battle-tested | Google dependency | Medium |
| **Auth.js** | OAuth, OIDC | ✅ Many | Open source, flexible | Self-managed | None |
| **Clerk** | OAuth, OIDC | ✅ Many | Excellent DX | Managed cost | Medium |
| **Supabase Auth** | OAuth, Magic Link | ✅ Many | Postgres native | Supabase | Medium |
| **Auth0** | All | ✅ Many | Enterprise features | Expensive at scale | Medium |
| **Keycloak** | All | ✅ Many | Self-hosted, full control | Ops overhead | None |

---

## 7. Hosting & Deployment

### 7.1 Frontend Hosting

| Platform | Edge CDN | Build | Serverless | Cost | DX |
|----------|----------|-------|------------|------|-----|
| **Vercel** | ✅ Global | Fast | Edge + Lambda | Medium | ⭐⭐⭐⭐⭐ |
| **Cloudflare Pages** | ✅ Global | Fast | Workers | Low | ⭐⭐⭐⭐ |
| **Netlify** | ✅ Global | Fast | Edge (Deno) | Medium | ⭐⭐⭐⭐ |
| **Firebase Hosting** | ✅ Global | Fast | Functions | Low | ⭐⭐⭐ |
| **AWS Amplify** | ✅ Global | Slow | Lambda | Medium | ⭐⭐⭐ |

### 7.2 Backend Hosting

| Platform | Cold Start | Scaling | Database | Cost Model |
|----------|------------|---------|----------|------------|
| **Vercel Functions** | ~100-500ms | Auto | BYO | Per invocation |
| **Cloudflare Workers** | <1ms | Auto | D1, external | Per request |
| **AWS Lambda** | ~100-500ms | Auto | RDS, DynamoDB | Per invocation |
| **Railway** | ~500ms | Auto | Postgres built-in | Per usage |
| **Fly.io** | ~200ms | Manual + auto | SQLite, Postgres | Per machine |
| **Render** | ~500ms | Auto | Postgres built-in | Per service |

---

## 8. Real-Time Communication

| Technology | Latency | Bidirectional | Scaling | Use Case |
|------------|---------|---------------|---------|----------|
| **WebSocket** | Lowest | ✅ | Stateful (complex) | Voice streaming |
| **SSE (Server-Sent Events)** | Low | ❌ Server only | Stateless | Notifications |
| **HTTP/2 Streaming** | Low | ❌ Per request | Stateless | AI streaming |
| **WebRTC** | Lowest | ✅ | P2P / SFU | Video/Audio calls |
| **Socket.io** | Low | ✅ | Managed | Real-time sync |

---

## 9. Observability Stack

| Tool | Metrics | Logs | Traces | Errors | Cost |
|------|---------|------|--------|--------|------|
| **Vercel Analytics** | ✅ | ❌ | ❌ | ✅ | Included |
| **Sentry** | ❌ | ❌ | ✅ | ✅ | Free tier |
| **Datadog** | ✅ | ✅ | ✅ | ✅ | Expensive |
| **Grafana Cloud** | ✅ | ✅ | ✅ | ❌ | Free tier |
| **Axiom** | ✅ | ✅ | ✅ | ❌ | Free tier |
| **OpenTelemetry** | ✅ | ✅ | ✅ | ❌ | Self-hosted |

---

## 10. Summary: Technology Groupings

### Tier 1: Primary Recommendations

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | React + Vite | Ecosystem, AI tooling, team skill |
| Local DB | SQLite-WASM + OPFS | Best performance, SQL, offline |
| Sync | PowerSync or custom event-sourcing | Postgres integration |
| Primary DB | PostgreSQL with RLS | Multi-tenant, portable |
| AI Gateway | Custom + Vercel AI SDK patterns | Provider flexibility |
| STT | Deepgram Nova-3 | Lowest latency |
| Auth | Firebase Auth (migrate to Auth.js) | Existing + flexibility |
| Hosting | Vercel | DX, edge, familiar |

### Tier 2: Alternatives Worth Considering

| Layer | Alternative | When to Choose |
|-------|-------------|----------------|
| Frontend | Next.js App Router | If SSR becomes needed |
| Local DB | IndexedDB (Dexie) | Simpler requirements |
| Sync | ElectricSQL | Tighter Postgres coupling |
| Primary DB | Supabase | Faster time-to-market |
| AI Gateway | Portkey | Need managed observability |
| STT | AssemblyAI | Accuracy over latency |
| Auth | Clerk | Better DX, willing to pay |
| Hosting | Cloudflare | Lower cost at scale |

### Tier 3: Avoid Unless Specific Need

| Technology | Why Avoid |
|------------|-----------|
| MongoDB | No RLS, different paradigm |
| Firebase RTDB | Vendor lock-in, no SQL |
| AWS Lambda@Edge | Cold starts too slow |
| Custom auth | Security risk, build cost |
| On-premise | Ops overhead, no scaling |
