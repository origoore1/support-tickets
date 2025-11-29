# Download all Lindgren-X project files
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Downloading Lindgren-X Project Files" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://raw.githubusercontent.com/origoore1/support-tickets/claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3"

# Create directories
$directories = @("core", "connectors", "connectors/specs", "raw_ingest", "logs", "debug", "temp")
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "[+] Created '$dir' directory" -ForegroundColor Green
    }
}

Write-Host ""

# Files to download - COMPLETE LIST
$files = @{
    # Main entry point
    "lindgren-x-v2.js" = "$baseUrl/lindgren-x-v2.js"

    # Configuration files
    "package.json" = "$baseUrl/package.json"
    ".env.example" = "$baseUrl/.env.example"

    # Core modules
    "core/database.js" = "$baseUrl/core/database.js"
    "core/harmonizer.js" = "$baseUrl/core/harmonizer.js"
    "core/connector-framework.js" = "$baseUrl/core/connector-framework.js"

    # Database schema
    "schema-clean.sql" = "$baseUrl/schema-clean.sql"
}

$successCount = 0
$failCount = 0

foreach ($file in $files.Keys) {
    Write-Host "Downloading $file..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $files[$file] -OutFile $file -ErrorAction Stop
        Write-Host "  [OK] $file" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  [FAILED] $file - $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Download Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Success: $successCount files" -ForegroundColor Green
Write-Host "  Failed:  $failCount files" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($successCount -gt 0) {
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Make sure PostgreSQL is running" -ForegroundColor Yellow
    Write-Host "  2. Copy .env.example to .env and edit it" -ForegroundColor Yellow
    Write-Host "  3. Run: npm install" -ForegroundColor Yellow
    Write-Host "  4. Run: npm start" -ForegroundColor Yellow
} else {
    Write-Host "All downloads failed. Please check your internet connection." -ForegroundColor Red
}

Write-Host ""
pause
