const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_DATABASE || 'rise_tracking_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
});

async function checkBars() {
    try {
        console.log('🔍 Checking for bar items in database...\n');

        // Check all items with "bar" in the name
        const result = await pool.query(
            "SELECT id, name FROM items WHERE name ILIKE '%bar%' ORDER BY name"
        );

        if (result.rows.length === 0) {
            console.log('❌ No items found with "bar" in the name!');
        } else {
            console.log(`✅ Found ${result.rows.length} items:\n`);
            result.rows.forEach(item => {
                console.log(`   ID: ${item.id} | Name: "${item.name}"`);
            });
        }

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
    }
}

checkBars();
