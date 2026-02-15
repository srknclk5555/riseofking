const pool = require('./config/database');

async function checkDb() {
    try {
        console.log('--- Tables ---');
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log(tables.rows.map(r => r.table_name));

        const bankTables = ['clan_balances', 'clan_bank_items', 'clan_bank_sold', 'clan_bank_transactions', 'clan_payments'];
        for (const table of bankTables) {
            console.log(`\n--- Columns in ${table} ---`);
            try {
                const columns = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = '${table}'
        `);
                if (columns.rows.length === 0) {
                    console.log('Table does not exist');
                } else {
                    console.table(columns.rows);
                }
            } catch (err) {
                console.log(`Table ${table} check failed:`, err.message);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('Error checking DB:', err);
        process.exit(1);
    }
}

checkDb();
