# SECTION J — TESTING, OBSERVABILITY & PRODUCTION READINESS

> **Purpose:** Define testing strategies, monitoring, and rollout plan  
> **Format:** Test matrices, observability architecture, launch checklist

---

## 1. Testing Strategy Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TESTING PYRAMID                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ▲                                              │
│                             ╱ ╲                                             │
│                            ╱   ╲                                            │
│                           ╱     ╲                                           │
│                          ╱  E2E  ╲         10 tests                        │
│                         ╱ (Manual) ╲       Critical user journeys          │
│                        ╱───────────╲                                        │
│                       ╱             ╲                                       │
│                      ╱  Integration  ╲      50 tests                       │
│                     ╱   (Playwright)  ╲     API + UI flows                 │
│                    ╱───────────────────╲                                    │
│                   ╱                     ╲                                   │
│                  ╱    Component Tests    ╲   200 tests                     │
│                 ╱    (React Testing Lib)  ╲  UI components                 │
│                ╱───────────────────────────╲                                │
│               ╱                             ╲                               │
│              ╱         Unit Tests           ╲  500+ tests                  │
│             ╱       (Vitest / Jest)          ╲ Business logic              │
│            ╱─────────────────────────────────╲                              │
│                                                                              │
│  SPECIAL CONSIDERATIONS FOR STAFFROOM:                                       │
│  • Voice input testing requires audio mocks                                 │
│  • Offline testing requires service worker simulation                       │
│  • Multi-tenant testing requires fixture isolation                          │
│  • AI response testing requires deterministic mocks                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Unit Testing

