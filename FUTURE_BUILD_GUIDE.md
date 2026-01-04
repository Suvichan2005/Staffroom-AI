# Future Build Guide: Staffroom V2 Recommendations

This document outlines how the features of Staffroom-AI can be better implemented in a new build from scratch, focusing on technical excellence, UI polish, and advanced AI integration.

## 1. Frontend Architecture: The "Fluid" Experience

**Current State**: React with Fragmented UI logic.
**The Next Level**: Move to **Next.js (App Router)** or **Vite + TanStack Router** for a more robust navigation and data-fetching experience.

### Framework Suggestions:
- **Framework**: **Next.js 15** (for Server Actions and seamless API routes).
- **UI Components**: **shadcn/ui** (Radix UI) + **Tailwind CSS**. 
  - *Why?* Better accessibility, consistent design system, and much easier to theme (Dark/Light mode).
- **State Management**: **TanStack Query (React Query)** for server state and **Zustand** for client state (AI chat persistence).
- **Animations**: **Framer Motion** (Layout transitions) + **Lottie** for complex micro-animations.

### Minute UI Polishes:
- **Persistent AI Overlay**: Instead of a "bar", implement a **Global Layout Overlay** that uses **Shared Layout Animations** (Framer Motion). The AI should feel like it's "flying" over the pages rather than being squeezed into a container.
- **Micro-Interactions**:
  - Haptic feedback (if on mobile) when attendance is marked.
  - Skeleton loaders that mirror the actual component layout.
  - Animated "Voice Waveforms" that respond to actual audio frequencies (Web Audio API `AnalyserNode`).
- **Live State Persistence**: If a recording is on, the "Recording" indicator should follow the user across pages with a **Picture-in-Picture** style floating bubble if the chat panel is closed.

## 2. Backend & Database: Beyond LocalStorage

**Current State**: LocalStorage + Firebase.
**The Next Level**: **Supabase (PostgreSQL)** for the primary database with **Edge Functions**.

### Database Improvements:
- **Relational Integrity**: Use PostgreSQL to handle complex relations: `Sections` -> `Students` -> `AttendanceLogs` -> `SyllabusTopics`.
- **Vector Storage**: Use **pgvector** in Supabase to store "Topic Embeddings".
  - *Why?* This allows the AI to perform **Semantic Search** across the entire syllabus, books, and teacher notes without complex string corrections.
- **Real-time Sync**: Use Supabase Realtime for instant synchronization across teacher devices (e.g., Tablet in hand, Dashboard on PC).

## 3. Advanced AI Integration: The "Gemini Pro" Experience

### Gemini Live API v2:
- **Full Bidirectional Streaming**: Use the `gemini-2.0-flash-exp` (or newer) to handle not just speech-to-tool, but also **Audio-as-Response**. The AI should be able to "speak" back to the teacher with low latency, facilitating a truly hands-free classroom experience.
- **Context Window Expansion**: Instead of passing history in text, use **Gemini's Context Caching**. This keeps the syllabus and student list "warm" in the AI's memory, reducing token costs and response time.
- **Multi-modal Inputs**: If the user is on a mobile device, allow the AI to "see" (via Camera) the classroom or a student's answer sheet to provide instant feedback.

### Voice-Based Logging V2:
- **Continuous Background Listen**: Implement a "Hey Staffroom" wakeword using a lightweight local model (like Porcupine) to trigger the Gemini Live session without manual tapping.
- **Intent Disambiguation**: Improve the "Pending Action" flow. If a teacher says "Mark him present" and there are two "Aaravs", the UI should show a quick "Clarify Bubble" that disappears once resolved.

## 4. Backend Recommendations
- **Edge Runtime**: Deploy AI orchestration logic on **Vercel Edge Functions** or **Supabase Edge Functions** to minimize latency to Gemini's servers.
- **Structured Outputs**: Enforce **Zod Schema validation** on all LLM tool calls to prevent runtime crashes from malformed AI responses.

## 5. Prototype Roadmap
1. **Phase 1**: Define a strict `design-system` using shadcn.
2. **Phase 2**: Rebuild `AIContext` with a state machine (XState) to handle complex states (Idle, Listening, Thinking, Streaming, Executing Tool).
3. **Phase 3**: Migrating the Excel/JSON mock data to a proper PostgreSQL schema.
4. **Phase 4**: Integrating "Gemini Live v2" as the primary navigation method ("Show me 6A" actually changes the URL via AI).
