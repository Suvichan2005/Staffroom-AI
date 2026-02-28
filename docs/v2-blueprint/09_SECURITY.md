# SECTION I — SECURITY & MULTI-TENANT ISOLATION

> **Purpose:** Define security architecture, tenant isolation, and audit mechanisms  
> **Format:** Threat model, implementation patterns, audit requirements

---

## 1. Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SECURITY ARCHITECTURE LAYERS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         LAYER 1: EDGE PROTECTION                        ││
│  │  • Cloudflare/Vercel WAF                                                ││
│  │  • DDoS protection                                                      ││
│  │  • Rate limiting (10 req/s per IP for auth endpoints)                  ││
│  │  • Bot detection                                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                       LAYER 2: AUTHENTICATION                           ││
│  │  • Firebase Auth / Auth.js                                              ││
│  │  • JWT tokens with short expiry (15 min)                               ││
│  │  • Refresh token rotation                                               ││
│  │  • MFA optional (required for admin roles)                             ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                       LAYER 3: AUTHORIZATION                            ││
│  │  • Role-based access control (RBAC)                                     ││
│  │  • School-scoped permissions                                            ││
│  │  • Resource-level checks in API                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    LAYER 4: DATA ISOLATION (RLS)                        ││
│  │  • PostgreSQL Row-Level Security                                        ││
│  │  • Tenant context in every query                                        ││
│  │  • No cross-tenant data access possible                                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    LAYER 5: DATA PROTECTION                             ││
│  │  • Encryption at rest (AES-256)                                         ││
│  │  • Encryption in transit (TLS 1.3)                                      ││
│  │  • PII field-level encryption                                           ││
│  │  • Secure key management (AWS KMS / GCP KMS)                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         LAYER 6: AUDIT                                  ││
│  │  • All data modifications logged                                        ││
│  │  • Authentication events logged                                         ││
│  │  • Admin actions logged with reason                                     ││
│  │  • Immutable audit trail (append-only)                                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Threat Model

### 2.1 Assets to Protect

| Asset | Sensitivity | Impact if Compromised |
|-------|-------------|----------------------|
| **Student PII** | 🔴 Critical | Legal liability, trust loss |
| **Attendance Records** | 🟠 High | Academic fraud, litigation |
| **Teacher Credentials** | 🔴 Critical | Account takeover |
| **Voice Recordings** | 🟠 High | Privacy violation |
| **Syllabus Data** | 🟡 Medium | Competitive intelligence |
| **API Keys** | 🔴 Critical | Service abuse, cost |

### 2.2 Threat Actors

| Actor | Motivation | Capability | Mitigations |
|-------|------------|------------|-------------|
| **Curious Student** | View grades, change attendance | Low | RBAC, session isolation |
| **Malicious Teacher** | Access other schools | Medium | RLS, tenant isolation |
| **External Attacker** | Data theft, ransomware | High | WAF, encryption, backups |
| **Insider (Admin)** | Data export, sabotage | High | Audit logs, least privilege |

