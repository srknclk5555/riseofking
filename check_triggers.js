require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/database');

async function check() {
    try {
        const r = await pool.query(`
      SELECT trg.tgname AS trigger_name, pg_get_triggerdef(trg.oid) AS trigger_definition 
      FROM pg_trigger trg 
      JOIN pg_class cls ON trg.tgrelid = cls.oid 
      WHERE cls.relname = 'users'
    `);
        console.log(JSON.stringify(r.rows, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}
check();
