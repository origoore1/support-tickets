"""
Comprehensive test suite for Real Estate API
Tests all critical fixes and security measures
"""
import pytest
from fastapi.testclient import TestClient
import json
import os
import tempfile
import pandas as pd
import io
from pathlib import Path
import threading
import time

# Import the app
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from real_estate_api import app, _new_id, compute_flags, shortlist_decision, _safe_bool, _clean_nan

client = TestClient(app)

# ============================================
# Test Fixtures
# ============================================

@pytest.fixture
def sample_property():
    """Valid property data for testing."""
    return {
        "address": "Hauptstraße 123",
        "city": "Berlin",
        "region": "Berlin",
        "asset_type": "Retail",
        "gla_sqm": 500.0,
        "units": 3,
        "asking_price_eur": 1500000,
        "time_on_market_days": 200,
        "year_built": 1990,
        "heating_type": "gas",
        "anchor_present": False,
        "vacancy_pct": 20.0,
        "lat": 52.5200,
        "lon": 13.4050
    }

@pytest.fixture
def sample_csv_data():
    """Valid CSV data for bulk testing."""
    return """address,city,region,asset_type,gla_sqm,units,asking_price_eur,time_on_market_days,year_built,heating_type,anchor_present,vacancy_pct
Hauptstraße 1,Berlin,Berlin,Retail,500,3,1500000,200,1990,gas,False,20
Königsallee 2,Düsseldorf,NRW,Office,1200,8,3000000,100,2010,electric,True,5
Maximilianstraße 3,Munich,Bayern,Mixed,800,12,2500000,250,1985,oil,False,30
"""

# ============================================
# Test 1: UUID-based ID Generation (Fix #3)
# ============================================

def test_unique_id_generation():
    """Test that IDs are unique even when generated rapidly."""
    ids = set()
    for _ in range(1000):
        new_id = _new_id()
        assert new_id not in ids, "Duplicate ID generated!"
        ids.add(new_id)

    # IDs should be valid UUIDs
    import uuid
    for id_str in list(ids)[:10]:
        uuid.UUID(id_str)  # Will raise if invalid

