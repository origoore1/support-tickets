# Database Error Fix Instructions

## Problem Description

The database constraint errors you're seeing occur because:
1. The Nevada BLM data contains claim status values that don't match our predefined mappings
2. The harmonizer defaults these to 'unknown' status
3. The database CHECK constraint didn't allow 'unknown' as a valid status
4. This caused CHECK constraint violations during claim insertion

## Solution

The database schema has been updated to allow 'unknown' as a valid claim status.

## How to Apply the Fix

### Windows Users

1. **Make sure PostgreSQL is running:**
   - Open Services (press Win+R, type `services.msc`, press Enter)
   - Find "postgresql-x64-17" service
   - If it's not running, right-click and select "Start"

2. **Run the fix script:**
   ```batch
   fix-database.bat
   ```

3. **Restart the application:**
   ```batch
   npm start
   ```

### Linux/Mac Users

1. **Make sure PostgreSQL is running:**
   ```bash
   # Linux
   sudo systemctl start postgresql

   # Mac
   brew services start postgresql
   ```

2. **Run the fix script:**
   ```bash
   node fix-database.js
   ```

3. **Restart the application:**
   ```bash
   npm start
   ```

## Manual Application (if scripts don't work)

If the automated scripts don't work, you can manually apply the fix:

```sql
psql -U postgres -d lindgren_x_v2

-- Run this SQL command:
ALTER TABLE harmonized_claims DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE harmonized_claims ADD CONSTRAINT valid_status
CHECK (claim_status IN ('active', 'expired', 'abandoned', 'pending', 'closed', 'suspended', 'unknown'));
```

## Verification

After applying the fix, run the connector again:
```batch
npm start
```

The claim insertion errors should no longer appear, and you should see:
- All claims inserted successfully
- No "current transaction is aborted" errors
- The MineScore algorithm should find claims to score

## Files Changed

- `database/schema.sql` - Updated CHECK constraint
- `database/migrations/001_add_unknown_status.sql` - Migration script
- `fix-database.js` - Node.js fix script
- `fix-database.bat` - Windows batch fix script

## Need Help?

If you continue to experience issues after applying this fix, please check:
1. PostgreSQL service is running
2. Database credentials in `.env` are correct
3. You have permission to alter the database schema
