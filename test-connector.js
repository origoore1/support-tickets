/**
 * Test the connector to see if it's working
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

async function testConnector() {
    try {
        console.log('Starting connector test...\n');

        // Test database connection
        await database.testConnection();

        // Run the connector
        const result = await connectorFramework.executeConnector('connectors/specs/US_BLM_NV.yaml');

        console.log('\n✓ Connector test successful!');
        console.log('Result:', result);

    } catch (err) {
        console.error('\n✗ Connector test failed:', err.message);
        console.error('Stack:', err.stack);
    } finally {
        await database.close();
        await connectorFramework.close();
        process.exit(0);
    }
}

testConnector();
