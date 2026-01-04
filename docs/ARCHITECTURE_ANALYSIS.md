# 🏗️ STAFFROOM AI — COMPREHENSIVE ARCHITECTURE ANALYSIS & REBUILD GUIDE

> **Document Version:** 1.0  
> **Analysis Date:** December 28, 2025  
> **Scope:** Complete repository analysis with feature implementation details, UI polish inventory, and recommendations for next-generation prototype

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature Inventory — What's Implemented](#feature-inventory--whats-implemented)
3. [Deep Dive: Well-Implemented Features (Keep As-Is)](#deep-dive-well-implemented-features-keep-as-is)
4. [UI Polish Inventory — Minute Details](#ui-polish-inventory--minute-details)
5. [Architecture Patterns Worth Replicating](#architecture-patterns-worth-replicating)
6. [Pain Points & Improvements Needed](#pain-points--improvements-needed)
7. [Database & Backend Recommendations](#database--backend-recommendations)
8. [Frontend Framework Alternatives](#frontend-framework-alternatives)
9. [Rebuild Roadmap](#rebuild-roadmap)

---

## Executive Summary

### What Staffroom AI Does Well

1. **Voice-First AI Integration** — Real-time Gemini Live API integration for hands-free attendance and syllabus logging
2. **Persistent Chat Experience** — Chat bar retains state across page navigation with session management
3. **Responsive Layout System** — Clean mobile/desktop separation with shared context
4. **Plugin Architecture** — Extensible chat plugins for modular feature development
5. **Activity Logging** — Comprehensive Firestore-based user activity tracking

### What Needs Improvement

1. **Backend Persistence** — Currently relies on localStorage; needs proper API layer
2. **Type Safety** — No TypeScript; prone to runtime errors in complex state
3. **Testing Coverage** — Minimal E2E tests for critical voice flows
4. **State Management** — Context-heavy; could benefit from more structured state
5. **Real-time Collaboration** — No WebSocket support beyond Gemini Live

---

## Feature Inventory — What's Implemented

### ✅ Core Features (Production-Ready)

| Feature | Files | Status | Notes |
|---------|-------|--------|-------|
| **Voice Attendance Logging** | `VoiceAttendanceLogger.jsx`, `geminiLiveService.js` | ⭐ Excellent | Real-time Gemini Live API with fuzzy name matching |
| **Voice Progress Logging** | `VoiceProgressLogger.jsx`, `voiceProgressLoggerPlugin.jsx` | ⭐ Excellent | Voice-to-syllabus update with multi-step tool calling |
| **Persistent AI Chat Bar** | `PersistentChatBar.jsx`, `DesktopChatBar.jsx` | ⭐ Excellent | Retains state across pages, session management |
| **Chat Session History** | `chatStorage.js`, `AIContext.jsx` | ⭐ Good | User-scoped localStorage with 50-session limit |
| **Responsive Layout** | `ResponsiveLayout.jsx`, `MobileLayout.jsx`, `DesktopLayout.jsx` | ⭐ Good | Auto-switches at 768px breakpoint |
| **Activity Logging** | `activityLogger.js` | ⭐ Good | Firestore-based with IP tracking |
| **Firebase Auth** | `AuthContext.jsx`, `firebase/client.js` | ⭐ Good | Google + Email auth with persistence |
| **Plugin System** | `chat-plugins.jsx`, `plugins/index.js` | ⭐ Good | Extensible but needs event bus |

### 🔄 Partially Implemented (Needs Work)

| Feature | Files | Status | Notes |
|---------|-------|--------|-------|
| **Syllabus Tracker** | `SyllabusProgress.jsx`, `dummyData.js` | 🔄 Partial | UI complete, needs backend API |
| **Attendance Editor** | `AttendanceEditor.jsx` | 🔄 Partial | UI complete, localStorage only |
| **Quiz/Assignment Generator** | `SyllabusAIHelper.jsx`, `aiService.js` | 🔄 Partial | Generation works, no persistence |
| **HOD Dashboard** | `HODDashboard.jsx` | 🔄 Partial | Placeholder, no real data |
| **Admin Dashboard** | `AdminDashboard.jsx` | 🔄 Partial | Logs view works, needs more |

### ⏳ Stubbed/Placeholder (Not Implemented)

| Feature | Status | Notes |
|---------|--------|-------|
| **Backend API** | ⏳ Stub | All data from `dummyData.js` |
| **Student Lookup** | ⏳ Stub | Mentioned in docs, not built |
| **Substitution Management** | ⏳ Stub | Not implemented |
| **WhatsApp Integration** | ⏳ Stub | Future roadmap |
| **Real-time Sync** | ⏳ Stub | No WebSocket for data sync |

---

## Deep Dive: Well-Implemented Features (Keep As-Is)

### 1. Voice-Based Attendance Logging with Gemini Live API

**Location:** [src/components/ai/VoiceAttendanceLogger.jsx](src/components/ai/VoiceAttendanceLogger.jsx), [src/services/geminiLiveService.js](src/services/geminiLiveService.js)

**How It Works (Replicate This Pattern):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VOICE ATTENDANCE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   WebSocket   ┌─────────────────────────────────────────┐  │
│  │  Microphone │ ────────────► │  Gemini Live API (gemini-2.0-flash-exp) │  │
│  │  Audio PCM  │               │  - Audio input transcription            │  │
│  │  16kHz mono │               │  - Real-time function calling           │  │
│  └─────────────┘               │  - Fuzzy student name matching          │  │
│                                └───────────────┬─────────────────────────┘  │
│                                                │                            │
│                                         Tool Calls                          │
│                                                │                            │
│                                                ▼                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Tool Function Declarations                        │    │
│  │  ┌────────────────────┐  ┌───────────────────┐  ┌────────────────┐  │    │
│  │  │ mark_student_present│  │mark_student_absent│  │ mark_all_present│  │    │
│  │  │ - student_name     │  │ - student_name    │  │ - exceptions   │  │    │
│  │  │ - roll_number (opt)│  │ - roll_number     │  │                │  │    │
│  │  └────────────────────┘  └───────────────────┘  └────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                │                            │
│                                                ▼                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Real-Time UI Updates                            │    │
│  │  - Live transcript display                                          │    │
│  │  - Attendance state updated on each tool call                       │    │
│  │  - Connection status indicator (connected/streaming/error)          │    │
│  │  - Summary on session end                                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Implementation Details:**

1. **Audio Processing Pipeline:**
```javascript
// From geminiLiveService.js - AudioProcessor class
// Captures microphone audio, converts Float32 to Int16 PCM
startMicrophone(onAudioData) {
  this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      sampleRate: 16000,    // Gemini expects 16kHz
      channelCount: 1,       // Mono
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });
  // ScriptProcessor for audio extraction (AudioWorklet for production)
  processor.onaudioprocess = (e) => {
    const pcmData = this.float32ToInt16(inputData);
    onAudioData(pcmData);
  };
}
```

2. **WebSocket Setup Message Structure:**
```javascript
// The setup message includes student list for fuzzy matching
const setupMessage = {
  setup: {
    model: 'models/gemini-2.0-flash-exp',
    generationConfig: {
      responseModalities: ['TEXT'],  // Text responses only
      temperature: 0.3,               // Low for accurate parsing
    },
    systemInstruction: {
      parts: [{
        text: `Listen to teacher's voice and mark attendance...
               Students: Roll 1: Aarav, Roll 2: Priya, ...
               Match spoken variations like "role", "roll", "number"
               Match number words: "one"=1, "two"=2, ...`
      }]
    },
    tools: [{
      functionDeclarations: [
        { name: 'mark_student_present', ... },
        { name: 'mark_student_absent', ... },
        { name: 'mark_all_present', ... }
      ]
    }],
    inputAudioTranscription: {}  // Enable input transcription
  }
};
```

3. **Fuzzy Name Matching in System Prompt:**
```
- Fuzzy match student names - teacher might use nicknames or partial names
- IMPORTANT: Match spoken variations like "role", "roll", "number" to roll numbers
- Match number words: "one"=1, "two"=2, "three"=3, etc.
```

4. **Real-Time Tool Call Handling:**
```javascript
// VoiceAttendanceLogger.jsx - handleLiveToolCall
const handleLiveToolCall = useCallback((toolCall) => {
  const { name, args, matchedStudent, confidence } = toolCall;
  
  // Immediately update UI
  setLiveUpdates(prev => [...prev, update]);
  
  // Apply attendance change
  if (name === 'mark_student_present' && matchedStudent) {
    setAttendanceState(prev => ({
      ...prev,
      [matchedStudent.studentId]: true
    }));
    // Notify parent immediately for real-time feedback
    onUpdate?.({ [matchedStudent.studentId]: true });
  }
}, [students, onUpdate]);
```

**Why This Is Excellent:**
- ✅ Zero-latency feedback — updates happen as teacher speaks
- ✅ Handles Hindi/Hinglish input (translates to English)
- ✅ Roll number support ("roll 5 present")
- ✅ Bulk operations ("all present except...")
- ✅ Connection status visibility
- ✅ Graceful error handling with meaningful messages

**For Next Build:**
- Use `AudioWorklet` instead of deprecated `ScriptProcessor`
- Add WebRTC for better audio quality
- Consider on-device Whisper for offline fallback
- Add undo history stack

---

### 2. Persistent Chat Bar with State Retention Across Pages

**Location:** [src/components/ai/PersistentChatBar.jsx](src/components/ai/PersistentChatBar.jsx), [src/components/ai/DesktopChatBar.jsx](src/components/ai/DesktopChatBar.jsx), [src/context/AIContext.jsx](src/context/AIContext.jsx)

**How It Works:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PERSISTENT CHAT ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         AIContext (Global State)                      │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  messages   │  │ isRecording │  │ liveStatus  │  │ chatHistory │  │   │
│  │  │  (array)    │  │  (boolean)  │  │  (string)   │  │  (array)    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  Gemini Live Session (persists across navigation)               │  │   │
│  │  │  - geminiLiveSessionRef.current stays alive                     │  │   │
│  │  │  - WebSocket connection maintained                              │  │   │
│  │  │  - Audio streaming continues                                    │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              │ Context Provider wraps entire app            │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         App.jsx Structure                             │   │
│  │                                                                       │   │
│  │  <AIProvider>                 ← Chat state lives HERE (never unmounts)│   │
│  │    <Routes>                                                           │   │
│  │      <Route path="/dashboard" element={<Dashboard />} />              │   │
│  │      <Route path="/classes" element={<ClassesPage />} />              │   │
│  │      ...                      ← Pages mount/unmount                   │   │
│  │    </Routes>                                                          │   │
│  │    <PersistentChatBar />      ← Always rendered, reads from context   │   │
│  │  </AIProvider>                                                        │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key State Preservation Mechanisms:**

1. **Session Persistence via refs (not state):**
```javascript
// AIContext.jsx
const geminiLiveSessionRef = useRef(null); // Survives re-renders AND navigation
const liveTranscriptRef = useRef('');      // Track transcript for callbacks

// When recording is started, the session ref is set:
geminiLiveSessionRef.current = session;
// This ref survives page changes because AIContext never unmounts
```

2. **Chat History Persistence via localStorage:**
```javascript
// chatStorage.js - User-scoped storage
export function saveChatSession(session) {
  const sessions = getAllChatSessions();
  // Sort by updatedAt, keep last 50
  const trimmedSessions = sessions.slice(0, 50);
  saveUserState(STORAGE_KEY, trimmedSessions);
}

// On app load, restore the current session
useEffect(() => {
  const storedSessionId = getCurrentSessionId();
  if (storedSessionId) {
    const session = getChatSession(storedSessionId);
    setMessages(session.messages);
  }
}, []);
```

3. **Input Value Preserved:**
```javascript
// AIContext.jsx - Input state is in context, not component
const [inputValue, setInputValue] = useState('');

// PersistentChatBar just reads from context
const { inputValue, setInputValue } = useAI();
// So even if ChatBar re-renders on navigation, value persists
```

4. **Recording Continues Across Navigation:**
```javascript
// The magic: AIProvider is ABOVE Routes in component tree
// So when you navigate from /dashboard to /classes:
// 1. Dashboard component unmounts
// 2. AIContext (with geminiLiveSessionRef) stays mounted
// 3. ClassesPage mounts
// 4. PersistentChatBar re-renders with same context
// 5. isRecording is still true, liveStatus is still 'streaming'
// 6. User hears AI continuing to listen!
```

**Why This Is Excellent:**
- ✅ Teacher can start voice recording, navigate to a different page, and continue
- ✅ Chat messages persist across navigation (no reload needed)
- ✅ Session history survives browser refresh (localStorage)
- ✅ User-scoped storage (different users see different history)
- ✅ Keyboard shortcuts work globally (Ctrl+K to toggle chat)

**UI Polish Details:**
- Backdrop blur (`backdrop-blur-sm`) when chat expanded
- Smooth spring animations (`type: 'spring', stiffness: 300, damping: 30`)
- Typing indicator with animated dots
- Auto-scroll to bottom when messages change
- Gradient header on expanded panel

---

### 3. Multi-Step Tool Calling for Syllabus Updates

**Location:** [src/services/aiService.js](src/services/aiService.js), [src/services/chatToolsDefinition.js](src/services/chatToolsDefinition.js)

**How It Works:**

```
Teacher says: "Done with Plains and Valleys, covered to page 42, students understood clearly"

┌─────────────────────────────────────────────────────────────────────────────┐
│                        MULTI-STEP TOOL CALLING                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Parse intent                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Gemini identifies: 1) Mark topic complete 2) Update page 3) Add note│    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  Step 2: Search for topic                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Tool: searchTopic("Plains and Valleys")                            │    │
│  │  Result: { chapterIndex: 2, topicIndex: 2, pageFrom: 29, pageTo: 36 }│    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  Step 3: Mark topic complete                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Tool: updateProgress(sectionId, 2, 2, "complete")                  │    │
│  │  Result: { success: true, topicTitle: "Plains and Valleys" }        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  Step 4: Find topic containing page 42                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Tool: findTopicByPage(sectionId, 42)                               │    │
│  │  Result: { chapterIndex: 2, topicIndex: 3, title: "Rivers/Deltas" } │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  Step 5: Update ongoing topic with page and notes                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Tool: updateProgress(sectionId, 2, 3, "ongoing",                   │    │
│  │        { currentPage: 42, notes: "students understood clearly" })   │    │
│  │  Result: { success: true }                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  Final: Generate confirmation                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  "Done! Marked 'Plains and Valleys' complete. You're now on         │    │
│  │   'Rivers and Deltas' at page 42 with your note saved."             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tool Definitions (aiService.js):**

```javascript
export const chatToolDeclarations = [
  {
    name: 'searchTopic',
    description: 'Search for a topic by name across all courses',
    parameters: {
      type: 'object',
      properties: {
        searchQuery: { type: 'string', description: 'Topic name to search' },
        filterSubject: { type: 'string', description: 'Optional subject filter' },
        filterSectionId: { type: 'string', description: 'Optional section filter' }
      },
      required: ['searchQuery']
    }
  },
  {
    name: 'findTopicByPage',
    description: 'Find which topic contains a specific page number',
    parameters: {
      type: 'object',
      properties: {
        sectionId: { type: 'string' },
        pageNumber: { type: 'number' }
      },
      required: ['sectionId', 'pageNumber']
    }
  },
  {
    name: 'updateProgress',
    description: 'Update syllabus progress for a topic',
    parameters: {
      type: 'object',
      properties: {
        sectionId: { type: 'string' },
        chapterIndex: { type: 'number' },
        topicIndex: { type: 'number' },
        status: { type: 'string', enum: ['complete', 'ongoing', 'not-started'] },
        currentPage: { type: 'number' },
        notes: { type: 'string' }
      },
      required: ['sectionId', 'chapterIndex', 'topicIndex']
    }
  }
];
```

**Why This Is Excellent:**
- ✅ Teacher speaks naturally, AI figures out the steps
- ✅ Page number → topic mapping is automatic
- ✅ Notes are attached to the correct topic (ongoing, not completed)
- ✅ Works in both text chat and voice
- ✅ System prompt provides current context (ongoing topic, next topic)

---

### 4. Responsive Layout System

**Location:** [src/components/layout/](src/components/layout/)

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESPONSIVE LAYOUT SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ResponsiveLayout.jsx (Entry Point)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  const { isMobile } = useMediaQuery(); // < 768px                   │    │
│  │                                                                     │    │
│  │  if (isMobile) return <MobileLayout>{children}</MobileLayout>;      │    │
│  │  return <DesktopLayout>{children}</DesktopLayout>;                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────┐    ┌────────────────────────────────────┐   │
│  │      MobileLayout          │    │        DesktopLayout               │   │
│  │  ┌──────────────────────┐  │    │  ┌──────────────────────────────┐  │   │
│  │  │      TopNav          │  │    │  │          TopNav              │  │   │
│  │  │  (contextual title)  │  │    │  │  (logo, search, profile)     │  │   │
│  │  └──────────────────────┘  │    │  └──────────────────────────────┘  │   │
│  │  ┌──────────────────────┐  │    │  ┌──────────┐ ┌─────────────────┐  │   │
│  │  │                      │  │    │  │          │ │                 │  │   │
│  │  │    Main Content      │  │    │  │  Sidebar │ │  Main Content   │  │   │
│  │  │    (scrollable)      │  │    │  │  (nav)   │ │                 │  │   │
│  │  │                      │  │    │  │          │ │                 │  │   │
│  │  └──────────────────────┘  │    │  └──────────┘ └─────────────────┘  │   │
│  │  ┌──────────────────────┐  │    │  ┌──────────────────────────────┐  │   │
│  │  │  PersistentChatBar   │  │    │  │      DesktopChatBar          │  │   │
│  │  │  (expandable panel)  │  │    │  │  (centered, floating)        │  │   │
│  │  └──────────────────────┘  │    │  └──────────────────────────────┘  │   │
│  │  ┌──────────────────────┐  │    │                                    │   │
│  │  │     BottomNav        │  │    │                                    │   │
│  │  │  (3 tabs + drawer)   │  │    │                                    │   │
│  │  └──────────────────────┘  │    │                                    │   │
│  └────────────────────────────┘    └────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Implementation Details:**

1. **useMediaQuery Hook:**
```javascript
// Debounced resize handler for performance
export function useMediaQuery() {
  const [state, setState] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  // Debounce resize events (100ms)
  useEffect(() => {
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };
    // ...
  }, []);
  
  return {
    isMobile: width < 768,     // Tailwind md breakpoint
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
}
```

2. **Mobile Layout with Safe Areas:**
```javascript
// MobileLayout.jsx
<nav style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
  {/* Respects iPhone notch/home indicator */}
</nav>
```

3. **Desktop Sidebar Responsiveness:**
```javascript
// DesktopLayout.jsx
<main className={`
  transition-all duration-300 ease-in-out pt-16 pb-24
  ${sidebarCollapsed ? 'ml-16' : 'ml-60'}
`}>
```

---

## UI Polish Inventory — Minute Details

### Animation & Transitions

| Element | Implementation | Location |
|---------|---------------|----------|
| **Page Transitions** | Simple opacity fade (0.8 → 1, 0.1s) | `MobileLayout.jsx`, `DesktopLayout.jsx` |
| **Chat Panel Expand** | Spring animation (stiffness: 300, damping: 30) | `PersistentChatBar.jsx` |
| **Bottom Nav Indicator** | `layoutId` for shared element animation | `BottomNav.jsx` |
| **Sidebar Active State** | Left border with box-shadow glow | `Sidebar.jsx` |
| **Typing Indicator** | Three dots with staggered bounce | `PersistentChatBar.jsx`, `DesktopChatBar.jsx` |
| **Toast Notifications** | Slide-in from right, 2.4s duration | `App.jsx` via react-hot-toast |
| **Attendance Toggle** | Scale on tap (0.9) with spring | `AttendanceEditor.jsx` |
| **Backdrop Blur** | `backdrop-blur-sm` on overlays | All modals |

### Color System

```css
/* tokens.css - Design Tokens */
--color-primary-500: #6366F1;  /* Indigo - primary actions */
--color-primary-600: #4F46E5;  /* Hover state */
--color-success-500: #22C55E;  /* Green - present/done */
--color-error-500: #EF4444;    /* Red - absent/error */
--color-neutral-50: #F8FAFC;   /* Background */

/* Gradients */
--gradient-primary: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
```

### Touch Targets

- All interactive elements minimum 44×44px
- BottomNav items: 80px wide, full height
- Attendance rows: Full width, 48px tall
- Chat send button: 44px × 44px

### Loading States

| State | Implementation |
|-------|---------------|
| **Page Loading** | Spinning circle with "Loading..." text |
| **AI Thinking** | Three animated dots with "Thinking..." |
| **Voice Recording** | Mic icon with pulsing animation |
| **Connection** | Status text (connecting/connected/streaming) |

### Keyboard Shortcuts

```javascript
// LayoutContext.jsx
if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
  event.preventDefault();
  toggleChat();
}
if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
  event.preventDefault();
  toggleSidebar();
}
if (event.key === 'Escape') {
  // Close drawer → chat expanded → chat open (in order)
}
```

### Scrolling Behavior

- **Main Content:** `-webkit-overflow-scrolling: touch` for iOS momentum
- **Chat Messages:** Auto-scroll to bottom on new message
- **Syllabus Page Picker:** Snap scrolling with 32px item height

### Z-Index Hierarchy

```
z-10: Page content overlays
z-30: Bottom nav, Sidebar
z-40: Backdrop blur, expanded chat panel
z-50: Persistent chat bar, modals
z-60: Attach menu popup
z-[99999]: Page scroll picker (portal)
```

---

## Architecture Patterns Worth Replicating

### 1. Context-Based Global State

```javascript
// Pattern: Nested providers for separation of concerns
<AuthProvider>           {/* Auth state */}
  <LayoutProvider>       {/* UI layout state */}
    <AIProvider>         {/* AI chat state */}
      <Routes />
    </AIProvider>
  </LayoutProvider>
</AuthProvider>
```

### 2. User-Scoped Storage

```javascript
// userScopedStorage.js - All localStorage is user-namespaced
const STORAGE_PREFIX = `staffroom_${userId}_`;
export function saveUserState(key, value) {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}
```

### 3. Plugin Registration Pattern

```javascript
// Plugins self-register on import
export function registerChatPlugin(plugin) {
  if (pluginRegistry.has(plugin.id)) {
    // Update existing
  }
  pluginRegistry.set(plugin.id, plugin);
}

// In plugin file:
registerChatPlugin({
  id: 'voice-progress-logger',
  renderControls: () => <VoiceRecordButton />,
  onMessage: async (msg) => { /* handle */ }
});
```

### 4. Ref-Based Persistence for WebSocket Sessions

```javascript
// Use refs, not state, for long-lived connections
const geminiLiveSessionRef = useRef(null);
// Refs survive re-renders and don't trigger re-renders
// Perfect for WebSocket connections that need to persist
```

---

## Pain Points & Improvements Needed

### 1. No TypeScript

**Problem:** 1,342-line AIContext.jsx with complex state is error-prone

**Solution for Next Build:**
```typescript
// Strongly type all state
interface AIContextState {
  messages: ChatMessage[];
  isRecording: boolean;
  liveStatus: 'disconnected' | 'connecting' | 'connected' | 'ready' | 'streaming';
  currentSessionId: string | null;
  // ...
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
  attachments?: Attachment[];
}
```

### 2. Context Overload

**Problem:** AIContext handles too much (chat, voice, sessions, plugins)

**Solution for Next Build:**
```
Split into smaller contexts:
- ChatContext: messages, send, clear
- VoiceContext: recording, live session, status
- ChatHistoryContext: sessions, load, save
- PluginContext: registered plugins, active plugin
```

Or use Zustand/Jotai for atomic state management.

### 3. No Backend API

**Problem:** All data in `dummyData.js` with localStorage persistence

**Solution:** See Database & Backend section below.

### 4. Testing Gaps

**Problem:** Only one test file (`chat-plugins.test.js`)

**Solution for Next Build:**
- Unit tests for all tool functions
- Integration tests for voice flow (mock Gemini)
- E2E tests with Playwright for critical paths

### 5. No Real-Time Sync

**Problem:** Multiple tabs/devices see stale data

**Solution:** Add WebSocket or Firebase Realtime Database for:
- Attendance updates
- Syllabus progress
- Collaboration features

---

## Database & Backend Recommendations

### Current State

```
Frontend → dummyData.js → localStorage (user-scoped)
             ↓
         persistProgress() → localStorage
```

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RECOMMENDED BACKEND STACK                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Frontend (React/Next.js)                                                   │
│       │                                                                     │
│       │ REST + WebSocket                                                    │
│       ▼                                                                     │
│  API Gateway (Express/Fastify/tRPC)                                         │
│       │                                                                     │
│       ├──────────────────┬──────────────────┬──────────────────┐           │
│       ▼                  ▼                  ▼                  ▼           │
│  Auth Service      Core API            AI Service       Realtime          │
│  (Firebase Auth)   (Node.js)           (Gemini)         (Socket.io)       │
│       │                  │                  │                  │           │
│       └──────────────────┴──────────────────┴──────────────────┘           │
│                              │                                              │
│                              ▼                                              │
│                        PostgreSQL                                           │
│                    (with Prisma ORM)                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema Recommendations

**Option 1: PostgreSQL with Prisma (Recommended for Production)**

```prisma
// schema.prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  name        String
  role        Role     @default(TEACHER)
  schoolId    String
  school      School   @relation(fields: [schoolId], references: [id])
  courses     Course[]
  createdAt   DateTime @default(now())
}

enum Role {
  TEACHER
  CLASS_TEACHER
  HOD
  ADMIN
  IT_ADMIN
}

model Course {
  id           String    @id @default(uuid())
  title        String
  subject      String
  grade        Int
  syllabusId   String
  syllabus     Syllabus  @relation(fields: [syllabusId], references: [id])
  teacherId    String
  teacher      User      @relation(fields: [teacherId], references: [id])
  sections     Section[]
}

model Section {
  id           String     @id @default(uuid())
  name         String     // "6A", "8B"
  courseId     String
  course       Course     @relation(fields: [courseId], references: [id])
  progress     Json       // Denormalized progress state
  students     Student[]
  attendance   AttendanceLog[]
}

model AttendanceLog {
  id         String   @id @default(uuid())
  sectionId  String
  section    Section  @relation(fields: [sectionId], references: [id])
  date       DateTime
  records    Json     // { studentId: boolean }
  markedBy   String
  markedAt   DateTime @default(now())
  voiceLog   String?  // Transcript for audit
}

model Syllabus {
  id        String   @id @default(uuid())
  subject   String
  grade     Int
  chapters  Json     // Nested chapter/topic structure
  createdBy String
  schoolId  String
}
```

**Why PostgreSQL over MongoDB:**
- ✅ Strong typing with Prisma
- ✅ Transactions for multi-step updates
- ✅ Better query performance with indexes
- ✅ JSON columns for flexible nested data (progress, chapters)
- ✅ Native full-text search for topic lookup

**Option 2: Supabase (PostgreSQL + Realtime)**

```javascript
// Supabase provides:
// - PostgreSQL database
// - Realtime subscriptions
// - Auth (can replace Firebase)
// - Edge Functions
// - File storage

// Real-time attendance updates
supabase
  .channel('attendance:6A')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, 
    payload => updateUI(payload.new))
  .subscribe();
```

**Option 3: PlanetScale + Prisma (Serverless)**

For serverless deployments (Vercel Edge), PlanetScale offers:
- MySQL-compatible
- Branching for schema changes
- Connection pooling built-in

### API Design Recommendations

**Use tRPC for Type-Safe APIs:**

```typescript
// server/routers/syllabus.ts
export const syllabusRouter = router({
  updateProgress: protectedProcedure
    .input(z.object({
      sectionId: z.string(),
      chapterIndex: z.number(),
      topicIndex: z.number(),
      status: z.enum(['not-started', 'ongoing', 'done']),
      currentPage: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update database
    }),
    
  searchTopic: protectedProcedure
    .input(z.object({
      query: z.string(),
      sectionId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Full-text search
    }),
});

// Frontend usage - fully typed!
const { mutate: updateProgress } = trpc.syllabus.updateProgress.useMutation();
await updateProgress({
  sectionId: '6A',
  chapterIndex: 2,
  topicIndex: 1,
  status: 'done',
});
```

---

## Frontend Framework Alternatives

### Option 1: Next.js 14+ with App Router (Recommended)

**Why:**
- ✅ Server Components reduce bundle size
- ✅ Built-in API routes (no separate backend needed initially)
- ✅ Streaming for AI responses
- ✅ Built-in image optimization
- ✅ Vercel deployment is trivial

**Migration Path:**
```
src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Landing page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx      # Dashboard layout with sidebar
│   │   ├── page.tsx        # Dashboard
│   │   ├── classes/page.tsx
│   │   └── course/[id]/page.tsx
│   └── api/
│       ├── chat/route.ts   # AI streaming endpoint
│       └── trpc/[trpc]/route.ts
├── components/
├── lib/
│   ├── db.ts              # Prisma client
│   └── ai.ts              # Gemini client
└── hooks/
```

**AI Streaming with Server Components:**
```typescript
// app/api/chat/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const result = await model.generateContentStream(messages);
  
  // Stream response back
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        controller.enqueue(encoder.encode(chunk.text()));
      }
      controller.close();
    },
  });
  
  return new Response(stream);
}
```

### Option 2: Remix

**Why:**
- ✅ Better data loading patterns
- ✅ Progressive enhancement
- ✅ Smaller client bundles

**When to Use:** If SEO and progressive enhancement matter

### Option 3: Keep React + Vite, Add Tanstack Router

**Why:**
- ✅ Minimal migration effort
- ✅ Type-safe routing
- ✅ Better code splitting

```typescript
// Modern React setup
const router = createRouter({
  routeTree,
  context: { auth: undefined },
});

