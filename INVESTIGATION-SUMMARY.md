# Investigation Summary: Dashboard Metrics Showing 0

## Problem Report
Dashboard shows "Connector completed! 78 records inserted in 2.84s" but all metrics display 0.

## Investigation Findings

### ✅ What I Found

After analyzing the codebase, I identified **4 root causes**:

### 1. **BLM API Only Returns Active Claims** ⚠️ **CRITICAL**

The Nevada BLM API endpoint is:
```
.../BLM_Natl_MLRS_Mining_Claims_Not_Closed/...
```

**Key word: "Not_Closed"** - This endpoint deliberately excludes closed/expired/abandoned claims!

**Impact**:
- The 78 records inserted are likely **ACTIVE** claims
- **Zero expired claims** (not available from this API)
- **Zero abandoned claims** (not available from this API)
- **Zero opportunities** (MineScore won't score active claims)

This explains why:
- ✓ Expired Claims: 0 (correct - none in the data)
- ✓ Abandoned Claims: 0 (correct - none in the data)
- ✓ Opportunities: 0 (correct - MineScore only scores expired/abandoned)

### 2. **MineScore Algorithm Filters Too Aggressively**

Location: `lindgren-x-v2.js:217-220` and `core/database.js:214-223`

```javascript
async getClaimsForScoring() {
    const result = await this.pool.query(
        `SELECT c.* FROM harmonized_claims c
         LEFT JOIN opportunities o ON c.claim_id = o.claim_id
         WHERE c.claim_status IN ('expired', 'abandoned')  // <-- PROBLEM
         AND o.opportunity_id IS NULL`
    );
}
```

**Issue**: The system ONLY scores claims with status 'expired' or 'abandoned'.
**Impact**: All 78 active claims are skipped during scoring.

### 3. **Total Claims Showing 0 (Should Be 78)**

This suggests one of:
- **Database transaction not committed** - Data inserted but rolled back
- **Connection timing issue** - Dashboard loaded before INSERT completed
- **Insertion error** - Silent failure in bulk insert
- **Wrong database** - App connected to different DB instance

### 4. **Connector Spec Transformations Not Applied**

Location: `connectors/specs/US_BLM_NV.yaml:54-60`

The spec defines status transformations:
```yaml
transformations:
  status_mapping:
    "Active": "active"
    "Expired": "expired"
    "Forfeited": "abandoned"
```

**Issue**: The connector framework (`core/connector-framework.js`) doesn't apply these transformations!
**Impact**: Relies solely on harmonizer's fuzzy matching, which may fail on unexpected values.

---

## Diagnostic Scripts Created

I've created 4 diagnostic scripts to help you investigate on your local machine:

### 1. `debug-database.js`
**Run this first!**
```bash
node debug-database.js
```

Shows:
- Exact count of claims in database
- Breakdown of claim statuses
- Sample claim data
- Connector run history
- Full dashboard statistics

**This will tell you if the 78 records are actually in the database.**

### 2. `check-blm-api.js`
```bash
node check-blm-api.js
```

Shows:
- Actual BLM API response structure
- Available field names
- Sample claim statuses
- Field mapping validation

**This will show you what data the BLM API actually returns.**

### 3. `test-harmonizer.js`
```bash
node test-harmonizer.js
```

Shows:
- How sample data is harmonized
- Status mapping results
- MineScore eligibility
- Data quality scores

**This will show you if the harmonizer is working correctly.**

### 4. `fix-minescore-query.js`
```bash
node fix-minescore-query.js
```

**Interactive script** that:
- Modifies MineScore to score ALL claims (not just expired/abandoned)
- Creates backups before making changes
- Allows you to see the system working with active claims

---

## Recommended Actions

### Step 1: Verify Database State (RUN THIS FIRST)
```bash
node debug-database.js
```

**Expected Results**:
- If you see 78 claims: Database insert worked! ✓
- If you see 0 claims: Database insert failed or transaction rolled back ✗

### Step 2: Check Actual BLM Data
```bash
node check-blm-api.js
```

**Expected Results**:
- All claim statuses will likely be "Active" or similar
- This confirms the API doesn't provide expired/abandoned claims

### Step 3: Quick Fix to See System Working

Option A: **Score active claims** (temporary fix to test system)
```bash
node fix-minescore-query.js
```
Then run MineScore algorithm from dashboard.

Option B: **Find a better data source** (proper fix)
- Look for BLM API endpoint that includes closed/expired claims
- Or use a different data source entirely

---

## Why The System Appears Broken

The Lindgren-X v2.0 system is designed to find **expired and abandoned mining claims** as investment opportunities.

However, the Nevada BLM API endpoint being used (`Mining_Claims_Not_Closed`) only returns **active claims**.

This means:
1. ✓ 78 records inserted (active claims)
2. ✓ 0 expired claims (none in the data)
3. ✓ 0 abandoned claims (none in the data)
4. ✓ 0 opportunities (MineScore won't score active claims)

**The system is working correctly** - it just doesn't have the right data!

---

## Solutions

### Solution 1: Use Different BLM API Endpoint ⭐ **RECOMMENDED**

Find a BLM API endpoint that includes **closed/expired/forfeited** claims.

Possibilities:
- Look for "Closed Claims" or "Historical Claims" endpoints
- Check BLM GIS services catalog
- Contact BLM for access to historical claim data

### Solution 2: Modify System to Score Active Claims

If you want to score and analyze active claims:
1. Run `node fix-minescore-query.js`
2. Restart app: `npm start`
3. Click "Run MineScore Algorithm" on dashboard

This will score all 78 active claims.

### Solution 3: Use Different Data Source

Nevada-specific sources:
- Nevada Division of Minerals
- Nevada Bureau of Mines and Geology
- Commercial mining data providers

### Solution 4: Expand to Multiple States

Add connectors for other states that may have better API access to closed/expired claims.

---

## Technical Details

### Data Flow
```
1. Connector downloads GeoJSON from BLM API
   ↓
2. Harmonizer processes each feature
   ↓
3. Database.bulkInsertHarmonizedClaims() inserts into harmonized_claims table
   ↓
4. User clicks "Run MineScore Algorithm"
   ↓
5. MineScore queries for claims with status IN ('expired', 'abandoned')
   ↓
6. Scores qualifying claims and creates opportunities
```

### Why Total Claims = 0

This is the most concerning issue. Possible causes:

1. **Transaction Rollback**
   ```javascript
   await client.query('BEGIN');
   // ... insertions ...
   await client.query('COMMIT');  // <-- Did this happen?
   ```

2. **Silent Errors in Bulk Insert**
   Check the bulkInsert implementation in `core/database.js:181-209`

3. **Dashboard Cache**
   Try hard-refresh (Ctrl+F5) or restart app

---

## Next Steps

1. **Run `debug-database.js`** to check if data is in database
2. **Run `check-blm-api.js`** to verify BLM API response
3. **Review findings** and decide on solution
4. **Apply fix** based on your goals

---

## Files Created

All in `/home/user/support-tickets/`:
- `DIAGNOSIS.md` - Detailed diagnosis
- `INVESTIGATION-SUMMARY.md` - This file
- `debug-database.js` - Database checker
- `check-blm-api.js` - API response checker
- `test-harmonizer.js` - Harmonization tester
- `fix-minescore-query.js` - Quick fix for scoring active claims

## Questions?

If you need further assistance, provide:
1. Output from `debug-database.js`
2. Output from `check-blm-api.js`
3. Your use case (do you want to score active claims or find expired ones?)
