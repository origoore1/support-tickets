from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field, field_validator
import pandas as pd
import io
import os
import json
import uuid
import fcntl
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(APP_DIR), "data")
os.makedirs(DATA_DIR, exist_ok=True)

app = FastAPI(title="Real Estate Screener Germany - v1", version="1.0.0")

# -----------------------------
# Configuration Constants
# -----------------------------
# Business logic thresholds
VACANCY_THRESHOLD_PCT = 15.0  # Vacancy >= 15% indicates turnaround opportunity
TIME_ON_MARKET_THRESHOLD_DAYS = 180  # >= 180 days suggests seller fatigue
TENANT_MIX_RISK_UNITS = 6  # 6+ units without anchor tenant is risky
ENERGY_UPSIDE_YEAR = 2005  # Buildings <= 2005 have energy upgrade potential

# File upload limits
MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB max CSV file size
MAX_CSV_ROWS = 10000  # Maximum rows to process in one CSV

# Core flags scoring
CORE_FLAGS_FOR_MAYBE = 2  # Minimum core flags to avoid rejection
CORE_FLAGS_FOR_SHORTLIST = 3  # Core flags needed for automatic shortlist
SUPPORT_FLAGS_BOOST = 1  # Support flags needed to boost "maybe" to "shortlist"

# -----------------------------
# Models with Validation
# -----------------------------
class PropertyIn(BaseModel):
    address: str = Field(..., min_length=1, max_length=500)
    city: str = Field(..., min_length=1, max_length=200)
    region: str = Field(..., min_length=1, max_length=200)
    asset_type: str = Field(..., min_length=1, max_length=100)
    gla_sqm: Optional[float] = Field(None, ge=0, le=1000000)
    units: Optional[int] = Field(None, ge=0, le=10000)
    asking_price_eur: Optional[float] = Field(None, ge=0, le=1e9)
    time_on_market_days: Optional[int] = Field(None, ge=0, le=3650)
    year_built: Optional[int] = Field(None, ge=1800, le=2100)
    heating_type: Optional[str] = Field(None, max_length=100)
    anchor_present: Optional[bool] = None
    vacancy_pct: Optional[float] = Field(None, ge=0, le=100)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lon: Optional[float] = Field(None, ge=-180, le=180)
    solar_hint: Optional[bool] = None
    ads_hint: Optional[bool] = None

    @field_validator('vacancy_pct')
    @classmethod
    def validate_vacancy_pct(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('vacancy_pct must be between 0 and 100')
        return v

class FlagOut(BaseModel):
    key: str
    value: bool
    reason: str
    severity: str  # core / support

class PropertyOut(BaseModel):
    id: str
    data: Dict[str, Any]
    flags: List[FlagOut]
    shortlist_status: str  # reject / maybe / shortlist

# -----------------------------
# Thread-safe Storage with File Locking
# -----------------------------
PROPS_FILE = os.path.join(DATA_DIR, "properties.json")
LOCK_FILE = os.path.join(DATA_DIR, "properties.lock")

@contextmanager
def _file_lock(mode='r'):
    """Context manager for thread-safe file operations with exclusive locking."""
    lock_fd = None
    try:
        # Create lock file if it doesn't exist
        lock_fd = os.open(LOCK_FILE, os.O_CREAT | os.O_RDWR)

        # Acquire exclusive lock
        lock_type = fcntl.LOCK_EX if mode == 'w' else fcntl.LOCK_SH
        fcntl.flock(lock_fd, lock_type)

        yield

    finally:
        if lock_fd is not None:
            fcntl.flock(lock_fd, fcntl.LOCK_UN)
            os.close(lock_fd)

def _load_props() -> Dict[str, Any]:
    """Load properties with shared lock."""
    if not os.path.exists(PROPS_FILE):
        return {}

    with _file_lock('r'):
        try:
            with open(PROPS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Validate that loaded data is a dict
                if not isinstance(data, dict):
                    raise ValueError("Properties file corrupted: expected dict")
                return data
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Properties file corrupted: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load properties: {str(e)}"
            )

def _save_props(d: Dict[str, Any]) -> None:
    """Save properties with exclusive lock and atomic write."""
    if not isinstance(d, dict):
        raise ValueError("Can only save dict to properties file")

    with _file_lock('w'):
        # Atomic write: write to temp file, then rename
        temp_file = PROPS_FILE + ".tmp"
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(d, f, ensure_ascii=False, indent=2)

            # Atomic rename
            os.replace(temp_file, PROPS_FILE)
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(temp_file):
                os.remove(temp_file)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save properties: {str(e)}"
            )

