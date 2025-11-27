-- Lindgren-X v2.0 Database Schema
-- PostgreSQL + PostGIS for spatial queries

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS harmonized_claims CASCADE;
DROP TABLE IF EXISTS connector_runs CASCADE;
DROP TABLE IF EXISTS data_sources CASCADE;

-- Data Sources: Track all configured connectors
CREATE TABLE data_sources (
    source_id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    region VARCHAR(100),
    source_name VARCHAR(200) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'government', 'public', 'commercial'
    connector_spec VARCHAR(200) NOT NULL, -- Path to YAML spec
    last_run TIMESTAMP,
    status VARCHAR(50) DEFAULT 'inactive', -- 'active', 'inactive', 'error'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_code, region, source_name)
);

-- Connector Runs: Track execution history
CREATE TABLE connector_runs (
    run_id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES data_sources(source_id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- 'running', 'success', 'failed', 'partial'
    records_fetched INTEGER DEFAULT 0,
    records_harmonized INTEGER DEFAULT 0,
    error_message TEXT,
    log_file VARCHAR(500)
);

-- Harmonized Claims: Standardized claim data from all sources
CREATE TABLE harmonized_claims (
    claim_id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES data_sources(source_id),
    run_id INTEGER REFERENCES connector_runs(run_id),

    -- Standard Fields (harmonized across all sources)
    external_id VARCHAR(200) NOT NULL, -- Original ID from source
    claim_type VARCHAR(100), -- 'mineral', 'placer', 'exploration', etc.
    claim_status VARCHAR(100) NOT NULL, -- 'active', 'expired', 'abandoned', etc.
    commodity VARCHAR(200), -- 'gold', 'copper', 'lithium', etc.

    -- Geographic Data
    country_code VARCHAR(3) NOT NULL,
    region VARCHAR(100), -- State/Province
    location_name VARCHAR(200),
    geometry GEOMETRY(Geometry, 4326), -- PostGIS spatial data (WGS84)
    area_hectares NUMERIC(12, 2),

    -- Temporal Data
    filing_date DATE,
    expiry_date DATE,
    last_activity_date DATE,

    -- Ownership/Holder Data
    holder_name VARCHAR(500),
    holder_type VARCHAR(100), -- 'individual', 'company', 'government'

    -- Economic Data
    work_required NUMERIC(12, 2), -- Annual work requirement
    fees_due NUMERIC(12, 2),

    -- Metadata
    data_quality_score INTEGER, -- 0-100, completeness of data
    ingestion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB, -- Store original data for reference

    -- Indexes
    UNIQUE(source_id, external_id),
    CONSTRAINT valid_status CHECK (claim_status IN ('active', 'expired', 'abandoned', 'pending', 'closed', 'suspended'))
);

-- Create spatial index for geographic queries
CREATE INDEX idx_harmonized_claims_geometry ON harmonized_claims USING GIST(geometry);
CREATE INDEX idx_harmonized_claims_status ON harmonized_claims(claim_status);
CREATE INDEX idx_harmonized_claims_country ON harmonized_claims(country_code);
CREATE INDEX idx_harmonized_claims_expiry ON harmonized_claims(expiry_date);

-- Opportunities: Scored investment opportunities
CREATE TABLE opportunities (
    opportunity_id SERIAL PRIMARY KEY,
    claim_id INTEGER REFERENCES harmonized_claims(claim_id),

    -- MineScore Algorithm Components (v1 preserved)
    geological_score NUMERIC(5, 2) DEFAULT 0, -- 0-35 points
    historical_score NUMERIC(5, 2) DEFAULT 0, -- 0-25 points
    infrastructure_score NUMERIC(5, 2) DEFAULT 0, -- 0-15 points
    jurisdiction_score NUMERIC(5, 2) DEFAULT 0, -- 0-15 points
    market_score NUMERIC(5, 2) DEFAULT 0, -- 0-10 points

    total_minescore NUMERIC(5, 2) DEFAULT 0, -- 0-100 total

    -- Investment Analysis
    acquisition_complexity VARCHAR(50), -- 'easy', 'moderate', 'complex'
    estimated_cost NUMERIC(12, 2),
    risk_level VARCHAR(50), -- 'low', 'medium', 'high'

    -- Opportunity Metadata
    opportunity_type VARCHAR(100), -- 'expired_claim', 'abandoned_claim', 'distressed_asset'
    priority_rank INTEGER, -- Overall ranking

    -- Tracking
    identified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed BOOLEAN DEFAULT FALSE,
    notes TEXT
);

CREATE INDEX idx_opportunities_minescore ON opportunities(total_minescore DESC);
CREATE INDEX idx_opportunities_priority ON opportunities(priority_rank);
CREATE INDEX idx_opportunities_type ON opportunities(opportunity_type);

-- Insert default data source (Nevada BLM)
INSERT INTO data_sources (country_code, region, source_name, source_type, connector_spec, status)
VALUES ('USA', 'Nevada', 'Bureau of Land Management - Nevada', 'government', 'connectors/specs/US_BLM_NV.yaml', 'active');

-- Create view for quick opportunity summary
CREATE OR REPLACE VIEW opportunity_summary AS
SELECT
    o.opportunity_id,
    o.total_minescore,
    o.opportunity_type,
    o.priority_rank,
    h.external_id,
    h.claim_type,
    h.claim_status,
    h.commodity,
    h.country_code,
    h.region,
    h.location_name,
    h.area_hectares,
    h.expiry_date,
    h.holder_name,
    ds.source_name,
    o.acquisition_complexity,
    o.estimated_cost,
    o.risk_level,
    o.identified_date
FROM opportunities o
JOIN harmonized_claims h ON o.claim_id = h.claim_id
JOIN data_sources ds ON h.source_id = ds.source_id
ORDER BY o.total_minescore DESC;

-- Database setup complete
SELECT 'Lindgren-X v2.0 database schema created successfully!' AS status;
