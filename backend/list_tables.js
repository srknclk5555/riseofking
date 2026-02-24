const pool = require('./config/database');

async function listTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('Tables in database:');
        res.rows.forEach(row => console.log(' - ' + row.table_name));
        process.exit(0);
    } catch (err) {
        console.error('Error listing tables:', err.message);
        process.exit(1);
    }
}

listTables();
