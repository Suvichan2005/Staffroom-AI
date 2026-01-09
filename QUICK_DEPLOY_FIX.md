# 🚀 Firebase Deployment - Quick Fix

## Your Issue: Missing API Keys & Firestore Not Working

**Root Cause**: Environment variables are embedded at BUILD TIME, not available at runtime on Firebase Hosting. API keys need to be in Firebase Functions secrets.

## Quick Fix (3 minutes)

### Step 1: Create .env.local (ONE TIME)
Create `.env.local` in project root with your keys:

```env
# Firebase Config (get from Firebase Console > Project Settings)
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=staffroom-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=staffroom-ai
VITE_FIREBASE_STORAGE_BUCKET=staffroom-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdefXXXXXXXX
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Gemini API Key (get from https://aistudio.google.com/apikey)
VITE_GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Optional: Azure OpenAI (if using Azure provider)
# VITE_AZURE_OPENAI_API_KEY=your_key
# VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
# VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
```

### Step 2: Set Firebase Secrets (ONE TIME - Automated!)
```powershell
# This reads from .env.local automatically!
./setup-secrets.ps1
```

The script will automatically:
- Read `VITE_GEMINI_API_KEY` from `.env.local`
- Set it as a Firebase Function secret
- Same for Firebase and Azure keys if present

### Step 3: Deploy
```powershell
./deploy.ps1
```

That's it! The deploy script will:
1. Build with `.env.local` config
2. Deploy Functions (with secrets)
3. Deploy Hosting

## Verify It Works

1. Visit https://staffroom-ai.web.app
2. Open browser console (F12)
3. Should see: `✅ AI Provider: gemini (via proxy)`
4. Test login → Chat → AI response

## Troubleshooting

### "Gemini API Key Missing"
```powershell
# Check if secret is set
firebase functions:secrets:get

# If GEMINI_API_KEY not listed:
# 1. Make sure it's in .env.local
# 2. Run the setup script again
./setup-secrets.ps1

# OR set manually:
firebase functions:secrets:set GEMINI_API_KEY

# Redeploy functions
firebase deploy --only functions
```

### "Chat sessions not saving"
```powershell
# Check Firebase config in build
cat .env.local  # Should have all VITE_FIREBASE_* variables

# Rebuild with correct config
npm run build
firebase deploy --only hosting

# Check Firestore rules
firebase deploy --only firestore:rules
```

### "Function not found" errors
```powershell
# Check deployed functions
firebase functions:list

# Should see: geminiProxy, azureAIProxy, etc.

# If missing, deploy functions:
firebase deploy --only functions
```

## Why This Happens

**Development (localhost)**:
- Reads `.env.local` at runtime ✅
- API keys can be in client code (not secure but works)

**Production (Firebase Hosting)**:
- Built files are static (no runtime env variables) ❌
- API keys must be in Firebase Functions secrets
- Client code calls Cloud Functions proxy
- Proxy uses secrets server-side (secure) ✅

## File Structure After Setup

```
staffroom-ai/
├── .env.local              ← Firebase config (DO NOT commit!)
├── .env.example            ← Template (safe to commit)
├── deploy.ps1             ← Deployment script
├── setup-secrets.ps1      ← Secrets setup script
├── DEPLOYMENT_GUIDE.md    ← Full documentation
└── functions/
    └── index.js           ← Proxy functions (use secrets)
```

## Commands Reference

```powershell
# First-time setup (one time)
firebase login
firebase use staffroom-ai

# Create .env.local with all your keys (see Step 1 above)

# Set secrets automatically from .env.local
./setup-secrets.ps1

# Deploy everything
./deploy.ps1

# Update code and redeploy
npm run build
firebase deploy

# Check status
firebase functions:list
firebase functions:log
firebase functions:secrets:get

# Update secrets (after changing .env.local)
./setup-secrets.ps1
firebase deploy --only functions
```

## Need Help?

See **DEPLOYMENT_GUIDE.md** for detailed explanations.

Check logs:
```powershell
firebase functions:log --only geminiProxy
firebase hosting:logs
```

Firebase Console: https://console.firebase.google.com/project/staffroom-ai
