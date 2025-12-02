/**
 * Test script for Lindgren-X v2 fixes
 * Tests the data connector and analysis pipeline
 */

require('dotenv').config();
const Database = require('./core/database');
const Harmonizer = require('./core/harmonizer');
const ConnectorFramework = require('./core/connector-framework');

// Configuration
const config = {
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

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log('TESTING LINDGREN-X v2 FIXES');
    console.log('='.repeat(70) + '\n');

    const database = new Database(config.database);
    const harmonizer = new Harmonizer();
    const connectorFramework = new ConnectorFramework(database, harmonizer, config);

    let testsPassed = 0;
    let testsFailed = 0;

    // Test 1: Database Connection
    console.log('Test 1: Database Connection');
    try {
        await database.testConnection();
        console.log('✓ PASS: Database connection successful\n');
        testsPassed++;
    } catch (err) {
        console.error('✗ FAIL: Database connection failed:', err.message);
        console.error('   Make sure PostgreSQL is running and credentials are correct\n');
        testsFailed++;
        // Exit early if DB connection fails
        process.exit(1);
    }

    // Test 2: Harmonizer Status Mapping
    console.log('Test 2: Harmonizer Status Mapping');
    try {
        const testStatuses = ['Active', 'Expired', 'Abandoned', 'Closed', 'Pending'];
        const expected = ['active', 'expired', 'abandoned', 'closed', 'pending'];

        let allCorrect = true;
        for (let i = 0; i < testStatuses.length; i++) {
            const result = harmonizer.standardizeStatus(testStatuses[i]);
            if (result !== expected[i]) {
                console.error(`  ✗ "${testStatuses[i]}" mapped to "${result}", expected "${expected[i]}"`);
                allCorrect = false;
            } else {
                console.log(`  ✓ "${testStatuses[i]}" → "${result}"`);
            }
        }

        if (allCorrect) {
            console.log('✓ PASS: All status mappings correct\n');
            testsPassed++;
        } else {
            console.error('✗ FAIL: Some status mappings incorrect\n');
            testsFailed++;
        }
    } catch (err) {
        console.error('✗ FAIL: Harmonizer test error:', err.message + '\n');
        testsFailed++;
    }

    // Test 3: Connector Framework - List Connectors
    console.log('Test 3: Connector Framework - List Connectors');
    try {
        const connectors = connectorFramework.listConnectors();

        if (connectors.length > 0) {
            console.log(`  Found ${connectors.length} connector(s):`);
            connectors.forEach(c => {
                console.log(`    - ${c.name} (${c.method})`);
            });
            console.log('✓ PASS: Connectors listed successfully\n');
            testsPassed++;
        } else {
            console.error('✗ FAIL: No connectors found\n');
            testsFailed++;
        }
    } catch (err) {
        console.error('✗ FAIL: Error listing connectors:', err.message + '\n');
        testsFailed++;
    }

    // Test 4: API Extraction (small sample)
    console.log('Test 4: API Extraction Method');
    console.log('  Testing API extraction with small sample...');
    try {
        const testSpec = {
            extraction: {
                api: {
                    url: 'https://gis.blm.gov/nlsdb/rest/services/HUB/BLM_Natl_MLRS_Mining_Claims/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson',
                    page_size: 5,
                    max_records: 5
                }
            }
        };

        const data = await connectorFramework.executeAPI(testSpec);

        if (data && data.length > 0) {
            console.log(`  ✓ Retrieved ${data.length} sample record(s)`);
            console.log(`  ✓ Sample record has properties: ${Object.keys(data[0].properties || {}).length} fields`);
            console.log('✓ PASS: API extraction working\n');
            testsPassed++;
        } else {
            console.error('✗ FAIL: No data retrieved from API\n');
            testsFailed++;
        }
    } catch (err) {
        console.error('✗ FAIL: API extraction error:', err.message);
        console.error('   This might be due to network restrictions in the environment\n');
        testsFailed++;
    }

    // Test 5: Data Harmonization
    console.log('Test 5: Data Harmonization');
    try {
        const mockRawData = {
            properties: {
                CSE_NR: '12345',
                BLM_PROD: 'Lode',
                CSE_DISP: 'Active',
                CSE_TYPE_NR: 'Gold',
                CSE_NAME: 'Test Claim',
                RCRD_ACRS: 20,
                Created: '2024-01-01',
                Modified: '2024-06-01'
            }
        };

        const sourceConfig = {
            country_code: 'USA',
            region: 'Nevada'
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
            last_activity_date: 'properties.Modified'
        };

        const harmonized = harmonizer.harmonize(mockRawData, sourceConfig, fieldMappings);

        console.log('  ✓ external_id:', harmonized.external_id);
        console.log('  ✓ claim_status:', harmonized.claim_status);
        console.log('  ✓ commodity:', harmonized.commodity);
        console.log('  ✓ area_hectares:', harmonized.area_hectares, 'ha');
        console.log('  ✓ country_code:', harmonized.country_code);

        if (harmonized.external_id === '12345' &&
            harmonized.claim_status === 'active' &&
            harmonized.country_code === 'USA') {
            console.log('✓ PASS: Data harmonization working correctly\n');
            testsPassed++;
        } else {
            console.error('✗ FAIL: Harmonized data has incorrect values\n');
            testsFailed++;
        }
    } catch (err) {
        console.error('✗ FAIL: Harmonization error:', err.message + '\n');
        testsFailed++;
    }

    // Cleanup
    await connectorFramework.close();
    await database.close();

    // Summary
    console.log('='.repeat(70));
    console.log('TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${testsFailed}`);
    console.log(`Total: ${testsPassed + testsFailed}`);
    console.log('='.repeat(70) + '\n');

    if (testsFailed === 0) {
        console.log('✓ ALL TESTS PASSED!\n');
        console.log('The data connector and analysis pipeline are working correctly.');
        console.log('You can now run the main application with: npm start\n');
    } else {
        console.log('✗ SOME TESTS FAILED\n');
        console.log('Please review the errors above and fix any issues.\n');
    }

    process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
});
