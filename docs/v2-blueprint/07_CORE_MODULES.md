# SECTION G — CORE MODULE IMPLEMENTATION LOGIC

> **Purpose:** Provide implementation-ready specifications for each core module  
> **Format:** Responsibilities, data flow, pseudocode, edge cases

---

## Module Overview

| Module | Priority | Complexity | Dependencies |
|--------|----------|------------|--------------|
| **Voice Attendance Engine** | 🔴 Critical | High | AI Gateway, Sync Engine |
| **Syllabus Parity Engine** | 🔴 Critical | Medium | Sync Engine |
| **Substitution Management** | 🔴 Critical | Medium | Schedule Engine |
| **Teacher Analytics** | 🟡 High | Medium | All data modules |
| **Admin/HOD Views** | 🟡 High | Medium | All data modules |

---

## 1. Voice Attendance Engine

### 1.1 Responsibilities

1. **Audio Capture:** Capture microphone audio in PCM16 format
2. **Real-time Streaming:** Stream audio to STT provider via WebSocket
3. **Transcript Processing:** Parse transcripts for attendance commands
4. **Student Matching:** Fuzzy match spoken names to student roster
5. **UI Feedback:** Show real-time transcript and attendance updates
6. **Persistence:** Save attendance records locally and sync

### 1.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VOICE ATTENDANCE DATA FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. SETUP PHASE                                                             │
│  ─────────────                                                              │
│  Teacher taps "Voice Attendance" button                                     │
│         │                                                                    │
│         ▼                                                                    │
│  Load section/student roster from local SQLite                              │
│         │                                                                    │
│         ▼                                                                    │
│  Build system prompt with student list + context                            │
│         │                                                                    │
│         ▼                                                                    │
│  Create VoiceSession (STT provider selected automatically)                  │
│                                                                              │
│  2. STREAMING PHASE                                                         │
│  ─────────────────                                                          │
│  ┌─────────────┐    PCM16 Audio    ┌─────────────┐                         │
│  │ Microphone  │ ─────────────────► │ STT Provider│                         │
│  │ (Browser)   │                    │ (Deepgram)  │                         │
│  └─────────────┘                    └──────┬──────┘                         │
│                                            │                                │
│                        Transcript chunks   │                                │
│                            ◄───────────────┘                                │
│                            │                                                │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TRANSCRIPT PROCESSOR                              │   │
│  │                                                                      │   │
│  │  For each transcript chunk:                                         │   │
│  │    1. Display interim text in UI                                    │   │
│  │    2. If final: extract attendance commands                         │   │
│  │    3. Fuzzy match names to student roster                          │   │
│  │    4. Update local attendance state                                 │   │
│  │    5. Show confirmation in UI                                       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                            │                                                │
│                            ▼                                                │
│  3. FINALIZATION PHASE                                                     │
│  ──────────────────────                                                     │
│  Teacher taps "Done"                                                        │
│         │                                                                    │
│         ▼                                                                    │
│  Show summary for review (editable)                                         │
│         │                                                                    │
│         ▼                                                                    │
│  Save to local SQLite + enqueue sync                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Pseudocode

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// VOICE ATTENDANCE ENGINE - Core Implementation
// ═══════════════════════════════════════════════════════════════════════════

