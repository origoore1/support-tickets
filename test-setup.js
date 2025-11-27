/**
 * Lindgren-X v2.0 - Setup Validation Script
 * Tests that all components are working correctly
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('\n' + '='.repeat(70));
console.log('  LINDGREN-X v2.0 - SETUP VALIDATION');
console.log('='.repeat(70) + '\n');

const tests = [];
let passedTests = 0;
let failedTests = 0;

// Test 1: Environment Variables
async function testEnvironment() {
    console.log('Test 1: Checking environment variables...');

    const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = [];

    for (const envVar of required) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }

    if (missing.length > 0) {
        console.log('  ✗ FAILED: Missing environment variables:', missing.join(', '));
        console.log('  → Check your .env file\n');
        return false;
    }

    console.log('  ✓ PASSED: All required environment variables set\n');
    return true;
}

// Test 2: Database Connection
async function testDatabaseConnection() {
    console.log('Test 2: Testing database connection...');

    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        await pool.end();

        console.log('  ✓ PASSED: Database connection successful');
        console.log('  → Connected to:', process.env.DB_NAME);
        console.log('  → Server time:', result.rows[0].now, '\n');
        return true;
    } catch (err) {
        console.log('  ✗ FAILED:', err.message);
        console.log('  → Check PostgreSQL is running');
        console.log('  → Verify credentials in .env file\n');
        await pool.end();
        return false;
    }
}

// Test 3: Database Schema
async function testDatabaseSchema() {
    console.log('Test 3: Checking database schema...');

    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        const requiredTables = [
            'data_sources',
            'connector_runs',
            'harmonized_claims',
            'opportunities'
        ];

        const existingTables = result.rows.map(r => r.table_name);
        const missing = requiredTables.filter(t => !existingTables.includes(t));

        if (missing.length > 0) {
            console.log('  ✗ FAILED: Missing tables:', missing.join(', '));
            console.log('  → Run: psql -U postgres -d lindgren_x_v2 -f database/schema.sql\n');
            await pool.end();
            return false;
        }

        console.log('  ✓ PASSED: All required tables exist');
        console.log('  → Tables:', existingTables.join(', '), '\n');
        await pool.end();
        return true;
    } catch (err) {
        console.log('  ✗ FAILED:', err.message, '\n');
        await pool.end();
        return false;
    }
}

// Test 4: PostGIS Extension
async function testPostGIS() {
    console.log('Test 4: Checking PostGIS extension...');

    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        const result = await pool.query(`
            SELECT extname, extversion
            FROM pg_extension
            WHERE extname = 'postgis';
        `);

        if (result.rows.length === 0) {
            console.log('  ✗ FAILED: PostGIS extension not enabled');
            console.log('  → Run: psql -U postgres -d lindgren_x_v2 -c "CREATE EXTENSION postgis;"\n');
            await pool.end();
            return false;
        }

        console.log('  ✓ PASSED: PostGIS extension enabled');
        console.log('  → Version:', result.rows[0].extversion, '\n');
        await pool.end();
        return true;
    } catch (err) {
        console.log('  ✗ FAILED:', err.message);
        console.log('  → PostGIS may not be installed\n');
        await pool.end();
        return false;
    }
}

// Test 5: Required Node Modules
async function testNodeModules() {
    console.log('Test 5: Checking Node.js dependencies...');

    const required = [
        'express',
        'pg',
        'playwright',
        'yaml',
        'adm-zip',
        'shapefile',
        'dotenv'
    ];

    const missing = [];

    for (const module of required) {
        try {
            require.resolve(module);
        } catch (err) {
            missing.push(module);
        }
    }

    if (missing.length > 0) {
        console.log('  ✗ FAILED: Missing Node modules:', missing.join(', '));
        console.log('  → Run: npm install\n');
        return false;
    }

    console.log('  ✓ PASSED: All required Node modules installed\n');
    return true;
}

// Test 6: Project Files
async function testProjectFiles() {
    console.log('Test 6: Checking project files...');

    const fs = require('fs');
    const requiredFiles = [
        'lindgren-x-v2.js',
        'package.json',
        '.env',
        'core/database.js',
        'core/harmonizer.js',
        'core/connector-framework.js',
        'database/schema.sql',
        'connectors/specs/US_BLM_NV.yaml'
    ];

    const missing = [];

    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            missing.push(file);
        }
    }

    if (missing.length > 0) {
        console.log('  ✗ FAILED: Missing files:', missing.join(', '));
        console.log('  → Ensure all project files are present\n');
        return false;
    }

    console.log('  ✓ PASSED: All required project files exist\n');
    return true;
}

// Test 7: Connector Specs
async function testConnectorSpecs() {
    console.log('Test 7: Validating connector specifications...');

    const fs = require('fs');
    const yaml = require('yaml');

    try {
        const specFile = fs.readFileSync('connectors/specs/US_BLM_NV.yaml', 'utf8');
        const spec = yaml.parse(specFile);

        const requiredKeys = ['metadata', 'source', 'extraction', 'field_mappings'];
        const missing = requiredKeys.filter(key => !spec[key]);

        if (missing.length > 0) {
            console.log('  ✗ FAILED: Invalid connector spec, missing keys:', missing.join(', '), '\n');
            return false;
        }

        console.log('  ✓ PASSED: Connector specification valid');
        console.log('  → Connector:', spec.metadata.name, '\n');
        return true;
    } catch (err) {
        console.log('  ✗ FAILED:', err.message, '\n');
        return false;
    }
}

// Run all tests
async function runTests() {
    const results = [];

    results.push(await testEnvironment());
    results.push(await testDatabaseConnection());
    results.push(await testDatabaseSchema());
    results.push(await testPostGIS());
    results.push(await testNodeModules());
    results.push(await testProjectFiles());
    results.push(await testConnectorSpecs());

    const passed = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;

    console.log('='.repeat(70));
    console.log('  TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`  Total Tests: ${results.length}`);
    console.log(`  ✓ Passed: ${passed}`);
    console.log(`  ✗ Failed: ${failed}`);
    console.log('='.repeat(70) + '\n');

    if (failed === 0) {
        console.log('🎉 SUCCESS! Your Lindgren-X v2.0 setup is complete and ready to use!\n');
        console.log('Next steps:');
        console.log('  1. Run: npm start');
        console.log('  2. Open: http://localhost:3000');
        console.log('  3. Click "Run Connector" for Nevada BLM');
        console.log('  4. Click "Run MineScore Algorithm"');
        console.log('  5. View investment opportunities!\n');
        process.exit(0);
    } else {
        console.log('⚠️  SETUP INCOMPLETE - Please fix the failed tests above.\n');
        console.log('For help, see:');
        console.log('  - WINDOWS-SETUP-GUIDE.md (detailed Windows instructions)');
        console.log('  - LINDGREN-X-README.md (full documentation)');
        console.log('  - SETUP-COMPLETE.md (quick start guide)\n');
        process.exit(1);
    }
}

// Run the tests
runTests().catch(err => {
    console.error('\n✗ FATAL ERROR:', err.message, '\n');
    process.exit(1);
});
