# Deployment Guide (Cloud Run + Firebase Hosting)

This guide replaces the older Railway/Cloud Functions deployment flow.

## Architecture

- Frontend: Firebase Hosting (`https://staffroom-ai.web.app`)
- Backend API: Cloud Run service (`https://<service>-<hash>-<region>.run.app`)
- Auth: Firebase ID token on every backend request

## Prerequisites

- `gcloud` CLI authenticated (`gcloud auth login`)
- Firebase CLI authenticated (`firebase login`)
- Billing-enabled GCP project
- APIs enabled: Cloud Run, Artifact Registry, Cloud Build

## One-Time Setup

```bash
gcloud config set project staffroom-ai
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

## Deploy Backend to Cloud Run

From repo root:

```bash
gcloud builds submit backend --tag gcr.io/staffroom-ai/staffroom-backend

gcloud run deploy staffroom-backend \
  --image gcr.io/staffroom-ai/staffroom-backend \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars NODE_ENV=production,CORS_ALLOWED_ORIGINS=https://staffroom-ai.web.app,https://staffroom-ai.firebaseapp.com \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

If using Redis for distributed rate limiting, add:

```bash
--set-env-vars REDIS_URL=<your_redis_url>
```

## Deploy Frontend to Firebase Hosting

Set production backend URL before build:

```bash
# PowerShell
$env:VITE_BACKEND_URL="https://<your-cloud-run-url>"
npm run build
firebase deploy --only hosting,firestore:rules
```

## Verify

```bash
curl https://<your-cloud-run-url>/api/health
```

Then open `https://staffroom-ai.web.app` and test AI chat.

## Common CORS Issue

If browser shows:

- "No 'Access-Control-Allow-Origin' header"

ensure `CORS_ALLOWED_ORIGINS` includes exact frontend origin(s):

- `https://staffroom-ai.web.app`
- `https://staffroom-ai.firebaseapp.com`

No wildcard matching is used.

## Optional: Single-Command PowerShell Deploy

Use script:

```powershell
./scripts/deploy-cloudrun.ps1
```