def _new_id() -> str:
    """Generate unique ID using UUID4 to prevent collisions."""
    return str(uuid.uuid4())

# -----------------------------
# Type-safe Helper Functions
# -----------------------------
def _safe_bool(value: Any) -> bool:
    """Safely convert various types to boolean."""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'y', 't')
    if isinstance(value, (int, float)):
        return bool(value)
    return False

def _safe_str(value: Any) -> str:
    """Safely convert value to string."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)

def _clean_nan(value: Any) -> Any:
    """Convert pandas NaN/NaT to None."""
    if pd.isna(value):
        return None
    return value

# -----------------------------
# Flag engine (v1 - data-driven, no invented numbers)
# -----------------------------
def compute_flags(p: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Compute property flags based on business rules.

    Core flags indicate primary value-add opportunities:
    - vacancy_mid: High vacancy suggesting turnaround potential
    - seller_fatigue: Long time on market suggesting negotiation leverage
    - tenant_mix_risk: Many units without anchor tenant

    Support flags indicate secondary value-add:
    - energy_upside: Opportunities for energy efficiency improvements
    - solar_potential: Roof suitable for solar panels
    - ads_potential: High-visibility location for advertising revenue
    """
    flags = []

    # Core flags
    # 1) Vacancy (proxy: vacancy_pct)
    vac = p.get("vacancy_pct")
    if vac is not None and not pd.isna(vac):
        try:
            vac_float = float(vac)
            flags.append({
                "key": "vacancy_mid",
                "value": vac_float >= VACANCY_THRESHOLD_PCT,
                "reason": f"vacancy_pct={vac_float:.1f}% (>={VACANCY_THRESHOLD_PCT}% triggers turnaround profile)",
                "severity": "core"
            })
        except (ValueError, TypeError):
            pass  # Skip if conversion fails

    # 2) Seller fatigue (proxy: time_on_market_days)
    tom = p.get("time_on_market_days")
    if tom is not None and not pd.isna(tom):
        try:
            tom_int = int(tom)
            flags.append({
                "key": "seller_fatigue",
                "value": tom_int >= TIME_ON_MARKET_THRESHOLD_DAYS,
                "reason": f"time_on_market_days={tom_int} (>={TIME_ON_MARKET_THRESHOLD_DAYS} suggests stuck listing)",
                "severity": "core"
            })
        except (ValueError, TypeError):
            pass

    # 3) Tenant mix risk (proxy: many units without anchor)
    units = p.get("units")
    anchor = p.get("anchor_present")
    if units is not None and anchor is not None and not pd.isna(units) and not pd.isna(anchor):
        try:
            units_int = int(units)
            anchor_bool = _safe_bool(anchor)
            flags.append({
                "key": "tenant_mix_risk",
                "value": (units_int >= TENANT_MIX_RISK_UNITS and not anchor_bool),
                "reason": f"units={units_int}, anchor_present={anchor_bool} ({TENANT_MIX_RISK_UNITS}+ units without anchor is risk)",
                "severity": "core"
            })
        except (ValueError, TypeError):
            pass

    # Support flags
    # Energy upside proxy: older year + gas/oil
    yb = p.get("year_built")
    ht = p.get("heating_type")
    energy_up = False
    reasons = []

    if yb is not None and not pd.isna(yb):
        try:
            yb_int = int(yb)
            if yb_int <= ENERGY_UPSIDE_YEAR:
                energy_up = True
                reasons.append(f"year_built={yb_int} (<={ENERGY_UPSIDE_YEAR})")
        except (ValueError, TypeError):
            pass

    if ht is not None and not pd.isna(ht):
        ht_str = _safe_str(ht).lower()
        if "gas" in ht_str or "oil" in ht_str or "öl" in ht_str:
            energy_up = True
            reasons.append(f"heating_type={p.get('heating_type')} (gas/oil)")

    if reasons:
        flags.append({
            "key": "energy_upside",
            "value": energy_up,
            "reason": "; ".join(reasons),
            "severity": "support"
        })

    # v1: only user-provided hints (no guessing)
    solar_hint = p.get("solar_hint")
    if solar_hint is not None and not pd.isna(solar_hint):
        flags.append({
            "key": "solar_potential",
            "value": _safe_bool(solar_hint),
            "reason": "solar_hint field (set true when roof appears suitable from map/streetview)",
            "severity": "support"
        })

    ads_hint = p.get("ads_hint")
    if ads_hint is not None and not pd.isna(ads_hint):
        flags.append({
            "key": "ads_potential",
            "value": _safe_bool(ads_hint),
            "reason": "ads_hint field (set true when frontage/visibility supports signage)",
            "severity": "support"
        })

    return flags

