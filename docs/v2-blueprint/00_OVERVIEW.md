# STAFFROOM V2 ARCHITECT BLUEPRINT

> **Version:** 2.0  
> **Created:** January 23, 2026  
> **Purpose:** Complete architectural blueprint enabling implementation without ambiguity  
> **Methodology:** Research-driven, provider-agnostic, offline-first

---

## Executive Summary

Staffroom V2 is a **Teacher Operating System** designed for the realities of Indian classrooms: noisy environments, unreliable connectivity, extreme time pressure, and the need for invisible technology that doesn't interrupt teaching flow.

### What This Blueprint Delivers

A complete system design that:
- **Works offline** — Attendance and syllabus updates never fail due to network
- **Treats voice as primary input** — Audio is a first-class multimodal signal, not just STT
- **Swaps AI providers via config** — No code changes to switch between Gemini, OpenAI, Anthropic, Azure
- **Scales from 1 teacher to 10,000+ schools** — Multi-tenant architecture with proper isolation
- **Respects teacher time** — Every interaction optimized for speed and minimal cognitive load

### Non-Negotiable Constraints

| Constraint | Rationale |
|------------|-----------|
| **No Lock-In** | AI providers, databases, and infrastructure must be swappable |
| **Offline-First** | Core workflows must complete without network |
| **Voice-First** | Audio input is equal to or preferred over touch/type |
| **Sub-Second Latency** | Teachers won't wait; system must feel instant |
| **Human-in-Loop AI** | AI assists but never acts autonomously on critical data |

---

## Document Index

| Document | Section | Description |
|----------|---------|-------------|
| [01_CURRENT_STATE.md](./01_CURRENT_STATE.md) | A | Analysis of existing Staffroom implementation |
| [02_DESIGN_PRINCIPLES.md](./02_DESIGN_PRINCIPLES.md) | B | Non-negotiable architectural principles |
| [03_TECHNOLOGY_LANDSCAPE.md](./03_TECHNOLOGY_LANDSCAPE.md) | C | Complete map of viable technologies |
| [04_DECISION_MATRIX.md](./04_DECISION_MATRIX.md) | D | Trade-off analysis and recommendations |
| [05_AI_ABSTRACTION.md](./05_AI_ABSTRACTION.md) | E | Provider-agnostic AI layer design |
| [06_DATA_MODEL.md](./06_DATA_MODEL.md) | F | Multi-tenant schema and sync design |
| [07_CORE_MODULES.md](./07_CORE_MODULES.md) | G | Implementation logic for each module |
| [08_OFFLINE_SYNC.md](./08_OFFLINE_SYNC.md) | H | Offline queues, conflict resolution |
| [09_SECURITY.md](./09_SECURITY.md) | I | Multi-tenant isolation and audit |
| [10_TESTING_PRODUCTION.md](./10_TESTING_PRODUCTION.md) | J | Testing strategy and rollout plan |

---

## Research Methodology

This blueprint was developed through systematic research across four domains:

### 1. Application Architecture (2025-2026 Landscape)
- React Server Components now production-standard
- Edge computing via V8 isolates (Cloudflare Workers, Vercel Edge, Deno Deploy)
- TanStack Query as de-facto server state management
- Streaming UI patterns for progressive enhancement

### 2. Local-First & Offline Data Systems
- SQLite-WASM with OPFS emerging as highest-performance browser storage
- PowerSync, ElectricSQL, Zero by Rocicorp as sync engine options
- CRDT vs OT for conflict resolution trade-offs
- Event sourcing for audit trails and sync

### 3. AI Orchestration Patterns
- Vercel AI SDK and AI Gateway for provider abstraction
- LiteLLM as unified interface across 20+ providers
- Cost-aware routing between model tiers
- Streaming + structured output patterns mature

### 4. Real-Time Voice Systems
- WebSocket-based STT achieving sub-200ms latency
- Deepgram Nova-3 and AssemblyAI leading accuracy benchmarks
- OpenAI Realtime API for bidirectional voice
- Web Audio API + AudioWorklet for browser capture

---

## How to Use This Blueprint

### For Implementers

1. Start with [02_DESIGN_PRINCIPLES.md](./02_DESIGN_PRINCIPLES.md) to understand constraints
2. Review [04_DECISION_MATRIX.md](./04_DECISION_MATRIX.md) for technology selections
3. Use [06_DATA_MODEL.md](./06_DATA_MODEL.md) to set up database schema
4. Implement modules per [07_CORE_MODULES.md](./07_CORE_MODULES.md) pseudocode
5. Apply [08_OFFLINE_SYNC.md](./08_OFFLINE_SYNC.md) patterns for resilience

