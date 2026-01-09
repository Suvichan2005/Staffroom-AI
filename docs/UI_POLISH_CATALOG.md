# 🎨 STAFFROOM AI — UI/UX MICRO-INTERACTIONS & POLISH CATALOG

> **Document Version:** 1.0  
> **Focus:** Every minute UI detail worth preserving for next build

This document catalogs every small but important UI polish, animation, and interaction pattern used in the current Staffroom AI implementation. These details make the difference between a prototype and a polished product.

---

## Table of Contents

1. [Animation Inventory](#animation-inventory)
2. [Component-Level Polish](#component-level-polish)
3. [Color & Visual Hierarchy](#color--visual-hierarchy)
4. [Touch & Interaction Patterns](#touch--interaction-patterns)
5. [State Indicators](#state-indicators)
6. [Accessibility Considerations](#accessibility-considerations)
7. [Mobile-Specific Polish](#mobile-specific-polish)
8. [Implementation Code Snippets](#implementation-code-snippets)

---

## Animation Inventory

### Page Transitions

```jsx
// Simple opacity fade to prevent blank screen on navigation
// Location: MobileLayout.jsx, DesktopLayout.jsx
<motion.div
  key={location.pathname}
  initial={{ opacity: 0.8 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.1 }}
>
  {children}
</motion.div>
```

**Why 0.8 instead of 0?** Prevents jarring flash on navigation. Content is already 80% visible.

**Why 0.1s?** Fast enough to feel instant, slow enough to smooth over React hydration.

---

### Chat Panel Expand/Collapse

```jsx
// Location: PersistentChatBar.jsx
<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: '65vh', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-white rounded-t-3xl"
    >
```

**Spring Physics Explained:**
- `stiffness: 300` — How "tight" the spring is (higher = faster)
- `damping: 30` — How much resistance (higher = less bouncy)
- Result: Quick, smooth expansion with slight deceleration at end

---

### Typing Indicator (Three Dots)

```jsx
// Location: PersistentChatBar.jsx, DesktopChatBar.jsx
{isLoading && (
  <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl rounded-tl-md w-fit shadow-sm">
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-indigo-400 rounded-full"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.1,  // Stagger each dot by 100ms
          }}
        />
      ))}
    </div>
    <span className="text-xs text-slate-500 ml-1">Thinking...</span>
  </div>
)}
```

**Details:**
- 2×2px dots (small but visible)
- 4px vertical bounce (subtle)
- 0.5s full cycle (matches typing rhythm)
- 0.1s stagger creates wave effect

---

### Voice Recording Waveform

```jsx
// Location: DesktopChatBar.jsx - when isRecording
<div className="flex gap-0.5 flex-shrink-0 mt-0.5">
  {[0, 1, 2, 3].map(i => (
    <motion.div
      key={i}
      className="w-1 h-4 bg-red-500 rounded-full"
      animate={{ scaleY: [0.4, 1, 0.4] }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        delay: i * 0.15,
      }}
    />
  ))}
</div>
```

**Details:**
- 4 bars (classic audio visualizer look)
- 1px wide × 16px tall
- scaleY animation (0.4 → 1 → 0.4)
- 0.8s cycle with 0.15s stagger

---

### Bottom Navigation Pill Indicator

```jsx
// Location: BottomNav.jsx
{isActive && (
  <motion.div
    layoutId="bottomNavIndicator"  // ← Shared element animation
    className="absolute top-1.5 w-12 h-8 bg-indigo-100 rounded-xl"
    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
  />
)}
```

**Magic:** `layoutId` creates smooth pill movement between tabs without coordinating state.

---

### Button Press Feedback

```jsx
// Location: Multiple components
<motion.div whileTap={{ scale: 0.9 }}>
  {/* Button content */}
</motion.div>
```

**Standard:** 10% scale reduction on tap for tactile feedback.

---

### Attendance Row Stagger Animation

```jsx
// Location: AttendanceEditor.jsx
{filteredStudents.map((s, i) => (
  <motion.div
    key={s.studentId}
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: i * 0.02 }}  // 20ms stagger per student
  >
```

**Details:**
- 10px horizontal slide-in
- 0.02s (20ms) stagger per row
- Creates "cascade" effect for 30 students in 0.6s

---

## Component-Level Polish

### Persistent Chat Bar

**Input Field Polish:**
```jsx
<div className="flex-1 relative">
  {/* Sparkles icon inside input */}
  <div className="absolute left-3 top-1/3 -translate-y-1/2 pointer-events-none">
    <Sparkles className="w-4 h-4 text-indigo-500" />
  </div>
  <input
    placeholder="Ask Staffroom AI..."
    className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-2xl text-sm 
               focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white 
               transition-all"
  />
</div>
```

**Details:**
- Sparkles icon as visual AI cue (not just text)
- Background changes from `slate-100` to `white` on focus
- Ring appears on focus (indigo-300)
- All transitions are animated (`transition-all`)

**Button State Logic:**
```jsx
<button
  className={`
    p-2.5 rounded-xl transition-all flex-shrink-0
    ${hasText 
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'  // Send mode
      : isRecording
        ? 'bg-red-500 text-white animate-pulse'  // Recording
        : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'  // Mic idle
    }
  `}
>
  {isLoading ? <Loader2 className="animate-spin" /> 
   : hasText ? <Send /> 
   : <Mic />}
</button>
```

**Three visual states:**
1. **Mic Idle:** Gray icon, light hover
2. **Has Text:** Indigo button with shadow
3. **Recording:** Red with pulse animation

---

### Voice Attendance Logger

**"LIVE AI" Badge:**
```jsx
{shouldUseLiveAPI && (
  <span className="flex items-center gap-1 px-1.5 py-0.5 
                   bg-gradient-to-r from-purple-500 to-pink-500 
                   text-white text-[5px] md:text-[10px] font-medium rounded-full">
    <Zap className="w-2.5 h-2.5" />
    LIVE AI
  </span>
)}
```

**Details:**
- Gradient badge (purple → pink)
- Tiny on mobile (5px), readable on desktop (10px)
- Zap icon suggests real-time power

**Live Status Dot:**
```jsx
<span className={`w-2 h-2 rounded-full ${
  liveStatus === 'streaming' ? 'bg-green-500 animate-pulse' :
  liveStatus === 'ready' ? 'bg-green-500' :
  liveStatus === 'connected' ? 'bg-yellow-500' :
  'bg-gray-400'
}`} />
```

**Color semantics:**
- Green pulsing = actively streaming
- Green solid = ready
- Yellow = connecting
- Gray = disconnected

**Live Updates Feed:**
```jsx
<div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
  update.action.includes('present') 
    ? 'bg-green-50 text-green-700' 
    : 'bg-red-50 text-red-700'
}`}>
  {update.action.includes('present') 
    ? <UserCheck className="w-3 h-3" /> 
    : <UserX className="w-3 h-3" />
  }
  <span className="font-medium">{update.matchedStudent?.name}</span>
  <span className={`text-[10px] px-1 rounded ${
    update.confidence === 'high' ? 'bg-green-100' :
    update.confidence === 'medium' ? 'bg-yellow-100' :
    'bg-red-100'
  }`}>
    {update.confidence}
  </span>
  <span className="text-gray-400 ml-auto text-[10px]">{update.timestamp}</span>
</div>
```

**Details:**
- Color-coded by action (green/red)
- Confidence badge with color
- Timestamp pushed to right with `ml-auto`
- 3px icons (12×12px) for compactness

---

### Syllabus Progress Tracker

**Page Number Picker (Scroll Wheel):**
```jsx
// Location: SyllabusProgress.jsx - PageScrollPicker
<div className="relative" style={{ height: `${VISIBLE_ITEMS * ITEM_HEIGHT}px` }}>
  {/* Top gradient fade */}
  <div className="absolute top-0 left-0 right-0 h-10 
                  bg-gradient-to-b from-white via-white/60 to-transparent 
                  pointer-events-none z-10" />
  
  {/* Center highlight bar */}
  <div 
    className="absolute left-2 right-2 bg-indigo-500/20 backdrop-blur-sm 
               rounded-md pointer-events-none z-10 border border-indigo-400"
    style={{ 
      height: `${ITEM_HEIGHT}px`,
      top: `${(VISIBLE_ITEMS - 1) / 2 * ITEM_HEIGHT}px`
    }}
  />
  
  {/* Scrollable list with snap */}
  <div
    className="overflow-y-scroll scrollbar-hide"
    style={{ scrollSnapType: 'y mandatory' }}
  >
```

**Details:**
- 5 visible items (2 above, selected, 2 below)
- 32px item height
- Gradient fade at top/bottom (depth effect)
- Center highlight bar (subtle indigo)
- CSS scroll snap for smooth selection
- Portal-based (renders outside scroll container to avoid clipping)

**Status Badges:**
```jsx
const STATUS_META = {
  "not-started": { 
    label: "Not Started", 
    icon: Circle, 
    badgeClass: "bg-black text-black-700",
    iconClass: "text-black-400"
  },
  "ongoing": { 
    label: "Ongoing", 
    icon: Clock, 
    badgeClass: "bg-indigo-100 text-indigo-700",
    iconClass: "text-indigo-600"
  },
  "done": { 
    label: "Done", 
    icon: CheckCircle2, 
    badgeClass: "bg-green-100 text-green-700",
    iconClass: "text-green-600"
  },
};
```

---

### Attendance Editor

**Student Row Toggle:**
```jsx
<motion.div
  onClick={() => toggle(s.studentId)}
  className={`
    flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
    ${isPresent 
      ? 'bg-green-50 border-green-200 hover:border-green-300' 
      : 'bg-red-50 border-red-200 hover:border-red-300'
    }
  `}
>
  {/* Avatar with initials */}
  <div className={`
    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
    ${isPresent ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}
  `}>
    {s.name.split(' ').map(n => n[0]).join('')}
  </div>
  
  {/* Status indicator */}
  <div className={`
    w-8 h-8 rounded-full flex items-center justify-center transition-all
    ${isPresent ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
  `}>
    {isPresent ? <Check /> : <X />}
  </div>
</motion.div>
```

**Details:**
- Full row is clickable (large touch target)
- 2px border for clear definition
- Avatar shows initials (e.g., "Aarav Sharma" → "AS")
- Right-side status icon (check/X)
- Colors switch instantly on tap

---

## Color & Visual Hierarchy

### Color Palette (tokens.css)

```css
/* Primary Actions */
--color-primary-500: #6366F1;  /* Indigo - buttons, links */
--color-primary-600: #4F46E5;  /* Hover state */

/* Success/Error Semantics */
--color-success-500: #22C55E;  /* Green - present, done, success */
--color-error-500: #EF4444;    /* Red - absent, error, danger */

/* Warning/Info */
--color-warning-500: #F59E0B;  /* Amber - ongoing, attention */
--color-info-500: #3B82F6;     /* Blue - informational */

/* Neutrals (Slate) */
--color-neutral-50: #F8FAFC;   /* Page background */
--color-neutral-100: #F1F5F9;  /* Card hover, input background */
--color-neutral-200: #E2E8F0;  /* Borders */
--color-neutral-500: #64748B;  /* Secondary text */
--color-neutral-800: #1E293B;  /* Primary text */
```

### Gradient Usage

```css
/* Header gradients */
.header-gradient {
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
}

/* Live AI badge */
.live-badge {
  background: linear-gradient(to right, #8B5CF6, #EC4899);
}

/* Tool card gradients */
.tool-quiz { background: linear-gradient(135deg, #3B82F6, #6366F1); }
.tool-assignment { background: linear-gradient(135deg, #8B5CF6, #EC4899); }
.tool-suggest { background: linear-gradient(135deg, #F59E0B, #F97316); }
```

### Shadow Hierarchy

```css
/* Elevation levels */
.shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }        /* Subtle */
.shadow { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }            /* Cards */
.shadow-lg { box-shadow: 0 10px 25px rgba(0,0,0,0.1); }       /* Modals */
.shadow-xl { box-shadow: 0 -8px 30px rgba(0,0,0,0.1); }       /* Chat panel */

/* Colored shadows */
.shadow-indigo-200 { box-shadow: 0 4px 14px rgba(99,102,241,0.3); }  /* Primary buttons */
```

---

## Touch & Interaction Patterns

### Touch Target Sizes

| Element | Size | Rationale |
|---------|------|-----------|
| Bottom nav items | 80px × 64px | Full thumb width |
| Attendance rows | Full width × 56px | Easy one-hand tap |
| Chat send button | 44px × 44px | Apple HIG minimum |
| Attach button | 40px × 40px | Secondary action |
| Tab bar items | Flex-1 × 40px | Equal distribution |

### Input Focus Behavior

```jsx
// Chat input expands panel when focused
const handleInputFocus = useCallback(() => {
  setIsExpanded(true);
  setActiveTab('chat');
}, []);
```

**Pattern:** Focus → Expand → Show context

### Keyboard Shortcuts (Desktop)

```javascript
// LayoutContext.jsx
// Ctrl/Cmd + K → Toggle chat
if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
  event.preventDefault();
  toggleChat();
}

// Ctrl/Cmd + B → Toggle sidebar
if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
  event.preventDefault();
  toggleSidebar();
}

// Escape → Close modals in order
if (event.key === 'Escape') {
  if (drawerOpen) setDrawerOpen(false);
  else if (chatExpanded) setChatExpanded(false);
  else if (chatOpen) setChatOpen(false);
}
```

---

## State Indicators

### Loading States

| State | Visual Treatment |
|-------|-----------------|
| Page loading | Centered spinner with "Loading..." |
| AI thinking | Three bouncing dots + "Thinking..." |
| Voice connecting | Status text + gray dot |
| Voice ready | Green dot + "Ready" |
| Voice streaming | Pulsing green dot + "Live" |
| Processing | Yellow badge + spinner |

### Empty States

```jsx
// Chat empty state
<div className="text-center py-6">
  <div className="w-14 h-14 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 
                  rounded-2xl flex items-center justify-center mb-3">
    <Sparkles className="w-7 h-7 text-indigo-600" />
  </div>
  <p className="text-sm font-semibold text-slate-800 mb-1">How can I help?</p>
  <p className="text-xs text-slate-500 mb-4">Ask me anything about your classes</p>
  
  {/* Quick suggestions as starting points */}
  <div className="flex flex-wrap justify-center gap-2">
    {suggestions.map((s, i) => (
      <button key={i} onClick={() => handleSend(s)}
        className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs">
        {s}
      </button>
    ))}
  </div>
</div>
```

### Error States

```jsx
// Error display pattern
<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
  <div className="flex items-start gap-2">
    <X className="w-4 h-4 text-red-600 mt-0.5" />
    <div>
      <p className="text-xs font-semibold text-red-900">Error</p>
      <p className="text-xs text-red-700">{error}</p>
    </div>
  </div>
</div>
```

---

## Accessibility Considerations

### Current Implementation

| Feature | Status | Notes |
|---------|--------|-------|
| Focus rings | ✅ | `focus:ring-2 focus:ring-indigo-300` |
| Color contrast | ✅ | Using Tailwind defaults (4.5:1+) |
| Touch targets | ✅ | 44px minimum |
| Keyboard nav | ⚠️ Partial | Shortcuts exist, tab order needs work |
| Screen reader | ⚠️ Partial | Missing ARIA labels in places |
| Reduced motion | ❌ | No `prefers-reduced-motion` support |

### Recommendations for Next Build

```jsx
// Add reduced motion support
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

<motion.div
  animate={prefersReducedMotion ? {} : { y: [0, -4, 0] }}
/>

// Add ARIA labels
<button aria-label="Send message">
  <Send />
</button>

<button aria-label="Start voice recording" aria-pressed={isRecording}>
  <Mic />
</button>
```

---

## Mobile-Specific Polish

### Safe Area Handling

```jsx
// Bottom nav respects iPhone home indicator
<nav style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

// Chat bar positioned above nav
<div 
  className="fixed left-0 right-0 bottom-16 z-50"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
>
```

### iOS Momentum Scrolling

```jsx
<main
  style={{ WebkitOverflowScrolling: 'touch' }}
  className="flex-1 overflow-y-auto overflow-x-hidden"
>
```

### Viewport Height Fix

```css
/* Use dynamic viewport height for mobile browsers */
.min-h-screen {
  min-height: 100vh;
  min-height: 100dvh; /* Dynamic viewport height */
}
```

### Pull-to-Refresh Prevention

```css
/* Prevent accidental pull-to-refresh on chat */
.chat-container {
  overscroll-behavior: contain;
}
```

---

## Implementation Code Snippets

### Toast Configuration

```jsx
// App.jsx
<Toaster 
  position="top-right" 
  toastOptions={{ 
    duration: 2400,  // 2.4 seconds
    style: {
      background: '#fff',
      color: '#1e293b',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    },
  }} 
/>
```

### Z-Index Scale

```css
/* Consistent z-index hierarchy */
:root {
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-fixed: 30;      /* Bottom nav, sidebar */
  --z-backdrop: 40;   /* Modal backdrops */
  --z-modal: 50;      /* Modals, chat bar */
  --z-popover: 60;    /* Attach menu */
  --z-toast: 70;      /* Toast notifications */
  --z-portal: 99999;  /* Page picker */
}
```

### Border Radius Scale

```css
/* Consistent border radius */
.rounded-sm { border-radius: 4px; }
.rounded { border-radius: 8px; }
.rounded-lg { border-radius: 12px; }
.rounded-xl { border-radius: 16px; }
.rounded-2xl { border-radius: 20px; }
.rounded-3xl { border-radius: 24px; }
```

### Transition Timing

```css
/* Standard transitions */
.transition-colors { transition: color 150ms, background-color 150ms; }
.transition-all { transition: all 200ms ease-in-out; }
.transition-transform { transition: transform 150ms; }

/* Sidebar expansion */
.sidebar-transition { transition: all 300ms ease-in-out; }
```

---

## Quick Reference: What to Copy Verbatim

1. **Typing indicator animation** — The three-dot bounce
2. **Chat panel spring animation** — stiffness: 300, damping: 30
3. **Bottom nav pill animation** — layoutId pattern
4. **Voice waveform bars** — 4-bar scaleY animation
5. **Attendance row stagger** — 0.02s delay per item
6. **Page scroll picker** — Portal + gradient fade + snap scroll
7. **Status color semantics** — green=present, red=absent, yellow=pending
8. **Focus ring style** — ring-2 ring-indigo-300

---

*Keep this document as a reference when rebuilding UI components. The micro-interactions are what make the app feel polished.*