// Routes are type-safe
<Link to="/course/$courseId" params={{ courseId: 'geo6' }}>
```

### State Management Upgrade Options

**Option 1: Zustand (Simplest)**

```typescript
// stores/chatStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatStore {
  messages: ChatMessage[];
  isRecording: boolean;
  addMessage: (msg: ChatMessage) => void;
  startRecording: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      isRecording: false,
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      startRecording: () => set({ isRecording: true }),
    }),
    { name: 'chat-storage' }
  )
);
```

**Option 2: Jotai (Atomic)**

```typescript
// atoms/chat.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const messagesAtom = atomWithStorage<ChatMessage[]>('messages', []);
export const isRecordingAtom = atom(false);
export const liveStatusAtom = atom<LiveStatus>('disconnected');

// Derived atom
export const hasMessagesAtom = atom((get) => get(messagesAtom).length > 0);
```

### Component Library Options

**Option 1: shadcn/ui (Recommended)**
- Not a library, copies components into your codebase
- Full control, Tailwind-based
- Radix UI primitives (accessible)

**Option 2: Radix Themes**
- Complete design system
- More opinionated than shadcn

**Option 3: Mantine**
- Batteries-included
- Good for rapid prototyping

---

## Rebuild Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Set up Next.js 14 with TypeScript**
   ```bash
   npx create-next-app@latest staffroom-v2 --typescript --tailwind --app
   ```

2. **Set up Prisma + PostgreSQL**
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

3. **Define schema and migrate**
   - Users, Schools, Courses, Sections, Syllabus, Attendance

4. **Set up tRPC for type-safe APIs**
   ```bash
   npm install @trpc/server @trpc/client @trpc/react-query
   ```

5. **Migrate auth (Supabase Auth or keep Firebase)**

### Phase 2: Core Features (Week 3-4)

1. **Migrate responsive layout system**
   - Copy MobileLayout, DesktopLayout patterns
   - Add shadcn/ui components

2. **Migrate AI Context to Zustand**
   - Separate chat, voice, history stores

3. **Re-implement Gemini Live integration**
   - Create proper WebSocket service
   - Use AudioWorklet instead of ScriptProcessor

4. **Implement persistent chat bar**
   - Same architecture, better types

### Phase 3: Data & Sync (Week 5-6)

1. **Wire up database operations**
   - CRUD for all entities

2. **Add real-time with Supabase Realtime or Socket.io**
   - Attendance sync across tabs/devices
   - Syllabus progress sync

3. **Implement offline support with Service Worker**

### Phase 4: Polish & Deploy (Week 7-8)

1. **Migrate all UI polish**
   - Animations, transitions, toast notifications

2. **Add comprehensive tests**
   - Vitest for unit tests
   - Playwright for E2E

3. **Deploy to Vercel**
   - Preview deployments for PRs
   - Production deployment

---

## Summary

### What to Keep (Excellent Implementations)

1. **Gemini Live Voice Attendance** — The real-time tool calling architecture
2. **Persistent Chat Bar** — Context-based state preservation
3. **Multi-Step Tool Calling** — searchTopic → updateProgress pattern
4. **Responsive Layout System** — Mobile/Desktop separation
5. **Plugin Architecture** — Extensible chat features
6. **Activity Logging** — Firestore-based tracking

### What to Improve

1. **TypeScript** — Add from day one
2. **Backend API** — Replace dummyData.js
3. **State Management** — Zustand instead of giant contexts
4. **Real-time Sync** — Supabase Realtime or Socket.io
5. **Testing** — 80%+ coverage goal
6. **AudioWorklet** — Replace deprecated ScriptProcessor

### Recommended Stack for V2

```
Frontend:       Next.js 14 + TypeScript + Tailwind
Components:     shadcn/ui + Radix Primitives
State:          Zustand + React Query
Backend:        Next.js API Routes + tRPC
Database:       PostgreSQL (Supabase or PlanetScale)
Auth:           Supabase Auth or Firebase
AI:             Gemini API (2.0 Flash)
Real-time:      Supabase Realtime or Socket.io
Deploy:         Vercel
```

---

## Appendix: Previously Undocumented Components

### A.1 Design System Component Library

**Location:** [src/components/design-system/](src/components/design-system/)

The app has a comprehensive, internally-built design system with 12 reusable components:

| Component | File | Purpose | Key Features |
|-----------|------|---------|--------------|
| **Button** | `Button.jsx` | Primary, secondary, ghost variants | IconButton support, loading states |
| **Input** | `Input.jsx` | Text inputs and textareas | Error states, labels, sizes (sm/md/lg) |
| **Card** | `Card.jsx` | Content containers | `StatCard`, `FeatureCard` variants |
| **Badge** | `Badge.jsx` | Status indicators | `StatusBadge`, `CountBadge`, `AvatarBadge` |
| **Avatar** | `Avatar.jsx` | User avatars | `AvatarGroup` for stacking |
| **Modal** | `Modal.jsx` | Dialog overlays | `ConfirmModal` variant, ESC to close |
| **Sheet** | `Sheet.jsx` | Bottom/side sheets | Draggable, `ActionSheet` variant |
| **Dropdown** | `Dropdown.jsx` | Dropdown menus | `Select` component with animations |
| **Toast** | `Toast.jsx` | Notifications | Programmatic `toast()` API, auto-dismiss |
| **Skeleton** | `Skeleton.jsx` | Loading placeholders | Shimmer animation, multiple variants |
| **EmptyState** | `EmptyState.jsx` | Empty/error states | `OfflineState`, `LoadingState`, `ErrorState` |

**Skeleton Component Pattern (Worth Replicating):**
```javascript
// Skeleton.jsx - Shimmer animation using framer-motion
const shimmer = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
};

