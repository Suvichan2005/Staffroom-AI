# 📖 Staffroom AI: Complete Technical Documentation

> **Purpose:** Enable anyone (technical or non-technical) to understand the entire backend architecture and answer detailed questions about how the system works.  
> **Generated:** December 31, 2025  
> **Model:** Claude Opus 4.5 via GitHub Copilot

---

## 📋 Table of Contents

1. [What is Staffroom AI?](#1-what-is-staffroom-ai)
2. [The Big Picture: How It All Fits Together](#2-the-big-picture-how-it-all-fits-together)
3. [The Four Pillars of the System](#3-the-four-pillars-of-the-system)
4. [Deep Dive: Authentication System](#4-deep-dive-authentication-system)
5. [Deep Dive: AI Integration](#5-deep-dive-ai-integration)
6. [Deep Dive: Data Management](#6-deep-dive-data-management)
7. [Deep Dive: Voice Processing](#7-deep-dive-voice-processing)
8. [Module-by-Module Breakdown](#8-module-by-module-breakdown)
9. [API Reference](#9-api-reference)
10. [Function Catalog](#10-function-catalog)
11. [Data Flow Diagrams](#11-data-flow-diagrams)
12. [Glossary of Technical Terms](#12-glossary-of-technical-terms)

---

## 1. What is Staffroom AI?

### The Problem It Solves

Teachers spend too much time on administrative tasks:
- Taking attendance (calling names, marking registers)
- Tracking syllabus progress across multiple classes
- Creating quizzes and assignments
- Reporting to department heads

### The Solution

Staffroom AI is a **voice-powered AI assistant** for teachers that:
- **Listens** to the teacher speak and automatically marks attendance
- **Tracks** syllabus progress when teacher says "I finished Chapter 3"
- **Generates** quizzes and assignments with one click
- **Answers** questions like "Which students need attention?"

### How Users Experience It

1. **Teacher logs in** using Google or email/password
2. **Dashboard shows** today's classes, pending tasks, and AI insights
3. **AI chat bar** at bottom of screen (always available)
4. **Voice button** activates real-time attendance logging
5. **Progress updates** happen automatically as teacher speaks

---

## 2. The Big Picture: How It All Fits Together

### System Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER'S BROWSER                                     │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   PAGES      │  │  COMPONENTS  │  │   CONTEXT    │  │   SERVICES   │    │
│  │              │  │              │  │   (State)    │  │              │    │
│  │ • Dashboard  │  │ • ChatBar    │  │              │  │ • aiService  │    │
│  │ • ClassPage  │  │ • CourseCard │  │ • Auth       │──│ • voiceServ  │    │
│  │ • Login      │  │ • Attendance │  │ • AI         │  │ • dataServ   │    │
│  │ • Profile    │  │ • Syllabus   │  │ • Teacher    │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │   FIREBASE   │ │ GOOGLE AI    │ │  BROWSER     │
           │              │ │ (Gemini)     │ │  STORAGE     │
           │ • Auth       │ │              │ │              │
           │ • Firestore  │ │ • Text AI    │ │ • User data  │
           │   (logs)     │ │ • Voice AI   │ │ • Progress   │
           └──────────────┘ └──────────────┘ └──────────────┘
                                    │
                                    ▼
                           ┌──────────────┐
                           │   OpenAI     │
                           │   (Whisper)  │
                           │              │
                           │ • Voice →    │
                           │   Text       │
                           └──────────────┘
```

### The Flow of Information

1. **User interacts** with a page (clicks, types, speaks)
2. **Component handles** the interaction
3. **Context stores** the state (so it persists across pages)
4. **Service calls** external APIs (AI, database)
5. **Response flows back** and UI updates

---

## 3. The Four Pillars of the System

### Pillar 1: Frontend (What Users See)

| Technology | What It Does |
|------------|--------------|
| **React** | Builds the user interface from reusable components |
| **Vite** | Fast development server and build tool |
| **React Router** | Handles page navigation without full page reloads |
| **Framer Motion** | Smooth animations when things open/close |
| **Recharts** | Charts and graphs for analytics |
| **Lucide React** | Clean, consistent icons |

### Pillar 2: Authentication (Who Can Access)

| Technology | What It Does |
|------------|--------------|
| **Firebase Auth** | Manages user accounts and login |
| **Google Sign-In** | One-click login with Google account |
| **Email/Password** | Traditional login option |
| **Protected Routes** | Prevents unauthenticated access to pages |

### Pillar 3: Data Storage (Where Information Lives)

| Technology | What It Does |
|------------|--------------|
| **localStorage** | Stores user progress on their device |
| **Firestore** | Cloud database for activity logs |
| **User-Scoped Storage** | Keeps each user's data separate |
| **Mock Data** | Demo data when no backend exists |

### Pillar 4: AI Intelligence (The Smart Features)

| Technology | What It Does |
|------------|--------------|
| **Google Gemini** | Text-based AI chat and tool calling |
| **Gemini Live** | Real-time voice streaming with WebSocket |
| **OpenAI Whisper** | Accurate voice-to-text transcription |
| **Web Speech API** | Free browser-based voice recognition |

---

## 4. Deep Dive: Authentication System

### How Login Works

```
User clicks                   Firebase verifies            App stores user
"Sign in with Google"  ───►   with Google servers   ───►   info in Context
       │                              │                           │
       │                              │                           ▼
       │                              │                    User sees
       │                              │                    Dashboard
       ▼                              ▼                           
Opens Google                  Returns user token
popup window                  (proof of identity)
```

### The AuthContext.jsx Explained

This file is the **brain** of the authentication system. Here's what each part does:

```javascript
// 1. Create a "container" for auth info that any component can access
const AuthContext = createContext();

// 2. The AuthProvider wraps the entire app
export function AuthProvider({ children }) {
    // 3. Track the current user (null = not logged in)
    const [user, setUser] = useState(null);
    
    // 4. Track if we're still checking login status
    const [loading, setLoading] = useState(true);
    
    // 5. Listen for login/logout events
    useEffect(() => {
        // Firebase tells us whenever auth state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                setUser(user);
                setStorageUserId(user.uid); // Enable per-user storage
            } else {
                // User is signed out
                setUser(null);
                clearStorageUserId();
            }
            setLoading(false);
        });
    }, []);
    
    // 6. Provide login/logout functions to the rest of the app
    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
```

### Protected Routes

When a user tries to visit `/dashboard` without being logged in:

```javascript
// ProtectedRoute.jsx
export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    
    // Still checking? Show nothing (prevents flash)
    if (loading && !user) return null;
    
    // Not logged in? Redirect to login page
    if (!user) return <Navigate to="/login" />;
    
    // Logged in? Show the protected page
    return children;
}
```

---

## 5. Deep Dive: AI Integration

### The Three AI Systems

#### System 1: Gemini Text API

**Purpose:** Answer questions, search syllabus, update progress

**How it works:**
1. User types a question in chat
2. App sends question + context to Gemini
3. Gemini decides which "tool" to use (if any)
4. Tool executes and returns data
5. Gemini formulates a natural language response
6. Response appears in chat

**Example Flow:**

```
User: "What's the next topic for 8B History?"

   ┌─────────────────────────────────────────────────┐
   │ Gemini receives prompt with tool definitions    │
   │                                                 │
   │ Available tools:                                │
   │ • getNextTopic(sectionId)                       │
   │ • getProgress(sectionId)                        │
   │ • updateProgress(sectionId, chapter, topic)     │
   │ • searchTopic(query)                            │
   │ • navigateTo(destination)                       │
   └─────────────────────────────────────────────────┘
                         │
                         ▼
   ┌─────────────────────────────────────────────────┐
   │ Gemini decides: "I should call getNextTopic"    │
   │                                                 │
   │ Function call: getNextTopic({ sectionId: "8B" })│
   └─────────────────────────────────────────────────┘
                         │
                         ▼
   ┌─────────────────────────────────────────────────┐
   │ Tool executes locally:                          │
   │                                                 │
   │ Returns: {                                      │
   │   nextTopic: "Gandhian Era",                    │
   │   nextChapter: "National Movements",            │
   │   pageFrom: 52, pageTo: 60                      │
   │ }                                               │
   └─────────────────────────────────────────────────┘
                         │
                         ▼
   ┌─────────────────────────────────────────────────┐
   │ Gemini receives tool result                     │
   │                                                 │
   │ Formulates response:                            │
   │ "The next topic for 8B History is 'Gandhian    │
   │ Era' in Chapter 3: National Movements           │
   │ (pages 52-60)."                                 │
   └─────────────────────────────────────────────────┘
```

#### System 2: Gemini Live API (Real-Time Voice)

**Purpose:** Listen to teacher speaking and mark attendance in real-time

**How it works:**
1. Teacher clicks "Voice Mode" button
2. App opens WebSocket connection to Gemini
3. Microphone audio is converted to PCM format
4. Audio streams to Gemini continuously
5. Gemini transcribes and calls tools as it hears names
6. UI updates instantly as students are marked

**Technical Flow:**

```javascript
// geminiLiveService.js - Simplified explanation

// 1. Capture microphone audio
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// 2. Convert to format Gemini expects (16kHz, 16-bit PCM)
const pcmData = convertToInt16PCM(audioBuffer);

// 3. Send through WebSocket
this.ws.send(JSON.stringify({
  realtimeInput: {
    mediaChunks: [{ data: base64(pcmData), mimeType: "audio/pcm" }]
  }
}));

// 4. Gemini responds with transcription + tool calls
// Example message from Gemini:
{
  serverContent: {
    inputTranscription: { text: "Rahul present" },
    toolCall: {
      functionCalls: [{
        name: "mark_student_present",
        args: { student_name: "Rahul Kumar" }
      }]
    }
  }
}

// 5. Execute the tool and update UI
markStudentPresent("Rahul Kumar");
```

#### System 3: OpenAI Whisper (Backup Voice)

**Purpose:** More accurate transcription when needed

**When it's used:**
- Browser Speech API fails
- User requests higher accuracy
- Non-English language support needed

```javascript
// voiceService.js
async function transcribeWithWhisper(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: formData
    });
    
    return await response.json(); // { text: "transcribed text" }
}
```

### AI Tools Catalog

The AI can call these functions to perform actions:

| Tool Name | Purpose | Parameters |
|-----------|---------|------------|
| `getAvailableCourses` | List all courses teacher has | None |
| `getSyllabus` | Get full syllabus with progress | courseId, subject, sectionId |
| `searchTopic` | Find a topic by name | searchQuery, filterSubject, filterSectionId |
| `getProgress` | Get completion % for section | sectionId (optional) |
| `getNextTopic` | Find next incomplete topic | sectionId (required) |
| `getSchedule` | Get upcoming classes | daysAhead |
| `getAttendance` | Get attendance summary | sectionId (optional) |
| `getAssignments` | List assignments | sectionId (optional) |
| `getStudentsAtRisk` | Find struggling students | None |
| `updateProgress` | Mark topic complete/ongoing | sectionId, chapterIndex, topicIndex, status |
| `findTopicByPage` | Find topic containing page # | sectionId, pageNumber |
| `navigateTo` | Go to another page | destination |
| `parseAttendance` | Process attendance transcript | transcript, classId, studentNames |

---

## 6. Deep Dive: Data Management

### Where Data Lives

#### Browser Storage (localStorage)

**What's stored:**
- Syllabus progress (which topics are complete)
- Chat history
- User preferences
- Teacher profile cache

**Why browser storage?**
- Works offline
- Instant access (no network delay)
- Privacy (data stays on device)

**User Scoping:**
Each user's data is stored with their unique ID:

```
localStorage keys:
├── staffroom:user:ABC123:chat_history
├── staffroom:user:ABC123:progress:6A
├── staffroom:user:XYZ789:chat_history  ← Different user
├── staffroom:user:XYZ789:progress:8B
└── staffroom:global:app_version
```

#### Firebase Firestore (Cloud)

**What's stored:**
- Activity logs (for admin dashboard)
- Login events with IP addresses
- AI usage analytics

**Why Firestore?**
- Accessible from any device
- Admin can view all users' logs
- Survives browser data clearing

### The Data Service Pattern

The app uses a clever pattern to switch between mock data and real API:

```javascript
// dataService.js

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

// Two implementations of the same interface
const mockService = {
    async getTeacher(id) {
        return { success: true, data: dummyData.teacherData };
    }
};

const apiService = {
    async getTeacher(id) {
        return await fetch(`/api/teachers/${id}`).then(r => r.json());
    }
};

// Export the right one based on config
export const dataService = USE_MOCK ? mockService : apiService;
```

### Data Entities Explained

#### Teacher Data Structure

```javascript
{
    id: "T001",
    name: "Teacher Name",
    email: "teacher@school.edu",
    courses: [
        {
            id: "geo6",
            title: "Grade 6 Geography",
            syllabusRef: "syll_geo6",  // Links to syllabus
            sections: [
                {
                    id: "6A",
                    schedules: ["Mon 09:00–09:45", "Thu 11:00–11:45"],
                    progress: {
                        1: {  // Chapter 1
                            topics: {
                                1: { status: "done", completedAt: "2025-11-01" },
                                2: { status: "ongoing", currentPage: 32 },
                                3: { status: "not-started" }
                            }
                        }
                    }
                }
            ]
        }
    ]
}
```

#### Syllabus Structure

```javascript
{
    id: "syll_geo6",
    subject: "Geography",
    grade: 6,
    chapters: [
        {
            index: 1,
            title: "The Earth and the Solar System",
            subTopics: [
                {
                    index: 1,
                    title: "The Solar System Overview",
                    pageFrom: 1,
                    pageTo: 6
                },
                // ... more topics
            ]
        }
    ]
}
```

#### Student Structure

```javascript
{
    studentId: "STU001",
    name: "Rahul Kumar",
    rollNo: 1,
    classId: "6A",
    email: "rahul@student.edu"
}
```

---

## 7. Deep Dive: Voice Processing

### The Voice Processing Pipeline

```
Teacher speaks              Audio captured        Converted to
"Rahul present,     ───►    by microphone   ───►  digital signal
Priya absent"               (browser API)         (PCM format)
      │                                                 │
      │                                                 │
      ▼                                                 ▼
Names matched                                    Sent to Gemini
to student list        ◄───   AI interprets   ◄───  via WebSocket
(fuzzy matching)              the speech
      │
      │
      ▼
Attendance updated           UI shows green
in local storage      ───►   checkmark next
                             to student name
```

### Audio Processing Details

**Why PCM format?**

PCM (Pulse Code Modulation) is the raw digital representation of audio. Gemini expects:
- Sample rate: 16,000 samples per second (16kHz)
- Bit depth: 16 bits per sample
- Channels: 1 (mono)

```javascript
// Converting browser audio to PCM
float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        // Float range: -1 to 1
        // Int16 range: -32768 to 32767
        const sample = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return int16Array;
}
```

### Fuzzy Name Matching

Teachers might say "Rahul" but the database has "Rahul Kumar". The system uses **fuzzy matching**:

```javascript
// Simplified similarity algorithm
function similarityScore(spoken, actual) {
    const words1 = spoken.toLowerCase().split(' ');
    const words2 = actual.toLowerCase().split(' ');
    
    let matches = 0;
    for (const word1 of words1) {
        for (const word2 of words2) {
            if (word2.includes(word1) || word1.includes(word2)) {
                matches++;
            }
        }
    }
    
    return matches / Math.max(words1.length, words2.length);
}

// Examples:
similarityScore("Rahul", "Rahul Kumar")  → 0.5 (50% match)
similarityScore("Priya Singh", "Priya Singh")  → 1.0 (100% match)
```

---

## 8. Module-by-Module Breakdown

### 8.1 Pages (src/pages/)

| Page | File | Purpose |
|------|------|---------|
| Landing | `Landing.jsx` | Marketing page for non-logged-in users |
| Login | `Login.jsx` | Email/password and Google login |
| Register | `Register.jsx` | Create new account |
| Dashboard | `Dashboard.jsx` | Main hub with today's classes and stats |
| CoursePage | `CoursePage.jsx` | Single course with all sections |
| ClassPage | `ClassPage.jsx` | Single section with syllabus and attendance |
| ChatPage | `ChatPage.jsx` | Full-screen AI chat interface |
| SchedulePage | `SchedulePage.jsx` | Weekly schedule view |
| ProfilePage | `ProfilePage.jsx` | User profile settings |
| HODDashboard | `HODDashboard.jsx` | Department head overview |
| AdminDashboard | `AdminDashboard.jsx` | System administration |

### 8.2 Components (src/components/)

#### AI Components (src/components/ai/)

| Component | Purpose |
|-----------|---------|
| `PersistentChatBar.jsx` | Mobile chat bar fixed at bottom |
| `DesktopChatBar.jsx` | Desktop chat panel |
| `ChatMessage.jsx` | Single message bubble |
| `ChatInput.jsx` | Text input with send button |
| `MicInput.jsx` | Microphone button with recording state |
| `VoiceAttendanceLogger.jsx` | Real-time attendance via voice |
| `GlobalAssistant.jsx` | Quick AI input on dashboard |
| `AISummaryCard.jsx` | AI-generated insights card |

#### Layout Components (src/components/layout/)

| Component | Purpose |
|-----------|---------|
| `ResponsiveLayout.jsx` | Auto-switches mobile/desktop |
| `MobileLayout.jsx` | Mobile-specific shell |
| `DesktopLayout.jsx` | Desktop-specific shell |
| `TopNav.jsx` | Navigation bar at top |
| `BottomNav.jsx` | Mobile navigation at bottom |
| `Sidebar.jsx` | Desktop side navigation |
| `PageShell.jsx` | Consistent page wrapper |

#### Design System (src/components/design-system/)

| Component | Purpose |
|-----------|---------|
| `Button.jsx` | Styled button variants |
| `Input.jsx` | Form input field |
| `Card.jsx` | Container with shadow |
| `Modal.jsx` | Popup dialog |
| `Sheet.jsx` | Slide-in panel |
| `Avatar.jsx` | User profile picture |
| `Badge.jsx` | Status indicator |
| `Toast.jsx` | Notification popup |
| `Skeleton.jsx` | Loading placeholder |
| `EmptyState.jsx` | "No data" placeholder |

### 8.3 Context Providers (src/context/)

| Context | What It Manages |
|---------|-----------------|
| `AuthContext.jsx` | User login state, login/logout functions |
| `AIContext.jsx` | Chat history, messages, voice recording state |
| `TeacherContext.jsx` | Current teacher data, courses, sections |
| `LayoutContext.jsx` | Sidebar open/closed, theme preferences |

### 8.4 Services (src/services/)

| Service | What It Does |
|---------|--------------|
| `aiService.js` | All Gemini AI calls and tool functions |
| `geminiLiveService.js` | WebSocket voice streaming |
| `voiceService.js` | Browser/Whisper transcription |
| `dataService.js` | Data access abstraction |
| `api.js` | HTTP client for backend |
| `activityLogger.js` | Logging to Firestore |
| `chatToolsDefinition.js` | Tool definitions for voice |

### 8.5 Hooks (src/hooks/)

| Hook | What It Does |
|------|--------------|
| `useMediaQuery.js` | Detect screen size (mobile/desktop) |
| `useClassTimer.js` | Enable features during class time |
| `useApi.js` | Data fetching with loading states |

### 8.6 Plugins (src/plugins/)

| Plugin | What It Does |
|--------|--------------|
| `voiceProgressLoggerPlugin.jsx` | Voice syllabus updates |
| `syllabusAIHelperPlugin.jsx` | Quick syllabus actions |
| `chat-plugins.jsx` | Plugin system core |

---

## 9. API Reference

### External APIs Used

#### 1. Google Gemini API

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

**Purpose:** Text generation and function calling

**Request Format:**
```javascript
{
    contents: [{ parts: [{ text: "User message" }] }],
    tools: [{ functionDeclarations: [...] }],
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
    }
}
```

#### 2. Gemini Live API (WebSocket)

**Endpoint:** `wss://generativelanguage.googleapis.com/ws/...`

**Purpose:** Real-time audio streaming

**Setup Message:**
```javascript
{
    setup: {
        model: "models/gemini-2.0-flash-exp",
        generationConfig: { responseModalities: ["TEXT"] },
        systemInstruction: { parts: [{ text: "You are an attendance assistant..." }] },
        tools: [{ functionDeclarations: [...] }],
        inputAudioTranscription: {}
    }
}
```

#### 3. OpenAI Whisper API

**Endpoint:** `https://api.openai.com/v1/audio/transcriptions`

**Purpose:** Voice-to-text transcription

**Request Format:**
```javascript
// FormData with:
- file: audio blob (webm format)
- model: "whisper-1"
- language: "en"
```

#### 4. Firebase Auth

**Purpose:** User authentication

**Methods Used:**
- `signInWithPopup(auth, googleProvider)` - Google login
- `signInWithEmailAndPassword(auth, email, password)` - Email login
- `createUserWithEmailAndPassword(auth, email, password)` - Registration
- `signOut(auth)` - Logout
- `onAuthStateChanged(auth, callback)` - Listen for auth changes

#### 5. Firebase Firestore

**Purpose:** Activity logging

**Collection:** `logs1`

**Document Structure:**
```javascript
{
    id: "unique-id",
    timestamp: Firestore.Timestamp,
    level: "info" | "warn" | "error",
    category: "auth" | "navigation" | "ai" | "action",
    message: "User logged in",
    userEmail: "user@example.com",
    userId: "firebase-uid",
    sessionId: "session-123",
    data: { /* additional context */ }
}
```

### Backend API (When Built)

The frontend expects these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/teachers/:id` | GET | Get teacher profile |
| `/api/v1/teachers/email/:email` | GET | Get teacher by email |
| `/api/v1/sections/:id` | GET | Get section details |
| `/api/v1/sections/:id/students` | GET | Get students in section |
| `/api/v1/attendance/mark` | POST | Record attendance |
| `/api/v1/assignments` | GET | List assignments |
| `/api/v1/syllabus/:id` | GET | Get syllabus |

---

## 10. Function Catalog

### AI Service Functions (aiService.js)

#### callGemini(prompt, usePro, retryCount)
```
Purpose: Make a request to Google Gemini API
Parameters:
  - prompt: The text to send to AI
  - usePro: Use more powerful model (default: false)
  - retryCount: Number of retry attempts for rate limits
Returns: AI response text
Handles: Rate limiting with exponential backoff
```

#### tool_getSyllabus(courseId, subject, sectionId)
```
Purpose: Get full syllabus with progress for a course
Parameters:
  - courseId: Direct course ID like "geo6"
  - subject: Subject name like "geography" (fuzzy match)
  - sectionId: Section like "6A" (narrows to one section)
Returns: {
  courseId, courseTitle, chapters: [...],
  currentTopic, nextTopic, overallPercent
}
```

#### tool_updateProgress(sectionId, chapterIndex, topicIndex, status, options)
```
Purpose: Update syllabus progress for a topic
Parameters:
  - sectionId: Which section (e.g., "8B")
  - chapterIndex: Which chapter (1-based)
  - topicIndex: Which topic (1-based)
  - status: "complete" | "ongoing" | "pending"
  - options: { currentPage, notes }
Returns: { success: true, topicTitle, newStatus }
Side Effects: Persists to localStorage
```

#### tool_findTopicByPage(sectionId, pageNumber)
```
Purpose: Find which topic contains a specific page
Use Case: Teacher says "I'm on page 42"
Parameters:
  - sectionId: Which section
  - pageNumber: Page number to search
Returns: {
  found: true,
  chapterIndex, topicIndex, topicTitle,
  pageFrom, pageTo
}
```

### Voice Service Functions (voiceService.js)

#### startBrowserTranscription(options)
```
Purpose: Start free browser-based voice recognition
Parameters:
  - onResult: Callback when transcription complete
  - onError: Callback on error
  - onInterim: Callback for live partial results
  - manualStop: Keep listening until stopped (default: true)
Returns: Recognition instance with start/stop methods
```

#### transcribeWithWhisper(audioBlob)
```
Purpose: Send audio to OpenAI Whisper for transcription
Parameters:
  - audioBlob: Recorded audio (webm format)
Returns: { transcript: "text", confidence: 0.95, method: "whisper" }
```

### Storage Functions (userScopedStorage.js)

#### loadUserState(key, fallback)
```
Purpose: Load data from localStorage (user-scoped)
Parameters:
  - key: Storage key (automatically prefixed with user ID)
  - fallback: Default value if not found
Returns: Stored value or fallback
```

#### saveUserState(key, value)
```
Purpose: Save data to localStorage (user-scoped)
Parameters:
  - key: Storage key
  - value: Data to store (automatically JSON-serialized)
```

#### setStorageUserId(userId)
```
Purpose: Set current user ID for storage namespacing
Called: On login
Side Effect: All subsequent storage operations scoped to this user
```

---

## 11. Data Flow Diagrams

### Flow 1: User Login

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Login Page   │────▶│ Firebase Auth │────▶│ AuthContext   │
│               │     │               │     │               │
│ User clicks   │     │ Verifies with │     │ Stores user   │
│ "Sign in with │     │ Google        │     │ in state      │
│ Google"       │     │               │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
                                                    │
                                                    ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Dashboard    │◀────│ React Router  │◀────│ setUserId()   │
│               │     │               │     │               │
│ Shows user's  │     │ Redirect to   │     │ Enable per-   │
│ personalized  │     │ /dashboard    │     │ user storage  │
│ data          │     │               │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
```

### Flow 2: Voice Attendance

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Mic Button   │────▶│ getUserMedia  │────▶│ AudioContext  │
│               │     │               │     │               │
│ Teacher       │     │ Request       │     │ Set up audio  │
│ clicks record │     │ microphone    │     │ processing    │
└───────────────┘     └───────────────┘     └───────────────┘
                                                    │
                                                    ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  WebSocket    │◀────│ PCM Convert   │◀────│ Audio Chunks  │
│               │     │               │     │               │
│ Stream to     │     │ Convert to    │     │ Capture audio │
│ Gemini Live   │     │ 16kHz Int16   │     │ in 4096-      │
│               │     │ PCM format    │     │ sample chunks │
└───────────────┘     └───────────────┘     └───────────────┘
        │
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Gemini AI    │────▶│ Tool Call     │────▶│ UI Update     │
│               │     │               │     │               │
│ Transcribes   │     │ Execute       │     │ Show green    │
│ "Rahul        │     │ mark_present  │     │ checkmark,    │
│ present"      │     │ function      │     │ play sound    │
└───────────────┘     └───────────────┘     └───────────────┘
```

### Flow 3: AI Chat Message

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   ChatInput   │────▶│  AIContext    │────▶│  aiService    │
│               │     │               │     │               │
│ User types    │     │ Add to        │     │ processChat() │
│ "What's next  │     │ messages[]    │     │ with tools    │
│ for 8B?"      │     │               │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
                                                    │
                                                    ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Gemini API   │────▶│ Tool Engine   │────▶│ Data Lookup   │
│               │     │               │     │               │
│ Decides to    │     │ Execute       │     │ Query local   │
│ call          │     │ getNextTopic  │     │ data/storage  │
│ getNextTopic  │     │ function      │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
                                                    │
                                                    ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  AIContext    │◀────│  Gemini API   │◀────│ Tool Result   │
│               │     │               │     │               │
│ Add assistant │     │ Format        │     │ { nextTopic:  │
│ message to    │     │ natural       │     │ "Gandhian     │
│ messages[]    │     │ response      │     │ Era" }        │
└───────────────┘     └───────────────┘     └───────────────┘
```

---

## 12. Glossary of Technical Terms

| Term | Definition |
|------|------------|
| **API** | Application Programming Interface - a way for programs to talk to each other |
| **Authentication** | Proving who you are (login) |
| **Authorization** | Checking what you're allowed to do |
| **Bundle** | All JavaScript files combined into one for the browser |
| **Component** | A reusable piece of UI (like a button or card) |
| **Context** | React's way of sharing data across many components |
| **CORS** | Cross-Origin Resource Sharing - security rules for web requests |
| **CRUD** | Create, Read, Update, Delete - basic data operations |
| **Endpoint** | A specific URL that accepts requests |
| **Firebase** | Google's backend-as-a-service platform |
| **Firestore** | Firebase's NoSQL database |
| **Function Calling** | AI's ability to request specific actions |
| **Hook** | React function that adds features to components |
| **JWT** | JSON Web Token - a secure way to pass user info |
| **localStorage** | Browser storage that persists across sessions |
| **Mock Data** | Fake data used for testing/demos |
| **OAuth** | Standard protocol for "Sign in with Google/Facebook" |
| **PCM** | Pulse Code Modulation - raw audio format |
| **Provider** | Component that shares data with its children |
| **REST** | Representational State Transfer - API design style |
| **Route** | A URL path like /dashboard or /login |
| **SDK** | Software Development Kit - pre-built code for a service |
| **SPA** | Single Page Application - loads once, updates dynamically |
| **State** | Data that changes and triggers UI updates |
| **Tool** | Function the AI can call to perform actions |
| **WebSocket** | Two-way real-time connection between browser and server |

---

## Frequently Asked Questions

### Q: Where is the backend server?
**A:** Currently, there is no backend server. The app uses mock data from `src/data/dummyData.js`. The API client (`src/services/api.js`) is ready for when a backend is built.

### Q: How is user data kept separate?
**A:** The `userScopedStorage.js` utility prefixes all localStorage keys with the user's Firebase UID. This ensures each user only sees their own data.

### Q: What happens if the AI API key is missing?
**A:** The app falls back to mock responses defined in `getMockResponse()` function in `aiService.js`.

### Q: Can the app work offline?
**A:** Partially. The UI works offline, and progress saved to localStorage persists. AI features require internet.

### Q: How does the schedule-aware feature work?
**A:** The `useClassTimer` hook checks the current time against schedule strings like "Mon 09:00–09:45" and returns true only during that window (plus/minus a buffer).

### Q: Where are activity logs stored?
**A:** In Firebase Firestore under the `logs1` collection. Each log includes timestamp, user email, action type, and device info.

---

*This documentation was generated by analyzing the complete Staffroom-AI repository. For updates, regenerate this document when significant changes are made to the codebase.*

