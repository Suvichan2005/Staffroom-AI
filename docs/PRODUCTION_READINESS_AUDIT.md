# 🔒 Staffroom AI: Production-Readiness Audit

> **Generated:** December 31, 2025  
> **Auditor:** Senior Full-Stack Architect, AppSec Engineer & Performance Specialist  
> **Model:** Claude Opus 4.5 via GitHub Copilot  
> **Scope:** Complete repository analysis for production deployment readiness

---

## 📋 Executive Summary

### Overall Assessment: ⚠️ **NOT PRODUCTION-READY**

**Risk Level:** HIGH

The Staffroom-AI application is a well-architected **hackathon/demo prototype** with sophisticated AI integration (Gemini Live, OpenAI Whisper) and modern React patterns. However, it has **critical blockers** that prevent safe production deployment with real users and data.

### What Blocks Production

| Blocker | Severity | Effort to Fix |
|---------|----------|---------------|
| API keys exposed in client-side code | 🔴 Critical | 1-2 days |
| No backend server (API-only frontend) | 🔴 Critical | 2-4 weeks |
| Firebase security rules unknown | 🔴 Critical | 1-2 days |
| No rate limiting on AI calls | 🔴 Critical | 1 day |
| Hardcoded demo credentials in UI | 🟠 High | 1 hour |
| No input sanitization | 🟠 High | 2-3 days |
| No HTTPS enforcement | 🟠 High | 1 hour |
| Zero test coverage for critical paths | 🟡 Medium | 1-2 weeks |

### What Works Well

- ✅ Modern React 18 architecture with proper context separation
- ✅ Sophisticated AI tool-calling integration with Gemini
- ✅ Real-time voice streaming via WebSocket
- ✅ Clean separation of concerns (services, contexts, components)
- ✅ User-scoped localStorage isolation
- ✅ Responsive mobile/desktop layouts
- ✅ Comprehensive activity logging to Firestore

---

## 🗺️ 1. System Architecture Map

### 1.1 Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STAFFROOM-AI ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │    FRONTEND      │    │   EXTERNAL APIs   │    │     DATABASE      │  │
│  │  (React + Vite)  │───▶│                  │    │                   │  │
│  │                  │    │ • Google Gemini  │    │ • Firebase Auth   │  │
│  │  Port 5173       │    │ • Gemini Live WS │    │ • Firestore Logs  │  │
│  │                  │    │ • OpenAI Whisper │    │ • localStorage    │  │
│  └──────────────────┘    │ • ipify.org      │    │   (per-user)      │  │
│          │               └──────────────────┘    └───────────────────┘  │
│          │                                                               │
│          ▼                                                               │
│  ┌──────────────────┐                                                   │
│  │  HOSTING         │    ⚠️ NO BACKEND SERVER EXISTS                    │
│  │  • Vercel        │    Backend API (api.js) points to localhost:5000  │
│  │  • Firebase      │    which is never deployed - falls back to mock   │
│  └──────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.2.0 | UI framework |
| **Build** | Vite | 5.0.0 | Dev server & bundler |
| **Routing** | React Router DOM | 6.23.0 | Client-side routing |
| **Animation** | Framer Motion | 11.0.3 | UI animations |
| **Charts** | Recharts | 2.10.3 | Data visualization |
| **Auth** | Firebase Auth | 12.6.0 | Authentication |
| **Database** | Firestore | 12.6.0 | Logging only |
| **AI (Text)** | @google/generative-ai | 0.24.1 | Gemini API |
| **AI (Voice)** | OpenAI SDK | 6.9.1 | Whisper transcription |
| **Notifications** | react-hot-toast | 2.4.1 | Toast messages |
| **Icons** | lucide-react | 0.363.0 | Icon library |

### 1.3 Runtime & Deploy Model

| Aspect | Current State | Evidence |
|--------|---------------|----------|
| **Deployment Target** | Static SPA | `vercel.json`, `firebase.json` |
| **Backend** | ❌ None (mock data) | `dataService.js` defaults to mock |
| **Environment Config** | Vite env vars | `VITE_*` prefixed variables |
| **Secrets Handling** | ⚠️ Client-side exposure | API keys in browser bundle |

### 1.4 Environment Variables Required