export function Skeleton({ variant = 'rectangular', animate = true }) {
  const variants = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4',
    avatar: 'rounded-full w-10 h-10',
    card: 'rounded-2xl h-32',
  };

  return (
    <motion.div
      variants={animate ? shimmer : {}}
      className="bg-gradient-to-r from-black-200 via-black-100 to-black-200 bg-[length:200%_100%]"
    />
  );
}
```

**Toast System (Global State Pattern):**
```javascript
// Toast.jsx - Headless toast system without external dependencies
let toastId = 0;
let currentToasts = [];
const toastListeners = new Set();

export const toast = {
  show: (options) => {
    const id = ++toastId;
    currentToasts = [...currentToasts, { id, ...options }];
    toastListeners.forEach(listener => listener(currentToasts));
    return id;
  },
  success: (message) => toast.show({ type: 'success', message }),
  error: (message) => toast.show({ type: 'error', message }),
  dismiss: (id) => {
    currentToasts = currentToasts.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener(currentToasts));
  }
};
```

---

### A.2 Chart Components for Analytics

**Location:** [src/components/charts/](src/components/charts/)

| Component | Purpose | Technology |
|-----------|---------|------------|
| **HeatmapGrid** | Syllabus progress heatmap (sections × chapters) | Custom CSS + framer-motion |
| **ProgressBar** | Simple gradient progress bar | Pure CSS |
| **SubtopicRadarChart** | Chapter coverage radar | Recharts |
| **SubtopicStackedBar** | Progress comparison bars | Recharts |
| **ProgressComparisonChart** | Side-by-side comparisons | Recharts |

**HeatmapGrid Pattern (Worth Replicating):**
```javascript
// HeatmapGrid.jsx - Color-coded progress matrix
const CATEGORY_VISUALS = {
  ahead: { rgb: [16, 185, 129], label: "Ahead of Plan" },   // Green
  track: { rgb: [250, 204, 21], label: "On Track" },        // Yellow
  catchup: { rgb: [251, 146, 60], label: "Needs Catch Up" }, // Orange
  risk: { rgb: [220, 76, 70], label: "Behind Schedule" },   // Red
};

