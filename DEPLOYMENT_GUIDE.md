# Staffroom AI - Firebase Deployment Guide

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged in to Firebase: `firebase login`
3. Project selected: `firebase use staffroom-ai`

## Step 1: Configure Firebase Secrets (One-Time Setup)

Firebase Functions need API keys stored as secrets (not in code or environment files).

### Set Gemini API Key
```bash
firebase functions:secrets:set GEMINI_API_KEY
# When prompted, paste your Gemini API key from: https://aistudio.google.com/apikey
```

### Set Firebase Config (Optional - for server-side operations)
```bash
firebase functions:secrets:set FIREBASE_API_KEY
firebase functions:secrets:set FIREBASE_PROJECT_ID
```

### (Optional) Set Azure Keys if using Azure provider
```bash
firebase functions:secrets:set AZURE_OPENAI_API_KEY
firebase functions:secrets:set AZURE_OPENAI_ENDPOINT
firebase functions:secrets:set AZURE_OPENAI_DEPLOYMENT
firebase functions:secrets:set AZURE_SPEECH_KEY
firebase functions:secrets:set AZURE_SPEECH_REGION
```

### Verify secrets are set
```bash
firebase functions:secrets:access GEMINI_API_KEY
```

## Step 2: Update Firebase Config for Client

Your client-side code needs Firebase configuration. Create `.env.local` if it doesn't exist:

```bash
# .env.local (DO NOT commit this file!)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=staffroom-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=staffroom-ai
VITE_FIREBASE_STORAGE_BUCKET=staffroom-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# AI Provider (use gemini for production via proxy)
VITE_AI_PROVIDER=gemini
```

**Note**: These Firebase client config values are PUBLIC and safe to expose. Get them from:
Firebase Console → Project Settings → General → Your apps → Firebase SDK snippet

## Step 3: Build for Production

Build the app with production environment variables:

```bash
npm run build
```

This creates optimized production files in `dist/` folder with:
- `import.meta.env.PROD = true` (enables proxy mode)
- Firebase config embedded from `.env.local`
- Code minification and optimization

## Step 4: Deploy Functions First

**IMPORTANT**: Always deploy functions before hosting to ensure backend is ready.

```bash
firebase deploy --only functions
```

This deploys Cloud Functions that proxy AI API calls (keeping secrets server-side).

Expected output:
```
✔ functions[geminiProxy] Successful create operation.
✔ functions[azureAIProxy] Successful create operation.
...
```

## Step 5: Deploy Hosting

Deploy the built frontend to Firebase Hosting:

```bash
firebase deploy --only hosting
```

Expected output:
```
✔ hosting: Deploy complete!
Project Console: https://console.firebase.google.com/project/staffroom-ai
Hosting URL: https://staffroom-ai.web.app
```

## Step 6: Deploy Everything Together (Future Deployments)

After initial setup, deploy both functions and hosting:

```bash
firebase deploy
```

Or use the single command:
```bash
npm run build && firebase deploy
```

## Troubleshooting

### Issue: "Gemini API Key Missing" on deployed site

**Cause**: Functions don't have the GEMINI_API_KEY secret set.

**Solution**:
```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions
```

### Issue: "Chat sessions not saving to Firestore"

**Causes**:
1. Firestore rules blocking writes
2. Firebase config missing from `.env.local` during build
3. User not authenticated

**Solutions**:

1. Check Firestore rules:
```bash
firebase deploy --only firestore:rules
```

2. Verify Firebase config in build:
   - Check `.env.local` has all VITE_FIREBASE_* variables
   - Rebuild: `npm run build`
   - Redeploy: `firebase deploy --only hosting`

3. Check browser console for auth errors:
   - Open deployed site
   - F12 → Console
   - Look for Firebase auth/Firestore errors

### Issue: "Function invocation failed" errors

**Cause**: Functions not deployed or secrets missing.

**Solution**:
```bash
# Check deployed functions
firebase functions:list

# Redeploy functions
firebase deploy --only functions

# Check function logs
firebase functions:log
```

### Issue: CORS errors on deployed site

**Cause**: Function doesn't recognize your domain as allowed origin.

**Solution**: Update `functions/index.js`:
```javascript
const ALLOWED_ORIGINS = [
  "https://staffroom-ai.web.app",
  "https://staffroom-ai.firebaseapp.com",
  "https://your-custom-domain.com", // Add your domain if using custom domain
];
```

Then redeploy functions:
```bash
firebase deploy --only functions
```

## Quick Deployment Checklist

- [ ] Secrets set in Firebase Functions
- [ ] `.env.local` exists with Firebase config
- [ ] `npm run build` completes successfully
- [ ] `firebase deploy --only functions` succeeds
- [ ] `firebase deploy --only hosting` succeeds
- [ ] Visit deployed URL and test:
  - [ ] Login works
  - [ ] Chat loads previous sessions
  - [ ] New chat messages save
  - [ ] AI responses work

## Development vs Production

### Development (localhost)
- Uses `.env.local` for all config
- API keys can be client-side (not recommended but works)
- Direct API calls to Gemini/Azure
- Hot reload, source maps

### Production (Firebase Hosting)
- Uses Firebase Functions proxy for AI calls
- API keys stored as Firebase secrets (server-side only)
- Optimized, minified code
- HTTPS, CDN delivery

## Cost Optimization

Firebase Functions free tier:
- 125K invocations/month
- 40K GB-seconds/month
- 40K CPU-seconds/month

Staffroom AI is optimized to stay within free tier:
- Efficient function design
- Minimal cold starts
- Request batching

Monitor usage:
```bash
firebase projects:list
```
→ Firebase Console → Usage and billing

## Security Best Practices

✅ **DO**:
- Store API keys as Firebase secrets
- Use `.env.local` for Firebase config (public info)
- Add `.env.local` to `.gitignore`
- Keep functions updated
- Monitor function logs for suspicious activity

❌ **DON'T**:
- Commit API keys to git
- Expose Gemini/Azure keys in client code
- Share `.env.local` publicly
- Deploy without testing build locally first

## Local Testing Before Deployment

Test production build locally:

```bash
# Build for production
npm run build

# Serve production build locally
npm install -g serve
serve -s dist -p 3000
```

Visit `http://localhost:3000` and test all features before deploying to Firebase.

---

## Need Help?

Check logs:
```bash
# Function logs
firebase functions:log

# Hosting logs  
firebase hosting:logs
```

Firebase Console: https://console.firebase.google.com/project/staffroom-ai