### 2.3 Attack Vectors

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ATTACK VECTORS & MITIGATIONS                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  VECTOR 1: Client-Side API Key Exposure                                     │
│  ───────────────────────────────────────                                    │
│  Risk: API keys in JavaScript bundle accessible to anyone                   │
│  Impact: Unlimited AI API usage, cost explosion                             │
│  Mitigation: ✅ All AI calls proxied through backend                        │
│              ✅ Keys stored in server-side environment only                 │
│              ✅ Per-user rate limiting at proxy layer                       │
│                                                                              │
│  VECTOR 2: Cross-Tenant Data Access                                         │
│  ─────────────────────────────────────                                      │
│  Risk: Teacher in School A accesses School B data                          │
│  Impact: Privacy breach, trust loss                                         │
│  Mitigation: ✅ RLS policies enforce school_id on ALL queries              │
│              ✅ Tenant context set from JWT, not request                    │
│              ✅ No API endpoint accepts school_id as parameter              │
│                                                                              │
│  VECTOR 3: Session Hijacking                                                │
│  ───────────────────────────                                                │
│  Risk: Stolen JWT used to impersonate user                                 │
│  Impact: Unauthorized data access                                           │
│  Mitigation: ✅ Short JWT expiry (15 min)                                   │
│              ✅ Refresh token rotation                                      │
│              ✅ Device fingerprinting (optional)                            │
│              ✅ Suspicious activity detection                               │
│                                                                              │
│  VECTOR 4: Privilege Escalation                                             │
│  ─────────────────────────────                                              │
│  Risk: Teacher modifies their role to admin                                │
│  Impact: Full system access                                                 │
│  Mitigation: ✅ Role changes require admin + audit log entry               │
│              ✅ Role stored server-side, not in JWT claims                 │
│              ✅ Separate admin auth flow                                    │
│                                                                              │
│  VECTOR 5: SQL Injection                                                    │
│  ───────────────────────────                                                │
│  Risk: Malicious input in queries                                          │
│  Impact: Data theft, modification                                           │
│  Mitigation: ✅ Parameterized queries only (ORM enforced)                  │
│              ✅ Input validation at API layer                               │
│              ✅ WAF SQL injection rules                                     │
│                                                                              │
│  VECTOR 6: Voice Recording Privacy                                          │
│  ─────────────────────────────────                                          │
│  Risk: Unauthorized access to classroom audio                               │
│  Impact: Privacy violation, legal issues                                    │
│  Mitigation: ✅ Audio stored encrypted at rest                             │
│              ✅ Transcripts retained, audio deleted after 30 days          │
│              ✅ Access logged in audit trail                               │
│              ✅ Clear consent flow for voice features                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Authentication Implementation

### 3.1 JWT Token Structure

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// JWT TOKEN STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

interface AccessTokenPayload {
  // Standard claims
  sub: string;        // User ID
  iat: number;        // Issued at
  exp: number;        // Expiry (15 minutes from iat)
  jti: string;        // JWT ID (for revocation)
  
  // Custom claims
  orgId: string;      // Organization ID
  schoolId: string;   // Current school context
  email: string;      // For display
  role: UserRole;     // Cached role (verified server-side)
  
  // DO NOT include in JWT:
  // - Full permissions list (fetch from DB)
  // - Sensitive PII
  // - Any modifiable data
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;        // 7 days
  family: string;     // Token family for rotation
}
```

### 3.2 Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TOKEN REFRESH FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Client detects access token expiring (< 1 min remaining)                │
│                         │                                                    │
│                         ▼                                                    │
│  2. POST /api/auth/refresh { refreshToken }                                 │
│                         │                                                    │
│                         ▼                                                    │
│  3. Server validates:                                                        │
│     • Token signature ✓                                                      │
│     • Token not expired ✓                                                    │
│     • Token not revoked ✓                                                    │
│     • Token family not invalidated ✓                                        │
│                         │                                                    │
│           ┌─────────────┴─────────────┐                                     │
│           │                           │                                     │
│      [Valid]                    [Invalid]                                   │
│           │                           │                                     │
│           ▼                           ▼                                     │
│  4a. Generate new tokens      4b. Clear all tokens                          │
│      • New access token           • Invalidate token family                 │
│      • Rotate refresh token       • Force re-login                         │
│      • Invalidate old refresh     • Log security event                     │
│                         │                                                    │
│                         ▼                                                    │
│  5. Return { accessToken, refreshToken }                                    │
│                                                                              │
│  REFRESH TOKEN ROTATION:                                                    │
│  Each refresh invalidates the previous refresh token.                       │
│  If an old refresh token is used → entire family revoked → force re-login   │
│  This detects token theft.                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Session Management

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

class SessionManager {
  // Token family tracking (in Redis or PostgreSQL)
  private async validateRefreshToken(token: string): Promise<TokenValidation> {
    const payload = jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
    
    // Check if token family is valid
    const family = await redis.get(`token_family:${payload.family}`);
    if (!family) {
      // Family revoked - possible token theft
      await this.logSecurityEvent(payload.sub, 'REVOKED_FAMILY_ACCESS');
      throw new UnauthorizedError('Session revoked');
    }
    
    // Check if this specific token is the current one
    const currentJti = await redis.get(`token_current:${payload.family}`);
    if (currentJti !== payload.jti) {
      // Old token reuse detected - revoke entire family
      await redis.del(`token_family:${payload.family}`);
      await this.logSecurityEvent(payload.sub, 'TOKEN_REUSE_DETECTED');
      throw new UnauthorizedError('Token reuse detected. Please log in again.');
    }
    
    return { valid: true, payload };
  }
  
  async rotateRefreshToken(oldToken: RefreshTokenPayload): Promise<TokenPair> {
    const newRefreshJti = crypto.randomUUID();
    
    // Generate new tokens
    const accessToken = jwt.sign(
      { sub: oldToken.sub, /* ... */ },
      ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { sub: oldToken.sub, family: oldToken.family, jti: newRefreshJti },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update current token pointer
    await redis.set(
      `token_current:${oldToken.family}`,
      newRefreshJti,
      'EX',
      7 * 24 * 60 * 60 // 7 days
    );
    
    return { accessToken, refreshToken };
  }
  
  async revokeAllSessions(userId: string): Promise<void> {
    // Find all token families for user
    const families = await db.query(
      'SELECT family FROM token_families WHERE user_id = ?',
      [userId]
    );
    
    // Revoke all
    for (const { family } of families) {
      await redis.del(`token_family:${family}`);
      await redis.del(`token_current:${family}`);
    }
    
    await this.logSecurityEvent(userId, 'ALL_SESSIONS_REVOKED');
  }
}
```