### 2.1 Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
```

### 2.2 Unit Test Examples

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// UNIT TESTS: Voice Attendance Engine
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceAttendanceEngine } from '../engines/VoiceAttendanceEngine';

describe('VoiceAttendanceEngine', () => {
  let engine: VoiceAttendanceEngine;
  let mockDb: MockDatabase;
  let mockAiGateway: MockAIGateway;
  
  beforeEach(() => {
    mockDb = createMockDatabase();
    mockAiGateway = createMockAIGateway();
    engine = new VoiceAttendanceEngine(mockDb, mockAiGateway);
  });
  
  describe('Student Matching', () => {
    it('matches exact name', () => {
      const students = [
        { id: '1', name: 'Rahul Sharma', roll_number: 1, nicknames: [] },
        { id: '2', name: 'Priya Singh', roll_number: 2, nicknames: [] },
      ];
      engine.setStudents(students);
      
      const match = engine.findStudent('Rahul Sharma');
      
      expect(match).not.toBeNull();
      expect(match!.student.id).toBe('1');
      expect(match!.matchScore).toBe(1.0);
    });
    
    it('matches fuzzy name with typo', () => {
      const students = [
        { id: '1', name: 'Abhishek Kumar', roll_number: 1, nicknames: [] },
      ];
      engine.setStudents(students);
      
      // Common typo: Abhishek → Abhisek
      const match = engine.findStudent('Abhisek Kumar');
      
      expect(match).not.toBeNull();
      expect(match!.student.id).toBe('1');
      expect(match!.matchScore).toBeGreaterThan(0.8);
    });
    
    it('matches by roll number', () => {
      const students = [
        { id: '1', name: 'Rahul Sharma', roll_number: 5, nicknames: [] },
      ];
      engine.setStudents(students);
      
      const match = engine.findStudent('roll 5');
      
      expect(match).not.toBeNull();
      expect(match!.student.id).toBe('1');
      expect(match!.matchScore).toBe(1.0);
    });
    
    it('matches by number word', () => {
      const students = [
        { id: '1', name: 'Student One', roll_number: 1, nicknames: [] },
      ];
      engine.setStudents(students);
      
      const match = engine.findStudent('one');
      
      expect(match).not.toBeNull();
      expect(match!.student.roll_number).toBe(1);
    });
    
    it('matches by nickname', () => {
      const students = [
        { id: '1', name: 'Rajesh Kumar', roll_number: 1, nicknames: ['Raju', 'Raj'] },
      ];
      engine.setStudents(students);
      
      const match = engine.findStudent('Raju');
      
      expect(match).not.toBeNull();
      expect(match!.student.id).toBe('1');
      expect(match!.matchScore).toBe(1.0);
    });
    
    it('returns null for unmatched name', () => {
      const students = [
        { id: '1', name: 'Rahul Sharma', roll_number: 1, nicknames: [] },
      ];
      engine.setStudents(students);
      
      const match = engine.findStudent('Xyz Unknown');
      
      expect(match).toBeNull();
    });
    
    it('handles "mark all present except"', async () => {
      const students = [
        { id: '1', name: 'Rahul', roll_number: 1, nicknames: [] },
        { id: '2', name: 'Priya', roll_number: 2, nicknames: [] },
        { id: '3', name: 'Amit', roll_number: 3, nicknames: [] },
      ];
      engine.setStudents(students);
      
      await engine.markAllPresent(['Priya']);
      
      const attendance = engine.getAttendance();
      expect(attendance.get('1')).toBe('present');
      expect(attendance.get('2')).toBe('absent'); // Exception
      expect(attendance.get('3')).toBe('present');
    });
  });
  
  describe('Tool Call Processing', () => {
    it('processes mark_student_present tool call', async () => {
      const students = [
        { id: '1', name: 'Test Student', roll_number: 1, nicknames: [] },
      ];
      engine.setStudents(students);
      
      await engine.handleToolCall({
        name: 'mark_student_present',
        arguments: { student_identifier: 'Test Student', confidence: 0.95 }
      });
      
      const attendance = engine.getAttendance();
      expect(attendance.get('1')).toBe('present');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT TESTS: Sync Engine
// ═══════════════════════════════════════════════════════════════════════════

describe('SyncEngine', () => {
  describe('Conflict Resolution', () => {
    it('attendance: local wins over server', () => {
      const local = { status: 'present', updated_at: '2025-01-01T10:00:00Z' };
      const server = { status: 'absent', updated_at: '2025-01-01T10:01:00Z' };
      
      const resolution = syncEngine.resolveConflict('attendance_records', local, server);
      
      expect(resolution.strategy).toBe('local');
    });
    
    it('syllabus progress: higher progress wins', () => {
      const local = { status: 'in_progress' };
      const server = { status: 'completed' };
      
      const resolution = syncEngine.resolveConflict('syllabus_progress', local, server);
      
      expect(resolution.strategy).toBe('server'); // completed > in_progress
    });
    
    it('master data: server wins', () => {
      const local = { name: 'John Doe' };
      const server = { name: 'John D. Doe' };
      
      const resolution = syncEngine.resolveConflict('students', local, server);
      
      expect(resolution.strategy).toBe('server');
    });
  });
  
  describe('Write Queue', () => {
    it('coalesces multiple writes to same entity', async () => {
      await syncEngine.write('attendance_records', '123', 'created', { status: 'present' });
      await syncEngine.write('attendance_records', '123', 'updated', { status: 'absent' });
      
      const pending = await syncEngine.getPendingWrites();
      
      // Should have one write with final state
      expect(pending.length).toBe(1);
      expect(JSON.parse(pending[0].payload).status).toBe('absent');
    });
  });
});
```

### 2.3 AI Gateway Mock

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// AI GATEWAY TEST MOCK
// ═══════════════════════════════════════════════════════════════════════════

class MockAIGateway implements AIGatewayInterface {
  private responses: Map<string, GenerateResult> = new Map();
  
  // Set up deterministic responses for testing
  mockResponse(promptPattern: RegExp, response: GenerateResult): void {
    this.responses.set(promptPattern.source, response);
  }
  
