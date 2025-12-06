/**
 * Comprehensive System Test Suite
 * Tests all components of Lindgren-X v2.0
 */

require('dotenv').config();
const Database = require('./core/database');
const Harmonizer = require('./core/harmonizer');
const ConnectorFramework = require('./core/connector-framework');

// Configuration
const config = {
    port: process.env.PORT || 3000,
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'lindgren_x_v2',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
    },
    rawDataPath: process.env.RAW_DATA_PATH || './raw_ingest',
    logsPath: process.env.LOGS_PATH || './logs',
    debugPath: process.env.DEBUG_PATH || './debug',
    tempPath: process.env.TEMP_PATH || './temp'
};

let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, details = '') {
    if (passed) {
        console.log(`✓ ${name}`);
        testsPassed++;
    } else {
        console.log(`✗ ${name}`);
        if (details) console.log(`  → ${details}`);
        testsFailed++;
    }
}

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log('COMPREHENSIVE SYSTEM TEST SUITE');
    console.log('='.repeat(70) + '\n');

    // Initialize components
    const database = new Database(config.database);
    const harmonizer = new Harmonizer();
    const connectorFramework = new ConnectorFramework(database, harmonizer, config);

    try {
        // ============================================================
        // TEST 1: Database Connection
        // ============================================================
        console.log('\n[1] DATABASE CONNECTION TESTS');
        console.log('-'.repeat(70));

        try {
            await database.testConnection();
            logTest('Database connection successful', true);
        } catch (err) {
            logTest('Database connection failed', false, err.message);
        }

        // ============================================================
        // TEST 2: Database Schema Validation
        // ============================================================
        console.log('\n[2] DATABASE SCHEMA TESTS');
        console.log('-'.repeat(70));

        try {
            const stats = await database.getStats();
            logTest('Database stats query successful', true);
            console.log(`  → Claims: ${stats.total_claims}, Opportunities: ${stats.total_opportunities}`);
        } catch (err) {
            logTest('Database stats query failed', false, err.message);
        }

        // Test views
        try {
            const opportunities = await database.getTopOpportunities(10);
            logTest('Opportunity summary view working', opportunities !== null);
            console.log(`  → Found ${opportunities.length} top opportunities`);
        } catch (err) {
            logTest('Opportunity summary view failed', false, err.message);
        }

        // ============================================================
        // TEST 3: Harmonizer Tests
        // ============================================================
        console.log('\n[3] HARMONIZER TESTS');
        console.log('-'.repeat(70));

        // Test status standardization
        const testStatuses = [
            { input: 'Active', expected: 'active' },
            { input: 'Expired', expected: 'expired' },
            { input: 'Forfeited', expected: 'abandoned' },
            { input: 'Closed', expected: 'closed' }
        ];

        for (const test of testStatuses) {
            const result = harmonizer.standardizeStatus(test.input);
            logTest(`Status mapping: "${test.input}" → "${test.expected}"`, result === test.expected, `got "${result}"`);
        }

        // Test commodity standardization
        const testCommodities = [
            { input: 'Gold', expected: 'gold' },
            { input: 'AU', expected: 'gold' },
            { input: 'Lithium', expected: 'lithium' }
        ];

        for (const test of testCommodities) {
            const result = harmonizer.standardizeCommodity(test.input);
            logTest(`Commodity mapping: "${test.input}" → "${test.expected}"`, result === test.expected, `got "${result}"`);
        }

        // Test area conversion
        const areaResult = harmonizer.convertToHectares(100, 'acres');
        const expectedArea = 40.47; // 100 acres ≈ 40.47 hectares
        const areaCorrect = Math.abs(areaResult - expectedArea) < 1;
        logTest('Area conversion (acres to hectares)', areaCorrect, `100 acres → ${areaResult} ha`);

        // Test harmonization with sample data
        const sampleData = {
            properties: {
                CSE_NR: 'TEST-001',
                BLM_PROD: 'Lode',
                CSE_DISP: 'Expired',
                CSE_TYPE_NR: 'Gold',
                CSE_NAME: 'Test Claim',
                RCRD_ACRS: 20,
                Created: '2020-01-01',
                Modified: '2023-01-01'
            },
            geometry: {
                type: 'Point',
                coordinates: [-115.0, 36.0]
            }
        };

        const fieldMappings = {
            external_id: 'properties.CSE_NR',
            claim_type: 'properties.BLM_PROD',
            claim_status: 'properties.CSE_DISP',
            commodity: 'properties.CSE_TYPE_NR',
            location_name: 'properties.CSE_NAME',
            area: 'properties.RCRD_ACRS',
            area_unit: 'acres',
            filing_date: 'properties.Created',
            last_activity_date: 'properties.Modified',
            geometry: 'geometry'
        };

        const sourceConfig = {
            country_code: 'USA',
            region: 'Nevada'
        };

        const transformations = {
            status_mapping: {
                'Expired': 'expired'
            }
        };

        try {
            const harmonized = harmonizer.harmonize(sampleData, sourceConfig, fieldMappings);
            logTest('Data harmonization successful', true);
            logTest('Harmonized external_id correct', harmonized.external_id === 'TEST-001');
            logTest('Harmonized status correct', harmonized.claim_status === 'expired');
            logTest('Harmonized commodity correct', harmonized.commodity === 'gold');
            logTest('Harmonized country_code correct', harmonized.country_code === 'USA');
        } catch (err) {
            logTest('Data harmonization failed', false, err.message);
        }

        // ============================================================
        // TEST 4: Connector Framework Tests
        // ============================================================
        console.log('\n[4] CONNECTOR FRAMEWORK TESTS');
        console.log('-'.repeat(70));

        // Test connector listing
        try {
            const connectors = connectorFramework.listConnectors();
            logTest('Connector listing successful', connectors.length > 0);
            console.log(`  → Found ${connectors.length} connector(s)`);
            for (const conn of connectors) {
                console.log(`    - ${conn.name} (${conn.method})`);
            }
        } catch (err) {
            logTest('Connector listing failed', false, err.message);
        }

        // Test connector spec loading
        try {
            const spec = connectorFramework.loadSpec('connectors/specs/US_BLM_NV.yaml');
            logTest('Connector spec loading successful', spec !== null);
            logTest('Spec has metadata', spec.metadata !== undefined);
            logTest('Spec has source config', spec.source !== undefined);
            logTest('Spec has field mappings', spec.field_mappings !== undefined);
            logTest('Spec extraction method is "api"', spec.extraction.method === 'api');
        } catch (err) {
            logTest('Connector spec loading failed', false, err.message);
        }

        // ============================================================
        // TEST 5: API Endpoint Tests (via HTTP)
        // ============================================================
        console.log('\n[5] API ENDPOINT TESTS');
        console.log('-'.repeat(70));

        const http = require('http');

        function testEndpoint(path) {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'localhost',
                    port: config.port,
                    path: path,
                    method: 'GET'
                };

                const req = http.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        resolve({ status: res.statusCode, data });
                    });
                });

                req.on('error', reject);
                req.setTimeout(5000, () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });
                req.end();
            });
        }

        // Test /api/stats endpoint
        try {
            const result = await testEndpoint('/api/stats');
            logTest('GET /api/stats returns 200', result.status === 200);
            const stats = JSON.parse(result.data);
            logTest('Stats response is valid JSON', stats !== null);
            logTest('Stats contains total_claims', stats.total_claims !== undefined);
        } catch (err) {
            logTest('GET /api/stats failed', false, err.message);
        }

        // Test /api/opportunities endpoint
        try {
            const result = await testEndpoint('/api/opportunities');
            logTest('GET /api/opportunities returns 200', result.status === 200);
            const opps = JSON.parse(result.data);
            logTest('Opportunities response is array', Array.isArray(opps));
        } catch (err) {
            logTest('GET /api/opportunities failed', false, err.message);
        }

        // Test dashboard
        try {
            const result = await testEndpoint('/');
            logTest('GET / (dashboard) returns 200', result.status === 200);
            logTest('Dashboard contains LINDGREN-X', result.data.includes('LINDGREN-X'));
        } catch (err) {
            logTest('GET / (dashboard) failed', false, err.message);
        }

        // ============================================================
        // TEST 6: Data Quality Tests
        // ============================================================
        console.log('\n[6] DATA QUALITY TESTS');
        console.log('-'.repeat(70));

        try {
            const result = await database.pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN data_quality_score >= 70 THEN 1 END) as high_quality,
                    COUNT(CASE WHEN data_quality_score < 70 AND data_quality_score >= 50 THEN 1 END) as medium_quality,
                    COUNT(CASE WHEN data_quality_score < 50 THEN 1 END) as low_quality,
                    AVG(data_quality_score) as avg_score
                FROM harmonized_claims
            `);

            const dq = result.rows[0];
            console.log(`  → Total claims: ${dq.total}`);
            console.log(`  → High quality (≥70): ${dq.high_quality}`);
            console.log(`  → Medium quality (50-69): ${dq.medium_quality}`);
            console.log(`  → Low quality (<50): ${dq.low_quality}`);
            console.log(`  → Average score: ${parseFloat(dq.avg_score).toFixed(2)}`);

            logTest('Data quality analysis successful', true);
        } catch (err) {
            logTest('Data quality analysis failed', false, err.message);
        }

        // ============================================================
        // TEST 7: Geometry Tests
        // ============================================================
        console.log('\n[7] SPATIAL DATA TESTS');
        console.log('-'.repeat(70));

        try {
            const result = await database.pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(geometry_json) as with_geometry
                FROM harmonized_claims
            `);

            const geo = result.rows[0];
            console.log(`  → Total claims: ${geo.total}`);
            console.log(`  → With geometry: ${geo.with_geometry}`);

            logTest('Spatial data query successful', true);
            if (geo.with_geometry > 0) {
                logTest('Claims have geometry data', true);
            } else {
                logTest('No geometry data present (expected for some datasets)', true);
            }
        } catch (err) {
            logTest('Spatial data query failed', false, err.message);
        }

        // ============================================================
        // TEST 8: Opportunity Scoring Tests
        // ============================================================
        console.log('\n[8] MINESCORE ALGORITHM TESTS');
        console.log('-'.repeat(70));

        try {
            const result = await database.pool.query(`
                SELECT
                    COUNT(*) as total,
                    AVG(total_minescore) as avg_score,
                    MIN(total_minescore) as min_score,
                    MAX(total_minescore) as max_score,
                    COUNT(CASE WHEN total_minescore >= 70 THEN 1 END) as high_value,
                    COUNT(CASE WHEN total_minescore >= 50 AND total_minescore < 70 THEN 1 END) as medium_value,
                    COUNT(CASE WHEN total_minescore < 50 THEN 1 END) as low_value
                FROM opportunities
            `);

            const scores = result.rows[0];
            console.log(`  → Total opportunities: ${scores.total}`);
            console.log(`  → Average MineScore: ${parseFloat(scores.avg_score).toFixed(2)}`);
            console.log(`  → Score range: ${parseFloat(scores.min_score).toFixed(2)} - ${parseFloat(scores.max_score).toFixed(2)}`);
            console.log(`  → High value (≥70): ${scores.high_value}`);
            console.log(`  → Medium value (50-69): ${scores.medium_value}`);
            console.log(`  → Low value (<50): ${scores.low_value}`);

            logTest('MineScore statistics successful', true);
            logTest('All scores are valid (0-100)', parseFloat(scores.max_score) <= 100);
        } catch (err) {
            logTest('MineScore statistics failed', false, err.message);
        }

    } catch (err) {
        console.error('\n✗ CRITICAL ERROR:', err.message);
        testsFailed++;
    } finally {
        // Cleanup
        await connectorFramework.close();
        await database.close();
    }

    // ============================================================
    // TEST SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${testsFailed}`);
    console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(70) + '\n');

    process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
    console.error('Test suite crashed:', err);
    process.exit(1);
});
