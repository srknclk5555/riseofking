const pool = require('./config/database');

async function fixNegativeBalances() {
    const client = await pool.connect();
    try {
        console.log('=== KLAN BAKİYE ONARIM BETİĞİ BAŞLATILDI ===\n');

        await client.query('BEGIN');

        // 1. Mevcut negatif bakiyeleri 0'a çek
        console.log('1. Negatif bakiyeler taranıyor ve düzeltiliyor...');
        const fixResult = await client.query(`
            UPDATE clan_balances 
            SET balance = 0 
            WHERE balance < 0
            RETURNING clan_id, balance
        `);

        if (fixResult.rows.length > 0) {
            console.log(`  ✓ ${fixResult.rows.length} klanın negatif bakiyesi 0 olarak güncellendi.`);
            fixResult.rows.forEach(row => {
                console.log(`    - Klan: ${row.clan_id}`);
            });
        } else {
            console.log('  - Negatif bakiye bulunamadı.');
        }

        // 2. Veritabanı seviyesinde kontrol kısıtı (CHECK constraint) ekle
        console.log('\n2. Veritabanı kısıtları kontrol ediliyor...');

        // Önce kısıtın var olup olmadığını kontrol et
        const constraintCheck = await client.query(`
            SELECT conname 
            FROM pg_constraint 
            WHERE conname = 'clan_balances_balance_check'
        `);

        if (constraintCheck.rows.length === 0) {
            console.log('  - balance >= 0 kısıtı ekleniyor...');
            await client.query(`
                ALTER TABLE clan_balances 
                ADD CONSTRAINT clan_balances_balance_check CHECK (balance >= 0)
            `);
            console.log('  ✓ Kısıt başarıyla eklendi.');
        } else {
            console.log('  - balance >= 0 kısıtı zaten mevcut.');
        }

        await client.query('COMMIT');
        console.log('\n✅ Onarım işlemi başarıyla tamamlandı!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Onarım işlemi sırasında hata oluştu:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixNegativeBalances();
