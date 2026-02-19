const pool = require('./config/database');

async function updateItemName() {
    try {
        const result = await pool.query(
            "UPDATE items SET name = 'Golden Bar' WHERE name ILIKE 'Gold Bar' RETURNING *"
        );
        if (result.rows.length > 0) {
            console.log('✅ Gold Bar başarıyla Golden Bar olarak güncellendi:', result.rows[0]);
        } else {
            console.log('ℹ️ Gold Bar bulunamadı veya zaten güncellenmiş.');
        }
    } catch (error) {
        console.error('❌ Güncelleme hatası:', error);
    } finally {
        await pool.end();
        process.exit();
    }
}

updateItemName();
