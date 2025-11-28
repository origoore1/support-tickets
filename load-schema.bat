@echo off
REM Lindgren-X v2.0 - Schema Loader (Direct SQL Execution)
REM This script loads the schema by piping SQL directly into psql

echo ======================================================================
echo           Loading Lindgren-X v2.0 Database Schema
echo ======================================================================
echo.

SET PGPASSWORD=Orig1972!

echo Creating tables...
"C:\Program Files\PostgreSQL\18\bin\psql" -U postgres -d lindgren_x_v2 << EOF
CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS harmonized_claims CASCADE;
DROP TABLE IF EXISTS connector_runs CASCADE;
DROP TABLE IF EXISTS data_sources CASCADE;

CREATE TABLE data_sources (
    source_id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    region VARCHAR(100),
    source_name VARCHAR(200) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    connector_spec VARCHAR(200) NOT NULL,
    last_run TIMESTAMP,
    status VARCHAR(50) DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_code, region, source_name)
);

CREATE TABLE connector_runs (
    run_id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES data_sources(source_id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    records_fetched INTEGER DEFAULT 0,
    records_harmonized INTEGER DEFAULT 0,
    error_message TEXT,
    log_file VARCHAR(500)
);

CREATE TABLE harmonized_claims (
    claim_id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES data_sources(source_id),
    run_id INTEGER REFERENCES connector_runs(run_id),
    external_id VARCHAR(200) NOT NULL,
    claim_type VARCHAR(100),
    claim_status VARCHAR(100) NOT NULL,
    commodity VARCHAR(200),
    country_code VARCHAR(3) NOT NULL,
    region VARCHAR(100),
    location_name VARCHAR(200),
    geometry GEOMETRY(Geometry, 4326),
    area_hectares NUMERIC(12, 2),
    filing_date DATE,
    expiry_date DATE,
    last_activity_date DATE,
    holder_name VARCHAR(500),
    holder_type VARCHAR(100),
    work_required NUMERIC(12, 2),
    fees_due NUMERIC(12, 2),
    data_quality_score INTEGER,
    ingestion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB,
    UNIQUE(source_id, external_id),
    CONSTRAINT valid_status CHECK (claim_status IN ('active', 'expired', 'abandoned', 'pending', 'closed', 'suspended'))
);

CREATE INDEX idx_harmonized_claims_geometry ON harmonized_claims USING GIST(geometry);
CREATE INDEX idx_harmonized_claims_status ON harmonized_claims(claim_status);
CREATE INDEX idx_harmonized_claims_country ON harmonized_claims(country_code);
CREATE INDEX idx_harmonized_claims_expiry ON harmonized_claims(expiry_date);

CREATE TABLE opportunities (
    opportunity_id SERIAL PRIMARY KEY,
    claim_id INTEGER REFERENCES harmonized_claims(claim_id),
    geological_score NUMERIC(5, 2) DEFAULT 0,
    historical_score NUMERIC(5, 2) DEFAULT 0,
    infrastructure_score NUMERIC(5, 2) DEFAULT 0,
    jurisdiction_score NUMERIC(5, 2) DEFAULT 0,
    market_score NUMERIC(5, 2) DEFAULT 0,
    total_minescore NUMERIC(5, 2) DEFAULT 0,
    acquisition_complexity VARCHAR(50),
    estimated_cost NUMERIC(12, 2),
    risk_level VARCHAR(50),
    opportunity_type VARCHAR(100),
    priority_rank INTEGER,
    identified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed BOOLEAN DEFAULT FALSE,
    notes TEXT
);

CREATE INDEX idx_opportunities_minescore ON opportunities(total_minescore DESC);
CREATE INDEX idx_opportunities_priority ON opportunities(priority_rank);
CREATE INDEX idx_opportunities_type ON opportunities(opportunity_type);

INSERT INTO data_sources (country_code, region, source_name, source_type, connector_spec, status)
VALUES ('USA', 'Nevada', 'Bureau of Land Management - Nevada', 'government', 'connectors/specs/US_BLM_NV.yaml', 'active');

CREATE OR REPLACE VIEW opportunity_summary AS
SELECT
    o.opportunity_id, o.total_minescore, o.opportunity_type, o.priority_rank,
    h.external_id, h.claim_type, h.claim_status, h.commodity,
    h.country_code, h.region, h.location_name, h.area_hectares,
    h.expiry_date, h.holder_name, ds.source_name,
    o.acquisition_complexity, o.estimated_cost, o.risk_level, o.identified_date
FROM opportunities o
JOIN harmonized_claims h ON o.claim_id = h.claim_id
JOIN data_sources ds ON h.source_id = ds.source_id
ORDER BY o.total_minescore DESC;
EOF

echo.
echo ======================================================================
echo                    Schema Loading Complete!
echo ======================================================================
echo.
echo Next: Run npm start
pause
