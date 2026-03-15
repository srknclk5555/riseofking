const pool = require('./config/database');

async function debug() {
    const tables = ['items', 'clan_boss_runs', 'clan_boss_drops', 'clan_boss_participants'];
    for (const table of tables) {
        try {
            const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
            console.log(`Table: ${table}`);
            console.log(res.rows.map(r => r.column_name).join(', '));
        } catch (e) {
            console.error(`Error checking ${table}:`, e.message);
        }
    }
    pool.end();
}

debug();
