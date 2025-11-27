# 📋 LINDGREN-X v2.0 - YOUR INSTALLATION CHECKLIST

**Follow this step-by-step. Check off each box as you complete it.**

---

## ✅ WHAT'S ALREADY DONE (By Me)

- [x] Created all 18 Lindgren-X files (2,179+ lines of code)
- [x] Installed 94 npm packages in the development environment
- [x] Created automated setup scripts (setup-database.bat for Windows)
- [x] Created validation script (test-setup.js)
- [x] Committed and pushed everything to GitHub
- [x] Written complete documentation

**Repository:** `origoore1/support-tickets`
**Branch:** `claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3`

---

## 🎯 WHAT YOU NEED TO DO (On Your Windows Machine)

### PHASE 1: GET THE CODE (5 minutes)

**Option A: Using Git (Recommended)**
```
[ ] Open Command Prompt (Windows Key + R, type "cmd", press Enter)
[ ] Navigate to your desired location:
    cd C:\Users\YourUsername

[ ] Clone the repository:
    git clone https://github.com/origoore1/support-tickets.git lindgren-x-v2

[ ] Navigate into the directory:
    cd lindgren-x-v2

[ ] Switch to the correct branch:
    git checkout claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3

[ ] Verify files exist:
    dir
    (You should see lindgren-x-v2.js, package.json, etc.)
```

