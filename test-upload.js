/**
 * Test the file upload processing functionality
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

// Initialize components
const database = new Database(config.database);
const harmonizer = new Harmonizer();
const connectorFramework = new ConnectorFramework(database, harmonizer, config);

async function testUpload() {
    try {
        console.log('Starting file upload test...\n');

        // Test database connection
        await database.testConnection();

        // Process the test data file
        const result = await connectorFramework.processUploadedFile(
            './test-data.json',
            'test-data.json',
            'connectors/specs/US_BLM_NV.yaml'
        );

        console.log('\n✓ Upload test successful!');
        console.log('Result:', result);

        // Check the database for the new records
        const stats = await database.getStats();
        console.log('\nDatabase stats after upload:');
        console.log('  Total claims:', stats.total_claims);
        console.log('  Expired claims:', stats.expired_claims);
        console.log('  Abandoned claims:', stats.abandoned_claims);

    } catch (err) {
        console.error('\n✗ Upload test failed:', err.message);
        console.error('Stack:', err.stack);
    } finally {
        await database.close();
        await connectorFramework.close();
        process.exit(0);
    }
}

testUpload();
