# Real Estate API - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pip install -r api_requirements.txt
```

### 2. Run the API

```bash
python real_estate_api.py
```

The API will start at `http://localhost:8000`

### 3. View Interactive Documentation

Open your browser to:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 📖 API Examples

### Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "ok": true,
  "storage": "healthy"
}
```

### Add a Single Property

```bash
curl -X POST http://localhost:8000/properties \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Hauptstraße 123",
    "city": "Berlin",
    "region": "Berlin",
    "asset_type": "Retail",
    "gla_sqm": 500,
    "units": 3,
    "asking_price_eur": 1500000,
    "time_on_market_days": 200,
    "year_built": 1990,
    "heating_type": "gas",
    "anchor_present": false,
    "vacancy_pct": 20,
    "lat": 52.52,
    "lon": 13.405
  }'
```

Response:
```json
{
  "id": "a3bb189e-8bf9-4558-8f8a-4e1e2f1e3f3f",
  "data": { ... },
  "flags": [
    {
      "key": "vacancy_mid",
      "value": true,
      "reason": "vacancy_pct=20.0% (>=15.0% triggers turnaround profile)",
      "severity": "core"
    },
    {
      "key": "seller_fatigue",
      "value": true,
      "reason": "time_on_market_days=200 (>=180 suggests stuck listing)",
      "severity": "core"
    }
  ],
  "shortlist_status": "maybe"
}
```

### List Properties

```bash
# Get first 10 properties
curl http://localhost:8000/properties?limit=10&offset=0

# Get only shortlisted properties
curl http://localhost:8000/properties?status_filter=shortlist

# Get properties with pagination
curl http://localhost:8000/properties?limit=50&offset=100
```

### Get Property Counts

```bash
curl http://localhost:8000/properties/count
```

Response:
```json
{
  "shortlist": 5,
  "maybe": 12,
  "reject": 3,
  "total": 20
}
```

### Bulk Import from CSV

Create a file `properties.csv`:
```csv
address,city,region,asset_type,gla_sqm,units,asking_price_eur,time_on_market_days,year_built,heating_type,anchor_present,vacancy_pct
Hauptstraße 1,Berlin,Berlin,Retail,500,3,1500000,200,1990,gas,false,20
Königsallee 2,Düsseldorf,NRW,Office,1200,8,3000000,100,2010,electric,true,5
Maximilianstraße 3,Munich,Bayern,Mixed,800,12,2500000,250,1985,oil,false,30
```

Upload:
```bash
curl -X POST http://localhost:8000/ingest/properties-csv \
  -F "file=@properties.csv"
```

Response:
```json
{
  "created": 3,
  "skipped": 0,
  "errors": [],
  "total_rows": 3
}
```

---

## 🎯 Business Logic

### Flags

The API computes two types of flags:

#### Core Flags (Primary Value-Add Signals)

1. **vacancy_mid** - Vacancy ≥ 15%
   - Indicates turnaround opportunity
   - Suggests potential for occupancy improvement

2. **seller_fatigue** - Time on market ≥ 180 days
   - Suggests seller motivation
   - Indicates potential for negotiation leverage

3. **tenant_mix_risk** - 6+ units without anchor tenant
   - Indicates tenant concentration risk
   - Opportunity to add anchor and stabilize

#### Support Flags (Secondary Value-Add)

4. **energy_upside** - Built ≤ 2005 or gas/oil heating
   - Energy efficiency improvement opportunity
   - ESG compliance potential

5. **solar_potential** - User-provided hint
   - Set when roof appears suitable for solar panels
   - Additional revenue stream opportunity

6. **ads_potential** - User-provided hint
   - Set when location has high visibility
   - Advertising/signage revenue opportunity

### Shortlist Decision Logic

```
IF core_flags < 2:
  → REJECT

ELIF core_flags >= 3 OR (core_flags >= 2 AND support_flags >= 1):
  → SHORTLIST

ELSE:
  → MAYBE
```

**Examples:**
- 0 core flags → **REJECT** (no value-add)
- 1 core flag + 5 support → **REJECT** (core flags required)
- 2 core flags + 0 support → **MAYBE** (some potential)
- 2 core flags + 1 support → **SHORTLIST** (good opportunity)
- 3+ core flags → **SHORTLIST** (strong opportunity)

---

## 🔧 Configuration

Edit constants in `real_estate_api.py`:

```python
# Business logic thresholds
VACANCY_THRESHOLD_PCT = 15.0  # Adjust vacancy threshold
TIME_ON_MARKET_THRESHOLD_DAYS = 180  # Adjust time on market
TENANT_MIX_RISK_UNITS = 6  # Adjust unit count threshold