  async generate(options: GenerateOptions): Promise<GenerateResult> {
    // Find matching mock
    for (const [pattern, response] of this.responses) {
      if (new RegExp(pattern).test(options.prompt)) {
        return response;
      }
    }
    
    // Default mock response
    return {
      text: 'Mock AI response',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      provider: 'mock',
      model: 'mock-model',
      durationMs: 100,
    };
  }
  
  async generateWithTools(options: GenerateWithToolsOptions): Promise<GenerateWithToolsResult> {
    // Return deterministic tool calls for testing
    if (options.prompt.includes('present')) {
      return {
        text: '',
        toolCalls: [{
          name: 'mark_student_present',
          arguments: { 
            student_identifier: this.extractName(options.prompt),
            confidence: 0.9 
          }
        }],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      };
    }
    
    return { text: '', toolCalls: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
  }
}

// Usage in tests
const mockGateway = new MockAIGateway();
mockGateway.mockResponse(
  /summarize the syllabus/i,
  { text: 'Chapter 1: Introduction...', usage: { ... } }
);
```

---

## 3. Voice Testing

### 3.1 Audio Mock System

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// VOICE TESTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

class VoiceTestHarness {
  private mockMediaStream: MediaStream;
  private mockSTT: MockSTTProvider;
  
  constructor() {
    this.setupMediaMocks();
  }
  
  private setupMediaMocks(): void {
    // Mock getUserMedia
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(this.mockMediaStream),
    } as any;
    
    // Mock AudioContext
    global.AudioContext = vi.fn().mockImplementation(() => ({
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
      }),
      createScriptProcessor: vi.fn().mockReturnValue({
        connect: vi.fn(),
        onaudioprocess: null,
      }),
      sampleRate: 16000,
    }));
  }
  
  // Simulate STT transcript events
  async simulateTranscript(text: string, isFinal: boolean = true): Promise<void> {
    this.mockSTT.emit('transcript', {
      text,
      isFinal,
      confidence: 0.95,
    });
    
    // Allow event handlers to process
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // Simulate a full voice attendance session
  async simulateAttendanceSession(commands: string[]): Promise<void> {
    for (const command of commands) {
      await this.simulateTranscript(command);
      await new Promise(resolve => setTimeout(resolve, 50)); // Realistic delay
    }
  }
}

// Test example
describe('Voice Attendance Integration', () => {
  let harness: VoiceTestHarness;
  let engine: VoiceAttendanceEngine;
  
  beforeEach(() => {
    harness = new VoiceTestHarness();
    engine = new VoiceAttendanceEngine(mockDb, mockAiGateway);
  });
  
  it('processes attendance commands from voice', async () => {
    await engine.start('section-123');
    
    await harness.simulateAttendanceSession([
      'Roll 1 present',
      'Roll 2 absent',
      'Everyone else is present',
    ]);
    
    const attendance = engine.getAttendance();
    expect(attendance.get('student-1')).toBe('present');
    expect(attendance.get('student-2')).toBe('absent');
  });
  
  it('handles noisy audio gracefully', async () => {
    await engine.start('section-123');
    
    // Simulate low-confidence transcript
    harness.mockSTT.emit('transcript', {
      text: 'Rah... pres...',
      isFinal: false,
      confidence: 0.3,
    });
    
    // Should not mark attendance on low confidence interim
    expect(engine.getAttendance().size).toBe(0);
  });
});
```

### 3.2 Audio Recording Fixtures

```typescript
// scripts/generate-voice-fixtures.ts
// Pre-record test audio for CI/CD

const testCases = [
  { filename: 'roll_1_present.wav', expected: { roll: 1, status: 'present' } },
  { filename: 'rahul_absent.wav', expected: { name: 'Rahul', status: 'absent' } },
  { filename: 'everyone_present.wav', expected: { all: true, status: 'present' } },
  { filename: 'noisy_classroom.wav', expected: { degraded: true } },
  { filename: 'hindi_english_mix.wav', expected: { roll: 5, status: 'present' } },
];

// In CI, these are loaded and sent through actual STT to verify accuracy
```

---

## 4. Offline Testing

### 4.1 Service Worker Simulation

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// OFFLINE TESTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

class OfflineTestHarness {
  private networkState: 'online' | 'offline' = 'online';
  
