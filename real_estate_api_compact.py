from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field, field_validator
import pandas as pd
import io
import os
import json
import uuid
import fcntl
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

# Configuration
APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(APP_DIR), "data")
os.makedirs(DATA_DIR, exist_ok=True)

CONFIG = {
    'vacancy_threshold': 15.0,
    'market_days_threshold': 180,
    'tenant_risk_units': 6,
    'energy_year': 2005,
    'max_csv_bytes': 10 * 1024 * 1024,
    'max_csv_rows': 10000,
    'core_maybe': 2,
    'core_shortlist': 3,
    'support_boost': 1
}

app = FastAPI(title="Real Estate Screener Germany - v1", version="1.0.0")

# Models
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
    severity: str

class PropertyOut(BaseModel):
    id: str
    data: Dict[str, Any]
    flags: List[FlagOut]
    shortlist_status: str

# Storage
PROPS_FILE = os.path.join(DATA_DIR, "properties.json")
LOCK_FILE = os.path.join(DATA_DIR, "properties.lock")

@contextmanager
def _file_lock(mode='r'):
    lock_fd = None
    try:
        lock_fd = os.open(LOCK_FILE, os.O_CREAT | os.O_RDWR)
        fcntl.flock(lock_fd, fcntl.LOCK_EX if mode == 'w' else fcntl.LOCK_SH)
        yield
    finally:
        if lock_fd:
            fcntl.flock(lock_fd, fcntl.LOCK_UN)
            os.close(lock_fd)

def _load_props() -> Dict[str, Any]:
    if not os.path.exists(PROPS_FILE):
        return {}
    with _file_lock('r'):
        try:
            with open(PROPS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, dict):
                    raise ValueError("Properties file corrupted")
                return data
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Load failed: {str(e)}")

def _save_props(d: Dict[str, Any]) -> None:
    with _file_lock('w'):
        temp_file = PROPS_FILE + ".tmp"
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(d, f, ensure_ascii=False, indent=2)
            os.replace(temp_file, PROPS_FILE)
        except Exception as e:
            if os.path.exists(temp_file):
                os.remove(temp_file)
            raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")

# Helpers
def _safe_bool(v):
    if v is None: return False
    if isinstance(v, bool): return v
    if isinstance(v, str): return v.lower() in ('true', '1', 'yes', 'y', 't')
    return bool(v) if isinstance(v, (int, float)) else False

def _safe_str(v):
    return "" if v is None else str(v)

def _clean_nan(v):
    return None if pd.isna(v) else v

# Flag Engine
def compute_flags(p: Dict[str, Any]) -> List[Dict[str, Any]]:
    flags = []

    # Vacancy flag
    if (vac := p.get("vacancy_pct")) is not None and not pd.isna(vac):
        try:
            flags.append({
                "key": "vacancy_mid",
                "value": float(vac) >= CONFIG['vacancy_threshold'],
                "reason": f"vacancy_pct={float(vac):.1f}% (>={CONFIG['vacancy_threshold']}%)",
                "severity": "core"
            })
        except (ValueError, TypeError):
            pass

    # Seller fatigue flag
    if (tom := p.get("time_on_market_days")) is not None and not pd.isna(tom):
        try:
            flags.append({
                "key": "seller_fatigue",
                "value": int(tom) >= CONFIG['market_days_threshold'],
                "reason": f"time_on_market_days={int(tom)} (>={CONFIG['market_days_threshold']})",
                "severity": "core"
            })
        except (ValueError, TypeError):
            pass

    # Tenant mix risk flag
    units, anchor = p.get("units"), p.get("anchor_present")
    if units is not None and anchor is not None and not pd.isna(units) and not pd.isna(anchor):
        try:
            flags.append({
                "key": "tenant_mix_risk",
                "value": int(units) >= CONFIG['tenant_risk_units'] and not _safe_bool(anchor),
                "reason": f"units={int(units)}, anchor={_safe_bool(anchor)}",
                "severity": "core"
            })
        except (ValueError, TypeError):
            pass

    # Energy upside flag
    energy_up, reasons = False, []
    if (yb := p.get("year_built")) is not None and not pd.isna(yb):
        try:
            if int(yb) <= CONFIG['energy_year']:
                energy_up = True
                reasons.append(f"year_built={int(yb)}")
        except (ValueError, TypeError):
            pass

    if (ht := p.get("heating_type")) is not None and not pd.isna(ht):
        ht_str = _safe_str(ht).lower()
        if any(x in ht_str for x in ["gas", "oil", "öl"]):
            energy_up = True
            reasons.append(f"heating={p.get('heating_type')}")

    if reasons:
        flags.append({
            "key": "energy_upside",
            "value": energy_up,
            "reason": "; ".join(reasons),
            "severity": "support"
        })

    # Solar flag
    if (solar := p.get("solar_hint")) is not None and not pd.isna(solar):
        flags.append({
            "key": "solar_potential",
            "value": _safe_bool(solar),
            "reason": "solar_hint provided",
            "severity": "support"
        })

    # Ads flag
    if (ads := p.get("ads_hint")) is not None and not pd.isna(ads):
        flags.append({
            "key": "ads_potential",
            "value": _safe_bool(ads),
            "reason": "ads_hint provided",
            "severity": "support"
        })

    return flags

