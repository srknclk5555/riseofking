const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: String(process.env.PG_PASSWORD),
    database: process.env.PG_DATABASE || 'rise_online_tracker',
});

async function addUsernameColumn() {
    try {
        console.log('--- YENİ "username" KOLONU EKLEME BAŞLATILDI ---');

        // 1. "username" kolonunu ekle
        console.log('1. "username" kolonu kontrol ediliyor/ekleniyor...');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT');

        // 2. Verileri kopyala (mainCharacter'dan username'e)
        console.log('2. Mevcut veriler "username" kolonuna kopyalanıyor...');
        // Not: mainCharacter case-sensitive olduğu için tırnak içinde kullanıyoruz
        await pool.query('UPDATE users SET username = "mainCharacter" WHERE username IS NULL AND "mainCharacter" IS NOT NULL');

        console.log('✅ İşlem başarıyla tamamlandı!');
        process.exit(0);
    } catch (error) {
        console.error('❌ HATA:', error.message);
        process.exit(1);
    }
}

addUsernameColumn();
