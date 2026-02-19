const pool = require('./config/database');

async function checkBars() {
    try {
        const result = await pool.query(
            "SELECT id, name FROM items WHERE name ILIKE '%Bar%' ORDER BY name"
        );
        console.log('--- Veritabanındaki Bar İtemleri (RAW JSON) ---');
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (error) {
        console.error('❌ Sorgu hatası:', error);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkBars();
