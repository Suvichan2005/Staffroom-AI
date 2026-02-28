# SECTION H — OFFLINE-FIRST ARCHITECTURE & SYNC

> **Purpose:** Define the complete offline-first strategy, sync protocols, and failure handling  
> **Format:** Architecture diagrams, pseudocode, edge case handling

---

## 1. Architectural Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OFFLINE-FIRST DATA ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                        BROWSER ENVIRONMENT                             │ │
│   │                                                                        │ │
│   │   ┌─────────────────────┐     ┌─────────────────────────────────────┐ │ │
│   │   │     React App       │     │        SQLite-WASM + OPFS           │ │ │
│   │   │   (Zustand Store)   │◄───►│    (Local Source of Truth)          │ │ │
│   │   └─────────────────────┘     └────────────────┬────────────────────┘ │ │
│   │                                                │                       │ │
│   │                                                │                       │ │
│   │   ┌────────────────────────────────────────────┼────────────────────┐ │ │
│   │   │                    SYNC ENGINE             │                    │ │ │
│   │   │                                            │                    │ │ │
│   │   │   ┌─────────────┐  ┌──────────────┐  ┌────┴─────┐             │ │ │
│   │   │   │ Write Queue │  │ Conflict     │  │ Event    │             │ │ │
│   │   │   │ (IndexedDB) │  │ Resolver     │  │ Log      │             │ │ │
│   │   │   └──────┬──────┘  └──────────────┘  └──────────┘             │ │ │
│   │   │          │                                                     │ │ │
│   │   └──────────┼─────────────────────────────────────────────────────┘ │ │
│   │              │                                                        │ │
│   └──────────────┼────────────────────────────────────────────────────────┘ │
│                  │                                                          │
│                  │ WebSocket / HTTP (when online)                           │
│                  │                                                          │
│   ┌──────────────┼────────────────────────────────────────────────────────┐ │
│   │              ▼                        SERVER                           │ │
│   │   ┌─────────────────┐     ┌─────────────────────────────────────────┐ │ │
│   │   │    Sync API     │     │              PostgreSQL                  │ │ │
│   │   │  (Edge Workers) │◄───►│    (Authoritative Source of Truth)      │ │ │
│   │   └─────────────────┘     └─────────────────────────────────────────┘ │ │
│   │                                                                        │ │
│   └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Local Database Schema

### 2.1 SQLite-WASM Setup

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// LOCAL DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

import { sqlite3Worker1Promiser } from '@aspect-build/aspect-cli';
// or use official sqlite-wasm package

