# Staffroom AI - Firebase Cloud Functions

This directory contains Firebase Cloud Functions that serve as secure proxies for AI API calls.

## Purpose

These functions keep API keys server-side, preventing them from being exposed in the client-side JavaScript bundle. This is a **critical security measure** - without these proxies, anyone could view your API keys in the browser DevTools and use them for their own purposes.

## Functions

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `aiGenerate` | `/api/ai/generate` | Proxy for Google Gemini text generation |
| `transcribe` | `/api/ai/transcribe` | Proxy for OpenAI Whisper audio transcription |
| `getLiveToken` | `/api/ai/live-token` | Provides WebSocket URL for Gemini Live API |
| `health` | `/api/health` | Health check endpoint |

## Security Features

- ✅ **API keys stored as Firebase Secrets** - Never exposed to client
- ✅ **Rate limiting** - 30 requests/minute per IP
- ✅ **Input validation** - Prompt length limits, audio size limits
- ✅ **CORS protection** - Only allowed origins can call these functions
- ✅ **Basic XSS sanitization** - Script tags removed from prompts

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Set API Keys as Secrets

Firebase Functions v2 uses secrets instead of environment config:

```bash
# Set your Gemini API key
firebase functions:secrets:set GEMINI_API_KEY
# Enter your key when prompted

# Set your OpenAI API key (for Whisper transcription)
firebase functions:secrets:set OPENAI_API_KEY
# Enter your key when prompted
```

### 3. Add Your Production Domain to CORS

Edit `index.js` and add your production domain to `ALLOWED_ORIGINS`:

```javascript
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://staffroom-ai.web.app",
  "https://staffroom-ai.firebaseapp.com",
  "https://your-custom-domain.com",  // Add this
];
```

### 4. Deploy Functions

```bash
firebase deploy --only functions
```

### 5. Deploy Hosting (with rewrites)

The `firebase.json` is already configured to rewrite `/api/*` paths to the corresponding functions.

```bash
firebase deploy --only hosting
```

## Local Development

### Using Firebase Emulator

```bash
# Start the emulator
firebase emulators:start --only functions

# Functions will be available at:
# http://localhost:5001/staffroom-ai/us-central1/aiGenerate
# http://localhost:5001/staffroom-ai/us-central1/transcribe
# etc.
```

### Testing with the Frontend

The frontend's `aiApiClient.js` automatically detects development mode and calls the emulator URLs:

```javascript
// In development, calls:
// http://localhost:5001/staffroom-ai/us-central1/aiGenerate

// In production, calls:
// https://your-app.web.app/api/ai/generate
```

## Monitoring

View function logs:

```bash
firebase functions:log
```

Or view in the [Firebase Console](https://console.firebase.google.com/) under Functions.

## Cost Optimization

- Functions are configured with appropriate memory limits to minimize costs
- Rate limiting prevents abuse
- Max 10 instances per function to prevent runaway scaling

## Troubleshooting

### "AI service not configured" Error

The API key secret is not set. Run:
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

### CORS Errors

Your domain is not in `ALLOWED_ORIGINS`. Add it to `index.js` and redeploy.

### Rate Limit Exceeded

Wait 1 minute or check if you're making too many requests. Consider increasing the limit in `index.js` if needed.