```env
# Firebase Configuration (REQUIRED)
VITE_FIREBASE_API_KEY=           # Firebase project API key
VITE_FIREBASE_AUTH_DOMAIN=       # e.g., project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=        # Firebase project ID
VITE_FIREBASE_STORAGE_BUCKET=    # e.g., project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# AI Services (OPTIONAL - falls back to mock)
VITE_GEMINI_API_KEY=             # Google AI Studio key
VITE_OPENAI_API_KEY=             # OpenAI API key for Whisper

# Backend API (OPTIONAL - defaults to mock)
VITE_API_BASE_URL=               # Default: http://localhost:5000/api/v1
VITE_USE_MOCK_DATA=              # Default: true

# Debug Flags
VITE_DEBUG_PLUGINS=              # Enable plugin debug logging
```

---

## 🔐 2. Security Audit

### 2.1 Critical Vulnerabilities

#### CVE-01: API Keys Exposed in Client Bundle 🔴 CRITICAL

| Property | Value |
|----------|-------|
| **Title** | AI API Keys Exposed to End Users |
| **Severity** | 🔴 **CRITICAL** |
| **Impact** | Attackers can steal API keys from browser DevTools, run up unlimited bills, access Gemini/OpenAI under your quota |
| **Files** | [aiService.js#L31](src/services/aiService.js#L31), [geminiLiveService.js#L14](src/services/geminiLiveService.js#L14), [voiceService.js#L9](src/services/voiceService.js#L9) |
| **Evidence** | `const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;` |

**Exploit Scenario:**
1. User opens browser DevTools → Network tab
2. Observes WebSocket connection to `wss://generativelanguage.googleapis.com/...?key=ACTUAL_KEY`
3. Extracts API key from URL
4. Uses key for unlimited free AI generation

**Fix:**
```javascript
// BEFORE (insecure - client-side)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// AFTER (secure - proxy through backend)
// Create backend endpoint: POST /api/ai/generate
// Backend holds the key securely
async function callAI(prompt) {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  return response.json();
}
```

**Verification:**
- Build production bundle: `npm run build`
- Search dist folder: `grep -r "AIza" dist/` (should return nothing)
- Inspect Network tab in DevTools for API keys in URLs

---

#### CVE-02: Firebase Security Rules Unknown 🔴 CRITICAL

| Property | Value |
|----------|-------|
| **Title** | Firestore Security Rules Not Audited |
| **Severity** | 🔴 **CRITICAL** |
| **Impact** | Without proper rules, any authenticated user could read/write ALL data in Firestore |
| **Files** | Firebase Console (not in repo) |
| **Evidence** | `firebase.json` only configures hosting, no `firestore.rules` file |

**Exploit Scenario:**
1. Attacker creates Firebase account
2. Uses Firebase SDK to directly query Firestore
3. Reads all logs including other users' activity
4. Writes malicious data to logs collection

**Fix:**
Create `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Logs: users can only read/write their own logs
    match /logs1/{logId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
      allow update, delete: if false; // Logs are immutable
    }
    
    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

#### CVE-03: No Rate Limiting on AI Calls 🔴 CRITICAL

| Property | Value |
|----------|-------|
| **Title** | Unlimited AI API Calls from Client |
| **Severity** | 🔴 **CRITICAL** |
| **Impact** | Malicious user can run infinite AI queries, exhausting API quota and causing massive bills |
| **Files** | [aiService.js](src/services/aiService.js), [geminiLiveService.js](src/services/geminiLiveService.js) |
| **Evidence** | Only retry logic exists, no rate limiting |

**Exploit Scenario:**
```javascript
// Attacker script in browser console
for (let i = 0; i < 10000; i++) {
  fetch('/api/ai/generate', { body: JSON.stringify({ prompt: 'spam' }) });
}
```

**Fix:**
```javascript
// Add to aiService.js
const rateLimiter = {
  calls: 0,
  resetTime: Date.now() + 60000,
  maxCallsPerMinute: 30,
  
  async checkLimit() {
    if (Date.now() > this.resetTime) {
      this.calls = 0;
      this.resetTime = Date.now() + 60000;
    }
    if (this.calls >= this.maxCallsPerMinute) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }
    this.calls++;
  }
};

