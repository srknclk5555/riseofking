const pool = require('./config/database');

async function migrateTreasuryStatus() {
    try {
        console.log('=== KLAN BOSS DROPS TABLOSUNA HAZİNE TAKİP KOLONU EKLENİYOR ===\n');

        await pool.query(`
            ALTER TABLE clan_boss_drops 
            ADD COLUMN IF NOT EXISTS is_treasury_processed BOOLEAN DEFAULT false
        `);
        console.log('✓ is_treasury_processed kolonu eklendi');

        await pool.query(`
            ALTER TABLE clan_boss_drops 
            ADD COLUMN IF NOT EXISTS treasury_action_type TEXT NULL
        `);
        console.log('✓ treasury_action_type kolonu eklendi');

        console.log('\n✓ Veritabanı güncellemesi başarıyla tamamlandı!');
    } catch (error) {
        console.error('❌ Hata oluştu:', error.message);
    } finally {
        await pool.end();
    }
}

migrateTreasuryStatus();