---

## 4. Role-Based Access Control (RBAC)

### 4.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ROLE HIERARCHY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                          ┌──────────────┐                                   │
│                          │  SUPER_ADMIN │  (Staffroom Platform)             │
│                          │              │                                    │
│                          │  • All orgs  │                                   │
│                          │  • All data  │                                   │
│                          └──────┬───────┘                                   │
│                                 │                                           │
│                    ┌────────────┴────────────┐                              │
│                    │                         │                              │
│              ┌─────┴─────┐            ┌──────┴──────┐                       │
│              │ ORG_ADMIN │            │ ORG_ADMIN   │                       │
│              │ (Org A)   │            │ (Org B)     │                       │
│              │           │            │             │                        │
│              │ • All     │            │ • All       │                        │
│              │   schools │            │   schools   │                        │
│              └─────┬─────┘            └─────────────┘                       │
│                    │                                                        │
│       ┌────────────┼────────────┐                                          │
│       │            │            │                                          │
│ ┌─────┴─────┐┌─────┴─────┐┌─────┴─────┐                                    │
│ │SCHOOL_ADMIN│SCHOOL_ADMIN│SCHOOL_ADMIN│                                   │
│ │(School 1) ││(School 2) ││(School 3) │                                   │
│ │           ││           ││           │                                    │
│ │• All staff││• All staff││• All staff│                                    │
│ │• Settings ││• Settings ││• Settings │                                    │
│ └─────┬─────┘└───────────┘└───────────┘                                    │
│       │                                                                     │
│  ┌────┴────┐                                                               │
│  │         │                                                               │
│  ▼         ▼                                                               │
│ ┌───┐   ┌─────────┐                                                        │
│ │HOD│   │ TEACHER │                                                        │
│ │   │   │         │                                                        │
│ │Dept│   │• Own    │                                                       │
│ │view│   │ sections│                                                       │
│ └───┘   └─────────┘                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Permission Matrix

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

enum Permission {
  // Attendance
  ATTENDANCE_VIEW_OWN = 'attendance:view:own',
  ATTENDANCE_VIEW_SECTION = 'attendance:view:section',
  ATTENDANCE_VIEW_ALL = 'attendance:view:all',
  ATTENDANCE_MARK = 'attendance:mark',
  ATTENDANCE_EDIT = 'attendance:edit',
  
  // Syllabus
  SYLLABUS_VIEW = 'syllabus:view',
  SYLLABUS_UPDATE = 'syllabus:update',
  SYLLABUS_CREATE = 'syllabus:create',
  
  // Students
  STUDENT_VIEW = 'student:view',
  STUDENT_CREATE = 'student:create',
  STUDENT_EDIT = 'student:edit',
  STUDENT_DELETE = 'student:delete',
  
  // Substitutions
  SUBSTITUTION_REQUEST = 'substitution:request',
  SUBSTITUTION_APPROVE = 'substitution:approve',
  