def shortlist_decision(flags: List[Dict[str, Any]]) -> str:
    core = sum(1 for f in flags if f["severity"] == "core" and f["value"])
    support = sum(1 for f in flags if f["severity"] == "support" and f["value"])

    if core < CONFIG['core_maybe']:
        return "reject"
    if core >= CONFIG['core_shortlist'] or support >= CONFIG['support_boost']:
        return "shortlist"
    return "maybe"

# API Endpoints
@app.get("/health")
def health():
    try:
        _load_props()
        return {"ok": True, "storage": "healthy"}
    except Exception as e:
        return {"ok": False, "storage": "unhealthy", "error": str(e)}

@app.post("/properties", response_model=PropertyOut)
def add_property(prop: PropertyIn):
    store = _load_props()
    pid = str(uuid.uuid4())
    p = prop.model_dump()
    flags = compute_flags(p)
    status = shortlist_decision(flags)
    store[pid] = {"data": p, "flags": flags, "shortlist_status": status}
    _save_props(store)
    return {"id": pid, "data": p, "flags": flags, "shortlist_status": status}

@app.get("/properties", response_model=List[PropertyOut])
def list_properties(limit: int = 100, offset: int = 0, status_filter: Optional[str] = None):
    limit, offset = min(limit, 1000), max(offset, 0)
    store = _load_props()
    out = [{"id": pid, **obj} for pid, obj in store.items()]

    if status_filter:
        out = [p for p in out if p.get("shortlist_status") == status_filter]

    out.sort(key=lambda x: {"shortlist": 0, "maybe": 1, "reject": 2}.get(x.get("shortlist_status"), 3))
    return out[offset:offset + limit]

@app.get("/properties/count")
def count_properties():
    store = _load_props()
    counts = {"shortlist": 0, "maybe": 0, "reject": 0, "total": len(store)}
    for obj in store.values():
        status = obj.get("shortlist_status", "reject")
        counts[status] = counts.get(status, 0) + 1
    return counts

@app.post("/ingest/properties-csv")
async def ingest_properties_csv(file: UploadFile = File(...)):
    # Check file size
    await file.seek(0, 2)
    size = await file.tell()
    await file.seek(0)

    if size > CONFIG['max_csv_bytes']:
        raise HTTPException(status_code=413, detail=f"File too large: {size} bytes")

    # Read CSV
    try:
        df = pd.read_csv(io.BytesIO(await file.read()))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV error: {e}")

    if len(df) > CONFIG['max_csv_rows']:
        raise HTTPException(status_code=413, detail=f"Too many rows: {len(df)}")

    # Validate columns
    required = {"address", "city", "region", "asset_type"}
    if missing := required - set(df.columns):
        raise HTTPException(status_code=400, detail=f"Missing columns: {sorted(missing)}")

    store = _load_props()
    created, skipped, errors = 0, 0, []

    for idx, row in df.iterrows():
        try:
            p = {k: _clean_nan(v) for k, v in row.to_dict().items()}
            validated = PropertyIn(**p)
            p_clean = validated.model_dump()

            pid = str(uuid.uuid4())
            flags = compute_flags(p_clean)
            status = shortlist_decision(flags)

            store[pid] = {"data": p_clean, "flags": flags, "shortlist_status": status}
            created += 1
        except Exception as e:
            skipped += 1
            if len(errors) < 10:
                errors.append({"row": int(idx) + 2, "error": str(e)})

    _save_props(store)
    return {"created": created, "skipped": skipped, "errors": errors, "total_rows": len(df)}

@app.get("/planning/passflag")
def planning_passflag(lat: float, lon: float, radius_m: int = 250):
    return {
        "lat": lat, "lon": lon, "radius_m": radius_m,
        "planning_pass": None,
        "planning_flags": ["connector_not_configured"],
        "source": "geoportal connector pending"
    }

@app.get("/competition/future")
def competition_future(lat: float, lon: float, radius_km: float = 2.0):
    return {
        "lat": lat, "lon": lon, "radius_km": radius_km,
        "competition_flag": None,
        "signals": ["connector_not_configured"],
        "source": "planning drafts connector pending"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
