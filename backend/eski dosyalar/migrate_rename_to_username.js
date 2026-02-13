const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: String(process.env.PG_PASSWORD),
    database: process.env.PG_DATABASE || 'rise_online_tracker',
});

async function renameColumn() {
    try {
        console.log('--- KOLON YENİDEN ADLANDIRMA BAŞLATILDI ---');

        // 1. "mainCharacter" kolonunun varlığını kontrol et ve "username" yap
        console.log('1. "mainCharacter" -> "username" dönüşümü yapılıyor...');

        // "mainCharacter" (quoted) kolonunu username (unquoted) olarak değiştir
        await pool.query('ALTER TABLE users RENAME COLUMN "mainCharacter" TO username');

        console.log('✅ Kolon başarıyla "username" olarak güncellendi!');
        process.exit(0);
    } catch (error) {
        if (error.message.includes('does not exist')) {
            console.log('ℹ️ "mainCharacter" kolonu zaten yok veya adı farklı. "username" kontrol ediliyor...');
            try {
                await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT');
                console.log('✅ "username" kolonu doğrulandı/oluşturuldu.');
                process.exit(0);
            } catch (e2) {
                console.error('❌ Hata:', e2.message);
                process.exit(1);
            }
        } else {
            console.error('❌ Hata:', error.message);
            process.exit(1);
        }
    }
}

renameColumn();
