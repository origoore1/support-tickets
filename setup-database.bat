@echo off
REM Lindgren-X v2.0 - Database Setup Script (Windows)
REM Automates PostgreSQL database creation and schema initialization

echo ======================================================================
echo           Lindgren-X v2.0 Database Setup (Windows)
echo ======================================================================
echo.

set DB_NAME=lindgren_x_v2
set DB_USER=postgres
set SCHEMA_FILE=database\schema.sql

REM Step 1: Check if PostgreSQL is installed
echo Step 1: Checking PostgreSQL installation...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL is not installed or not in PATH!
    echo.
    echo Please install PostgreSQL from: https://www.postgresql.org/download/windows/
    echo Make sure to check "Add to PATH" during installation.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('psql --version') do set PSQL_VERSION=%%i
echo [OK] PostgreSQL is installed: %PSQL_VERSION%
echo.

REM Step 2: Check if database exists
echo Step 2: Checking if database exists...
psql -U %DB_USER% -lqt | findstr /C:"%DB_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Database '%DB_NAME%' already exists
    set /p CONFIRM="Do you want to drop and recreate it? (yes/no): "
    if /i "%CONFIRM%"=="yes" (
        echo Dropping existing database...
        dropdb -U %DB_USER% %DB_NAME% 2>nul
        echo [OK] Existing database dropped
    )
)

REM Step 3: Create database
echo Step 3: Creating database '%DB_NAME%'...
psql -U %DB_USER% -lqt | findstr /C:"%DB_NAME%" >nul 2>&1
if %errorlevel% neq 0 (
    createdb -U %DB_USER% %DB_NAME%
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create database
        pause
        exit /b 1
    )
    echo [OK] Database created
) else (
    echo [SKIP] Database already exists
)
echo.

REM Step 4: Enable PostGIS extension
echo Step 4: Enabling PostGIS extension...
psql -U %DB_USER% -d %DB_NAME% -c "CREATE EXTENSION IF NOT EXISTS postgis;"
if %errorlevel% neq 0 (
    echo [WARNING] Could not enable PostGIS
    echo Please install PostGIS from: https://postgis.net/windows_downloads/
    echo After installation, run this script again.
    pause
    exit /b 1
)
echo [OK] PostGIS extension enabled
echo.

REM Step 5: Load schema
echo Step 5: Loading database schema...
if not exist "%SCHEMA_FILE%" (
    echo [ERROR] Schema file not found: %SCHEMA_FILE%
    pause
    exit /b 1
)

psql -U %DB_USER% -d %DB_NAME% -f %SCHEMA_FILE%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to load schema
    pause
    exit /b 1
)
echo [OK] Schema loaded successfully
echo.

REM Step 6: Verify setup
echo Step 6: Verifying database setup...
psql -U %DB_USER% -d %DB_NAME% -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
echo.

echo ======================================================================
echo                    Setup Complete!
echo ======================================================================
echo.
echo Next steps:
echo   1. Edit .env file and set DB_PASSWORD=your_password
echo   2. Run: npm start
echo   3. Open browser to: http://localhost:3000
echo.
pause