const getCellVisuals = (value = 0) => {
  let bucket = "risk";
  if (value >= 85) bucket = "ahead";
  else if (value >= 60) bucket = "track";
  else if (value >= 35) bucket = "catchup";
  
  const [r, g, b] = CATEGORY_VISUALS[bucket].rgb;
  const opacity = Math.min(0.95, Math.max(0.18, value / 120 + 0.12));
  return { backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})` };
};
```

---

### A.3 Custom Hooks Inventory

**Location:** [src/hooks/](src/hooks/)

| Hook | File | Purpose |
|------|------|---------|
| **useMediaQuery** | `useMediaQuery.js` | Responsive breakpoint detection |
| **useMatchMedia** | `useMediaQuery.js` | Custom media query matching |
| **useTouchDevice** | `useMediaQuery.js` | Touch device detection |
| **useReducedMotion** | `useMediaQuery.js` | Accessibility - respects user motion preferences |
| **useDarkMode** | `useMediaQuery.js` | System theme detection |
| **useClassTimer** | `useClassTimer.js` | Schedule-aware class timing |
| **useApiData** | `useApi.js` | Generic data fetching with loading/error states |
| **useTeacherSections** | `useApi.js` | Teacher sections fetching |
| **useSectionStudents** | `useApi.js` | Section students fetching |
| **useAttendanceRecords** | `useApi.js` | Attendance data fetching |
| **useSyllabusProgress** | `useApi.js` | Syllabus progress fetching |