def shortlist_decision(flags: List[Dict[str, Any]]) -> str:
    """
    Determine shortlist status based on flags.

    Logic:
    - reject: < 2 core flags
    - maybe: 2 core flags but < 3 core flags and < 1 support flag
    - shortlist: >= 3 core flags OR (2 core flags AND >= 1 support flag)

    This ensures properties need significant value-add signals to be shortlisted.
    """
    core_true = sum(1 for f in flags if f["severity"] == "core" and f["value"])
    support_true = sum(1 for f in flags if f["severity"] == "support" and f["value"])

    if core_true < CORE_FLAGS_FOR_MAYBE:
        return "reject"

    if core_true >= CORE_FLAGS_FOR_SHORTLIST or support_true >= SUPPORT_FLAGS_BOOST:
        return "shortlist"

    return "maybe"

# -----------------------------
# API
# -----------------------------
@app.get("/health")
def health():
    """Health check endpoint."""
    # Verify data file is readable
    try:
        _load_props()
        return {"ok": True, "storage": "healthy"}
    except Exception as e:
        return {"ok": False, "storage": "unhealthy", "error": str(e)}

@app.post("/properties", response_model=PropertyOut)
def add_property(prop: PropertyIn):
    """
    Add a single property with validation.

    Thread-safe: uses file locking to prevent race conditions.
    """
    store = _load_props()
    pid = _new_id()
    p = prop.model_dump()
    flags = compute_flags(p)
    status = shortlist_decision(flags)
    store[pid] = {"data": p, "flags": flags, "shortlist_status": status}
    _save_props(store)
    return {"id": pid, "data": p, "flags": flags, "shortlist_status": status}

@app.get("/properties", response_model=List[PropertyOut])
def list_properties(
    limit: int = 100,
    offset: int = 0,
    status_filter: Optional[str] = None
):
    """
    List properties with pagination.

    Args:
        limit: Maximum number of results (default: 100, max: 1000)
        offset: Number of results to skip (default: 0)
        status_filter: Filter by status: 'shortlist', 'maybe', or 'reject'
    """
    # Enforce limits
    limit = min(limit, 1000)
    offset = max(offset, 0)

    store = _load_props()
    out = []
    for pid, obj in store.items():
        out.append({"id": pid, **obj})

    # Filter by status if requested
    if status_filter:
        out = [p for p in out if p.get("shortlist_status") == status_filter]

    # Sort: shortlist first, then maybe, then reject
    out.sort(key=lambda x: (
        0 if x.get("shortlist_status") == "shortlist"
        else 1 if x.get("shortlist_status") == "maybe"
        else 2
    ))

    # Apply pagination
    return out[offset:offset + limit]