  // Admin
  SCHOOL_SETTINGS = 'school:settings',
  USER_MANAGE = 'user:manage',
  AUDIT_VIEW = 'audit:view',
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  teacher: [
    Permission.ATTENDANCE_VIEW_OWN,
    Permission.ATTENDANCE_VIEW_SECTION,
    Permission.ATTENDANCE_MARK,
    Permission.SYLLABUS_VIEW,
    Permission.SYLLABUS_UPDATE,
    Permission.STUDENT_VIEW,
    Permission.SUBSTITUTION_REQUEST,
  ],
  
  hod: [
    // All teacher permissions
    ...ROLE_PERMISSIONS.teacher,
    // Plus:
    Permission.ATTENDANCE_VIEW_ALL, // For their department
    Permission.SYLLABUS_CREATE,
    Permission.SUBSTITUTION_APPROVE,
  ],
  
  school_admin: [
    // All HOD permissions
    ...ROLE_PERMISSIONS.hod,
    // Plus:
    Permission.ATTENDANCE_EDIT,
    Permission.STUDENT_CREATE,
    Permission.STUDENT_EDIT,
    Permission.STUDENT_DELETE,
    Permission.SCHOOL_SETTINGS,
    Permission.USER_MANAGE,
    Permission.AUDIT_VIEW,
  ],
  
  org_admin: [
    // All school_admin permissions for all schools
    ...ROLE_PERMISSIONS.school_admin,
  ],
  
  super_admin: [
    // All permissions
    ...Object.values(Permission),
  ],
};
```

### 4.3 Permission Checking

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION CHECKING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

function requirePermission(...permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // Set by auth middleware
    
    // Get user's effective permissions
    const userPermissions = await getUserPermissions(user.id, user.schoolId);
    
    // Check if user has ALL required permissions
    const hasAllPermissions = permissions.every(p => userPermissions.has(p));
    
    if (!hasAllPermissions) {
      await logSecurityEvent({
        userId: user.id,
        action: 'PERMISSION_DENIED',
        resource: req.path,
        requiredPermissions: permissions,
        userPermissions: Array.from(userPermissions),
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
}

// Resource-level permission check
async function canAccessResource(
  user: User,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  switch (resourceType) {
    case 'attendance_session':
      const session = await db.queryFirst(
        'SELECT taken_by_id, section_id FROM attendance_sessions WHERE id = ?',
        [resourceId]
      );
      
      // Owner can always access
      if (session.taken_by_id === user.id) return true;
      
      // HOD can access if in their department
      if (user.role === 'hod') {
        const inDept = await isInUserDepartment(user.id, session.section_id);
        return inDept;
      }
      
      // Admin can access all in school
      if (user.role === 'school_admin') return true;
      
      return false;
      
    // ... other resource types
  }
}
```

---

## 5. Row-Level Security (RLS)

### 5.1 RLS Policy Design

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Session context function (set by API on each request)
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::TEXT;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_school_id() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_school_id', TRUE), '')::TEXT;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_org_id() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_org_id', TRUE), '')::TEXT;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_user_role', TRUE), '')::TEXT;
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────────────────────────────────────
-- STUDENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Teachers can view students in sections they teach
CREATE POLICY students_teacher_select ON students
  FOR SELECT
  TO authenticated
  USING (
    school_id = current_school_id()
    AND (
      current_user_role() IN ('school_admin', 'org_admin', 'super_admin')
      OR EXISTS (
        SELECT 1 FROM section_students ss
        JOIN teaching_assignments ta ON ta.section_id = ss.section_id
        WHERE ss.student_id = students.id
          AND ta.teacher_id = current_user_id()
          AND ta.academic_year_id = current_academic_year_id(current_school_id())
      )
    )
  );