export async function initLocalDatabase(): Promise<Database> {
  // Check for OPFS support
  if (!navigator.storage?.getDirectory) {
    throw new Error('OPFS not supported. Use Chrome 102+ or Edge 102+');
  }
  
  // Initialize SQLite with OPFS backend
  const sqlite3 = await initSqlite3({
    locateFile: (file) => `/wasm/${file}`,
  });
  
  const db = new sqlite3.oo1.OpfsDb('/staffroom.db', 'c');
  
  // Enable WAL mode for better concurrency
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA cache_size = -64000'); // 64MB cache
  db.exec('PRAGMA foreign_keys = ON');
  
  // Run migrations
  await runMigrations(db);
  
  return db;
}
```

### 2.2 Local Tables (Mirror + Sync Metadata)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- LOCAL SQLITE SCHEMA (Subset of server schema + sync metadata)
-- ═══════════════════════════════════════════════════════════════════════════

-- Sync metadata tables
CREATE TABLE IF NOT EXISTS _sync_state (
  entity_type TEXT PRIMARY KEY,
  last_sync_version INTEGER DEFAULT 0,
  last_sync_at TEXT,
  full_sync_required INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS _pending_writes (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'deleted')),
  payload TEXT NOT NULL, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  UNIQUE(entity_type, entity_id, event_type)
);

CREATE INDEX idx_pending_writes_created ON _pending_writes(created_at);

-- Conflict tracking
CREATE TABLE IF NOT EXISTS _conflicts (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  local_version TEXT NOT NULL, -- JSON of local state
  server_version TEXT NOT NULL, -- JSON of server state
  resolution TEXT, -- 'local', 'server', 'merged', or NULL if unresolved
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Local data tables (mirrors of server)
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  config TEXT, -- JSON
  _version INTEGER NOT NULL DEFAULT 1,
  _modified_locally INTEGER DEFAULT 0,
  _last_synced_at TEXT
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  name TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  _version INTEGER NOT NULL DEFAULT 1,
  _modified_locally INTEGER DEFAULT 0,
  _last_synced_at TEXT,
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  admission_number TEXT UNIQUE,
  nicknames TEXT, -- JSON array
  _version INTEGER NOT NULL DEFAULT 1,
  _modified_locally INTEGER DEFAULT 0,
  _last_synced_at TEXT,
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS section_students (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  roll_number INTEGER,
  joined_at TEXT NOT NULL,
  left_at TEXT,
  _version INTEGER NOT NULL DEFAULT 1,
  _modified_locally INTEGER DEFAULT 0,
  _last_synced_at TEXT,
  FOREIGN KEY (section_id) REFERENCES sections(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  taken_by_id TEXT NOT NULL,
  method TEXT NOT NULL,
  transcript TEXT,
  audio_url TEXT,
  _version INTEGER NOT NULL DEFAULT 1,
  _modified_locally INTEGER DEFAULT 0,
  _last_synced_at TEXT,
  _pending_upload INTEGER DEFAULT 0, -- For audio files
  FOREIGN KEY (section_id) REFERENCES sections(id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  confidence REAL,
  notes TEXT,
  _version INTEGER NOT NULL DEFAULT 1,
  _modified_locally INTEGER DEFAULT 0,
  _last_synced_at TEXT,
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS syllabus_topics (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  syllabus_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  start_page INTEGER,
  end_page INTEGER,
  _version INTEGER NOT NULL DEFAULT 1,
  _modified_locally INTEGER DEFAULT 0,
  _last_synced_at TEXT,
  FOREIGN KEY (syllabus_id) REFERENCES syllabi(id),
  FOREIGN KEY (parent_id) REFERENCES syllabus_topics(id)
);

CREATE TABLE IF NOT EXISTS syllabus_progress (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  marked_by_id TEXT NOT NULL,
  source TEXT NOT NULL,
  completed_at TEXT,
  notes TEXT,
  _version INTEGER NOT NULL DEFAULT 1,
  _modified_locally INTEGER DEFAULT 0,
  _last_synced_at TEXT,
  FOREIGN KEY (topic_id) REFERENCES syllabus_topics(id),
  FOREIGN KEY (section_id) REFERENCES sections(id)
);

-- Indexes for common queries
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_section_students_section ON section_students(section_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(date);
CREATE INDEX idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX idx_syllabus_progress_section ON syllabus_progress(section_id);
CREATE INDEX idx_pending_modified ON attendance_sessions(_modified_locally) 
  WHERE _modified_locally = 1;
```

---

## 3. Sync Engine Implementation

### 3.1 Write Queue (Outbox Pattern)

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// SYNC ENGINE - OUTBOX PATTERN IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

interface PendingWrite {
  id: string;
  entityType: string;
  entityId: string;
  eventType: 'created' | 'updated' | 'deleted';
  payload: Record<string, any>;
  createdAt: Date;
  retryCount: number;
  lastError?: string;
}

class SyncEngine {
  private db: Database;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private syncInterval: number = 30000; // 30 seconds
  
