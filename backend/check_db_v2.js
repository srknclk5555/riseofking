const pool = require('./config/database');

async function checkDb() {
    const tables = ['clan_balances', 'clan_bank_items', 'clan_bank_sold', 'clan_bank_transactions'];
    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);
        const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = '${table}'
      ORDER BY ordinal_position
    `);
        console.table(res.rows);
    }
    process.exit(0);
}

checkDb();