  setNetworkState(state: 'online' | 'offline'): void {
    this.networkState = state;
    
    // Dispatch browser events
    if (state === 'offline') {
      window.dispatchEvent(new Event('offline'));
    } else {
      window.dispatchEvent(new Event('online'));
    }
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: state === 'online',
      configurable: true,
    });
  }
  
  mockFetch(): void {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (this.networkState === 'offline') {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      // Delegate to actual fetch mock
      return this.originalFetch(url);
    });
  }
}

// Test examples
describe('Offline Behavior', () => {
  let harness: OfflineTestHarness;
  
  beforeEach(() => {
    harness = new OfflineTestHarness();
    harness.mockFetch();
  });
  
  it('queues writes when offline', async () => {
    harness.setNetworkState('offline');
    
    await syncEngine.write('attendance_records', '123', 'created', {
      status: 'present'
    });
    
    const pending = await syncEngine.getPendingWrites();
    expect(pending.length).toBe(1);
  });
  
  it('syncs pending writes when back online', async () => {
    harness.setNetworkState('offline');
    await syncEngine.write('attendance_records', '123', 'created', { status: 'present' });
    
    harness.setNetworkState('online');
    await syncEngine.triggerSync();
    
    const pending = await syncEngine.getPendingWrites();
    expect(pending.length).toBe(0);
  });
  
  it('works completely offline for core flows', async () => {
    harness.setNetworkState('offline');
    
    // Load cached data
    const students = await localDb.query('SELECT * FROM students WHERE section_id = ?', ['section-1']);
    expect(students.length).toBeGreaterThan(0);
    
    // Take attendance
    await attendanceEngine.markPresent('student-1');
    await attendanceEngine.markAbsent('student-2');
    await attendanceEngine.finalize();
    
    // Verify saved locally
    const session = await localDb.queryFirst('SELECT * FROM attendance_sessions ORDER BY created_at DESC');
    expect(session).not.toBeNull();
    expect(session.section_id).toBe('section-1');
  });
});
```

---

## 5. Integration Testing

### 5.1 Playwright E2E Tests

```typescript
// e2e/attendance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Attendance Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as teacher
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'teacher@example.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });
  
  test('manual attendance flow', async ({ page }) => {
    // Navigate to attendance
    await page.click('[data-testid="nav-attendance"]');
    await page.click('[data-testid="section-10A"]');
    
    // Mark some students
    await page.click('[data-testid="student-1-present"]');
    await page.click('[data-testid="student-2-absent"]');
    await page.click('[data-testid="student-3-present"]');
    
    // Submit
    await page.click('[data-testid="submit-attendance"]');
    
    // Verify confirmation
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="attendance-summary"]')).toContainText('2 present, 1 absent');
  });
  
  test('voice attendance flow', async ({ page }) => {
    // Mock microphone permissions
    await page.context().grantPermissions(['microphone']);
    
    await page.click('[data-testid="nav-attendance"]');
    await page.click('[data-testid="section-10A"]');
    await page.click('[data-testid="voice-attendance-button"]');
    
    // Verify voice UI
    await expect(page.locator('[data-testid="voice-indicator"]')).toBeVisible();
    
    // Simulate voice input (via test API)
    await page.evaluate(() => {
      window.postMessage({ type: 'SIMULATE_VOICE', transcript: 'Roll 1 present' }, '*');
    });
    
    // Verify UI update
    await expect(page.locator('[data-testid="student-1-status"]')).toHaveText('Present');
    
    // Stop voice and submit
    await page.click('[data-testid="stop-voice"]');
    await page.click('[data-testid="submit-attendance"]');
  });
  
  test('attendance works offline', async ({ page, context }) => {
    // Navigate to attendance
    await page.click('[data-testid="nav-attendance"]');
    await page.click('[data-testid="section-10A"]');
    
    // Go offline
    await context.setOffline(true);
    
    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Take attendance
    await page.click('[data-testid="student-1-present"]');
    await page.click('[data-testid="submit-attendance"]');
    
    // Should show "saved locally" message
    await expect(page.locator('[data-testid="saved-locally-toast"]')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Verify sync indicator
    await expect(page.locator('[data-testid="syncing-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="synced-indicator"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Multi-tenant Isolation', () => {
  test('teacher cannot see other school data', async ({ page }) => {
    // Login as School A teacher
    await loginAs(page, 'teacher-school-a@example.com');
    
    // Try to access School B data via URL manipulation
    await page.goto('/sections/school-b-section-1');
    
    // Should see 403 or redirect
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('not authorized');
  });
});
```

### 5.2 API Integration Tests

```typescript
// api-tests/attendance.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, seedTestData, cleanupTestData } from './helpers';

describe('Attendance API', () => {
  let client: TestClient;
  let testData: TestData;
  
  beforeAll(async () => {
    client = await createTestClient();
    testData = await seedTestData({
      school: true,
      sections: 2,
      studentsPerSection: 30,
      teacher: true,
    });
  });
  
  afterAll(async () => {
    await cleanupTestData(testData);
  });
  
  describe('POST /api/attendance/sessions', () => {
    it('creates session with records', async () => {
      const response = await client.post('/api/attendance/sessions', {
        sectionId: testData.sections[0].id,
        date: '2025-01-15',
        records: [
          { studentId: testData.students[0].id, status: 'present' },
          { studentId: testData.students[1].id, status: 'absent' },
        ],
      });
      
      expect(response.status).toBe(201);
      expect(response.body.session.id).toBeDefined();
      expect(response.body.session.recordCount).toBe(2);
    });
    
    it('rejects duplicate session for same date/section', async () => {
      // First session
      await client.post('/api/attendance/sessions', {
        sectionId: testData.sections[0].id,
        date: '2025-01-16',
        records: [{ studentId: testData.students[0].id, status: 'present' }],
      });
      
      // Duplicate
      const response = await client.post('/api/attendance/sessions', {
        sectionId: testData.sections[0].id,
        date: '2025-01-16',
        records: [{ studentId: testData.students[0].id, status: 'absent' }],
      });
      
      expect(response.status).toBe(409);
    });
    
    it('enforces RLS - cannot create for other school section', async () => {
      const otherSchoolSection = await createSectionInOtherSchool();
      
      const response = await client.post('/api/attendance/sessions', {
        sectionId: otherSchoolSection.id,
        date: '2025-01-17',
        records: [],
      });
      
      expect(response.status).toBe(403);
    });
  });
});
```

---

## 6. Load Testing

### 6.1 Load Test Scenarios

```typescript
// load-tests/scenarios.ts
import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 500 },   // Ramp up to 500
    { duration: '5m', target: 500 },   // Stay at 500
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};

export default function () {
  const token = loginAndGetToken();
  
  // Simulate teacher workflow
  const sections = getSections(token);
  
  for (const section of sections.slice(0, 2)) {
    // Load students
    const students = getStudents(token, section.id);
    check(students, {
      'got students': (r) => r.length > 0,
    });
    
    // Take attendance
    const records = students.map(s => ({
      studentId: s.id,
      status: Math.random() > 0.1 ? 'present' : 'absent',
    }));
    
    const response = http.post(
      `${BASE_URL}/api/attendance/sessions`,
      JSON.stringify({
        sectionId: section.id,
        date: new Date().toISOString().split('T')[0],
        records,
      }),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    check(response, {
      'attendance saved': (r) => r.status === 201,
    });
    
    sleep(1);
  }
}
```

### 6.2 Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Login** | <200ms | <500ms |
| **Load section students** | <100ms | <300ms |
| **Submit attendance (30 students)** | <300ms | <1000ms |
| **Voice STT latency** | <200ms | <500ms |
| **AI response (simple)** | <1000ms | <3000ms |
| **Sync push (100 writes)** | <500ms | <2000ms |
| **Dashboard load** | <500ms | <1500ms |
| **Concurrent users** | 500 | 1000 |

---

## 7. Observability

### 7.1 Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       OBSERVABILITY STACK                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         APPLICATION                                  │   │
│   │                                                                      │   │
│   │   Logs ─────────────►  Structured JSON ──────►  ┌─────────────┐     │   │
│   │                                                 │ Log Drain   │     │   │
│   │   Metrics ──────────►  OpenTelemetry ────────► │ (Vercel/    │     │   │
│   │                                                 │  Datadog)   │     │   │
│   │   Traces ───────────►  Distributed IDs ──────► │             │     │   │
│   │                                                 └──────┬──────┘     │   │
│   └─────────────────────────────────────────────────────────┬───────────┘   │
│                                                             │               │
│                                                             ▼               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      OBSERVABILITY PLATFORM                          │   │
│   │                                                                      │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│   │   │   Grafana    │  │   Datadog    │  │   Sentry     │             │   │
│   │   │   Dashboards │  │   APM        │  │   Errors     │             │   │
│   │   └──────────────┘  └──────────────┘  └──────────────┘             │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                      ALERTS                                  │   │   │
│   │   │                                                              │   │   │
│   │   │   • Error rate > 1% → Slack + PagerDuty                     │   │   │
│   │   │   • P95 latency > 1s → Slack                                │   │   │
│   │   │   • AI budget 80% → Email                                    │   │   │
│   │   │   • Sync failures > 10/min → PagerDuty                      │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Key Metrics

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// APPLICATION METRICS
// ═══════════════════════════════════════════════════════════════════════════

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('staffroom');

// Core business metrics
const attendanceSessionsCreated = meter.createCounter('attendance.sessions.created', {
  description: 'Number of attendance sessions created',
});

const voiceSessionDuration = meter.createHistogram('voice.session.duration_ms', {
  description: 'Duration of voice attendance sessions',
  boundaries: [1000, 5000, 10000, 30000, 60000],
});

const sttLatency = meter.createHistogram('stt.latency_ms', {
  description: 'Time from audio to transcript',
  boundaries: [100, 200, 300, 500, 1000],
});

const aiRequestDuration = meter.createHistogram('ai.request.duration_ms', {
  description: 'AI API call duration',
  boundaries: [500, 1000, 2000, 5000, 10000],
});

const aiTokensUsed = meter.createCounter('ai.tokens.used', {
  description: 'Total AI tokens consumed',
});

const syncOperations = meter.createCounter('sync.operations', {
  description: 'Sync operations by type and status',
});

const syncLatency = meter.createHistogram('sync.latency_ms', {
  description: 'Time for sync operations',
});

// Usage example
async function recordAttendanceSession(session: AttendanceSession): Promise<void> {
  const startTime = performance.now();
  
  try {
    await db.insert(session);
    
    attendanceSessionsCreated.add(1, {
      school_id: session.schoolId,
      method: session.method, // 'voice' | 'manual'
    });
    
    if (session.method === 'voice') {
      voiceSessionDuration.record(performance.now() - startTime, {
        student_count: session.recordCount,
      });
    }
  } catch (error) {
    metrics.createCounter('errors.total').add(1, {
      operation: 'attendance.create',
      error_type: error.name,
    });
    throw error;
  }
}
```

### 7.3 Structured Logging

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURED LOGGING
// ═══════════════════════════════════════════════════════════════════════════

import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'staffroom-api',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
});

// Request logging middleware
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  
  // Attach to request for correlation
  req.requestId = requestId;
  req.log = logger.child({
    requestId,
    userId: req.user?.id,
    schoolId: req.user?.schoolId,
    path: req.path,
    method: req.method,
  });
  
  res.on('finish', () => {
    const duration = performance.now() - startTime;
    
    req.log.info({
      status: res.statusCode,
      durationMs: duration,
      contentLength: res.get('content-length'),
    }, 'Request completed');
  });
  
  next();
}