  constructor(db: Database) {
    this.db = db;
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // WRITE OPERATIONS (Always local-first)
  // ─────────────────────────────────────────────────────────────────────────
  
  async write<T extends Record<string, any>>(
    entityType: string,
    entityId: string,
    eventType: 'created' | 'updated' | 'deleted',
    data: T
  ): Promise<void> {
    const writeId = crypto.randomUUID();
    
    await this.db.transaction(async (tx) => {
      // 1. Apply write to local table
      if (eventType === 'created') {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        await tx.execute(
          `INSERT INTO ${entityType} (${columns}, _version, _modified_locally)
           VALUES (${placeholders}, 1, 1)`,
          Object.values(data)
        );
      } else if (eventType === 'updated') {
        const setClause = Object.keys(data)
          .filter(k => k !== 'id')
          .map(k => `${k} = ?`)
          .join(', ');
        await tx.execute(
          `UPDATE ${entityType} 
           SET ${setClause}, _version = _version + 1, _modified_locally = 1
           WHERE id = ?`,
          [...Object.values(data).filter((_, i) => Object.keys(data)[i] !== 'id'), entityId]
        );
      } else if (eventType === 'deleted') {
        await tx.execute(`DELETE FROM ${entityType} WHERE id = ?`, [entityId]);
      }
      
      // 2. Add to pending writes queue (upsert to coalesce multiple writes)
      await tx.execute(
        `INSERT INTO _pending_writes (id, entity_type, entity_id, event_type, payload, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT (entity_type, entity_id, event_type) DO UPDATE SET
           payload = EXCLUDED.payload,
           created_at = EXCLUDED.created_at,
           retry_count = 0,
           last_error = NULL`,
        [writeId, entityType, entityId, eventType, JSON.stringify(data)]
      );
    });
    
    // 3. Trigger immediate sync attempt if online
    if (this.isOnline && !this.syncInProgress) {
      this.triggerSync();
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // SYNC PUSH (Local → Server)
  // ─────────────────────────────────────────────────────────────────────────
  
  async pushChanges(): Promise<SyncPushResult> {
    const pendingWrites = await this.db.query<PendingWrite>(
      `SELECT * FROM _pending_writes 
       ORDER BY created_at ASC 
       LIMIT 100`
    );
    
    if (pendingWrites.length === 0) {
      return { pushed: 0, failed: 0, conflicts: [] };
    }
    
    const results: SyncPushResult = { pushed: 0, failed: 0, conflicts: [] };
    
    // Group by entity for batching
    const batches = this.groupByEntity(pendingWrites);
    
    for (const batch of batches) {
      try {
        const response = await fetch('/api/sync/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
          body: JSON.stringify({
            writes: batch.map(w => ({
              entityType: w.entityType,
              entityId: w.entityId,
              eventType: w.eventType,
              payload: JSON.parse(w.payload),
              clientTimestamp: w.createdAt
            }))
          })
        });
        
        if (!response.ok) {
          throw new SyncError(`Push failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        for (const item of result.items) {
          if (item.status === 'success') {
            // Remove from pending queue
            await this.db.execute(
              `DELETE FROM _pending_writes WHERE id = ?`,
              [batch.find(b => b.entityId === item.entityId)!.id]
            );
            
            // Update local version and clear modified flag
            await this.db.execute(
              `UPDATE ${item.entityType} 
               SET _version = ?, _modified_locally = 0, _last_synced_at = datetime('now')
               WHERE id = ?`,
              [item.newVersion, item.entityId]
            );
            
            results.pushed++;
          } else if (item.status === 'conflict') {
            // Handle conflict
            await this.handleConflict(item, batch.find(b => b.entityId === item.entityId)!);
            results.conflicts.push({
              entityType: item.entityType,
              entityId: item.entityId,
              resolution: item.resolution
            });
          } else {
            // Permanent failure
            await this.db.execute(
              `UPDATE _pending_writes 
               SET retry_count = retry_count + 1, last_error = ?
               WHERE id = ?`,
              [item.error, batch.find(b => b.entityId === item.entityId)!.id]
            );
            results.failed++;
          }
        }
      } catch (error) {
        // Network error - increment retry count
        for (const write of batch) {
          await this.db.execute(
            `UPDATE _pending_writes 
             SET retry_count = retry_count + 1, last_error = ?
             WHERE id = ?`,
            [error.message, write.id]
          );
        }
        results.failed += batch.length;
      }
    }
    
    return results;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // SYNC PULL (Server → Local)
  // ─────────────────────────────────────────────────────────────────────────
  
  async pullChanges(): Promise<SyncPullResult> {
    const results: SyncPullResult = { pulled: 0, entities: {} };
    
    // Get last sync versions for each entity type
    const syncStates = await this.db.query(
      `SELECT entity_type, last_sync_version FROM _sync_state`
    );
    const versionMap = new Map(syncStates.map(s => [s.entity_type, s.last_sync_version]));
    
    // Determine which entities need sync
    const entitiesToSync = ['students', 'sections', 'section_students', 'syllabi', 'syllabus_topics'];
    
    for (const entityType of entitiesToSync) {
      const lastVersion = versionMap.get(entityType) ?? 0;
      
      try {
        const response = await fetch(`/api/sync/pull/${entityType}?since=${lastVersion}`, {
          headers: {
            'Authorization': `Bearer ${await this.getAuthToken()}`
          }
        });
        
        if (!response.ok) {
          throw new SyncError(`Pull failed for ${entityType}: ${response.status}`);
        }
        
        const { changes, maxVersion } = await response.json();
        
        await this.db.transaction(async (tx) => {
          for (const change of changes) {
            // Skip if we have a local pending write for this entity
            const hasPending = await tx.queryFirst(
              `SELECT 1 FROM _pending_writes 
               WHERE entity_type = ? AND entity_id = ?`,
              [entityType, change.id]
            );
            
            if (hasPending) {
              // Local change takes precedence, will be resolved on push
              continue;
            }
            
            // Apply server change
            if (change._deleted) {
              await tx.execute(`DELETE FROM ${entityType} WHERE id = ?`, [change.id]);
            } else {
              await this.upsertEntity(tx, entityType, change);
            }
            
            results.pulled++;
          }
          
          // Update sync state
          await tx.execute(
            `INSERT INTO _sync_state (entity_type, last_sync_version, last_sync_at)
             VALUES (?, ?, datetime('now'))
             ON CONFLICT (entity_type) DO UPDATE SET
               last_sync_version = EXCLUDED.last_sync_version,
               last_sync_at = EXCLUDED.last_sync_at`,
            [entityType, maxVersion]
          );
        });
        
        results.entities[entityType] = changes.length;
      } catch (error) {
        console.error(`Pull failed for ${entityType}:`, error);
        // Continue with other entities
      }
    }
    
    return results;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONFLICT RESOLUTION
  // ─────────────────────────────────────────────────────────────────────────
  
  private async handleConflict(serverResult: ConflictResult, localWrite: PendingWrite): Promise<void> {
    const localData = JSON.parse(localWrite.payload);
    const serverData = serverResult.serverVersion;
    
    // Default resolution strategy by entity type
    const resolution = this.resolveConflict(
      localWrite.entityType,
      localData,
      serverData
    );
    
    // Save conflict for audit
    await this.db.execute(
      `INSERT INTO _conflicts (id, entity_type, entity_id, local_version, server_version, resolution, resolved_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        crypto.randomUUID(),
        localWrite.entityType,
        localWrite.entityId,
        JSON.stringify(localData),
        JSON.stringify(serverData),
        resolution.strategy
      ]
    );
    
    // Apply resolution
    if (resolution.strategy === 'server') {
      // Accept server version
      await this.upsertEntity(this.db, localWrite.entityType, serverData);
      await this.db.execute(`DELETE FROM _pending_writes WHERE id = ?`, [localWrite.id]);
    } else if (resolution.strategy === 'local') {
      // Keep local version, re-push with force
      // This will be retried on next sync
    } else if (resolution.strategy === 'merge') {
      // Apply merged version
      await this.upsertEntity(this.db, localWrite.entityType, resolution.mergedData);
      await this.db.execute(
        `UPDATE _pending_writes SET payload = ? WHERE id = ?`,
        [JSON.stringify(resolution.mergedData), localWrite.id]
      );
    }
  }
  
  private resolveConflict(
    entityType: string,
    local: Record<string, any>,
    server: Record<string, any>
  ): ConflictResolution {
    // Entity-specific resolution strategies
    switch (entityType) {
      case 'attendance_records':
        // Attendance: Local wins (teacher's live input is authoritative)
        return { strategy: 'local' };
        
      case 'syllabus_progress':
        // Progress: Use highest progress state
        const progressOrder = ['not_started', 'in_progress', 'completed', 'skipped'];
        const localIdx = progressOrder.indexOf(local.status);
        const serverIdx = progressOrder.indexOf(server.status);
        if (localIdx >= serverIdx) {
          return { strategy: 'local' };
        }
        return { strategy: 'server' };
        
      case 'students':
      case 'sections':
        // Master data: Server wins (admin-controlled)
        return { strategy: 'server' };
        
      default:
        // Default: Last-write-wins based on timestamp
        if (new Date(local.updated_at) > new Date(server.updated_at)) {
          return { strategy: 'local' };
        }
        return { strategy: 'server' };
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // FULL SYNC (Initial or Recovery)
  // ─────────────────────────────────────────────────────────────────────────
  
  async fullSync(): Promise<void> {
    this.emit('syncStarted', { type: 'full' });
    
    const entitiesToSync = [
      'organizations',
      'schools',
      'academic_years',
      'sections',
      'students',
      'section_students',
      'users',
      'subjects',
      'syllabi',
      'syllabus_topics',
      'teaching_assignments'
    ];
    
    for (const entityType of entitiesToSync) {
      this.emit('syncProgress', { entity: entityType, status: 'downloading' });
      
      let cursor: string | null = null;
      
      do {
        const response = await fetch(
          `/api/sync/full/${entityType}?cursor=${cursor ?? ''}`,
          {
            headers: { 'Authorization': `Bearer ${await this.getAuthToken()}` }
          }
        );
        
        const { data, nextCursor, total } = await response.json();
        
        await this.db.transaction(async (tx) => {
          for (const item of data) {
            await this.upsertEntity(tx, entityType, item);
          }
        });
        
        cursor = nextCursor;
        this.emit('syncProgress', { 
          entity: entityType, 
          status: 'downloading',
          progress: (total - (cursor ? data.length : 0)) / total
        });
      } while (cursor);
      
      // Mark as synced
      await this.db.execute(
        `INSERT INTO _sync_state (entity_type, full_sync_required, last_sync_at)
         VALUES (?, 0, datetime('now'))
         ON CONFLICT (entity_type) DO UPDATE SET
           full_sync_required = 0,
           last_sync_at = EXCLUDED.last_sync_at`,
        [entityType]
      );
    }
    
    this.emit('syncCompleted', { type: 'full' });
  }
}
```

---

## 4. Network State Management

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// NETWORK STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

class NetworkStateManager {
  private isOnline: boolean = navigator.onLine;
  private lastOnlineAt: Date | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectDelay: number = 60000; // 1 minute max
  
  constructor() {
    this.setupListeners();
  }
  
  private setupListeners(): void {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Also monitor actual connectivity, not just network state
    this.startConnectivityCheck();
  }
  
  private handleOnline(): void {
    this.isOnline = true;
    this.lastOnlineAt = new Date();
    this.reconnectAttempts = 0;
    
    this.emit('online', { 
      wasOfflineFor: this.getOfflineDuration()
    });
    
    // Trigger immediate sync
    syncEngine.triggerSync();
  }
  
  private handleOffline(): void {
    this.isOnline = false;
    
    this.emit('offline', {
      pendingWrites: syncEngine.getPendingWriteCount()
    });
    
    // Show user-friendly notification
    this.showOfflineIndicator();
  }
  
  private async startConnectivityCheck(): Promise<void> {
    // Periodic ping to detect false positives
    setInterval(async () => {
      if (navigator.onLine) {
        try {
          const response = await fetch('/api/health', {
            method: 'HEAD',
            cache: 'no-store'
          });
          
          if (!response.ok && this.isOnline) {
            // Browser thinks we're online but server is unreachable
            this.handleOffline();
          } else if (response.ok && !this.isOnline) {
            // We're actually online
            this.handleOnline();
          }
        } catch {
          if (this.isOnline) {
            this.handleOffline();
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }
}
```

---

## 5. User Experience During Offline/Sync

### 5.1 UI Indicators

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// SYNC STATUS UI COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function SyncStatusIndicator() {
  const { isOnline, isSyncing, pendingCount, lastSyncAt, conflicts } = useSyncStatus();
  
  if (!isOnline) {
    return (
      <StatusBadge variant="warning" icon={<OfflineIcon />}>
        Offline • {pendingCount} changes queued
        <Tooltip>
          Your changes are saved locally and will sync when you're back online.
        </Tooltip>
      </StatusBadge>
    );
  }
  
  if (isSyncing) {
    return (
      <StatusBadge variant="info" icon={<SyncingIcon className="animate-spin" />}>
        Syncing...
      </StatusBadge>
    );
  }
  
  if (conflicts.length > 0) {
    return (
      <StatusBadge variant="error" icon={<AlertIcon />} onClick={openConflictResolver}>
        {conflicts.length} conflicts need review
      </StatusBadge>
    );
  }
  
  if (pendingCount > 0) {
    return (
      <StatusBadge variant="warning" icon={<PendingIcon />}>
        {pendingCount} changes pending
      </StatusBadge>
    );
  }
  
  return (
    <StatusBadge variant="success" icon={<CheckIcon />}>
      Synced • {formatRelativeTime(lastSyncAt)}
    </StatusBadge>
  );
}
```

### 5.2 Optimistic Updates

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// OPTIMISTIC UPDATE PATTERN
// ═══════════════════════════════════════════════════════════════════════════

function useAttendance(sessionId: string) {
  const queryClient = useQueryClient();
  
  const markAttendance = useMutation({
    mutationFn: async ({ studentId, status }: MarkAttendanceInput) => {
      // This writes to local SQLite immediately
      await syncEngine.write('attendance_records', crypto.randomUUID(), 'created', {
        id: crypto.randomUUID(),
        session_id: sessionId,
        student_id: studentId,
        status,
        school_id: currentSchoolId
      });
    },
    
    // Optimistic update before mutation completes
    onMutate: async ({ studentId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['attendance', sessionId] });
      
      // Snapshot previous value
      const previousAttendance = queryClient.getQueryData(['attendance', sessionId]);
      
      // Optimistically update
      queryClient.setQueryData(['attendance', sessionId], (old: AttendanceRecord[]) => 
        old.map(record => 
          record.student_id === studentId 
            ? { ...record, status, _pending: true }
            : record
        )
      );
      
      return { previousAttendance };
    },
    
    // If mutation fails, roll back
    onError: (err, variables, context) => {
      queryClient.setQueryData(['attendance', sessionId], context?.previousAttendance);
      toast.error('Failed to save attendance. Will retry.');
    },
    
    // Always refetch after error or success
    onSettled: () => {
      // Don't refetch - local DB is source of truth
      // queryClient.invalidateQueries({ queryKey: ['attendance', sessionId] });
    }
  });
  
  return { markAttendance };
}
```

---

## 6. Failure Mode Handling

### 6.1 Failure Categories & Recovery

| Failure Type | Detection | User Impact | Recovery |
|--------------|-----------|-------------|----------|
| **Network offline** | `navigator.onLine` + ping | Full offline capability | Auto-sync on reconnect |
| **Server 5xx** | HTTP response | Retry with backoff | Exponential backoff |
| **Auth expired** | 401 response | Prompt re-auth | Refresh token, re-queue |
| **Version conflict** | 409 response | May need review | Auto-resolve or UI |
| **Quota exceeded** | 429 response | Throttled | Rate limit sync |
| **Data corruption** | Checksum mismatch | Alert + rebuild | Re-download entity |
| **IndexedDB full** | QuotaExceeded | Clear old data | Prune old sync logs |

### 6.2 Retry Strategy

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// EXPONENTIAL BACKOFF WITH JITTER
// ═══════════════════════════════════════════════════════════════════════════

class RetryStrategy {
  private baseDelay: number = 1000; // 1 second
  private maxDelay: number = 60000; // 1 minute
  private maxRetries: number = 10;
  
  getDelay(retryCount: number): number {
    if (retryCount >= this.maxRetries) {
      return -1; // Give up
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s...
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, retryCount),
      this.maxDelay
    );
    
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    
    return exponentialDelay + jitter;
  }
  
  shouldRetry(error: Error, retryCount: number): boolean {
    if (retryCount >= this.maxRetries) return false;
    
    // Don't retry client errors (except rate limiting)
    if (error instanceof HttpError) {
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        return false;
      }
    }
    
    return true;
  }
}
```

---

## 7. Data Integrity Guarantees

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA INTEGRITY GUARANTEES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. DURABILITY                                                              │
│  ─────────────                                                              │
│  • All writes persist to SQLite WAL before returning                        │
│  • SQLite OPFS survives browser crashes                                     │
│  • Pending writes queue survives page refresh                               │
│                                                                              │
│  2. ORDERING                                                                │
│  ──────────                                                                  │
│  • Writes from same client maintain order                                   │
│  • Server applies writes in client timestamp order                          │
│  • Version numbers detect out-of-order delivery                             │
│                                                                              │
│  3. IDEMPOTENCY                                                             │
│  ────────────                                                                │
│  • Each write has unique ID                                                 │
│  • Server deduplicates by (entity_id, event_type) key                      │
│  • Replaying queue is safe                                                  │
│                                                                              │
│  4. ATOMICITY                                                               │
│  ───────────                                                                 │
│  • Multi-record operations use transactions                                 │
│  • Partial sync failures don't corrupt local DB                            │
│  • Attendance session + records saved atomically                           │
│                                                                              │
│  5. EVENTUAL CONSISTENCY                                                    │
│  ───────────────────────                                                     │
│  • All clients converge to same state                                       │
│  • Conflicts resolved deterministically                                     │
│  • Audit log preserves all versions                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Performance Considerations

| Metric | Target | Implementation |
|--------|--------|----------------|
| **Write latency** | <10ms | SQLite WAL mode, in-memory journal |
| **Sync batch size** | 100 items | Batched API calls |
| **Sync frequency** | 30s periodic + on-change | Debounced triggers |
| **Initial sync** | <30s for 10k students | Paginated, parallel downloads |
| **Storage overhead** | <20% | Prune old sync logs weekly |
| **Conflict rate** | <0.1% | Optimistic locking |
