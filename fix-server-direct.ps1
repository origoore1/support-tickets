# Fix server.js encoding issue - Direct PowerShell method
Write-Host "Fixing server.js encoding issue..." -ForegroundColor Green

# Download the fixed server.js from GitHub
$url = "https://raw.githubusercontent.com/origoore1/support-tickets/claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3/server.js"

Write-Host "Downloading corrected server.js..." -ForegroundColor Yellow

try {
    Invoke-WebRequest -Uri $url -OutFile "server.js"
    Write-Host "SUCCESS! File downloaded and replaced." -ForegroundColor Green
    Write-Host ""
    Write-Host "Now run: npm start" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: Could not download file." -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}

pause
