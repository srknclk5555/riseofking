const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: String(process.env.PG_PASSWORD || 'Seko1234'),
    database: process.env.PG_DATABASE || 'rise_online_tracker',
});

async function test() {
    try {
        console.log('Testing DB connection...');
        const users = await pool.query('SELECT uid, main_character, maincharacter, profile FROM users');
        console.log('--- USERS IN DATABASE ---');
        console.log(`Total Count: ${users.rows.length}`);
        users.rows.forEach(r => {
            console.log(`UID: ${r.uid}`);
            console.log(`  MC: ${r.main_character}`);
            console.log(`  MC2: ${r.maincharacter}`);
            console.log(`  Profile JSON: ${JSON.stringify(r.profile)}`);
            console.log('-------------------------');
        });
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e);
        process.exit(1);
    }
}

test();
