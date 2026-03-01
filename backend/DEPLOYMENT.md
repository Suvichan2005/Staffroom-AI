# Staffroom AI — Backend Deployment & Operations Guide

> Secure Node.js backend: Firebase Auth, Redis rate-limiting, Gemini AI gateway

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Local Development](#local-development)
3. [Setting Firebase Custom Claims](#setting-firebase-custom-claims)
4. [Deploying on Railway](#deploying-on-railway)
5. [Deploying on Render](#deploying-on-render)
6. [Frontend Configuration](#frontend-configuration)
7. [Rotating API Keys](#rotating-api-keys)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Security Checklist](#security-checklist)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  React Frontend (Vite)                                   │
│  • Sends Firebase ID token in Authorization header       │
│  • ZERO API keys in client bundle                        │
│  • VITE_BACKEND_URL points at the Express backend        │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌──────────────────────────────────────────────────────────┐
│  Express Backend (this codebase)                         │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ requireAuth  │→│ requireRole   │→│ rateLimiter     │  │
│  │ (Firebase    │  │ (custom      │  │ (Redis-backed,  │  │
│  │  ID token)   │  │  claims)     │  │  per-user)      │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │           │
│         ▼                ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Input Validation (messages, type)                  │ │
│  └─────────────────────┬───────────────────────────────┘ │
│                        ▼                                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  AI Router Service (Gemini)                          │ │
│  │  • gemini-2.5-flash (fast / default)                 │ │
│  │  • gemini-2.5-pro (complex)                          │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Middleware chain for every `/api/ai/*` request:**

```
CORS check → JSON parse → requireAuth → rateLimiter → validateBody → handler → errorHandler
```

---

## Local Development

### Prerequisites

- **Node.js ≥ 20**
- **Redis** (optional — falls back to in-memory rate limiting)
- **Firebase project** with Authentication enabled

### Setup

```bash
cd backend

# Install dependencies
npm install

# Copy env template and fill in values
cp .env.example .env

# Required: set GEMINI_API_KEY in .env
# Required: place Firebase service account key at backend/service-account.json
#   Firebase Console → Project Settings → Service Accounts → Generate New Private Key

# Start dev server (auto-restart on changes)
npm run dev
```

### Test the server

```bash
# Health check (no auth needed)
curl http://localhost:8080/api/health

# AI generate (requires Firebase ID token)
curl -X POST http://localhost:8080/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "type": "fast"
  }'
```

### Getting a Firebase ID Token for Testing

In your browser console (on the running frontend):

```js
const token = await firebase.auth().currentUser.getIdToken();
console.log(token);
```

---

## Setting Firebase Custom Claims

Custom claims (`role`, `roles`) are how the backend enforces authorization.
They are set via the Firebase Admin SDK — never from the client.

### Option A: Use the Admin API Endpoint

Once you have an admin user, use the `/api/admin/set-role` endpoint:

```bash
curl -X POST https://YOUR_BACKEND_URL/api/admin/set-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_ID_TOKEN" \
  -d '{"uid": "TARGET_USER_UID", "role": "hod"}'
```

### Option B: Bootstrap the First Admin (one-time script)

Create `backend/scripts/set-admin.js`:

```js
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });

const uid = process.argv[2];
if (!uid) { console.error('Usage: node set-admin.js <uid>'); process.exit(1); }

await getAuth().setCustomUserClaims(uid, { role: 'admin', roles: ['admin'] });
console.log(`✅ Admin claim set for ${uid}`);
```

Run:

```bash
node backend/scripts/set-admin.js "FIREBASE_USER_UID"
```

---

## Deploying on Railway

Railway is the **recommended** platform — fast, Git-push deploys, built-in Redis, no cold starts.

### 1. Create Project

```bash
npm i -g @railway/cli
railway login
railway init
```

### 2. Add Redis

```bash
railway add --plugin redis
```

Railway auto-injects `REDIS_URL` for the Redis plugin.

### 3. Set Environment Variables

```bash
railway variables set NODE_ENV=production
railway variables set PORT=8080
railway variables set CORS_ALLOWED_ORIGINS="https://staffroom-ai.web.app,https://staffroom-ai.firebaseapp.com"
railway variables set GEMINI_API_KEY="AIzaSy..."

# Firebase service account (paste the entire JSON as one value)
railway variables set FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

### 4. Deploy

```bash
railway up
```

Railway auto-detects the Dockerfile. Your backend URL will be:
`https://YOUR_PROJECT.up.railway.app`

### 5. Health Check Config (Railway dashboard)

- **Health Check Path**: `/api/health`
- **Restart Policy**: Always

### 6. Update Frontend

Set `VITE_BACKEND_URL` to your Railway URL before building the frontend:

```bash
VITE_BACKEND_URL=https://YOUR_PROJECT.up.railway.app npm run build
```

---

## Deploying on Render

### 1. Create Web Service

- Go to [Render Dashboard](https://dashboard.render.com)
- **New → Web Service**
- Connect your GitHub repo
- **Root Directory**: `backend`
- **Runtime**: Docker
- **Instance Type**: Starter ($7/mo) or Standard

### 2. Add Redis

- **New → Redis** in Render dashboard
- Copy the Internal URL
- Add as env var `REDIS_URL` on the web service

### 3. Set Environment Variables

In the Render service dashboard → **Environment**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `CORS_ALLOWED_ORIGINS` | `https://staffroom-ai.web.app,https://staffroom-ai.firebaseapp.com` |
| `GEMINI_API_KEY` | `AIzaSy...` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | `{"type":"service_account",...}` (full JSON) |
| `REDIS_URL` | (from Redis instance) |

### 4. Health Check (Render dashboard)

- **Health Check Path**: `/api/health`

### 5. Deploy

Push to the connected branch or click **Manual Deploy**.

---

## Frontend Configuration

The React frontend needs one env var to point at the backend:

| Env Var | Dev Value | Production Value |
|---------|-----------|------------------|
| `VITE_BACKEND_URL` | `http://localhost:8080` | `https://YOUR_BACKEND_URL` |

### For local development

Create/update `.env.local`:

```env
VITE_BACKEND_URL=http://localhost:8080
```

### For production builds

```bash
VITE_BACKEND_URL=https://YOUR_BACKEND_URL npm run build
```

Or set it in your hosting platform's build settings (Vercel, Firebase Hosting, etc.).

### Vercel

In `vercel.json` or Vercel dashboard → Environment Variables:

```
VITE_BACKEND_URL = https://YOUR_BACKEND_URL
```

---

## Rotating API Keys

### When to Rotate

- Immediately if **any** key was exposed in client-side code or git history
- Quarterly as a preventive measure
- After a team member leaves

### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Update `GEMINI_API_KEY` in Railway/Render env vars
4. Redeploy (zero-downtime on Railway if you set it before deploy)
5. Delete the old key in Google AI Studio

### Firebase Service Account Key

1. Firebase Console → Project Settings → Service Accounts
2. Generate New Private Key (downloads JSON)
3. Update `FIREBASE_SERVICE_ACCOUNT_JSON` env var with the new JSON
4. Redeploy
5. Go to Google Cloud Console → IAM → Service Accounts → delete the old key

### Post-Rotation Verification

```bash
# Verify health
curl https://YOUR_BACKEND/api/health/ready

# Verify AI generation
curl -X POST https://YOUR_BACKEND/api/ai/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"ping"}],"type":"fast"}'
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `PORT` | No | `8080` | HTTP port |
| `NODE_ENV` | No | `production` | `production` or `development` |
| `CORS_ALLOWED_ORIGINS` | No | staffroom-ai domains | Comma-separated exact origin URLs |
| `REDIS_URL` | No | — | Redis connection URL (falls back to in-memory) |
| `RATE_LIMIT_MAX` | No | `60` | Max requests per user per minute |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in milliseconds |
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key |
| `GOOGLE_APPLICATION_CREDENTIALS` | Cond. | — | Path to Firebase service account JSON file |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Cond. | — | Raw JSON string (alternative to file path) |

> One of `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON` is required.

---

## Security Checklist

Before going to production, verify:

- [ ] **No API keys in frontend code** — search `src/` for `VITE_GEMINI`, `VITE_OPENAI`, `VITE_AZURE`
- [ ] **CORS allowlist is exact** — no `.includes()`, no wildcards, no regex
- [ ] **All AI routes require auth** — `requireAuth` middleware on every `/api/ai/*` route
- [ ] **Admin routes require role** — `requireRole(['admin'])` on `/api/admin/*`
- [ ] **Redis is connected** — check `/api/health/ready` response
- [ ] **Rate limit works** — fire 61 requests in 1 minute, verify 429 response
- [ ] **service-account.json not in git** — verify `.gitignore` includes it
- [ ] **Firebase custom claims set** — at least one admin user bootstrapped
- [ ] **HTTPS only** — Railway/Render enforce this by default
- [ ] **Error responses are clean** — no stack traces in production (test a bad request)
- [ ] **Helmet headers active** — check response headers for `X-Content-Type-Options`, `Strict-Transport-Security`

---

## API Endpoints Summary

| Method | Path | Auth | Rate Limit | Description |
|--------|------|:----:|:----------:|-------------|
| GET | `/api/health` | No | No | Liveness probe |
| GET | `/api/health/ready` | No | No | Readiness probe (checks Gemini) |
| POST | `/api/ai/generate` | Yes | 60/min | AI text generation (supports tool calling) |
| POST | `/api/ai/vision` | Yes | 60/min | AI vision (document parsing with images) |
| POST | `/api/ai/agent` | Yes | 60/min | AI agent (forced function calling) |
| GET | `/api/ai/live-token` | Yes | 60/min | Gemini Live WebSocket URL |
| GET | `/api/ai/providers` | Admin | 60/min | Provider status |
| POST | `/api/admin/set-role` | Admin | 60/min | Set user role |
| GET | `/api/admin/user/:uid` | Admin | 60/min | Get user details |

---

## Troubleshooting

### "401 Unauthorized" on AI calls

The frontend user must be signed in via Firebase Auth. Check:
1. `getAuth().currentUser` is not null
2. The ID token hasn't expired (tokens last 1 hour; the SDK auto-refreshes)
3. `service-account.json` matches the same Firebase project

### "429 Too Many Requests"

Rate limit exceeded. Default is 60 requests/user/minute. Adjust via:
```bash
railway variables set RATE_LIMIT_MAX=120
```

### Backend can't connect to Redis

If `REDIS_URL` is empty or Redis is down, the backend falls back to **in-memory rate limiting**. This is fine for single-instance deployments but won't work across multiple instances.

### CORS errors in browser

Add your frontend's **exact** origin to `CORS_ALLOWED_ORIGINS`:
```bash
railway variables set CORS_ALLOWED_ORIGINS="https://your-frontend.vercel.app,http://localhost:5173"
```

### Gemini API returns 400

Check that `GEMINI_API_KEY` is valid and the Gemini API is enabled in your Google Cloud project.
