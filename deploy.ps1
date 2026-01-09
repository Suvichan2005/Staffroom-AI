# Staffroom AI - Production Deployment Script
# Run this to deploy to Firebase Hosting + Functions

Write-Host "Staffroom AI - Firebase Deployment" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (-Not (Test-Path ".env.local")) {
    Write-Host "ERROR: .env.local not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create .env.local with your Firebase configuration:" -ForegroundColor Yellow
    Write-Host "  VITE_FIREBASE_API_KEY=..." -ForegroundColor Yellow
    Write-Host "  VITE_FIREBASE_AUTH_DOMAIN=..." -ForegroundColor Yellow
    Write-Host "  VITE_FIREBASE_PROJECT_ID=..." -ForegroundColor Yellow
    Write-Host "  (etc...)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "See DEPLOYMENT_GUIDE.md for full setup instructions." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found .env.local" -ForegroundColor Green
Write-Host ""

# Step 1: Build for production
Write-Host "Step 1/3: Building production bundle..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build complete" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy Functions
Write-Host "Step 2/3: Deploying Firebase Functions..." -ForegroundColor Cyan
Write-Host "   (This keeps API keys server-side)" -ForegroundColor Gray
firebase deploy --only functions

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Functions deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common causes:" -ForegroundColor Yellow
    Write-Host "  1. Firebase secrets not set (run: firebase functions:secrets:set GEMINI_API_KEY)" -ForegroundColor Yellow
    Write-Host "  2. Not logged in (run: firebase login)" -ForegroundColor Yellow
    Write-Host "  3. Wrong project (run: firebase use staffroom-ai)" -ForegroundColor Yellow
    exit 1
}

Write-Host "Functions deployed" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy Hosting
Write-Host "Step 3/3: Deploying to Firebase Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Hosting deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Deployment successful!" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is live at:" -ForegroundColor Cyan
Write-Host "  https://staffroom-ai.web.app" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Visit the URL and test all features" -ForegroundColor White
Write-Host "  2. Check browser console (F12) for any errors" -ForegroundColor White
Write-Host "  3. Test login, chat, voice, and progress tracking" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  firebase functions:log" -ForegroundColor White
Write-Host ""
