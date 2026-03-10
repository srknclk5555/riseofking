require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
const pool = new Pool();

async function check() {
    try {
        const res = await pool.query("SELECT * FROM clan_bank_items LIMIT 5");
        console.log("BANK ITEMS:", res.rows);

        const countRes = await pool.query("SELECT run_id, count(*) FROM clan_bank_items GROUP BY run_id");
        console.log("RUN ID COUNTS:", countRes.rows);
    } catch (e) { console.error(e); }
    finally { pool.end(); }
}
check();