// Wrap every AI call
async function callGemini(prompt, usePro = false, retryCount = 0) {
  await rateLimiter.checkLimit(); // Add this line
  // ... rest of function
}
```

---

### 2.2 High Severity Issues

#### SEC-01: Hardcoded Demo Credentials Displayed 🟠 HIGH

| Property | Value |
|----------|-------|
| **Files** | [Login.jsx#L91-L96](src/pages/Login.jsx#L91-L96) |
| **Evidence** | `agarwal@demo.com / demo1234` displayed in UI |
| **Impact** | Not a direct vulnerability, but encourages weak password patterns |

**Fix:** Remove demo credentials from production build using environment flag.

---

#### SEC-02: No Input Sanitization 🟠 HIGH

| Property | Value |
|----------|-------|
| **Title** | User Input Not Sanitized Before Storage |
| **Impact** | Potential XSS if logs are rendered unsafely; prompt injection in AI |
| **Files** | [activityLogger.js](src/services/activityLogger.js), [aiService.js](src/services/aiService.js) |

**Fix:**
```javascript
// Add sanitization utility
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

---

#### SEC-03: Firestore Logs Contain Sensitive Data 🟠 HIGH

| Property | Value |
|----------|-------|
| **Files** | [activityLogger.js#L87-L115](src/services/activityLogger.js#L87-L115) |
| **Evidence** | Logs contain: email, userId, IP address, device info, browser, timezone |
| **Impact** | GDPR/privacy violation if exposed; PII in logs |

**Fix:**
- Hash or truncate IP addresses
- Don't log full email in `data` field
- Implement log retention policy (auto-delete after 90 days)

---

### 2.3 Medium Severity Issues

#### SEC-04: No CSRF Protection 🟡 MEDIUM

Firebase Auth handles this internally, but custom endpoints (when backend exists) need CSRF tokens.

#### SEC-05: Session Storage of Sensitive Data 🟡 MEDIUM

| Property | Value |
|----------|-------|
| **Files** | [activityLogger.js#L130](src/services/activityLogger.js#L130) |
| **Evidence** | `sessionStorage.setItem('sessionId', sessionId)` |
| **Impact** | Session ID exposed in browser storage |

#### SEC-06: No Content Security Policy 🟡 MEDIUM

| Property | Value |
|----------|-------|
| **Files** | [index.html](index.html) |
| **Evidence** | No CSP meta tag or header |
| **Impact** | Vulnerable to XSS attacks |

**Fix:** Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
    script-src 'self' 'unsafe-inline'; 
    style-src 'self' 'unsafe-inline'; 
    connect-src 'self' https://*.googleapis.com wss://*.googleapis.com https://api.ipify.org https://*.firebaseio.com;">
```

---

### 2.4 Security Findings Summary Table

| ID | Title | Severity | Category | Status |
|----|-------|----------|----------|--------|
| CVE-01 | API Keys in Client Bundle | 🔴 Critical | Secrets | Open |
| CVE-02 | Firebase Rules Unknown | 🔴 Critical | Auth | Open |
| CVE-03 | No Rate Limiting | 🔴 Critical | Abuse | Open |
| SEC-01 | Demo Credentials Displayed | 🟠 High | Auth | Open |
| SEC-02 | No Input Sanitization | 🟠 High | Injection | Open |
| SEC-03 | PII in Logs | 🟠 High | Privacy | Open |
| SEC-04 | No CSRF Protection | 🟡 Medium | Auth | Open |
| SEC-05 | Session ID Exposed | 🟡 Medium | Session | Open |
| SEC-06 | No CSP | 🟡 Medium | XSS | Open |

---

## 🏗️ 3. Backend Structural Findings

### 3.1 Critical: No Backend Exists

**Current State:** The application has a comprehensive API client layer ([api.js](src/services/api.js)) that defines endpoints for:
- Teachers, Sections, Students
- Attendance, Assignments, Schedules
- Syllabus Progress, Resources

**However:** No backend server code exists in this repository. The `VITE_API_BASE_URL` defaults to `http://localhost:5000/api/v1` which never runs.

**Fallback:** The [dataService.js](src/services/dataService.js) layer intelligently falls back to mock data from [dummyData.js](src/data/dummyData.js).

### 3.2 Architecture Pattern (When Backend Exists)

The codebase is structured for eventual API integration:

```
Frontend Layer
├── Pages (Dashboard, ClassPage, etc.)
│   └── Uses hooks & context
├── Context Layer (AuthContext, AIContext, TeacherContext)
│   └── Calls dataService
├── Service Layer (dataService.js)
│   ├── mockService (uses dummyData.js)
│   └── apiService (uses api.js)
└── API Client Layer (api.js)
    └── HTTP calls to backend
```

### 3.3 Recommended Backend Architecture

```
/backend
├── /src
│   ├── /controllers     # Request handlers
│   ├── /services        # Business logic
│   ├── /repositories    # Data access
│   ├── /middleware      # Auth, rate limiting, logging
│   ├── /routes          # Route definitions
│   └── /utils           # Helpers
├── /config              # Environment configs
├── /tests               # Unit & integration tests
└── server.js            # Entry point
```

### 3.4 Production Hardening Checklist (Backend)

When building the backend:

- [ ] Implement API key rotation for AI services
- [ ] Add request signing for AI proxy endpoints
- [ ] Implement JWT with short expiry (15 min) + refresh tokens
- [ ] Add request ID correlation for distributed tracing
- [ ] Implement circuit breakers for external API calls
- [ ] Add health check endpoints (`/health`, `/ready`)
- [ ] Implement graceful shutdown
- [ ] Add database connection pooling
- [ ] Implement idempotency keys for mutations
- [ ] Add audit logging for sensitive operations

---

## 🎨 4. Frontend Findings

### 4.1 Strengths

| Area | Implementation | Quality |
|------|----------------|---------|
| **Component Structure** | Well-organized by feature (ai/, dashboard/, layout/) | ✅ Excellent |
| **State Management** | Context API with proper separation | ✅ Good |
| **Responsive Design** | Dedicated Mobile/Desktop layouts | ✅ Excellent |
| **Design System** | Custom component library (Button, Card, Modal, etc.) | ✅ Good |
| **Routing** | Protected routes with auth guards | ✅ Good |
| **Error Boundaries** | Loading fallbacks in Suspense | ⚠️ Partial |

### 4.2 Issues

#### FE-01: No Error Boundaries 🟡 MEDIUM

| Property | Value |
|----------|-------|
| **Impact** | Unhandled React errors crash entire app |
| **Evidence** | No `ErrorBoundary` component in codebase |

**Fix:**
```jsx
// Add src/components/shared/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    logError(LogCategory.ERROR, 'React Error', { error, errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh.</div>;
    }
    return this.props.children;
  }
}
```

---

#### FE-02: Large Context Re-renders 🟡 MEDIUM

| Property | Value |
|----------|-------|
| **Files** | [AIContext.jsx](src/context/AIContext.jsx) (1342 lines) |
| **Impact** | Single context with many values causes unnecessary re-renders |

**Fix:** Split AIContext into smaller, focused contexts:
- `ChatUIContext` (isOpen, isExpanded)
- `ChatMessagesContext` (messages, currentSessionId)
- `VoiceContext` (isRecording, liveTranscript)

---

#### FE-03: No Source Maps Policy 🟡 MEDIUM

| Property | Value |
|----------|-------|
| **Files** | [vite.config.js](vite.config.js) |
| **Impact** | Source maps may expose source code in production |

**Fix:**
```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Disable for production
  }
});
```

---

### 4.3 Accessibility Audit

| Issue | Severity | Evidence |
|-------|----------|----------|
| Missing aria-labels on icon buttons | 🟡 Medium | Microphone button in chat |
| No keyboard navigation for chat | 🟡 Medium | Cannot tab through messages |
| Color contrast issues | 🟢 Low | Some light gray text |
| No skip navigation link | 🟢 Low | Missing skip-to-content |

---

## ⚡ 5. Performance Findings

### 5.1 Bundle Analysis (Estimated)

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| Recharts (~200KB) | Increases bundle size | Lazy load chart components |
| OpenAI SDK (~50KB) | May not be needed | Only import if Whisper used |
| No code splitting | Longer initial load | Add route-based splitting |

### 5.2 Performance Quick Wins (1-2 days)

| Optimization | Effort | Impact |
|--------------|--------|--------|
| Add `React.lazy` for pages | 2 hours | -30% initial bundle |
| Memoize expensive computations | 4 hours | Fewer re-renders |
| Add `loading="lazy"` to images | 1 hour | Faster LCP |
| Virtualize long lists | 4 hours | Better scroll performance |

### 5.3 Frontend Performance Issues

#### PERF-01: No Route-Based Code Splitting

| Property | Value |
|----------|-------|
| **Files** | [App.jsx](src/App.jsx) |
| **Evidence** | All pages imported synchronously at top |

**Fix:**
```jsx
// BEFORE
import Dashboard from "./pages/Dashboard";

// AFTER
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
```

---

#### PERF-02: Expensive Analytics Recalculation

| Property | Value |
|----------|-------|
| **Files** | [Dashboard.jsx#L22-L24](src/pages/Dashboard.jsx#L22-L24) |
| **Evidence** | `useMemo` exists but still recalculates on every teacher change |

**Recommendation:** Cache analytics results with proper dependency tracking.

---

### 5.4 Backend Performance Considerations (Future)

When backend is built:

- [ ] Add Redis caching for teacher/class data
- [ ] Implement pagination for all list endpoints
- [ ] Add database indexes for common queries
- [ ] Use CDN for static assets
- [ ] Implement response compression (gzip/brotli)

---

## 🔧 6. DevOps/CI-CD Findings

### 6.1 Current State

| Aspect | Status | Evidence |
|--------|--------|----------|
| CI/CD Pipeline | ❌ None | No `.github/workflows` |
| Dockerfile | ❌ None | No container config |
| Linting | ❌ Not configured | No `.eslintrc` |
| Formatting | ❌ Not configured | No `.prettierrc` |
| Pre-commit hooks | ❌ None | No husky/lint-staged |

### 6.2 Minimal Safe Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          # ... other secrets
```

### 6.3 Go-Live Checklist (DevOps)

- [ ] Set up CI/CD pipeline with build/test/deploy stages
- [ ] Configure secrets in GitHub/Vercel (never in code)
- [ ] Set up staging environment
- [ ] Configure error monitoring (Sentry)
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation
- [ ] Document rollback procedure
- [ ] Set up database backups
- [ ] Configure HTTPS with HSTS

---

## 🧪 7. Testing Gaps

### 7.1 Current Test Coverage

| Area | Coverage | Files |
|------|----------|-------|
| Plugin System | ~5% | [chat-plugins.test.js](src/__tests__/chat-plugins.test.js) |
| AI Services | 0% | No tests |
| Auth Flow | 0% | No tests |
| React Components | 0% | No tests |
| API Integration | 0% | No tests |

### 7.2 Critical Missing Tests

| Priority | Test Type | What to Test |
|----------|-----------|--------------|
| 🔴 P0 | Unit | `aiService.js` tool functions |
| 🔴 P0 | Unit | Auth flow (login, logout, session) |
| 🔴 P0 | Integration | Protected route behavior |
| 🟠 P1 | Unit | Data service mock/API switching |
| 🟠 P1 | Integration | Voice transcription flow |
| 🟡 P2 | E2E | Full user journey (login → attendance) |

### 7.3 Recommended Test Setup

```json
// Add to package.json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "playwright": "^1.40.0"
  }
}
```

---

## ✅ 8. Production Hardening Checklist

### Security

- [ ] Move all API keys to backend proxy
- [ ] Audit and deploy Firestore security rules
- [ ] Implement rate limiting (client + server)
- [ ] Add CSP headers
- [ ] Remove demo credentials from production
- [ ] Implement input sanitization
- [ ] Add HTTPS-only with HSTS
- [ ] Review and minimize PII in logs

### Infrastructure

- [ ] Set up staging environment
- [ ] Configure secrets management (GitHub Secrets / Vercel)
- [ ] Implement CI/CD pipeline
- [ ] Set up error monitoring (Sentry)
- [ ] Configure uptime monitoring
- [ ] Document deployment process
- [ ] Create rollback procedure

### Code Quality

- [ ] Add ESLint + Prettier
- [ ] Add pre-commit hooks
- [ ] Increase test coverage to 60%+
- [ ] Add error boundaries
- [ ] Split large contexts
- [ ] Add code splitting

### Performance

- [ ] Implement route-based code splitting
- [ ] Add image optimization
- [ ] Virtualize long lists
- [ ] Add loading skeletons everywhere

---

## 🗓️ 9. Suggested Roadmap

### NOW (Week 1-2) - Critical Blockers

| Task | Owner | Effort | Priority |
|------|-------|--------|----------|
| Create backend API proxy for AI calls | Backend | 3 days | 🔴 P0 |
| Audit & deploy Firestore rules | Backend | 1 day | 🔴 P0 |
| Add client-side rate limiting | Frontend | 1 day | 🔴 P0 |
| Remove demo credentials | Frontend | 1 hour | 🔴 P0 |
| Add CSP headers | DevOps | 2 hours | 🟠 P1 |

### NEXT (Week 3-4) - High Priority

| Task | Owner | Effort | Priority |
|------|-------|--------|----------|
| Set up CI/CD pipeline | DevOps | 2 days | 🟠 P1 |
| Add input sanitization | Full-stack | 2 days | 🟠 P1 |
| Implement error boundaries | Frontend | 1 day | 🟠 P1 |
| Add basic unit tests | Full-stack | 3 days | 🟠 P1 |
| Configure error monitoring | DevOps | 1 day | 🟠 P1 |

### LATER (Month 2) - Technical Debt

| Task | Owner | Effort | Priority |
|------|-------|--------|----------|
| Implement full backend API | Backend | 4 weeks | 🟡 P2 |
| Increase test coverage to 60% | Full-stack | 2 weeks | 🟡 P2 |
| Add route-based code splitting | Frontend | 3 days | 🟡 P2 |
| Split AIContext into smaller contexts | Frontend | 2 days | 🟡 P2 |
| Implement accessibility fixes | Frontend | 1 week | 🟡 P2 |

---

## 📊 10. Top 10 Critical Fixes (Ordered)

| Rank | Fix | Effort | Impact |
|------|-----|--------|--------|
| 1 | Create backend proxy for AI API keys | 3 days | Prevents API abuse & billing attacks |
| 2 | Deploy Firestore security rules | 1 day | Prevents unauthorized data access |
| 3 | Add rate limiting to AI calls | 1 day | Prevents quota exhaustion |
| 4 | Remove hardcoded demo credentials | 1 hour | Reduces credential exposure |
| 5 | Add input sanitization | 2 days | Prevents XSS & injection |
| 6 | Add Content Security Policy | 2 hours | Mitigates XSS attacks |
| 7 | Set up CI/CD pipeline | 2 days | Enables safe deployments |
| 8 | Add error boundaries | 1 day | Prevents full app crashes |
| 9 | Configure error monitoring | 1 day | Enables incident response |
| 10 | Add basic auth flow tests | 2 days | Catches auth regressions |

---

## 📚 Appendix A: File Reference

### Core Configuration Files

| File | Purpose |
|------|---------|
| [package.json](package.json) | Dependencies & scripts |
| [vite.config.js](vite.config.js) | Build configuration |
| [firebase.json](firebase.json) | Firebase hosting config |
| [vercel.json](vercel.json) | Vercel rewrites |

### Key Source Files

| File | Purpose | Lines |
|------|---------|-------|
| [src/App.jsx](src/App.jsx) | Main routing | 331 |
| [src/main.jsx](src/main.jsx) | Entry point | 48 |
| [src/context/AIContext.jsx](src/context/AIContext.jsx) | AI state management | 1342 |
| [src/context/AuthContext.jsx](src/context/AuthContext.jsx) | Authentication | 97 |
| [src/services/aiService.js](src/services/aiService.js) | Gemini integration | 3057 |
| [src/services/geminiLiveService.js](src/services/geminiLiveService.js) | Live voice streaming | 779 |
| [src/data/dummyData.js](src/data/dummyData.js) | Mock data | 1192 |

---

## 📚 Appendix B: Environment Variables Reference

```env
# Required for Firebase Auth
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Optional - AI Services
VITE_GEMINI_API_KEY=          # Required for AI features
VITE_OPENAI_API_KEY=          # Optional for Whisper

# Optional - Backend
VITE_API_BASE_URL=            # Default: http://localhost:5000/api/v1
VITE_USE_MOCK_DATA=           # Default: true

# Debug
VITE_DEBUG_PLUGINS=           # Enable verbose plugin logging
```

---

*This audit was generated based on static code analysis. Runtime testing and penetration testing are recommended before production deployment.*

