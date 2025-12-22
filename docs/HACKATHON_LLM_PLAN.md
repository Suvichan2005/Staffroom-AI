# 2-DAY HACKATHON LLM INTEGRATION PLAN
## School Companion MVP - Rapid AI Feature Rollout

---

## 🎯 GOAL
Build a working MVP with **3 core AI features** using Google's Gemini API, working with existing `dummyData.js`:

1. **Syllabus Tracking** - Voice-to-text progress updates
2. **Syllabus Help** - AI queries, assignment generation, quiz creation
3. **Attendance Metrics** - AI-powered student risk detection

---

## 📋 PRE-REQUISITES

### API Keys Needed
- ✅ **Google Gemini API** - For text generation, chat, suggestions
- ✅ **OpenAI Whisper API** - For voice transcription (optional: use browser's Web Speech API as fallback)

### Setup Steps (30 mins)
```bash
# 1. Install dependencies
cd frontend
npm install @google/generative-ai openai

# 2. Create .env file
echo "VITE_GEMINI_API_KEY=your_gemini_api_key_here" >> .env
echo "VITE_OPENAI_API_KEY=your_openai_api_key_here" >> .env

# 3. Get API keys
# Gemini: https://makersuite.google.com/app/apikey
# OpenAI: https://platform.openai.com/api-keys
```

---

## 🗓️ DAY 1: CORE AI INFRASTRUCTURE + SYLLABUS TRACKING

### Morning (4 hours): Setup & Voice Input

#### Hour 1: AI Service Setup
**File**: `frontend/src/services/aiService.js`

**Tasks**:
- [ ] Create Gemini client wrapper
- [ ] Create Whisper API wrapper
- [ ] Add browser Web Speech API fallback
- [ ] Create prompt templates

**Deliverable**: Working AI service that can:
- Send text to Gemini and get response
- Transcribe audio to text
- Format prompts for different use cases

#### Hour 2-3: Voice-to-Syllabus Update
**Files**: 
- `frontend/src/components/VoiceProgressLogger.jsx`
- Update `ClassPage.jsx`

**Tasks**:
- [ ] Create mic button component
- [ ] Integrate voice recording
- [ ] Send audio to Whisper/Web Speech API
- [ ] Parse transcript to extract chapter/topic
- [ ] Update `dummyData.js` progress state
- [ ] Show confirmation UI

**User Flow**:
1. Teacher clicks mic button
2. Says: "I finished Chapter 2, topic 1 in 6A Geography"
3. AI transcribes and parses
4. System updates progress and shows: "✅ Marked Chapter 2: Landforms of the Earth, Topic 1 as Done"

#### Hour 4: Testing & Polish
- [ ] Test with different voice inputs
- [ ] Handle edge cases (unclear speech, wrong class name)
- [ ] Add loading states and error handling

---

### Afternoon (4 hours): Syllabus AI Assistant

#### Hour 5-6: Smart Suggestions
**File**: `frontend/src/components/SyllabusAIHelper.jsx`

**Tasks**:
- [ ] Create chat-like AI panel
- [ ] Pre-built prompts: "What should I teach next?", "Create a quiz", "Suggest activities"
- [ ] Context: Send current chapter, student count, past progress to Gemini
- [ ] Display AI response in formatted UI

**Sample Prompts**:
```javascript
const PROMPTS = {
  nextTopic: "Based on my progress, what should I teach next in {subject} for {class}?",
  quiz: "Generate 5 multiple-choice questions on {topic} for grade {grade} students",
  activities: "Suggest 3 engaging classroom activities for teaching {topic}",
  lessonPlan: "Create a 45-minute lesson plan for {topic}"
};
```

#### Hour 7-8: Assignment Generator
**File**: `frontend/src/components/AIAssignmentGenerator.jsx`

**Tasks**:
- [ ] Form: Select chapter, assignment type (quiz/essay/project)
- [ ] Send context to Gemini
- [ ] Generate assignment with rubric
- [ ] Preview and edit before saving
- [ ] Save to `assignments` in dummyData

**Sample Output**:
```
Assignment: Map Labeling Exercise
Topic: Landforms of the Earth
Due: 3 days from now
Instructions: Label 10 major landforms on the India map...
Rubric: Accuracy (5 pts), Neatness (3 pts), Completeness (2 pts)
```

---

## 🗓️ DAY 2: ATTENDANCE AI + POLISH

### Morning (4 hours): Attendance Metrics & Risk Detection

#### Hour 1-2: Attendance Analytics
**File**: `frontend/src/components/AttendanceAIInsights.jsx`

**Tasks**:
- [ ] Calculate attendance % per student from `attendanceLogs`
- [ ] Send data to Gemini for analysis
- [ ] AI identifies:
  - Students with <75% attendance
  - Declining attendance patterns
  - Days with unusual absence rates
- [ ] Display insights with severity (INFO/WARNING/CRITICAL)

**Sample Insights**:
```
🔴 CRITICAL: Riya Das - 68% attendance (3 absences in last week)
🟡 WARNING: Attendance on Fridays is 15% lower than other days
🟢 INFO: Overall class attendance: 92%
```

#### Hour 3-4: Student Summary Generator
**File**: `frontend/src/components/StudentAISummary.jsx`

**Tasks**:
- [ ] When teacher clicks a student name
- [ ] Gather: Attendance %, assignment grades, exam scores
- [ ] Send to Gemini: "Analyze this student's performance"
- [ ] AI generates:
  - Strengths & Weaknesses
  - Learning style suggestion
  - Personalized recommendations
- [ ] Cache summary in localStorage

**Sample Summary**:
```
Student: Aarav Singh
Attendance: 88%
Avg Grade: 82%

AI Analysis:
✅ Strengths: Strong in geography (90% avg), consistent attendance
⚠️  Weaknesses: Struggles with essay questions (65% avg)
💡 Learning Style: Visual learner - excels with maps and diagrams
📌 Recommendation: Provide more practice with written analysis
```

---

### Afternoon (3 hours): Integration & Demo Prep

#### Hour 5-6: Dashboard AI Widgets
**File**: Update `Dashboard.jsx`

**Tasks**:
- [ ] Add "AI Daily Briefing" card
- [ ] Show: Classes today, students at risk, syllabus behind schedule
- [ ] Add "Quick Actions" with AI suggestions
- [ ] Add chat bubble for global AI assistant

**Sample Briefing**:
```
📅 Today's Schedule:
- 09:00 Geography 6A (Topic: Plains and Valleys)
- 11:00 History 8B (Topic: Gandhian Era)

⚠️  Alerts:
- 3 students below 75% attendance
- 6A Geography is 10% behind schedule

💡 AI Suggestion: Cover Chapter 2 Topic 2 in 6A today to catch up
```

#### Hour 7: Testing & Bug Fixes
- [ ] End-to-end test: Voice → AI → Update
- [ ] Test all AI features with different data
- [ ] Fix UI bugs and loading states
- [ ] Add error boundaries

---

### Evening (1 hour): Demo Preparation

#### Final Polish
- [ ] Create demo script with sample data
- [ ] Record 2-min demo video
- [ ] Write README with screenshots
- [ ] Deploy to Vercel (frontend only, using dummyData)

---

## 📁 FILE STRUCTURE (New Files to Create)

```
frontend/src/
├── services/
│   └── aiService.js              ← NEW: Gemini & Whisper wrappers
├── components/
│   ├── VoiceProgressLogger.jsx   ← NEW: Mic button + voice input
│   ├── SyllabusAIHelper.jsx      ← NEW: Chat-based AI helper
│   ├── AIAssignmentGenerator.jsx ← NEW: Auto-generate assignments
│   ├── AttendanceAIInsights.jsx  ← NEW: Risk detection & analytics
│   ├── StudentAISummary.jsx      ← NEW: Per-student AI analysis
│   └── GlobalAIAssistant.jsx     ← NEW: Floating chat widget
└── utils/
    └── aiPrompts.js               ← NEW: Template prompts library
```

---

## 🔑 KEY DESIGN DECISIONS

### Why Dummy Data First?
✅ **Speed**: No backend setup, API integration, or DB migrations  
✅ **Focus**: Pure AI feature development  
✅ **Demo-Ready**: Works standalone for hackathon judges  
✅ **Realistic**: `dummyData.js` already mirrors real schema structure

### API Rate Limits (Free Tier)
- **Gemini**: 60 requests/min (sufficient for demo)
- **Whisper**: 50 requests/day (use Web Speech API as backup)

### Fallback Strategy
If AI fails:
- Voice: Use browser's `SpeechRecognition` API
- Text: Show cached responses or placeholder text
- Always allow manual input as backup

---

## 🎬 DEMO SCRIPT (For Judges)

### Feature 1: Voice Syllabus Update (30 sec)
1. Open Class Page (6A Geography)
2. Click mic button
3. Say: "I just finished Chapter 2, Topic 2 today"
4. **Show**: Progress bar updates, topic marked as "Done"

### Feature 2: AI Assignment Generator (45 sec)
1. Click "Generate Assignment"
2. Select: Chapter 2, Type: Quiz
3. **Show**: AI generates 5 questions with rubric
4. Click "Save Assignment"

### Feature 3: Attendance Risk Alert (30 sec)
1. Open Attendance page
2. **Show**: AI highlights 3 students with low attendance
3. Click student name
4. **Show**: AI-generated summary with recommendations

### Feature 4: Daily AI Briefing (15 sec)
1. Open Dashboard
2. **Show**: "Today's AI Briefing" card with schedule, alerts, suggestions

**Total Demo Time**: 2 minutes

---

## 📊 SUCCESS METRICS

By end of Day 2, you should have:

✅ **4 Working AI Features**:
   - Voice syllabus logging
   - AI-powered quiz/assignment generation
   - Student risk detection
   - Daily teacher briefing

✅ **3 Core Flows Tested**:
   - Teacher → Voice Input → Progress Update
   - Teacher → Request → AI Generates Assignment
   - Teacher → View Student → AI Analysis

✅ **Demo-Ready Package**:
   - Deployed frontend (Vercel)
   - 2-min video demo
   - GitHub repo with README

---

## 🚨 COMMON PITFALLS & SOLUTIONS

| Problem | Solution |
|---------|----------|
| API rate limit hit | Cache responses, use localStorage |
| Voice not recognizing | Add text fallback input |
| AI response too slow | Show loading skeleton, add timeout |
| Parsing voice fails | Use fuzzy matching for class/chapter names |
| Demo breaks | Always have recorded video backup |

---

## 🔧 QUICK REFERENCE: AI PROMPTS

### Voice Parsing Prompt
```javascript
const VOICE_PARSE_PROMPT = `
Extract structured data from this teacher's voice input:
"${transcript}"

Return JSON:
{
  "action": "mark_complete|mark_ongoing|mark_pending",
  "subject": "Geography",
  "class": "6A",
  "chapterIndex": 2,
  "topicIndex": 1
}
`;
```

### Quiz Generation Prompt
```javascript
const QUIZ_PROMPT = `
Generate 5 multiple-choice questions for:
Subject: ${subject}
Grade: ${grade}
Chapter: ${chapterTitle}
Topic: ${topicTitle}

Format as JSON array with: question, options (A-D), correctAnswer, explanation
`;
```

### Student Analysis Prompt
```javascript
const STUDENT_ANALYSIS_PROMPT = `
Analyze this student's performance:
Name: ${name}
Attendance: ${attendance}%
Assignment Avg: ${assignmentAvg}%
Recent Grades: ${grades.join(', ')}

Provide:
1. Strengths (2-3 bullet points)
2. Weaknesses (2-3 bullet points)
3. Learning style guess
4. Actionable recommendations for teacher
`;
```

---

## 🎓 NEXT STEPS (Post-Hackathon)

**Week 1**: Backend integration
- Connect aiService to real MongoDB
- Implement caching layer (Redis)
- Add auth tokens to API calls

**Week 2**: Advanced AI
- Multi-turn conversations (chat history)
- Voice assistant (full dialogue)
- Auto-grading for text submissions

**Week 3**: Production Polish
- Rate limiting & quota management
- Error recovery & retry logic
- Analytics dashboard for AI usage

---

## 📞 HELP & RESOURCES

- **Gemini Docs**: https://ai.google.dev/docs
- **Whisper API**: https://platform.openai.com/docs/guides/speech-to-text
- **Web Speech API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

**Emergency Contact**: If stuck, ping me with error logs!

---

**Ready to ship?** Let's build! 🚀
