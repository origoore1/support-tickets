@echo off
REM Lindgren-X v2.0 - Database Fix Script
REM Fixes the CHECK constraint to allow 'unknown' status

echo ======================================================================
echo           Lindgren-X v2.0 Database Fix
echo ======================================================================
echo.
echo This script will fix the database constraint error that prevents
echo inserting claims with 'unknown' status.
echo.

set DB_NAME=lindgren_x_v2
set DB_USER=postgres
set MIGRATION_FILE=database\migrations\001_add_unknown_status.sql

REM Check if PostgreSQL is running
echo Checking PostgreSQL connection...
psql -U %DB_USER% -d %DB_NAME% -c "SELECT NOW();" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Cannot connect to PostgreSQL!
    echo.
    echo Please make sure PostgreSQL is running:
    echo   1. Open Services (services.msc)
    echo   2. Find "postgresql-x64-17" service
    echo   3. Start the service if it's not running
    echo.
    pause
    exit /b 1
)

echo [OK] Connected to database
echo.

REM Apply migration
echo Applying database migration...
if not exist "%MIGRATION_FILE%" (
    echo [ERROR] Migration file not found: %MIGRATION_FILE%
    pause
    exit /b 1
)

psql -U %DB_USER% -d %DB_NAME% -f %MIGRATION_FILE%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to apply migration
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo                    Fix Applied Successfully!
echo ======================================================================
echo.
echo The database now accepts claims with 'unknown' status.
echo You can now run the connector without errors.
echo.
echo Next step: npm start
echo.
pause
