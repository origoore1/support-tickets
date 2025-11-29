# Lindgren-X v2.0 PostgreSQL Setup Script for Windows
# This script helps you configure PostgreSQL for the Lindgren-X system

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Lindgren-X v2.0 - PostgreSQL Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Check if PostgreSQL is installed
Write-Host "[1/6] Checking PostgreSQL installation..." -ForegroundColor Yellow

$pgPath = $null
$possiblePaths = @(
    "C:\Program Files\PostgreSQL\*\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe",
    "C:\PostgreSQL\*\bin\psql.exe"
)

foreach ($pattern in $possiblePaths) {
    $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $pgPath = Split-Path -Parent $found.FullName
        break
    }
}

if (-not $pgPath) {
    Write-Host "X PostgreSQL not found!" -ForegroundColor Red
    Write-Host "`nPlease install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "Then run this script again.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "  PostgreSQL found at: $pgPath" -ForegroundColor Green
$env:PATH = "$pgPath;$env:PATH"

# Step 2: Check if PostgreSQL service is running
Write-Host "`n[2/6] Checking PostgreSQL service..." -ForegroundColor Yellow

$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $pgService) {
    Write-Host "X PostgreSQL service not found!" -ForegroundColor Red
    Write-Host "`nPlease start PostgreSQL service manually." -ForegroundColor Yellow
    exit 1
}

if ($pgService.Status -ne "Running") {
    Write-Host "  PostgreSQL service is stopped. Attempting to start..." -ForegroundColor Yellow
    try {
        Start-Service $pgService.Name
        Write-Host "  PostgreSQL service started successfully!" -ForegroundColor Green
    } catch {
        Write-Host "X Failed to start PostgreSQL service!" -ForegroundColor Red
        Write-Host "  Please start it manually from Services (services.msc)" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "  PostgreSQL service is running!" -ForegroundColor Green
}

# Step 3: Get PostgreSQL password
Write-Host "`n[3/6] PostgreSQL credentials..." -ForegroundColor Yellow

Write-Host "`nWhat is your PostgreSQL 'postgres' user password?" -ForegroundColor Cyan
Write-Host "(If you just installed PostgreSQL, this is the password you set during installation)" -ForegroundColor Gray

$securePassword = Read-Host "Enter password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

if ([string]::IsNullOrWhiteSpace($password)) {
    Write-Host "X Password cannot be empty!" -ForegroundColor Red
    exit 1
}

# Step 4: Test PostgreSQL connection
Write-Host "`n[4/6] Testing database connection..." -ForegroundColor Yellow

$env:PGPASSWORD = $password
$testResult = & psql -U postgres -h localhost -p 5432 -c "SELECT 1;" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Database connection failed!" -ForegroundColor Red
    Write-Host "  Error: $testResult" -ForegroundColor Red
    Write-Host "`nPlease verify:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL is running" -ForegroundColor Yellow
    Write-Host "  2. The password is correct" -ForegroundColor Yellow
    Write-Host "  3. PostgreSQL is listening on port 5432" -ForegroundColor Yellow
    exit 1
}

Write-Host "  Database connection successful!" -ForegroundColor Green

# Step 5: Create/verify database
Write-Host "`n[5/6] Setting up lindgren_x_v2 database..." -ForegroundColor Yellow

$dbExists = & psql -U postgres -h localhost -p 5432 -lqt 2>&1 | Select-String -Pattern "lindgren_x_v2"

if (-not $dbExists) {
    Write-Host "  Creating database..." -ForegroundColor Yellow
    & psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE lindgren_x_v2;" 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Database created successfully!" -ForegroundColor Green
    } else {
        Write-Host "X Failed to create database!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  Database already exists!" -ForegroundColor Green
}

# Run schema.sql
if (Test-Path ".\database\schema.sql") {
    Write-Host "  Running schema.sql..." -ForegroundColor Yellow
    & psql -U postgres -h localhost -p 5432 -d lindgren_x_v2 -f ".\database\schema.sql" 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Schema applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "! Schema may already exist (this is okay)" -ForegroundColor Yellow
    }
}

# Step 6: Update .env file
Write-Host "`n[6/6] Updating .env file..." -ForegroundColor Yellow

if (Test-Path ".\.env") {
    $envContent = Get-Content ".\.env" -Raw
    $envContent = $envContent -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$password"
    Set-Content ".\.env" -Value $envContent -NoNewline
    Write-Host "  .env file updated!" -ForegroundColor Green
} else {
    Write-Host "  Creating .env file..." -ForegroundColor Yellow
    $envTemplate = @"
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lindgren_x_v2
DB_USER=postgres
DB_PASSWORD=$password

# Application Configuration
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info

# Data Storage Paths
RAW_DATA_PATH=./raw_ingest
LOGS_PATH=./logs
DEBUG_PATH=./debug
TEMP_PATH=./temp
"@
    Set-Content ".\.env" -Value $envTemplate
    Write-Host "  .env file created!" -ForegroundColor Green
}

# Clear password from environment
$env:PGPASSWORD = $null

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nYou can now start Lindgren-X v2.0 with:" -ForegroundColor Cyan
Write-Host "  npm start" -ForegroundColor White
Write-Host "`nOr run the main script:" -ForegroundColor Cyan
Write-Host "  node lindgren-x-v2.js" -ForegroundColor White
Write-Host ""
