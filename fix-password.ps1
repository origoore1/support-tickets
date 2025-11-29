# Quick Fix for Lindgren-X v2.0 PostgreSQL Password
# This script will prompt for your password and update the .env file

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Lindgren-X v2.0 - Password Fix" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path ".\.env")) {
    Write-Host "X .env file not found!" -ForegroundColor Red
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow

    if (Test-Path ".\.env.example") {
        Copy-Item ".\.env.example" ".\.env"
    } else {
        Write-Host "X .env.example not found either!" -ForegroundColor Red
        Write-Host "Creating new .env file..." -ForegroundColor Yellow

        $envTemplate = @"
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lindgren_x_v2
DB_USER=postgres
DB_PASSWORD=your_password_here

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
    }
}

# Prompt for password
Write-Host "What is your PostgreSQL 'postgres' user password?" -ForegroundColor Cyan
Write-Host "(This is the password you set when you installed PostgreSQL)" -ForegroundColor Gray
Write-Host ""

$securePassword = Read-Host "Enter password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

if ([string]::IsNullOrWhiteSpace($password)) {
    Write-Host "`nX Password cannot be empty!" -ForegroundColor Red
    exit 1
}

# Update .env file
Write-Host "`nUpdating .env file..." -ForegroundColor Yellow

$envContent = Get-Content ".\.env" -Raw
$envContent = $envContent -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$password"
Set-Content ".\.env" -Value $envContent -NoNewline

Write-Host "  .env file updated successfully!" -ForegroundColor Green

# Now try to find PostgreSQL and create the database
Write-Host "`nSearching for PostgreSQL installation..." -ForegroundColor Yellow

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

if ($pgPath) {
    Write-Host "  Found PostgreSQL at: $pgPath" -ForegroundColor Green

    $psqlPath = Join-Path $pgPath "psql.exe"

    Write-Host "`nTesting database connection..." -ForegroundColor Yellow
    $env:PGPASSWORD = $password

    $testResult = & $psqlPath -U postgres -h localhost -p 5432 -c "SELECT 1;" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Connection successful!" -ForegroundColor Green

        # Check if database exists
        Write-Host "`nChecking for lindgren_x_v2 database..." -ForegroundColor Yellow
        $dbExists = & $psqlPath -U postgres -h localhost -p 5432 -lqt 2>&1 | Select-String -Pattern "lindgren_x_v2"

        if (-not $dbExists) {
            Write-Host "  Creating database..." -ForegroundColor Yellow
            & $psqlPath -U postgres -h localhost -p 5432 -c "CREATE DATABASE lindgren_x_v2;" 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Database created!" -ForegroundColor Green
            } else {
                Write-Host "! Could not create database (may already exist)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  Database already exists!" -ForegroundColor Green
        }

        # Apply schema
        if (Test-Path ".\database\schema.sql") {
            Write-Host "`nApplying database schema..." -ForegroundColor Yellow
            & $psqlPath -U postgres -h localhost -p 5432 -d lindgren_x_v2 -f ".\database\schema.sql" 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Schema applied!" -ForegroundColor Green
            } else {
                Write-Host "! Schema may already be applied (this is okay)" -ForegroundColor Yellow
            }
        }

    } else {
        Write-Host "X Connection failed!" -ForegroundColor Red
        Write-Host "  Error: $testResult" -ForegroundColor Red
        Write-Host "`nThe password has been saved to .env, but connection test failed." -ForegroundColor Yellow
        Write-Host "Please verify:" -ForegroundColor Yellow
        Write-Host "  1. PostgreSQL service is running" -ForegroundColor Yellow
        Write-Host "  2. The password you entered is correct" -ForegroundColor Yellow
    }

    $env:PGPASSWORD = $null
} else {
    Write-Host "  PostgreSQL not found in standard locations" -ForegroundColor Yellow
    Write-Host "  Password has been saved to .env file" -ForegroundColor Green
    Write-Host "`nYou'll need to manually create the database:" -ForegroundColor Yellow
    Write-Host "  1. Find your PostgreSQL installation" -ForegroundColor Gray
    Write-Host "  2. Run pgAdmin or use psql to:" -ForegroundColor Gray
    Write-Host "     CREATE DATABASE lindgren_x_v2;" -ForegroundColor Gray
    Write-Host "  3. Then run: .\database\schema.sql" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nYou can now try to start the application:" -ForegroundColor Cyan
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
