# School Companion AI Features - Installation Guide

## Step-by-Step Setup

### 1. Install Required Packages

```bash
cd frontend
npm install @google/generative-ai openai lucide-react
```

### 2. Create Environment File

Create a new file `frontend/.env`:

```env
# Google Gemini API Key (Required for AI features)
VITE_GEMINI_API_KEY=your_api_key_here

# OpenAI API Key (Optional - for Whisper voice transcription)
# If not provided, will use browser's free Web Speech API
VITE_OPENAI_API_KEY=your_openai_key_here
```

**Get Your Free Gemini API Key**:
1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy and paste above

### 3. Test Installation

Create a test file `frontend/src/pages/AITest.jsx`:

```jsx
import React from 'react';
import VoiceProgressLogger from '../components/VoiceProgressLogger';
import SyllabusAIHelper from '../components/SyllabusAIHelper';

export default function AITest() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">AI Features Test Page</h1>
      
      <VoiceProgressLogger 
        courseId="geo6"
        sectionId="6A"
        onUpdate={(data) => console.log('Progress updated:', data)}
      />
      
      <SyllabusAIHelper
        subject="Geography"
        grade={6}
        chapterTitle="Landforms of the Earth"
        topicTitle="Mountains and Plateaus"
        onGenerated={(result) => console.log('AI generated:', result)}
      />
    </div>
  );
}
```

### 4. Add Route (if using React Router)

In your `App.jsx` or router file:

```jsx
import AITest from './pages/AITest';

// Add route:
<Route path="/ai-test" element={<AITest />} />
```

### 5. Run and Test

```bash
npm run dev
```

Visit: http://localhost:5173/ai-test

### 6. Verify Features

✅ **Voice Logger**:
- Click "Start Recording"
- Say: "I finished Chapter 2, Topic 1"
- Should show success message

✅ **Quiz Generator**:
- Click "Generate Quiz" tab
- Click button
- Should display 5 questions

✅ **Assignment Generator**:
- Click "Create Assignment" tab
- Should generate homework with rubric

---

## Troubleshooting

### Issue: "API Key not found"
**Solution**: Check `.env` file exists in `frontend/` folder, not root

### Issue: Components not found
**Solution**: Verify files exist:
- `frontend/src/components/VoiceProgressLogger.jsx`
- `frontend/src/components/SyllabusAIHelper.jsx`
- `frontend/src/services/aiService.js`

### Issue: Voice not working
**Solution**: 
- Use Chrome or Edge browser
- Allow microphone permissions
- Must be on localhost or HTTPS

### Issue: Icons not showing
**Solution**: `lucide-react` package missing
```bash
npm install lucide-react
```

---

## Integration Examples

### Add to Existing ClassPage

```jsx
import VoiceProgressLogger from '../components/VoiceProgressLogger';

function ClassPage({ courseId, sectionId }) {
  const handleProgressUpdate = (data) => {
    // Refresh your progress display
    console.log('Updated:', data);
  };

  return (
    <div>
      {/* Your existing code */}
      
      {/* Add Voice Logger */}
      <VoiceProgressLogger 
        courseId={courseId}
        sectionId={sectionId}
        onUpdate={handleProgressUpdate}
      />
    </div>
  );
}
```

### Add to Dashboard

```jsx
import { generateDailyBriefing } from '../services/aiService';
import { useState, useEffect } from 'react';

function Dashboard() {
  const [briefing, setBriefing] = useState(null);

  useEffect(() => {
    loadBriefing();
  }, []);

  const loadBriefing = async () => {
    const data = await generateDailyBriefing({
      courses: teacherData.courses,
      todaySessions: [...],
      alerts: [...]
    });
    setBriefing(data);
  };

  return (
    <div>
      {briefing && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3>{briefing.greeting}</h3>
          <p>{briefing.todayFocus}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Next Steps

1. ✅ Test components on `/ai-test` page
2. ✅ Integrate into your existing pages
3. ✅ Customize prompts in `aiService.js`
4. ✅ Add error handling for your use cases
5. ✅ Review `HACKATHON_LLM_PLAN.md` for full roadmap

---

## Files Created

### Backend (MongoDB Models v2)
```
backend/src/models/v2/
├── User.js              ← Polymorphic identity
├── Course.js            ← Application core
├── SyllabusMaster.js    ← Curriculum blueprint
├── AttendanceLog.js     ← Bucket pattern
├── Assignment.js        ← Embedded submissions
├── Supporting.js        ← Helper models
└── index.js             ← Exports
```

### Frontend (AI Layer)
```
frontend/src/
├── services/
│   ├── aiService.js         ← 7 AI functions
│   └── voiceService.js      ← Voice transcription
└── components/
    ├── VoiceProgressLogger.jsx      ← Voice input
    ├── SyllabusAIHelper.jsx         ← Quiz/assignment gen
    └── AttendanceAIInsights.jsx     ← Risk detection
```

### Documentation
```
root/
├── SCHEMA_MIGRATION_PLAN.md     ← Technical deep-dive
├── HACKATHON_LLM_PLAN.md       ← 2-day roadmap
├── IMPLEMENTATION_SUMMARY.md    ← Feature guide
├── AI_FEATURES_README.md        ← Quick start
└── INSTALLATION_GUIDE.md        ← This file
```

---

**You're all set! Focus on your exams, then ship this in 2 days! 🚀**
