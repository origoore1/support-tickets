# 🪟 LINDGREN-X v2.0 - WINDOWS SETUP GUIDE

Complete step-by-step guide to set up Lindgren-X v2.0 on Windows 10/11.

---

## 📋 Prerequisites

Before you begin, you'll need:
- Windows 10 or Windows 11
- Administrator access to install software
- Internet connection
- About 30 minutes

---

## 🔧 PART 1: Install Required Software

### Step 1.1: Install Node.js

1. Go to https://nodejs.org/
2. Download the **LTS version** (recommended for most users)
3. Run the installer (`node-v*.msi`)
4. Accept all defaults and click "Next" through the installer
5. Check "Automatically install necessary tools" if prompted

**Verify Installation:**
```cmd
node --version
npm --version
```

You should see version numbers (e.g., v20.x.x and 10.x.x).

---

### Step 1.2: Install PostgreSQL

1. **Download PostgreSQL:**
   - Go to https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Download the latest version (16.x recommended)

2. **Run the Installer:**
   - Double-click the downloaded `.exe` file
   - Click "Next" to start installation

3. **Installation Directory:**
   - Default: `C:\Program Files\PostgreSQL\16`
   - Click "Next"

4. **Select Components:**
   - ✅ PostgreSQL Server (required)
   - ✅ pgAdmin 4 (recommended - database GUI)
   - ✅ Stack Builder (for PostGIS)
   - ✅ Command Line Tools (required)
   - Click "Next"

5. **Data Directory:**
   - Default: `C:\Program Files\PostgreSQL\16\data`
   - Click "Next"

6. **Set Password:**
   - **IMPORTANT:** Set a password for the 'postgres' user
   - Write it down - you'll need it later!
   - Example: `postgres123` (use a stronger password in production)
   - Click "Next"

7. **Port:**
   - Default: `5432`
   - Click "Next"

8. **Locale:**
   - Default locale
   - Click "Next"

9. **Ready to Install:**
   - Click "Next" to begin installation
   - Wait for installation to complete (5-10 minutes)

10. **Finish:**
    - ✅ Check "Launch Stack Builder at exit" (for PostGIS)
    - Click "Finish"

---

### Step 1.3: Install PostGIS (Spatial Extension)

**Stack Builder will launch automatically:**

1. **Select Installation:**
   - Select: `PostgreSQL 16 on port 5432`
   - Click "Next"

2. **Select Applications:**
   - Expand "Spatial Extensions"
   - ✅ Check **PostGIS 3.x Bundle for PostgreSQL 16**
   - Click "Next"

3. **Download Directory:**
   - Accept default
   - Click "Next"

4. **Download:**
   - Wait for download to complete
   - Click "Next"

5. **Install PostGIS:**
   - Click through the PostGIS installer
   - Accept defaults
   - Click "Finish"

**Verify PostgreSQL is Running:**
```cmd
# Open Command Prompt and run:
psql -U postgres -c "SELECT version();"
```

Enter your password when prompted. You should see PostgreSQL version info.

---

## 📂 PART 2: Get Lindgren-X v2.0 Code

### Option A: Clone from GitHub (if you have git)

```cmd
cd C:\Users\YourUsername\
git clone https://github.com/origoore1/support-tickets.git
cd support-tickets
git checkout claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3
```

### Option B: Download ZIP (if no git)

1. Go to your GitHub repository
2. Click "Code" → "Download ZIP"
3. Extract to `C:\Users\YourUsername\lindgren-x-v2\`

---

## 🗄️ PART 3: Set Up Database

### Step 3.1: Navigate to Project Directory

```cmd
cd C:\Users\YourUsername\lindgren-x-v2
```

(Or wherever you extracted/cloned the code)

### Step 3.2: Run Database Setup Script

```cmd
setup-database.bat
```

This script will:
- Create the `lindgren_x_v2` database
- Enable PostGIS extension
- Load the database schema
- Create all tables

**When prompted for password**, enter the PostgreSQL password you set during installation.

**Alternative Manual Setup:**

If the script doesn't work, run these commands manually:

```cmd
# Create database
createdb -U postgres lindgren_x_v2

# Enable PostGIS
psql -U postgres -d lindgren_x_v2 -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Load schema
psql -U postgres -d lindgren_x_v2 -f database\schema.sql
```

---

## ⚙️ PART 4: Configure Lindgren-X

### Step 4.1: Install Node.js Dependencies

```cmd
# In the project directory:
npm install
```

This will install all required packages (Express, PostgreSQL driver, etc.)

### Step 4.2: Configure Environment Variables

1. Open the `.env` file in a text editor (Notepad, VS Code, etc.)

2. Update the `DB_PASSWORD` line with your PostgreSQL password:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lindgren_x_v2
DB_USER=postgres
DB_PASSWORD=postgres123    ← Change this to YOUR password!

PORT=3000
NODE_ENV=development
```

3. Save the file

### Step 4.3: Install Playwright Browsers (Optional)

Only needed for web scraping connectors:

```cmd
npx playwright install chromium
```

This downloads ~400MB, so skip it if you only plan to use download-based connectors like Nevada BLM.

---

## 🚀 PART 5: Start Lindgren-X

### Step 5.1: Start the Application

```cmd
npm start
```

You should see:

```
======================================================================
  🚀 Lindgren-X v2.0 is running!
  📊 Dashboard: http://localhost:3000
  💾 Database: lindgren_x_v2@localhost
======================================================================
```

### Step 5.2: Access the Dashboard

1. Open your web browser
2. Go to: **http://localhost:3000**
3. You should see the Lindgren-X dashboard!

---

