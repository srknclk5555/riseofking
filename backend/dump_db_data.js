const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: String(process.env.PG_PASSWORD),
    database: process.env.PG_DATABASE || 'rise_online_tracker',
    connectionTimeoutMillis: 5000
});

async function check() {
    try {
        console.log('--- DB DATA DUMP ---');
        const res = await pool.query('SELECT uid, username, "mainCharacter" FROM users');
        console.log(`Total rows: ${res.rows.length}`);
        res.rows.forEach(r => {
            console.log(`UID: ${r.uid} | UN: [${r.username}] | MC: [${r.mainCharacter}]`);
        });
        process.exit(0);
    } catch (err) {
        console.error('DB Error:', err.message);
        process.exit(1);
    }
}

check();