// Usage in handlers
app.post('/api/attendance/sessions', async (req, res) => {
  req.log.info({ 
    sectionId: req.body.sectionId,
    recordCount: req.body.records.length 
  }, 'Creating attendance session');
  
  try {
    const session = await createAttendanceSession(req.body);
    
    req.log.info({ sessionId: session.id }, 'Attendance session created');
    res.status(201).json(session);
  } catch (error) {
    req.log.error({ error: error.message, stack: error.stack }, 'Failed to create session');
    throw error;
  }
});
```

---

## 8. Rollout Strategy

### 8.1 Phased Rollout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ROLLOUT PHASES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: INTERNAL ALPHA (Week 1-2)                                         │
│  ─────────────────────────────────────                                       │
│  • 5 internal test users                                                    │
│  • All features enabled                                                      │
│  • Bug fixing and UX iteration                                              │
│  • Success criteria: Core flows work without crashes                        │
│                                                                              │
│  PHASE 2: CLOSED BETA (Week 3-4)                                            │
│  ──────────────────────────────────                                          │
│  • 3 pilot schools (50 teachers)                                            │
│  • Feature flags for advanced features                                       │
│  • Daily check-ins with pilot users                                         │
│  • Success criteria: 80% daily active rate                                  │
│                                                                              │
│  PHASE 3: OPEN BETA (Week 5-6)                                              │
│  ─────────────────────────────────                                           │
│  • 20 schools (500 teachers)                                                │
│  • All core features enabled                                                │
│  • Gradual rollout (10% → 50% → 100%)                                      │
│  • Success criteria: <1% error rate, P95 <500ms                            │
│                                                                              │
│  PHASE 4: GENERAL AVAILABILITY (Week 7+)                                    │
│  ────────────────────────────────────────                                    │
│  • All schools                                                              │
│  • Marketing launch                                                          │
│  • 24/7 support readiness                                                   │
│  • Success criteria: Meeting SLOs                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Feature Flags

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// FEATURE FLAG CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const featureFlags = {
  // Core features (always on after beta)
  'attendance.manual': { enabled: true },
  'attendance.voice': { enabled: true, rollout: 1.0 },
  'syllabus.tracking': { enabled: true },
  
  // Gradual rollout features
  'ai.syllabus_suggestions': {
    enabled: true,
    rollout: 0.2, // 20% of users
    allowList: ['school-1', 'school-2'], // Always enabled for these
  },
  
  'voice.hinglish': {
    enabled: true,
    rollout: 0.1, // 10% of users
  },
  
  'offline.full': {
    enabled: true,
    rollout: 0.5, // 50% of users
  },
  
  // Experimental (internal only)
  'ai.auto_attendance': {
    enabled: false,
    internalOnly: true,
  },
};

function isFeatureEnabled(flagName: string, context: FeatureContext): boolean {
  const flag = featureFlags[flagName];
  if (!flag || !flag.enabled) return false;
  
  // Check allow list
  if (flag.allowList?.includes(context.schoolId)) return true;
  
  // Check internal only
  if (flag.internalOnly && !context.isInternalUser) return false;
  
  // Check rollout percentage (deterministic based on user ID)
  if (flag.rollout !== undefined) {
    const hash = hashUserId(context.userId);
    return hash < flag.rollout;
  }
  
  return true;
}
```