-- Only admins can insert/update/delete students
CREATE POLICY students_admin_all ON students
  FOR ALL
  TO authenticated
  USING (
    school_id = current_school_id()
    AND current_user_role() IN ('school_admin', 'org_admin', 'super_admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ATTENDANCE SESSIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions, admins see all
CREATE POLICY attendance_sessions_select ON attendance_sessions
  FOR SELECT
  TO authenticated
  USING (
    school_id = current_school_id()
    AND (
      taken_by_id = current_user_id()
      OR current_user_role() IN ('hod', 'school_admin', 'org_admin', 'super_admin')
    )
  );

-- Users can insert for sections they teach
CREATE POLICY attendance_sessions_insert ON attendance_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = current_school_id()
    AND taken_by_id = current_user_id()
    AND EXISTS (
      SELECT 1 FROM teaching_assignments
      WHERE teacher_id = current_user_id()
        AND section_id = attendance_sessions.section_id
        AND academic_year_id = current_academic_year_id(current_school_id())
    )
  );

-- Only owner or admin can update
CREATE POLICY attendance_sessions_update ON attendance_sessions
  FOR UPDATE
  TO authenticated
  USING (
    school_id = current_school_id()
    AND (
      taken_by_id = current_user_id()
      OR current_user_role() IN ('school_admin', 'org_admin', 'super_admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- CROSS-SCHOOL PROTECTION
-- ─────────────────────────────────────────────────────────────────────────────

-- Org admins can access all schools in their org
CREATE POLICY org_admin_cross_school ON students
  FOR ALL
  TO authenticated
  USING (
    current_user_role() = 'org_admin'
    AND EXISTS (
      SELECT 1 FROM schools s
      WHERE s.id = students.school_id
        AND s.org_id = current_org_id()
    )
  );
```

### 5.2 Setting Session Context

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// SET RLS CONTEXT ON EACH REQUEST
// ═══════════════════════════════════════════════════════════════════════════

async function setRLSContext(
  db: Pool,
  user: AuthenticatedUser
): Promise<PoolClient> {
  const client = await db.connect();
  
  try {
    // Set session variables for RLS
    await client.query(`
      SET LOCAL app.current_user_id = $1;
      SET LOCAL app.current_school_id = $2;
      SET LOCAL app.current_org_id = $3;
      SET LOCAL app.current_user_role = $4;
    `, [user.id, user.schoolId, user.orgId, user.role]);
    
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

// Middleware to wrap all DB operations
async function withRLS<T>(
  user: AuthenticatedUser,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await setRLSContext(db, user);
  
  try {
    return await operation(client);
  } finally {
    client.release();
  }
}

// Usage in API handler
app.get('/api/students', authenticate, async (req, res) => {
  const students = await withRLS(req.user, async (client) => {
    // This query automatically filtered by RLS
    return client.query('SELECT * FROM students ORDER BY last_name');
  });
  
  res.json(students.rows);
});
```

---

## 6. API Security

### 6.1 Rate Limiting

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const rateLimits = {
  // Authentication endpoints
  'POST /api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                   // 5 attempts
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  
  'POST /api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many registration attempts.'
  },
  
  // AI endpoints (expensive)
  'POST /api/ai/*': {
    windowMs: 60 * 1000,      // 1 minute
    max: 30,                  // 30 requests per minute
    message: 'AI rate limit exceeded. Please slow down.',
    keyGenerator: (req) => req.user.id, // Per-user limit
  },
  
  // Voice streaming (concurrent connections)
  'WS /api/voice/*': {
    maxConcurrent: 2,         // 2 concurrent voice sessions per user
    message: 'Maximum voice sessions reached.'
  },
  
  // General API
  'default': {
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: (req) => req.user.id,
  }
};

// Cost-aware rate limiting for AI
const aiCostLimiter = {
  async checkBudget(userId: string, estimatedTokens: number): Promise<boolean> {
    const usage = await redis.get(`ai_usage:${userId}:${todayKey()}`);
    const currentUsage = parseInt(usage ?? '0', 10);
    
    const dailyLimit = 100000; // 100k tokens per user per day
    
    if (currentUsage + estimatedTokens > dailyLimit) {
      await logEvent({
        type: 'AI_BUDGET_EXCEEDED',
        userId,
        currentUsage,
        attempted: estimatedTokens,
        limit: dailyLimit
      });
      return false;
    }
    
    return true;
  },
  
  async recordUsage(userId: string, actualTokens: number): Promise<void> {
    await redis.incrby(`ai_usage:${userId}:${todayKey()}`, actualTokens);
    await redis.expire(`ai_usage:${userId}:${todayKey()}`, 86400);
  }
};
```

### 6.2 Input Validation

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION SCHEMAS (Zod)
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

// Common patterns
const uuid = z.string().uuid();
const email = z.string().email().max(255);
const safeName = z.string().min(1).max(100).regex(/^[\p{L}\p{M}\p{N}\s'-]+$/u);
const phoneNumber = z.string().regex(/^\+?[1-9]\d{1,14}$/);

// Entity schemas
const createStudentSchema = z.object({
  firstName: safeName,
  lastName: safeName,
  admissionNumber: z.string().max(50).optional(),
  dateOfBirth: z.string().date().optional(),
  guardianPhone: phoneNumber.optional(),
  nicknames: z.array(safeName).max(5).optional(),
});

const markAttendanceSchema = z.object({
  sessionId: uuid,
  records: z.array(z.object({
    studentId: uuid,
    status: z.enum(['present', 'absent', 'late', 'excused']),
    notes: z.string().max(500).optional(),
  })).min(1).max(100),
});

// XSS prevention for text that will be displayed
const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Validation middleware
function validate<T extends z.ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      throw error;
    }
  };
}
```

---

## 7. Audit Logging

### 7.1 Audit Event Schema

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- IMMUTABLE AUDIT LOG
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  
  -- When
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Who
  user_id TEXT, -- NULL for system events
  user_email TEXT,
  user_role TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Where
  school_id TEXT,
  org_id TEXT,
  
  -- What
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  
  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB, -- Additional context
  
  -- Integrity
  checksum TEXT NOT NULL -- SHA-256 of row data
);

-- Append-only enforcement
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is immutable. Modifications are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- Partition by month for performance
CREATE TABLE audit_log_2025_01 PARTITION OF audit_log
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Index for common queries
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);
CREATE INDEX idx_audit_school ON audit_log(school_id, created_at DESC);
```

### 7.2 Audit Event Types

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// AUDIT EVENT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

enum AuditAction {
  // Authentication
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_LOGIN_FAILED = 'auth.login_failed',
  AUTH_PASSWORD_CHANGED = 'auth.password_changed',
  AUTH_MFA_ENABLED = 'auth.mfa_enabled',
  AUTH_SESSION_REVOKED = 'auth.session_revoked',
  
  // Data operations
  DATA_CREATED = 'data.created',
  DATA_UPDATED = 'data.updated',
  DATA_DELETED = 'data.deleted',
  DATA_EXPORTED = 'data.exported',
  
  // Admin actions
  ADMIN_USER_CREATED = 'admin.user_created',
  ADMIN_USER_ROLE_CHANGED = 'admin.user_role_changed',
  ADMIN_USER_DISABLED = 'admin.user_disabled',
  ADMIN_SETTINGS_CHANGED = 'admin.settings_changed',
  
  // Security events
  SECURITY_PERMISSION_DENIED = 'security.permission_denied',
  SECURITY_RATE_LIMITED = 'security.rate_limited',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  SECURITY_TOKEN_REUSE = 'security.token_reuse',
  
  // Voice/AI
  VOICE_SESSION_STARTED = 'voice.session_started',
  VOICE_SESSION_ENDED = 'voice.session_ended',
  AI_REQUEST = 'ai.request',
  AI_BUDGET_EXCEEDED = 'ai.budget_exceeded',
}

async function logAuditEvent(event: AuditEvent): Promise<void> {
  const checksum = await calculateChecksum(event);
  
  await db.execute(`
    INSERT INTO audit_log (
      user_id, user_email, user_role, ip_address, user_agent,
      school_id, org_id, action, entity_type, entity_id,
      old_values, new_values, metadata, checksum
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `, [
    event.userId,
    event.userEmail,
    event.userRole,
    event.ipAddress,
    event.userAgent,
    event.schoolId,
    event.orgId,
    event.action,
    event.entityType,
    event.entityId,
    event.oldValues ? JSON.stringify(event.oldValues) : null,
    event.newValues ? JSON.stringify(event.newValues) : null,
    event.metadata ? JSON.stringify(event.metadata) : null,
    checksum
  ]);
}
```

---

## 8. Data Protection

### 8.1 Encryption Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENCRYPTION STRATEGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  IN TRANSIT                                                                  │
│  ──────────                                                                  │
│  • TLS 1.3 for all connections                                              │
│  • HSTS enabled (max-age=31536000)                                          │
│  • Certificate pinning for mobile apps                                      │
│                                                                              │
│  AT REST                                                                     │
│  ───────                                                                     │
│  • Database: PostgreSQL native encryption (AES-256)                         │
│  • Files: S3/GCS encryption with customer-managed keys                      │
│  • Backups: Encrypted before transfer                                       │
│                                                                              │
│  FIELD-LEVEL ENCRYPTION (for highly sensitive PII)                          │
│  ──────────────────────────────────────────────────                          │
│  • Student guardian phone numbers                                           │
│  • Teacher personal phone numbers                                           │
│  • Medical notes                                                            │
│                                                                              │
│  KEY MANAGEMENT                                                              │
│  ──────────────                                                              │
│  • Master keys in AWS KMS / GCP KMS                                         │
│  • Data Encryption Keys (DEKs) derived per-tenant                          │
│  • Key rotation every 90 days                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 PII Handling

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// PII FIELD ENCRYPTION
// ═══════════════════════════════════════════════════════════════════════════

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

class PIIEncryption {
  private async getDEK(schoolId: string): Promise<Buffer> {
    // Fetch or derive Data Encryption Key for this school
    const cached = await redis.get(`dek:${schoolId}`);
    if (cached) return Buffer.from(cached, 'base64');
    
    // Derive from KMS
    const dek = await kms.decrypt({
      CiphertextBlob: await this.getEncryptedDEK(schoolId)
    });
    
    // Cache for 1 hour
    await redis.setex(`dek:${schoolId}`, 3600, dek.Plaintext.toString('base64'));
    
    return dek.Plaintext;
  }
  
  async encrypt(schoolId: string, plaintext: string): Promise<string> {
    const dek = await this.getDEK(schoolId);
    const iv = randomBytes(12);
    
    const cipher = createCipheriv('aes-256-gcm', dek, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    
    // Format: base64(iv + tag + ciphertext)
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }
  
  async decrypt(schoolId: string, ciphertext: string): Promise<string> {
    const dek = await this.getDEK(schoolId);
    const data = Buffer.from(ciphertext, 'base64');
    
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    
    const decipher = createDecipheriv('aes-256-gcm', dek, iv);
    decipher.setAuthTag(tag);
    
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
```

---

## 9. Security Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRE-PRODUCTION SECURITY CHECKLIST                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  AUTHENTICATION                                                              │
│  □ JWT secret is 256-bit random, not hardcoded                              │
│  □ Refresh token rotation implemented                                       │
│  □ Session revocation working                                               │
│  □ Password hashing uses bcrypt/argon2 with cost ≥ 10                      │
│  □ MFA available for admin roles                                            │
│                                                                              │
│  AUTHORIZATION                                                               │
│  □ All API endpoints have permission checks                                 │
│  □ RLS enabled on all tenant tables                                         │
│  □ No school_id accepted from client input                                 │
│  □ Resource-level access verified                                           │
│                                                                              │
│  DATA PROTECTION                                                             │
│  □ TLS 1.3 enforced                                                         │
│  □ HSTS header set                                                          │
│  □ Database encryption enabled                                              │
│  □ Backups encrypted                                                        │
│  □ PII fields encrypted                                                     │
│                                                                              │
│  API SECURITY                                                                │
│  □ Rate limiting on all endpoints                                           │
│  □ Input validation with Zod/similar                                        │
│  □ CORS configured correctly                                                │
│  □ No sensitive data in error messages                                      │
│  □ Security headers (CSP, X-Frame-Options, etc.)                           │
│                                                                              │
│  SECRETS MANAGEMENT                                                          │
│  □ No secrets in code or git                                                │
│  □ Environment variables for all secrets                                    │
│  □ API keys not exposed to frontend                                         │
│  □ Key rotation procedure documented                                        │
│                                                                              │
│  AUDIT & MONITORING                                                          │
│  □ All auth events logged                                                   │
│  □ All data modifications logged                                            │
│  □ Suspicious activity alerts configured                                    │
│  □ Log retention policy defined                                             │
│                                                                              │
│  INCIDENT RESPONSE                                                           │
│  □ Breach notification procedure documented                                 │
│  □ Session revocation procedure tested                                      │
│  □ Data export/deletion procedure ready                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
