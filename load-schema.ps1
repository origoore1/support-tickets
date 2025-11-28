# Lindgren-X v2.0 - Schema Loader (PowerShell)
Write-Host "======================================================================"
Write-Host "         Loading Lindgren-X v2.0 Database Schema"
Write-Host "======================================================================"
Write-Host ""

$env:PGPASSWORD = "Orig1972!"
$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

Write-Host "Loading schema..."
& $psqlPath -U postgres -d lindgren_x_v2 -f "schema-clean.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================================================"
    Write-Host "                    SUCCESS!"
    Write-Host "======================================================================"
    Write-Host ""
    Write-Host "Database schema loaded successfully!"
    Write-Host "Next step: npm start"
} else {
    Write-Host ""
    Write-Host "======================================================================"
    Write-Host "                    ERROR"
    Write-Host "======================================================================"
    Write-Host ""
    Write-Host "Schema loading failed. Error code: $LASTEXITCODE"
}

Write-Host ""
Read-Host "Press Enter to continue"
