const pool = require('./config/database');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('Testing connection with:');
        console.log('Host:', process.env.PG_HOST);
        console.log('Database:', process.env.PG_DATABASE);
        console.log('User:', process.env.PG_USER);

        const res = await pool.query('SELECT NOW() as now, current_database() as db');
        console.log('SUCCESS!');
        console.log('Time on DB:', res.rows[0].now);
        console.log('Current DB:', res.rows[0].db);
        process.exit(0);
    } catch (err) {
        console.error('CONNECTION FAILED:');
        console.error(err.message);
        process.exit(1);
    }
}

testConnection();
