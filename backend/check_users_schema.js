const pool = require('./config/database');
require('dotenv').config();

async function checkUsersSchema() {
    try {
        console.log('[SCHEMA CHECK] Checking users table columns...');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        if (res.rows.length === 0) {
            console.log('Table "users" does not exist or has no columns.');
        } else {
            console.log('Columns in "users" table:');
            res.rows.forEach(row => {
                console.log(`- ${row.column_name}: ${row.data_type}`);
            });
        }
        process.exit(0);
    } catch (err) {
        console.error('FAILED TO FETCH SCHEMA:');
        console.error(err.message);
        process.exit(1);
    }
}

checkUsersSchema();
