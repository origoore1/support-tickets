# Complete Lindgren-X Windows Setup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Lindgren-X Complete Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://raw.githubusercontent.com/origoore1/support-tickets/claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3"

# Step 1: Download package.json
Write-Host "[1/4] Downloading package.json..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "$baseUrl/package.json" -OutFile "package.json"
    Write-Host "  [OK] package.json downloaded" -ForegroundColor Green
} catch {
    Write-Host "  [FAILED] Could not download package.json" -ForegroundColor Red
    exit 1
}

# Step 2: Install npm packages
Write-Host ""
Write-Host "[2/4] Installing npm packages (this may take a minute)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] All packages installed" -ForegroundColor Green
} else {
    Write-Host "  [FAILED] npm install failed" -ForegroundColor Red
    exit 1
}

# Step 3: Create .env file if it doesn't exist
Write-Host ""
Write-Host "[3/4] Checking .env file..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    @"
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lindgren_x_v2
DB_USER=postgres
DB_PASSWORD=

# Server Configuration
PORT=3000

# Paths
RAW_DATA_PATH=./raw_ingest
LOGS_PATH=./logs
DEBUG_PATH=./debug
TEMP_PATH=./temp
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "  [OK] Created .env file template" -ForegroundColor Green
    Write-Host "  [INFO] Edit .env to set your database password" -ForegroundColor Cyan
} else {
    Write-Host "  [OK] .env file already exists" -ForegroundColor Green
}

# Step 4: Create required directories
Write-Host ""
Write-Host "[4/4] Creating required directories..." -ForegroundColor Yellow
$dirs = @("raw_ingest", "logs", "debug", "temp")
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "  [OK] Created $dir/" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Make sure PostgreSQL is running" -ForegroundColor White
Write-Host "  2. Edit .env file to set DB_PASSWORD" -ForegroundColor White
Write-Host "  3. Run: npm start" -ForegroundColor White
Write-Host ""

pause
