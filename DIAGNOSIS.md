# LINDGREN-X v2.0 - Dashboard Metrics Issue Diagnosis

## Problem Summary
The dashboard shows "78 records inserted" but all metrics display 0:
- Total Claims: 0 (should be 78)
- Opportunities: 0 (expected if MineScore not run)
- Expired Claims: 0
- Abandoned Claims: 0
- Active Sources: 1 ✓

## Root Causes Identified

### Issue #1: BLM Data Source Contains Only Active Claims
**CRITICAL FINDING**: The Nevada BLM API endpoint returns only NON-CLOSED claims:
```
URL: .../BLM_Natl_MLRS_Mining_Claims_Not_Closed/...
```

This means the 78 records are likely:
- **Active** claims (not investment opportunities)
- **NOT** expired or abandoned claims

**Impact**:
- Expired Claims = 0 ✓ (correct, none in dataset)
- Abandoned Claims = 0 ✓ (correct, none in dataset)
- Opportunities = 0 ✓ (MineScore only scores expired/abandoned)

### Issue #2: Total Claims Showing 0 (Should Be 78)
Possible causes:
1. **Transaction not committed** - Data inserted but transaction rolled back
2. **Insertion error** - Bulk insert failed silently
3. **Database query timing** - Dashboard loaded before INSERT completed
4. **Connection issue** - Different database instances

### Issue #3: Status Field Mapping Issues
The connector spec defines status transformations but they're not being applied by the connector framework.

**Connector Spec** (lines 55-60):
```yaml
transformations:
  status_mapping:
    "Active": "active"
    "Expired": "expired"
    "Closed": "closed"
    "Forfeited": "abandoned"
    "Pending": "pending"
```

**Problem**: The connector framework doesn't use these mappings - it relies entirely on the harmonizer's fuzzy matching.

### Issue #4: Field Mapping Mismatch
The connector spec maps to BLM fields that may not exist or have different names:
```yaml
field_mappings:
  external_id: "properties.CSE_NR"
  claim_status: "properties.CSE_DISP"
  commodity: "properties.CSE_TYPE_NR"
```

If these field names don't match the actual GeoJSON response, all claims will have NULL/missing data.

## Diagnostic Steps

Run these commands on your local machine where the app is running:

### Step 1: Check Database Contents
```bash
node debug-database.js
```

This will show you:
- Actual number of claims in database
- Status breakdown
- Sample claim data
- Connector run history

### Step 2: Check Raw API Response
```bash
node check-blm-api.js
```

This will:
- Fetch actual data from BLM API
- Show field names and structure
- Display sample claim statuses
- Verify data availability

### Step 3: Test Data Harmonization
```bash
node test-harmonizer.js
```

This will:
- Test the harmonization process
- Show what status values are being produced
- Identify mapping issues

## Expected Findings

Based on the API endpoint name ("Not_Closed"), you should see:
- **78 active/pending claims** in the database
- **0 expired claims** (none available from this API)
- **0 abandoned claims** (none available from this API)
- **0 opportunities** (MineScore won't score active claims)

## Solutions

### Solution #1: Use Correct BLM API Endpoint
The current endpoint only returns open claims. To find expired/abandoned claims, you need a different API endpoint or data source.

**Action**: Update `connectors/specs/US_BLM_NV.yaml` to use an endpoint that includes closed/expired claims.

### Solution #2: Fix Connector Framework to Apply Transformations
The connector framework should apply the status_mapping defined in the YAML spec.

**Action**: See `fix-connector-transformations.js`

### Solution #3: Verify Field Mappings
Check that the BLM GeoJSON response actually has the fields referenced in the connector spec.

**Action**: Run `check-blm-api.js` to see actual field names

### Solution #4: Score All Claims (Not Just Expired/Abandoned)
Modify the MineScore algorithm to score ALL claims, not just expired/abandoned ones.

**Action**: See `fix-minescore-query.js`

## Quick Fix

If you want to see the system working with the current data:

1. **Verify data is actually in database**:
   ```bash
   node debug-database.js
   ```

2. **If data is there but dashboard shows 0**, restart the application:
   ```bash
   npm start
   ```

3. **If data is NOT there**, check the connector run logs for errors

4. **Modify MineScore to score active claims too**:
   - Edit `lindgren-x-v2.js` line 218
   - Change: `WHERE c.claim_status IN ('expired', 'abandoned')`
   - To: `WHERE 1=1  -- Score all claims`

5. **Run MineScore algorithm** from the dashboard

## Files Created

- `debug-database.js` - Database diagnostic script
- `check-blm-api.js` - BLM API response checker
- `test-harmonizer.js` - Harmonization tester
- `fix-connector-transformations.js` - Apply YAML transformations
- `fix-minescore-query.js` - Score all claims, not just expired

Run these on your Windows machine where PostgreSQL is running.
