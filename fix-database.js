/**
 * Database Fix Script
 * Applies migration to allow 'unknown' status in harmonized_claims table
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function fixDatabase() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'lindgren_x_v2',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
    });

    try {
        console.log('Connecting to database...');
        await pool.query('SELECT NOW()');
        console.log('✓ Connected to database');

        console.log('\nApplying migration to allow "unknown" status...');

        // Read migration file
        const migrationPath = path.join(__dirname, 'database/migrations/001_add_unknown_status.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration
        await pool.query(migrationSql);

        console.log('✓ Migration applied successfully');
        console.log('\nYou can now run the connector without constraint violation errors.');

        await pool.end();
        process.exit(0);

    } catch (err) {
        console.error('✗ Error:', err.message);
        console.error('\nIf PostgreSQL is not running, please start it first:');
        console.error('  Windows: Start "postgresql-x64-17" service');
        console.error('  Linux: sudo systemctl start postgresql');
        console.error('  Mac: brew services start postgresql');
        await pool.end();
        process.exit(1);
    }
}

fixDatabase();