class VoiceAttendanceEngine {
  private session: VoiceSession | null = null;
  private students: Student[] = [];
  private attendance: Map<string, AttendanceStatus> = new Map();
  private transcript: string = '';
  
  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  
  async start(sectionId: string): Promise<void> {
    // 1. Load students from local database
    this.students = await localDB.query(`
      SELECT s.*, ss.roll_number 
      FROM students s
      JOIN section_students ss ON s.id = ss.student_id
      WHERE ss.section_id = ? AND ss.left_at IS NULL
      ORDER BY ss.roll_number
    `, [sectionId]);
    
    // 2. Initialize attendance map (all unknown initially)
    this.students.forEach(s => this.attendance.set(s.id, 'unknown'));
    
    // 3. Build context for AI
    const systemPrompt = this.buildSystemPrompt();
    
    // 4. Create voice session
    this.session = await aiGateway.createVoiceSession({
      systemPrompt,
      tools: this.getAttendanceTools(),
      inputFormat: 'pcm16',
      sampleRate: 16000,
      language: 'en-IN',
      interimResults: true,
    });
    
    // 5. Set up event handlers
    this.session.on('transcript', this.handleTranscript.bind(this));
    this.session.on('toolCall', this.handleToolCall.bind(this));
    this.session.on('error', this.handleError.bind(this));
    
    // 6. Start session
    await this.session.connect();
    
    // 7. Start audio capture
    await this.startAudioCapture();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // SYSTEM PROMPT CONSTRUCTION
  // ─────────────────────────────────────────────────────────────────────────
  
  private buildSystemPrompt(): string {
    const studentList = this.students
      .map(s => `Roll ${s.roll_number}: ${s.name}${s.nicknames.length ? ` (also: ${s.nicknames.join(', ')})` : ''}`)
      .join('\n');
    
    return `
You are an attendance assistant for a classroom. Listen to the teacher and mark attendance.

STUDENT ROSTER:
${studentList}

INSTRUCTIONS:
1. When teacher says a name (or nickname/roll number) followed by "present" or "absent", mark that student
2. Match spoken names fuzzily - "Rahul" might be said as "Raul" or "Rahhul"
3. Match roll numbers spoken as words: "one" = 1, "two" = 2, etc.
4. If teacher says "everyone present except [names]", mark all present first, then mark exceptions absent
5. If unsure about a name, still make your best guess but with lower confidence
6. Never ask clarifying questions - just mark what you hear

COMMON PHRASES:
- "Roll 5 present" → mark roll 5 present
- "Priya is absent today" → mark Priya absent
- "All present" → mark everyone present
- "Everyone's here except Rahul and Amit" → all present, Rahul and Amit absent
`.trim();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // TOOL DEFINITIONS
  // ─────────────────────────────────────────────────────────────────────────
  
  private getAttendanceTools(): ToolDefinition[] {
    return [
      {
        name: 'mark_student_present',
        description: 'Mark a student as present',
        parameters: {
          type: 'object',
          properties: {
            student_identifier: {
              type: 'string',
              description: 'Name, nickname, or roll number of the student'
            },
            confidence: {
              type: 'number',
              description: 'Confidence in the match (0.0 to 1.0)'
            }
          },
          required: ['student_identifier']
        }
      },
      {
        name: 'mark_student_absent',
        description: 'Mark a student as absent',
        parameters: {
          type: 'object',
          properties: {
            student_identifier: {
              type: 'string',
              description: 'Name, nickname, or roll number of the student'
            },
            confidence: {
              type: 'number',
              description: 'Confidence in the match (0.0 to 1.0)'
            }
          },
          required: ['student_identifier']
        }
      },
      {
        name: 'mark_all_present',
        description: 'Mark all students as present',
        parameters: {
          type: 'object',
          properties: {
            exceptions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Students to exclude (leave absent)'
            }
          }
        }
      }
    ];
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  private handleTranscript(event: TranscriptEvent): void {
    if (event.isFinal) {
      this.transcript += event.text + ' ';
    }
    
    // Emit to UI for display
    this.emit('transcript', {
      text: event.text,
      isFinal: event.isFinal,
      fullTranscript: this.transcript
    });
  }
  
  private handleToolCall(event: ToolCallEvent): void {
    const { name, arguments: args } = event;
    
    switch (name) {
      case 'mark_student_present':
        this.markStudent(args.student_identifier, 'present', args.confidence ?? 0.9);
        break;
        
      case 'mark_student_absent':
        this.markStudent(args.student_identifier, 'absent', args.confidence ?? 0.9);
        break;
        
      case 'mark_all_present':
        this.markAllPresent(args.exceptions ?? []);
        break;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // STUDENT MATCHING
  // ─────────────────────────────────────────────────────────────────────────
  
  private markStudent(identifier: string, status: 'present' | 'absent', confidence: number): void {
    const match = this.findStudent(identifier);
    
    if (!match) {
      this.emit('warning', { message: `Could not match "${identifier}" to any student` });
      return;
    }
    
    const { student, matchScore } = match;
    const finalConfidence = confidence * matchScore;
    
    // Update attendance
    this.attendance.set(student.id, status);
    
    // Emit update to UI
    this.emit('attendanceUpdate', {
      studentId: student.id,
      studentName: student.name,
      rollNumber: student.roll_number,
      status,
      confidence: finalConfidence,
      needsReview: finalConfidence < 0.75
    });
  }
  
  private findStudent(identifier: string): { student: Student, matchScore: number } | null {
    const normalized = identifier.toLowerCase().trim();
    
    // Try exact roll number match first
    const rollMatch = normalized.match(/^(?:roll\s*)?(\d+)$/);
    if (rollMatch) {
      const rollNum = parseInt(rollMatch[1], 10);
      const student = this.students.find(s => s.roll_number === rollNum);
      if (student) return { student, matchScore: 1.0 };
    }
    
    // Try number words
    const numberWords: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      // ... extend as needed
    };
    if (numberWords[normalized]) {
      const student = this.students.find(s => s.roll_number === numberWords[normalized]);
      if (student) return { student, matchScore: 0.95 };
    }
    
    // Fuzzy name matching
    let bestMatch: { student: Student, score: number } | null = null;
    
    for (const student of this.students) {
      // Check name
      const nameScore = this.fuzzyScore(normalized, student.name.toLowerCase());
      if (nameScore > (bestMatch?.score ?? 0.6)) {
        bestMatch = { student, score: nameScore };
      }
      
      // Check nicknames
      for (const nickname of student.nicknames) {
        const nickScore = this.fuzzyScore(normalized, nickname.toLowerCase());
        if (nickScore > (bestMatch?.score ?? 0.6)) {
          bestMatch = { student, score: nickScore };
        }
      }
    }
    
    return bestMatch ? { student: bestMatch.student, matchScore: bestMatch.score } : null;
  }
  
  private fuzzyScore(input: string, target: string): number {
    // Levenshtein-based similarity score
    const maxLen = Math.max(input.length, target.length);
    if (maxLen === 0) return 1;
    
    const distance = this.levenshteinDistance(input, target);
    return 1 - (distance / maxLen);
  }
  
  private markAllPresent(exceptions: string[]): void {
    const exceptionIds = new Set(
      exceptions
        .map(e => this.findStudent(e)?.student.id)
        .filter((id): id is string => id !== undefined)
    );
    
    for (const student of this.students) {
      if (!exceptionIds.has(student.id)) {
        this.attendance.set(student.id, 'present');
        this.emit('attendanceUpdate', {
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.roll_number,
          status: 'present',
          confidence: 0.95,
          needsReview: false
        });
      }
    }
    
    // Mark exceptions as absent
    for (const exceptionId of exceptionIds) {
      const student = this.students.find(s => s.id === exceptionId)!;
      this.attendance.set(exceptionId, 'absent');
      this.emit('attendanceUpdate', {
        studentId: exceptionId,
        studentName: student.name,
        rollNumber: student.roll_number,
        status: 'absent',
        confidence: 0.85,
        needsReview: true
      });
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // FINALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  
  async finalize(sectionId: string, overrides: Map<string, AttendanceStatus>): Promise<void> {
    // Apply any manual overrides from review
    for (const [studentId, status] of overrides) {
      this.attendance.set(studentId, status);
    }
    
    // Create attendance session
    const sessionId = crypto.randomUUID();
    const now = new Date();
    
    await localDB.transaction(async (tx) => {
      // Insert session
      await tx.execute(`
        INSERT INTO attendance_sessions 
        (id, school_id, section_id, type, date, taken_by_id, method, transcript)
        VALUES (?, ?, ?, 'subject', ?, ?, 'voice', ?)
      `, [sessionId, currentSchoolId, sectionId, now.toISOString().split('T')[0], currentUserId, this.transcript]);
      
      // Insert records
      for (const [studentId, status] of this.attendance) {
        if (status === 'unknown') continue;  // Skip unmarked students
        
        await tx.execute(`
          INSERT INTO attendance_records
          (id, school_id, session_id, student_id, status, confidence)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [crypto.randomUUID(), currentSchoolId, sessionId, studentId, status, 0.9]);
      }
    });
    
    // Enqueue sync
    await syncEngine.enqueueEvent({
      entityType: 'attendance_session',
      entityId: sessionId,
      eventType: 'created',
      payload: { /* session data */ }
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────
  
  async stop(): Promise<void> {
    if (this.session) {
      this.session.disconnect();
      this.session = null;
    }
    await this.stopAudioCapture();
  }
}
```

### 1.4 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Teacher says name not in roster** | Log warning, don't crash, continue listening |
| **Same name for multiple students** | Use roll number or ask for clarification (if enabled) |
| **Very noisy classroom** | Web Speech API fallback, show "noisy environment" indicator |
| **Teacher corrects themselves** | "Wait, not Rahul, I meant Ravi" → Undo last mark, apply new |
| **Network drops mid-session** | Switch to Web Speech API, queue for sync |
| **Microphone permission denied** | Show clear error with instructions |
| **Teacher says "everyone" variations** | Handle "all", "everyone", "whole class", "sab log" |
| **Hindi/English code-switching** | Multi-language model handles mixed input |

---

## 2. Syllabus Parity Engine

### 2.1 Responsibilities

1. **Progress Tracking:** Track completion status per topic per section
2. **Voice Updates:** Process voice commands for syllabus updates
3. **Page Mapping:** Map "I'm on page X" to specific topic
4. **Parity Calculation:** Compare progress across sections
5. **Recommendations:** Suggest catch-up priorities

### 2.2 Pseudocode

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// SYLLABUS PARITY ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class SyllabusParityEngine {
  
  // ─────────────────────────────────────────────────────────────────────────
  // PROGRESS UPDATE
  // ─────────────────────────────────────────────────────────────────────────
  
  async updateProgress(
    sectionId: string,
    topicId: string,
    status: ProgressStatus,
    source: 'voice' | 'manual' | 'ai_suggested'
  ): Promise<void> {
    const now = new Date();
    
    await localDB.execute(`
      INSERT INTO syllabus_progress (id, school_id, topic_id, section_id, status, marked_by_id, source, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (topic_id, section_id) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        marked_by_id = EXCLUDED.marked_by_id,
        source = EXCLUDED.source,
        completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN ? ELSE completed_at END,
        updated_at = EXCLUDED.updated_at,
        version = version + 1
    `, [crypto.randomUUID(), currentSchoolId, topicId, sectionId, status, currentUserId, source, now, now]);
    
    // Enqueue sync
    await syncEngine.enqueueEvent({
      entityType: 'syllabus_progress',
      entityId: `${topicId}:${sectionId}`,
      eventType: 'updated',
      payload: { topicId, sectionId, status, source, timestamp: now }
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // VOICE COMMAND PROCESSING
  // ─────────────────────────────────────────────────────────────────────────
  
  async processVoiceCommand(transcript: string, context: TeacherContext): Promise<SyllabusAction[]> {
    // Use AI to parse the command
    const result = await aiGateway.generateWithTools({
      prompt: transcript,
      systemPrompt: this.buildParsingPrompt(context),
      useCase: 'syllabus',
      tools: [
        {
          name: 'mark_topic_complete',
          description: 'Mark a syllabus topic as completed',
          parameters: {
            type: 'object',
            properties: {
              section_name: { type: 'string' },
              chapter: { type: 'string' },
              topic: { type: 'string' },
              page: { type: 'integer' }
            }
          }
        },
        {
          name: 'mark_topic_in_progress',
          description: 'Mark a topic as currently being taught',
          parameters: {
            type: 'object',
            properties: {
              section_name: { type: 'string' },
              topic: { type: 'string' },
              page: { type: 'integer' }
            }
          }
        }
      ]
    });
    
    const actions: SyllabusAction[] = [];
    
    for (const toolCall of result.toolCalls) {
      if (toolCall.name === 'mark_topic_complete') {
        const topic = await this.resolveTopicFromCommand(toolCall.arguments, context);
        if (topic) {
          actions.push({
            type: 'complete',
            topicId: topic.id,
            sectionId: this.resolveSectionId(toolCall.arguments.section_name, context),
            confidence: 0.9
          });
        }
      }
      // ... handle other tool calls
    }
    
    return actions;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PAGE TO TOPIC MAPPING
  // ─────────────────────────────────────────────────────────────────────────
  
  async findTopicByPage(syllabusId: string, pageNumber: number): Promise<SyllabusTopic | null> {
    const result = await localDB.query(`
      SELECT * FROM syllabus_topics
      WHERE syllabus_id = ?
        AND start_page <= ?
        AND (end_page >= ? OR end_page IS NULL)
      ORDER BY level DESC, position
      LIMIT 1
    `, [syllabusId, pageNumber, pageNumber]);
    
    return result[0] ?? null;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PARITY CALCULATION
  // ─────────────────────────────────────────────────────────────────────────
  
  async calculateParity(subjectId: string, gradeLevel: number): Promise<ParityReport> {
    // Get all sections for this subject/grade
    const sections = await localDB.query(`
      SELECT DISTINCT s.id, s.name
      FROM sections s
      JOIN teaching_assignments ta ON ta.section_id = s.id
      WHERE ta.subject_id = ? AND s.grade_level = ?
    `, [subjectId, gradeLevel]);
    
    // Get progress for each section
    const progressBySection = new Map<string, number>();
    
    for (const section of sections) {
      const { completed, total } = await this.getSectionProgress(section.id, subjectId);
      progressBySection.set(section.id, total > 0 ? completed / total : 0);
    }
    
    // Calculate parity metrics
    const progressValues = Array.from(progressBySection.values());
    const avgProgress = progressValues.reduce((a, b) => a + b, 0) / progressValues.length;
    const maxProgress = Math.max(...progressValues);
    const minProgress = Math.min(...progressValues);
    
    // Identify lagging sections
    const laggingSections = sections.filter(s => {
      const progress = progressBySection.get(s.id)!;
      return progress < avgProgress - 0.1; // More than 10% behind average
    });
    
    return {
      subjectId,
      gradeLevel,
      averageProgress: avgProgress,
      spread: maxProgress - minProgress,
      sectionProgress: Object.fromEntries(progressBySection),
      laggingSections: laggingSections.map(s => s.id),
      recommendations: this.generateRecommendations(progressBySection, sections)
    };
  }
  
  private generateRecommendations(
    progress: Map<string, number>,
    sections: Section[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const avg = Array.from(progress.values()).reduce((a, b) => a + b, 0) / progress.size;
    
    for (const section of sections) {
      const sectionProgress = progress.get(section.id)!;
      
      if (sectionProgress < avg - 0.15) {
        recommendations.push({
          sectionId: section.id,
          type: 'catch_up',
          priority: 'high',
          message: `${section.name} is ${Math.round((avg - sectionProgress) * 100)}% behind average`,
          suggestedAction: 'Schedule extra periods or assign self-study'
        });
      }
    }
    
    return recommendations;
  }
}
```

### 2.3 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Topic not found by name** | Use fuzzy matching, suggest closest matches |
| **Page number outside syllabus** | Show error, ask for correct page |
| **Multiple sections mentioned** | Apply to all mentioned, confirm |
| **Teacher says "next topic"** | Find current topic, advance to next in sequence |
| **Topic already marked complete** | Idempotent—no error, maybe show info toast |
| **Syllabus structure changes mid-year** | Version syllabus, migrate progress |

---

## 3. Substitution Management Engine

### 3.1 Responsibilities

1. **Request Creation:** Teachers request substitutes for specific periods
2. **Approval Workflow:** HOD/Admin approves or rejects
3. **Assignment:** Assign substitute teacher
4. **Notification:** Notify all parties
5. **Locking:** Prevent changes after period starts
6. **Attendance Handoff:** Substitute can mark attendance

### 3.2 State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUBSTITUTION STATE MACHINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         ┌───────────┐                                        │
│                         │  PENDING  │                                        │
│                         └─────┬─────┘                                        │
│                               │                                              │
│              ┌────────────────┼────────────────┐                            │
│              │                │                │                            │
│         [reject]         [approve]        [cancel]                          │
│              │                │                │                            │
│              ▼                ▼                ▼                            │
│        ┌──────────┐    ┌──────────┐    ┌──────────┐                        │
│        │ REJECTED │    │ APPROVED │    │CANCELLED │                        │
│        └──────────┘    └────┬─────┘    └──────────┘                        │
│                             │                                               │
│                     [period_starts]                                         │
│                             │                                               │
│                             ▼                                               │
│                       ┌──────────┐                                          │
│                       │  ACTIVE  │◄──── Substitute can mark attendance     │
│                       └────┬─────┘                                          │
│                            │                                                │
│                    [period_ends]                                            │
│                            │                                                │
│                            ▼                                                │
│                      ┌──────────┐                                           │
│                      │COMPLETED │                                           │
│                      └──────────┘                                           │
│                                                                              │
│  LOCKING RULES:                                                             │
│  • Pending → Locked: 15 minutes before period starts                       │
│  • Approved → Locked: When period starts                                    │
│  • Active/Completed: Always locked                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Pseudocode

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// SUBSTITUTION MANAGEMENT ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class SubstitutionEngine {
  
  async createRequest(request: SubstitutionRequest): Promise<string> {
    // Validate
    if (!await this.validateRequest(request)) {
      throw new ValidationError('Invalid substitution request');
    }
    
    const id = crypto.randomUUID();
    
    await localDB.execute(`
      INSERT INTO substitutions (
        id, school_id, teaching_assignment_id, original_teacher_id,
        substitute_teacher_id, date, period_start, period_end, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      id, currentSchoolId, request.teachingAssignmentId, request.originalTeacherId,
      request.substituteTeacherId, request.date, request.periodStart, request.periodEnd, request.reason
    ]);
    
    // Notify approvers
    await this.notifyApprovers(id);
    
    // Enqueue sync
    await syncEngine.enqueueEvent({
      entityType: 'substitution',
      entityId: id,
      eventType: 'created'
    });
    
    return id;
  }
  
  async approve(substitutionId: string, approverId: string): Promise<void> {
    const sub = await this.getSubstitution(substitutionId);
    
    // Check can approve
    if (sub.status !== 'pending') {
      throw new StateError(`Cannot approve substitution in ${sub.status} state`);
    }
    
    if (sub.is_locked) {
      throw new LockError('Substitution is locked');
    }
    
    await localDB.execute(`
      UPDATE substitutions 
      SET status = 'approved', approved_by_id = ?, approved_at = ?
      WHERE id = ?
    `, [approverId, new Date(), substitutionId]);
    
    // Notify parties
    await this.notifyApproval(sub);
  }
  
  async getActiveSubstitution(teacherId: string, date: Date, period: number): Promise<Substitution | null> {
    return await localDB.queryFirst(`
      SELECT * FROM substitutions
      WHERE substitute_teacher_id = ?
        AND date = ?
        AND period_start <= ?
        AND period_end >= ?
        AND status IN ('approved', 'active')
    `, [teacherId, date.toISOString().split('T')[0], period, period]);
  }
  
  async processLocking(): Promise<void> {
    const now = new Date();
    const lockThreshold = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins ahead
    
    // Find substitutions to lock
    const toLock = await localDB.query(`
      SELECT s.*, ts.period_start_time
      FROM substitutions s
      JOIN time_slots ts ON ts.period = s.period_start
      WHERE s.status = 'pending'
        AND s.date = ?
        AND ts.period_start_time <= ?
        AND NOT s.is_locked
    `, [now.toISOString().split('T')[0], lockThreshold.toTimeString()]);
    
    for (const sub of toLock) {
      await localDB.execute(`
        UPDATE substitutions SET is_locked = true, locked_at = ? WHERE id = ?
      `, [now, sub.id]);
    }
  }
}
```

---

## 4. Teacher Analytics Engine

### 4.1 Metrics Calculated

| Metric | Calculation | Update Frequency |
|--------|-------------|------------------|
| **Attendance Rate** | Present / Total per section | Daily |
| **Syllabus Coverage** | Completed topics / Total topics | On progress update |
| **Parity Score** | Std dev of progress across sections | On progress update |
| **Active Days** | Days with attendance/progress logged | Daily |
| **AI Usage** | Tool calls per session | Per session |

### 4.2 Pseudocode

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// TEACHER ANALYTICS ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class TeacherAnalyticsEngine {
  
  async getDashboardMetrics(teacherId: string): Promise<DashboardMetrics> {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = this.getWeekStart(new Date());
    
    const [
      todayClasses,
      weekAttendance,
      syllabusProgress,
      upcomingSubstitutions
    ] = await Promise.all([
      this.getTodayClasses(teacherId),
      this.getWeekAttendanceStats(teacherId, weekStart),
      this.getSyllabusProgressSummary(teacherId),
      this.getUpcomingSubstitutions(teacherId)
    ]);
    
    return {
      today: {
        totalClasses: todayClasses.length,
        completedClasses: todayClasses.filter(c => c.attendanceTaken).length,
        nextClass: todayClasses.find(c => !c.attendanceTaken && c.startTime > new Date())
      },
      thisWeek: {
        attendanceRate: weekAttendance.presentCount / weekAttendance.totalStudentPeriods,
        classesCompleted: weekAttendance.sessionsCompleted
      },
      syllabus: {
        overallProgress: syllabusProgress.avgProgress,
        parityScore: syllabusProgress.parityScore,
        sectionsAtRisk: syllabusProgress.laggingSections
      },
      substitutions: upcomingSubstitutions
    };
  }
  
  async getWeekAttendanceStats(teacherId: string, weekStart: Date): Promise<AttendanceStats> {
    return await localDB.queryFirst(`
      SELECT 
        COUNT(*) as total_student_periods,
        SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_count,
        COUNT(DISTINCT as2.id) as sessions_completed
      FROM attendance_sessions as2
      JOIN attendance_records ar ON ar.session_id = as2.id
      WHERE as2.taken_by_id = ?
        AND as2.date >= ?
        AND as2.date < ?
    `, [teacherId, weekStart, this.addDays(weekStart, 7)]);
  }
  
  async generateWeeklyReport(teacherId: string): Promise<WeeklyReport> {
    // Generate comprehensive weekly report
    // ... implementation
  }
}
```

---

## 5. Admin/HOD Views Engine

### 5.1 Responsibilities

1. **Cross-Section Visibility:** See all sections in department/school
2. **Aggregate Analytics:** Roll-up metrics across teachers
3. **Approval Queues:** Pending substitutions, requests
4. **Intervention Alerts:** Sections falling behind

### 5.2 Pseudocode

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// HOD/ADMIN ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class AdminEngine {
  
  async getDepartmentOverview(department: string): Promise<DepartmentOverview> {
    const subjects = await localDB.query(`
      SELECT * FROM subjects WHERE department = ? AND school_id = ?
    `, [department, currentSchoolId]);
    
    const overviews = await Promise.all(
      subjects.map(async (subject) => {
        const parity = await syllabusParityEngine.calculateParity(
          subject.id, 
          null // all grades
        );
        
        const attendanceRate = await this.getSubjectAttendanceRate(subject.id);
        
        return {
          subject,
          avgProgress: parity.averageProgress,
          parityScore: 1 - parity.spread, // Higher = more parity
          attendanceRate,
          alerts: parity.recommendations.filter(r => r.priority === 'high')
        };
      })
    );
    
    return {
      department,
      subjects: overviews,
      pendingApprovals: await this.getPendingApprovals(department),
      criticalAlerts: overviews.flatMap(o => o.alerts)
    };
  }
  
  async getSchoolHeatmap(): Promise<HeatmapData> {
    // Section × Subject matrix of progress
    return await localDB.query(`
      SELECT 
        sec.name as section,
        sub.name as subject,
        COALESCE(
          AVG(CASE WHEN sp.status = 'completed' THEN 1.0 ELSE 0.0 END),
          0
        ) as progress
      FROM sections sec
      CROSS JOIN subjects sub
      LEFT JOIN syllabi syl ON syl.subject_id = sub.id AND syl.grade_level = sec.grade_level
      LEFT JOIN syllabus_topics st ON st.syllabus_id = syl.id
      LEFT JOIN syllabus_progress sp ON sp.topic_id = st.id AND sp.section_id = sec.id
      WHERE sec.academic_year_id = current_academic_year_id()
      GROUP BY sec.id, sub.id
      ORDER BY sec.grade_level, sec.name, sub.name
    `);
  }
}
```

---

## 6. Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODULE DEPENDENCIES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                            ┌───────────────┐                                │
│                            │   AI Gateway  │                                │
│                            └───────┬───────┘                                │
│                                    │                                        │
│               ┌────────────────────┼────────────────────┐                  │
│               │                    │                    │                  │
│               ▼                    ▼                    ▼                  │
│     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│     │ Voice Attendance │  │ Syllabus Parity │  │   Teacher       │         │
│     │     Engine      │  │     Engine      │  │   Analytics     │         │
│     └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│              │                    │                    │                  │
│              │                    │                    │                  │
│              └────────────────────┼────────────────────┘                  │
│                                   │                                        │
│                                   ▼                                        │
│                          ┌─────────────────┐                               │
│                          │   Sync Engine   │                               │
│                          └────────┬────────┘                               │
│                                   │                                        │
│              ┌────────────────────┼────────────────────┐                  │
│              │                    │                    │                  │
│              ▼                    ▼                    ▼                  │
│     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│     │ Local SQLite DB │  │  Remote Sync    │  │  Event Store    │         │
│     │                 │  │    API          │  │  (PostgreSQL)   │         │
│     └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
