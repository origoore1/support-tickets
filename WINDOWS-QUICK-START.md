# Lindgren-X v2.0 - Windows Quick Start Guide

## Problem You're Experiencing

If you see the error: `Error: Cannot find module 'C:\Users\iritg\lindgren-x-v2.js'`

This means the project files haven't been downloaded to your Windows machine yet.

## Solution: Download All Project Files

### Step 1: Download the PowerShell Script

1. **Open PowerShell** in the directory where you want to install Lindgren-X
   - Right-click in the folder and select "Open PowerShell window here"
   - Or press `Win + X` and select "Windows PowerShell"

2. **Download the setup script:**
   ```powershell
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/origoore1/support-tickets/claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3/download-all-files.ps1" -OutFile "download-all-files.ps1"
   ```

### Step 2: Run the Script

```powershell
.\download-all-files.ps1
```

This will download:
- ✅ `lindgren-x-v2.js` (main entry point)
- ✅ `package.json` (dependencies)
- ✅ `.env.example` (configuration template)
- ✅ All core modules (`core/database.js`, `core/harmonizer.js`, etc.)
- ✅ Database schema (`schema-clean.sql`)
- ✅ All required directories

### Step 3: Complete Setup

After the download completes:

1. **Install PostgreSQL** (if not already installed)
   - Download from: https://www.postgresql.org/download/windows/
   - During installation, remember the password you set for the `postgres` user

2. **Configure the application:**
   ```powershell
   copy .env.example .env
   notepad .env
   ```

   Edit the `.env` file and set your PostgreSQL password:
   ```
   DB_PASSWORD=your_actual_postgres_password
   ```

3. **Install Node.js dependencies:**
   ```powershell
   npm install
   ```

4. **Create the database:**
   ```powershell
   # Connect to PostgreSQL
   psql -U postgres

   # In psql, run:
   CREATE DATABASE lindgren_x_v2;
   \c lindgren_x_v2
   \i schema-clean.sql
   \q
   ```

5. **Start the application:**
   ```powershell
   npm start
   ```

6. **Open your browser:**
   - Navigate to: http://localhost:3000
   - You should see the Lindgren-X dashboard!

## Troubleshooting

### Script won't run - "Execution Policy Error"

If you get an execution policy error, run this first:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
Then try running the script again.

### PostgreSQL not found

Make sure PostgreSQL is installed and in your PATH:
```powershell
psql --version
```

If not found, add PostgreSQL to your PATH or use the full path:
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

### Module still not found after download

Make sure you're in the correct directory:
```powershell
# Check if lindgren-x-v2.js exists
dir lindgren-x-v2.js

# If not found, you're in the wrong directory
# Navigate to where you ran download-all-files.ps1
```

## Need More Help?

Check the other documentation files:
- `SETUP-COMPLETE.md` - Detailed setup instructions
- `WINDOWS-SETUP-GUIDE.md` - Windows-specific guidance
- `LINDGREN-X-README.md` - Project overview

## What This Application Does

Lindgren-X v2.0 is a **Mineral License Intelligence System** that:
- Analyzes government mining databases
- Finds high-value investment opportunities in expired/abandoned mining claims
- Provides a scoring algorithm (MineScore) to rank opportunities
- Offers a web dashboard to browse and analyze opportunities
