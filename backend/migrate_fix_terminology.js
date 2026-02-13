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
        console.log('--- MİGRASYON BAŞLATILDI: Kavramsal Tanım Uyumu ---');

        // 1. Tablo şemasını düzelt
        console.log('1. Şema güncelleniyor (username ve "mainCharacter" kolonları)...');

        // username kolonunu ekle (unquoted - login username için)
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT');

        // "mainCharacter" kolonunu ekle (quoted - character name için)
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "mainCharacter" TEXT');

        // 2. Verileri temizle/düzenle
        // Eğer eskiden username kolonuna mainCharacter verileri yazılmışsa temizlemek gerekebilir
        // Ancak kullanıcı arama yaparken username beklediği için şimdilik kolonların varlığını garanti ediyoruz.

        console.log('✅ Veritabanı şeması başarıyla düzenlendi!');
        process.exit(0);
    } catch (error) {
        console.error('❌ MİGRASYON HATASI:', error.message);
        process.exit(1);
    }
}

migrate();
