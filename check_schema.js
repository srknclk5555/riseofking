require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/database');

async function checkUsersSchema() {
    try {
        console.log('--- USERS TABLE COLUMNS ---');
        const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
        console.table(cols.rows);

        console.log('\n--- USERS TABLE CONSTRAINTS ---');
        const constraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = 'users'::regclass;
    `);
        console.table(constraints.rows);

        console.log('\n--- SAMPLE DATA (1 ROW) ---');
        const sample = await pool.query('SELECT * FROM users LIMIT 1');
        console.log(JSON.stringify(sample.rows[0], null, 2));

    } catch (err) {
        console.error('Schema check failed:', err.message);
    } finally {
        await pool.end();
    }
}

checkUsersSchema();