**useClassTimer Pattern (Schedule-Aware Hook):**
```javascript
// useClassTimer.js - Enables features only during class window
// Input: "Mon 09:00–09:45" - activates 15min before to 15min after

export function useClassTimer(scheduleString, windowMinutes = 15) {
  const [active, setActive] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const schedules = Array.isArray(scheduleString) ? scheduleString : [scheduleString];
    const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
    const currentDay = now.getDay();

    const anyActive = schedules.some((sched) => {
      const parts = String(sched).split(' ');
      const targetDay = dayMap[parts[0]];
      if (targetDay !== currentDay) return false;
      
      const [startRaw, endRaw] = parts[1].split('–');
      const start = buildDate(startRaw);
      const end = buildDate(endRaw);
      
      const before = new Date(start.getTime() - windowMinutes * 60000);
      const after = new Date(end.getTime() + windowMinutes * 60000);
      
      return now >= before && now <= after;
    });

    setActive(anyActive);
  }, [scheduleString, windowMinutes, now]);

  return active;
}
```

**useReducedMotion Pattern (Accessibility):**
```javascript
// Respects user's "prefers-reduced-motion" setting
export function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(query.matches);
    
    const handler = (e) => setPrefersReduced(e.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);
  
  return prefersReduced;
}

// Usage: Disable animations when user prefers reduced motion
const prefersReduced = useReducedMotion();
<motion.div animate={prefersReduced ? {} : { scale: 1.05 }} />
```

