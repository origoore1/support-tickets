# Windows Setup Guide for Lindgren-X v2.0

## Quick Start

If you're seeing the error:
```
Database connection failed: password authentication failed for user "postgres"
```

Follow these steps:

### Method 1: Quick Password Fix (Easiest! ⚡)

Run the simple password fix script:

```powershell
.\fix-password.ps1
```

This will prompt for your password, update your `.env` file, and set up the database automatically.

### Method 2: Full Automated Setup

Run the comprehensive setup script:

```powershell
.\setup-postgresql-windows.ps1
```

This script will:
1. Check if PostgreSQL is installed
2. Verify the PostgreSQL service is running
3. Prompt for your PostgreSQL password
4. Test the database connection
5. Create the `lindgren_x_v2` database
6. Apply the schema
7. Update your `.env` file with the correct password

**Note:** Both automated scripts will find PostgreSQL automatically - you don't need `psql` in your PATH!

### Method 3: Manual Setup

#### 1. Install PostgreSQL

If you don't have PostgreSQL installed:
- Download from: https://www.postgresql.org/download/windows/
- During installation, remember the password you set for the `postgres` user
- Make sure to install the PostGIS extension (required for spatial queries)

#### 2. Start PostgreSQL Service

1. Open Services (press `Win + R`, type `services.msc`)
2. Find the PostgreSQL service (e.g., `postgresql-x64-15`)
3. Right-click and select "Start" if it's not running

#### 3. Update `.env` File

Edit the `.env` file in the project root and replace `your_password_here` with your actual PostgreSQL password:

```env
DB_PASSWORD=your_actual_password
```

#### 4. Create Database

Open PowerShell in the project directory and run:

```powershell
# Set password as environment variable (replace with your password)
$env:PGPASSWORD = "your_actual_password"

# Create database
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE lindgren_x_v2;"

# Apply schema
psql -U postgres -h localhost -p 5432 -d lindgren_x_v2 -f .\database\schema.sql

# Clear password from environment
$env:PGPASSWORD = $null
```

#### 5. Start the Application

```powershell
npm start
```

## Troubleshooting

### Issue: "psql is not recognized"

**Solution:** Add PostgreSQL bin directory to your PATH:

1. Find your PostgreSQL installation (usually `C:\Program Files\PostgreSQL\15\bin`)
2. Add it to your system PATH environment variable
3. Restart PowerShell

### Issue: "password authentication failed"

**Possible causes:**
1. Wrong password in `.env` file
2. PostgreSQL using different authentication method

**Solution:**
1. Verify your password by connecting manually:
   ```powershell
   psql -U postgres -h localhost
   ```
2. If you forgot your password, reset it:
   - Edit `pg_hba.conf` (in PostgreSQL data directory)
   - Change `md5` to `trust` for localhost
   - Restart PostgreSQL service
   - Run: `psql -U postgres -c "ALTER USER postgres PASSWORD 'new_password';"`
   - Change `trust` back to `md5` in `pg_hba.conf`
   - Restart PostgreSQL service

### Issue: "database does not exist"

**Solution:**
Run the setup script or manually create the database:
```powershell
psql -U postgres -c "CREATE DATABASE lindgren_x_v2;"
```

### Issue: "PostGIS extension not found"

**Solution:**
Install PostGIS:
1. Download from: https://postgis.net/install/
2. Or use Stack Builder (comes with PostgreSQL installer)
3. Then run: `psql -U postgres -d lindgren_x_v2 -c "CREATE EXTENSION postgis;"`

## Verification

After setup, verify everything works:

```powershell
# Test database connection
psql -U postgres -d lindgren_x_v2 -c "SELECT version();"

# Start the application
npm start
```

You should see:
```
LINDGREN-X v2.0 - Mineral License Intelligence System
Database connection successful!
Server running on http://localhost:3000
```

## Next Steps

Once setup is complete:

1. Open your browser to `http://localhost:3000`
2. You should see the Lindgren-X dashboard
3. Click "Run Connector" to fetch mining claim data
4. Click "Run MineScore Algorithm" to analyze opportunities

## Support

If you continue having issues:
1. Check that PostgreSQL service is running
2. Verify your password is correct
3. Make sure port 5432 is not blocked by firewall
4. Check PostgreSQL logs in `C:\Program Files\PostgreSQL\15\data\log`