# File upload limits
MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB max
MAX_CSV_ROWS = 10000  # Max rows per CSV

# Scoring
CORE_FLAGS_FOR_MAYBE = 2
CORE_FLAGS_FOR_SHORTLIST = 3
SUPPORT_FLAGS_BOOST = 1
```

---

## 🧪 Testing

### Run All Tests

```bash
pytest test_real_estate_api.py -v
```

### Run Specific Test

```bash
pytest test_real_estate_api.py::test_unique_id_generation -v
```

### Test Coverage

The test suite covers:
- ✅ UUID-based ID generation
- ✅ NaN handling in CSV imports
- ✅ Boolean string conversion
- ✅ CSV file size limits
- ✅ Pydantic validation
- ✅ Type safety
- ✅ Business logic
- ✅ Concurrent access
- ✅ All API endpoints
- ✅ Error handling

---

## 📊 Data Storage

Properties are stored in `../data/properties.json` with the following structure:

```json
{
  "a3bb189e-8bf9-4558-8f8a-4e1e2f1e3f3f": {
    "data": {
      "address": "Hauptstraße 123",
      "city": "Berlin",
      ...
    },
    "flags": [
      {
        "key": "vacancy_mid",
        "value": true,
        "reason": "vacancy_pct=20.0% ...",
        "severity": "core"
      }
    ],
    "shortlist_status": "maybe"
  }
}
```

The storage system uses:
- **File locking** to prevent race conditions
- **Atomic writes** to prevent corruption
- **Shared locks** for concurrent reads
- **Exclusive locks** for writes

---

## 🛡️ Security Features

1. **Thread-safe operations** - File locking prevents data loss
2. **DoS protection** - File size and row limits
3. **Input validation** - Comprehensive Pydantic validation
4. **Type safety** - Defensive programming throughout
5. **Unique IDs** - UUID4 prevents collisions
6. **Error handling** - Graceful degradation

---

## 🚨 Error Handling

### Validation Errors (422)

```bash
curl -X POST http://localhost:8000/properties \
  -H "Content-Type: application/json" \
  -d '{"address": "Test", "city": "Berlin", "region": "Berlin",
       "asset_type": "Retail", "vacancy_pct": 150}'
```

Response:
```json
{
  "detail": [
    {
      "loc": ["body", "vacancy_pct"],
      "msg": "ensure this value is less than or equal to 100",
      "type": "value_error.number.not_le"
    }
  ]
}
```

### File Too Large (413)

```bash
# Upload 20MB file
curl -X POST http://localhost:8000/ingest/properties-csv \
  -F "file=@large_file.csv"
```

Response:
```json
{
  "detail": "File too large: 20971520 bytes (max: 10485760 bytes / 10 MB)"
}
```

### CSV Validation Errors (200 with details)

Response includes detailed error information:
```json
{
  "created": 95,
  "skipped": 5,
  "errors": [
    {"row": 12, "error": "vacancy_pct must be between 0 and 100"},
    {"row": 23, "error": "asking_price_eur must be greater than 0"}
  ],
  "total_rows": 100
}
```

---

## 📚 Next Steps

1. **Review security fixes**: See `API_SECURITY_FIXES.md`
2. **Add authentication**: Implement API keys or OAuth2
3. **Set up monitoring**: Add logging and metrics
4. **Scale storage**: Migrate to PostgreSQL or MongoDB
5. **Deploy**: Use Docker + nginx + Let's Encrypt

---

## 🆘 Troubleshooting

### "Properties file corrupted"

```bash
# Backup and recreate
mv ../data/properties.json ../data/properties.json.bak
# Restart API - will create new file
```

### Permission errors

```bash
# Ensure data directory is writable
chmod 755 ../data
```

### Import errors

```bash
# Ensure all dependencies installed
pip install -r api_requirements.txt --upgrade
```

---

## 📞 Support

For detailed information about all security fixes, see `API_SECURITY_FIXES.md`.

For test examples, see `test_real_estate_api.py`.