**Option B: Download ZIP (If you don't have git)**
```
[ ] Go to: https://github.com/origoore1/support-tickets
[ ] Click "Code" button → "Download ZIP"
[ ] Extract to: C:\Users\YourUsername\lindgren-x-v2
[ ] Open Command Prompt and navigate there:
    cd C:\Users\YourUsername\lindgren-x-v2
```

**Verification:**
```
[ ] Run: dir
    Expected output: You should see these files:
    - lindgren-x-v2.js
    - package.json
    - setup-database.bat
    - test-setup.js
    - QUICK-START.md
```

---

### PHASE 2: INSTALL NODE.JS (5 minutes)

```
[ ] Go to: https://nodejs.org/
[ ] Download the LTS version (Long Term Support)
[ ] Run the installer
[ ] Accept all defaults
[ ] Click "Next" until installation completes
[ ] Restart Command Prompt (close and reopen)
```

**Verification:**
```
[ ] Run: node --version
    Expected: v20.x.x or similar

[ ] Run: npm --version
    Expected: 10.x.x or similar
```

**If you see version numbers, Node.js is installed correctly!**

---

### PHASE 3: INSTALL POSTGRESQL (10 minutes)

```
[ ] Go to: https://www.postgresql.org/download/windows/
[ ] Click "Download the installer"
[ ] Download the latest version (PostgreSQL 16.x recommended)
[ ] Run the installer (postgresql-16-xxx.exe)
```

**During Installation:**
```
[ ] Installation Directory: Accept default (C:\Program Files\PostgreSQL\16)
[ ] Select Components:
    [x] PostgreSQL Server
    [x] pgAdmin 4
    [x] Stack Builder
    [x] Command Line Tools
    Click "Next"

[ ] Data Directory: Accept default
    Click "Next"

[ ] **IMPORTANT** Set Password:
    Password: _____________ (WRITE THIS DOWN!)
    Confirm: _____________
    Click "Next"

[ ] Port: 5432 (default)
    Click "Next"

[ ] Locale: Default locale
    Click "Next"

[ ] Click "Next" to start installation
[ ] Wait for installation (5-10 minutes)
```

**After PostgreSQL Installation:**
```
[ ] Stack Builder will launch automatically
[ ] Select: PostgreSQL 16 on port 5432
[ ] Click "Next"

[ ] Expand "Spatial Extensions"
[ ] Check: PostGIS 3.x Bundle for PostgreSQL 16
[ ] Click "Next"

[ ] Wait for download
[ ] Click "Next" to install PostGIS
[ ] Accept defaults and click through installer
[ ] Click "Finish"
```

**Verification:**
```
[ ] Open NEW Command Prompt (important - close old one first!)
[ ] Run: psql --version
    Expected: psql (PostgreSQL) 16.x

[ ] If you see "psql is not recognized":
    - Go to System Environment Variables
    - Add to PATH: C:\Program Files\PostgreSQL\16\bin
    - Restart Command Prompt and try again
```

---

### PHASE 4: SETUP DATABASE (3 minutes)

```
[ ] Open Command Prompt
[ ] Navigate to project:
    cd C:\Users\YourUsername\lindgren-x-v2

[ ] Run the automated setup script:
    setup-database.bat

[ ] When prompted for password, enter your PostgreSQL password
[ ] Wait for script to complete

[ ] Expected output:
    [OK] PostgreSQL is installed
    [OK] Database created
    [OK] PostGIS extension enabled
    [OK] Schema loaded successfully
    Setup Complete!
```

**If Script Fails:**
```
[ ] Run commands manually:

    createdb -U postgres lindgren_x_v2
    (Enter password when prompted)

    psql -U postgres -d lindgren_x_v2 -c "CREATE EXTENSION IF NOT EXISTS postgis;"
    (Enter password when prompted)

    psql -U postgres -d lindgren_x_v2 -f database\schema.sql
    (Enter password when prompted)
```

---

### PHASE 5: INSTALL NODE DEPENDENCIES (2 minutes)

```
[ ] In the project directory (C:\Users\YourUsername\lindgren-x-v2):

    npm install

[ ] Wait for installation (1-2 minutes)
[ ] Expected: "added 94 packages" or similar
```

---

### PHASE 6: CONFIGURE DATABASE PASSWORD (1 minute)

```
[ ] Open .env file in Notepad:
    notepad .env

[ ] Find the line:
    DB_PASSWORD=your_password_here

[ ] Change it to YOUR PostgreSQL password:
    DB_PASSWORD=YourActualPassword

[ ] Save the file (Ctrl+S)
[ ] Close Notepad
```

---

### PHASE 7: VALIDATE SETUP (1 minute)

```
[ ] Run the validation script:
    node test-setup.js

[ ] Expected output:
    ======================================================================
      TEST SUMMARY
    ======================================================================
      Total Tests: 7
      ✓ Passed: 7
      ✗ Failed: 0
    ======================================================================

    🎉 SUCCESS! Your Lindgren-X v2.0 setup is complete and ready to use!
```

**If Any Tests Fail:**
```
[ ] The script will tell you exactly what's wrong
[ ] Common fixes:
    - "Database connection failed" → Check password in .env
    - "PostGIS not enabled" → Reinstall PostGIS via Stack Builder
    - "Missing tables" → Re-run: psql -U postgres -d lindgren_x_v2 -f database\schema.sql
```

---

### PHASE 8: START THE APPLICATION! (1 minute)

```
[ ] Run:
    npm start

[ ] Expected output:
    ======================================================================
      🚀 Lindgren-X v2.0 is running!
      📊 Dashboard: http://localhost:3000
      💾 Database: lindgren_x_v2@localhost
    ======================================================================

[ ] Open your web browser
[ ] Go to: http://localhost:3000
[ ] You should see the Lindgren-X dashboard!
```

---

### PHASE 9: RUN YOUR FIRST ANALYSIS! (2 minutes)

**On the Dashboard:**
```
[ ] Find "US BLM Nevada Mining Claims"
[ ] Click "Run Connector" button
[ ] Wait 30-60 seconds (it's downloading mining claim data)
[ ] You should see: "Connector completed! X records inserted"

[ ] Click "Run MineScore Algorithm" button
[ ] Wait for scoring to complete
[ ] You should see: "MineScore complete! X claims scored"

[ ] Scroll down to "Top Investment Opportunities" table
[ ] You should see mining claims with scores, locations, commodities!
```

**🎉 CONGRATULATIONS! You're now analyzing mining opportunities!**

---

## 🆘 TROUBLESHOOTING

### Issue: "git is not recognized"
```
Solution: Download GitHub Desktop or Git for Windows
https://git-scm.com/download/win
```

### Issue: "node is not recognized"
```
Solution:
1. Reinstall Node.js from https://nodejs.org/
2. Make sure "Add to PATH" is checked
3. Restart Command Prompt
```

### Issue: "psql is not recognized"
```
Solution:
1. Press Windows Key
2. Search "Environment Variables"
3. Click "Edit system environment variables"
4. Click "Environment Variables" button
5. Under "System variables", find "Path"
6. Click "Edit"
7. Click "New"
8. Add: C:\Program Files\PostgreSQL\16\bin
9. Click "OK" on all dialogs
10. Close and reopen Command Prompt
```

### Issue: "Database connection failed"
```
Solution:
1. Check PostgreSQL service is running:
   - Press Windows Key + R
   - Type: services.msc
   - Find "postgresql-x64-16"
   - Status should be "Running"
   - If not, right-click → Start

2. Check password in .env file matches PostgreSQL password

3. Try connecting manually:
   psql -U postgres -d lindgren_x_v2
   (If this works, password is correct)
```

### Issue: "Cannot enable PostGIS"
```
Solution:
1. Run Stack Builder again:
   - Start Menu → PostgreSQL 16 → Application Stack Builder
2. Install PostGIS 3.x Bundle
3. Restart PostgreSQL service
4. Run: psql -U postgres -d lindgren_x_v2 -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### Issue: "Port 3000 is already in use"
```
Solution:
1. Edit .env file
2. Change: PORT=3001
3. Restart npm start
4. Access at: http://localhost:3001
```

---

## 📞 NEED MORE HELP?

**Detailed Guides:**
- WINDOWS-SETUP-GUIDE.md - Complete step-by-step with screenshots
- QUICK-START.md - Fast 15-minute guide
- LINDGREN-X-README.md - Full documentation

**Run Validation:**
```
node test-setup.js
```
This will tell you exactly what's wrong!

---

## ✅ SUCCESS CHECKLIST

Your setup is complete when you can check all these:

- [ ] npm start runs without errors
- [ ] Dashboard opens at http://localhost:3000
- [ ] Nevada BLM connector runs successfully
- [ ] MineScore algorithm completes
- [ ] Opportunities appear in the table with scores

---

**🎊 Once all checkboxes are checked, you have a fully functional mineral license intelligence system!**

**Time Required:** 20-30 minutes total
**Difficulty:** Beginner-friendly (just follow the steps!)

Good luck! 🚀