def test_concurrent_id_generation():
    """Test ID generation under concurrent load."""
    ids = []
    lock = threading.Lock()

    def generate_ids():
        for _ in range(100):
            new_id = _new_id()
            with lock:
                ids.append(new_id)

    threads = [threading.Thread(target=generate_ids) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # All 1000 IDs should be unique
    assert len(ids) == 1000
    assert len(set(ids)) == 1000, "Duplicate IDs generated under concurrent load!"

# ============================================
# Test 2: NaN Handling (Fix #4)
# ============================================

def test_nan_cleaning():
    """Test that pandas NaN values are properly cleaned."""
    assert _clean_nan(pd.NA) is None
    assert _clean_nan(pd.NaT) is None
    assert _clean_nan(float('nan')) is None
    assert _clean_nan(42) == 42
    assert _clean_nan("test") == "test"

def test_flags_with_nan_values():
    """Test that flag computation handles NaN gracefully."""
    property_with_nans = {
        "vacancy_pct": float('nan'),
        "time_on_market_days": pd.NA,
        "units": 10,
        "anchor_present": float('nan'),
        "year_built": None,
        "heating_type": pd.NA
    }

    flags = compute_flags(property_with_nans)

    # Should not crash and should handle NaN properly
    assert isinstance(flags, list)

    # Flags with NaN inputs should not be created (or value should be False)
    vacancy_flags = [f for f in flags if f["key"] == "vacancy_mid"]
    assert len(vacancy_flags) == 0  # Should skip NaN values

# ============================================
# Test 3: Boolean String Conversion (Fix #5)
# ============================================

def test_safe_bool_conversion():
    """Test proper boolean conversion from various types."""
    # True cases
    assert _safe_bool(True) == True
    assert _safe_bool("true") == True
    assert _safe_bool("True") == True
    assert _safe_bool("TRUE") == True
    assert _safe_bool("1") == True
    assert _safe_bool("yes") == True
    assert _safe_bool("y") == True
    assert _safe_bool(1) == True

    # False cases
    assert _safe_bool(False) == False
    assert _safe_bool("false") == False
    assert _safe_bool("False") == False
    assert _safe_bool("FALSE") == False
    assert _safe_bool("0") == False
    assert _safe_bool("no") == False
    assert _safe_bool(0) == False
    assert _safe_bool(None) == False
    assert _safe_bool("") == False

# ============================================
# Test 4: CSV File Size Limits (Fix #2)
# ============================================

def test_csv_size_limit():
    """Test that oversized CSV files are rejected."""
    # Create a large CSV (> 10MB)
    large_csv = "address,city,region,asset_type\n" + ("Test Street,Berlin,Berlin,Retail\n" * 500000)

    response = client.post(
        "/ingest/properties-csv",
        files={"file": ("large.csv", large_csv.encode(), "text/csv")}
    )

    assert response.status_code == 413
    assert "too large" in response.json()["detail"].lower()

def test_csv_row_limit():
    """Test that CSV with too many rows is rejected."""
    # Create CSV with > 10000 rows
    rows = "address,city,region,asset_type\n" + ("Test St,Berlin,Berlin,Retail\n" * 15000)

    response = client.post(
        "/ingest/properties-csv",
        files={"file": ("many_rows.csv", rows.encode(), "text/csv")}
    )

    assert response.status_code == 413
    assert "too many rows" in response.json()["detail"].lower()

# ============================================
# Test 5: Pydantic Validation (Fix #9)
# ============================================

def test_pydantic_validation_on_add():
    """Test that invalid data is rejected via Pydantic validation."""
    invalid_property = {
        "address": "Test",
        "city": "Berlin",
        "region": "Berlin",
        "asset_type": "Retail",
        "vacancy_pct": 150  # Invalid: > 100%
    }

    response = client.post("/properties", json=invalid_property)
    assert response.status_code == 422  # Validation error

def test_pydantic_validation_in_csv():
    """Test that CSV rows with invalid data are skipped."""
    invalid_csv = """address,city,region,asset_type,vacancy_pct,asking_price_eur
Valid St,Berlin,Berlin,Retail,20,1000000
Invalid St,Berlin,Berlin,Retail,150,1000000
Another Valid,Munich,Bayern,Office,10,2000000
Negative Price,Berlin,Berlin,Retail,20,-500000
"""

    response = client.post(
        "/ingest/properties-csv",
        files={"file": ("test.csv", invalid_csv.encode(), "text/csv")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["created"] == 2  # Only 2 valid rows
    assert data["skipped"] == 2  # 2 invalid rows skipped
    assert len(data["errors"]) == 2

def test_input_validation_ranges():
    """Test that field ranges are enforced."""
    # Test negative values
    invalid = {
        "address": "Test",
        "city": "Berlin",
        "region": "Berlin",
        "asset_type": "Retail",
        "asking_price_eur": -1000  # Negative price
    }
    response = client.post("/properties", json=invalid)
    assert response.status_code == 422

    # Test oversized values
    invalid["asking_price_eur"] = 1e15  # Too large
    response = client.post("/properties", json=invalid)
    assert response.status_code == 422

# ============================================
# Test 6: Type Safety (Fix #6)
# ============================================

def test_heating_type_as_number():
    """Test that numeric heating_type doesn't crash."""
    csv_with_numeric = """address,city,region,asset_type,heating_type
Test St,Berlin,Berlin,Retail,123
"""

    response = client.post(
        "/ingest/properties-csv",
        files={"file": ("test.csv", csv_with_numeric.encode(), "text/csv")}
    )

    # Should not crash
    assert response.status_code == 200
    assert response.json()["created"] >= 0

# ============================================
# Test 7: Business Logic (Fix #7)
# ============================================

def test_shortlist_decision_logic():
    """Test the corrected shortlist decision logic."""
    # 0 core flags → reject
    flags = [
        {"key": "energy_upside", "value": True, "severity": "support"},
        {"key": "solar_potential", "value": True, "severity": "support"}
    ]
    assert shortlist_decision(flags) == "reject"

    # 1 core flag → reject
    flags = [
        {"key": "vacancy_mid", "value": True, "severity": "core"},
        {"key": "energy_upside", "value": True, "severity": "support"}
    ]
    assert shortlist_decision(flags) == "reject"

    # 2 core flags, 0 support → maybe
    flags = [
        {"key": "vacancy_mid", "value": True, "severity": "core"},
        {"key": "seller_fatigue", "value": True, "severity": "core"}
    ]
    assert shortlist_decision(flags) == "maybe"

    # 2 core flags, 1+ support → shortlist
    flags = [
        {"key": "vacancy_mid", "value": True, "severity": "core"},
        {"key": "seller_fatigue", "value": True, "severity": "core"},
        {"key": "energy_upside", "value": True, "severity": "support"}
    ]
    assert shortlist_decision(flags) == "shortlist"

    # 3+ core flags → shortlist (regardless of support)
    flags = [
        {"key": "vacancy_mid", "value": True, "severity": "core"},
        {"key": "seller_fatigue", "value": True, "severity": "core"},
        {"key": "tenant_mix_risk", "value": True, "severity": "core"}
    ]
    assert shortlist_decision(flags) == "shortlist"

# ============================================
# Test 8: API Endpoints
# ============================================

def test_health_endpoint():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] == True

def test_add_property_endpoint(sample_property):
    """Test adding a single property."""
    response = client.post("/properties", json=sample_property)
    assert response.status_code == 200

    data = response.json()
    assert "id" in data
    assert data["shortlist_status"] in ["reject", "maybe", "shortlist"]
    assert len(data["flags"]) > 0

def test_list_properties_pagination():
    """Test pagination on list endpoint."""
    # Add some properties first
    for i in range(5):
        prop = {
            "address": f"Street {i}",
            "city": "Berlin",
            "region": "Berlin",
            "asset_type": "Retail"
        }
        client.post("/properties", json=prop)

    # Test pagination
    response = client.get("/properties?limit=2&offset=0")
    assert response.status_code == 200
    assert len(response.json()) <= 2

    response = client.get("/properties?limit=2&offset=2")
    assert response.status_code == 200

def test_count_properties():
    """Test property count endpoint."""
    response = client.get("/properties/count")
    assert response.status_code == 200

    data = response.json()
    assert "total" in data
    assert "shortlist" in data
    assert "maybe" in data
    assert "reject" in data

def test_csv_ingestion_success(sample_csv_data):
    """Test successful CSV ingestion."""
    response = client.post(
        "/ingest/properties-csv",
        files={"file": ("test.csv", sample_csv_data.encode(), "text/csv")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["created"] == 3
    assert data["skipped"] == 0

# ============================================
# Test 9: Concurrent Access (Fix #1)
# ============================================

def test_concurrent_property_creation():
    """Test that concurrent requests don't lose data."""
    results = []
    errors = []

    def add_property(index):
        try:
            prop = {
                "address": f"Concurrent Street {index}",
                "city": "Berlin",
                "region": "Berlin",
                "asset_type": "Retail"
            }
            response = client.post("/properties", json=prop)
            results.append(response.json())
        except Exception as e:
            errors.append(str(e))

    # Create 20 properties concurrently
    threads = [threading.Thread(target=add_property, args=(i,)) for i in range(20)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # All should succeed
    assert len(errors) == 0, f"Errors occurred: {errors}"
    assert len(results) == 20

    # All should have unique IDs
    ids = [r["id"] for r in results]
    assert len(set(ids)) == 20, "Duplicate IDs in concurrent requests!"

# ============================================
# Run Tests
# ============================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
