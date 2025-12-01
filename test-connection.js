const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'lindgren_x_v2',
    user: 'postgres',
    password: 'Orig1972!',
});

async function test() {
    try {
        console.log('Attempting to connect...');
        const client = await pool.connect();
        console.log('✓ Connected successfully!');
        const result = await client.query('SELECT NOW()');
        console.log('✓ Query executed:', result.rows[0]);
        client.release();
        await pool.end();
    } catch (err) {
        console.error('✗ Connection failed:', err.message);
        console.error('  Code:', err.code);
        console.error('  Stack:', err.stack);
        process.exit(1);
    }
}

test();
