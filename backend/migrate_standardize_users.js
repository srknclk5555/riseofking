const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: String(process.env.PG_PASSWORD),
    database: process.env.PG_DATABASE || 'rise_online_tracker',
});

async function migrate() {
    try {
        console.log('--- MİGRASYON BAŞLATILDI: users tablosu standardizasyonu ---');

        // 1. Yeni kolonu ekle (CamelCase olması için tırnak içinde)
        console.log('1. "mainCharacter" kolonu kontrol ediliyor...');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "mainCharacter" TEXT');

        // 2. Verileri taşı
        console.log('2. Veriler "mainCharacter" kolonuna taşınıyor...');
        await pool.query(`
      UPDATE users 
      SET "mainCharacter" = COALESCE(main_character, maincharacter, profile->>'mainCharacter', profile->>'maincharacter')
      WHERE "mainCharacter" IS NULL
    `);

        // 3. Eski kolonları ve JSON keyleri temizle (Artık her şey "mainCharacter" kolonunda)
        console.log('3. Eski kolonlar siliniyor...');

        const dropQueries = [
            'ALTER TABLE users DROP COLUMN IF EXISTS main_character',
            'ALTER TABLE users DROP COLUMN IF EXISTS maincharacter'
        ];

        for (const q of dropQueries) {
            try {
                await pool.query(q);
                console.log(`- Uygulandı: ${q}`);
            } catch (e) {
                console.warn(`- Hata (Görmezden gelinebilir): ${e.message}`);
            }
        }

        console.log('✅ Migrasyon başarıyla tamamlandı!');
        process.exit(0);
    } catch (error) {
        console.error('❌ MİGRASYON HATASI:', error);
        process.exit(1);
    }
}

migrate();