### 8.3 Rollback Procedure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ROLLBACK PROCEDURE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRIGGER CONDITIONS:                                                         │
│  • Error rate > 5% for 5 minutes                                            │
│  • P95 latency > 2 seconds for 10 minutes                                   │
│  • Critical security vulnerability discovered                               │
│  • Data corruption detected                                                 │
│                                                                              │
│  IMMEDIATE ACTIONS (< 5 minutes):                                           │
│  1. Revert Vercel deployment to previous version                           │
│  2. Disable affected feature flags                                          │
│  3. Notify on-call engineer                                                 │
│  4. Post status update                                                      │
│                                                                              │
│  INVESTIGATION (< 30 minutes):                                               │
│  1. Identify root cause from logs/metrics                                   │
│  2. Assess data impact                                                      │
│  3. Determine fix timeline                                                  │
│                                                                              │
│  COMMUNICATION:                                                              │
│  • Slack #incidents channel: Immediate                                      │
│  • Status page: Within 10 minutes                                           │
│  • Customer email: If downtime > 30 minutes                                 │
│                                                                              │
│  POST-MORTEM (within 48 hours):                                              │
│  1. Timeline of events                                                      │
│  2. Root cause analysis                                                     │
│  3. Action items to prevent recurrence                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Production Readiness Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  PRODUCTION READINESS CHECKLIST                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CODE QUALITY                                                                │
│  □ All tests passing (unit, integration, e2e)                               │
│  □ Code coverage > 80%                                                       │
│  □ No critical security vulnerabilities (npm audit)                         │
│  □ TypeScript strict mode, no any types in core                            │
│  □ Code review completed for all features                                   │
│                                                                              │
│  PERFORMANCE                                                                 │
│  □ Load testing completed for 500 concurrent users                         │
│  □ P95 latency under 500ms for core endpoints                              │
│  □ Voice latency under 200ms verified                                       │
│  □ Offline mode tested with 1000+ records                                   │
│  □ Sync tested with poor network (3G simulation)                           │
│                                                                              │
│  SECURITY                                                                    │
│  □ Penetration testing completed                                            │
│  □ RLS policies verified with test suite                                    │
│  □ No secrets in codebase                                                   │
│  □ Rate limiting configured                                                 │
│  □ OWASP Top 10 mitigated                                                   │
│                                                                              │
│  INFRASTRUCTURE                                                              │
│  □ Database backups configured (daily)                                      │
│  □ CDN configured for static assets                                         │
│  □ SSL certificates valid and auto-renewing                                │
│  □ DNS configured with low TTL for failover                                │
│  □ Environment variables set in production                                  │
│                                                                              │
│  OBSERVABILITY                                                               │
│  □ Logging to centralized platform                                          │
│  □ Metrics dashboards created                                               │
│  □ Alerting configured and tested                                           │
│  □ Error tracking (Sentry) configured                                       │
│  □ Uptime monitoring configured                                             │
│                                                                              │
│  OPERATIONS                                                                  │
│  □ Runbook documented                                                       │
│  □ On-call rotation established                                             │
│  □ Rollback procedure tested                                                │
│  □ Incident response process documented                                     │
│  □ Customer support trained                                                 │
│                                                                              │
│  COMPLIANCE                                                                  │
│  □ Privacy policy updated                                                   │
│  □ Terms of service updated                                                 │
│  □ Data retention policy implemented                                        │
│  □ GDPR/data deletion flow working                                          │
│  □ Consent flows for voice recording                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. SLOs and SLAs

| Metric | SLO Target | SLA Commitment |
|--------|------------|----------------|
| **Uptime** | 99.9% | 99.5% |
| **API Response Time (P95)** | <500ms | <1000ms |
| **Voice Latency (P95)** | <200ms | <500ms |
| **Data Sync Delay** | <1 minute | <5 minutes |
| **Error Rate** | <0.1% | <1% |
| **Incident Response** | <15 min | <30 min |
| **Data Recovery (RPO)** | 1 hour | 24 hours |
| **Recovery Time (RTO)** | 15 min | 4 hours |
