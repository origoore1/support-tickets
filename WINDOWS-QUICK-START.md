# Lindgren-X v2.0 - Windows Quick Start Guide

## Problem You're Experiencing

If you see the error: `Error: Cannot find module 'C:\Users\iritg\lindgren-x-v2.js'`

This means the project files haven't been downloaded to your Windows machine yet.

## Solution: Download All Project Files

### Step 1: Create Project Folder and Download Setup Script

1. **Create a project folder** (IMPORTANT - Remember this location!)
   ```powershell
   # Create the project folder
   mkdir C:\Users\$env:USERNAME\lindgren-x-v2

   # Navigate INTO the project folder
   cd C:\Users\$env:USERNAME\lindgren-x-v2
   ```

2. **Download the setup script:**
   ```powershell
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/origoore1/support-tickets/claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3/download-all-files.ps1" -OutFile "download-all-files.ps1"
   ```

### Step 2: Run the Script

⚠️ **IMPORTANT**: Make sure you're still in the `lindgren-x-v2` folder!

```powershell
# Verify you're in the correct folder
pwd
# Should show: C:\Users\YourName\lindgren-x-v2

# Run the download script
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
   # CRITICAL: Make sure you're in the project folder first!
   cd C:\Users\$env:USERNAME\lindgren-x-v2

   # Verify you're in the correct location
   dir lindgren-x-v2.js
   # You should see the file listed

   # Now start the application
   npm start
   ```

6. **Open your browser:**
   - Navigate to: http://localhost:3000
   - You should see the Lindgren-X dashboard!

## Troubleshooting

### "Connector spec not found" Error

If you see an error like: `Connector spec not found: C:\Users\iritg\connectors\specs\US_BLM_NV.yaml`

**This means you're running the application from the wrong directory!**

**Solution:**
1. Close the application (Ctrl+C)
2. Navigate to the project folder:
   ```powershell
   cd C:\Users\$env:USERNAME\lindgren-x-v2
   ```
3. Verify you're in the right place:
   ```powershell
   dir lindgren-x-v2.js
   # You should see the file
   ```
4. Start the application again:
   ```powershell
   npm start
   ```

**Why this happens:**
- The application needs to run from the project folder (where `lindgren-x-v2.js` is located)
- If you run it from your home directory (`C:\Users\YourName`), it can't find the connector files
- Always make sure PowerShell's current directory is the project folder before running `npm start`

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