## 🎯 PART 6: Run Your First Analysis

### Step 6.1: Run Nevada BLM Connector

1. On the dashboard, find **"US BLM Nevada Mining Claims"**
2. Click **"Run Connector"**
3. Wait 30-60 seconds for data extraction
4. You'll see: "Connector completed! X records inserted"

### Step 6.2: Score Claims with MineScore

1. Click **"Run MineScore Algorithm"**
2. Wait for scoring to complete
3. The dashboard will refresh with opportunities

### Step 6.3: View Opportunities

Scroll down to see the **"Top Investment Opportunities"** table showing:
- MineScore (0-100)
- Location
- Commodity
- Status
- Area
- Risk level
- Estimated acquisition cost

---

## 🔧 Troubleshooting

### Issue: "npm: command not found"

**Solution:** Node.js not installed or not in PATH
- Reinstall Node.js from https://nodejs.org/
- Check "Add to PATH" during installation
- Restart Command Prompt

---

### Issue: "psql: command not found"

**Solution:** PostgreSQL not in PATH

1. Open System Environment Variables:
   - Press `Win + R`
   - Type: `sysdm.cpl`
   - Press Enter
   - Click "Environment Variables"

2. Under "System variables", find `Path`
3. Click "Edit"
4. Click "New"
5. Add: `C:\Program Files\PostgreSQL\16\bin`
6. Click "OK" on all dialogs
7. Restart Command Prompt

---

### Issue: "Database connection failed"

**Solutions:**

1. **Check PostgreSQL is running:**
   - Press `Win + R`
   - Type: `services.msc`
   - Find "postgresql-x64-16"
   - Status should be "Running"
   - If not, right-click → Start

2. **Check password in .env:**
   - Open `.env` file
   - Make sure `DB_PASSWORD` matches your PostgreSQL password

3. **Verify database exists:**
   ```cmd
   psql -U postgres -l
   ```
   You should see `lindgren_x_v2` in the list

---

### Issue: "Port 3000 is already in use"

**Solution:** Another application is using port 3000

1. Edit `.env` file
2. Change: `PORT=3001` (or any other port)
3. Restart the application
4. Access at: `http://localhost:3001`

---

### Issue: "Cannot enable PostGIS extension"

**Solution:** PostGIS not installed

1. Run Stack Builder again:
   - Start Menu → PostgreSQL 16 → Application Stack Builder
   - Install PostGIS 3.x Bundle

2. Or download directly from: https://postgis.net/windows_downloads/

---

## 📝 Daily Usage

### Starting Lindgren-X:

1. Open Command Prompt
2. Navigate to project: `cd C:\Users\YourUsername\lindgren-x-v2`
3. Start app: `npm start`
4. Open browser: http://localhost:3000

### Stopping Lindgren-X:

- Press `Ctrl + C` in the Command Prompt window

---

## 🔒 Security Best Practices

### For Testing/Development:
- ✅ Use a simple password (postgres123)
- ✅ Run on localhost only
- ✅ Keep .env file private

### For Production:
- ⚠️ Use a strong PostgreSQL password (20+ characters)
- ⚠️ Enable authentication on the web dashboard
- ⚠️ Use HTTPS with SSL certificate
- ⚠️ Create a separate database user with limited permissions
- ⚠️ Never commit .env file to version control

---

## 📚 Next Steps

### Add More Data Sources:

Create new YAML files in `connectors\specs\` for:
- Australia DMIRS
- Canada mining databases
- Your custom sources

### Customize MineScore:

Edit `lindgren-x-v2.js` to adjust scoring weights:
- Geological: default 35%
- Historical: default 25%
- Infrastructure: default 15%
- Jurisdiction: default 15%
- Market: default 10%

### Export Data:

Access the API for programmatic access:
- All opportunities: `http://localhost:3000/api/opportunities`
- Filter by country: `http://localhost:3000/api/opportunities?country=USA`
- Filter by score: `http://localhost:3000/api/opportunities?min_score=70`
- Statistics: `http://localhost:3000/api/stats`

---

## 💡 Tips for Success

1. **Run connectors regularly** (weekly/monthly) to get fresh data
2. **Adjust MineScore weights** based on your investment criteria
3. **Filter by commodity** to focus on specific minerals
4. **Export high-value opportunities** for detailed analysis
5. **Create custom connectors** for your target regions

---

## 🆘 Getting Help

### Check the Logs:
```cmd
# View application logs
type logs\app.log

# View debug output
type debug\latest.log
```

### Database Issues:
```cmd
# Check database status
psql -U postgres -d lindgren_x_v2 -c "SELECT COUNT(*) FROM harmonized_claims;"
```

### Application Issues:
- Review `.env` configuration
- Check `package.json` dependencies
- Verify all files are present
- Restart PostgreSQL service

---

## ✅ Success Checklist

Before considering your setup complete:

- [ ] PostgreSQL 16 installed and running
- [ ] PostGIS extension enabled
- [ ] Node.js installed (v14+)
- [ ] Project code downloaded/cloned
- [ ] Database created (`lindgren_x_v2`)
- [ ] Schema loaded (4+ tables)
- [ ] Node modules installed (`npm install`)
- [ ] `.env` configured with correct password
- [ ] Application starts without errors (`npm start`)
- [ ] Dashboard accessible at http://localhost:3000
- [ ] Nevada BLM connector runs successfully
- [ ] MineScore algorithm completes
- [ ] Opportunities visible in dashboard

---

**🎉 Congratulations! You now have a professional mineral license intelligence system running on Windows!**

Version: 2.0.0
Last Updated: November 2025
Platform: Windows 10/11