@app.get("/properties/count")
def count_properties():
    """Get count of properties by status."""
    store = _load_props()
    counts = {"shortlist": 0, "maybe": 0, "reject": 0, "total": 0}

    for obj in store.values():
        status = obj.get("shortlist_status", "reject")
        counts[status] = counts.get(status, 0) + 1
        counts["total"] += 1

    return counts

@app.post("/ingest/properties-csv")
async def ingest_properties_csv(file: UploadFile = File(...)):
    """
    Bulk import properties from CSV with validation.

    Security features:
    - File size limit enforced
    - Row count limit enforced
    - Full Pydantic validation on each row
    - NaN values cleaned before processing
    - Detailed error reporting

    Returns:
        created: Number of properties successfully created
        skipped: Number of rows skipped due to validation errors
        errors: List of validation errors (first 10)
    """
    # Check file size before reading
    await file.seek(0, 2)  # Seek to end
    size = await file.tell()
    await file.seek(0)  # Seek back to start

    if size > MAX_CSV_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size} bytes (max: {MAX_CSV_SIZE_BYTES} bytes / {MAX_CSV_SIZE_BYTES // 1024 // 1024} MB)"
        )

    # Read file
    try:
        raw = await file.read()
        df = pd.read_csv(io.BytesIO(raw))
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except pd.errors.ParserError as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {e}")

    # Check row count
    if len(df) > MAX_CSV_ROWS:
        raise HTTPException(
            status_code=413,
            detail=f"Too many rows: {len(df)} (max: {MAX_CSV_ROWS})"
        )

    # Validate required columns
    required = {"address", "city", "region", "asset_type"}
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {sorted(list(missing))}"
        )

    store = _load_props()
    created = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            # Convert row to dict and clean NaN values
            p = row.to_dict()
            p = {k: _clean_nan(v) for k, v in p.items()}

            # Validate against Pydantic schema
            validated = PropertyIn(**p)
            p_clean = validated.model_dump()

            # Generate flags and status
            pid = _new_id()
            flags = compute_flags(p_clean)
            status = shortlist_decision(flags)

            store[pid] = {"data": p_clean, "flags": flags, "shortlist_status": status}
            created += 1

        except Exception as e:
            skipped += 1
            if len(errors) < 10:  # Only store first 10 errors
                errors.append({
                    "row": int(idx) + 2,  # +2 because: 0-indexed + header row
                    "error": str(e)
                })

    _save_props(store)

    return {
        "created": created,
        "skipped": skipped,
        "errors": errors,
        "total_rows": len(df)
    }

# Planning and competition endpoints (v1 placeholders for real connectors)
@app.get("/planning/passflag")
def planning_passflag(lat: float, lon: float, radius_m: int = 250):
    """
    Check planning restrictions for a location.

    NOTE: This is a placeholder endpoint. Real implementation requires
    integration with German geoportal APIs.
    """
    return {
        "lat": lat,
        "lon": lon,
        "radius_m": radius_m,
        "planning_pass": None,
        "planning_flags": ["connector_not_configured"],
        "source": "geoportal connector pending"
    }

@app.get("/competition/future")
def competition_future(lat: float, lon: float, radius_km: float = 2.0):
    """
    Analyze future competition risk based on planning applications.

    NOTE: This is a placeholder endpoint. Real implementation requires
    integration with municipal planning databases.
    """
    return {
        "lat": lat,
        "lon": lon,
        "radius_km": radius_km,
        "competition_flag": None,
        "signals": ["connector_not_configured"],
        "source": "planning drafts connector pending"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
