require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool();

async function run() {
    const res = await pool.query(
        "SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name = 'clan_bank_items'"
    );
    console.log(res.rows);
    const indRes = await pool.query(
        "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'clan_bank_items'"
    );
    console.log(indRes.rows);
    pool.end();
}
run();
