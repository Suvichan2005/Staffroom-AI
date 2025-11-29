# Staffroom Frontend Documentation

> **Last Updated:** November 29, 2025  
> This document consolidates all frontend documentation into a single reference.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Design System](#design-system)
4. [Component Structure](#component-structure)
5. [AI Integration](#ai-integration)
6. [Backend Integration](#backend-integration)
7. [Development Guide](#development-guide)

---

## Quick Start

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Backend server running (optional - falls back to dummy data)

### Installation

```powershell
cd frontend
npm install
npm run dev
```

Visit: http://localhost:5173

### Environment Setup

Create `.env` in the frontend folder:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api/v1

# AI Services (Optional - uses mock responses without keys)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

**Get API Keys:**
- Gemini (Free): https://makersuite.google.com/app/apikey
- OpenAI (Optional): https://platform.openai.com/api-keys

---

## Architecture Overview

### Tech Stack
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS + CSS Custom Properties
- **Animation:** Framer Motion
- **Routing:** React Router DOM v6
- **State:** React Context API
- **AI:** Google Gemini 2.5 Flash with Function Calling
- **Voice:** Web Speech API + Optional Whisper

### Core Principles
1. **Teacher-First Design** - UI organized around daily teacher workflows
2. **Mobile/Desktop Optimized** - Separate layouts for optimal UX per platform
3. **AI-Native** - LLM integration at the core, not bolted on
4. **Speed** - Every action achievable in ≤3 taps/clicks

### Project Structure

```
frontend/src/
├── components/
│   ├── ai/                    # AI chat components
│   │   ├── PersistentChatBar.jsx   # Mobile chat bar
│   │   ├── DesktopChatBar.jsx      # Desktop chat panel
│   │   ├── ChatMessage.jsx         # Message bubbles
│   │   └── index.js
│   │
│   ├── design-system/         # Reusable UI primitives
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Card.jsx
│   │   ├── Modal.jsx
│   │   └── index.js
│   │
│   ├── layout/                # Layout shells
│   │   ├── ResponsiveLayout.jsx    # Auto-switches mobile/desktop
│   │   ├── MobileLayout.jsx
│   │   ├── DesktopLayout.jsx
│   │   ├── TopNav.jsx
│   │   ├── BottomNav.jsx
│   │   ├── Sidebar.jsx
│   │   └── index.js
│   │
│   ├── dashboard/             # Dashboard components
│   │   ├── QuickActions.jsx
│   │   ├── QuickStats.jsx
│   │   ├── UpcomingClasses.jsx
│   │   └── index.js
│   │
│   └── teacher/               # Teacher workflow components
│       ├── ClassCard.jsx
│       ├── AttendanceGrid.jsx
│       ├── SyllabusProgress.jsx
│       └── index.js
│
├── pages/                     # Route pages
│   ├── Dashboard.jsx
│   ├── CoursePage.jsx
│   ├── ClassPage.jsx
│   ├── ChatPage.jsx           # Full-page AI chat
│   ├── Assignments.jsx
│   └── ...
│
├── context/                   # React context providers
│   ├── AuthContext.jsx
│   ├── LayoutContext.jsx
│   ├── TeacherContext.jsx
│   └── AIContext.jsx
│
├── hooks/                     # Custom React hooks
│   ├── useMediaQuery.js
│   ├── useApi.js
│   └── useClassTimer.js
│
├── services/                  # External services
│   ├── api.js                 # Backend API layer
│   ├── aiService.js           # Gemini AI integration
│   └── voiceService.js        # Voice transcription
│
├── plugins/                   # Chat plugin system
│   ├── index.js
│   ├── voiceProgressLoggerPlugin.jsx
│   └── syllabusAIHelperPlugin.jsx
│
├── data/                      # Mock/dummy data
│   └── dummyData.js
│
├── styles/
│   └── tokens.css             # Design system tokens
│
├── App.jsx                    # Root component with routes
└── main.jsx                   # Entry point
```

---

## Design System

### Color Palette

```css
/* Primary - Indigo */
--primary-50: #EEF2FF;
--primary-500: #6366F1;
--primary-600: #4F46E5;
--primary-700: #4338CA;

/* Semantic */
--success: #22C55E;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;

/* Neutral */
--neutral-50: #F8FAFC;
--neutral-100: #F1F5F9;
--neutral-500: #64748B;
--neutral-800: #1E293B;
```

### Typography

```css
--font-sans: 'Inter', system-ui, sans-serif;

--text-xs: 0.75rem;    /* 12px - labels */
--text-sm: 0.875rem;   /* 14px - body small */
--text-base: 1rem;     /* 16px - body */
--text-lg: 1.125rem;   /* 18px - body large */
--text-xl: 1.25rem;    /* 20px - headings */
--text-2xl: 1.5rem;    /* 24px - page titles */
```

### Spacing

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
```

### Layout Constants

```css
--topnav-height: 56px;       /* Mobile */
--topnavbar-height: 64px;    /* Desktop */
--bottomnav-height: 64px;
--sidebar-width: 240px;
--sidebar-collapsed: 64px;
--chatbar-height: 56px;
--touch-target: 44px;
```

---

## Component Structure

### Layout Components

#### ResponsiveLayout
Auto-switches between mobile and desktop layouts based on viewport:
- **Mobile (< 1024px):** Bottom nav + persistent chat bar
- **Desktop (≥ 1024px):** Sidebar + floating/docked chat panel

#### Mobile Layout
```
┌─────────────────────────────────┐
│  TOP NAV (contextual)           │
├─────────────────────────────────┤
│       MAIN CONTENT              │
│       (scrollable)              │
├─────────────────────────────────┤
│  PERSISTENT AI CHATBAR          │
├─────────────────────────────────┤
│  BOTTOM TAB BAR (4 items)       │
└─────────────────────────────────┘
```

#### Desktop Layout
```
┌──────────────────────────────────────────┐
│  TOP NAVBAR                              │
├──────────┬───────────────────────────────┤
│ SIDEBAR  │       MAIN CONTENT            │
│          │                               │
│          ├───────────────────────────────┤
│          │  AI CHAT PANEL (collapsible)  │
└──────────┴───────────────────────────────┘
```

### AI Components

#### PersistentChatBar (Mobile)
- Collapsed: 56px input bar above bottom nav
- Expanded: 80vh chat panel with history
- Two tabs: Chat + Tools

#### DesktopChatBar (Desktop)
- Floating widget or docked panel
- 320px width when docked
- Same Chat + Tools tabs

### Dashboard Components

- **QuickActions** - 6 action buttons (Take Attendance, Mark Progress, etc.)
- **QuickStats** - 4 stat cards (Classes, Attendance %, Progress, Pending)
- **UpcomingClasses** - Today's schedule timeline
- **CourseGrid** - Course cards with progress

---

## AI Integration

### Overview

The AI system uses **Google Gemini 2.5 Flash** with function calling for intelligent, context-aware responses.

### Architecture

```
User Input → AIContext → aiService.js → Gemini API
                ↓
        Function Calling (10 tools)
                ↓
        Data Layer (teacherData)
                ↓
        Formatted Response → UI
```

### Available AI Tools

| Tool | Description |
|------|-------------|
| `getAvailableCourses` | List all courses the teacher teaches |
| `getSyllabus` | Get chapter/topic structure for a course |
| `searchTopic` | Find a topic across all syllabi |
| `getProgress` | Get syllabus completion for a section |
| `getNextTopic` | Suggest next topic to teach |
| `getSchedule` | Get class schedule for a course/section |
| `getAttendance` | Get attendance data and statistics |
| `getAssignments` | Get assignments for a course/section |
| `getStudentsAtRisk` | Identify students with low attendance |
| `updateProgress` | Mark topics as complete/ongoing |

### Usage in Components

```jsx
import { useAI } from '../context/AIContext';

function MyComponent() {
  const { sendMessage, messages, isLoading } = useAI();
  
  const handleAsk = () => {
    sendMessage("What's my progress in 6A Geography?");
  };
  
  return (
    <div>
      {messages.map(msg => <ChatMessage key={msg.id} {...msg} />)}
      <button onClick={handleAsk}>Ask AI</button>
    </div>
  );
}
```

### Plugin System

Extend AI chat with custom tools:

```jsx
// plugins/myPlugin.jsx
export const myPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  
  // Handle messages
  onMessage: async (message, context) => {
    if (message.content.includes('my-keyword')) {
      return { handled: true, response: 'Custom response' };
    }
    return { handled: false };
  },
  
  // Custom UI tab (optional)
  TabComponent: ({ context }) => <MyCustomUI />,
};
```

### Rate Limiting

The AI service includes automatic retry with exponential backoff:
- Max retries: 3
- Base delay: 2000ms
- Max delay: 60000ms
- User-friendly error messages on quota exceeded

---

## Backend Integration

### API Service Layer

Located in `src/services/api.js`:

```javascript
import { teacherApi, sectionApi, attendanceApi } from '../services/api';

// Get teacher by email
const teacher = await teacherApi.getByEmail('teacher@school.com');

// Mark attendance
await attendanceApi.mark({
  sectionId: '6A',
  subjectId: 'GEO',
  date: new Date(),
  records: [{ studentId: 'STU001', status: 'present' }]
});
```

### Custom Hooks

```javascript
import { useTeacherSections, useSyllabusProgress } from '../hooks/useApi';

function MyComponent() {
  const { data: sections, loading, error, refetch } = useTeacherSections(teacherId);
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  
  return <SectionsList sections={data} />;
}
```

### Hybrid Mode

The frontend works in **hybrid mode**:
1. Attempts to fetch from backend first
2. Falls back to local `dummyData.js` on error
3. No breaking changes to components

---

## Development Guide

### Scripts

```powershell
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
```

### Adding a New Page

1. Create page component in `src/pages/`:
```jsx
// src/pages/MyPage.jsx
export default function MyPage() {
  return <PageShell><h1>My Page</h1></PageShell>;
}
```

2. Add route in `App.jsx`:
```jsx
import MyPage from './pages/MyPage';

<Route path="/my-page" element={
  <ProtectedRoute>
    <AppLayout><MyPage /></AppLayout>
  </ProtectedRoute>
} />
```

### Adding a New Component

1. Create in appropriate folder:
```jsx
// src/components/teacher/MyComponent.jsx
export default function MyComponent({ prop1, prop2 }) {
  return <div>...</div>;
}
```

2. Export from index:
```javascript
// src/components/teacher/index.js
export { default as MyComponent } from './MyComponent';
```

### Working with AI

1. For simple queries, use `useAI()` hook
2. For custom tools, extend the plugin system
3. For new AI functions, add to `aiService.js`

### Styling Guidelines

- Use Tailwind CSS classes
- Reference design tokens from `styles/tokens.css`
- Follow existing component patterns
- Mobile-first approach

### Testing

```powershell
# Manual testing
npm run dev
# Navigate to different pages and test features

# Test AI features
# Navigate to /chat or use chat bar
# Try: "What's my schedule today?"
# Try: "Show progress for 6A"
```

---

## Routes Reference

| Path | Page | Description |
|------|------|-------------|
| `/` | Landing | Public landing page |
| `/login` | Login | Authentication |
| `/register` | Register | New user registration |
| `/dashboard` | Dashboard | Main teacher dashboard |
| `/course/:courseId` | CoursePage | Course overview |
| `/course/:courseId/class/:classId` | ClassPage | Class/section detail |
| `/assignments` | Assignments | Assignment management |
| `/resources` | SharedResources | Resource library |
| `/chat` | ChatPage | Full-page AI chat |
| `/profile` | ProfilePage | User profile |
| `/settings` | SettingsPage | App settings |
| `/classes` | ClassesPage | All classes list |

---

## Troubleshooting

### AI Features Not Working
- Check `.env` has `VITE_GEMINI_API_KEY`
- Components show mock responses without API key

### Voice Not Recognizing
- Use Chrome or Edge (best support)
- Allow microphone permissions
- Must be on localhost or HTTPS

### Backend Connection Failed
- Check backend is running on port 5000
- Verify `VITE_API_BASE_URL` in `.env`
- Frontend falls back to dummy data automatically

### Build Errors
```powershell
# Clear cache and rebuild
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npm run build
```

---

## Migration Notes

### From v1 to v2 UI
- Old `Dashboard.jsx` → New `ResponsiveDashboard` component
- Old inline layouts → New `ResponsiveLayout` wrapper
- Old ChatBox → New `PersistentChatBar` (mobile) / `DesktopChatBar` (desktop)

### Data Layer
- Frontend uses `dummyData.js` which mirrors backend schema
- When backend is connected, `TeacherContext` switches to API data
- No frontend changes needed for migration

---

*This document replaces: UI_ARCHITECTURE.md, UI_ARCHITECTURE_V2.md, UI_PROGRESS.md, INTEGRATION_GUIDE.md, INTEGRATION_STATUS.md*