---

### A.4 Data Service Layer Architecture

**Location:** [src/services/dataService.js](src/services/dataService.js), [src/services/api.js](src/services/api.js)

The app has a well-architected abstraction layer that enables switching between mock data and real API:

```javascript
// dataService.js - Unified interface pattern
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

const mockService = {
  async getTeacher(teacherId) {
    return { success: true, data: dummyData.teacherData };
  },
  async getCourses(teacherId) {
    return { success: true, data: dummyData.teacherData.courses };
  },
  // ... all methods return same interface
};

const apiService = {
  async getTeacher(teacherId) {
    const response = await api.teacherApi.getById(teacherId);
    return response;
  },
  // ... mirrors mock interface
};

// Single export - switch based on env var
export const dataService = USE_MOCK ? mockService : apiService;
```

**API Layer Structure (Ready for Backend):**
```javascript
// api.js - REST API endpoints (currently stubbed)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const teacherApi = {
  getByEmail: (email) => apiFetch(`/teachers/email/${email}`),
  getById: (id) => apiFetch(`/teachers/${id}`),
  getSections: (teacherId) => apiFetch(`/teachers/${teacherId}/sections`),
};

export const attendanceApi = {
  mark: (data) => apiFetch('/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
  getBySectionAndDate: (sectionId, date) => apiFetch(`/attendance/section/${sectionId}?date=${date}`),
};

export const syllabusProgressApi = {
  getProgress: (sectionId, subjectId) => apiFetch(`/syllabus-progress/section/${sectionId}/subject/${subjectId}`),
  update: (data) => apiFetch('/syllabus-progress', { method: 'POST', body: JSON.stringify(data) }),
};
```

