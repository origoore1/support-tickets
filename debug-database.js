/**
 * Debug script to check database state
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'lindgren_x_v2',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
});

async function debugDatabase() {
    console.log('\n=== DATABASE DEBUG ===\n');

    try {
        // Test connection
        console.log('1. Testing connection...');
        const testResult = await pool.query('SELECT NOW()');
        console.log('✓ Connected at:', testResult.rows[0].now);

        // Count total claims
        console.log('\n2. Counting claims...');
        const claimsResult = await pool.query('SELECT COUNT(*) as count FROM harmonized_claims');
        console.log('Total claims:', claimsResult.rows[0].count);

        // Check claim statuses
        console.log('\n3. Checking claim statuses...');
        const statusResult = await pool.query(`
            SELECT claim_status, COUNT(*) as count
            FROM harmonized_claims
            GROUP BY claim_status
            ORDER BY count DESC
        `);
        console.log('Status breakdown:');
        statusResult.rows.forEach(row => {
            console.log(`  ${row.claim_status}: ${row.count}`);
        });

        // Sample some claims
        console.log('\n4. Sample claims data...');
        const sampleResult = await pool.query(`
            SELECT claim_id, external_id, claim_type, claim_status, commodity, region, area_hectares
            FROM harmonized_claims
            LIMIT 5
        `);
        console.log('Sample claims:');
        sampleResult.rows.forEach(row => {
            console.log(`  ID: ${row.claim_id}, External: ${row.external_id}, Status: ${row.claim_status}, Type: ${row.claim_type}, Commodity: ${row.commodity}`);
        });

        // Count opportunities
        console.log('\n5. Counting opportunities...');
        const oppsResult = await pool.query('SELECT COUNT(*) as count FROM opportunities');
        console.log('Total opportunities:', oppsResult.rows[0].count);

        // Count data sources
        console.log('\n6. Checking data sources...');
        const sourcesResult = await pool.query('SELECT source_id, source_name, status FROM data_sources');
        console.log('Data sources:');
        sourcesResult.rows.forEach(row => {
            console.log(`  ID: ${row.source_id}, Name: ${row.source_name}, Status: ${row.status}`);
        });

        // Check connector runs
        console.log('\n7. Checking connector runs...');
        const runsResult = await pool.query(`
            SELECT run_id, source_id, status, records_fetched, records_harmonized, start_time, end_time
            FROM connector_runs
            ORDER BY run_id DESC
            LIMIT 5
        `);
        console.log('Recent connector runs:');
        runsResult.rows.forEach(row => {
            console.log(`  Run ${row.run_id}: Status=${row.status}, Fetched=${row.records_fetched}, Harmonized=${row.records_harmonized}`);
        });

        // Get full stats
        console.log('\n8. Full statistics (as shown on dashboard)...');
        const statsResult = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM harmonized_claims) as total_claims,
                (SELECT COUNT(*) FROM harmonized_claims WHERE claim_status = 'expired') as expired_claims,
                (SELECT COUNT(*) FROM harmonized_claims WHERE claim_status = 'abandoned') as abandoned_claims,
                (SELECT COUNT(*) FROM opportunities) as total_opportunities,
                (SELECT COUNT(*) FROM opportunities WHERE total_minescore >= 70) as high_value_opportunities,
                (SELECT COUNT(*) FROM data_sources WHERE status = 'active') as active_sources
        `);
        console.log('Dashboard stats:', statsResult.rows[0]);

        console.log('\n=== DEBUG COMPLETE ===\n');

    } catch (err) {
        console.error('ERROR:', err.message);
        console.error('Stack:', err.stack);
    } finally {
        await pool.end();
    }
}

debugDatabase();
