# ⚡ LINDGREN-X v2.0 - QUICK START

**Get up and running in 15 minutes!**

---

## 📥 Step 1: Get the Code (2 minutes)

### Windows:

```cmd
# Option A: If you have git
cd C:\Users\YourUsername
git clone https://github.com/origoore1/support-tickets.git lindgren-x-v2
cd lindgren-x-v2
git checkout claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3

# Option B: Download ZIP from GitHub
# Extract to: C:\Users\YourUsername\lindgren-x-v2
```

---

## 🔧 Step 2: Install PostgreSQL (5 minutes)

### Download & Install:

1. **Download:** https://www.postgresql.org/download/windows/
2. **Run installer** - Accept all defaults
3. **Set password** when prompted (e.g., `postgres123`)
4. **Install PostGIS** when Stack Builder launches (check "PostGIS 3.x Bundle")

### Verify Installation:

```cmd
psql --version
# Should show: psql (PostgreSQL) 16.x
```

---

## 🗄️ Step 3: Setup Database (2 minutes)

### Windows:

```cmd
cd C:\Users\YourUsername\lindgren-x-v2
setup-database.bat
```

**Enter your PostgreSQL password when prompted.**

### Linux/Mac:

```bash
cd ~/lindgren-x-v2
./setup-database.sh
```

---

## ⚙️ Step 4: Configure & Install (3 minutes)

### Install Dependencies:

```cmd
npm install
```

### Configure Password:

Edit `.env` file:

```env
DB_PASSWORD=postgres123    ← Change to YOUR password!
```

---

## ✅ Step 5: Validate Setup (1 minute)

```cmd
node test-setup.js
```

You should see:
```
🎉 SUCCESS! Your Lindgren-X v2.0 setup is complete and ready to use!
```

---

## 🚀 Step 6: Start the Application (1 minute)

```cmd
npm start
```

Open browser to: **http://localhost:3000**

---

## 🎯 Step 7: Run First Analysis (1 minute)

1. Click **"Run Connector"** for Nevada BLM
2. Wait 30-60 seconds
3. Click **"Run MineScore Algorithm"**
4. View opportunities in the table!

---

## 📚 Need More Help?

- **Detailed Windows Guide:** `WINDOWS-SETUP-GUIDE.md`
- **Full Documentation:** `LINDGREN-X-README.md`
- **Setup Details:** `SETUP-COMPLETE.md`

---

## 🐛 Quick Troubleshooting

### "psql: command not found"
→ PostgreSQL not in PATH. See WINDOWS-SETUP-GUIDE.md, Section "Issue: psql command not found"

### "Database connection failed"
→ Check PostgreSQL service is running in Windows Services

### "npm install" fails
→ Make sure Node.js is installed from https://nodejs.org/

---

**Total Time: ~15 minutes**
**Then you're analyzing mining opportunities!**

🎉 **Happy mining claim hunting!**