---

### A.5 Assessment Storage System

**Location:** [src/utils/assessmentStorage.js](src/utils/assessmentStorage.js)

Complete CRUD system for assessments with localStorage persistence:

```javascript
// assessmentStorage.js - Assessment management utilities
const ASSESSMENTS_STORAGE_KEY = 'staffroom_assessments';

export function createAssessment(assessmentData) {
  const newAssessment = {
    id: `asmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: assessmentData.title,
    type: assessmentData.type,  // 'quiz', 'assignment', 'unit-test', 'mid-term', 'final', 'project'
    courseId: assessmentData.courseId,
    classId: assessmentData.classId,
    dueDate: assessmentData.dueDate,
    maxPoints: assessmentData.maxPoints || 100,
    questions: assessmentData.questions || [],
    submissions: [],
    status: 'active',
    createdDate: new Date().toISOString(),
  };

  const assessments = getStoredAssessments();
  assessments.push(newAssessment);
  saveAssessments(assessments);
  return newAssessment;
}

export function updateAssessment(assessmentId, updates) { /* ... */ }
export function deleteAssessment(assessmentId) { /* ... */ }
export function getAssessmentsByClass(classId) { /* ... */ }
export function addSubmission(assessmentId, submission) { /* ... */ }
```

---

### A.6 Integration Smoke Check (Development Tool)

**Location:** [src/components/dev/IntegrationSmokeCheck.jsx](src/components/dev/IntegrationSmokeCheck.jsx)

A development-only component that validates all integrations are working:

```javascript
// IntegrationSmokeCheck.jsx - Runtime integration testing
const integrationChecks = [
  {
    name: 'Plugin System',
    check: async () => {
      const { registerChatPlugin, getChatPlugins } = await import('../../plugins');
      return typeof registerChatPlugin === 'function' && typeof getChatPlugins === 'function';
    },
  },
  {
    name: 'VoiceProgressLogger Plugin',
    check: async () => {
      const { voiceProgressLoggerPlugin } = await import('../../plugins');
      return voiceProgressLoggerPlugin?.id === 'voice-progress-logger';
    },
  },
  {
    name: 'AI Service',
    check: async () => {
      const aiService = await import('../../services/aiService');
      return (
        typeof aiService.parseVoiceTranscript === 'function' &&
        typeof aiService.generateQuiz === 'function'
      );
    },
  },
  // ... more checks for all integrations
];

// Renders a checklist with ✅ or ❌ for each integration
```

---

### A.7 Activity Logs Viewer (Admin Tool)

**Location:** [src/components/dev/ActivityLogsViewer.jsx](src/components/dev/ActivityLogsViewer.jsx)

Admin-only component for viewing cross-device activity logs from Firestore:

- Filters by user email, log level, category
- Search across log messages and data
- Download filtered logs as JSON
- Clear all logs (admin only)
- Auto-refresh every 60 seconds

---

### A.8 User-Scoped Storage System

**Location:** [src/utils/userScopedStorage.js](src/utils/userScopedStorage.js)

Critical for multi-user demo environments - all localStorage is namespaced per user:

```javascript
// userScopedStorage.js - Per-user isolated localStorage

let currentUserId = null;

// Storage key format: `staffroom:user:{userId}:{key}`
function getUserScopedKey(key) {
  if (!currentUserId) return `staffroom:anon:${key}`;
  return `staffroom:user:${currentUserId}:${key}`;
}

export function setStorageUserId(userId) {
  currentUserId = userId;
  localStorage.setItem('staffroom:lastUserId', userId);
}

export function loadUserState(key, fallback) {
  const raw = localStorage.getItem(getUserScopedKey(key));
  return raw ? JSON.parse(raw) : fallback;
}

export function saveUserState(key, value) {
  localStorage.setItem(getUserScopedKey(key), JSON.stringify(value));
}

