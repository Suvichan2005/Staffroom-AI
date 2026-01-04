# Staffroom AI: Technical Architecture Analysis

This document provides a high-level detailed analysis of the current implementation features of the Staffroom-AI repository, focus on its AI core and UI/UX state management.

## 1. Core Feature: Voice-Based Attendance Logging

The voice attendance system is the "hero feature" of the application, implemented with a multi-layered approach to ensure high accuracy and real-time feedback.

### How it's implemented:
- **Service Layer (`voiceService.js`)**: Provides a fallback mechanism between the **Browser Web Speech API** (free, offline-capable) and **OpenAI Whisper API** (high accuracy, multi-lingual).
- **Gemini Live Integration (`geminiLiveService.js`)**: This is the state-of-the-art implementation. It uses a **WebSocket connection** (`wss://generativelanguage.googleapis.com/...`) to the `gemini-2.0-flash-exp` model. 
- **PCM Audio Processing**: Captures audio using `navigator.mediaDevices.getUserMedia`, converts it to **Int16 PCM (16kHz)**, and streams it in chunks to Gemini.
- **Fuzzy Student Matching**: Instead of strict string matching, the system uses a `similarityScore` algorithm and roll-number detection to map spoken names (which vary due to accents/STT errors) to the student database.
- **Unified Tooling (`chatToolsDefinition.js`)**: Both text and voice agents share the same "function definitions" (e.g., `mark_student_present`). This ensures consistency—if a feature works in text chat, it works in voice.

### Why it works well:
- **Live Transcription**: The user sees what the AI is hearing in real-time, building trust.
- **Context-Aware Prompting**: The system prompt injected into Gemini Live includes the *current student list*, *current class schedule*, and *current temporal context* (e.g., "It's 10:15 AM on Monday, you are likely in 8A History").

## 2. Minute UI Polishes

### Persistent AI Chatbar
- **State Retention**: The `AIContext.jsx` acts as the global brain. It retains the chat history, current input, and recording state even as the user navigates between different pages (Dashboard → Classes → Profile).
- **Responsive Integration**: 
  - **Mobile**: A specialized `PersistentChatBar.jsx` sits fixed above the `BottomNav`. It uses `framer-motion` for smooth expansion into a full-height chat interface without blocking the underlying page logic.
  - **Desktop**: A `DesktopChatBar.jsx` centered at the bottom, mimicking modern AI tool-bars like ChatGPT or Claude.
- **Safe Navigation**: When the AI triggers a `navigateTo` tool, the system gracefully handles the window transition while maintaining the chat's "loading" or "success" state.

### Multi-Step Tool Execution
- The UI doesn't just "show" a result; it executes actions. For example, marking a syllabus topic as "done" automatically:
  1. Searches for the topic index.
  2. Updates the progress in `localStorage`.
  3. Finds the *next* topic based on the syllabus tree.
  4. Updates the UI across multiple components (Syllabus view, Dashboard progress cards) simultaneously via context.

## 3. Implementation of Syllabus & Progress
- **Page-to-Topic Mapping**: A unique feature where teachers can say "I'm on page 42" and the AI calls `findTopicByPage` to automatically identify the sub-topic and mark it as "ongoing".
- **Temporal Context**: The system calculates the `classStatus` (Currently in Class, Just Finished, Next Up) based on the local time, allowing the AI to answer "What's next?" without the teacher specifying the class code.

## 4. Technology Stack Summary (Current)
- **Frontend**: React 18, Vite.
- **Styling**: Vanilla CSS + Tailwind-like utility classes.
- **State**: React Context (AI, Auth, Layout).
- **AI**: Google Gemini API (@google/generative-ai), Gemini Live (WebSocket), OpenAI Whisper.
- **Database/Persistence**: Firebase + LocalStorage for offline-first progress tracking.
- **Vitals**: `activityLogger.js` captures all AI interactions and navigation steps for debugging.
