const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

async function inspectSchema() {
    const client = await pool.connect();
    try {
        console.log('Tablo: private_messages');
        const res = await client.query(`
            SELECT column_name, data_type, udt_name, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'private_messages'
            ORDER BY ordinal_position;
        `);
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type} / ${row.udt_name}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
inspectSchema();