// For global data (shared across users)
export function loadGlobalState(key, fallback) {
  const raw = localStorage.getItem(`staffroom:global:${key}`);
  return raw ? JSON.parse(raw) : fallback;
}
```

---

### A.9 Test Suite Structure

**Location:** [src/__tests__/](src/__tests__/)

The app has a test file for the plugin system:

```javascript
// chat-plugins.test.js - Plugin integration tests
describe('Chat Plugin Integration', () => {
  test('should export registerChatPlugin function', () => {
    const { registerChatPlugin } = require('../plugins/chat-plugins');
    expect(typeof registerChatPlugin).toBe('function');
  });

  test('should export getChatPlugins function', () => {
    const { getChatPlugins } = require('../plugins/chat-plugins');
    expect(typeof getChatPlugins).toBe('function');
  });

  test('should register plugins with correct interface', () => {
    // Validates plugin structure and event system
  });
});
```

**Run tests:** `npm test -- --testPathPattern=chat-plugins`

---

### A.10 Settings & Profile Pages

**SettingsPage.jsx Features:**
- Dark mode toggle (UI ready, not persisted)
- Notification preferences (email, push, SMS, sound)
- Language selector (English, Hindi, Bengali - UI only)
- "Reset Demo Data" button - clears and re-seeds all user data
- Activity Logs viewer (for admin emails only)

**ProfilePage.jsx Features:**
- Cover image with edit button
- Avatar with Google photo support
- Stats grid (courses, sections, experience, classes this month)
- Recent activity feed
- Edit profile button (UI only)

---

### A.11 AI Suggestions Caching System

**Location:** [src/utils/aiSuggestions.js](src/utils/aiSuggestions.js)

Intelligent caching and rate limiting for AI-generated content:

```javascript
// aiSuggestions.js - Cache AI responses to reduce API costs
const CACHE_DURATION = 60 * 60 * 1000;     // 1 hour cache
const RATE_LIMIT_DURATION = 5 * 60 * 1000; // 5 min between manual regenerations

export function getCachedSuggestions(contextKey) {
  const cached = localStorage.getItem(`ai_suggestions_${contextKey}`);
  if (!cached) return null;
  
  const { data, timestamp, sessionId } = JSON.parse(cached);
  const isExpired = Date.now() - timestamp >= CACHE_DURATION;
  
  return { data, timestamp, sessionId, isExpired };
}

export function cacheSuggestions(contextKey, data, sessionId = null) {
  localStorage.setItem(`ai_suggestions_${contextKey}`, JSON.stringify({
    data,
    timestamp: Date.now(),
    sessionId
  }));
}

export function checkRegenerationLimit(contextKey) {
  const lastRegen = localStorage.getItem(`ai_ratelimit_${contextKey}`);
  if (!lastRegen) return { canRegenerate: true, timeUntilNextAllowed: 0 };
  
  const timeSince = Date.now() - parseInt(lastRegen, 10);
  return {
    canRegenerate: timeSince >= RATE_LIMIT_DURATION,
    timeUntilNextAllowed: Math.max(0, RATE_LIMIT_DURATION - timeSince)
  };
}
```

---

### A.12 AI Summary Card Component

**Location:** [src/components/ai/AISummaryCard.jsx](src/components/ai/AISummaryCard.jsx)

Dashboard widget that generates AI insights with:
- Dynamic icon selection (alert, trending, calendar, book, users, etc.)
- Priority-based color coding (red/yellow/green)
- Cached responses with manual refresh option
- Rate-limited regeneration (5 min cooldown)

**Color Style Pattern:**
```javascript
const COLOR_STYLES = {
  red: {
    bg: 'bg-red-50', border: 'border-red-200',
    iconBg: 'bg-red-100', iconColor: 'text-red-600',
  },
  yellow: {
    bg: 'bg-amber-50', border: 'border-amber-200',
    iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
  },
  green: {
    bg: 'bg-emerald-50', border: 'border-emerald-200',
    iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
  },
};
```

---

### A.13 Assessment Manager Component

**Location:** [src/components/shared/AssessmentManager.jsx](src/components/shared/AssessmentManager.jsx)

Complete CRUD UI for managing assignments and tests:
- Supports both `assignment` and `test` types via prop
- Create modal with title, date, max points
- Grade entry modal with per-student scoring
- LocalStorage persistence with class-specific keys
- Auto-loads seed data from dummyData.js

**Storage Pattern:**
```javascript
// Key patterns for localStorage
const storageKeyList = `${type}:list:${classId}`;           // "assignment:list:6A"
const storageKeyGrades = `${type}:grades:${classId}:${id}`; // "assignment:grades:6A:asmt_123"
```

---

### A.14 Analytics Data Service

**Location:** [src/data/analyticsData.js](src/data/analyticsData.js)

Provides pre-computed analytics data for different user personas:

```javascript
// analyticsData.js - Persona-based analytics
const personaAttendanceTrend = {
  teacher: [{ day: "Mon", percent: 94 }, ...],  // Daily view
  hod: [{ day: "Mon", percent: 88 }, ...],      // Department view
  admin: [{ day: "W1", percent: 91 }, ...],     // Weekly school view
};

const personaCompletionSlices = {
  teacher: [
    { name: "Completed", value: 58 },
    { name: "On Track", value: 32 },
    { name: "Pending", value: 10 },
  ],
  hod: [/* Department-level breakdown */],
  admin: [/* School-level breakdown */],
};

export const getHeatmapMatrix = (courseId, teacher) => {
  // Returns sections × chapters matrix for HeatmapGrid component
  const records = getHeatmapData(courseId, teacher);
  return { sections, chapters, records };
};
```

---

### A.15 Simple Storage Utilities

**Location:** [src/utils/storage.js](src/utils/storage.js)

Base-level localStorage wrapper (non-user-scoped):

```javascript
// storage.js - Namespaced localStorage without user scoping
const getNamespacedKey = (key) => `staffroom:${key}`;

export function loadState(key, fallback) {
  const raw = localStorage.getItem(getNamespacedKey(key));
  return raw ? JSON.parse(raw) : fallback;
}

export function saveState(key, value) {
  localStorage.setItem(getNamespacedKey(key), JSON.stringify(value));
}

export function resetNamespace() {
  // Clears all staffroom: prefixed keys
  Object.keys(localStorage)
    .filter(key => key.startsWith('staffroom:'))
    .forEach(key => localStorage.removeItem(key));
}
```

**Note:** For user-specific data, use [userScopedStorage.js](src/utils/userScopedStorage.js) instead.

---

*This document should serve as the blueprint for building Staffroom AI v2 from scratch while preserving what works well.*
