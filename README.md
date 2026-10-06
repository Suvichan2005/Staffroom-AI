# Staffroom AI

> **A voice-first, AI-powered teaching companion and academic operations platform.** Built to streamline classroom routines—attendance taking, syllabus tracking, assessment authoring, and cross-section analytics—into unified, hands-free workflows.

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%7C_Firestore_%7C_Hosting-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Google Cloud Run](https://img.shields.io/badge/Cloud_Run-Containerized_Gateway-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Gemini](https://img.shields.io/badge/Gemini_API-3.8_Flash_%7C_Live_WebSocket-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)

---

## 📌 Overview

**Staffroom AI** bridges the gap between repetitive administrative duties and instructional time. In typical academic institutions, educators juggle disparate tools for logging attendance registers, keeping physical logbooks of syllabus coverage, drafting tests, and submitting progress reports to department heads.

Staffroom resolves this overhead by serving as an intelligent, contextual copilot in the classroom:
- **Hands-Free Classroom Operations**: A teacher speaks naturally during roll call or lecture transitions (*"Mark Priya present, Rahul absent"* or *"I wrapped up Plate Tectonics in 8A today"*), and the system parses the intent, confirms the action, and logs attendance or updates the syllabus tree in real time.
- **Multimodal AI Tools**: Native support for Gemini Live bidirectional voice streaming, Gemini Vision for document/roster/timetable extraction, and structured function calling for course management and assessment generation.
- **Role-Based Institutional Visibility**: Tailored dashboards for **Teachers** (daily workflow, class schedules, assignments), **Heads of Department (HOD)** (cross-section syllabus parity matrices and topic heatmaps), and **IT Administrators** (teacher mapping, onboarding wizards, system audit logs).
- **Hardened Dual-Tier Architecture**: A client-side SPA accompanied by an Express gateway running in Google Cloud Run that protects Gemini API keys, enforces per-user Redis-backed rate limiting, verifies Firebase JWT ID tokens, and validates all function calls server-side.

---

## 🌐 Live Deployments

The application is deployed across managed Google Cloud infrastructure:

| Component | Platform | URL / Endpoint |
|---|---|---|
| **Frontend Web App** | Firebase Hosting | [`https://staffroom-ai.web.app`](https://staffroom-ai.web.app) |
| **Secondary Domain** | Firebase Hosting | [`https://staffroom-ai.firebaseapp.com`](https://staffroom-ai.firebaseapp.com) |
| **Backend API Gateway** | Google Cloud Run (`asia-south1`) | `https://<service-url>.run.app/api` (Health check: `/api/health`) |

---

## 🚀 Key Features

### 1. Voice-Driven Classroom Automation
- **Real-Time Gemini Live Streaming (`geminiLiveService.js`)**: Directly opens a low-latency bidirectional WebSocket connection with Gemini using an `AudioWorklet` processor streaming 16kHz Int16 PCM audio.
- **Fuzzy Student Matching & Intent Resolution**: Maps phonetic speech against enrolled class rosters with fuzzy similarity scoring and roll-number detection, handling accent variations and room noise gracefully.
- **Browser Fallback Speech Recognition**: Web Speech API (`webkitSpeechRecognition`) fallback for voice input in standard browser environments.

### 2. Context-Aware Global AI Assistant
- **Persistent Floating Chat Bar (`DesktopChatBar.jsx` / `AIContext.jsx`)**: Floats unobtrusively across all pages with animated expanding drawers, file attachments, and active session history.
- **URL & Temporal State Awareness**: AI automatically inspects the current active route and local device clock to detect the current subject, section, and scheduled period without requiring explicit prompts.
- **Dynamic Tool Dispatch (`chatToolsDefinition.js` & `toolExecutors.js`)**: Executes live client actions including `mark_student_present`, `mark_student_absent`, `update_syllabus_progress`, `get_schedule`, `get_attendance_summary`, and automated in-app page navigation (`navigateTo`).
- **File & Vision Understanding**: Upload images, scanned timetables, rosters, or syllabus documents parsed via Gemini Vision base64 inline payloads.

### 3. Syllabus & Curriculum Progress Tracking
- **Interactive Syllabus Trees**: Hierarchical display of course units, chapters, sub-topics, and page numbers with instant toggle between `not-started`, `ongoing`, and `completed`.
- **Page-to-Topic Ingestion**: Ingests textbook page ranges so teachers can state *"I'm on page 42"* and have the system calculate the current active module.
- **Cross-Section Parity Heatmap (`HeatmapGrid.jsx`)**: Visual grid tracking syllabus divergence across parallel sections (e.g., comparing Section A vs Section B progress in Grade 8 History).

### 4. Assessment & Gradebook Engine
- **AI Quiz & Assignment Generator**: One-click generation of multiple-choice questions, short answers, or assignment prompts aligned to the active curriculum chapter.
- **Gradebook Matrix (`GradeBookMatrix.jsx`)**: Interactive grid for evaluating student performance, viewing class averages, and recording batch grades with offline-resilient local persistence.

### 5. Multi-Persona Portals & Role-Based Access Control
- **Teacher View**: Daily timeline, scheduled classes, upcoming periods, student roster access, quick assessment creators, and personalized notifications.
- **HOD Dashboard (`HODDashboard.jsx`)**: Department-level oversight comparing syllabus velocity, parity gaps, and coverage radar charts (`SubtopicRadarChart.jsx`).
- **Admin Dashboard (`AdminDashboard.jsx`)**: Institution-wide statistics (student count, active classes, attendance health), batch teacher-course mapping, timetable management, and automated onboarding wizards.
- **System Activity & Audit Logs (`LogsPage.jsx`)**: Restricted administrator view rendering real-time security, authentication, AI usage, and navigation logs persisted to Cloud Firestore.

---

## 🏗️ Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / USER BROWSER                           │
│                                                                        │
│   React 18 SPA (Vite)  •  React Router v6  •  Tailwind CSS / Tokens     │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ AppLayout / ResponsiveLayout / Drawer                          │   │
│   │ ├── DashboardNew     ├── CoursePageNew    ├── ClassPageNew     │   │
│   │ ├── SchedulePage     ├── AssessmentsNew   ├── HODDashboard     │   │
│   │ └── AdminDashboard   └── LogsPage         └── ProfilePage      │   │
│   └────────────────────────────────────────────────────────────────┘   │
│          │                              │                    │         │
│          ▼                              ▼                    ▼         │
│   ┌───────────────┐              ┌───────────────┐    ┌──────────────┐ │
│   │  AuthContext  │              │   AIContext   │    │TeacherContext│ │
│   │ (Firebase SDK)│              │(Chat/Live/WS) │    │(State/Store) │ │
│   └──────┬────────┘              └───────┬───────┘    └──────┬───────┘ │
│          │                               │                   │         │
└──────────┼───────────────────────────────┼───────────────────┼─────────┘
           │                               │                   │
           │ Firebase Auth Bearer Token    │ /api/ai/* Proxy   │ Per-user scoped
           │                               │                   │ localStorage
           ▼                               ▼                   ▼
┌──────────────────────┐        ┌──────────────────────┐ ┌───────────────┐
│   FIREBASE CLOUD     │        │  EXPRESS API GATEWAY │ │  LOCAL STORE  │
│                      │        │  (Google Cloud Run)  │ │ (IndexedDB /  │
│ • Authentication     │        │                      │ │  localStorage)│
│ • Firestore Database │◄───────┤ • Admin Token Verify │ └───────────────┘
│   - logs1 (Audits)   │ Bearer │ • Helmet & Strict CORS│
│   - chatSessions     │ Auth   │ • Redis Rate Limiter │
│ • Security Rules     │        │ • Gemini Proxy/Vision│
│ • Static CDN Hosting │        └──────────┬───────────┘
└──────────────────────┘                   │
                                           │ Google AI SDK (Server-Side Key)
                                           ▼
                                ┌──────────────────────┐
                                │   GOOGLE GEMINI AI   │
                                │                      │
                                │ • Gemini 2.5 Flash   │
                                │ • Gemini 2.5 Pro     │
                                │ • Live WS Protocol   │
                                └──────────────────────┘
```

### End-to-End Request Lifecycle
1. **Authentication**: Users sign in through Firebase Auth (Google Popup or Email/Password). The active identity issues a Firebase ID token (JWT) stored with IndexedDB/browser persistence.
2. **AI Proxying**: Client AI requests (chat completion, vision parsing, agent tools) are sent to the Express backend (`/api/ai/*`) bearing the client's `Authorization: Bearer <idToken>` header.
3. **Gateway Verification**: The backend verifies the token using the `firebase-admin` SDK, extracts claims (`req.user`), enforces per-user Redis rate limits (or memory fallback), validates schemas, and queries Google Gemini using internal environment credentials. No Google API keys are ever leaked to client bundles.
4. **Audit Trail**: Every significant action (logins, navigation changes, tool executions, AI queries, caught errors) is piped through `activityLogger.js` directly to Cloud Firestore's `logs1` collection, governed by strict declarative security rules (`firestore.rules`).

---

## 💻 Tech Stack & Tooling

### Frontend
- **Framework & Build**: [React 18.2](https://react.dev/), [Vite 5.4](https://vitejs.dev/) (ESM, manual chunking for React, Firebase, and Framer Motion)
- **Routing**: [React Router DOM 6.23](https://reactrouter.com/) (Code-splitting via `React.lazy` and `Suspense`, Protected, HOD, and Admin Route Guards)
- **State & Context**: Context API (`AuthContext`, `AIContext`, `TeacherContext`, `LayoutContext`)
- **Styling & Design System**: Tailwind CSS utilities + custom CSS design tokens (`src/styles/tokens.css`), custom accessible primitives (Buttons, Modals, Sheets, Drawers, Badges, Dropdowns, Skeletons)
- **Animations**: [Framer Motion 11.0](https://www.framer.com/motion/) (smooth spring transitions, collapsible chat drawers, layout shifts)
- **Charts & Data Viz**: [Recharts 2.10](https://recharts.org/) (Responsive Area Charts, Bar Charts, Heatmap grids, Subtopic Radar Charts)
- **Icons & Notifications**: [Lucide React 0.363](https://lucide.dev/), [react-hot-toast 2.4](https://react-hot-toast.com/)
- **Audio & Live Streaming**: Custom `AudioWorklet` processor (`public/audio-worklet-processor.js`), native Web Audio API, Web Speech API

### Backend API Gateway (`backend/`)
- **Runtime & Framework**: [Node.js 20 LTS](https://nodejs.org/) (ES Modules), [Express 4.21](https://expressjs.com/)
- **Security & Hardening**:
  - [Helmet 8.0](https://helmetjs.github.io/) for HTTP header protection
  - [HPP](https://www.npmjs.com/package/hpp) for HTTP parameter pollution prevention
  - Strict CORS configuration allowlisting Firebase Hosting domains
  - Request body limits (50MB for base64 vision/audio data)
- **Authentication**: [Firebase Admin SDK 13.0](https://firebase.google.com/docs/admin/setup) verifying Firebase ID Tokens and role claims
- **Rate Limiting**: [express-rate-limit 7.5](https://www.npmjs.com/package/express-rate-limit) with [rate-limit-redis 4.2](https://www.npmjs.com/package/rate-limit-redis) and [ioredis 5.4](https://ioredis.readthedocs.io/)
- **Containerization**: Multi-stage lightweight Docker image (`node:20-alpine`, non-root execution user)

### Cloud & AI Services
- **AI Models**: Google Gemini (`gemini-3.8-flash`, `gemini-3.8-pro`, `gemini-3.8-live` WebSocket endpoint) via modern `@google/genai` SDK
- **Database & Identity**: Google Cloud Firestore, Firebase Authentication
- **Hosting & Infrastructure**: Firebase Hosting (static SPA assets), Google Cloud Run (containerized backend)
- **Testing & Quality**: [Vitest 1.6](https://vitest.dev/), [JSDOM 27.4](https://github.com/jsdom/jsdom), Node.js native test runner, [ESLint 8.57](https://eslint.org/)

---

## 📁 Project Structure

```
Staffroom-AI/
├── backend/                       # Express API Gateway (Cloud Run)
│   ├── src/
│   │   ├── config/                # Environment validation, CORS rules, Firebase Admin
│   │   ├── middleware/            # requireAuth, requireRole, rateLimiter, errorHandler
│   │   ├── routes/                # Express route controllers (/api/ai, /api/health, /api/admin)
│   │   ├── services/              # aiRouter.js (Gemini text, vision, and agent proxies)
│   │   └── index.js               # Express application entrypoint
│   ├── scripts/                   # Admin utility scripts (e.g. set-admin.js)
│   ├── .env.example               # Backend environment template
│   ├── Dockerfile                 # Multi-stage production container build
│   └── package.json               # Backend dependencies and scripts
│
├── public/                        # Static assets
│   ├── audio-worklet-processor.js # Real-time PCM audio streaming worklet
│   └── favicon.ico
│
├── src/                           # Frontend React Application
│   ├── components/
│   │   ├── charts/                # Recharts wrappers (HeatmapGrid, Radar, Comparison charts)
│   │   ├── dashboard/             # Dashboard widgets (CourseGrid, UpcomingClasses, QuickStats)
│   │   ├── design-system/         # Reusable UI system (Button, Modal, Input, Sheet, Card, Toast)
│   │   ├── dev/                   # ActivityLogsViewer and diagnostic tools
│   │   ├── layout/                # ResponsiveLayout, Sidebar, TopNav, BottomNav, PageShell
│   │   ├── shared/                # ProtectedRoute, AdminRoute, ErrorBoundary, Tooltips
│   │   ├── syllabus/              # SyllabusProgress and interactive syllabus trees
│   │   └── teacher/               # GradeBookMatrix, ClassAssessments, Modals, StudentListEditor
│   ├── context/
│   │   ├── ai/                    # Voice prompt builders, session hooks, audio helpers
│   │   ├── AIContext.jsx          # Chat state, Gemini Live session control, plugin dispatcher
│   │   ├── AuthContext.jsx        # Firebase authentication state and demo seeding
│   │   ├── LayoutContext.jsx      # Mobile/desktop responsive viewport state
│   │   └── TeacherContext.jsx     # Courses, classes, students, and timetable state
│   ├── data/                      # Structured academic seeds (teacherData, syllabusList, students)
│   ├── firebase/                  # Client-side Firebase SDK configuration (client.js)
│   ├── hooks/                     # useMediaQuery, useKeyboardShortcuts
│   ├── pages/                     # Routed views (Dashboard, ClassPage, Assessments, HOD, Admin, etc.)
│   ├── plugins/                   # Extensible chat plugins (Syllabus helper, Voice logger)
│   ├── services/
│   │   ├── ai/                    # Chat processor, tool declarations, tool executors, generators
│   │   ├── providers/             # Unified AI client, provider registry, Gemini adapter
│   │   ├── activityLogger.js      # Structured Firestore audit logging
│   │   ├── api.js                 # HTTP fetch client for backend endpoints
│   │   ├── dataService.js         # Abstracted data provider layer
│   │   ├── firestoreChatService.js# Cross-device Firestore chat session persistence
│   │   └── geminiLiveService.js   # WebSocket client for Gemini Live audio streaming
│   ├── styles/                    # tokens.css design system tokens and index.css
│   ├── utils/                     # User-scoped storage, error handlers, assessment storage
│   ├── App.jsx                    # Root routing configuration, route guards, layouts
│   └── main.jsx                   # React entry point, global error handlers, monitoring init
│
├── .firebaserc                    # Firebase project mapping (`staffroom-ai`)
├── firebase.json                  # Firebase Hosting and Firestore configuration
├── firestore.rules                # Declarative security rules for Cloud Firestore
├── vite.config.js                 # Vite build setup with proxying and vendor chunking
├── vitest.config.js               # Test runner configuration (JSDOM environment)
└── package.json                   # Frontend dependencies, linting, and build scripts
```

---

## ⚙️ Configuration & Environment Variables

### Frontend Setup (`.env.local` or `.env`)
Copy `.env.example` to `.env.local` in the project root:

```env
# Firebase Public Web Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=staffroom-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=staffroom-ai
VITE_FIREBASE_STORAGE_BUCKET=staffroom-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Backend API Gateway Base URL
# Local development: http://localhost:8080
# Production: https://staffroom-backend-<hash>-<region>.a.run.app
VITE_BACKEND_URL=http://localhost:8080

# Optional Feature Flags
VITE_USE_MOCK_DATA=false
VITE_DEBUG_PLUGINS=false
```

### Backend Setup (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:

```env
# Server Runtime
PORT=8080
NODE_ENV=development

# Firebase Admin SDK Credentials
# Local path to service account key file:
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# CORS Allowed Origins (Comma-separated)
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://staffroom-ai.web.app,https://staffroom-ai.firebaseapp.com

# Redis Connection (Optional for local dev, uses in-memory limiter when empty)
REDIS_URL=

# AI Provider Credentials
GEMINI_API_KEY=your_gemini_api_key_here

# Rate Limiting Parameters
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
```

---

## 🛠️ Local Development & Setup

### Prerequisites
- [Node.js 20+](https://nodejs.org/) and `npm`
- A Firebase project with Authentication (Google and Email providers) and Cloud Firestore enabled
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Step 1: Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend gateway dependencies
cd backend
npm install
cd ..
```

### Step 2: Configure Environment Files
- Populate `.env.local` in the root folder with your Firebase web config.
- Populate `backend/.env` with your `GEMINI_API_KEY` and Firebase Admin credentials.

### Step 3: Run the Development Servers
Open two terminal windows:

```bash
# Terminal 1: Start Backend API Gateway (Port 8080)
cd backend
npm run dev

# Terminal 2: Start Vite Frontend Dev Server (Port 5173)
npm run dev
```

Navigate to `http://localhost:5173` in your browser. Vite automatically proxies `/api` calls to `http://localhost:8080`.

---

## 🔒 Security & Data Integrity

1. **Zero Secret Leakage in Client Assets**: The frontend contains only public Firebase Web SDK keys. All Gemini API keys and Google Cloud service credentials remain isolated inside the backend gateway.
2. **JWT Authentication & RBAC**: Every request to `/api/ai/*` requires a verified Firebase ID token. Role-based routes (`HODRoute`, `AdminRoute`) enforce role claims both client-side and server-side.
3. **Firestore Security Rules**: The `firestore.rules` configuration enforces strict tenant isolation:
   - Users can only read/write their own chat sessions under `/users/{userId}/chatSessions/{sessionId}`.
   - Activity audit records under `/logs1` can be created by authenticated users but never mutated or deleted, preserving audit log immutability.
   - Comprehensive default-deny (`allow read, write: if false;`) protects all unmapped paths.
4. **Resilient Rate Limiting**: Redis-backed distributed rate limiting limits users to 60 requests per minute by user UID, protecting downstream LLM endpoints from abuse.

---

## 🚢 Production Deployment

For full deployment instructions, reference [DEPLOYMENT.md](DEPLOYMENT.md).

- **Backend**: Containerized via Docker and deployed to **Google Cloud Run** with managed auto-scaling and Google Secret Manager integration for `GEMINI_API_KEY`.
- **Frontend**: Bundled via `npm run build` and deployed to **Firebase Hosting** with global SSL, automated cache-control headers, and SPA rewrites.
- **Security Rules**: Deployed via `firebase deploy --only hosting,firestore:rules`.

---

## 👥 User Roles & Personas

- **Teacher (`teacher`)**: Daily classroom routine management, schedule timelines, class-specific attendance logging, syllabus updates, assignment creation, student grading.
- **Head of Department (`hod`)**: Multi-section parity analysis, subject syllabus progression tracking, topic coverage heatmaps, exam scope planning.
- **Administrator (`admin`)**: School-wide analytics, teacher assignments, roster uploads, timetable scheduling, real-time activity log review.
