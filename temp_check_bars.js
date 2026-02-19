const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'rise_tracking_system',
    user: 'postgres',
    password: 'kerem55'
});

async function checkBars() {
    try {
        console.log('🔍 Checking bar items...\n');

        const result = await pool.query(
            "SELECT id, name FROM items WHERE name ILIKE '%bar%' ORDER BY name"
        );

        console.log(`Found ${result.rows.length} items:\n`);
        result.rows.forEach(item => {
            console.log(`  ID: ${item.id}`);
            console.log(`  Name: "${item.name}"\n`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

checkBars();