### For Reviewers

1. [01_CURRENT_STATE.md](./01_CURRENT_STATE.md) shows what exists and what's fragile
2. [03_TECHNOLOGY_LANDSCAPE.md](./03_TECHNOLOGY_LANDSCAPE.md) proves research breadth
3. [04_DECISION_MATRIX.md](./04_DECISION_MATRIX.md) justifies every major choice

### For AI Coding Agents

Each module in [07_CORE_MODULES.md](./07_CORE_MODULES.md) includes:
- Exact responsibilities
- Data flow diagrams
- Pseudocode with edge cases
- Interface definitions

No architectural questions should remain unanswered.

---

## System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STAFFROOM V2 SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         CLIENT LAYER (PWA)                                │  │
│  │                                                                           │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │   │ Voice Input │  │  Offline    │  │  Local      │  │  Service    │    │  │
│  │   │ Pipeline    │  │  Queue      │  │  SQLite     │  │  Worker     │    │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         EDGE LAYER (Optional)                             │  │
│  │   • WebSocket proxy for voice streaming                                   │  │
│  │   • JWT validation at edge                                                │  │
│  │   • Geographic request routing                                            │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         API LAYER (Serverless)                            │  │
│  │                                                                           │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │   │ AI Gateway  │  │  Sync API   │  │  Auth API   │  │  Admin API  │    │  │
│  │   │ (Provider   │  │  (CRDT      │  │  (JWT +     │  │  (Tenant    │    │  │
│  │   │  Agnostic)  │  │  Merge)     │  │  RBAC)      │  │  Mgmt)      │    │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         DATA LAYER                                        │  │
│  │                                                                           │  │
│  │   ┌─────────────────────────────────┐  ┌─────────────────────────────┐   │  │
│  │   │  PostgreSQL (Multi-Tenant)      │  │  Object Storage (Audio)     │   │  │
│  │   │  • Row-Level Security           │  │  • Attendance recordings    │   │  │
│  │   │  • Academic year partitions     │  │  • Voice memos              │   │  │
│  │   └─────────────────────────────────┘  └─────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         AI PROVIDER LAYER (External)                      │  │
│  │                                                                           │  │
│  │   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐            │  │
│  │   │  OpenAI   │  │  Gemini   │  │ Anthropic │  │  Azure    │            │  │
│  │   │  GPT-4o   │  │  2.5 Pro  │  │  Claude   │  │  OpenAI   │            │  │
│  │   └───────────┘  └───────────┘  └───────────┘  └───────────┘            │  │
│  │                                                                           │  │
│  │   ┌───────────┐  ┌───────────┐  ┌───────────┐                           │  │
│  │   │ Deepgram  │  │ AssemblyAI│  │  Whisper  │  (STT Providers)          │  │
│  │   └───────────┘  └───────────┘  └───────────┘                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Decisions (Summary)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Frontend Framework** | React + Vite | Ecosystem maturity, AI tooling support, team familiarity |
| **Local Database** | SQLite-WASM + OPFS | Best performance, real SQL, offline-first |
| **Sync Engine** | PowerSync or custom event-sourcing | Postgres integration, conflict resolution |
| **Backend Runtime** | Node.js on serverless | Cost efficiency, auto-scaling |
| **Primary Database** | PostgreSQL with RLS | Multi-tenant isolation, SQL power |
| **AI Abstraction** | Custom gateway + Vercel AI SDK patterns | Provider swapping, cost routing |
| **Voice Transport** | WebSocket streaming | Sub-200ms latency requirement |
| **Auth** | Firebase Auth → Migrate to Auth.js | JWT-based, provider flexibility |

Detailed justifications in [04_DECISION_MATRIX.md](./04_DECISION_MATRIX.md).

---

## Success Criteria

The V2 architecture succeeds when:

1. **Offline attendance** works for 1 hour without sync, then reconciles correctly
2. **Voice commands** achieve <500ms perceived latency in noisy classrooms  
3. **AI provider switch** from Gemini to OpenAI requires only config change
4. **New school onboarding** takes <1 hour including data import
5. **Academic year rollover** preserves history while starting fresh
6. **10 concurrent voice sessions** per school handled without degradation
7. **Complete audit trail** exists for every attendance/syllabus change

---

## Next Steps

1. Review each document in sequence
2. Validate technology choices against current (January 2026) capabilities
3. Identify any missing edge cases specific to deployment context
4. Begin implementation per module priorities in [07_CORE_MODULES.md](./07_CORE_MODULES.md)
