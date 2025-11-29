# Getting Started with Lindgren-X v2.0 on Windows

## ⚠️ Seeing Password Authentication Error?

If you're getting this error:
```
Database connection failed: password authentication failed for user "postgres"
```

**Run this simple fix script:**

```powershell
.\fix-password.ps1
```

This script will:
1. ✅ Prompt you for your PostgreSQL password
2. ✅ Update your `.env` file automatically
3. ✅ Find PostgreSQL on your system
4. ✅ Create the database and apply the schema
5. ✅ Test the connection

**Then start the application:**
```powershell
npm start
```

---

## First Time Setup

### Prerequisites

1. **Node.js** - Download from https://nodejs.org/
2. **PostgreSQL** - Download from https://www.postgresql.org/download/windows/
   - During installation, remember your `postgres` user password!
   - Make sure to install PostGIS extension

3. **Install project dependencies:**
   ```powershell
   npm install
   ```

### Setup Database

**Option 1: Quick Fix Script (Easiest)**
```powershell
.\fix-password.ps1
```

**Option 2: Full Setup Script**
```powershell
.\setup-postgresql-windows.ps1
```

**Option 3: Manual Setup**

1. Update `.env` file with your PostgreSQL password:
   ```env
   DB_PASSWORD=your_actual_password
   ```

2. Use pgAdmin to:
   - Create database: `lindgren_x_v2`
   - Run the SQL file: `database/schema.sql`

### Start the Application

```powershell
npm start
```

Then open your browser to: **http://localhost:3000**

---

## Common Issues

### "psql is not recognized"

Don't worry! The `fix-password.ps1` script will find PostgreSQL automatically. You don't need psql in your PATH.

If you want to add it manually:
1. Find PostgreSQL folder (usually `C:\Program Files\PostgreSQL\15\bin`)
2. Add to System PATH environment variable
3. Restart PowerShell

### "Cannot find PostgreSQL"

If the scripts can't find PostgreSQL:
1. Open **pgAdmin** (comes with PostgreSQL)
2. Create database: `lindgren_x_v2`
3. Open Query Tool
4. Run the contents of `database\schema.sql`
5. Update `.env` with your password
6. Run `npm start`

### "Port 3000 already in use"

Change the port in `.env`:
```env
PORT=3001
```

---

## What's Next?

Once the application is running:

1. **View Dashboard** - http://localhost:3000
2. **Run Connectors** - Click "Run Connector" to fetch mining claim data
3. **Analyze Opportunities** - Click "Run MineScore Algorithm"
4. **View Results** - See top-ranked mining investment opportunities

---

## Need More Help?

See the detailed troubleshooting guide: [WINDOWS_SETUP.md](WINDOWS_SETUP.md)
