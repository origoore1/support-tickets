# Download all Lindgren-X project files
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Downloading Lindgren-X Project Files" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://raw.githubusercontent.com/origoore1/support-tickets/claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3"

# Create core directory if it doesn't exist
if (!(Test-Path "core")) {
    New-Item -ItemType Directory -Path "core" | Out-Null
    Write-Host "[+] Created 'core' directory" -ForegroundColor Green
}

# Files to download
$files = @{
    "core/database.js" = "$baseUrl/core/database.js"
    "core/harmonizer.js" = "$baseUrl/core/harmonizer.js"
    "core/connector-framework.js" = "$baseUrl/core/connector-framework.js"
}

foreach ($file in $files.Keys) {
    Write-Host "Downloading $file..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $files[$file] -OutFile $file
        Write-Host "  [OK] $file" -ForegroundColor Green
    } catch {
        Write-Host "  [FAILED] $file - $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Download Complete!" -ForegroundColor Green
Write-Host "  Now run: npm start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

pause
