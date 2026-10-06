param(
  [string]$ProjectId = "staffroom-ai",
  [string]$Region = "asia-south1",
  [string]$ServiceName = "staffroom-backend"
)

$ErrorActionPreference = "Stop"

Write-Host "Staffroom AI deploy (Cloud Run + Firebase Hosting)" -ForegroundColor Cyan
Write-Host "Project: $ProjectId | Region: $Region | Service: $ServiceName" -ForegroundColor Gray

# Preflight checks
$required = @("gcloud", "firebase", "npm")
foreach ($cmd in $required) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $cmd"
  }
}

# Set active project
Write-Host "Configuring gcloud project..." -ForegroundColor Cyan
gcloud config set project $ProjectId | Out-Null

Write-Host "Enabling required services..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com | Out-Null

# Build and deploy backend
$image = "gcr.io/$ProjectId/$ServiceName"
Write-Host "Building backend image: $image" -ForegroundColor Cyan
gcloud builds submit backend --tag $image

Write-Host "Deploying Cloud Run service..." -ForegroundColor Cyan
gcloud run deploy $ServiceName `
  --image $image `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --set-env-vars "NODE_ENV=production,CORS_ALLOWED_ORIGINS=https://staffroom-ai.web.app,https://staffroom-ai.firebaseapp.com" `
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest"

$backendUrl = (gcloud run services describe $ServiceName --region $Region --format "value(status.url)").Trim()
if (-not $backendUrl) {
  throw "Failed to fetch Cloud Run service URL"
}

Write-Host "Cloud Run URL: $backendUrl" -ForegroundColor Green

# Build and deploy frontend
Write-Host "Building frontend with Cloud Run backend URL..." -ForegroundColor Cyan
$env:VITE_BACKEND_URL = $backendUrl
npm run build

Write-Host "Deploying Firebase Hosting + Firestore rules..." -ForegroundColor Cyan
firebase deploy --only hosting,firestore:rules

Write-Host "Deployment complete." -ForegroundColor Green
Write-Host "Frontend: https://staffroom-ai.web.app" -ForegroundColor White
Write-Host "Backend:  $backendUrl" -ForegroundColor White
