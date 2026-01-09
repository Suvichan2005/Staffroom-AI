# Firebase Secrets Setup Script
# Run this ONCE to configure API keys as Firebase Function secrets

Write-Host "Firebase Secrets Setup for Staffroom AI" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will automatically configure Firebase Function secrets from .env.local" -ForegroundColor White
Write-Host "This keeps your API keys secure on the server (not exposed in client code)." -ForegroundColor Gray
Write-Host ""

# Check if .env.local exists
if (Test-Path ".env.local") {
    Write-Host "Found .env.local - will use keys from this file" -ForegroundColor Green
} else {
    Write-Host "WARNING: .env.local not found - you will need to enter keys manually" -ForegroundColor Yellow
}
Write-Host ""

# Check if Firebase CLI is installed
try {
    $firebaseVersion = firebase --version
    Write-Host "Firebase CLI detected: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Firebase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it with: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if logged in
Write-Host "Checking Firebase login status..." -ForegroundColor Cyan
firebase login:list

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARNING: Not logged in to Firebase" -ForegroundColor Yellow
    Write-Host "Running: firebase login" -ForegroundColor Cyan
    firebase login
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check current project
Write-Host "Current Firebase project:" -ForegroundColor Cyan
firebase use

Write-Host ""
Write-Host "If this is not 'staffroom-ai', run: firebase use staffroom-ai" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Continue with secrets setup? (y/n)"
if ($continue -ne "y") {
    Write-Host "Setup cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Setting up required secrets..." -ForegroundColor Cyan
Write-Host ""

# Function to read .env.local file
function Get-EnvValue {
    param($Key)
    
    if (Test-Path ".env.local") {
        $content = Get-Content ".env.local" -Raw
        if ($content -match "$Key\s*=\s*(.+)") {
            return $matches[1].Trim()
        }
    }
    return $null
}

# Gemini API Key (REQUIRED)
Write-Host "[1] GEMINI_API_KEY (Required)" -ForegroundColor Cyan

$geminiKey = Get-EnvValue "VITE_GEMINI_API_KEY"

if ($geminiKey) {
    Write-Host "   Found in .env.local" -ForegroundColor Green
    Write-Host "   Setting GEMINI_API_KEY automatically..." -ForegroundColor Cyan
    
    # Set secret from .env.local value
    $geminiKey | firebase functions:secrets:set GEMINI_API_KEY
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   GEMINI_API_KEY set successfully" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: Failed to set GEMINI_API_KEY" -ForegroundColor Red
    }
} else {
    Write-Host "   WARNING: Not found in .env.local" -ForegroundColor Yellow
    Write-Host "   Get your key from: https://aistudio.google.com/apikey" -ForegroundColor Gray
    Write-Host ""
    $setupGemini = Read-Host "   Set GEMINI_API_KEY manually? (y/n)"
    
    if ($setupGemini -eq "y") {
        Write-Host "   Enter your Gemini API key (paste and press Enter):" -ForegroundColor Yellow
        firebase functions:secrets:set GEMINI_API_KEY
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   GEMINI_API_KEY set successfully" -ForegroundColor Green
        } else {
            Write-Host "   ERROR: Failed to set GEMINI_API_KEY" -ForegroundColor Red
        }
    } else {
        Write-Host "   Skipped" -ForegroundColor Yellow
    }
}

Write-Host ""

# Azure OpenAI (Optional)
Write-Host "[2] Azure OpenAI Keys (Optional)" -ForegroundColor Cyan

$azureKey = Get-EnvValue "VITE_AZURE_OPENAI_API_KEY"
$azureEndpoint = Get-EnvValue "VITE_AZURE_OPENAI_ENDPOINT"
$azureDeployment = Get-EnvValue "VITE_AZURE_OPENAI_DEPLOYMENT"

if ($azureKey -and $azureEndpoint) {
    Write-Host "   Found Azure config in .env.local" -ForegroundColor Green
    Write-Host "   Setting Azure OpenAI secrets automatically..." -ForegroundColor Cyan
    
    $azureKey | firebase functions:secrets:set AZURE_OPENAI_API_KEY
    if ($LASTEXITCODE -eq 0) { Write-Host "   AZURE_OPENAI_API_KEY set" -ForegroundColor Green }
    
    $azureEndpoint | firebase functions:secrets:set AZURE_OPENAI_ENDPOINT
    if ($LASTEXITCODE -eq 0) { Write-Host "   AZURE_OPENAI_ENDPOINT set" -ForegroundColor Green }
    
    if ($azureDeployment) {
        $azureDeployment | firebase functions:secrets:set AZURE_OPENAI_DEPLOYMENT
        if ($LASTEXITCODE -eq 0) { Write-Host "   AZURE_OPENAI_DEPLOYMENT set" -ForegroundColor Green }
    }
} else {
    Write-Host "   INFO: Not found in .env.local (optional)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verify secrets
Write-Host "Verifying secrets..." -ForegroundColor Cyan
Write-Host ""

try {
    $geminiCheck = firebase functions:secrets:access GEMINI_API_KEY --project staffroom-ai 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "GEMINI_API_KEY is set and accessible" -ForegroundColor Green
    } else {
        Write-Host "WARNING: GEMINI_API_KEY not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "INFO: Could not verify secrets (this is normal)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Secrets setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run: ./deploy.ps1" -ForegroundColor White
Write-Host "  2. Or manually: npm run build; firebase deploy" -ForegroundColor White
Write-Host ""
Write-Host "To update a secret later:" -ForegroundColor Cyan
Write-Host "  firebase functions:secrets:set GEMINI_API_KEY" -ForegroundColor White
Write-Host ""
Write-Host "To view all secrets:" -ForegroundColor Cyan
Write-Host "  firebase functions:secrets:get" -ForegroundColor White
Write-Host ""